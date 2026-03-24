import uuid
from typing import Optional
from datetime import datetime, date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, extract, cast, String, case, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.condominio import Condominio
from app.models.concessionaria import Concessionaria
from app.models.fatura import Fatura
from app.models.alerta import Alerta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Returns consolidated KPI stats for the dashboard using SQL COUNT.
    Replaces the anti-pattern of downloading full lists to count in JS/Python.
    """
    today = date.today()

    # Run all counts in parallel via a single compound query
    result = await db.execute(
        select(
            func.count(Condominio.id).label("condominios_count"),
        )
    )
    condominios_count = result.scalar_one()

    # Faturas received today
    result = await db.execute(
        select(func.count(Fatura.id)).where(
            func.date(Fatura.created_at) == today
        )
    )
    recebidas_hoje = result.scalar_one()

    # Active (unresolved) alerts count
    result = await db.execute(
        select(func.count(Alerta.id)).where(Alerta.resolvido == False)
    )
    active_alerts = result.scalar_one()

    return {
        "condominios_count": condominios_count,
        "recebidas_hoje": recebidas_hoje,
        "active_alerts": active_alerts,
    }


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
    Returns chart data using SQL GROUP BY + SUM aggregation.
    No longer loads all faturas into Python memory.
    """
    from dateutil.relativedelta import relativedelta

    now = datetime.now()
    start_date = now - relativedelta(months=meses)

    if agrupar == "mes":
        # SQL aggregation: GROUP BY year-month, SUM(valor)
        date_col = func.coalesce(Fatura.vencimento, func.date(Fatura.created_at))
        stmt = (
            select(
                extract("year", date_col).label("yr"),
                extract("month", date_col).label("mn"),
                func.sum(Fatura.valor).label("total"),
            )
            .where(Fatura.created_at >= start_date)
            .group_by("yr", "mn")
            .order_by("yr", "mn")
        )

        result = await db.execute(stmt)
        rows = result.all()

        # Build a complete month map to ensure empty months show up
        buckets: dict[str, float] = {}
        for i in range(meses):
            d = now - relativedelta(months=meses - 1 - i)
            key = f"{d.year}-{str(d.month).zfill(2)}"
            buckets[key] = 0.0

        for row in rows:
            key = f"{int(row.yr)}-{str(int(row.mn)).zfill(2)}"
            if key in buckets:
                buckets[key] = round(float(row.total or 0), 2)

        return [{"name": k, "valor": v} for k, v in buckets.items()]

    elif agrupar == "concessionaria":
        # SQL aggregation: GROUP BY concessionaria tipo
        stmt = (
            select(
                func.coalesce(Concessionaria.tipo, "Outros").label("name"),
                func.sum(Fatura.valor).label("total"),
            )
            .join(Concessionaria, Fatura.concessionaria_id == Concessionaria.id, isouter=True)
            .where(Fatura.created_at >= start_date)
            .group_by("name")
            .order_by(func.sum(Fatura.valor).desc())
        )

        result = await db.execute(stmt)
        return [{"name": row.name, "valor": round(float(row.total or 0), 2)} for row in result.all()]

    else:  # condominio
        # SQL aggregation: GROUP BY condominio nome, top 15
        stmt = (
            select(
                func.coalesce(Condominio.nome, "Desconhecido").label("name"),
                func.sum(Fatura.valor).label("total"),
            )
            .join(Condominio, Fatura.condominio_id == Condominio.id, isouter=True)
            .where(Fatura.created_at >= start_date)
            .group_by("name")
            .order_by(func.sum(Fatura.valor).desc())
            .limit(15)
        )

        result = await db.execute(stmt)
        return [{"name": row.name, "valor": round(float(row.total or 0), 2)} for row in result.all()]
