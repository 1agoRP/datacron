"""
Alert Manager Service
======================
Analyzes new faturas and generates alerts based on business rules:
  1. Value variation > threshold vs historical average
  2. Bill not received by expected day of month  
  3. PDF unlock failure
"""

import logging
import base64
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.encoders import jsonable_encoder

from app.config import settings
from app.models.alerta import Alerta
from app.models.alert_webhook_delivery import AlertWebhookDelivery
from app.models.concessionaria import Concessionaria
from app.models.fatura import Fatura
from app.models.condominio import Condominio
from app.security import resolve_storage_path
from app.services.email_sender import render_alert_email

logger = logging.getLogger(__name__)

OFFICIAL_OUTBOUND_EMAIL_WEBHOOK_URL = (
    "https://n8n-n8n.7vjfup.easypanel.host/webhook/datacron-outbound-email"
)



async def check_and_create_alerts(
    fatura: Fatura,
    conc: Concessionaria,
    db: AsyncSession,
) -> list[dict]:
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
    payloads = []
    for alert in alerts:
        payload = await notify_alert(db, alert, fatura, conc)
        if payload:
            payloads.append(payload)
    return payloads



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

    if variation > VALUE_VARIATION_ALERT_THRESHOLD:
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



async def check_missing_bills(db: AsyncSession) -> list[dict]:
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

    payloads = []

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
            tipo_alerta = f"alerta_falta_conta_ndeb_aut{days_until_due}"
        # Rule 1: Conta não recebida (on the exact day, if auto debit)
        elif days_until_due == 0:
            tipo_alerta = "alerta_falta_conta"
            
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
                payload = await notify_alert(db, alert, conc=conc)
                if payload:
                    payloads.append(payload)
                logger.info(f"Alert created and notified: {tipo_alerta} for conc {conc.id}")
            except Exception as notify_err:
                logger.error(f"Alert saved but notification failed for conc {conc.id}: {notify_err}")
                
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to create alert for concessionaria {conc.id}: {e}")

    logger.info("Finished check_missing_bills.")
    return payloads


# Roles authorized to receive alert email notifications.
# The product role "gerente" is stored as "gerencia" in the current user table.
MANAGER_NOTIFICATION_ROLES = {"gerencia", "gerente"}
ALERT_NOTIFICATION_ROLES = {"admin", "assistente", "supervisor", *MANAGER_NOTIFICATION_ROLES}
ALERT_WEBHOOK_SCHEMA_VERSION = "2026-05-30"
MAX_ALERT_WEBHOOK_ATTEMPTS = 5
VALUE_VARIATION_ALERT_THRESHOLD = 0.15
ALERT_TYPES_WITH_PDF_CONTEXT = {
    "pdf_erro",
    "Variacao_Valor_Mais",
    "Variacao_Valor_Menos",
    "Fatura_Sem_Debito_Automatico",
    "alerta_conta_alta",
    "alerta_conta_baixa",
    "alerta_falta_conta_ndeb_aut3",
    "alerta_falta_conta_ndeb_aut2",
    "alerta_falta_conta_ndeb_aut1",
    "alerta_falta_conta_ndeb_aut0",
}
N8N_ALERT_TYPE_MAP = {
    "Nao_Recebida": "alerta_falta_conta",
    "Variacao_Valor_Mais": "alerta_conta_alta",
    "Variacao_Valor_Menos": "alerta_conta_baixa",
    "Fatura_Sem_Debito_Automatico": "alerta_falta_conta_ndeb_aut0",
    "Mandato_a_Vencer": "ata_mandato_a_vencer",
    "Mandato_Vencido": "ata_mandato_vencida",
}

ACCOUNT_ALERT_TYPES = {
    "alerta_falta_conta",
    "alerta_conta_alta",
    "alerta_conta_baixa",
    "alerta_falta_conta_ndeb_aut3",
    "alerta_falta_conta_ndeb_aut2",
    "alerta_falta_conta_ndeb_aut1",
    "alerta_falta_conta_ndeb_aut0",
}
DOCUMENT_ALERT_TYPES = {
    "ata_mandato_a_vencer",
    "ata_mandato_vencida",
    "seguro_a_vencer",
    "seguro_vencido",
    "avcb_a_vencer",
    "avcb_vencido",
}
EMAIL_ALERT_TYPES = {"email_nao_identificado", "pdf_erro"}
RESOLUTION_ALERT_TYPE = "resol_pen"
ALL_N8N_ALERT_TYPES = ACCOUNT_ALERT_TYPES | DOCUMENT_ALERT_TYPES | EMAIL_ALERT_TYPES | {RESOLUTION_ALERT_TYPE}

