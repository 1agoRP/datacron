import uuid
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_write, get_user_condo_ids
from app.models.user import User
from app.models.alerta import Alerta
from app.schemas import AlertaResponse
from app.services.email_sender import send_notification_email

router = APIRouter(prefix="/alertas", tags=["Alertas"])


@router.get("", response_model=list[AlertaResponse])
async def list_alertas(
    tipo: Optional[str] = None,
    gravidade: Optional[str] = None,
    lido: Optional[bool] = None,
    resolvido: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
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
    
    if allowed_condo_ids is not None and a.condominio_id and a.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este alerta")
    a.lido = True
    await db.commit()
    await db.refresh(a)
    return a


@router.put("/{id}/resolver", response_model=AlertaResponse)
async def resolve_alerta(
    id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(select(Alerta).where(Alerta.id == id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta nao encontrado")
    
    if allowed_condo_ids is not None and a.condominio_id and a.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este alerta")
    
    # Send emails in background to avoid "Failed to fetch" (timeouts)
    background_tasks.add_task(process_alert_resolution_emails, a.tipo, a.mensagem, current_user.email)
    
    a.lido = True
    a.resolvido = True
    await db.commit()
    await db.refresh(a)
    return a


def process_alert_resolution_emails(alerta_tipo: str, alerta_mensagem: str, manager_email: str):
    """Handles all email notifications related to an alert resolution."""
    try:
        # 1. Reply to sender if it was an unidentified email
        if alerta_tipo == "email_nao_identificado":
            import re
            sender_match = re.search(r"de '([^']+)'", alerta_mensagem)
            subject_match = re.search(r"assunto '([^']+)'", alerta_mensagem)
            sender = sender_match.group(1) if sender_match else None
            subject = subject_match.group(1) if subject_match else "Fatura"
            
            if sender:
                _send_reply_to_sender(sender, subject)
        
        # 2. Notify the manager
        _send_manager_confirmation(manager_email, alerta_tipo, alerta_mensagem)
    except Exception as e:
        import logging
        logging.error(f"Error in background alert emails: {e}")


def _send_reply_to_sender(recipient: str, original_subject: str):
    import re
    subj_upper = original_subject.upper()
    if "ENEL" in subj_upper or "ELETROPAULO" in subj_upper:
        tipo_label, codigo_label = "Enel", "Instalação"
    elif "SABESP" in subj_upper:
        tipo_label, codigo_label = "Sabesp", "Fornecimento"
    elif "COMGÁS" in subj_upper or "COMGAS" in subj_upper:
        tipo_label, codigo_label = "Comgas", "Código de Usuário"
    else:
        tipo_label, codigo_label = "Concessionária", "Código"

    code_match = re.search(r"(\d{6,})", original_subject)
    code = code_match.group(1) if code_match else "N/D"

    subject = f"{tipo_label} - {codigo_label} {code} - nao reconhecida no cadastro"
    
    body_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family: sans-serif; padding: 20px; color: #334155;">
    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #1e40af;">Datacron - Concessionaria Nao Identificada</h2>
        <p>Prezado(a), o e-mail recebido ({original_subject}) nao foi identificado em nosso sistema.</p>
        <p>Sera necessaria uma revisao manual pela administracao.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #64748b;">Este e uma mensagem automatica, por favor nao responda.</p>
    </div>
</body>
</html>"""

    send_notification_email(
        to=recipient,
        subject=subject,
        message_text=f"Aviso: Concessionaria nao identificada no sistema para o assunto: {original_subject}",
        html_body=body_html
    )


def _send_manager_confirmation(recipient: str, alerta_tipo: str, alerta_mensagem: str):
    subject = f"✅ Pendência Resolvida: {alerta_tipo.replace('_', ' ').title()}"
    
    body_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family: sans-serif; padding: 20px; color: #334155;">
    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #16a34a; margin-top: 0;">Resolução Confirmada</h2>
        <p>O alerta abaixo foi marcado como <strong>resolvido</strong>:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Tipo</div>
            <div style="font-weight: bold; margin-bottom: 8px;">{alerta_tipo.upper()}</div>
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Mensagem</div>
            <div>{alerta_mensagem}</div>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">Sistema Datacron - {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
    </div>
</body>
</html>"""

    send_notification_email(
        to=recipient,
        subject=subject,
        message_text=f"Alerta resolvido com sucesso: {alerta_mensagem}",
        html_body=body_html
    )


@router.delete("/{id}", status_code=204)
async def delete_alerta(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_write()),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(select(Alerta).where(Alerta.id == id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta nao encontrado")
    
    if allowed_condo_ids is not None and a.condominio_id and a.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este alerta")
    await db.delete(a)
    await db.commit()


@router.get("/contagem")
async def count_alertas(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    stmt = select(func.count(Alerta.id)).where(Alerta.lido == False, Alerta.resolvido == False)
    if allowed_condo_ids is not None:
        stmt = stmt.where(Alerta.condominio_id.in_(allowed_condo_ids))
    result = await db.execute(stmt)
    return {"nao_lidos": result.scalar_one()}
