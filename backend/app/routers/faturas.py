import io
import uuid
import base64
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File as FastAPIFile, Query
from fastapi.responses import StreamingResponse
import zipfile
import pandas as pd
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user, get_user_condo_ids
from app.models.user import User
from app.models.fatura import Fatura
from app.models.condominio import Condominio
from app.models.concessionaria import Concessionaria
from app.models.audit_log import AuditLog
from app.schemas import FaturaResponse
from app.services.fatura_duplicates import find_duplicate_fatura
from app.services.pdf_processor import generate_standard_filename


router = APIRouter(prefix="/faturas", tags=["Faturas"])


@router.get("/exportar")
async def exportar_faturas(
    formato: str = Query("excel", pattern="^(excel|csv)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    stmt = (
        select(Fatura)
        .options()
        .order_by(Fatura.created_at.desc())
    )
    if allowed_condo_ids is not None:
        stmt = stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))

    result = await db.execute(stmt)
    rows = []
    for fatura in result.scalars().all():
        condo = await db.get(Condominio, fatura.condominio_id) if fatura.condominio_id else None
        conc = await db.get(Concessionaria, fatura.concessionaria_id) if fatura.concessionaria_id else None
        rows.append(
            {
                "Condominio": condo.nome if condo else "",
                "Concessionaria": conc.tipo if conc else "",
                "Referencia": fatura.referencia or "",
                "Vencimento": fatura.vencimento.isoformat() if fatura.vencimento else "",
                "Valor": float(fatura.valor or 0),
                "Status": fatura.status,
            }
        )

    columns = ["Condominio", "Concessionaria", "Referencia", "Vencimento", "Valor", "Status"]
    df = pd.DataFrame(rows, columns=columns)
    if formato == "csv":
        csv_data = df.to_csv(index=False, sep=";", encoding="utf-8-sig")
        return StreamingResponse(
            io.BytesIO(csv_data.encode("utf-8-sig")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=faturas_datacron.csv"},
        )

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Faturas")
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=faturas_datacron.xlsx"},
    )


