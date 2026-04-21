from fastapi import APIRouter, Depends, BackgroundTasks, Request
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
from app.services.email_monitor import run_email_scan
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


@router.post("/forcar-varredura")
async def force_scan(
    background_tasks: BackgroundTasks,
    _: User = Depends(require_module("gmail")),
):
    """Triggers an immediate Gmail inbox scan in the background."""
    background_tasks.add_task(run_email_scan)
    return {"message": "Varredura iniciada em segundo plano. Verifique os logs em instantes."}


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
