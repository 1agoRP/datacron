"""
Alert Manager Service
======================
Analyzes new faturas and generates alerts based on business rules:
  1. Value variation > threshold vs historical average
  2. Bill not received by expected day of month  
  3. PDF unlock failure
"""

import logging
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.alerta import Alerta
from app.models.concessionaria import Concessionaria
from app.models.fatura import Fatura

logger = logging.getLogger(__name__)


async def check_and_create_alerts(
    fatura: Fatura,
    conc: Concessionaria,
    db: AsyncSession,
) -> None:
    """
    Runs all alert checks for a newly processed fatura.
    Adds any generated alerts to the DB session (caller must commit).
    """
    await _check_value_variation(fatura, conc, db)
    await _check_pdf_failure(fatura, db)


async def _check_value_variation(
    fatura: Fatura,
    conc: Concessionaria,
    db: AsyncSession,
) -> None:
    """
    Calculates the average of the last 6 faturas for this concessionaria.
    If the new fatura deviates more than the configured threshold (default 20%),
    creates a HIGH or MEDIUM priority alert.
    """
    if fatura.valor is None or fatura.valor == 0:
        return

    # Get average of last 6 faturas (excluding current)
    result = await db.execute(
        select(func.avg(Fatura.valor))
        .where(
            Fatura.concessionaria_id == conc.id,
            Fatura.status == "processada",
            Fatura.id != fatura.id,
            Fatura.valor > 0,
        )
        .limit(6)
    )
    avg_valor: Optional[float] = result.scalar_one_or_none()

    if not avg_valor or avg_valor == 0:
        # Not enough history, update the mean value on concessionaria
        conc.valor_medio = fatura.valor
        return

    variation = abs(fatura.valor - avg_valor) / avg_valor
    fatura.variacao_percentual = round(variation * 100, 2)

    if variation > settings.ALERT_VARIATION_THRESHOLD:
        direction = "acima" if fatura.valor > avg_valor else "abaixo"
        pct = round(variation * 100, 1)
        gravidade = "alta" if variation > 0.35 else "media"

        alert = Alerta(
            condominio_id=fatura.condominio_id,
            fatura_id=fatura.id,
            tipo="variacao_valor",
            gravidade=gravidade,
            mensagem=(
                f"Variação de {pct}% no valor da {conc.tipo} "
                f"— R$ {fatura.valor:,.2f} ({direction} da média de R$ {avg_valor:,.2f})"
            ),
        )
        db.add(alert)
        logger.info(f"Alert created: value variation {pct}% for fatura {fatura.id}")

    # Update the running average on the concessionaria record
    conc.valor_medio = round(avg_valor, 2)


async def _check_pdf_failure(fatura: Fatura, db: AsyncSession) -> None:
    """Creates an alert if the PDF could not be unlocked."""
    if not fatura.pdf_desbloqueado and fatura.pdf_path:
        alert = Alerta(
            condominio_id=fatura.condominio_id,
            fatura_id=fatura.id,
            tipo="pdf_erro",
            gravidade="media",
            mensagem=(
                f"PDF da fatura {fatura.referencia} não pôde ser desbloqueado automaticamente. "
                "Verifique a regra de senha da concessionária."
            ),
        )
        db.add(alert)
        logger.info(f"Alert created: PDF unlock failure for fatura {fatura.id}")


async def check_missing_bills(db: AsyncSession) -> None:
    """
    Scheduled job: checks if any expected bill has not arrived.
    Run once per day. Generates 'conta_nao_recebida' alerts.
    """
    from datetime import date, datetime

    from sqlalchemy.orm import selectinload
    from app.models.concessionaria import Concessionaria
    from app.models.condominio import Condominio

    today = date.today()
    current_month = today.strftime("%B/%Y")  # e.g. "Março/2026" — simplified

    result = await db.execute(
        select(Concessionaria)
        .options(selectinload(Concessionaria.condominio))
        .where(Concessionaria.ativo == True)
    )
    all_conc = result.scalars().all()

    for conc in all_conc:
        # If today is past the expected due day, check if fatura received
        if today.day < conc.dia_vencimento:
            continue  # Not due yet

        # Check if fatura exists for this month
        fatura_result = await db.execute(
            select(Fatura).where(
                Fatura.concessionaria_id == conc.id,
                Fatura.referencia.ilike(f"%{today.year}%"),
                Fatura.status.in_(["processada", "revisao", "pendente"]),
            )
        )
        fatura = fatura_result.scalar_one_or_none()
        if fatura:
            continue  # Bill arrived

        # Check if alert already exists for this month
        existing_alert = await db.execute(
            select(Alerta).where(
                Alerta.condominio_id == conc.condominio_id,
                Alerta.tipo == "conta_nao_recebida",
                Alerta.resolvido == False,
                Alerta.mensagem.ilike(f"%{conc.tipo}%"),
            )
        )
        if existing_alert.scalar_one_or_none():
            continue  # Alert already exists

        # Create alert
        condo_nome = conc.condominio.nome if conc.condominio else "Desconhecido"
        db.add(Alerta(
            condominio_id=conc.condominio_id,
            tipo="conta_nao_recebida",
            gravidade="alta",
            mensagem=(
                f"Conta da {conc.tipo} do {condo_nome} ainda não foi recebida. "
                f"Vencimento esperado: dia {conc.dia_vencimento}."
            ),
        ))
        logger.info(f"Alert created: missing bill for concessionaria {conc.id}")

    await db.commit()
