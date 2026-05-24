from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional
import uuid

from app.database import get_db
from app.dependencies import get_current_user, require_module, get_user_condo_ids
from app.models.user import User
from app.models.alerta import EmailLog
from app.models.condominio import Condominio
from app.models.fatura import Fatura
from app.schemas import EmailLogResponse
from app.workers.scheduler import scheduler

router = APIRouter(prefix="/emails", tags=["E-mails & Agente"])


@router.get("/logs", response_model=list[EmailLogResponse])
async def get_email_logs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_module("gmail")),
    allowed_condo_ids: Optional[list[uuid.UUID]] = Depends(get_user_condo_ids),
):
    """
    Returns processed email logs (only identified faturas).

    - Admins and users with 'todos' access see ALL processed faturas.
    - Regular users see only faturas from their condominios portfolio.
    - Unidentified and ignored emails are NEVER returned here.
    """
    # Base query: only emails that were identified (have a condominio linked)
    stmt = (
        select(EmailLog, Condominio, Fatura)
        .outerjoin(Condominio, EmailLog.condominio_id == Condominio.id)
        .outerjoin(Fatura, EmailLog.fatura_id == Fatura.id)
        .where(
            EmailLog.condominio_id.is_not(None),   # only identified
            EmailLog.status.in_(["identificado", "processado"]),  # only processed
        )
    )

    # RBAC: restrict to user's portfolio unless they have global access
    if allowed_condo_ids is not None:
        stmt = stmt.where(EmailLog.condominio_id.in_(allowed_condo_ids))

    stmt = stmt.order_by(EmailLog.recebido_em.desc()).offset(skip).limit(limit)

    result = await db.execute(stmt)
    rows = result.all()

    response_list = []
    for log, condo, fatura in rows:
        d = EmailLogResponse.model_validate(log)
        if condo:
            d.condominio_nome = condo.nome
        if fatura:
            d.fatura_desbloqueada = fatura.pdf_desbloqueado
            d.fatura_url = f"/api/faturas/{fatura.id}/pdf"
            d.fatura_valor = fatura.valor
            d.fatura_vencimento = fatura.vencimento
            d.dados_extraidos = fatura.dados_extraidos
        else:
            d.dados_extraidos = log.dados_extraidos
        response_list.append(d)

    return response_list


@router.get("/status")
async def get_agent_status(_: User = Depends(require_module("gmail"))):
    """Returns the current status of the background agent."""
    jobs = scheduler.get_jobs() if scheduler.running else []
    return {
        "agente_online": scheduler.running,
        "jobs": [
            {
                "id": j.id,
                "name": j.name,
                "next_run": str(j.next_run_time) if j.next_run_time else None,
            }
            for j in jobs
        ],
    }


@router.get("/inbox")
async def get_inbox_status(_: User = Depends(require_module("gmail"))):
    from fastapi.concurrency import run_in_threadpool
    from app.services.email_monitor import get_inbox_count
    count = await run_in_threadpool(get_inbox_count)
    return {"inbox_count": count}


import os
from app.config import settings

@router.get("/gmail/status")
async def get_gmail_status(_: User = Depends(require_module("gmail"))):
    """Returns Gmail connection status."""
    is_connected = bool(settings.GMAIL_USER) and bool(settings.GMAIL_PASSWORD)
    return {
        "connected": is_connected,
        "email": settings.GMAIL_USER if is_connected else None
    }

@router.get("/gmail/auth")
async def get_gmail_auth_url(request: Request, _: User = Depends(require_module("gmail"))):
    """Returns the Google OAuth login URL for the popup."""
    try:
        from google_auth_oauthlib.flow import Flow
        from app.services.email_monitor import SCOPES

        if os.path.exists(settings.GMAIL_CREDENTIALS_PATH):
            flow = Flow.from_client_secrets_file(
                settings.GMAIL_CREDENTIALS_PATH,
                scopes=SCOPES
            )
            flow.redirect_uri = "urn:ietf:wg:oauth:2.0:oob"
            auth_url, _ = flow.authorization_url(prompt='consent')
            return {"url": auth_url}
    except Exception as e:
        pass

    frontend_url = request.headers.get("origin", "http://localhost:3000")
    dummy_oauth_url = f"{frontend_url}/api/auth/simulated-google-popup"
    return {"url": dummy_oauth_url}


@router.get("/gmail-download/{message_id}")
async def download_gmail_fatura(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Fetches a specific email from Gmail and returns the PDF attachment if found."""
    import imaplib
    import email
    import io
    from fastapi.responses import StreamingResponse
    from fastapi.concurrency import run_in_threadpool
    from app.config import settings

    def _get_pdf_from_gmail():
        if not settings.GMAIL_USER or not settings.GMAIL_PASSWORD:
            raise Exception("Credenciais do Gmail não configuradas")
            
        mail = imaplib.IMAP4_SSL(settings.GMAIL_HOST)
        try:
            mail.login(settings.GMAIL_USER, settings.GMAIL_PASSWORD)
            
            # Tenta selecionar "Todos os e-mails" (Gmail All Mail) para busca global
            # Português é o padrão, mas tentamos Inglês como fallback
            status, _ = mail.select('"[Gmail]/Todos os e-mails"', readonly=True)
            if status != "OK":
                status, _ = mail.select('"[Gmail]/All Mail"', readonly=True)
            if status != "OK":
                mail.select("inbox", readonly=True)
            
            # Fetch message by Gmail Message ID (X-GM-MSGID) if supported, 
            # but usually we use search or fetch UID. 
            # The system stores Gmail Message ID which is unique.
            res, data = mail.search(None, f'X-GM-MSGID {message_id}')
            if res != 'OK' or not data[0]:
                raise Exception("Mensagem não encontrada no Gmail")
                
            msg_uid = data[0].split()[0]
            res, msg_data = mail.fetch(msg_uid, '(RFC822)')
            
            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            pdf_content = None
            filename = "fatura_gmail.pdf"

            for part in msg.walk():
                if part.get_content_maintype() == 'multipart':
                    continue
                if part.get('Content-Disposition') is None:
                    continue
                
                part_filename = part.get_filename()
                if part_filename and part_filename.lower().endswith('.pdf'):
                    pdf_content = part.get_payload(decode=True)
                    filename = part_filename
                    break
            
            if not pdf_content:
                raise Exception("Nenhum anexo PDF encontrado neste e-mail")

            return pdf_content, filename
        finally:
            try:
                mail.logout()
            except:
                pass

    try:
        content, filename = await run_in_threadpool(_get_pdf_from_gmail)
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))
