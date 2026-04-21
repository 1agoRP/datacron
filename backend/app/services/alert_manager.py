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
from app.services.email_sender import send_notification_email, render_alert_email

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
    for alert in alerts:
        await notify_alert(db, alert, fatura)



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
            email_remetente=fatura.email_remetente,
            email_assunto=fatura.email_assunto,
            # We don't have fatura.email_data directly, but created_at is usually the same or we could add it
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
        alert = Alerta(
            condominio_id=conc.condominio_id,
            tipo="conta_nao_recebida",
            gravidade="alta",
            mensagem=(
                f"Conta da {conc.tipo} do {condo_nome} ainda não foi recebida. "
                f"Vencimento esperado: dia {conc.dia_vencimento}."
            ),
        )
        db.add(alert)
        await db.flush() # Get ID
        await notify_alert(db, alert)
        
        logger.info(f"Alert created: missing bill for concessionaria {conc.id}")

    await db.commit()


async def notify_alert(db: AsyncSession, alert: Alerta, fatura: Optional[Fatura] = None) -> None:
    """
    Sends an alert notification to the PRIMARY RESPONSIBLE user for the condomínio.
    Never sends alerts to all users — only to those explicitly assigned to this condo.
    If no condominio_id is set (unidentified email), no notification is sent here
    (that responsibility falls on process_email_message).
    """
    import os
    from sqlalchemy import select
    from app.models.condominio import Condominio
    from app.models.user import User
    from app.models.user_condominio import UserCondominio

    # Alertas sem condomínio não disparam notificação em massa
    if not alert.condominio_id:
        logger.info(f"Alert {alert.id} has no condominio_id — skipping mass notification.")
        return

    # 1. Buscar APENAS o responsável principal do cond (primeiro usuário ativo vinculado)
    res = await db.execute(
        select(User)
        .join(UserCondominio, UserCondominio.user_id == User.id)
        .where(
            UserCondominio.condominio_id == alert.condominio_id,
            User.ativo == True,
        )
        .order_by(User.created_at.asc())  # o mais antigo é o principal
        .limit(1)
    )
    primary_user = res.scalar_one_or_none()

    # 2. Também incluir admins
    res_admins = await db.execute(
        select(User).where(User.role == "admin", User.ativo == True)
    )
    admins = res_admins.scalars().all()

    recipients = set()
    if primary_user:
        recipients.add(primary_user.email)
    for admin in admins:
        recipients.add(admin.email)

    if not recipients:
        logger.warning(f"No recipients found for alert {alert.id} on condo {alert.condominio_id}")
        return

    # 3. Buscar contexto
    condo = None
    if alert.condominio_id:
        res = await db.execute(select(Condominio).where(Condominio.id == alert.condominio_id))
        condo = res.scalar_one_or_none()

    condo_name = condo.nome if condo else "Sistema"
    subject = f"🔔 Datacron — {alert.tipo.replace('_', ' ').title()} | {condo_name}"

    # 4. Montar corpo em texto simples (fallback)
    message_text = (
        f"Alerta Datacron\n\n"
        f"Tipo: {alert.tipo}\n"
        f"Gravidade: {alert.gravidade}\n"
        f"Condomínio: {condo_name}\n"
        f"Mensagem: {alert.mensagem}\n"
    )
    if fatura:
        message_text += (
            f"\nFatura:\n"
            f"  Referência: {fatura.referencia}\n"
            f"  Valor: R$ {fatura.valor:.2f}\n"
            f"  Vencimento: {fatura.vencimento}\n"
        )

    # 5. Montar HTML rico
    html_body = render_alert_email(
        tipo=alert.tipo,
        gravidade=alert.gravidade,
        mensagem=alert.mensagem,
        condo_nome=condo_name,
        email_remetente=getattr(alert, "email_remetente", None),
        email_assunto=getattr(alert, "email_assunto", None),
        email_data=getattr(alert, "email_data", None),
        fatura_referencia=fatura.referencia if fatura else None,
        fatura_valor=fatura.valor if fatura else None,
        fatura_vencimento=fatura.vencimento if fatura else None,
    )

    # 6. Anexar PDF se disponível
    attachments = []
    in_reply_to = None
    if fatura:
        in_reply_to = fatura.gmail_message_id
        if fatura.pdf_desbloqueado and fatura.pdf_path and os.path.exists(fatura.pdf_path):
            try:
                with open(fatura.pdf_path, "rb") as f:
                    attachments.append((fatura.pdf_nome_original or "fatura.pdf", f.read()))
            except Exception as e:
                logger.error(f"Failed to read PDF for attachment: {e}")

    # 7. Enviar
    for email in recipients:
        success = send_notification_email(
            to=email,
            subject=subject,
            message_text=message_text,
            html_body=html_body,
            in_reply_to=in_reply_to,
            attachments=attachments if attachments else None,
        )
        if success:
            logger.info(f"Alert notification sent to {email} for alert {alert.id}.")
        else:
            logger.error(f"Failed to send alert notification to {email}.")


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
            await db.flush()
            await notify_alert(db, alert)
            
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

