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
    grace_days = 3  # Days after vencimento before firing alert

    result = await db.execute(
        select(Concessionaria)
        .options(selectinload(Concessionaria.condominio))
        .where(Concessionaria.ativo == True)
    )
    all_conc = result.scalars().all()

    for conc in all_conc:
        # Only check after the due day + grace period
        if today.day < (conc.dia_vencimento + grace_days):
            continue  # Not due yet (within grace period)

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

        # Check if alert already exists for this concessionária this month
        existing_alert = await db.execute(
            select(Alerta).where(
                Alerta.condominio_id == conc.condominio_id,
                Alerta.tipo == "conta_nao_recebida",
                Alerta.resolvido == False,
                Alerta.mensagem.ilike(f"%{conc.tipo}%"),
                Alerta.mensagem.ilike(f"%{conc.instalacao}%"),
            )
        )
        if existing_alert.scalar_one_or_none():
            continue  # Alert already exists

        # Create alert
        mensagem = (
            f"Conta da {conc.tipo} do {conc.condominio.nome} ainda não foi recebida. "
            f"Vencimento esperado: dia {conc.dia_vencimento}. "
            f"(UC: {conc.instalacao})"
        )

        alert = Alerta(
            condominio_id=conc.condominio_id,
            tipo="conta_nao_recebida",
            gravidade="alta",
            mensagem=mensagem,
        )
        
        try:
            db.add(alert)
            # Commit IMMEDIATELY so the alert is saved even if notify fails
            # This also ensures the 'existing alert' check works in future runs
            await db.commit()
            await db.refresh(alert)
            
            # 6. Notify (Side-effect)
            try:
                await notify_alert(db, alert, conc=conc)
                logger.info(f"Alert created and notified: missing bill for conc {conc.id}")
            except Exception as notify_err:
                logger.error(f"Alert saved but notification failed for conc {conc.id}: {notify_err}")
                
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to create alert for concessionaria {conc.id}: {e}")

    logger.info("Finished check_missing_bills.")


# Roles authorized to receive alert email notifications
ALERT_NOTIFICATION_ROLES = {"admin", "assistente", "concessionarias", "gerencia"}


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

    if not recipients:
        logger.warning(f"No recipients found for alert {alert.id or 'NEW'} on condo {alert.condominio_id}")
        return

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
        if fatura.pdf_desbloqueado and fatura.pdf_path and os.path.exists(fatura.pdf_path):
            try:
                with open(fatura.pdf_path, "rb") as f:
                    attachments.append((fatura.pdf_nome_original or "fatura.pdf", f.read()))
            except Exception as e:
                logger.error(f"Failed to read PDF for attachment: {e}")

    # 7. Enviar
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
            
            try:
                db.add(alert)
                await db.commit()
                await db.refresh(alert)
                
                # Notify authorized users
                try:
                    await notify_alert(db, alert)
                except Exception as ne:
                    logger.error(f"Mandate alert saved but notification failed for condo {condo.id}: {ne}")

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
