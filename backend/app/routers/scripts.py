from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.services.alert_test_payloads import (
    DEFAULT_TEST_ALERT_WEBHOOK_URL,
    build_test_alert_payloads,
    send_test_alert_payloads,
)

router = APIRouter(prefix="/scripts", tags=["Scripts Utilitarios"])

async def run_alert_payload_test(db: AsyncSession, url: str | None = None) -> dict:
    webhook_url = url or DEFAULT_TEST_ALERT_WEBHOOK_URL or settings.N8N_WEBHOOK_URL
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
        results = await send_test_alert_payloads(webhook_url, payloads, timeout=30.0)
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
