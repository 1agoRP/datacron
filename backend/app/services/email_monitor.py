"""
Gmail Email Monitor Service
============================
Polls the Gmail inbox via IMAP for new invoice emails, identifies the related
condominio/concessionaria, downloads PDF attachments, unlocks and
extracts data from them, then saves a Fatura record to the database.

PDF files are uploaded to Supabase Storage (bucket: faturas).
"""

import asyncio
import base64
import logging
import os
import json
import re
from datetime import datetime, timezone, date
from pathlib import Path
from typing import Optional

import imaplib
import email
from email.utils import parsedate_to_datetime
from email.header import decode_header
import concurrent.futures
from app.services.email_sender import send_notification_email


from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.models.alerta import Alerta, EmailLog
from app.models.concessionaria import Concessionaria
from app.models.condominio import Condominio
from app.models.fatura import Fatura
from app.services.pdf_processor import unlock_pdf, extract_data, save_pdf
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


# ── Sender Validation Helpers ───────────────────────────────────────────
async def _is_known_user_sender(sender_email: str, db: AsyncSession) -> bool:
    """
    Returns True if the sender is a registered and active user in the system.
    Used to decide whether to send a 'not identified' reply.
    """
    result = await db.execute(
        select(User).where(
            User.email.ilike(sender_email.strip()),
            User.ativo == True
        )
    )
    return result.scalar_one_or_none() is not None


async def _is_concessionaria_domain(sender_email: str, db: AsyncSession) -> bool:
    """
    Returns True if the sender's email domain matches any registered concessionária.
    Used to allow e-mails from energy/water companies even without being system users.
    """
    domain = sender_email.split('@')[-1].lower()
    result = await db.execute(
        select(Concessionaria).where(
            Concessionaria.email_esperado.ilike(f"%@{domain}%"),
            Concessionaria.ativo == True
        )
    )
    return result.scalar_one_or_none() is not None


def get_imap_connection():
    """Authenticates with Gmail via IMAP using App Password."""
    if not settings.GMAIL_USER or not settings.GMAIL_PASSWORD:
        logger.error("Credenciais do Gmail (GMAIL_USER/GMAIL_APP_PASSWORD) nao configuradas.")
        return None
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(settings.GMAIL_USER, settings.GMAIL_PASSWORD)
        return mail
    except Exception as e:
        logger.error(f"Erro ao conectar no IMAP da conta {settings.GMAIL_USER}: {e}")
        return None


import unicodedata

def ensure_gmail_label(mail: imaplib.IMAP4_SSL, label_name: str) -> bool:
    """Creates a Gmail label via IMAP if it doesn't exist."""
    try:
        # Normaliza para remover acentos e caracteres especiais que quebram o imaplib (que usa ascii por padrão)
        normalized = unicodedata.normalize('NFKD', label_name)
        safe_label = "".join([c for c in normalized if not unicodedata.combining(c)])
        
        # Substitui outros caracteres não-ascii por espaço ou remove
        safe_label = safe_label.encode('ascii', 'ignore').decode('ascii')
        
        # Check if label already exists
        status, labels = mail.list('""', f'"{safe_label}"')
        if status == "OK" and labels and labels[0] is not None and labels[0] != b'()':
            return True  # already exists

        # Create the label
        status, _ = mail.create(f'"{safe_label}"')
        if status == "OK":
            logger.info(f"Label '{safe_label}' verificado/criado com sucesso no Gmail.")
            return True
        else:
            logger.warning(f"Falha ao criar label '{safe_label}': status={status}")
            return False
    except Exception as e:
        logger.error(f"Erro ao criar label '{label_name}': {e}")
        return False


def move_email_to_label(mail: imaplib.IMAP4_SSL, msg_num: bytes, label_name: str) -> bool:
    """Moves an email from Inbox to the specified Gmail label."""
    try:
        # Ensure label exists
        ensure_gmail_label(mail, label_name)

        # Copy to destination label
        status, _ = mail.copy(msg_num, f'"{label_name}"')
        if status != "OK":
            logger.error(f"Falha ao copiar e-mail para '{label_name}'")
            return False

        # Mark as deleted in Inbox
        mail.store(msg_num, '+FLAGS', '(\\Deleted)')
        return True
    except Exception as e:
        logger.error(f"Erro ao mover e-mail para '{label_name}': {e}")
        return False


