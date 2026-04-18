import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_alertas_list_empty(auth_client: AsyncClient):
    resp = await auth_client.get("/api/alertas")
    assert resp.status_code == 200
    assert resp.json() == []

@pytest.mark.asyncio
async def test_alertas_contagem(auth_client: AsyncClient):
    resp = await auth_client.get("/api/alertas/contagem")
    assert resp.status_code == 200
    assert resp.json() == {"nao_lidos": 0}

@pytest.mark.asyncio
async def test_alertas_invalid_id(auth_client: AsyncClient):
    import uuid
    invalid_id = str(uuid.uuid4())
    # Try resolving non-existent alert
    resp = await auth_client.put(f"/api/alertas/{invalid_id}/resolver")
    assert resp.status_code == 404
    assert "não encontrado" in resp.json()["detail"].lower()
