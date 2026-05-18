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
    extract_data,
    generate_standard_filename
)
from app.models.alerta import EmailLog
from app.models.condominio import Condominio
from app.models.fatura import Fatura
from app.models.audit_log import AuditLog
from sqlalchemy import select
from datetime import datetime, timezone
import base64
import io

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
        # Step 1: Try opening without password (unprotected PDF)
        unlocked_bytes = None
        try:
            import pikepdf
            with pikepdf.open(io.BytesIO(pdf_bytes)) as test_pdf:
                output = io.BytesIO()
                test_pdf.save(output)
                output.seek(0)
                unlocked_bytes = output.read()
                logger.info("PDF opened without password (unprotected)")
        except pikepdf.PasswordError:
            pass  # PDF is encrypted, will try password below
        except Exception as e:
            logger.warning(f"PDF open test failed: {e}")

        # Step 2: Try with the generated password
        if not unlocked_bytes:
            password = ""
            if conc and condo:
                password = conc.gerar_senha_pdf(condo.cnpj_digits)
            if password:
                unlocked_bytes = unlock_pdf(pdf_bytes, password)
            elif conc and not condo:
                logger.warning("Concessionaria found but no condo — cannot generate password")

        # Step 3: Brute-force fallback (try all condos' passwords)
        if not unlocked_bytes:
            from app.services.pdf_processor import try_brute_force_unlock
            condo_bf, conc_bf, unlocked_bf, ext_bf = await try_brute_force_unlock(subject, pdf_bytes, db, sender)
            if unlocked_bf:
                unlocked_bytes = unlocked_bf
                # Update references if brute-force found the right condo
                if condo_bf:
                    condo = condo_bf
                    email_log.condominio_id = condo.id
                if conc_bf:
                    conc = conc_bf
                    email_log.codigo_identificacao = conc.instalacao
                logger.info(f"Brute-force unlock succeeded: Condo={condo.nome if condo else 'N/A'}")
                # Merge brute-force extracted data into body_data
                if ext_bf:
                    for k, v in ext_bf.items():
                        if v and k not in body_data:
                            body_data[k] = v

        pdf_unlocked = unlocked_bytes is not None
        final_bytes = unlocked_bytes or pdf_bytes

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

        # Generate standardized filename
        safe_filename = generate_standard_filename(
            condo_numero=condo.numero if condo else 0,
            condo_nome=condo.nome if condo else "Não identificado",
            conc_tipo=conc.tipo if conc else "Desconhecida",
            conc_codigo=codigo_encontrado or (conc.instalacao if conc else "ND"),
            vencimento=vencimento,
            valor=valor
        )

        pdf_b64 = base64.b64encode(final_bytes).decode('utf-8')
        local_path = save_pdf(final_bytes, safe_filename)

        referencia = _standardize_referencia(extracted.get("referencia"), vencimento)
        
        # ── Check for existing duplicate Fatura ──
        if conc:
            # Duplicate criteria: mesmo valor, mesmo Condomínio, mesmo vencimento e mesma concessionária
            existing_fatura = await db.execute(
                select(Fatura).where(
                    Fatura.condominio_id == conc.condominio_id,
                    Fatura.concessionaria_id == conc.id,
                    Fatura.valor == valor,
                    Fatura.vencimento == vencimento
                )
            )
            if existing_fatura.scalar_one_or_none():
                logger.info(f"Fatura already exists for {conc.tipo} (Valor: {valor}, Vencimento: {vencimento}), skipping duplicate.")
                # We still update the log to point to the existing fatura if we want, or just return.
                # Here we just stop processing to avoid duplicates.
                return {"status": "duplicate_invoice", "msg_id": msg_id}

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
        else:
            logger.warning(f"Failed to identify concessionaria/condominio for email from {sender} (Subject: {subject})")

        # ── Alert for PDF unlock failure or Missing Condo ────────────────
        if not pdf_unlocked or not condo:
            from app.models.alerta import Alerta
            from app.services.alert_manager import notify_alert

            condo_nome = condo.nome if condo else "Não identificado"
            conc_tipo = conc.tipo if conc else "N/A"
            conc_instalacao = conc.instalacao if conc else (codigo_encontrado or "N/A")

            if not condo:
                mensagem = (
                    f"Condomínio não identificado para fatura da {conc_tipo}. "
                    f"Verifique as regras de concessionária. (UC: {conc_instalacao}) "
                    f"Remetente: {sender} | Assunto: {subject}"
                )
                tipo_alerta = "email_nao_identificado"
            else:
                mensagem = (
                    f"Falha no desbloqueio do PDF da {conc_tipo} do {condo_nome}. "
                    f"Verifique a regra de senha configurada. "
                    f"(UC: {conc_instalacao}) "
                    f"Remetente: {sender} | Assunto: {subject}"
                )
                tipo_alerta = "pdf_erro"

            alert = Alerta(
                condominio_id=condo.id if condo else None,
                fatura_id=fatura.id,
                tipo=tipo_alerta,
                gravidade="alta",
                mensagem=mensagem,
                email_remetente=sender,
                email_assunto=subject,
            )
            db.add(alert)
            await db.flush()

            # Send notification email with full context
            await notify_alert(db, alert, fatura=fatura, conc=conc)
            logger.warning(
                f"PDF/Condo issue for {conc_tipo} | UC: {conc_instalacao} | "
                f"Condo: {condo_nome} | Sender: {sender} | Subject: {subject}"
            )

        # ── Audit Log (System Action) ────────────────────────────────────
        audit_detalhes = {
            "valor": valor, 
            "vencimento": str(vencimento), 
            "referencia": referencia, 
            "origem": "email",
            "remetente": sender,
            "pdf_desbloqueado": pdf_unlocked
        }
        if conc:
            audit_detalhes["concessionaria_tipo"] = conc.tipo
            audit_detalhes["concessionaria_codigo"] = conc.instalacao
            if condo:
                audit_detalhes["condominio_nome"] = condo.nome
        
        audit = AuditLog(
            acao="inclusao",
            entidade_tipo="fatura",
            entidade_id=fatura.id,
            usuario_nome="Sistema (n8n)",
            usuario_email="bot@datacron.com.br",
            detalhes=audit_detalhes
        )
        db.add(audit)

        await db.commit()

        if not condo or not pdf_unlocked:
            return {
                "status": "action_required",
                "reason": "condominio_nao_identificado" if not condo else "pdf_locked",
                "msg_id": msg_id,
                "fatura_id": str(fatura.id),
                "condominio": condo.nome if condo else None,
                "unlocked": pdf_unlocked
            }

        return {
            "status": "success",
            "fatura_id": str(fatura.id),
            "condominio": condo.nome if condo else None,
            "unlocked": pdf_unlocked
        }

    except Exception as e:
        logger.error(f"Error processing webhook invoice: {str(e)}", exc_info=True)
        await db.rollback()
        try:
            log_result = await db.execute(select(EmailLog).where(EmailLog.gmail_message_id == msg_id))
            log = log_result.scalar_one_or_none()
            if log:
                log.status = "erro"
                log.erro_msg = str(e)[:2000]
                await db.commit()
        except Exception as inner_e:
            logger.error(f"Failed to update EmailLog after rollback: {inner_e}")
            await db.rollback()
        return {"status": "error", "message": str(e), "msg_id": msg_id}

