import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_import_condominios_template(auth_client: AsyncClient):
    resp = await auth_client.get("/api/importacoes/modelo?tipo=condominios")
    assert resp.status_code == 200
    assert "spreadsheetml" in resp.headers["content-type"]
    assert "condominios" in resp.headers["content-disposition"]

@pytest.mark.asyncio
async def test_import_concessionarias_template(auth_client: AsyncClient):
    resp = await auth_client.get("/api/importacoes/modelo?tipo=concessionarias")
    assert resp.status_code == 200
    assert "spreadsheetml" in resp.headers["content-type"]
    assert "concessionarias" in resp.headers["content-disposition"]

@pytest.mark.asyncio
async def test_import_invalid_template_param(auth_client: AsyncClient):
    resp = await auth_client.get("/api/importacoes/modelo?tipo=invalido")
    assert resp.status_code == 400
    assert "Tipo inválido" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_import_no_file(auth_client: AsyncClient):
    resp = await auth_client.post("/api/importacoes/preview?tipo=condominios")
    assert resp.status_code == 422 # FastAPI validation catches missing file