ALERT_RECIPIENT_ROLES_BY_TYPE: dict[str, set[str]] = {
    "alerta_falta_conta": MANAGER_NOTIFICATION_ROLES | {"assistente"},
    "alerta_conta_alta": MANAGER_NOTIFICATION_ROLES | {"assistente", "supervisor"},
    "alerta_conta_baixa": MANAGER_NOTIFICATION_ROLES | {"assistente", "supervisor"},
    "alerta_falta_conta_ndeb_aut3": MANAGER_NOTIFICATION_ROLES | {"assistente"},
    "alerta_falta_conta_ndeb_aut2": MANAGER_NOTIFICATION_ROLES | {"assistente"},
    "alerta_falta_conta_ndeb_aut1": MANAGER_NOTIFICATION_ROLES | {"assistente"},
    "alerta_falta_conta_ndeb_aut0": MANAGER_NOTIFICATION_ROLES | {"assistente"},
    "ata_mandato_a_vencer": MANAGER_NOTIFICATION_ROLES | {"assistente", "supervisor"},
    "ata_mandato_vencida": MANAGER_NOTIFICATION_ROLES | {"assistente", "supervisor"},
    "seguro_a_vencer": MANAGER_NOTIFICATION_ROLES | {"assistente", "supervisor"},
    "seguro_vencido": MANAGER_NOTIFICATION_ROLES | {"assistente", "supervisor"},
    "avcb_a_vencer": MANAGER_NOTIFICATION_ROLES | {"assistente", "supervisor"},
    "avcb_vencido": MANAGER_NOTIFICATION_ROLES | {"assistente", "supervisor"},
    "email_nao_identificado": {"admin"},
    "pdf_erro": {"admin"},
    "resol_pen": MANAGER_NOTIFICATION_ROLES | {"assistente"},
}

ALERT_TYPE_METADATA: dict[str, dict[str, str]] = {
    "alerta_falta_conta": {
        "categoria": "contas",
        "titulo": "Conta nao recebida",
        "subtitulo": "Uma conta esperada ainda nao foi registrada no Datacron.",
        "icone": "!",
    },
    "alerta_conta_alta": {
        "categoria": "contas",
        "titulo": "Conta com valor acima da media",
        "subtitulo": "O valor recebido ficou acima da media historica cadastrada.",
        "icone": "!",
    },
    "alerta_conta_baixa": {
        "categoria": "contas",
        "titulo": "Conta com valor abaixo da media",
        "subtitulo": "O valor recebido ficou abaixo da media historica cadastrada.",
        "icone": "i",
    },
    "alerta_falta_conta_ndeb_aut3": {
        "categoria": "contas",
        "titulo": "Conta sem debito automatico vence em 3 dias",
        "subtitulo": "Fatura sem debito automatico exige acompanhamento antes do vencimento.",
        "icone": "!",
    },
    "alerta_falta_conta_ndeb_aut2": {
        "categoria": "contas",
        "titulo": "Conta sem debito automatico vence em 2 dias",
        "subtitulo": "Fatura sem debito automatico exige acompanhamento antes do vencimento.",
        "icone": "!",
    },
    "alerta_falta_conta_ndeb_aut1": {
        "categoria": "contas",
        "titulo": "Conta sem debito automatico vence amanha",
        "subtitulo": "Fatura sem debito automatico exige acao imediata.",
        "icone": "!",
    },
    "alerta_falta_conta_ndeb_aut0": {
        "categoria": "contas",
        "titulo": "Conta sem debito automatico vence hoje",
        "subtitulo": "Fatura sem debito automatico vence hoje e precisa de acao imediata.",
        "icone": "!",
    },
    "ata_mandato_a_vencer": {
        "categoria": "documentos",
        "titulo": "Mandato a vencer",
        "subtitulo": "O mandato cadastrado esta proximo do vencimento.",
        "icone": "!",
    },
    "ata_mandato_vencida": {
        "categoria": "documentos",
        "titulo": "Mandato vencido",
        "subtitulo": "O mandato cadastrado ja esta vencido.",
        "icone": "!",
    },
    "seguro_a_vencer": {
        "categoria": "documentos",
        "titulo": "Seguro a vencer",
        "subtitulo": "A apolice de seguro esta proxima do vencimento.",
        "icone": "!",
    },
    "seguro_vencido": {
        "categoria": "documentos",
        "titulo": "Seguro vencido",
        "subtitulo": "A apolice de seguro cadastrada ja esta vencida.",
        "icone": "!",
    },
    "avcb_a_vencer": {
        "categoria": "documentos",
        "titulo": "AVCB a vencer",
        "subtitulo": "O AVCB esta proximo do vencimento.",
        "icone": "!",
    },
    "avcb_vencido": {
        "categoria": "documentos",
        "titulo": "AVCB vencido",
        "subtitulo": "O AVCB cadastrado ja esta vencido.",
        "icone": "!",
    },
    "email_nao_identificado": {
        "categoria": "email_nao_identificado",
        "titulo": "E-mail nao identificado",
        "subtitulo": "O sistema recebeu um e-mail que nao pode ser vinculado automaticamente.",
        "icone": "i",
    },
    "pdf_erro": {
        "categoria": "email_nao_identificado",
        "titulo": "Erro no PDF",
        "subtitulo": "O PDF recebido nao pode ser processado automaticamente.",
        "icone": "!",
    },
    "resol_pen": {
        "categoria": "resolucao",
        "titulo": "Pendencia resolvida",
        "subtitulo": "Uma pendencia foi marcada como resolvida no Datacron.",
        "icone": "ok",
    },
}


