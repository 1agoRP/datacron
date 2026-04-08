from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
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
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns recent email processing logs."""
    stmt = (
        select(EmailLog, Condominio, Fatura)
        .outerjoin(Condominio, EmailLog.condominio_id == Condominio.id)
        .outerjoin(Fatura, EmailLog.fatura_id == Fatura.id)
        .order_by(EmailLog.recebido_em.desc())
        .offset(skip).limit(limit)
    )
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
        response_list.append(d)
        
    return response_list


@router.post("/forcar-varredura")
async def force_scan(
    background_tasks: BackgroundTasks,
    _: User = Depends(get_current_user),
):
    """Triggers an immediate Gmail inbox scan in the background."""
    background_tasks.add_task(run_email_scan)
    return {"message": "Varredura iniciada em segundo plano. Verifique os logs em instantes."}


@router.get("/status")
async def get_agent_status(_: User = Depends(get_current_user)):
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

import os
from app.config import settings

@router.get("/gmail/status")
async def get_gmail_status(_: User = Depends(get_current_user)):
    """Returns Gmail connection status."""
    is_connected = os.path.exists(settings.GMAIL_TOKEN_PATH)
    return {
        "connected": is_connected,
        "email": settings.GMAIL_USER if is_connected else None
    }
