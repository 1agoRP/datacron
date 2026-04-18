import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_import_condominios_template(auth_client: AsyncClient):
    resp = await auth_client.get("/api/importacoes/template/condominios")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "condominios" in resp.headers["content-disposition"]

@pytest.mark.asyncio
async def test_import_concessionarias_template(auth_client: AsyncClient):
    resp = await auth_client.get("/api/importacoes/template/concessionarias")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "concessionarias" in resp.headers["content-disposition"]

@pytest.mark.asyncio
async def test_import_invalid_template_param(auth_client: AsyncClient):
    resp = await auth_client.get("/api/importacoes/template/invalido")
    assert resp.status_code == 422
    assert "Input should be" in resp.json()["detail"][0]["msg"]

@pytest.mark.asyncio
async def test_import_no_file(auth_client: AsyncClient):
    resp = await auth_client.post("/api/importacoes/preview?tipo=condominios")
    assert resp.status_code == 422 # FastAPI validation catches missing file

