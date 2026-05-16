import uuid
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Body
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.dependencies import get_current_user, require_write, get_user_condo_ids, require_role
from app.models.user import User
from app.models.alerta import Alerta
from app.models.alerta_audit_log import AlertaAuditLog
from app.schemas import AlertaResponse
from app.services.email_sender import send_notification_email, render_resolution_email, render_unidentified_sender_email
from app.services.alert_manager import notify_alert


class JustificativaBody(BaseModel):
    justificativa: str


class AlertaAuditLogResponse(BaseModel):
    id: uuid.UUID
    alerta_id: uuid.UUID
    alerta_tipo: str
    alerta_gravidade: str
    alerta_mensagem: str
    condominio_id: Optional[uuid.UUID] = None
    acao: str
    justificativa: str
    usuario_id: uuid.UUID
    usuario_nome: str
    usuario_email: str
    created_at: datetime
    model_config = {"from_attributes": True}


router = APIRouter(prefix="/alertas", tags=["Alertas"])


@router.get("", response_model=list[AlertaResponse])
async def list_alertas(
    tipo: Optional[str] = None,
    gravidade: Optional[str] = None,
    lido: Optional[bool] = None,
    resolvido: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=1000),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    stmt = select(Alerta).where(Alerta.resolvido == resolvido)
    if allowed_condo_ids is not None:
        stmt = stmt.where(Alerta.condominio_id.in_(allowed_condo_ids))
    if tipo:
        stmt = stmt.where(Alerta.tipo == tipo)
    if gravidade:
        stmt = stmt.where(Alerta.gravidade == gravidade)
    if lido is not None:
        stmt = stmt.where(Alerta.lido == lido)
    stmt = stmt.order_by(Alerta.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=AlertaResponse, status_code=201)
