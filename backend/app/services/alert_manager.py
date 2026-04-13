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
from app.models.condominio import Condominio
from app.services.email_sender import send_notification_email

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
    alerts = []
    
    # 1. Check variation
    var_alert = await _check_value_variation(fatura, conc, db)
    if var_alert:
        alerts.append(var_alert)
        
    # 2. Check PDF failure
    pdf_alert = await _check_pdf_failure(fatura, db)
    if pdf_alert:
        alerts.append(pdf_alert)

    # 3. Send emails for any new alerts
    if alerts:
        await _dispatch_alert_emails(alerts, fatura, conc)



async def _check_value_variation(
    fatura: Fatura,
    conc: Concessionaria,
    db: AsyncSession,
) -> Optional[Alerta]:

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
        
        # Update labels/history
        conc.valor_medio = round(avg_valor, 2)
        return alert

    # Update the running average on the concessionaria record
    conc.valor_medio = round(avg_valor, 2)
    return None



async def _check_pdf_failure(fatura: Fatura, db: AsyncSession) -> Optional[Alerta]:

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
        return alert
    return None



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


async def _dispatch_alert_emails(alerts: list[Alerta], fatura: Fatura, conc: Concessionaria) -> None:
    """Sends combined alert details via email to the expected recipient."""
    # Use the expected email address registered with the concessionaire
    recipient = conc.email_esperado
    if not recipient:
        logger.warning(f"Não foi possível enviar alerta por e-mail: Concessionária {conc.id} não possui 'email_esperado'.")
        return

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.models.condominio import Condominio
    
    # Ensure condominio is loaded for the name
    condo_name = conc.condominio.nome if conc.condominio else "N/A"
    subject = f"ALERTA: Problema identificado na Fatura - {condo_name} ({fatura.referencia})"
    
    body_lines = [
        f"Olá,",
        f"",
        f"Foram identificados os seguintes alertas para o condomínio {condo_name}:",
        f"",
    ]
    
    for alert in alerts:
        body_lines.append(f"• [{alert.tipo.upper()}] {alert.mensagem}")
    
    body_lines.extend([
        f"",
        f"Detalhes da Fatura:",
        f"- Concessionária: {conc.tipo} ({conc.instalacao})",
        f"- Referência: {fatura.referencia}",
        f"- Valor: R$ {fatura.valor:.2f}",
        f"- Vencimento: {fatura.vencimento.strftime('%d/%m/%Y') if fatura.vencimento else 'N/A'}",
        f"",
        f"Por favor, verifique o painel do Datacron para mais detalhes.",
        f"",
        f"Atenciosamente,",
        f"Equipe Datacron"
    ])
    
    body = "\n".join(body_lines)
    
    # Thread back to the original email Message-ID
    msg_id = fatura.gmail_message_id
    
    success = send_notification_email(
        to=recipient,
        subject=subject,
        message_text=body,
        in_reply_to=msg_id
    )
    
    if success:
        logger.info(f"E-mail de alerta enviado para {recipient} (Thread: {msg_id})")
    else:
        logger.error(f"Falha ao enviar e-mail de alerta para {recipient}")


async def check_mandate_expirations(db: AsyncSession) -> None:
    """
    Scheduled job: checks for mandate expirations (60, 30, 15 days before).
    """
    from datetime import date, timedelta
    
    today = date.today()
    intervals = [60, 30, 15]
    
    # 1. Fetch all condominios with mandates
    result = await db.execute(
        select(Condominio)
        .where(Condominio.mandato_fim.is_not(None), Condominio.ativo == True)
    )
    condos = result.scalars().all()
    
    for condo in condos:
        days_left = (condo.mandato_fim.date() - today).days
        
        if days_left in intervals:
            # Generate alert
            msg = f"O mandato do síndico(a) do condomínio {condo.nome} vence em {days_left} dias ({condo.mandato_fim.strftime('%d/%m/%Y')})."
            
            # Check if alert already exists for this mandate and interval
            existing = await db.execute(
                select(Alerta).where(
                    Alerta.condominio_id == condo.id,
                    Alerta.tipo == "mandato_vencimento",
                    Alerta.mensagem.ilike(f"%vence em {days_left} dias%")
                )
            )
            if existing.scalar_one_or_none():
                continue

            alert = Alerta(
                condominio_id=condo.id,
                tipo="mandato_vencimento",
                gravidade="media" if days_left > 15 else "alta",
                mensagem=msg
            )
            db.add(alert)
            
            # Send Email to all concessionaire contacts
            # Fetch email recipients from related concessionaires
            conc_result = await db.execute(
                select(Concessionaria.email_esperado)
                .where(Concessionaria.condominio_id == condo.id, Concessionaria.email_esperado.is_not(None))
            )
            recipients = set(conc_result.scalars().all())
            
            if recipients:
                subject = f"ALERTA: Vencimento de Mandato - {condo.nome}"
                email_body = (
                    f"Olá,\n\n"
                    f"Este é um lembrete automático sobre o vencimento do mandato no condomínio {condo.nome}.\n\n"
                    f"Mensagem: {msg}\n"
                    f"Data de Vencimento: {condo.mandato_fim.strftime('%d/%m/%Y')}\n\n"
                    "Por favor, providencie a documentação necessária para a nova eleição ou renovação.\n\n"
                    "Atenciosamente,\n"
                    "Equipe Datacron"
                )
                for rcpt in recipients:
                    send_notification_email(to=rcpt, subject=subject, message_text=email_body)
                    logger.info(f"Mandate alert ({days_left} days) sent to {rcpt} for condo {condo.id}")

    await db.commit()