def get_inbox_count() -> int:
    """Returns the count of emails currently in the Gmail inbox."""
    mail = get_imap_connection()
    if not mail:
        return 0
    try:
        mail.select("inbox")
        status, messages = mail.search(None, "ALL")
        if status != "OK":
            return 0
        msg_ids = messages[0].split()
        return len(msg_ids) if msg_ids and msg_ids[0] else 0
    except Exception as e:
        logger.error(f"Erro ao contar e-mails na inbox: {e}")
        return 0
    finally:
        try:
            mail.close()
            mail.logout()
        except:
            pass

# Removed send_notification_email (moved to email_sender.py)

def get_pdf_attachments(msg) -> list[tuple[str, bytes]]:

    """Downloads all PDF attachments from an email message."""
    attachments = []
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_maintype() == 'multipart':
                continue
            if part.get('Content-Disposition') is None:
                continue
                
            filename = part.get_filename()
            content_type = part.get_content_type()
            
            if filename:
                decoded_filename = decode_header(filename)[0][0]
                if isinstance(decoded_filename, bytes):
                    # Handle bytes filename
                    try:
                        filename = decoded_filename.decode('utf-8')
                    except UnicodeDecodeError:
                        filename = decoded_filename.decode('latin1', errors='ignore')
                        
                if filename.lower().endswith('.pdf') or "pdf" in content_type.lower():
                    data = part.get_payload(decode=True)
                    if data:
                        attachments.append((filename, data))
    return attachments


async def find_concessionaria(

    sender: str, subject: str, body_text: str, db: AsyncSession
) -> tuple[Optional[Concessionaria], Optional[str]]:
    """Matches sender, subject, and body text to a registered concessionaria."""
    
    # 1. Tentar por domínio do remetente (Lógica atual)
    domain = sender.split('@')[-1]
    result = await db.execute(
        select(Concessionaria).where(
            Concessionaria.ativo == True,
            Concessionaria.email_esperado.ilike(f"%{domain}%")
        )
    )
    concs = result.scalars().all()
    
    if concs:
        for conc in concs:
            if conc.instalacao and (conc.instalacao in body_text or conc.instalacao in subject):
                return conc, conc.instalacao
        
        # Se achou o domínio mas não a instalação específica, tenta extrair do corpo
        tipo = concs[0].tipo if concs else None
        code_from_body = _extract_identification_code(body_text, tipo) if tipo else None
        if code_from_body:
            for conc in concs:
                if conc.instalacao == code_from_body:
                    return conc, code_from_body
        
        # Se for único para aquele domínio, assume como sendo ele
        if len(concs) == 1:
            return concs[0], code_from_body or concs[0].instalacao

    # 2. BUSCA GLOBAL (Melhoria para e-mails encaminhados)
    # Se chegamos aqui, ou o remetente não é o oficial (encaminhado) ou não achou a UC nos concs do domínio.
    # Vamos buscar em TODAS as concessionárias ativas
    
    all_concs_result = await db.execute(select(Concessionaria).where(Concessionaria.ativo == True))
    all_concs = all_concs_result.scalars().all()
    
    # Procura por número de instalação exato no assunto ou corpo
    for conc in all_concs:
        if conc.instalacao and len(conc.instalacao) >= 4: # Ignora códigos muito curtos para evitar falso-positivo
            if conc.instalacao in subject or conc.instalacao in body_text:
                logger.info(f"Identificado via Busca Global (UC: {conc.instalacao})")
                return conc, conc.instalacao
                
    return None, None


def _extract_identification_code(body_text: str, tipo: str) -> Optional[str]:
    """Extracts identification code from email body based on concessionaria type."""
    if tipo == 'Enel':
        m = re.search(r'INSTALA.{1,5}O[/:]?\s*(?:UC[:\s]*)?\s*(\d{8,12})', body_text, re.IGNORECASE)
        if m: return m.group(1)
    elif tipo in ['Comgás', 'Comgas']:
        m = re.search(r'C.digo do usu.rio[:\s]*(\d+)', body_text, re.IGNORECASE)
        if m: return m.group(1)
    elif tipo == 'Sabesp':
        m = re.search(r'Fornecimento[:\s]*(\d+)', body_text, re.IGNORECASE)
        if m: return m.group(1)
    return None


