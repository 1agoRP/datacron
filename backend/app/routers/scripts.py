import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from app.config import settings

# Ajusta o sys.path para garantir que possamos importar de 'scripts' na raiz do backend
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.send_n8n_alert_test_payloads import (
    _find_real_fatura_with_context,
    _build_payload,
    _send_payloads,
    ALERT_CASES
)

router = APIRouter(prefix="/scripts", tags=["Scripts Utilitários"])

DEFAULT_TEST_WEBHOOK = "https://n8n-n8n.7vjfup.easypanel.host/webhook-test/7313ad7c-f62d-4bdb-a68d-9a627b6b0b26"

async def run_alert_payload_test(url: str | None = None) -> dict:
    # Prioriza a URL explicitamente enviada por parâmetro, seguida pela URL de testes informada e,
    # por fim, a variável de ambiente global N8N_WEBHOOK_URL.
    webhook_url = url or DEFAULT_TEST_WEBHOOK or settings.N8N_WEBHOOK_URL
    if not webhook_url:
        raise HTTPException(
            status_code=400,
            detail="N8N_WEBHOOK_URL não configurado e nenhuma URL padrão foi encontrada."
        )

    try:
        fatura = await _find_real_fatura_with_context()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar fatura real com contexto no banco de dados: {exc}"
        )

    try:
        payloads = [_build_payload(tipo, gravidade, msg, fatura) for tipo, gravidade, msg in ALERT_CASES]
        results = await _send_payloads(webhook_url, payloads, timeout=30.0)
        return {
            "status": "success",
            "message": f"Enviado com sucesso {len(payloads)} payloads de teste para o n8n.",
            "webhook_url": webhook_url,
            "results": results
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar ou enviar payloads para o n8n: {exc}"
        )

@router.post("/send_n8n_alert_test_payloads")
async def trigger_send_n8n_alert_test_payloads_post(
    url: str | None = Query(None, description="URL alternativa para o webhook do n8n (sobrescreve a padrão)")
):
    """
    Aciona o envio dos payloads de alerta de teste para o webhook do n8n via POST.
    Lê uma fatura e condomínio reais do banco para estruturar os dados.
    """
    return await run_alert_payload_test(url)

@router.get("/send_n8n_alert_test_payloads")
async def trigger_send_n8n_alert_test_payloads_get(
    url: str | None = Query(None, description="URL alternativa para o webhook do n8n (sobrescreve a padrão)")
):
    """
    Aciona o envio dos payloads de alerta de teste para o webhook do n8n via GET.
    Lê uma fatura e condomínio reais do banco para estruturar os dados.
    """
    return await run_alert_payload_test(url)
