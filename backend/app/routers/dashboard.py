import uuid
from typing import Optional
from datetime import datetime, date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, extract, cast, String, case, Date, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, get_user_condo_ids
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
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """
    Returns consolidated KPI stats for the dashboard using SQL COUNT.
    Replaces the anti-pattern of downloading full lists to count in JS/Python.
    """
    today = date.today()

    # Condominios count (Active only)
    condo_stmt = select(func.count(Condominio.id)).where(Condominio.ativo == True)
    if allowed_condo_ids is not None:
        condo_stmt = condo_stmt.where(Condominio.id.in_(allowed_condo_ids))
    result = await db.execute(condo_stmt)
    condominios_count = result.scalar_one()

    # Faturas received in Current Month (KPI is more useful than just 'today')
    fatura_stmt = select(func.count(Fatura.id)).where(
        extract("month", Fatura.vencimento) == today.month,
        extract("year", Fatura.vencimento) == today.year
    )
    if allowed_condo_ids is not None:
        fatura_stmt = fatura_stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))
    result = await db.execute(fatura_stmt)
    recebidas_mes = result.scalar_one()

    # Active (unresolved) alerts count
    alert_stmt = select(func.count(Alerta.id)).where(Alerta.resolvido == False)
    if allowed_condo_ids is not None:
        alert_stmt = alert_stmt.where(Alerta.condominio_id.in_(allowed_condo_ids))
    result = await db.execute(alert_stmt)
    active_alerts = result.scalar_one()

    # Total faturado
    total_faturado_stmt = select(func.sum(Fatura.valor))
    if allowed_condo_ids is not None:
        total_faturado_stmt = total_faturado_stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))
    result = await db.execute(total_faturado_stmt)
    total_faturado = result.scalar() or 0.0

    # Condominios without ATA (Active only)
    ata_stmt = select(func.count(Condominio.id)).where(
        Condominio.ativo == True,
        (Condominio.ata_eleicao_nome == None) | (Condominio.ata_eleicao_nome == "")
    )
    if allowed_condo_ids is not None:
        ata_stmt = ata_stmt.where(Condominio.id.in_(allowed_condo_ids))
    result = await db.execute(ata_stmt)
    condos_sem_ata = result.scalar_one()

    return {
        "condominios_count": condominios_count,
        "recebidas_hoje": recebidas_mes,
        "active_alerts": active_alerts,
        "total_faturado": round(float(total_faturado), 2),
        "condos_sem_ata": condos_sem_ata,
    }


@router.get("/contas-esperadas")
async def contas_esperadas(
    mes: Optional[str] = Query(None, description="Formato: YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """
    Returns the total expected accounts (concessionárias ativas) 
    and how many have been received in the given month.
    """
    # Total expected = active concessionárias
    total_stmt = select(func.count(Concessionaria.id)).where(Concessionaria.ativo == True)
    if allowed_condo_ids is not None:
        total_stmt = total_stmt.where(Concessionaria.condominio_id.in_(allowed_condo_ids))
    
    total_result = await db.execute(total_stmt)
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

    recebidas_stmt = select(func.count(Fatura.id)).where(
        extract("year", Fatura.vencimento) == y,
        extract("month", Fatura.vencimento) == m,
    )
    if allowed_condo_ids is not None:
        recebidas_stmt = recebidas_stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))

    recebidas_result = await db.execute(recebidas_stmt)
    recebidas = recebidas_result.scalar_one()

    return {
        "total_esperadas": total,
        "recebidas": recebidas,
        "mes": f"{y}-{str(m).zfill(2)}",
    }


@router.get("/contas-por-condominio")
async def contas_por_condominio(
    mes: Optional[str] = Query(None, description="Formato: YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
):
    """
    Returns the count of expected (active concessionárias) and received (faturas)
    accounts for each condominium in the given month.
    """
    if mes:
        try:
            year, month = mes.split("-")
            y, m = int(year), int(month)
        except (ValueError, IndexError):
            y, m = datetime.now().year, datetime.now().month
    else:
        y, m = datetime.now().year, datetime.now().month

    # Subquery for expected counts per condo
    expected_sub = (
        select(Concessionaria.condominio_id, func.count(Concessionaria.id).label("esperadas"))
        .where(Concessionaria.ativo == True)
        .group_by(Concessionaria.condominio_id)
        .subquery()
    )

    # Subquery for received counts per condo in the target month
    received_sub = (
        select(Fatura.condominio_id, func.count(Fatura.id).label("recebidas"))
        .where(
            extract("year", Fatura.vencimento) == y,
            extract("month", Fatura.vencimento) == m
        )
        .group_by(Fatura.condominio_id)
        .subquery()
    )

    # Main query to join with Condominio
    stmt = (
        select(
            Condominio.id,
            Condominio.nome,
            Condominio.numero,
            func.coalesce(expected_sub.c.esperadas, 0).label("esperadas"),
            func.coalesce(received_sub.c.recebidas, 0).label("recebidas")
        )
        .outerjoin(expected_sub, Condominio.id == expected_sub.c.condominio_id)
        .outerjoin(received_sub, Condominio.id == received_sub.c.condominio_id)
        .where(Condominio.ativo == True)
        .order_by(cast(Condominio.numero, Integer))
    )

    if allowed_condo_ids is not None:
        stmt = stmt.where(Condominio.id.in_(allowed_condo_ids))

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "id": str(row.id),
            "nome": row.nome,
            "numero": row.numero,
            "esperadas": row.esperadas,
            "recebidas": row.recebidas
        }
        for row in rows
    ]


@router.get("/chart")
async def chart_data(
    meses: int = Query(6, ge=1, le=24),
    agrupar: str = Query("mes", pattern="^(mes|concessionaria|condominio)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    allowed_condo_ids: list | None = Depends(get_user_condo_ids),
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
        )
        if allowed_condo_ids is not None:
            stmt = stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))
            
        stmt = stmt.group_by("yr", "mn").order_by("yr", "mn")

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
        )
        if allowed_condo_ids is not None:
            stmt = stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))
            
        stmt = stmt.group_by("name").order_by(func.sum(Fatura.valor).desc())

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
        )
        if allowed_condo_ids is not None:
            stmt = stmt.where(Fatura.condominio_id.in_(allowed_condo_ids))
            
        stmt = stmt.group_by("name").order_by(func.sum(Fatura.valor).desc()).limit(15)

        result = await db.execute(stmt)
        return [{"name": row.name, "valor": round(float(row.total or 0), 2)} for row in result.all()]
