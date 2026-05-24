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
from app.models.contrato import Contrato
from app.models.user import User
from app.schemas import ContratoCreate, ContratoResponse, ContratoUpdate

router = APIRouter(prefix="/contratos", tags=["Contratos"])


def _response(contrato: Contrato) -> ContratoResponse:
    data = ContratoResponse.model_validate(contrato).model_dump()
    data["status"] = contrato.status
    data["condominio_nome"] = contrato.condominio.nome if contrato.condominio else None
    return ContratoResponse(**data)


async def _get_contrato_or_404(db: AsyncSession, contrato_id: uuid.UUID) -> Contrato:
    result = await db.execute(
        select(Contrato)
        .options(selectinload(Contrato.condominio), selectinload(Contrato.arquivos))
        .where(Contrato.id == contrato_id)
    )
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato nao encontrado")
    return contrato


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
    return [_response(contrato) for contrato in contratos]


@router.get("/stats")
async def contrato_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    result = await db.execute(select(Contrato))
    contratos = result.scalars().all()
    stats = {
        "total": len(contratos),
        "ativos": 0,
        "a_vencer": 0,
        "vencidos": 0,
        "valor_mensal": 0.0,
    }
    for contrato in contratos:
        if contrato.status == "ativo":
            stats["ativos"] += 1
        elif contrato.status == "a_vencer":
            stats["a_vencer"] += 1
        elif contrato.status == "vencido":
            stats["vencidos"] += 1
        if contrato.periodicidade == "mensal":
            stats["valor_mensal"] += float(contrato.valor_atual or 0)
    stats["valor_mensal"] = round(stats["valor_mensal"], 2)
    return stats


@router.get("/exportar")
async def export_contratos(
    formato: str = Query("excel", pattern="^(excel|csv)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    result = await db.execute(
        select(Contrato).options(selectinload(Contrato.condominio)).order_by(Contrato.empresa.asc())
    )
    rows = [
        {
            "Condominio": contrato.condominio.nome if contrato.condominio else "",
            "Empresa": contrato.empresa,
            "Tipo": contrato.tipo_contrato,
            "Inicio": contrato.data_inicio.isoformat(),
            "Fim": contrato.data_fim.isoformat() if contrato.data_fim else "",
            "Valor Atual": float(contrato.valor_atual or 0),
            "Periodicidade": contrato.periodicidade,
            "Status": contrato.status,
        }
        for contrato in result.scalars().all()
    ]
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


@router.post("", response_model=ContratoResponse, status_code=201)
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
            detalhes={
                "empresa": contrato.empresa,
                "tipo_contrato": contrato.tipo_contrato,
                "condominio_nome": condo.nome,
            },
        )
    )
    await db.commit()
    return _response(await _get_contrato_or_404(db, contrato.id))


@router.get("/{contrato_id}", response_model=ContratoResponse)
async def get_contrato(
    contrato_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    return _response(await _get_contrato_or_404(db, contrato_id))


@router.put("/{contrato_id}", response_model=ContratoResponse)
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
    return _response(await _get_contrato_or_404(db, contrato.id))


@router.post("/{contrato_id}/arquivo", response_model=ContratoResponse)
async def upload_contrato_arquivo(
    contrato_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    contrato = await _get_contrato_or_404(db, contrato_id)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Arquivo muito grande (max. 10MB)")
    contract_file = ContractFile(
        contract_id=contrato.id,
        file_name=file.filename or "contrato.pdf",
        file_type=file.content_type or "application/octet-stream",
        file_base64=base64.b64encode(content).decode("utf-8"),
    )
    db.add(contract_file)
    contrato.arquivo_path = contract_file.file_name
    await db.commit()
    return _response(await _get_contrato_or_404(db, contrato.id))


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