def extract_data_from_body(body_text: str, tipo: str) -> dict:
    """Extracts valor, vencimento, codigo_barras, num_cliente, and instalacao from the email body."""
    data = {}
    
    # Generic extraction for UC/Instalacao and Cliente
    m_uc = re.search(r'(?:INSTALA.{1,5}O|UC|UNIDADE CONSUMIDORA)[:\s]*(\d{6,15})', body_text, re.IGNORECASE)
    if m_uc: data['instalacao'] = m_uc.group(1)
    
    m_client = re.search(r'(?:N.{1,3}|N[Uu]MERO)?\s*DO\s+CLIENTE[:\s]*(\d{6,15})', body_text, re.IGNORECASE)
    if m_client: data['num_cliente'] = m_client.group(1)

    if tipo == 'Enel':
        m = re.search(r'[Qq]uanto.*?pagar.*?R\$\s*([\d.,]+)', body_text)
        if m:
            try: data['valor'] = float(m.group(1).replace('.', '').replace(',', '.'))
            except: pass
        m = re.search(r'[Dd]ata de vencimento\s*(\d{2}/\d{2}/\d{4})', body_text)
        if m:
            d, mo, y = m.group(1).split('/')
            data['vencimento'] = f"{y}-{mo}-{d}"
        m = re.search(r'[Cc].digo.{1,5}barras[:\s]*([\d\s.]+)', body_text)
        if m:
            data['codigo_barras'] = re.sub(r'\s+', '', m.group(1))[:48]

    elif tipo in ['Comgás', 'Comgas']:
        m = re.search(r'valor de R\$\s*([\d.,]+)', body_text, re.IGNORECASE)
        if m:
            try: data['valor'] = float(m.group(1).replace('.', '').replace(',', '.'))
            except: pass
        m = re.search(r'vencimento\s+para\s+(\d{2}[./]\d{2}[./]\d{4})', body_text, re.IGNORECASE)
        if m:
            parts = re.split(r'[./]', m.group(1))
            data['vencimento'] = f"{parts[2]}-{parts[1]}-{parts[0]}"
        m = re.search(r'c.digo\s+de\s+barras\s+([\d\s]+)', body_text, re.IGNORECASE)
        if m:
            data['codigo_barras'] = re.sub(r'\s+', '', m.group(1))[:48]

    elif tipo == 'Sabesp':
        m = re.search(r'Valor[:\s]*R\$\s*([\d.,]+)', body_text, re.IGNORECASE)
        if m:
            try: data['valor'] = float(m.group(1).replace('.', '').replace(',', '.'))
            except: pass
        m = re.search(r'Vencimento[:\s]*(\d{2}/\d{2}/\d{4})', body_text, re.IGNORECASE)
        if m:
            d, mo, y = m.group(1).split('/')
            data['vencimento'] = f"{y}-{mo}-{d}"
        m = re.search(r'[Cc].digo\s+de\s+barras[:\s]*([\d\s.]+)', body_text, re.IGNORECASE)
        if m:
            data['codigo_barras'] = re.sub(r'\s+', '', m.group(1))[:48]

    if 'valor' not in data:
        m = re.search(r'R\$\s*([\d.,]+)', body_text)
        if m:
            try: data['valor'] = float(m.group(1).replace('.', '').replace(',', '.'))
            except: pass

    return data


def _decode_header_value(header_val):
    if not header_val: return ""
    decoded_list = decode_header(header_val)
    result = ""
    for decoded, charset in decoded_list:
        if isinstance(decoded, bytes):
            result += decoded.decode(charset or 'utf-8', errors='ignore')
        else:
            result += str(decoded)
    return result


