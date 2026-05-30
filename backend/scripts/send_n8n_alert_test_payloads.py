"""
Send realistic alert payloads to the n8n alert webhook.

This script reads real fatura/condominio/concessionaria data from the configured
database, reuses a real stored PDF when available, and sends one synthetic test
payload per alert type. It does not create Alerta rows or AlertWebhookDelivery
rows; it only exercises the n8n route and payload structure.

Usage:
    python scripts/send_n8n_alert_test_payloads.py --send
    python scripts/send_n8n_alert_test_payloads.py --send --url https://...
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.concessionaria import Concessionaria
from app.models.fatura import Fatura
from app.security import resolve_storage_path
from app.services.alert_manager import ALERT_TYPES_WITH_PDF_CONTEXT, ALERT_WEBHOOK_SCHEMA_VERSION

TEST_RECIPIENT = "pradomansia@gmail.com"

ALERT_CASES = [
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


async def _find_real_fatura_with_context() -> Fatura:
    async with AsyncSessionLocal() as db:
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

        # Touch relationships while the session is open.
        if not fatura.condominio or not fatura.concessionaria:
            raise RuntimeError("A fatura encontrada nao possui contexto relacional completo.")
        return fatura


def _build_payload(tipo: str, gravidade: str, mensagem: str, fatura: Fatura) -> dict:
    condo = fatura.condominio
    conc: Concessionaria = fatura.concessionaria
    created_at = datetime.now(timezone.utc)
    include_pdf = tipo in ALERT_TYPES_WITH_PDF_CONTEXT

    payload = {
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
        "created_at": _iso(created_at),
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
        "usuarios_responsaveis": [TEST_RECIPIENT],
        "usuarios_responsaveis0": TEST_RECIPIENT,
        "usuarios_responsaveis1": None,
        "usuarios_responsaveis2": None,
        "usuarios_responsaveis3": None,
        "usuarios_responsaveis4": None,
        "source": "datacron.backend.test",
    }
    return payload


async def _send_payloads(url: str, payloads: list[dict], timeout: float) -> list[dict]:
    results = []
    async with httpx.AsyncClient(timeout=timeout) as client:
        for payload in payloads:
            tipo = payload["tipo_de_alerta"]
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
            response.raise_for_status()
    return results


def _is_database_connection_error(exc: BaseException) -> bool:
    text = str(exc).lower()
    return any(
        marker in text
        for marker in (
            "connection refused",
            "could not connect",
            "connect call failed",
            "targetserverattributenotmatched",
            "remote computer refused",
            "winerror 1225",
        )
    )


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--send", action="store_true", help="Actually POST payloads to n8n.")
    parser.add_argument("--url", default=settings.N8N_WEBHOOK_URL, help="n8n alert webhook URL.")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--print-json", action="store_true", help="Print payloads before sending.")
    args = parser.parse_args()

    if not args.url:
        raise SystemExit("N8N_WEBHOOK_URL nao configurado. Use --url ou configure o ambiente.")

    try:
        fatura = await _find_real_fatura_with_context()
    except (OSError, SQLAlchemyError) as exc:
        if not _is_database_connection_error(exc):
            raise
        raise SystemExit(
            "Nao foi possivel conectar ao banco configurado em DATABASE_URL. "
            "Para usar dados/PDF reais, rode este script no container do backend "
            "ou configure DATABASE_URL para um Postgres acessivel a partir desta maquina. "
            f"Erro original: {exc}"
        ) from exc
    payloads = [_build_payload(tipo, gravidade, msg, fatura) for tipo, gravidade, msg in ALERT_CASES]

    if args.print_json or not args.send:
        print(json.dumps(jsonable_encoder(payloads), ensure_ascii=False, indent=2))

    if not args.send:
        print("Dry-run concluido. Use --send para enviar ao n8n.")
        return 0

    results = await _send_payloads(args.url, payloads, args.timeout)
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