def n8n_alert_type(tipo: str) -> str:
    return N8N_ALERT_TYPE_MAP.get(tipo, tipo)


def _recipient_roles_for_alert(tipo: str) -> set[str]:
    canonical_tipo = n8n_alert_type(tipo)
    return ALERT_RECIPIENT_ROLES_BY_TYPE.get(canonical_tipo, ALERT_NOTIFICATION_ROLES)


def get_alert_webhook_url() -> str:
    return (settings.OUTBOUND_EMAIL_WEBHOOK_URL or OFFICIAL_OUTBOUND_EMAIL_WEBHOOK_URL).strip()


def _severity_metadata(tipo: str, gravidade: str) -> dict[str, str]:
    if tipo == RESOLUTION_ALERT_TYPE:
        return {
            "alerta_gravidade_texto": "RESOLVIDO",
            "alerta_gravidade_cor": "#16a34a",
            "alerta_gravidade_bg": "#f0fdf4",
            "alerta_gravidade_borda": "#86efac",
            "alerta_topbar_cor": "#16a34a",
        }
    if tipo in {"alerta_conta_alta", "alerta_falta_conta_ndeb_aut0", "alerta_falta_conta_ndeb_aut1", "ata_mandato_vencida", "seguro_vencido", "avcb_vencido", "pdf_erro"}:
        return {
            "alerta_gravidade_texto": "CRITICO",
            "alerta_gravidade_cor": "#dc2626",
            "alerta_gravidade_bg": "#fef2f2",
            "alerta_gravidade_borda": "#fca5a5",
            "alerta_topbar_cor": "#dc2626",
        }
    if tipo == "alerta_conta_baixa":
        return {
            "alerta_gravidade_texto": "ATENCAO",
            "alerta_gravidade_cor": "#16a34a",
            "alerta_gravidade_bg": "#f0fdf4",
            "alerta_gravidade_borda": "#86efac",
            "alerta_topbar_cor": "#16a34a",
        }
    if tipo == "email_nao_identificado":
        return {
            "alerta_gravidade_texto": "INFO",
            "alerta_gravidade_cor": "#1d4ed8",
            "alerta_gravidade_bg": "#eff6ff",
            "alerta_gravidade_borda": "#93c5fd",
            "alerta_topbar_cor": "#1d4ed8",
        }
    if tipo == "avcb_a_vencer":
        return {
            "alerta_gravidade_texto": "AVISO PREVENTIVO",
            "alerta_gravidade_cor": "#c2410c",
            "alerta_gravidade_bg": "#fff7ed",
            "alerta_gravidade_borda": "#fdba74",
            "alerta_topbar_cor": "#c2410c",
        }
    return {
        "alerta_gravidade_texto": "AVISO" if gravidade != "alta" else "ATENCAO",
        "alerta_gravidade_cor": "#d97706",
        "alerta_gravidade_bg": "#fffbeb",
        "alerta_gravidade_borda": "#fcd34d",
        "alerta_topbar_cor": "#d97706",
    }