async def process_email_message(msg_id: str, msg, db: AsyncSession) -> Optional[str]:
    """
    Full pipeline for processing a single IMAP message:
    1. Parse headers to get sender, subject, date
    2. Check if already processed (email_logs)
    3. Find matching concessionaria
    4. Download and unlock PDF
    5. Extract invoice data
    6. Save Fatura to DB
    7. Generate alerts if needed

    Returns:
        The condominio name if identified, or None if not identified.
    """

    sender = _decode_header_value(msg.get("From", "")).split("<")[-1].replace(">", "").strip()
    subject = _decode_header_value(msg.get("Subject", ""))
    date_str = msg.get("Date", "")

    try:
        received_at = parsedate_to_datetime(date_str)
    except Exception:
        received_at = datetime.now(timezone.utc)

    raw_body = ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get('Content-Disposition'))
            if ct in ('text/plain', 'text/html') and 'attachment' not in cd:
                payload = part.get_payload(decode=True)
                if payload:
                    raw_body += payload.decode(part.get_content_charset() or 'utf-8', errors='ignore') + " "
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            raw_body = payload.decode(msg.get_content_charset() or 'utf-8', errors='ignore')

    body_text = re.sub(r'<[^>]+>', ' ', raw_body)
    body_text = re.sub(r'\s+', ' ', body_text)
    
    # ── GATE: verificar se o remetente é conhecido ─────────────────────
    is_known_user = await _is_known_user_sender(sender, db)
    is_conc_domain = await _is_concessionaria_domain(sender, db)

    if not is_known_user and not is_conc_domain:
        logger.info(
            f"[IGNORE] E-mail de remetente desconhecido ignorado silenciosamente: '{sender}' "
            f"(assunto: '{subject}'). Não consta em users nem em concessionárias cadastradas."
        )
        return None  # Para aqui — sem EmailLog, sem alerta, sem nada
    # ──────────────────────────────────────────────────────────────────────

    existing_log = await db.execute(
        select(EmailLog).where(EmailLog.gmail_message_id == msg_id)
    )
    email_log_record = existing_log.scalar_one_or_none()
    if email_log_record:
        logger.info(f"Email {msg_id} already processed, skipping processing but determining label")
        if email_log_record.condominio_id:
            condo_result = await db.execute(
                select(Condominio).where(Condominio.id == email_log_record.condominio_id)
            )
            condo = condo_result.scalar_one_or_none()
            if condo:
                numero_pad = str(condo.numero).zfill(4)
                return f"{numero_pad} - {condo.nome}"
        return None  # already processed, no condo -> goes to unidentified

    email_log = EmailLog(
        gmail_message_id=msg_id,
        remetente=sender,
        assunto=subject,
        recebido_em=received_at,
        status="nao_identificado",
    )
    db.add(email_log)
    await db.flush()

    conc, codigo_encontrado = await find_concessionaria(sender, subject, body_text, db)
    
    if codigo_encontrado:
        email_log.codigo_identificacao = codigo_encontrado

    condo_name: Optional[str] = None

    if conc:
        email_log.status = "identificado"
        email_log.condominio_id = conc.condominio_id
    else:
        logger.warning(f"Sender '{sender}' not matched to any concessionaria")

        # Somente notifica o próprio remetente se ele for usuário cadastrado
        if is_known_user:
            from app.services.email_sender import send_notification_email, render_not_identified_email
            html = render_not_identified_email(
                sender_name=sender,
                original_subject=subject,
                original_body=body_text,
                received_at=received_at,
            )
            send_notification_email(
                to=sender,
                subject="Datacron: E-mail não identificado",
                message_text=(
                    f"Olá,\n\nRecebemos o e-mail que você encaminhou mas não conseguimos "
                    f"identificar o condomínio automaticamente.\n\n"
                    f"Assunto original: {subject}\n"
                    f"Acesse o painel para vincular manualmente.\n\nEquipe Datacron"
                ),
                html_body=html,
            )
            logger.info(f"'Não identificado' reply sent to known user: {sender}")

    password = ""
    condo: Optional[Condominio] = None
    
    if conc:
        condo_result = await db.execute(
            select(Condominio).where(Condominio.id == conc.condominio_id)
        )
        condo = condo_result.scalar_one_or_none()
        if condo:
            # Padding length exactly 4 digits
            numero_pad = str(condo.numero).zfill(4)
            condo_name = f"{numero_pad} - {condo.nome}"
        password = conc.gerar_senha_pdf(condo.cnpj_digits if condo else "")
    
    if conc:
        body_data = extract_data_from_body(body_text, conc.tipo)
    else:
        for t in ['Enel', 'Comgás', 'Sabesp']:
            candidate = extract_data_from_body(body_text, t)
            if len(candidate) > len(body_data):
                body_data = candidate
    
    # Save extracted data to log for traceability (manual JSON serialization if needed)
    if body_data:
        email_log.dados_extraidos = body_data

    attachments = get_pdf_attachments(msg)
    if not attachments:
        logger.info(f"No PDF attachments in message {msg_id}")
        email_log.status = "processado"
        await db.commit()
        return condo_name
    saved_paths = []
    for filename, pdf_bytes in attachments:
        unlocked_bytes = unlock_pdf(pdf_bytes, password)
        pdf_unlocked = unlocked_bytes is not None
        final_bytes = unlocked_bytes or pdf_bytes

        if codigo_encontrado:
            safe_filename = f"fatura_{codigo_encontrado}_{filename}".replace("/", "_")
        else:
            safe_filename = f"{msg_id.replace('<', '').replace('>', '')}_{filename}".replace("/", "_")

        # ── Handle PDF Storage (Base64) ──
        if len(final_bytes) > 10 * 1024 * 1024:
            logger.warning(f"Ignorando anexo '{filename}' pois excede 10MB.")
            continue

        pdf_b64 = base64.b64encode(final_bytes).decode('utf-8')

        # Also save locally for email forwarding attachments
        local_path = save_pdf(final_bytes, safe_filename)
        saved_paths.append(local_path)

        extracted = extract_data(final_bytes)
        for k, v in body_data.items():
            if v:
                extracted[k] = v

        valor = extracted.get("valor") or 0.0
        vencimento_str = extracted.get("vencimento")
        from datetime import date
        vencimento: Optional[date] = None
        if vencimento_str:
            try:
                vencimento = date.fromisoformat(vencimento_str)
            except ValueError:
                pass

        referencia = _standardize_referencia(extracted.get("referencia"), vencimento)

        fatura = Fatura(
            condominio_id=conc.condominio_id if conc else None,
            concessionaria_id=conc.id if conc else None,
            referencia=referencia,
            valor=valor,
            vencimento=vencimento,
            status="processada" if pdf_unlocked else "revisao",
            email_remetente=sender,
            email_assunto=subject,
            gmail_message_id=msg_id,
            pdf_path=local_path,
            pdf_desbloqueado=pdf_unlocked,
            pdf_nome_original=safe_filename,
            pdf_base64=pdf_b64,
            dados_extraidos=extracted,
            debito_automatico=extracted.get("debito_automatico", False),
        )

        db.add(fatura)
        await db.flush()

        # Se desbloqueada, salva também no histórico conforme solicitado
        if pdf_unlocked:
            from app.models.historico_fatura import HistoricoFatura
            hist = HistoricoFatura(
                condominio_id=fatura.condominio_id,
                concessionaria_id=fatura.concessionaria_id,
                referencia=fatura.referencia,
                vencimento=fatura.vencimento,
                valor=fatura.valor,
                pdf_nome_original=fatura.pdf_nome_original,
                pdf_base64=fatura.pdf_base64,
                debito_automatico=fatura.debito_automatico,
                email_remetente=fatura.email_remetente,
                email_assunto=fatura.email_assunto,
                gmail_message_id=fatura.gmail_message_id
            )
            db.add(hist)

        email_log.fatura_id = fatura.id
        email_log.status = "processado"

        if conc:
            from app.services.alert_manager import check_and_create_alerts
            await check_and_create_alerts(fatura, conc, db)
            
            # Forward if individualized reading is active
            if conc.leitura_individualizada and conc.email_emissao:
                forward_to = conc.email_emissao
                condo_num_str = str(condo.numero).zfill(4) if condo else "0000"
                condo_nome_str = condo.nome if condo else "N/A"
                vencimento_str = fatura.vencimento.strftime("%d/%m/%Y") if fatura.vencimento else "N/A"
                valor_str = f"R$ {fatura.valor:,.2f}" if fatura.valor else "N/A"
                
                subject_fwd = f"{condo_num_str} {condo_nome_str} {conc.tipo} {conc.instalacao} {vencimento_str} {valor_str}"
                body_fwd = (
                    f"Detalhes da Conta:\n\n"
                    f"Condomínio: {condo_num_str} - {condo_nome_str}\n"
                    f"Concessionária: {conc.tipo}\n"
                    f"Código da Conta: {conc.instalacao}\n"
                    f"Referência: {referencia}\n"
                    f"Vencimento: {vencimento_str}\n"
                    f"Valor: {valor_str}\n\n"
                    "Arquivo da conta desbloqueada em anexo para emissão."
                )
                success_fwd = send_notification_email(
                    to=forward_to,
                    subject=subject_fwd,
                    message_text=body_fwd,
                    in_reply_to=msg_id,
                    attachments=saved_paths
                )
                if success_fwd:
                    logger.info(f"Fatura individualizada encaminhada para {forward_to}")
                else:
                    logger.error(f"Falha ao encaminhar fatura individualizada para {forward_to}")

    # Sempre encaminha para o backup após o processamento
    send_notification_email(
        to="datacroncompany1@gmail.com",
        subject=f"FWD: {subject}",
        message_text=f"E-mail processado pelo Datacron.\nRemetente: {sender}\nStatus: Identificado ({condo_name})" if condo_name else f"E-mail não identificado processado.\nRemetente: {sender}",
        attachments=saved_paths if 'saved_paths' in locals() else []
    )

    await db.commit()
    logger.info(f"Email {msg_id} processed successfully")
    return condo_name