@router.post("/manual", response_model=FaturaResponse)
async def create_fatura_manual(
    condominio_id: uuid.UUID = Form(...),
    concessionaria_id: uuid.UUID = Form(...),
    valor: float = Form(...),
    vencimento: date = Form(...),
    referencia: Optional[str] = Form(None),
    pdf_file: Optional[UploadFile] = FastAPIFile(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Cria manualmente uma fatura para uma concessionária, opcionalmente com PDF."""

    # Verify access to the condominio
    if allowed_condo_ids is not None and condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomínio")

    # Verify condominio exists
    result = await db.execute(
        select(Condominio).where(Condominio.id == condominio_id)
    )
    condo = result.scalar_one_or_none()
    if not condo:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    # Verify concessionaria exists and belongs to the condominio
    result = await db.execute(
        select(Concessionaria).where(
            Concessionaria.id == concessionaria_id,
            Concessionaria.condominio_id == condominio_id,
        )
    )
    conc = result.scalar_one_or_none()
    if not conc:
        raise HTTPException(
            status_code=404,
            detail="Concessionária não encontrada ou não pertence a este condomínio",
        )

    # Generate reference if not provided (e.g., "Maio/2026")
    if not referencia:
        mes_nome = [
            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro",
        ]
        mes = vencimento.month
        ano = vencimento.year
        referencia = f"{mes_nome[mes - 1]}/{ano}"

    duplicate = await find_duplicate_fatura(
        db,
        condominio_id=condominio_id,
        tipo_conta=conc.tipo,
        codigo_conta=conc.instalacao,
        valor=valor,
        vencimento=vencimento,
    )
    if duplicate:
        raise HTTPException(
            status_code=400,
            detail=f"Erro: Já existe uma fatura idêntica (Valor: R$ {valor}, Vencimento: {vencimento}, UC: {conc.instalacao}) registrada no sistema ou no histórico."
        )

    # Handle PDF upload
    pdf_base64 = None
    pdf_nome_original = None
    pdf_desbloqueado = False
    if pdf_file and pdf_file.filename:
        content = await pdf_file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=413, detail="Arquivo PDF muito grande (máx. 10MB)")
        pdf_base64 = base64.b64encode(content).decode("utf-8")
        
        # Generate standardized filename
        pdf_nome_original = generate_standard_filename(
            condo_numero=condo.numero,
            condo_nome=condo.nome,
            conc_tipo=conc.tipo,
            conc_codigo=conc.instalacao,
            vencimento=vencimento,
            valor=valor
        )
        pdf_desbloqueado = True

    # Create the fatura
    nova_fatura = Fatura(
        condominio_id=condominio_id,
        concessionaria_id=concessionaria_id,
        valor=valor,
        vencimento=vencimento,
        referencia=referencia,
        status="pendente",
        email_remetente=f"Manual - {user.email}",
        email_assunto=f"Entrada manual por {user.nome}",
        pdf_base64=pdf_base64,
        pdf_nome_original=pdf_nome_original,
        pdf_desbloqueado=pdf_desbloqueado,
    )

    db.add(nova_fatura)
    
    # Audit Log
    log = AuditLog(
        usuario_id=user.id,
        usuario_nome=user.nome,
        usuario_email=user.email,
        acao="inclusao",
        entidade_tipo="fatura",
        entidade_id=nova_fatura.id,
        detalhes={
            "condominio_nome": condo.nome,
            "concessionaria_tipo": conc.tipo,
            "concessionaria_codigo": conc.instalacao,
            "valor": valor, 
            "vencimento": str(vencimento), 
            "referencia": referencia, 
            "metodo": "manual"
        }
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(nova_fatura)

    # Attach relationships for response
    nova_fatura.condominio = condo
    nova_fatura.concessionaria = conc

    return FaturaResponse.model_validate(nova_fatura)


@router.patch("/{fatura_id}/upload-pdf")
async def upload_pdf_to_fatura(
    fatura_id: uuid.UUID,
    pdf_file: UploadFile = FastAPIFile(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Upload rápido de PDF para uma fatura existente (ex: resolver alerta pdf_erro)."""
    if user.role not in ["admin", "assistente", "gerencia"]:
        raise HTTPException(status_code=403, detail="Acesso negado para enviar PDFs")

    result = await db.execute(select(Fatura).where(Fatura.id == fatura_id))
    fatura = result.scalar_one_or_none()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")

    if allowed_condo_ids is not None and fatura.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomínio")

    content = await pdf_file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Arquivo PDF muito grande (máx. 10MB)")

    # Fetch context for filename
    condo = None
    conc = None
    if fatura.condominio_id:
        condo = (await db.execute(select(Condominio).where(Condominio.id == fatura.condominio_id))).scalar_one_or_none()
    if fatura.concessionaria_id:
        conc = (await db.execute(select(Concessionaria).where(Concessionaria.id == fatura.concessionaria_id))).scalar_one_or_none()

    pdf_nome = generate_standard_filename(
        condo_numero=condo.numero if condo else 0,
        condo_nome=condo.nome if condo else "Manual",
        conc_tipo=conc.tipo if conc else "N-A",
        conc_codigo=conc.instalacao if conc else "N-A",
        vencimento=fatura.vencimento,
        valor=fatura.valor,
    )

    fatura.pdf_base64 = base64.b64encode(content).decode("utf-8")
    fatura.pdf_nome_original = pdf_nome
    fatura.pdf_desbloqueado = True
    fatura.status = "processada"

    # Also update HistoricoFatura if it exists
    from app.models.historico_fatura import HistoricoFatura
    hist_result = await db.execute(
        select(HistoricoFatura).where(
            HistoricoFatura.condominio_id == fatura.condominio_id,
            HistoricoFatura.concessionaria_id == fatura.concessionaria_id,
            HistoricoFatura.vencimento == fatura.vencimento,
            HistoricoFatura.valor == fatura.valor,
        )
    )
    hist = hist_result.scalar_one_or_none()
    if hist:
        hist.base_64 = fatura.pdf_base64
        hist.pdf_nome_original = pdf_nome
    else:
        # Create history entry now that the PDF is available
        new_hist = HistoricoFatura(
            condominio_id=fatura.condominio_id,
            concessionaria_id=fatura.concessionaria_id,
            referencia=fatura.referencia,
            vencimento=fatura.vencimento,
            valor=fatura.valor,
            pdf_nome_original=pdf_nome,
            base_64=fatura.pdf_base64,
            debito_automatico=fatura.debito_automatico,
            email_remetente=fatura.email_remetente,
            email_assunto=fatura.email_assunto,
            gmail_message_id=fatura.gmail_message_id,
        )
        db.add(new_hist)

    # Audit
    log = AuditLog(
        usuario_id=user.id,
        usuario_nome=user.nome,
        usuario_email=user.email,
        acao="alteracao",
        entidade_tipo="fatura",
        entidade_id=fatura.id,
        detalhes={
            "acao": "upload_pdf_rapido",
            "condominio_nome": condo.nome if condo else "N/A",
            "concessionaria_tipo": conc.tipo if conc else "N/A",
            "pdf_nome": pdf_nome,
        },
    )
    db.add(log)

    await db.commit()
    return {"status": "success", "pdf_nome": pdf_nome, "fatura_id": str(fatura_id)}


@router.delete("/{fatura_id}")
async def delete_fatura(
    fatura_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Exclui uma fatura. Apenas usuários admin, assistente ou gerencia podem excluir."""
    if user.role not in ["admin", "assistente", "gerencia"]:
        raise HTTPException(status_code=403, detail="Acesso negado para excluir faturas")

    result = await db.execute(select(Fatura).where(Fatura.id == fatura_id))
    fatura = result.scalar_one_or_none()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")

    # Verify access to the condominio
    if allowed_condo_ids is not None and fatura.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condomínio")

    # Set references to NULL before deleting to avoid FK violation (FK alertas.fatura_id, email_logs.fatura_id)
    from app.models.alerta import Alerta, EmailLog
    await db.execute(update(Alerta).where(Alerta.fatura_id == fatura_id).values(fatura_id=None))
    await db.execute(update(EmailLog).where(EmailLog.fatura_id == fatura_id).values(fatura_id=None))
    await db.flush() # Ensure updates are processed before delete

    await db.delete(fatura)
    
    # Fetch context names for audit before committing delete
    condo_nome = "N/A"
    conc_tipo = "N/A"
    conc_codigo = "N/A"
    if fatura.condominio_id:
        c_res = await db.execute(select(Condominio.nome).where(Condominio.id == fatura.condominio_id))
        condo_nome = c_res.scalar() or "N/A"
    if fatura.concessionaria_id:
        cc_res = await db.execute(select(Concessionaria.tipo, Concessionaria.instalacao).where(Concessionaria.id == fatura.concessionaria_id))
        cc_row = cc_res.first()
        if cc_row:
            conc_tipo, conc_codigo = cc_row

    # Audit Log
    log = AuditLog(
        usuario_id=user.id,
        usuario_nome=user.nome,
        usuario_email=user.email,
        acao="exclusao",
        entidade_tipo="fatura",
        entidade_id=fatura_id,
        detalhes={
            "condominio_nome": condo_nome,
            "concessionaria_tipo": conc_tipo,
            "concessionaria_codigo": conc_codigo,
            "valor": fatura.valor, 
            "vencimento": str(fatura.vencimento), 
            "referencia": fatura.referencia
        }
    )
    db.add(log)
    await db.commit()
    return {"status": "success"}
