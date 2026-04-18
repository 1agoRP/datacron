import pytest
from httpx import AsyncClient
from datetime import date, timedelta
import uuid


@pytest.mark.asyncio
async def test_list_contratos_empty(auth_client: AsyncClient):
    resp = await auth_client.get("/api/contratos")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_contratos_stats_empty(auth_client: AsyncClient):
    resp = await auth_client.get("/api/contratos/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["ativos"] == 0
    assert data["a_vencer"] == 0
    assert data["vencidos"] == 0


@pytest.mark.asyncio
async def test_create_contrato(auth_client: AsyncClient):
    # Create condominium first
    uid = uuid.uuid4().hex[:4]
    c_resp = await auth_client.post("/api/condominios", json={
        "nome": f"Condo Contratos {uid}", "numero": f"CT{uid}", "endereco": "R. Teste",
                "cnpj": "11.222.333/0001-81", "sindico": "João"
    })
    assert c_resp.status_code == 201
    condo_id = c_resp.json()["id"]

    today = date.today()
    future = today + timedelta(days=365)

    payload = {
        "condominio_id": condo_id,
        "empresa": "ThyssenKrupp",
        "tipo_contrato": "Manutenção de Elevadores",
        "data_inicio": str(today),
        "data_fim": str(future),
        "valor_inicial": 3500.00,
        "valor_atual": 3500.00,
        "indice_reajuste": "IGPM",
        "periodicidade": "mensal",
    }
    r = await auth_client.post("/api/contratos", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["empresa"] == "ThyssenKrupp"
    assert data["tipo_contrato"] == "Manutenção de Elevadores"
    assert data["status"] == "ativo"
    assert data["condominio_nome"] == f"Condo Contratos {uid}"


@pytest.mark.asyncio
async def test_update_contrato(auth_client: AsyncClient):
    # Setup
    uid = uuid.uuid4().hex[:4]
    c_resp = await auth_client.post("/api/condominios", json={
        "nome": f"Condo Update {uid}", "numero": f"CU{uid}", "endereco": "R. Update",
                "cnpj": "11.222.333/0001-81", "sindico": "Maria"
    })
    condo_id = c_resp.json()["id"]

    today = date.today()
    payload = {
        "condominio_id": condo_id,
        "empresa": "EmpresaX",
        "tipo_contrato": "Limpeza",
        "data_inicio": str(today),
        "valor_inicial": 2000.00,
        "valor_atual": 2000.00,
    }
    r = await auth_client.post("/api/contratos", json=payload)
    contrato_id = r.json()["id"]

    # Update
    upd = await auth_client.put(f"/api/contratos/{contrato_id}", json={
        "valor_atual": 2200.00,
        "empresa": "EmpresaY",
    })
    assert upd.status_code == 200
    assert upd.json()["valor_atual"] == 2200.00
    assert upd.json()["empresa"] == "EmpresaY"


@pytest.mark.asyncio
async def test_delete_contrato(auth_client: AsyncClient):
    uid = uuid.uuid4().hex[:4]
    c_resp = await auth_client.post("/api/condominios", json={
        "nome": f"Condo Delete {uid}", "numero": f"CD{uid}", "endereco": "R. Del",
                "cnpj": "11.222.333/0001-81", "sindico": "Pedro"
    })
    condo_id = c_resp.json()["id"]

    today = date.today()
    payload = {
        "condominio_id": condo_id,
        "empresa": "EmpresaDel",
        "tipo_contrato": "Segurança",
        "data_inicio": str(today),
        "valor_inicial": 1500.00,
        "valor_atual": 1500.00,
    }
    r = await auth_client.post("/api/contratos", json=payload)
    contrato_id = r.json()["id"]

    d_resp = await auth_client.delete(f"/api/contratos/{contrato_id}")
    assert d_resp.status_code == 204


@pytest.mark.asyncio
async def test_contrato_status_a_vencer(auth_client: AsyncClient):
    """A contract ending in 30 days should be marked as 'a_vencer'."""
    uid = uuid.uuid4().hex[:4]
    c_resp = await auth_client.post("/api/condominios", json={
        "nome": f"Condo Vencer {uid}", "numero": f"CV{uid}", "endereco": "R. Vencer",
                "cnpj": "11.222.333/0001-81", "sindico": "Ana"
    })
    condo_id = c_resp.json()["id"]

    today = date.today()
    expiring = today + timedelta(days=30)

    payload = {
        "condominio_id": condo_id,
        "empresa": "EmpresaVencer",
        "tipo_contrato": "Bombas",
        "data_inicio": str(today - timedelta(days=300)),
        "data_fim": str(expiring),
        "valor_inicial": 1000.00,
        "valor_atual": 1000.00,
    }
    r = await auth_client.post("/api/contratos", json=payload)
    assert r.status_code == 201
    assert r.json()["status"] == "a_vencer"


@pytest.mark.asyncio
async def test_contrato_status_vencido(auth_client: AsyncClient):
    """A contract with past end date should be 'vencido'."""
    uid = uuid.uuid4().hex[:4]
    c_resp = await auth_client.post("/api/condominios", json={
        "nome": f"Condo Vencido {uid}", "numero": f"CVE{uid}", "endereco": "R. Vencido",
                "cnpj": "11.222.333/0001-81", "sindico": "Carlos"
    })
    condo_id = c_resp.json()["id"]

    today = date.today()
    payload = {
        "condominio_id": condo_id,
        "empresa": "EmpresaVencida",
        "tipo_contrato": "Portaria",
        "data_inicio": str(today - timedelta(days=400)),
        "data_fim": str(today - timedelta(days=10)),
        "valor_inicial": 5000.00,
        "valor_atual": 5000.00,
    }
    r = await auth_client.post("/api/contratos", json=payload)
    assert r.status_code == 201
    assert r.json()["status"] == "vencido"
