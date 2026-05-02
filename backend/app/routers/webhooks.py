from fastapi import APIRouter, Depends, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import logging
import re

from app.database import get_db
from app.services.email_monitor import (
    _is_known_user_sender,
    _is_concessionaria_domain,
    find_concessionaria,
    extract_data_from_body,
    _standardize_referencia
)
from app.services.pdf_processor import (
    unlock_pdf,
    save_pdf,
    extract_data
)
from app.models.alerta import EmailLog
from app.models.condominio import Condominio
from app.models.fatura import Fatura
from sqlalchemy import select
from datetime import datetime, timezone
import base64

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks & Integrations"])

@router.post("/n8n/email-invoice")
async def n8n_email_invoice(
    background_tasks: BackgroundTasks,
    sender: str = Form(...),
    subject: str = Form(...),
    body: str = Form(...),
    msg_id: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook endpoint for n8n to send parsed emails with PDF attachments.
    """
    logger.info(f"Receiving invoice from n8n: {sender} - {subject}")
    
    # ── Check for duplicate ──────────────────────────────────────────
    # We do this before creating the log to avoid unnecessary DB writes
    existing_log = await db.execute(
        select(EmailLog).where(EmailLog.gmail_message_id == msg_id)
    )
    if existing_log.scalar_one_or_none():
        logger.info(f"Email {msg_id} already processed")
        return {"status": "duplicate", "msg_id": msg_id}

    # ── Create Log ───────────────────────────────────────────────────
    email_log = EmailLog(
        gmail_message_id=msg_id,
        remetente=sender,
        assunto=subject,
        recebido_em=datetime.now(timezone.utc),
        status="identificado",
    )
    db.add(email_log)
    await db.flush()

    try:
        # Read file content
        pdf_bytes = await file.read()
        filename = file.filename

        # ── GATE: verify sender ──────────────────────────────────────────
        is_known_user = await _is_known_user_sender(sender, db)
        is_conc_domain = await _is_concessionaria_domain(sender, db)

        if not is_known_user and not is_conc_domain:
            logger.info(f"[WEBHOOK IGNORE] Unknown sender: {sender}")
            email_log.status = "nao_identificado"
            email_log.erro_msg = "Remetente desconhecido"
            await db.commit()
            return {"status": "ignored", "reason": "unknown_sender"}

        # ── Process Processing ───────────────────────────────────────────
        body_text = re.sub(r'<[^>]+>', ' ', body)
        body_text = re.sub(r'\s+', ' ', body_text)
        
        conc, codigo_encontrado = await find_concessionaria(sender, subject, body_text, db)
        
        if codigo_encontrado:
            email_log.codigo_identificacao = codigo_encontrado

        condo: Optional[Condominio] = None
        if conc:
            email_log.condominio_id = conc.condominio_id
            condo_result = await db.execute(
                select(Condominio).where(Condominio.id == conc.condominio_id)
            )
            condo = condo_result.scalar_one_or_none()
        
        # Extract data from body
        body_data = {}
        if conc:
            body_data = extract_data_from_body(body_text, conc.tipo)
        else:
            for t in ['Enel', 'Comgás', 'Sabesp']:
                candidate = extract_data_from_body(body_text, t)
                if len(candidate) > len(body_data):
                    body_data = candidate
        
        email_log.dados_extraidos = body_data

        # ── PDF Processing ───────────────────────────────────────────────
        password = ""
        if conc and condo:
            password = conc.gerar_senha_pdf(condo.cnpj_digits)

        unlocked_bytes = unlock_pdf(pdf_bytes, password)
        pdf_unlocked = unlocked_bytes is not None
        final_bytes = unlocked_bytes or pdf_bytes

        if codigo_encontrado:
            safe_filename = f"fatura_{codigo_encontrado}_{filename}".replace("/", "_")
        else:
            safe_filename = f"{msg_id}_{filename}".replace("/", "_")

        pdf_b64 = base64.b64encode(final_bytes).decode('utf-8')
        local_path = save_pdf(final_bytes, safe_filename)

        extracted = extract_data(final_bytes)
        for k, v in body_data.items():
            if v:
                extracted[k] = v

        valor = extracted.get("valor") or 0.0
        vencimento_str = extracted.get("vencimento")
        vencimento = None
        if vencimento_str:
            try:
                from datetime import date
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

        if pdf_unlocked:
            from app.models.historico_fatura import HistoricoFatura
            hist = HistoricoFatura(
                condominio_id=fatura.condominio_id,
                concessionaria_id=fatura.concessionaria_id,
                referencia=fatura.referencia,
                vencimento=fatura.vencimento,
                valor=fatura.valor,
                pdf_nome_original=fatura.pdf_nome_original,
                base_64=fatura.pdf_base64, # CORRIGIDO: O campo no HistoricoFatura chama-se base_64
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

        await db.commit()

        return {
            "status": "success",
            "fatura_id": str(fatura.id),
            "condominio": condo.nome if condo else None,
            "unlocked": pdf_unlocked
        }

    except Exception as e:
        logger.error(f"Error processing webhook invoice: {str(e)}", exc_info=True)
        email_log.status = "erro"
        email_log.erro_msg = str(e)
        await db.commit()
        return {"status": "error", "message": str(e)}

