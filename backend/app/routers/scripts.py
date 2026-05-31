from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.services.alert_test_payloads import build_test_alert_payloads
from scripts.send_n8n_alert_test_payloads import _send_payloads

router = APIRouter(prefix="/scripts", tags=["Scripts Utilitarios"])

DEFAULT_TEST_WEBHOOK = (
    "https://n8n-n8n.7vjfup.easypanel.host/webhook-test/"
    "7313ad7c-f62d-4bdb-a68d-9a627b6b0b26"
)


async def run_alert_payload_test(db: AsyncSession, url: str | None = None) -> dict:
    webhook_url = url or DEFAULT_TEST_WEBHOOK or settings.N8N_WEBHOOK_URL
    if not webhook_url:
        raise HTTPException(
            status_code=400,
            detail="N8N_WEBHOOK_URL nao configurado e nenhuma URL padrao foi encontrada.",
        )

    try:
        payloads = await build_test_alert_payloads(db)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar fatura real com contexto no banco de dados: {exc}",
        ) from exc

    try:
        results = await _send_payloads(webhook_url, payloads, timeout=30.0)
        return {
            "status": "success",
            "message": f"Enviado com sucesso {len(payloads)} payloads de teste para o n8n.",
            "webhook_url": webhook_url,
            "total_alertas": len(payloads),
            "alertas": payloads,
            "results": results,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar ou enviar payloads para o n8n: {exc}",
        ) from exc


@router.post("/send_n8n_alert_test_payloads")
async def trigger_send_n8n_alert_test_payloads_post(
    url: str | None = Query(None, description="URL alternativa para o webhook do n8n."),
    db: AsyncSession = Depends(get_db),
):
    return await run_alert_payload_test(db, url)


@router.get("/send_n8n_alert_test_payloads")
async def trigger_send_n8n_alert_test_payloads_get(
    url: str | None = Query(None, description="URL alternativa para o webhook do n8n."),
    db: AsyncSession = Depends(get_db),
):
    return await run_alert_payload_test(db, url)
