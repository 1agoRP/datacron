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

from datetime import date

from app.models.fatura import Fatura

router = APIRouter(prefix="/historico", tags=["Historico"])

@router.get("", response_model=list[HistoricoFaturaResponse])
async def list_historico(
    condominio_id: Optional[uuid.UUID] = None,
    concessionaria_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: Optional[list] = Depends(get_user_condo_ids),
):
    """
    Retorna o histórico unificado de faturas.
    Combina dados da tabela 'historico_faturas' (legado) e 'faturas' (novas).
    Organizado por vencimento mais recente.
    """
    # 1. Fetch from HistoricoFatura
    stmt_hist = select(HistoricoFatura).options(
        selectinload(HistoricoFatura.condominio),
        selectinload(HistoricoFatura.concessionaria),
    )
    if condominio_id:
        stmt_hist = stmt_hist.where(HistoricoFatura.condominio_id == condominio_id)
    if concessionaria_id:
        stmt_hist = stmt_hist.where(HistoricoFatura.concessionaria_id == concessionaria_id)
    if allowed_condo_ids is not None:
        stmt_hist = stmt_hist.where(HistoricoFatura.condominio_id.in_(allowed_condo_ids))

    # 2. Fetch from Fatura
    stmt_fat = select(Fatura).options(
        selectinload(Fatura.condominio),
        selectinload(Fatura.concessionaria),
    )
    if condominio_id:
        stmt_fat = stmt_fat.where(Fatura.condominio_id == condominio_id)
    if concessionaria_id:
        stmt_fat = stmt_fat.where(Fatura.concessionaria_id == concessionaria_id)
    if allowed_condo_ids is not None:
        stmt_fat = stmt_fat.where(Fatura.condominio_id.in_(allowed_condo_ids))

    # Execute
    res_hist = await db.execute(stmt_hist)
    res_fat = await db.execute(stmt_fat)
    
    hists = res_hist.scalars().all()
    fats = res_fat.scalars().all()

    # 3. Combine
    combined = list(hists)
    seen_ids = {h.id for h in hists}
    
    for f in fats:
        if f.id not in seen_ids:
            combined.append(f)
            seen_ids.add(f.id)

    # 4. Sort by vencimento DESC
    combined.sort(key=lambda x: x.vencimento or date.min, reverse=True)
    
    return combined