def _alert_template_metadata(tipo: str, gravidade: str) -> dict[str, Any]:
    meta = ALERT_TYPE_METADATA.get(tipo, ALERT_TYPE_METADATA["email_nao_identificado"])
    return {
        "template_tipo": "resolucao_pendencia" if tipo == RESOLUTION_ALERT_TYPE else "alerta",
        "email_template_tipo": 2 if tipo == RESOLUTION_ALERT_TYPE else 1,
        "categoria_alerta": meta["categoria"],
        "alerta_titulo": meta["titulo"],
        "alerta_subtitulo": meta["subtitulo"],
        "alerta_icone": meta["icone"],
        "alerta_tipo_valido": tipo in ALL_N8N_ALERT_TYPES,
        **_severity_metadata(tipo, gravidade),
    }


def _document_metadata(tipo: str, due_date) -> dict[str, Any]:
    labels = {
        "ata_mandato_a_vencer": "Ata / Mandato",
        "ata_mandato_vencida": "Ata / Mandato",
        "seguro_a_vencer": "Seguro",
        "seguro_vencido": "Seguro",
        "avcb_a_vencer": "AVCB",
        "avcb_vencido": "AVCB",
    }
    days = None
    if due_date and tipo in DOCUMENT_ALERT_TYPES:
        try:
            days = (due_date.date() if hasattr(due_date, "date") else due_date) - datetime.now().date()
            days = days.days
        except Exception:
            days = None
    return {
        "documento_tipo": labels.get(tipo),
        "documento_dias_restantes": days,
    }


def _format_brl(value: float | None) -> str | None:
    if value is None:
        return None
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _iso(value) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _read_fatura_pdf_base64(alert: Alerta, fatura: Fatura | None) -> str | None:
    canonical_tipo = n8n_alert_type(alert.tipo)
    if not fatura or (alert.tipo not in ALERT_TYPES_WITH_PDF_CONTEXT and canonical_tipo not in ALERT_TYPES_WITH_PDF_CONTEXT):
        return None
    if fatura.pdf_base64:
        return fatura.pdf_base64
    if not fatura.pdf_path:
        return None
    try:
        pdf_path = resolve_storage_path(fatura.pdf_path)
        if not pdf_path.exists():
            return None
        return base64.b64encode(pdf_path.read_bytes()).decode("utf-8")
    except Exception as exc:
        logger.error(f"Failed to read PDF for alert payload: {exc}")
        return None


def _read_stored_pdf_base64(file_ref: str | None) -> str | None:
    if not file_ref:
        return None
    try:
        data = file_ref.split(",", 1)[1] if "," in file_ref else file_ref
        if len(data) > 100 and not any(sep in data for sep in ("\\", "/")):
            return data

        pdf_path = resolve_storage_path(file_ref)
        if not pdf_path.exists():
            return None
        return base64.b64encode(pdf_path.read_bytes()).decode("utf-8")
    except Exception as exc:
        logger.error(f"Failed to read stored PDF for alert payload: {exc}")
        return None


