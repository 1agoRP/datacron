import uuid
from dataclasses import dataclass
from datetime import date
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.concessionaria import Concessionaria
from app.models.fatura import Fatura
from app.models.historico_fatura import HistoricoFatura


@dataclass(frozen=True)
class DuplicateFatura:
    source: str
    id: uuid.UUID


async def find_duplicate_fatura(
    db: AsyncSession,
    *,
    condominio_id: Optional[uuid.UUID],
    tipo_conta: Optional[str],
    codigo_conta: Optional[str],
    valor: float,
    vencimento: Optional[date],
    include_history: bool = True,
) -> Optional[DuplicateFatura]:
    """Finds an already registered bill for the same condo, account code, value, and due date."""
    if not condominio_id or not tipo_conta or not codigo_conta or not vencimento:
        return None
    valor_min = round(float(valor), 2) - 0.005
    valor_max = round(float(valor), 2) + 0.005

    async def _find(model, source: str) -> Optional[DuplicateFatura]:
        stmt = (
            select(model.id)
            .join(Concessionaria, model.concessionaria_id == Concessionaria.id)
            .where(
                model.condominio_id == condominio_id,
                Concessionaria.tipo == tipo_conta,
                Concessionaria.instalacao == codigo_conta,
                model.valor.between(valor_min, valor_max),
                model.vencimento == vencimento,
            )
            .limit(1)
        )
        result = await db.execute(stmt)
        existing_id = result.scalar_one_or_none()
        if existing_id:
            return DuplicateFatura(source=source, id=existing_id)
        return None

    duplicate = await _find(Fatura, "faturas")
    if duplicate or not include_history:
        return duplicate

    return await _find(HistoricoFatura, "historico_faturas")
