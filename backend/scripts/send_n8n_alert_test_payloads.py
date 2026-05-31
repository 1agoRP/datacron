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
import json
import sys
from pathlib import Path

import httpx
from fastapi.encoders import jsonable_encoder
from sqlalchemy.exc import SQLAlchemyError

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import settings
from app.database import AsyncSessionLocal
from app.services.alert_test_payloads import build_test_alert_payloads


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
        async with AsyncSessionLocal() as db:
            payloads = await build_test_alert_payloads(db)
    except (OSError, SQLAlchemyError) as exc:
        if not _is_database_connection_error(exc):
            raise
        raise SystemExit(
            "Nao foi possivel conectar ao banco configurado em DATABASE_URL. "
            "Para usar dados/PDF reais, rode este script no container do backend "
            "ou configure DATABASE_URL para um Postgres acessivel a partir desta maquina. "
            f"Erro original: {exc}"
        ) from exc

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
