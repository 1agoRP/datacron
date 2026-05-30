import base64
import io
import uuid
from datetime import date
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_role
from app.models.audit_log import AuditLog
from app.models.condominio import Condominio
from app.models.contract_file import ContractFile
from app.models.contrato import Contrato, ContratoPagamento
from app.models.user import User
from app.schemas import (
    ContratoCreate,
    ContratoDashboardItem,
    ContratoPagamentoResponse,
    ContratoPagamentoUpdate,
    ContratoResponse,
    ContratoUpdate,
)
from app.security import read_pdf_upload

router = APIRouter(prefix="/contratos", tags=["Contratos"])

MESES = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
]


def _is_month_due(contrato: Contrato, ano: int, mes: int) -> bool:
    today = date.today()
    due_day = min(max(contrato.dia_vencimento or 10, 1), 28)
    return date(ano, mes, due_day) < today


def _contrato_response(contrato: Contrato) -> ContratoResponse:
    data = ContratoResponse.model_validate(contrato).model_dump()
    data["status"] = contrato.status
    data["condominio_nome"] = contrato.condominio.nome if contrato.condominio else None
    return ContratoResponse(**data)


def _payment_grid(contrato: Contrato, ano: int) -> list[ContratoPagamentoResponse]:
    persisted = {(p.ano, p.mes): p for p in contrato.pagamentos if p.ano == ano}
    rows = []
    for mes in range(1, 13):
        payment = persisted.get((ano, mes))
        recebido = bool(payment.recebido) if payment else False
        valor_previsto = (
            float(payment.valor_previsto)
            if payment and payment.valor_previsto is not None
            else float(contrato.valor_atual or 0)
        )
        vencido = _is_month_due(contrato, ano, mes) and not recebido
        rows.append(
            ContratoPagamentoResponse(
                id=payment.id if payment else None,
                contrato_id=contrato.id,
                ano=ano,
                mes=mes,
                mes_label=MESES[mes - 1],
                valor_previsto=valor_previsto,
                valor_recebido=payment.valor_recebido if payment else None,
                recebido=recebido,
                data_recebimento=payment.data_recebimento if payment else None,
                observacoes=payment.observacoes if payment else None,
                pendente=not recebido,
                vencido=vencido,
            )
        )
    return rows


def _dashboard_item(contrato: Contrato, ano: int) -> ContratoDashboardItem:
    base = _contrato_response(contrato).model_dump()
    pagamentos = _payment_grid(contrato, ano)
    total_previsto = sum(p.valor_previsto for p in pagamentos)
    total_recebido = sum(float(p.valor_recebido or 0) for p in pagamentos if p.recebido)
    return ContratoDashboardItem(
        **base,
        pagamentos=pagamentos,
        pagamentos_recebidos=sum(1 for p in pagamentos if p.recebido),
        pagamentos_pendentes=sum(1 for p in pagamentos if not p.recebido),
        total_previsto_ano=round(total_previsto, 2),
        total_recebido_ano=round(total_recebido, 2),
    )


async def _get_contrato_or_404(db: AsyncSession, contrato_id: uuid.UUID) -> Contrato:
    result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.condominio),
            selectinload(Contrato.arquivos),
            selectinload(Contrato.pagamentos),
        )
        .where(Contrato.id == contrato_id)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato nao encontrado")
    return contrato