def _document_pdf_context(tipo: str, condo: Condominio | None) -> dict[str, Any]:
    if not condo or tipo not in DOCUMENT_ALERT_TYPES:
        return {"documento_pdf_nome": None, "documento_pdf_base64": None}

    if tipo in {"ata_mandato_a_vencer", "ata_mandato_vencida"}:
        return {
            "documento_pdf_nome": condo.ata_eleicao_nome or "ata_eleicao.pdf",
            "documento_pdf_base64": _read_stored_pdf_base64(condo.ata_eleicao_url),
        }
    if tipo in {"seguro_a_vencer", "seguro_vencido"}:
        return {
            "documento_pdf_nome": "apolice_seguro.pdf",
            "documento_pdf_base64": _read_stored_pdf_base64(condo.apolice_seguro_url),
        }
    if tipo in {"avcb_a_vencer", "avcb_vencido"}:
        return {
            "documento_pdf_nome": "avcb.pdf",
            "documento_pdf_base64": _read_stored_pdf_base64(condo.avcb_url),
        }
    return {"documento_pdf_nome": None, "documento_pdf_base64": None}


async def _get_alert_concessionaria(
    db: AsyncSession,
    fatura: Fatura | None,
    conc: Concessionaria | None,
) -> Concessionaria | None:
    if conc:
        return conc
    if fatura and fatura.concessionaria_id:
        result = await db.execute(
            select(Concessionaria).where(Concessionaria.id == fatura.concessionaria_id)
        )
        return result.scalar_one_or_none()
    return None


def _responsavel_fields(recipients: set[str]) -> dict:
    ordered = sorted(recipients)
    payload = {f"usuarios_responsaveis{i}": None for i in range(5)}
    for index, email in enumerate(ordered[:5]):
        payload[f"usuarios_responsaveis{index}"] = email
    payload["usuarios_responsaveis"] = ordered
    return payload


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
    event_type: str = "alert.created",
) -> None:
    target_url = get_alert_webhook_url()

    await db.flush()
    alerta_id = str(alert.id) if alert.id else "sem-id"
    payload_tipo = payload.get("tipo_de_alerta") or alert.tipo
    if event_type == "alert.created":
        idempotency_key = f"alert:{alerta_id}:{payload_tipo}"
    else:
        idempotency_key = f"{event_type}:{alerta_id}:{payload_tipo}"

    result = await db.execute(
        select(AlertWebhookDelivery).where(
            AlertWebhookDelivery.idempotency_key == idempotency_key
        )
    )
    delivery = result.scalar_one_or_none()

    if delivery and delivery.status == "sent":
        logger.info(f"Alert webhook already sent: {idempotency_key}")
        return

    serialized_payload = jsonable_encoder(payload)

    if not delivery:
        delivery = AlertWebhookDelivery(
            alerta_id=alert.id,
            event_type=event_type,
            target_url=target_url,
            idempotency_key=idempotency_key,
            payload=serialized_payload,
            status="pending",
            attempts=0,
        )
        db.add(delivery)
        await db.flush()
    else:
        delivery.payload = serialized_payload
        delivery.target_url = target_url
        delivery.event_type = event_type

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
) -> dict | None:
    """
    Sends alert notification emails to authorized users.
    Sends only to the roles configured for each alert type.
    For non-admin roles, only sends to users who have access to the condomínio.
    """
    from sqlalchemy import select, or_
    from app.models.condominio import Condominio
    from app.models.user import User
    from app.models.user_condominio import UserCondominio

    # 1. Buscar todos os admins ativos (eles sempre recebem alertas, mesmo sem condomínio identificado)
    canonical_tipo = n8n_alert_type(alert.tipo)
    recipient_roles = _recipient_roles_for_alert(canonical_tipo)

    admin_users = []
    if "admin" in recipient_roles:
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
        non_admin_roles = recipient_roles - {"admin"}
        
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

    conc = await _get_alert_concessionaria(db, fatura, conc)
    if conc:
        tipo_conta = conc.tipo
        cod_conta = conc.instalacao
    
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
    pdf_base64 = _read_fatura_pdf_base64(alert, fatura)
    template_meta = _alert_template_metadata(canonical_tipo, alert.gravidade)
    due_date = fatura.vencimento if fatura else None
    if canonical_tipo in {"ata_mandato_a_vencer", "ata_mandato_vencida"} and condo:
        due_date = condo.mandato_fim
    document_pdf = _document_pdf_context(canonical_tipo, condo)
    attachment_pdf_base64 = pdf_base64 or document_pdf["documento_pdf_base64"]
    attachment_pdf_name = (fatura.pdf_nome_original if fatura else None) or document_pdf["documento_pdf_nome"]
    variacao_percentual = getattr(fatura, "variacao_percentual", None) if fatura else None
    payload = {
        "schema_version": ALERT_WEBHOOK_SCHEMA_VERSION,
        "event_type": "alert.created",
        "webhook_destino": "datacron-outbound-email",
        "id_alerta": str(alert.id) if alert.id else None,
        "tipo_de_alerta": canonical_tipo,
        "tipo_de_alerta_origem": alert.tipo,
        "gravidade": alert.gravidade,
        **template_meta,
        **_document_metadata(canonical_tipo, due_date),
        "variacao_percentual": variacao_percentual,
        "contexto": {
            "mensagem": alert.mensagem,
            "email_assunto": getattr(alert, "email_assunto", None) or (fatura.email_assunto if fatura else None),
            "fatura_referencia": fatura_referencia,
            "subject_sugerido": subject,
            "texto_sugerido": message_text,
            "html_sugerido": html_body,
        },
        "created_at": _iso(alert.created_at),
        "email_remetente": getattr(alert, "email_remetente", None) or (fatura.email_remetente if fatura else None),
        "id_email_original": fatura.gmail_message_id if fatura else None,
        "email_data": _iso(getattr(alert, "email_data", None) or (fatura.created_at if fatura else None)),
        "condominio_id": str(alert.condominio_id) if alert.condominio_id else None,
        "condominio_nome": condo.nome if condo else None,
        "condominio_numero": str(condo.numero) if condo else None,
        "condominio_carteira": condo.carteira if condo else None,
        "concessionaria_id": str(conc.id) if conc else None,
        "concessionaria_tipo": conc.tipo if conc else None,
        "concessionaria_cod_identificacao": conc.instalacao if conc else (cod_conta if cod_conta != "N/A" else None),
        "concessionaria_valor_medio": conc.valor_medio if conc else None,
        "fatura_id": str(fatura.id) if fatura else None,
        "fatura_vencimento": _iso(fatura.vencimento if fatura else None),
        "fatura_valor": fatura.valor if fatura else None,
        "fatura_valor_formatado": _format_brl(fatura.valor if fatura else None),
        "fatura_debauto": bool(fatura.debito_automatico) if fatura else False,
        "fatura_gmail_message_id": fatura.gmail_message_id if fatura else None,
        "fatura_pdf_nome": fatura.pdf_nome_original if fatura else None,
        "fatura_pdf_desbloqueado": bool(fatura.pdf_desbloqueado) if fatura else False,
        "fatura_pdf_base64": attachment_pdf_base64,
        "documento_pdf_nome": document_pdf["documento_pdf_nome"],
        "documento_pdf_base64": document_pdf["documento_pdf_base64"],
        "anexo_pdf_nome": attachment_pdf_name,
        "anexo_pdf_base64": attachment_pdf_base64,
        "source": "datacron.backend",
    }
    payload.update(_responsavel_fields(recipients))

    await _enqueue_and_send_alert_webhook(db, alert, payload)
    return payload


