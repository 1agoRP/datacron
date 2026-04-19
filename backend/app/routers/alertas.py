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
        raise HTTPException(status_code=404, detail="Alerta nao encontrado")
    
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
    current_user: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    result = await db.execute(select(Alerta).where(Alerta.id == id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta nao encontrado")
    
    # RBAC Check
    if allowed_condo_ids is not None and a.condominio_id and a.condominio_id not in allowed_condo_ids:
        raise HTTPException(status_code=403, detail="Acesso negado a este alerta")
    
    # If it's an email_nao_identificado alert, try to send reply email to sender
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
    
    # ALWAYS send a confirmation email to the user who is resolving it (the manager)
    # This fulfills the user's request: "resolução de problema que me enviaria um e-mail"
    try:
        _send_manager_resolution_email(current_user.email, a)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Could not send manager notification: {e}")
    
    a.lido = True
    a.resolvido = True
    await db.commit()
    await db.refresh(a)
    return a


def _send_resolution_email(recipient: str, original_subject: str):
    """
    Sends a professional HTML reply email informing that the concessionaria
    was not found in the system and needs review.
    """
    import re
    from app.services.email_sender import send_notification_email

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

    subject = f"{tipo_label} - {codigo_label} {code} - nao reconhecida no cadastro"
    
    body_text = f"Prezado(a), informamos que o e-mail recebido ({original_subject}) não foi identificado em nosso sistema Datacron."

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

    subject = f"{tipo_label} - {codigo_label} {code} - nao reconhecida no cadastro"

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
        Aviso: Concessionaria Nao Identificada
      </h2>
      
      <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 20px;">
        Prezado(a), informamos que o e-mail recebido nao foi identificado como uma concessionaria cadastrada em nosso sistema Datacron.
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
        Acao necessaria: Sera necessaria uma revisao para verificar se esta concessionaria deve ser cadastrada no sistema.
      </p>
      
      <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
        Caso tenha duvidas, entre em contato com a administracao.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 600;">
        Datacron - Gestao Inteligente de Faturas - E-mail enviado automaticamente
      </p>
    </div>
  </div>
</body>
</html>"""

    message_text = body_text
    send_notification_email(
        to=recipient,
        subject=subject,
        message_text=message_text,
        html_body=body_html
    )


def _send_manager_resolution_email(recipient: str, alerta: Alerta):
    """Sends a confirmation email to the manager who resolved the alert."""
    from app.services.email_sender import send_notification_email
    
    subject = f"✅ Alerta Resolvido: {alerta.tipo.replace('_', ' ').title()}"
    
    body_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family: sans-serif; padding: 20px; color: #334155;">
    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #16a34a; margin-top: 0;">Resolução Confirmada</h2>
        <p>Olá, o seguinte alerta foi marcado como <strong>resolvido</strong> em sua conta Datacron:</p>
        
        <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Tipo</div>
            <div style="font-size: 16px; margin-bottom: 12px;">{alerta.tipo.replace('_', ' ').upper()}</div>
            
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Mensagem</div>
            <div style="font-size: 14px;">{alerta.mensagem}</div>
        </div>
        
        <p style="font-size: 13px; color: #94a3b8;">Data da resolução: {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
    </div>
</body>
</html>"""

    send_notification_email(
        to=recipient,
        subject=subject,
        message_text=f"Alerta resolvido: {alerta.mensagem}",
        html_body=body_html
    )
from datetime import datetime


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