@router.get("/dashboard", response_model=list[ContratoDashboardItem])
async def dashboard_contratos(
    ano: int = Query(default_factory=lambda: date.today().year, ge=2000, le=2100),
    condominio_id: Optional[uuid.UUID] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    stmt = (
        select(Contrato)
        .options(selectinload(Contrato.condominio), selectinload(Contrato.pagamentos))
        .order_by(Contrato.data_fim.is_(None), Contrato.data_fim.asc(), Contrato.empresa.asc())
    )
    if condominio_id:
        stmt = stmt.where(Contrato.condominio_id == condominio_id)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(Contrato.empresa.ilike(pattern) | Contrato.tipo_contrato.ilike(pattern))

    result = await db.execute(stmt)
    return [_dashboard_item(contrato, ano) for contrato in result.scalars().all()]


@router.get("", response_model=list[ContratoResponse])
async def list_contratos(
    condominio_id: Optional[uuid.UUID] = None,
    status: Optional[str] = Query(None, pattern="^(ativo|a_vencer|vencido)$"),
    q: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    stmt = (
        select(Contrato)
        .options(selectinload(Contrato.condominio), selectinload(Contrato.arquivos))
        .order_by(Contrato.data_fim.is_(None), Contrato.data_fim.asc(), Contrato.empresa.asc())
    )
    if condominio_id:
        stmt = stmt.where(Contrato.condominio_id == condominio_id)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(Contrato.empresa.ilike(pattern) | Contrato.tipo_contrato.ilike(pattern))
    result = await db.execute(stmt.offset(skip).limit(limit))
    contratos = result.scalars().all()
    if status:
        contratos = [contrato for contrato in contratos if contrato.status == status]
    return [_contrato_response(contrato) for contrato in contratos]


@router.get("/stats")
async def contrato_stats(
    ano: int = Query(default_factory=lambda: date.today().year, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    result = await db.execute(
        select(Contrato).options(selectinload(Contrato.condominio), selectinload(Contrato.pagamentos))
    )
    contratos = result.scalars().all()
    payments = [_dashboard_item(contrato, ano) for contrato in contratos]
    return {
        "total": len(contratos),
        "ativos": sum(1 for c in contratos if c.status == "ativo"),
        "a_vencer": sum(1 for c in contratos if c.status == "a_vencer"),
        "vencidos": sum(1 for c in contratos if c.status == "vencido"),
        "nao_assinados": sum(1 for c in contratos if not c.assinado),
        "valor_mensal": round(sum(float(c.valor_atual or 0) for c in contratos), 2),
        "total_previsto_ano": round(sum(item.total_previsto_ano for item in payments), 2),
        "total_recebido_ano": round(sum(item.total_recebido_ano for item in payments), 2),
        "mensalidades_pendentes": sum(item.pagamentos_pendentes for item in payments),
        "mensalidades_vencidas": sum(
            1 for item in payments for pagamento in item.pagamentos if pagamento.vencido
        ),
    }


@router.get("/exportar")
async def export_contratos(
    formato: str = Query("excel", pattern="^(excel|csv)$"),
    ano: int = Query(default_factory=lambda: date.today().year, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    result = await db.execute(
        select(Contrato)
        .options(selectinload(Contrato.condominio), selectinload(Contrato.pagamentos))
        .order_by(Contrato.empresa.asc())
    )
    rows = []
    for contrato in result.scalars().all():
        item = _dashboard_item(contrato, ano)
        rows.append(
            {
                "Condominio": item.condominio_nome or "",
                "Empresa": item.empresa,
                "Tipo": item.tipo_contrato,
                "Assinado": "Sim" if item.assinado else "Nao",
                "Assinatura": item.data_assinatura.isoformat() if item.data_assinatura else "",
                "Inicio": item.data_inicio.isoformat(),
                "Fim": item.data_fim.isoformat() if item.data_fim else "",
                "Valor Original": item.valor_inicial,
                "Mensalidade": item.valor_atual,
                "Pagamentos Recebidos": item.pagamentos_recebidos,
                "Pagamentos Pendentes": item.pagamentos_pendentes,
                "Recebido no Ano": item.total_recebido_ano,
                "Status": item.status,
            }
        )
    df = pd.DataFrame(rows)
    if formato == "csv":
        csv_data = df.to_csv(index=False, sep=";", encoding="utf-8-sig")
        return StreamingResponse(
            io.BytesIO(csv_data.encode("utf-8-sig")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=contratos_datacron.csv"},
        )
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Contratos")
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=contratos_datacron.xlsx"},
    )


@router.post("", response_model=ContratoDashboardItem, status_code=201)
async def create_contrato(
    body: ContratoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    condo = await db.get(Condominio, body.condominio_id)
    if not condo:
        raise HTTPException(status_code=404, detail="Condominio nao encontrado")
    contrato = Contrato(**body.model_dump(), created_by_id=current_user.id)
    db.add(contrato)
    await db.flush()
    db.add(
        AuditLog(
            usuario_id=current_user.id,
            usuario_nome=current_user.nome,
            usuario_email=current_user.email,
            acao="inclusao",
            entidade_tipo="contrato",
            entidade_id=contrato.id,
            detalhes={"empresa": contrato.empresa, "condominio_nome": condo.nome},
        )
    )
    await db.commit()
    return _dashboard_item(await _get_contrato_or_404(db, contrato.id), date.today().year)


@router.get("/{contrato_id}", response_model=ContratoDashboardItem)
async def get_contrato(
    contrato_id: uuid.UUID,
    ano: int = Query(default_factory=lambda: date.today().year, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    return _dashboard_item(await _get_contrato_or_404(db, contrato_id), ano)


@router.put("/{contrato_id}", response_model=ContratoDashboardItem)
async def update_contrato(
    contrato_id: uuid.UUID,
    body: ContratoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    contrato = await _get_contrato_or_404(db, contrato_id)
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contrato, field, value)
    db.add(
        AuditLog(
            usuario_id=current_user.id,
            usuario_nome=current_user.nome,
            usuario_email=current_user.email,
            acao="alteracao",
            entidade_tipo="contrato",
            entidade_id=contrato.id,
            detalhes={"campos": list(update_data.keys())},
        )
    )
    await db.commit()
    return _dashboard_item(await _get_contrato_or_404(db, contrato.id), date.today().year)


@router.patch("/{contrato_id}/pagamentos/{mes}", response_model=ContratoPagamentoResponse)
async def update_pagamento(
    contrato_id: uuid.UUID,
    mes: int,
    body: ContratoPagamentoUpdate,
    ano: int = Query(default_factory=lambda: date.today().year, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    if mes < 1 or mes > 12:
        raise HTTPException(status_code=422, detail="Mes deve estar entre 1 e 12")
    contrato = await _get_contrato_or_404(db, contrato_id)
    result = await db.execute(
        select(ContratoPagamento).where(
            ContratoPagamento.contrato_id == contrato_id,
            ContratoPagamento.ano == ano,
            ContratoPagamento.mes == mes,
        )
    )
    pagamento = result.scalar_one_or_none()
    if not pagamento:
        pagamento = ContratoPagamento(
            contrato_id=contrato_id,
            ano=ano,
            mes=mes,
            valor_previsto=body.valor_previsto
            if body.valor_previsto is not None
            else float(contrato.valor_atual or 0),
        )
        db.add(pagamento)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(pagamento, field, value)
    if pagamento.recebido and pagamento.valor_recebido is None:
        pagamento.valor_recebido = pagamento.valor_previsto
    if pagamento.recebido and pagamento.data_recebimento is None:
        pagamento.data_recebimento = date.today()

    db.add(
        AuditLog(
            usuario_id=current_user.id,
            usuario_nome=current_user.nome,
            usuario_email=current_user.email,
            acao="alteracao",
            entidade_tipo="contrato_pagamento",
            entidade_id=contrato.id,
            detalhes={
                "contrato": contrato.empresa,
                "ano": ano,
                "mes": mes,
                "recebido": pagamento.recebido,
                "valor_recebido": pagamento.valor_recebido,
            },
        )
    )
    await db.commit()
    await db.refresh(pagamento)
    return _payment_grid(await _get_contrato_or_404(db, contrato_id), ano)[mes - 1]


@router.post("/{contrato_id}/arquivo", response_model=ContratoDashboardItem)
async def upload_contrato_arquivo(
    contrato_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    contrato = await _get_contrato_or_404(db, contrato_id)
    content = await read_pdf_upload(file)
    contract_file = ContractFile(
        contract_id=contrato.id,
        file_name=file.filename or "contrato.pdf",
        file_type="application/pdf",
        file_base64=base64.b64encode(content).decode("utf-8"),
    )
    db.add(contract_file)
    contrato.arquivo_path = contract_file.file_name
    await db.commit()
    return _dashboard_item(await _get_contrato_or_404(db, contrato.id), date.today().year)


@router.delete("/{contrato_id}", status_code=204)
async def delete_contrato(
    contrato_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    contrato = await _get_contrato_or_404(db, contrato_id)
    db.add(
        AuditLog(
            usuario_id=current_user.id,
            usuario_nome=current_user.nome,
            usuario_email=current_user.email,
            acao="exclusao",
            entidade_tipo="contrato",
            entidade_id=contrato.id,
            detalhes={"empresa": contrato.empresa, "tipo_contrato": contrato.tipo_contrato},
        )
    )
    await db.delete(contrato)
    await db.commit()
    return None
