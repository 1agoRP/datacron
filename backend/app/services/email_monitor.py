"""
Gmail Email Monitor Service
============================
Polls the Gmail inbox via IMAP for new invoice emails, identifies the related
condominio/concessionaria, downloads PDF attachments, unlocks and
extracts data from them, then saves a Fatura record to the database.
"""

import base64
import logging
import os
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import imaplib
import smtplib
import email
from email.message import EmailMessage
from email.utils import parsedate_to_datetime
from email.header import decode_header

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.alerta import Alerta, EmailLog
from app.models.concessionaria import Concessionaria
from app.models.condominio import Condominio
from app.models.fatura import Fatura
from app.services.pdf_processor import unlock_pdf, extract_data, save_pdf
from app.services.alert_manager import check_and_create_alerts
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


def get_imap_connection():
    """Authenticates with Gmail via IMAP using App Password."""
    if not settings.GMAIL_USER or not settings.GMAIL_PASSWORD:
        logger.error("Credenciais do Gmail (GMAIL_USER/GMAIL_APP_PASSWORD) não configuradas.")
        return None
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(settings.GMAIL_USER, settings.GMAIL_PASSWORD)
        return mail
    except Exception as e:
        logger.error(f"Erro ao conectar no IMAP da conta {settings.GMAIL_USER}: {e}")
        return None


def ensure_gmail_label(mail: imaplib.IMAP4_SSL, label_name: str) -> bool:
    """Creates a Gmail label via IMAP if it doesn't exist."""
    try:
        # Check if label already exists
        status, labels = mail.list('""', f'"{label_name}"')
        if status == "OK" and labels and labels[0] is not None and labels[0] != b'()':
            return True  # already exists

        # Create the label
        status, _ = mail.create(f'"{label_name}"')
        if status == "OK":
            logger.info(f"Label '{label_name}' criado com sucesso no Gmail.")
            return True
        else:
            logger.warning(f"Falha ao criar label '{label_name}': status={status}")
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


def send_notification_email(to: str, subject: str, message_text: str) -> bool:
    """Sends an email using Gmail SMTP."""
    if not settings.GMAIL_USER or not settings.GMAIL_PASSWORD:
        logger.error("Credenciais do Gmail não configuradas para enviar e-mail.")
        return False
    try:
        msg = EmailMessage()
        msg.set_content(message_text)
        msg["To"] = to
        msg["From"] = settings.GMAIL_USER
        msg["Subject"] = subject
        
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.GMAIL_USER, settings.GMAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {str(e)}")
        return False


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
    """Extracts valor, vencimento, codigo_barras from the email body."""
    data = {}
    
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
        db.add(Alerta(
            tipo="email_nao_identificado",
            gravidade="media",
            mensagem=f"E-mail recebido de '{sender}' com assunto '{subject}' não foi identificado como concessionária cadastrada.",
        ))

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
    
    body_data = {}
    if conc:
        body_data = extract_data_from_body(body_text, conc.tipo)
    else:
        for t in ['Enel', 'Comgás', 'Sabesp']:
            candidate = extract_data_from_body(body_text, t)
            if len(candidate) > len(body_data):
                body_data = candidate

    attachments = get_pdf_attachments(msg)
    if not attachments:
        logger.info(f"No PDF attachments in message {msg_id}")
        email_log.status = "processado"
        await db.commit()
        return condo_name

    for filename, pdf_bytes in attachments:
        unlocked_bytes = unlock_pdf(pdf_bytes, password)
        pdf_unlocked = unlocked_bytes is not None
        final_bytes = unlocked_bytes or pdf_bytes

        if codigo_encontrado:
            safe_filename = f"fatura_{codigo_encontrado}_{filename}".replace("/", "_")
        else:
            safe_filename = f"{msg_id.replace('<', '').replace('>', '')}_{filename}".replace("/", "_")
            
        pdf_path = save_pdf(final_bytes, safe_filename)

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

        referencia = extracted.get("referencia") or _guess_referencia()

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
            pdf_path=pdf_path,
            pdf_desbloqueado=pdf_unlocked,
            pdf_nome_original=safe_filename,
            dados_extraidos=extracted,
        )
        db.add(fatura)
        await db.flush()

        email_log.fatura_id = fatura.id
        email_log.status = "processado"

        if conc:
            await check_and_create_alerts(fatura, conc, db)

    await db.commit()
    logger.info(f"Email {msg_id} processed successfully")
    return condo_name


def _guess_referencia() -> str:
    """Guesses billing reference as current month/year."""
    now = datetime.now()
    months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
              "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    return f"{months[now.month - 1]}/{now.year}"


async def run_email_scan():
    """Main entry point called by the scheduler.
    
    Scans ALL emails in the inbox, processes them, and moves each one
    to the appropriate Gmail label:
    - Datacron/{condominio_name} if identified
    - Datacron/E-mails não identificados if not identified
    
    After the scan, the inbox should be empty.
    """
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

        # Move emails to labels (reverse order to avoid sequence number issues)
        for m_id, condo_name in reversed(results):
            if condo_name:
                label = f"Datacron/{condo_name}"
            else:
                label = "Datacron/E-mails nao identificados"
            move_email_to_label(mail, m_id, label)

        # Expunge all deleted messages at once
        mail.expunge()

        logger.info(f"Scan complete. Processed and moved {len(results)} message(s)")

    except Exception as e:
        logger.error(f"Gmail scan failed: {e}")
    finally:
        try:
            mail.close()
            mail.logout()
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
        # Se falhar ou não achar a pasta, retorna vazio
        status, _ = mail.select(f'"{label_name}"')
        if status != "OK":
            logger.warning(f"Label '{label_name}' não encontrada ou vazia no Gmail.")
            return []

        # Busca e-mails que contenham o texto de filtro (ex: número da UC)
        # Gmail IMAP supports 'BODY' and 'SUBJECT' filters
        status, messages = mail.search(None, f'(OR (SUBJECT "{filter_text}") (BODY "{filter_text}"))')
        if status != "OK" or not messages[0]:
            return []

        msg_ids = messages[0].split()
        for m_id in reversed(msg_ids): # Mais novos primeiro
            try:
                # Pegamos apenas o Header para ser rápido
                res, data = mail.fetch(m_id, "(BODY[HEADER.FIELDS (SUBJECT DATE MESSAGE-ID)])")
                if res == "OK":
                    msg = email.message_from_bytes(data[0][1])
                    subject = _decode_header_value(msg.get("Subject", "Sem Assunto"))
                    date_str = msg.get("Date", "")
                    msg_id = msg.get("Message-ID", "").strip()
                    
                    history.append({
                        "id": msg_id,
                        "referencia": subject, # Usamos o assunto como referência visual
                        "vencimento": date_str,
                        "status": "gmail_archive",
                        "valor": 0.0, # Valor não extraído em tempo real para performance
                        "pdf_nome_original": subject,
                        "created_at": date_str
                    })
            except:
                continue

    except Exception as e:
        logger.error(f"Erro ao buscar histórico no Gmail: {e}")
    finally:
        try:
            mail.close()
            mail.logout()
        except:
            pass

    return history
