"""
Gmail Email Monitor Service
============================
Polls the Gmail inbox for new invoice emails, identifies the related
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

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
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

# Gmail API scope (read-only is sufficient for monitoring)
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]


def get_gmail_service():
    """
    Authenticates with Gmail API using OAuth2.
    On first run, opens a browser for user consent and saves tokens.
    Subsequent runs reuse saved tokens.
    """
    creds = None
    token_path = settings.GMAIL_TOKEN_PATH
    creds_path = settings.GMAIL_CREDENTIALS_PATH

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(creds_path):
                logger.error(f"Gmail credentials not found at {creds_path}")
                return None
            flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(token_path, "w") as f:
            f.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)

def send_notification_email(to: str, subject: str, message_text: str) -> bool:
    """
    Sends an email using the authenticated Gmail API.
    """
    try:
        from email.message import EmailMessage
        service = get_gmail_service()
        if not service:
            logger.error("Could not obtain Gmail service to send email.")
            return False
            
        message = EmailMessage()
        message.set_content(message_text)
        message["To"] = to
        message["From"] = settings.GMAIL_USER or "datacron.auth@gmail.com"
        message["Subject"] = subject
        
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {"raw": encoded_message}
        
        service.users().messages().send(userId="me", body=create_message).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {str(e)}")
        return False


def get_pdf_attachments(service, message_id: str) -> list[tuple[str, bytes]]:
    """
    Downloads all PDF attachments from a Gmail message.
    Returns a list of (filename, pdf_bytes) tuples.
    """
    attachments = []
    msg = service.users().messages().get(userId="me", id=message_id).execute()
    parts = msg.get("payload", {}).get("parts", [])

    def _process_parts(parts_list):
        for part in parts_list:
            # Recurse into multipart
            if part.get("parts"):
                _process_parts(part["parts"])
            mime = part.get("mimeType", "")
            filename = part.get("filename", "")
            if "pdf" in mime.lower() or (filename and filename.lower().endswith(".pdf")):
                body = part.get("body", {})
                attachment_id = body.get("attachmentId")
                if attachment_id:
                    att = service.users().messages().attachments().get(
                        userId="me", messageId=message_id, id=attachment_id
                    ).execute()
                    data = base64.urlsafe_b64decode(att["data"])
                    attachments.append((filename or f"attachment_{attachment_id}.pdf", data))
                elif body.get("data"):
                    data = base64.urlsafe_b64decode(body["data"])
                    attachments.append((filename or "attachment.pdf", data))

    _process_parts(parts)
    return attachments


async def find_concessionaria(
    sender: str, subject: str, body_text: str, db: AsyncSession
) -> tuple[Optional[Concessionaria], Optional[str]]:
    """
    Matches sender, subject, and body text to a registered concessionaria.
    STRICT: Only returns a match when the identification code from the email
    body matches a registered instalacao code exactly.
    """
    domain = sender.split('@')[-1]
    result = await db.execute(
        select(Concessionaria).where(
            Concessionaria.ativo == True,
            Concessionaria.email_esperado.ilike(f"%{domain}%")
        )
    )
    concs = result.scalars().all()
    if not concs:
        return None, None

    # 1. Try to match instalacao code verbatim in body or subject
    for conc in concs:
        if conc.instalacao and (conc.instalacao in body_text or conc.instalacao in subject):
            return conc, conc.instalacao

    # 2. Extract identification code from body and match against registered instalacoes
    tipo = concs[0].tipo if concs else None
    code_from_body = _extract_identification_code(body_text, tipo) if tipo else None

    if code_from_body:
        for conc in concs:
            if conc.instalacao == code_from_body:
                return conc, code_from_body

    # 3. If only ONE concessionaria exists for this domain, it's safe to identify
    if len(concs) == 1:
        return concs[0], code_from_body or concs[0].instalacao

    # 4. Multiple concessionarias and no exact match — cannot identify with certainty
    return None, code_from_body


def _extract_identification_code(body_text: str, tipo: str) -> Optional[str]:
    """Extracts identification code from email body based on concessionaria type."""
    if tipo == 'Enel':
        # N° DA INSTALAÇÃO/UC: 0057562482 (handles encoding issues)
        m = re.search(r'INSTALA.{1,5}O[/:]?\s*(?:UC[:\s]*)?\s*(\d{8,12})', body_text, re.IGNORECASE)
        if m: return m.group(1)
    elif tipo in ['Comgás', 'Comgas']:
        # Código do usuário: 2442361
        m = re.search(r'C.digo do usu.rio[:\s]*(\d+)', body_text, re.IGNORECASE)
        if m: return m.group(1)
    elif tipo == 'Sabesp':
        # Fornecimento: 609129015001
        m = re.search(r'Fornecimento[:\s]*(\d+)', body_text, re.IGNORECASE)
        if m: return m.group(1)
    return None


def extract_data_from_body(body_text: str, tipo: str) -> dict:
    """Extracts valor, vencimento, codigo_barras from the email body."""
    data = {}
    
    if tipo == 'Enel':
        # Quanto eu vou pagar? R$ 644,51
        m = re.search(r'[Qq]uanto.*?pagar.*?R\$\s*([\d.,]+)', body_text)
        if m:
            try: data['valor'] = float(m.group(1).replace('.', '').replace(',', '.'))
            except: pass
        # Data de vencimento 30/03/2026
        m = re.search(r'[Dd]ata de vencimento\s*(\d{2}/\d{2}/\d{4})', body_text)
        if m:
            d, mo, y = m.group(1).split('/')
            data['vencimento'] = f"{y}-{mo}-{d}"
        # Código de barras
        m = re.search(r'[Cc].digo.{1,5}barras[:\s]*([\d\s.]+)', body_text)
        if m:
            data['codigo_barras'] = re.sub(r'\s+', '', m.group(1))[:48]

    elif tipo in ['Comgás', 'Comgas']:
        # valor de R$ 40,36
        m = re.search(r'valor de R\$\s*([\d.,]+)', body_text, re.IGNORECASE)
        if m:
            try: data['valor'] = float(m.group(1).replace('.', '').replace(',', '.'))
            except: pass
        # vencimento para 22.03.2026
        m = re.search(r'vencimento\s+para\s+(\d{2}[./]\d{2}[./]\d{4})', body_text, re.IGNORECASE)
        if m:
            parts = re.split(r'[./]', m.group(1))
            data['vencimento'] = f"{parts[2]}-{parts[1]}-{parts[0]}"
        # código de barras
        m = re.search(r'c.digo\s+de\s+barras\s+([\d\s]+)', body_text, re.IGNORECASE)
        if m:
            data['codigo_barras'] = re.sub(r'\s+', '', m.group(1))[:48]

    elif tipo == 'Sabesp':
        # Valor: R$ 11498,2
        m = re.search(r'Valor[:\s]*R\$\s*([\d.,]+)', body_text, re.IGNORECASE)
        if m:
            try: data['valor'] = float(m.group(1).replace('.', '').replace(',', '.'))
            except: pass
        # Vencimento: 01/04/2026
        m = re.search(r'Vencimento[:\s]*(\d{2}/\d{2}/\d{4})', body_text, re.IGNORECASE)
        if m:
            d, mo, y = m.group(1).split('/')
            data['vencimento'] = f"{y}-{mo}-{d}"
        # Código de barras
        m = re.search(r'[Cc].digo\s+de\s+barras[:\s]*([\d\s.]+)', body_text, re.IGNORECASE)
        if m:
            data['codigo_barras'] = re.sub(r'\s+', '', m.group(1))[:48]

    # Generic fallback: try valor R$ pattern
    if 'valor' not in data:
        m = re.search(r'R\$\s*([\d.,]+)', body_text)
        if m:
            try: data['valor'] = float(m.group(1).replace('.', '').replace(',', '.'))
            except: pass

    return data


async def process_email_message(service, msg_id: str, msg_data: dict, db: AsyncSession):
    """
    Full pipeline for processing a single Gmail message:
    1. Parse headers to get sender, subject, date
    2. Check if already processed (email_logs)
    3. Find matching concessionaria
    4. Download and unlock PDF
    5. Extract invoice data
    6. Save Fatura to DB
    7. Generate alerts if needed
    """

    # ── Extract headers ──────────────────────────────────────
    headers = {h["name"].lower(): h["value"] for h in msg_data.get("payload", {}).get("headers", [])}
    sender  = headers.get("from", "").split("<")[-1].replace(">", "").strip()
    subject = headers.get("subject", "")
    date_str = headers.get("date", "")

    try:
        received_at = datetime.now(timezone.utc)  # fallback
    except Exception:
        received_at = datetime.now(timezone.utc)

    # ── Extract body ─────────────────────────────────────────
    def _extract_body(parts_list):
        text = ""
        for part in parts_list:
            if part.get("mimeType") in ["text/plain", "text/html"]:
                data = part.get("body", {}).get("data")
                if data:
                    text += base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore') + " "
            elif part.get("parts"):
                text += _extract_body(part["parts"])
        return text

    # Extract body before checking concessionaria so find_concessionaria uses clean text
    payload = msg_data.get("payload", {})
    raw_body = ""
    if payload.get("parts"):
        raw_body = _extract_body(payload.get("parts"))
    else:
        data = payload.get("body", {}).get("data")
        if data:
            raw_body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
            
    # Clean HTML tags and excessive whitespaces
    body_text = re.sub(r'<[^>]+>', ' ', raw_body)
    body_text = re.sub(r'\s+', ' ', body_text)
    
    # ── Check if already processed ───────────────────────────
    existing = await db.execute(
        select(EmailLog).where(EmailLog.gmail_message_id == msg_id)
    )
    if existing.scalar_one_or_none():
        logger.info(f"Email {msg_id} already processed, skipping")
        return

    # ── Create initial log entry ─────────────────────────────
    email_log = EmailLog(
        gmail_message_id=msg_id,
        remetente=sender,
        assunto=subject,
        recebido_em=received_at,
        status="nao_identificado",
    )
    db.add(email_log)
    await db.flush()

    # ── Find matching concessionaria ─────────────────────────
    conc, codigo_encontrado = await find_concessionaria(sender, subject, body_text, db)
    
    if codigo_encontrado:
        email_log.codigo_identificacao = codigo_encontrado

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

    # ── Get condominio for CNPJ password generation ───────────
    password = ""
    condo: Optional[Condominio] = None
    
    if conc:
        condo_result = await db.execute(
            select(Condominio).where(Condominio.id == conc.condominio_id)
        )
        condo = condo_result.scalar_one_or_none()
        password = conc.gerar_senha_pdf(condo.cnpj_digits if condo else "")
    
    body_data = {}
    if conc:
        body_data = extract_data_from_body(body_text, conc.tipo)
    else:
        # Try all known types and use the one that extracts the most data
        for t in ['Enel', 'Comgás', 'Sabesp']:
            candidate = extract_data_from_body(body_text, t)
            if len(candidate) > len(body_data):
                body_data = candidate

    # ── Download PDF attachments ─────────────────────────────
    attachments = get_pdf_attachments(service, msg_id)
    if not attachments:
        logger.info(f"No PDF attachments in message {msg_id}")
        email_log.status = "processado"
        await db.commit()
        return

    for filename, pdf_bytes in attachments:
        unlocked_bytes = unlock_pdf(pdf_bytes, password)
        pdf_unlocked = unlocked_bytes is not None
        final_bytes = unlocked_bytes or pdf_bytes

        # Save to disk
        if codigo_encontrado:
            safe_filename = f"fatura_{codigo_encontrado}_{filename}".replace("/", "_")
        else:
            safe_filename = f"{msg_id}_{filename}".replace("/", "_")
            
        pdf_path = save_pdf(final_bytes, safe_filename)

        # Extract data
        extracted = extract_data(final_bytes)
        for k, v in body_data.items():
            if v:
                extracted[k] = v

        # Determine valor and vencimento
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

        # ── Create Fatura ────────────────────────────────────
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

        # Update email log
        email_log.fatura_id = fatura.id
        email_log.status = "processado"

        # Check and create alerts (value variation, etc.)
        if conc:
            await check_and_create_alerts(fatura, conc, db)

    await db.commit()
    logger.info(f"Email {msg_id} processed successfully")


def _guess_referencia() -> str:
    """Guesses billing reference as current month/year."""
    now = datetime.now()
    months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
              "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    return f"{months[now.month - 1]}/{now.year}"


async def run_email_scan():
    """
    Main entry point called by the scheduler.
    Fetches new unread emails containing PDFs and processes them.
    """
    logger.info("Starting Gmail inbox scan...")

    service = get_gmail_service()
    if not service:
        logger.error("Gmail service unavailable. Check credentials.")
        return

    try:
        # Search for unread emails with attachments (PDFs from utilities)
        results = service.users().messages().list(
            userId="me",
            q="is:unread has:attachment filename:pdf",
            maxResults=20,
        ).execute()

        messages = results.get("messages", [])
        if not messages:
            logger.info("No new messages found")
            return

        async with AsyncSessionLocal() as db:
            for msg_ref in messages:
                msg_id = msg_ref["id"]
                try:
                    msg_data = service.users().messages().get(
                        userId="me", id=msg_id, format="full"
                    ).execute()
                    await process_email_message(service, msg_id, msg_data, db)
                except Exception as e:
                    logger.error(f"Error processing message {msg_id}: {e}")
                    continue

        logger.info(f"Scan complete. Processed {len(messages)} message(s)")

    except Exception as e:
        logger.error(f"Gmail scan failed: {e}")
