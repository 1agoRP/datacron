import uuid
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.condominio import Condominio
from app.models.concessionaria import Concessionaria
from app.models.fatura import Fatura

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/contas-esperadas")
async def contas_esperadas(
    mes: Optional[str] = Query(None, description="Formato: YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Returns the total expected accounts (concessionárias ativas) 
    and how many have been received in the given month.
    """
    # Total expected = active concessionárias
    total_result = await db.execute(
        select(func.count(Concessionaria.id)).where(Concessionaria.ativo == True)
    )
    total = total_result.scalar_one()

    # Received in month = faturas created in that month
    if mes:
        try:
            year, month = mes.split("-")
            y, m = int(year), int(month)
        except (ValueError, IndexError):
            y, m = datetime.now().year, datetime.now().month
    else:
        y, m = datetime.now().year, datetime.now().month

    recebidas_result = await db.execute(
        select(func.count(Fatura.id)).where(
            extract("year", Fatura.created_at) == y,
            extract("month", Fatura.created_at) == m,
        )
    )
    recebidas = recebidas_result.scalar_one()

    return {
        "total_esperadas": total,
        "recebidas": recebidas,
        "mes": f"{y}-{str(m).zfill(2)}",
    }


@router.get("/chart")
async def chart_data(
    meses: int = Query(6, ge=1, le=24),
    agrupar: str = Query("mes", pattern="^(mes|concessionaria|condominio)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Returns chart data for the dashboard, grouped by month, concessionária or condomínio.
    Supports dynamic month range (6, 12, etc).
    """
    from dateutil.relativedelta import relativedelta

    now = datetime.now()
    start_date = now - relativedelta(months=meses)

    stmt = (
        select(Fatura)
        .where(Fatura.created_at >= start_date)
        .order_by(Fatura.created_at)
    )

    if agrupar in ("concessionaria", "condominio"):
        if agrupar == "concessionaria":
            stmt = stmt.join(Concessionaria, Fatura.concessionaria_id == Concessionaria.id)
        else:
            stmt = stmt.join(Condominio, Fatura.condominio_id == Condominio.id)

    result = await db.execute(stmt)
    faturas = result.scalars().all()

    if agrupar == "mes":
        # Group by month
        buckets: dict[str, float] = {}
        for i in range(meses):
            d = now - relativedelta(months=meses - 1 - i)
            key = f"{d.year}-{str(d.month).zfill(2)}"
            buckets[key] = 0.0

        for f in faturas:
            date = f.vencimento or (f.created_at.date() if f.created_at else None)
            if not date:
                continue
            key = f"{date.year}-{str(date.month).zfill(2)}"
            if key in buckets:
                buckets[key] += float(f.valor or 0)

        return [{"name": k, "valor": round(v, 2)} for k, v in buckets.items()]

    elif agrupar == "concessionaria":
        # Group by concessionária type
        buckets: dict[str, float] = {}
        for f in faturas:
            # Load concessionária to get tipo
            if f.concessionaria_id:
                conc_result = await db.execute(
                    select(Concessionaria).where(Concessionaria.id == f.concessionaria_id)
                )
                conc = conc_result.scalar_one_or_none()
                key = conc.tipo if conc else "Outros"
            else:
                key = "Outros"
            buckets[key] = buckets.get(key, 0.0) + float(f.valor or 0)

        return [{"name": k, "valor": round(v, 2)} for k, v in buckets.items()]

    else:  # condominio
        # Group by condomínio
        buckets: dict[str, float] = {}
        for f in faturas:
            if f.condominio_id:
                condo_result = await db.execute(
                    select(Condominio).where(Condominio.id == f.condominio_id)
                )
                condo = condo_result.scalar_one_or_none()
                key = condo.nome if condo else "Desconhecido"
            else:
                key = "Desconhecido"
            buckets[key] = buckets.get(key, 0.0) + float(f.valor or 0)

        sorted_items = sorted(buckets.items(), key=lambda x: x[1], reverse=True)[:15]
        return [{"name": k, "valor": round(v, 2)} for k, v in sorted_items]
