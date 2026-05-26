"""
Alert Manager Service
======================
Analyzes new faturas and generates alerts based on business rules:
  1. Value variation > threshold vs historical average
  2. Bill not received by expected day of month  
  3. PDF unlock failure
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.encoders import jsonable_encoder

from app.config import settings
from app.models.alerta import Alerta
from app.models.alert_webhook_delivery import AlertWebhookDelivery
from app.models.concessionaria import Concessionaria
from app.models.fatura import Fatura
from app.models.condominio import Condominio
from app.services.email_sender import render_alert_email

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
        direction = "a maior" if fatura.valor > avg_valor else "a menor"
        pct = round(variation * 100, 1)
        gravidade = "alta" if variation > 0.35 else "media"
        tipo_alerta = "Variacao_Valor_Mais" if fatura.valor > avg_valor else "Variacao_Valor_Menos"

        # Fetch condominium to display name
        from app.models.condominio import Condominio
        condo = await db.get(Condominio, fatura.condominio_id)
        condo_name = condo.nome if condo else f"ID {fatura.condominio_id}"

        alert = Alerta(
            condominio_id=fatura.condominio_id,
            fatura_id=fatura.id,
            tipo=tipo_alerta,
            gravidade=gravidade,
            mensagem=(
                f"{condo_name} | {conc.tipo} (Cód: {conc.instalacao or 'N/A'}) — "
                f"valor {direction} em {pct}% em relação à média histórica "
                f"(R$ {fatura.valor:,.2f} recebido vs. média de R$ {avg_valor:,.2f})"
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
    """
    Previously created pdf_erro alerts here, but this is now handled directly
    in the webhook (routers/webhooks.py) with full email context and notification.
    Keeping this function as a no-op to avoid breaking the call chain.
    """
    return None



async def check_missing_bills(db: AsyncSession) -> None:
    """
    Scheduled job: checks if any expected bill has not arrived.
    Run once per day. Generates 'conta_nao_recebida' alerts.
    Only fires after a 3-day grace period past the due date.
    Uses vencimento month/year for reliable fatura detection.
    """
    from datetime import date, datetime
    from sqlalchemy import extract
    from sqlalchemy.orm import selectinload
    from app.models.concessionaria import Concessionaria
    from app.models.condominio import Condominio

    today = date.today()

    result = await db.execute(
        select(Concessionaria)
        .options(selectinload(Concessionaria.condominio))
        .where(Concessionaria.ativo == True)
    )
    all_conc = result.scalars().all()

    for conc in all_conc:
        # Check if fatura exists for the current month using vencimento date
        fatura_result = await db.execute(
            select(Fatura).where(
                Fatura.concessionaria_id == conc.id,
                extract("year", Fatura.vencimento) == today.year,
                extract("month", Fatura.vencimento) == today.month,
                Fatura.status.in_(["processada", "revisao", "pendente"]),
            )
        )
        fatura = fatura_result.scalars().first()
        if fatura:
            continue  # Bill arrived

        days_until_due = conc.dia_vencimento - today.day
        
        tipo_alerta = None
        
        # Rule 3: Contas não é débito automático (3, 2, 1, 0 days before)
        if not conc.debito_automatico and days_until_due in [3, 2, 1, 0]:
            tipo_alerta = "Fatura_Sem_Debito_Automatico"
        # Rule 1: Conta não recebida (on the exact day, if auto debit)
        elif days_until_due == 0:
            tipo_alerta = "Nao_Recebida"
            
        if not tipo_alerta:
            continue

        # Check if alert already exists for this concessionária TODAY to avoid spam
        existing_alert = await db.execute(
            select(Alerta).where(
                Alerta.condominio_id == conc.condominio_id,
                Alerta.tipo == tipo_alerta,
                func.date(Alerta.created_at) == today,
                Alerta.mensagem.ilike(f"%{conc.instalacao}%"),
            )
        )
        if existing_alert.scalar_one_or_none():
            continue  # Alert already exists for today

        # Create alert
        mensagem = (
            f"Alerta: {tipo_alerta.replace('_', ' ')}. "
            f"Conta da {conc.tipo} do {conc.condominio.nome}. "
            f"Vencimento esperado: dia {conc.dia_vencimento}. "
            f"(UC: {conc.instalacao})"
        )

        alert = Alerta(
            condominio_id=conc.condominio_id,
            tipo=tipo_alerta,
            gravidade="alta",
            mensagem=mensagem,
        )
        
        try:
            db.add(alert)
            await db.commit()
            await db.refresh(alert)
            
            # Notify (Side-effect)
            try:
                await notify_alert(db, alert, conc=conc)
                logger.info(f"Alert created and notified: {tipo_alerta} for conc {conc.id}")
            except Exception as notify_err:
                logger.error(f"Alert saved but notification failed for conc {conc.id}: {notify_err}")
                
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to create alert for concessionaria {conc.id}: {e}")

    logger.info("Finished check_missing_bills.")


# Roles authorized to receive alert email notifications
ALERT_NOTIFICATION_ROLES = {"admin", "assistente", "supervisor", "gerencia"}
ALERT_WEBHOOK_SCHEMA_VERSION = "2026-05-26"
MAX_ALERT_WEBHOOK_ATTEMPTS = 5


def _next_retry_at(attempts: int) -> datetime:
    minutes = min(60, 2 ** max(attempts - 1, 0))
    return datetime.now(timezone.utc) + timedelta(minutes=minutes)


async def _attempt_alert_webhook_delivery(
    db: AsyncSession,
    delivery: AlertWebhookDelivery,
) -> None:
    import httpx

    delivery.attempts += 1
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                delivery.target_url,
                json=jsonable_encoder(delivery.payload),
                headers={"X-Idempotency-Key": delivery.idempotency_key},
                timeout=15.0,
            )
        delivery.last_status_code = response.status_code
        response.raise_for_status()
        delivery.status = "sent"
        delivery.sent_at = datetime.now(timezone.utc)
        delivery.last_error = None
        delivery.next_attempt_at = None
        logger.info(f"Alert webhook delivered: {delivery.idempotency_key}")
    except Exception as exc:
        delivery.status = "failed"
        delivery.last_error = str(exc)[:2000]
        delivery.next_attempt_at = _next_retry_at(delivery.attempts)
        logger.error(f"Alert webhook delivery failed: {delivery.idempotency_key}: {exc}")

    db.add(delivery)
    await db.flush()


async def _enqueue_and_send_alert_webhook(
    db: AsyncSession,
    alert: Alerta,
    payload: dict,
) -> None:
    if not settings.N8N_WEBHOOK_URL:
        logger.warning(
            f"N8N_WEBHOOK_URL not configured; alert {alert.id or alert.tipo} was saved without webhook dispatch."
        )
        return

    await db.flush()
    alerta_id = str(alert.id) if alert.id else "sem-id"
    idempotency_key = f"alert:{alerta_id}:{alert.tipo}"

    result = await db.execute(
        select(AlertWebhookDelivery).where(
            AlertWebhookDelivery.idempotency_key == idempotency_key
        )
    )
    delivery = result.scalar_one_or_none()

    if delivery and delivery.status == "sent":
        logger.info(f"Alert webhook already sent: {idempotency_key}")
        return

    if not delivery:
        delivery = AlertWebhookDelivery(
            alerta_id=alert.id,
            event_type="alert.created",
            target_url=settings.N8N_WEBHOOK_URL,
            idempotency_key=idempotency_key,
            payload=payload,
            status="pending",
            attempts=0,
        )
        db.add(delivery)
        await db.flush()
    else:
        delivery.payload = payload
        delivery.target_url = settings.N8N_WEBHOOK_URL

    await _attempt_alert_webhook_delivery(db, delivery)


async def retry_pending_alert_webhooks(db: AsyncSession, limit: int = 50) -> int:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(AlertWebhookDelivery)
        .where(
            AlertWebhookDelivery.status.in_(["pending", "failed"]),
            AlertWebhookDelivery.attempts < MAX_ALERT_WEBHOOK_ATTEMPTS,
            or_(
                AlertWebhookDelivery.next_attempt_at.is_(None),
                AlertWebhookDelivery.next_attempt_at <= now,
            ),
        )
        .order_by(AlertWebhookDelivery.next_attempt_at.asc())
        .limit(limit)
    )
    deliveries = result.scalars().all()

    for delivery in deliveries:
        await _attempt_alert_webhook_delivery(db, delivery)

    await db.commit()
    if deliveries:
        logger.info(f"Retried {len(deliveries)} alert webhook delivery/deliveries.")
    return len(deliveries)


async def notify_alert(
    db: AsyncSession, 
    alert: Alerta, 
    fatura: Optional[Fatura] = None,
    conc: Optional[Concessionaria] = None
) -> None:
    """
    Sends alert notification emails to authorized users.
    Only sends to users with roles: admin, assistente, concessionarias, gerencia.
    For non-admin roles, only sends to users who have access to the condomínio.
    """
    import os
    from sqlalchemy import select, or_
    from app.models.condominio import Condominio
    from app.models.user import User
    from app.models.user_condominio import UserCondominio

    # 1. Buscar todos os admins ativos (eles sempre recebem alertas, mesmo sem condomínio identificado)
    res_admins = await db.execute(
        select(User).where(
            User.role == "admin",
            User.ativo == True,
        )
    )
    admin_users = res_admins.scalars().all()

    # Se não tem condomínio, apenas admins recebem
    condo = None
    if not alert.condominio_id:
        logger.info(f"Alert {alert.id or 'NEW'} has no condominio_id — sending to admins only.")
        # Segue para o envio abaixo, mas linked_users e carteira_users ficarão vazios
        linked_users = []
        carteira_users = []
    else:
        # 2. Buscar usuários com roles autorizados (exceto admin, já buscados)
        #    que tenham acesso a este condomínio via user_condominios OU via codigo_condominio
        non_admin_roles = ALERT_NOTIFICATION_ROLES - {"admin"}
        
        # 2a. Via tabela user_condominios
        res_linked = await db.execute(
            select(User)
            .join(UserCondominio, UserCondominio.user_id == User.id)
            .where(
                UserCondominio.condominio_id == alert.condominio_id,
                User.role.in_(non_admin_roles),
                User.ativo == True,
            )
        )
        linked_users = res_linked.scalars().all()

        # 2b. Via campo codigo_condominio (carteira)
        condo = None
        res_condo = await db.execute(select(Condominio).where(Condominio.id == alert.condominio_id))
        condo = res_condo.scalar_one_or_none()
        
        carteira_users = []
        if condo:
            res_carteira = await db.execute(
                select(User).where(
                    User.codigo_condominio == str(condo.numero),
                    User.role.in_(non_admin_roles),
                    User.ativo == True,
                )
            )
            carteira_users = res_carteira.scalars().all()
        # Users with 'todos' in codigo_condominio or the specific number
        res_carteira = await db.execute(
            select(User).where(
                User.role.in_(non_admin_roles),
                User.ativo == True,
                User.codigo_condominio.is_not(None),
            )
        )
        potential_users = res_carteira.scalars().all()
        if condo:
            condo_num = str(condo.numero).strip()

            for u in potential_users:
                codigo_str = u.codigo_condominio or ""
                if "todos" in codigo_str.lower():
                    carteira_users.append(u)
                else:
                    codes = [c.strip() for c in codigo_str.split(",") if c.strip()]
                    # Check with common padding variations
                    all_codes = set(codes)
                    for c in codes:
                        if c.isdigit():
                            all_codes.add(c.zfill(2))
                            all_codes.add(c.zfill(3))
                            all_codes.add(c.zfill(4))
                    if condo_num in all_codes:
                        carteira_users.append(u)

    # 3. Montar lista de destinatários (de-duplicar por email)
    recipients = set()
    for u in admin_users:
        recipients.add(u.email)
    for u in linked_users:
        recipients.add(u.email)
    for u in carteira_users:
        recipients.add(u.email)

    # NOVO: Se for erro de PDF ou e-mail não identificado, encaminhar de volta para o remetente original
    if alert.tipo in ["pdf_erro", "email_nao_identificado"]:
        if fatura and fatura.email_remetente:
            recipients.add(fatura.email_remetente)
        elif getattr(alert, "email_remetente", None):
            recipients.add(alert.email_remetente)

    if not recipients:
        logger.warning(f"No recipients found for alert {alert.id or 'NEW'} on condo {alert.condominio_id}")

    alert_desc = f"ID:{alert.id}" if alert.id else f"Type:{alert.tipo}"
    logger.info(f"Alert {alert_desc}: sending to {len(recipients)} recipients: {recipients}")

    # 4. Buscar contexto
    condo_name = condo.nome if condo else "Sistema"
    condo_num_str = str(condo.numero).zfill(4) if condo else "0000"

    tipo_conta = "N/A"
    cod_conta = "N/A"
    vencimento_str = "N/A"
    valor_str = "N/A"
    fatura_referencia = None
    fatura_valor = None
    fatura_vencimento = None

    if conc:
        tipo_conta = conc.tipo
        cod_conta = conc.instalacao
    elif fatura:
        from app.models.concessionaria import Concessionaria
        conc_res = await db.execute(select(Concessionaria).where(Concessionaria.id == fatura.concessionaria_id))
        conc_obj = conc_res.scalar_one_or_none()
        if conc_obj:
            tipo_conta = conc_obj.tipo
            cod_conta = conc_obj.instalacao
    
    # Try to extract code from message if still N/A (for manual alerts or conta_nao_recebida)
    if cod_conta == "N/A":
        import re
        m = re.search(r"\(UC:\s*([^\)]+)\)", alert.mensagem)
        if m:
            cod_conta = m.group(1)

    if fatura:
        vencimento_str = fatura.vencimento.strftime("%d/%m/%Y") if fatura.vencimento else "N/A"
        valor_str = f"R$ {fatura.valor:,.2f}" if fatura.valor else "N/A"
        fatura_referencia = fatura.referencia
        fatura_valor = fatura.valor
        fatura_vencimento = fatura.vencimento
        
        subject = f"ALERTA {alert.tipo.upper()}: {condo_num_str} {condo_name} {tipo_conta} {cod_conta} {vencimento_str} {valor_str}"
        message_text = (
            f"Aviso de Alerta do Sistema Datacron\n\n"
            f"Tipo de Alerta: {alert.tipo.replace('_', ' ').title()}\n"
            f"Mensagem: {alert.mensagem}\n\n"
            f"Detalhes da Conta:\n"
            f"Condomínio: {condo_num_str} - {condo_name}\n"
            f"Concessionária: {tipo_conta}\n"
            f"Código da Conta: {cod_conta}\n"
            f"Referência: {fatura_referencia}\n"
            f"Vencimento: {vencimento_str}\n"
            f"Valor: {valor_str}\n"
        )
    else:
        subject = f"🔔 Datacron — {alert.tipo.replace('_', ' ').title()} | {condo_name}"
        message_text = (
            f"Alerta Datacron\n\n"
            f"Tipo: {alert.tipo}\n"
            f"Gravidade: {alert.gravidade}\n"
            f"Condomínio: {condo_name}\n"
            f"Mensagem: {alert.mensagem}\n"
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
        fatura_referencia=fatura_referencia,
        fatura_valor=fatura_valor,
        fatura_vencimento=fatura_vencimento,
        instalacao=cod_conta
    )

    # 6. Anexar PDF se disponível
    attachments = []
    in_reply_to = None
    if fatura:
        in_reply_to = fatura.gmail_message_id
        # Modificado: Anexar PDF se desbloqueado OU se for um erro de PDF (precisamos do anexo para análise)
        if (fatura.pdf_desbloqueado or alert.tipo == "pdf_erro") and fatura.pdf_path and os.path.exists(fatura.pdf_path):
            try:
                with open(fatura.pdf_path, "rb") as f:
                    attachments.append((fatura.pdf_nome_original or "fatura.pdf", f.read()))
            except Exception as e:
                logger.error(f"Failed to read PDF for attachment: {e}")

    # 7. Webhook N8N ou E-mail Clássico
    import base64

    pdf_base64 = None
    if fatura and fatura.pdf_path and os.path.exists(fatura.pdf_path):
        try:
            with open(fatura.pdf_path, "rb") as f:
                pdf_base64 = base64.b64encode(f.read()).decode("utf-8")
        except Exception as e:
            logger.error(f"Failed to read PDF for alert webhook: {e}")

    payload = {
        "schema_version": ALERT_WEBHOOK_SCHEMA_VERSION,
        "event_type": "alert.created",
        "alerta": {
            "id": str(alert.id) if alert.id else None,
            "tipo": alert.tipo,
            "gravidade": alert.gravidade,
            "mensagem": alert.mensagem,
            "created_at": alert.created_at,
            "email_remetente": getattr(alert, "email_remetente", None),
            "email_assunto": getattr(alert, "email_assunto", None),
            "email_data": getattr(alert, "email_data", None),
        },
        "condominio": {
            "id": str(alert.condominio_id) if alert.condominio_id else None,
            "nome": condo_name,
            "numero": condo_num_str,
        },
        "concessionaria": {
            "id": str(conc.id) if conc else None,
            "tipo": tipo_conta,
            "codigo_identificacao": cod_conta,
            "valor_medio": conc.valor_medio if conc else None,
        },
        "fatura": {
            "id": str(fatura.id) if fatura else None,
            "referencia": fatura_referencia,
            "vencimento": fatura_vencimento,
            "valor": fatura_valor,
            "valor_formatado": valor_str,
            "gmail_message_id": fatura.gmail_message_id if fatura else None,
            "pdf_nome_original": fatura.pdf_nome_original if fatura else None,
            "pdf_desbloqueado": fatura.pdf_desbloqueado if fatura else None,
            "pdf_base64": pdf_base64,
        },
        "usuarios_responsaveis": sorted(recipients),
        "email": {
            "subject": subject,
            "text": message_text,
            "html": html_body,
        },
        "source": "datacron.backend",
    }

    await _enqueue_and_send_alert_webhook(db, alert, payload)
    return

    target_tags = ["Nao_Recebida", "Mandato_a_Vencer", "Fatura_Sem_Debito_Automatico", "Variacao_Valor_Mais", "Variacao_Valor_Menos"]
    
    if alert.tipo in target_tags and settings.N8N_WEBHOOK_URL:
        import httpx
        import base64
        
        pdf_base64 = None
        if fatura and fatura.pdf_path and os.path.exists(fatura.pdf_path):
            try:
                with open(fatura.pdf_path, "rb") as f:
                    pdf_base64 = base64.b64encode(f.read()).decode("utf-8")
            except Exception as e:
                logger.error(f"Failed to read PDF for webhook: {e}")

        payload = {
            "Condominio": condo_name,
            "Codigo_Identificacao": cod_conta,
            "Tipo_Alerta": alert.tipo,
            "Vencimento_Esperado": vencimento_str,
            "Valor_Medio": conc.valor_medio if conc else None,
            "Valor_Atual": fatura.valor if fatura else None,
            "Usuarios_Responsaveis": list(recipients),
            "Mensagem": alert.mensagem,
            "PDF_Base64": pdf_base64
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(settings.N8N_WEBHOOK_URL, json=payload, timeout=10.0)
                resp.raise_for_status()
                logger.info(f"N8N Webhook sent successfully for {alert.tipo}")
        except Exception as e:
            logger.error(f"Failed to send webhook to N8N: {e}")
            
        # O usuário pediu para o webhook gerenciar os e-mails para essas tags, 
        # então pulamos o envio de e-mail direto do Datacron para evitar duplicidade
        return

    # Fallback/Padrão para outros alertas (ex: pdf_erro)
    for email in recipients:
        success = await send_notification_email(
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
    intervals = [30]
    
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
                    Alerta.tipo == "Mandato_a_Vencer",
                    Alerta.mensagem.ilike(f"%vence em {days_left} dias%")
                )
            )
            if existing.scalar_one_or_none():
                continue

            alert = Alerta(
                condominio_id=condo.id,
                tipo="Mandato_a_Vencer",
                gravidade="media" if days_left > 15 else "alta",
                mensagem=msg
            )
            
            try:
                db.add(alert)
                await db.commit()
                await db.refresh(alert)
                
                # Notify authorized users
                try:
                    await notify_alert(db, alert)
                except Exception as ne:
                    logger.error(f"Mandate alert saved but notification failed for condo {condo.id}: {ne}")
                continue

                # Send Email to all concessionaire contacts (Legacy/Specific logic)
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
                        await send_notification_email(to=rcpt, subject=subject, message_text=email_body)
                        logger.info(f"Mandate alert ({days_left} days) sent to {rcpt} for condo {condo.id}")
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to create mandate alert for condo {condo.id}: {e}")

    logger.info("Finished check_mandate_expirations.")

async def check_document_expirations_and_clean(db: AsyncSession) -> None:
    """
    Scheduled job: checks if any condominium document (Ata, AVCB, Apolice) 
    has expired. If the expiration date is strictly before today, it removes 
    the document automatically.
    """
    from datetime import date
    
    today = date.today()
    
    result = await db.execute(
        select(Condominio)
        .where(Condominio.ativo == True)
    )
    condos = result.scalars().all()
    
    for condo in condos:
        updated = False
        
        # 1. ATA de Eleição
        if condo.ata_eleicao_fim and condo.ata_eleicao_url:
            if condo.ata_eleicao_fim.date() < today:
                condo.ata_eleicao_url = None
                condo.ata_eleicao_nome = None
                condo.ata_eleicao_inicio = None
                condo.ata_eleicao_fim = None
                updated = True
                logger.info(f"ATA de Eleição expired for Condo {condo.id} - Document removed.")
                
        # 2. AVCB
        if condo.avcb_fim and condo.avcb_url:
            if condo.avcb_fim.date() < today:
                condo.avcb_url = None
                condo.avcb_inicio = None
                condo.avcb_fim = None
                updated = True
                logger.info(f"AVCB expired for Condo {condo.id} - Document removed.")
                
        # 3. Apólice de Seguro
        if condo.apolice_seguro_fim and condo.apolice_seguro_url:
            if condo.apolice_seguro_fim.date() < today:
                condo.apolice_seguro_url = None
                condo.apolice_seguro_inicio = None
                condo.apolice_seguro_fim = None
                updated = True
                logger.info(f"Apolice de Seguro expired for Condo {condo.id} - Document removed.")
                
        if updated:
            db.add(condo)
            
    await db.commit()