def _standardize_referencia(raw_ref: Optional[str], fallback_date: Optional[date] = None) -> str:
    """Standardizes billing reference to 'Mês/Ano' format (e.g. Janeiro/2026)."""
    import re
    months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
              "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    
    if raw_ref:
        raw_ref = str(raw_ref).strip()
        # Handle MM/YYYY or MM-YYYY
        m = re.match(r"^(\d{1,2})[/\-](\d{4})$", raw_ref)
        if m:
            month, year = int(m.group(1)), int(m.group(2))
            if 1 <= month <= 12:
                return f"{months[month - 1]}/{year}"
        
        # Handle textual like Fev/2026 or Fevereiro/2026
        m = re.match(r"^([a-zA-ZçÇ]+)[/\-](\d{4})$", raw_ref)
        if m:
            month_str, year = m.group(1).lower(), int(m.group(2))
            for i, month_name in enumerate(months):
                if month_name.lower().startswith(month_str[:3]):
                    return f"{months[i]}/{year}"

    dt = fallback_date or datetime.now()
    return f"{months[dt.month - 1]}/{dt.year}"


async def run_email_scan():
    """Main entry point called by the scheduler.
    
    Scans ALL emails in the inbox, processes them, and moves each one
    to the appropriate Gmail label.
    """
    # Simple lock file to prevent concurrent scans in the same instance
    lock_file = Path("/tmp/datacron_scan.lock") if os.name != 'nt' else Path("datacron_scan.lock")
    if lock_file.exists():
        # Check if lock is stale (> 30 mins)
        if (datetime.now().timestamp() - lock_file.stat().m_ctime) < 1800:
            logger.info("Scan and/or varredura already in progress (lock file exists). Skipping.")
            return
        else:
            logger.warning("Stale scan lock found, removing it.")
            lock_file.unlink()

    try:
        lock_file.touch()
        logger.info("Starting Gmail IMAP inbox scan...")

        mail = get_imap_connection()
        if not mail:
            return

        try:
            mail.select("inbox")
            status, messages = mail.search(None, "ALL")
            if status != "OK":
                logger.error("Erro ao buscar emails no IMAP: " + str(status))
                return

            msg_ids = messages[0].split()
            if not msg_ids or (len(msg_ids) == 1 and msg_ids[0] == b''):
                logger.info("No messages found in inbox")
                return

            # Ensure the "not identified" label exists
            ensure_gmail_label(mail, "Datacron/E-mails nao identificados")

            # Process in reverse order (newest first) to handle EXPUNGE correctly
            # We collect results first, then move in reverse
            results: list[tuple[bytes, Optional[str]]] = []

            async with AsyncSessionLocal() as db:
                for m_id in msg_ids:
                    msg_id_str = m_id.decode('utf-8')
                    try:
                        res, msg_data = mail.fetch(m_id, "(RFC822)")
                        if res != "OK": continue
                        
                        raw_email = msg_data[0][1]
                        msg = email.message_from_bytes(raw_email)
                        
                        # Message-ID works as unique identifier
                        unique_msg_id = msg.get("Message-ID", f"imap-{msg_id_str}-{datetime.now().timestamp()}")
                        unique_msg_id = str(unique_msg_id).strip()
                        if len(unique_msg_id) > 255:
                            unique_msg_id = unique_msg_id[:255]

                        condo_name = await process_email_message(unique_msg_id, msg, db)
                        results.append((m_id, condo_name))
                    except Exception as e:
                        logger.error(f"Error processing IMAP message ID {msg_id_str}: {e}")
                        # Still move unprocessable emails to "não identificados"
                        results.append((m_id, None))
                        continue

            # Exclui todos os e-mails processados (vão para a lixeira do Gmail)
            for m_id, _ in reversed(results):
                try:
                    mail.store(m_id, '+FLAGS', '(\\Deleted)')
                except Exception as e:
                    logger.error(f"Erro ao excluir e-mail processado {m_id}: {e}")

            # Expunge all deleted messages at once
            mail.expunge()

            logger.info(f"Scan complete. Processed and moved {len(results)} message(s)")

        except Exception as e:
            logger.error(f"Gmail scan internal error: {e}")
        finally:
            try:
                mail.close()
                mail.logout()
            except:
                pass

    except Exception as e:
        logger.error(f"Gmail scan failed: {e}")
    finally:
        # Clean up lock
        try:
            if lock_file.exists():
                lock_file.unlink()
        except:
            pass