async def create_alerta(
    tipo: str,
    gravidade: str,
    mensagem: str,
    condominio_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    if condominio_id and allowed_condo_ids and condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este condominio")

    alert = Alerta(
        condominio_id=condominio_id,
        tipo=tipo,
        gravidade=gravidade,
        mensagem=mensagem,
    )
    db.add(alert)
    await db.flush()

    await notify_alert(db, alert, None)

    await db.commit()
    await db.refresh(alert)
    return alert


@router.put("/{id}/ler", response_model=AlertaResponse)
async def mark_as_read(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(select(Alerta).where(Alerta.id == id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta nao encontrado")

    if (
        allowed_condo_ids is not None
        and a.condominio_id
        and a.condominio_id not in allowed_condo_ids
    ):
        raise HTTPException(status_code=403, detail="Acesso negado a este alerta")
    a.lido = True
    await db.commit()
    await db.refresh(a)
    return a


@router.put("/{id}/resolver", response_model=AlertaResponse)
async def resolve_alerta(
    id: uuid.UUID,
    background_tasks: BackgroundTasks,
    body: JustificativaBody = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(
        select(Alerta)
        .options(joinedload(Alerta.condominio))
        .where(Alerta.id == id)
    )
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta nao encontrado")

    if (
        allowed_condo_ids is not None
        and a.condominio_id
        and a.condominio_id not in allowed_condo_ids
    ):
        raise HTTPException(status_code=403, detail="Acesso negado a este alerta")

    # Record audit log
    audit = AlertaAuditLog(
        alerta_id=a.id,
        alerta_tipo=a.tipo,
        alerta_gravidade=a.gravidade,
        alerta_mensagem=a.mensagem,
        condominio_id=a.condominio_id,
        acao="resolvido",
        justificativa=body.justificativa,
        usuario_id=current_user.id,
        usuario_nome=current_user.nome,
        usuario_email=current_user.email,
    )
    db.add(audit)

    # Send emails in background to avoid "Failed to fetch" (timeouts)
    background_tasks.add_task(
        process_alert_resolution_emails,
        a.tipo,
        a.mensagem,
        current_user.email,
        a.condominio.nome if a.condominio else None,
        a.email_remetente,
        a.email_assunto,
    )

    a.lido = True
    a.resolvido = True
    await db.commit()
    await db.refresh(a)
    return a


async def process_alert_resolution_emails(
    alerta_tipo: str,
    alerta_mensagem: str,
    manager_email: str,
    condo_nome: str = None,
    email_remetente: str = None,
    email_assunto: str = None,
):
    """Handles all email notifications related to an alert resolution."""
    try:
        # 1. Reply to sender if it was an unidentified email
        if alerta_tipo == "email_nao_identificado":
            import re

            sender_match = re.search(r"de '([^']+)'", alerta_mensagem)
            subject_match = re.search(r"assunto '([^']+)'", alerta_mensagem)
            sender = email_remetente or (
                sender_match.group(1) if sender_match else None
            )
            subject = email_assunto or (
                subject_match.group(1) if subject_match else "Fatura"
            )

            if sender:
                await _send_reply_to_sender(sender, subject)

        # 2. Notify the manager
        await _send_manager_confirmation(
            manager_email, alerta_tipo, alerta_mensagem, condo_nome, email_remetente, email_assunto
        )
    except Exception as e:
        import logging

        logging.error(f"Error in background alert emails: {e}")


async def _send_reply_to_sender(recipient: str, original_subject: str):
    import re
    from app.services.email_sender import send_notification_email, render_unidentified_sender_email

    # Extract code from subject
    code_match = re.search(r"(\d{5,15})", original_subject)
    code = code_match.group(1) if code_match else "N/D"

    # Identify Concessionária type for better labeling
    tipo_label = "Concessionária"
    codigo_label = "Código / Instalação"

    subj_lower = original_subject.lower()
    if "enel" in subj_lower:
        tipo_label = "Enel"
        codigo_label = "Instalação"
    elif "sabesp" in subj_lower:
        tipo_label = "Sabesp"
        codigo_label = "Fornecimento"
    elif "comgas" in subj_lower or "comgás" in subj_lower:
        tipo_label = "Comgás"
        codigo_label = "Código do Usuário"

    subject = f"Aviso: {tipo_label} não identificada no Datacron"

    body_html = render_unidentified_sender_email(
        original_subject=original_subject,
        tipo_label=tipo_label,
        codigo_label=codigo_label,
        codigo_valor=code
    )

    await send_notification_email(
        to=recipient,
        subject=subject,
        message_text=f"E-mail ({original_subject}) não identificado. Verifique seu cadastro no Datacron.",
        html_body=body_html,
    )


async def _send_manager_confirmation(
    recipient: str,
    alerta_tipo: str,
    alerta_mensagem: str,
    condo_nome: str = None,
    email_remetente: str = None,
    email_assunto: str = None,
):
    import re
    from app.services.email_sender import send_notification_email, render_resolution_email
    # Extract code from message if possible (e.g. UC: 123456)
    cod_match = re.search(r"\(UC:\s*([^\)]+)\)", alerta_mensagem)
    instalacao = cod_match.group(1) if cod_match else None

    subject = f"✅ Pendência Resolvida: {alerta_tipo.replace('_', ' ').title()}"

    body_html = render_resolution_email(
        tipo=alerta_tipo,
        mensagem=alerta_mensagem,
        condo_nome=condo_nome,
        email_remetente=email_remetente,
        email_assunto=email_assunto,
        instalacao=instalacao
    )

    await send_notification_email(
        to=recipient,
        subject=subject,
        message_text=f"Alerta resolvido com sucesso: {alerta_mensagem}",
        html_body=body_html,
    )


@router.delete("/{id}")
async def delete_alerta(
    id: uuid.UUID,
    body: JustificativaBody = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(select(Alerta).where(Alerta.id == id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta nao encontrado")

    if (
        allowed_condo_ids is not None
        and a.condominio_id
        and a.condominio_id not in allowed_condo_ids
    ):
        raise HTTPException(status_code=403, detail="Acesso negado a este alerta")

    # Record audit log before deleting
    audit = AlertaAuditLog(
        alerta_id=a.id,
        alerta_tipo=a.tipo,
        alerta_gravidade=a.gravidade,
        alerta_mensagem=a.mensagem,
        condominio_id=a.condominio_id,
        acao="descartado",
        justificativa=body.justificativa,
        usuario_id=current_user.id,
        usuario_nome=current_user.nome,
        usuario_email=current_user.email,
    )
    db.add(audit)

    await db.delete(a)
    await db.commit()
    return {"status": "descartado"}


@router.get("/contagem")
async def count_alertas(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    stmt = select(func.count(Alerta.id)).where(
        Alerta.lido == False, Alerta.resolvido == False
    )
    if allowed_condo_ids is not None:
        stmt = stmt.where(Alerta.condominio_id.in_(allowed_condo_ids))
    result = await db.execute(stmt)
    return {"nao_lidos": result.scalar_one()}


@router.get("/audit-log", response_model=list[AlertaAuditLogResponse])
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Lista o histórico de ações em alertas (apenas admin)."""
    stmt = (
        select(AlertaAuditLog)
        .order_by(AlertaAuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()
