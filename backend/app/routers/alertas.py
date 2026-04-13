import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_write, get_user_condo_ids
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
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    stmt = select(Alerta).where(Alerta.resolvido == resolvido)
    # RBAC: filter by user's assigned condominios
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
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    
    # RBAC Check
    if allowed_condo_ids is not None and a.condominio_id and a.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este alerta")
    a.lido = True
    await db.commit()
    await db.refresh(a)
    return a


@router.put("/{id}/resolver", response_model=AlertaResponse)
async def resolve_alerta(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(select(Alerta).where(Alerta.id == id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    
    # RBAC Check
    if allowed_condo_ids is not None and a.condominio_id and a.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este alerta")
    
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
    Sends a professional HTML reply email informing that the concessionária
    was not found in the system and needs review.
    """

    import base64
    import re
    from email.mime.text import MIMEText
    from app.services.email_monitor import get_gmail_service

    service = get_gmail_service()
    if not service:
        raise Exception("Gmail service not available")

    # Detect dealership type from subject for better subject line
    subj_upper = original_subject.upper()
    if "ENEL" in subj_upper or "ELETROPAULO" in subj_upper:
        tipo_label = "Enel"
        codigo_label = "Instalação"
    elif "SABESP" in subj_upper:
        tipo_label = "Sabesp"
        codigo_label = "Fornecimento"
    elif "COMGÁS" in subj_upper or "COMGAS" in subj_upper:
        tipo_label = "Comgas"
        codigo_label = "Código de Usuário"
    else:
        tipo_label = "Concessionária"
        codigo_label = "Código"

    # Extract code from subject if available
    code_match = re.search(r"(\d{6,})", original_subject)
    code = code_match.group(1) if code_match else "N/D"

    subject = f"{tipo_label} – {codigo_label} {code} – não reconhecida no cadastro"

    body_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af, #2563eb); padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">⚡ Datacron</h1>
      <p style="color: #93c5fd; margin: 6px 0 0; font-size: 13px; font-weight: 600;">Sistema de Gestão de Faturas</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <h2 style="color: #0f172a; font-size: 18px; font-weight: 800; margin: 0 0 16px;">
        ⚠️ Concessionária Não Identificada
      </h2>
      
      <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 20px;">
        Prezado(a), informamos que o e-mail recebido <strong>não foi identificado</strong> como uma concessionária cadastrada em nosso sistema Datacron.
      </p>

      <!-- Info Table -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
        <div style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; display: flex;">
          <span style="color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; min-width: 120px;">Remetente</span>
          <span style="color: #0f172a; font-size: 14px; font-weight: 600;">{recipient}</span>
        </div>
        <div style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; display: flex;">
          <span style="color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; min-width: 120px;">Assunto Original</span>
          <span style="color: #0f172a; font-size: 14px; font-weight: 600;">{original_subject}</span>
        </div>
        <div style="padding: 14px 18px; display: flex;">
          <span style="color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; min-width: 120px;">Tipo Detectado</span>
          <span style="color: #2563eb; font-size: 14px; font-weight: 700;">{tipo_label} ({codigo_label})</span>
        </div>
      </div>

      <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 8px;">
        <strong>Ação necessária:</strong> Será necessária uma revisão para verificar se esta concessionária deve ser cadastrada no sistema.
      </p>
      
      <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
        Caso tenha dúvidas, entre em contato com a administração.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 600;">
        Datacron · Gestão Inteligente de Faturas · E-mail enviado automaticamente
      </p>
    </div>
  </div>
</body>
</html>"""

    message = MIMEText(body_html, "html", "utf-8")
    message["To"] = recipient
    message["Subject"] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    service.users().messages().send(
        userId="me",
        body={"raw": raw}
    ).execute()


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
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    
    # RBAC Check
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
    """Returns unread alert count, useful for the notification badge."""
    from sqlalchemy import func
    stmt = select(func.count(Alerta.id)).where(Alerta.lido == False, Alerta.resolvido == False)
    if allowed_condo_ids is not None:
        stmt = stmt.where(Alerta.condominio_id.in_(allowed_condo_ids))
    result = await db.execute(stmt)
    return {"nao_lidos": result.scalar_one()}