async def notify_alert_resolution(
    db: AsyncSession,
    alert: Alerta,
    resolved_by_email: str,
    resolved_by_name: str | None = None,
    justificativa: str | None = None,
    fatura: Optional[Fatura] = None,
    conc: Optional[Concessionaria] = None,
) -> dict:
    from app.models.user import User
    from app.models.user_condominio import UserCondominio

    if not fatura and alert.fatura_id:
        result = await db.execute(select(Fatura).where(Fatura.id == alert.fatura_id))
        fatura = result.scalar_one_or_none()

    condo = None
    if alert.condominio_id:
        result = await db.execute(select(Condominio).where(Condominio.id == alert.condominio_id))
        condo = result.scalar_one_or_none()

    conc = await _get_alert_concessionaria(db, fatura, conc)

    recipients = set()
    recipient_roles = _recipient_roles_for_alert(RESOLUTION_ALERT_TYPE)
    if alert.condominio_id:
        linked = await db.execute(
            select(User)
            .join(UserCondominio, UserCondominio.user_id == User.id)
            .where(
                UserCondominio.condominio_id == alert.condominio_id,
                User.role.in_(recipient_roles),
                User.ativo == True,
            )
        )
        for user in linked.scalars().all():
            recipients.add(user.email)

    if condo:
        all_role_users = await db.execute(
            select(User).where(
                User.role.in_(recipient_roles),
                User.ativo == True,
                User.codigo_condominio.is_not(None),
            )
        )
        condo_num = str(condo.numero).strip()
        for user in all_role_users.scalars().all():
            codigo_str = user.codigo_condominio or ""
            if "todos" in codigo_str.lower():
                recipients.add(user.email)
                continue
            codes = [c.strip() for c in codigo_str.split(",") if c.strip()]
            all_codes = set(codes)
            for code in codes:
                if code.isdigit():
                    all_codes.add(code.zfill(2))
                    all_codes.add(code.zfill(3))
                    all_codes.add(code.zfill(4))
            if condo_num in all_codes:
                recipients.add(user.email)

    original_tipo = n8n_alert_type(alert.tipo)
    template_meta = _alert_template_metadata(RESOLUTION_ALERT_TYPE, "baixa")
    payload = {
        "schema_version": ALERT_WEBHOOK_SCHEMA_VERSION,
        "event_type": "alert.resolved",
        "webhook_destino": "datacron-outbound-email",
        "id_alerta": str(alert.id) if alert.id else None,
        "tipo_de_alerta": RESOLUTION_ALERT_TYPE,
        "tipo_de_alerta_origem": original_tipo,
        "gravidade": "baixa",
        **template_meta,
        **_document_metadata(original_tipo, fatura.vencimento if fatura else None),
        "variacao_percentual": getattr(fatura, "variacao_percentual", None) if fatura else None,
        "contexto": {
            "mensagem": alert.mensagem,
            "alerta_original_tipo": original_tipo,
            "alerta_original_gravidade": alert.gravidade,
            "resolucao_observacao": justificativa,
            "resolvido_por": resolved_by_email,
            "resolvido_por_nome": resolved_by_name,
        },
        "created_at": _iso(alert.created_at),
        "resolved_at": _iso(datetime.now(timezone.utc)),
        "resolvido_em": _iso(datetime.now(timezone.utc)),
        "resolvido_por": resolved_by_email,
        "resolvido_por_nome": resolved_by_name,
        "resolucao_observacao": justificativa,
        "email_remetente": getattr(alert, "email_remetente", None) or (fatura.email_remetente if fatura else None),
        "id_email_original": fatura.gmail_message_id if fatura else None,
        "email_data": _iso(getattr(alert, "email_data", None) or (fatura.created_at if fatura else None)),
        "condominio_id": str(alert.condominio_id) if alert.condominio_id else None,
        "condominio_nome": condo.nome if condo else None,
        "condominio_numero": str(condo.numero) if condo else None,
        "condominio_carteira": condo.carteira if condo else None,
        "concessionaria_id": str(conc.id) if conc else None,
        "concessionaria_tipo": conc.tipo if conc else None,
        "concessionaria_cod_identificacao": conc.instalacao if conc else None,
        "concessionaria_valor_medio": conc.valor_medio if conc else None,
        "fatura_id": str(fatura.id) if fatura else None,
        "fatura_vencimento": _iso(fatura.vencimento if fatura else None),
        "fatura_valor": fatura.valor if fatura else None,
        "fatura_valor_formatado": _format_brl(fatura.valor if fatura else None),
        "fatura_debauto": bool(fatura.debito_automatico) if fatura else False,
        "fatura_gmail_message_id": fatura.gmail_message_id if fatura else None,
        "fatura_pdf_nome": fatura.pdf_nome_original if fatura else None,
        "fatura_pdf_desbloqueado": bool(fatura.pdf_desbloqueado) if fatura else False,
        "fatura_pdf_base64": _read_fatura_pdf_base64(alert, fatura),
        "source": "datacron.backend",
    }
    payload.update(_responsavel_fields(recipients))

    await _enqueue_and_send_alert_webhook(db, alert, payload, event_type="alert.resolved")
    return payload


async def check_mandate_expirations(db: AsyncSession) -> list[dict]:
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
    
    payloads = []

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
                    payload = await notify_alert(db, alert)
                    if payload:
                        payloads.append(payload)
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
    return payloads

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
