import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.alerta import Alerta, EmailLog
from app.schemas import AlertaResponse, EmailLogResponse

router = APIRouter(prefix="/alertas", tags=["Alertas"])


@router.get("/", response_model=list[AlertaResponse])
async def list_alertas(
    tipo: Optional[str] = None,
    gravidade: Optional[str] = None,
    lido: Optional[bool] = None,
    resolvido: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Alerta).where(Alerta.resolvido == resolvido)
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
):
    result = await db.execute(select(Alerta).where(Alerta.id == id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    a.lido = True
    await db.commit()
    await db.refresh(a)
    return a


@router.put("/{id}/resolver", response_model=AlertaResponse)
async def resolve_alerta(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Alerta).where(Alerta.id == id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    
    # If it's an email_nao_identificado alert, try to send reply email
    if a.tipo == "email_nao_identificado":
        try:
            import re
            # Extract sender email from the alert message
            sender_match = re.search(r"de '([^']+)'", a.mensagem)
            subject_match = re.search(r"assunto '([^']+)'", a.mensagem)
            sender = sender_match.group(1) if sender_match else None
            subject = subject_match.group(1) if subject_match else "Fatura"
            
            if sender:
                _send_resolution_email(sender, subject)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Could not send resolution email: {e}")
    
    a.lido = True
    a.resolvido = True
    await db.commit()
    await db.refresh(a)
    return a


def _send_resolution_email(recipient: str, original_subject: str):
    """
    Sends a standard reply email informing that the concessionária
    was not found in the system and needs review.
    """
    import base64
    from email.mime.text import MIMEText
    from app.services.email_monitor import get_gmail_service

    service = get_gmail_service()
    if not service:
        raise Exception("Gmail service not available")

    body_text = (
        f"Prezado(a),\n\n"
        f"Informamos que o e-mail recebido com o assunto \"{original_subject}\" "
        f"não foi identificado como uma concessionária cadastrada em nosso sistema.\n\n"
        f"Será necessária uma revisão para verificar se esta concessionária deve ser "
        f"cadastrada ou não no sistema Datacron.\n\n"
        f"Caso tenha dúvidas, entre em contato com a administração.\n\n"
        f"Atenciosamente,\n"
        f"Sistema Datacron - Gestão de Faturas"
    )

    message = MIMEText(body_text, "plain", "utf-8")
    message["To"] = recipient
    message["Subject"] = f"Re: {original_subject} - Concessionária não cadastrada"

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    service.users().messages().send(
        userId="me",
        body={"raw": raw}
    ).execute()


@router.delete("/{id}", status_code=204)
async def delete_alerta(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Alerta).where(Alerta.id == id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    await db.delete(a)
    await db.commit()


@router.get("/contagem")
async def count_alertas(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns unread alert count, useful for the notification badge."""
    from sqlalchemy import func

    result = await db.execute(
        select(func.count(Alerta.id)).where(Alerta.lido == False, Alerta.resolvido == False)
    )
    return {"nao_lidos": result.scalar_one()}
