import uuid
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/auditoria", tags=["Auditoria"])


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    usuario_id: Optional[uuid.UUID]
    usuario_nome: Optional[str]
    usuario_email: Optional[str]
    acao: str
    entidade_tipo: str
    entidade_id: Optional[uuid.UUID]
    detalhes: Optional[dict]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[AuditLogResponse])
async def list_audit_logs(
    acao: Optional[str] = None,
    entidade_tipo: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """
    Returns global audit logs (condominios and accounts inclusions/deletions).
    Only for admin.
    """
    stmt = select(AuditLog)
    
    if acao:
        stmt = stmt.where(AuditLog.acao == acao)
    if entidade_tipo:
        stmt = stmt.where(AuditLog.entidade_tipo == entidade_tipo)
        
    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    return result.scalars().all()
