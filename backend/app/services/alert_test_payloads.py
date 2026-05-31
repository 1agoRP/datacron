import base64
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.concessionaria import Concessionaria
from app.models.fatura import Fatura
from app.security import resolve_storage_path
from app.services.alert_manager import ALERT_TYPES_WITH_PDF_CONTEXT, ALERT_WEBHOOK_SCHEMA_VERSION

TEST_ALERT_RECIPIENT = "pradomansia@gmail.com"
DEFAULT_TEST_ALERT_WEBHOOK_URL = (
    "https://n8n-n8n.7vjfup.easypanel.host/webhook/"
    "7313ad7c-f62d-4bdb-a68d-9a627b6b0b26"
)

TEST_ALERT_CASES = [
    ("Variacao_Valor_Mais", "alta", "Teste n8n: valor acima da media historica."),
    ("Variacao_Valor_Menos", "media", "Teste n8n: valor abaixo da media historica."),
    ("Fatura_Sem_Debito_Automatico", "alta", "Teste n8n: fatura sem debito automatico."),
    ("Nao_Recebida", "alta", "Teste n8n: conta esperada ainda nao recebida."),
    ("Mandato_a_Vencer", "media", "Teste n8n: mandato do sindico a vencer."),
    ("pdf_erro", "alta", "Teste n8n: falha no desbloqueio do PDF."),
    ("email_nao_identificado", "media", "Teste n8n: email recebido nao identificado."),
]


def _format_brl(value: float | None) -> str | None:
    if value is None:
        return None
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _load_pdf_base64(fatura: Fatura) -> str:
    if fatura.pdf_base64:
        return fatura.pdf_base64
    if not fatura.pdf_path:
        raise RuntimeError("A fatura de exemplo nao possui pdf_path nem pdf_base64.")

    pdf_path = resolve_storage_path(fatura.pdf_path)
    if not pdf_path.exists():
        raise RuntimeError(f"PDF da fatura nao encontrado no filesystem: {pdf_path}")
    return base64.b64encode(pdf_path.read_bytes()).decode("utf-8")


async def find_real_fatura_with_context(db: AsyncSession) -> Fatura:
    result = await db.execute(
        select(Fatura)
        .options(
            selectinload(Fatura.condominio),
            selectinload(Fatura.concessionaria),
        )
        .where(
            Fatura.condominio_id.is_not(None),
            Fatura.concessionaria_id.is_not(None),
            (Fatura.pdf_base64.is_not(None) | Fatura.pdf_path.is_not(None)),
        )
        .order_by(Fatura.created_at.desc())
        .limit(1)
    )
    fatura = result.scalar_one_or_none()

    if not fatura:
        raise RuntimeError(
            "Nenhuma fatura real com condominio, concessionaria e PDF foi encontrada."
        )
    if not fatura.condominio or not fatura.concessionaria:
        raise RuntimeError("A fatura encontrada nao possui contexto relacional completo.")
    return fatura


def build_test_alert_payload(tipo: str, gravidade: str, mensagem: str, fatura: Fatura) -> dict:
    condo = fatura.condominio
    conc: Concessionaria = fatura.concessionaria
    include_pdf = tipo in ALERT_TYPES_WITH_PDF_CONTEXT

    return {
        "schema_version": ALERT_WEBHOOK_SCHEMA_VERSION,
        "event_type": "alert.created.test",
        "id_alerta": str(uuid.uuid4()),
        "tipo_de_alerta": tipo,
        "gravidade": gravidade,
        "contexto": {
            "modo": "teste_n8n",
            "mensagem": mensagem,
            "email_assunto": fatura.email_assunto,
            "fatura_referencia": fatura.referencia,
            "observacao": "Payload sintetico com dados reais do banco; nao cria alerta no Datacron.",
        },
        "created_at": _iso(datetime.now(timezone.utc)),
        "email_remetente": fatura.email_remetente,
        "id_email_original": fatura.gmail_message_id,
        "email_data": _iso(fatura.created_at),
        "condominio_id": str(condo.id),
        "condominio_nome": condo.nome,
        "condominio_numero": str(condo.numero),
        "condominio_carteira": condo.carteira,
        "concessionaria_id": str(conc.id),
        "concessionaria_tipo": conc.tipo,
        "concessionaria_cod_identificacao": conc.instalacao,
        "concessionaria_valor_medio": conc.valor_medio,
        "fatura_id": str(fatura.id),
        "fatura_vencimento": _iso(fatura.vencimento),
        "fatura_valor": fatura.valor,
        "fatura_valor_formatado": _format_brl(fatura.valor),
        "fatura_debauto": bool(fatura.debito_automatico),
        "fatura_gmail_message_id": fatura.gmail_message_id,
        "fatura_pdf_nome": fatura.pdf_nome_original,
        "fatura_pdf_desbloqueado": bool(fatura.pdf_desbloqueado),
        "fatura_pdf_base64": _load_pdf_base64(fatura) if include_pdf else None,
        "usuarios_responsaveis": [TEST_ALERT_RECIPIENT],
        "usuarios_responsaveis0": TEST_ALERT_RECIPIENT,
        "usuarios_responsaveis1": None,
        "usuarios_responsaveis2": None,
        "usuarios_responsaveis3": None,
        "usuarios_responsaveis4": None,
        "source": "datacron.backend.test",
    }


async def build_test_alert_payloads(db: AsyncSession) -> list[dict]:
    fatura = await find_real_fatura_with_context(db)
    return [
        build_test_alert_payload(tipo, gravidade, mensagem, fatura)
        for tipo, gravidade, mensagem in TEST_ALERT_CASES
    ]


async def send_test_alert_payloads(
    url: str,
    payloads: list[dict],
    timeout: float = 30.0,
) -> list[dict]:
    results = []
    async with httpx.AsyncClient(timeout=timeout) as client:
        for payload in payloads:
            tipo = payload["tipo_de_alerta"]
            try:
                response = await client.post(
                    url,
                    json=jsonable_encoder(payload),
                    headers={"X-Idempotency-Key": f"test-alert:{tipo}:{payload['id_alerta']}"},
                )
                results.append(
                    {
                        "tipo_de_alerta": tipo,
                        "status_code": response.status_code,
                        "ok": 200 <= response.status_code < 300,
                        "response_preview": response.text[:500],
                    }
                )
            except Exception as exc:
                results.append(
                    {
                        "tipo_de_alerta": tipo,
                        "status_code": None,
                        "ok": False,
                        "response_preview": str(exc)[:500],
                    }
                )
    return results
