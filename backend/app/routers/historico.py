import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, get_user_condo_ids
from app.models.user import User
from app.models.historico_fatura import HistoricoFatura
from app.schemas import HistoricoFaturaResponse

router = APIRouter(prefix="/historico", tags=["Historico"])

@router.get("/", response_model=list[HistoricoFaturaResponse])
async def list_historico(
    condominio_id: Optional[uuid.UUID] = None,
    concessionaria_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """Retorna o histórico de faturas salvas na tabela historico_faturas."""
    stmt = select(HistoricoFatura).options(
        selectinload(HistoricoFatura.condominio),
        selectinload(HistoricoFatura.concessionaria),
    )
    if condominio_id:
        stmt = stmt.where(HistoricoFatura.condominio_id == condominio_id)
    if concessionaria_id:
        stmt = stmt.where(HistoricoFatura.concessionaria_id == concessionaria_id)
    
    # RBAC: filter by user's assigned condominios
    if allowed_condo_ids is not None:
        stmt = stmt.where(HistoricoFatura.condominio_id.in_(allowed_condo_ids))

    stmt = stmt.order_by(HistoricoFatura.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()