def get_gmail_history(label_name: str, filter_text: str) -> list[dict]:
    """Fetches list of invoices directly from a Gmail label via IMAP."""
    mail = get_imap_connection()
    if not mail:
        return []

    history = []
    try:
        # Codifica label para evitar problemas de acento (IMAP UTF-7)
        # Se falhar ou não achar a pasta, tenta o fallback manual
        status, _ = mail.select(f'"{label_name}"', readonly=True)
        if status != "OK":
            logger.info(f"Label '{label_name}' não encontrada. Buscando globalmente por '{filter_text}'")
            # Fallback global
            status, _ = mail.select('"[Gmail]/Todos os e-mails"', readonly=True)
            if status != "OK":
                mail.select("INBOX", readonly=True)
        
        # Busca e-mails que contenham o texto de filtro (ex: número da UC)
        # Note: Gmail IMAP filter is powerful
        status, messages = mail.uid('search', None, f'(OR (SUBJECT "{filter_text}") (BODY "{filter_text}"))')
        
        if status != "OK" or not messages[0]:
            return []

        msg_uids = messages[0].split()
        for m_uid in reversed(msg_uids): # Mais novos primeiro
            try:
                m_uid_str = m_uid.decode('utf-8')
                # Pegamos apenas o Header para ser rápido
                res, data = mail.uid('fetch', m_uid, "(BODY[HEADER.FIELDS (SUBJECT DATE MESSAGE-ID)])")
                if res == "OK":
                    msg = email.message_from_bytes(data[0][1])
                    subject = _decode_header_value(msg.get("Subject", "Sem Assunto"))
                    date_str = msg.get("Date", "")
                    
                    history.append({
                        "id": m_uid_str, # Usamos o UID para download posterior
                        "referencia": subject,
                        "vencimento": date_str,
                        "status": "gmail_archive",
                        "valor": 0.0,
                        "pdf_nome_original": subject if subject.lower().endswith('.pdf') else f"{subject}.pdf",
                        "created_at": date_str,
                        "_parsed_date": parsedate_to_datetime(date_str) if date_str else datetime.min.replace(tzinfo=timezone.utc)
                    })
                    
                    # Limitar a 10 resultados do Gmail para não travar
                    if len(history) >= 10:
                        break
            except Exception as e:
                logger.debug(f"Pulando mensagem IMAP: {e}")
                continue

    except Exception as e:
        logger.error(f"Erro ao buscar histórico no Gmail: {e}")
    finally:
        try:
            mail.logout()
        except:
            pass

    history.sort(key=lambda x: x["_parsed_date"] if isinstance(x["_parsed_date"], datetime) else datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    
    for item in history:
        item.pop("_parsed_date", None)

    return history
