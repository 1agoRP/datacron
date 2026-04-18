import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_list_concessionarias_empty(auth_client: AsyncClient):
    resp = await auth_client.get("/api/concessionarias")
    assert resp.status_code == 200
    assert resp.json() == []

@pytest.mark.asyncio
async def test_create_concessionaria(auth_client: AsyncClient):
    # Condominio required first
    uid = uuid.uuid4().hex[:4]
    c_resp = await auth_client.post("/api/condominios", json={
        "nome": f"Condo B {uid}", "numero": f"B{uid}", "endereco": "B", 
        "cnpj": "11.222.333/0001-81", "sindico": "B"
    })
    assert c_resp.status_code == 201
    condo_id = c_resp.json()["id"]

    # Now concessionaria
    payload = {
        "condominio_id": condo_id,
        "tipo": "Enel",
        "instalacao": "12345",
        "email_esperado": "fatura@enel.com",
        "regra_senha": "manual",
        "senha_manual": "mysenha",
        "dia_vencimento": 10,
        "valor_medio": 200.0,
        "debito_automatico": True,
        "leitura_individualizada": False
    }
    r = await auth_client.post("/api/concessionarias", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["tipo"] == "Enel"
    assert data["instalacao"] == "12345"
    assert data["regra_senha"] == "manual"

@pytest.mark.asyncio
async def test_update_concessionaria(auth_client: AsyncClient):
    uid = uuid.uuid4().hex[:4]
    c_resp = await auth_client.post("/api/condominios", json={
        "nome": f"Condo C {uid}", "numero": f"C{uid}", "endereco": "C", 
        "cnpj": "11.222.333/0001-81", "sindico": "C"
    })
    assert c_resp.status_code == 201
    condo_id = c_resp.json()["id"]

    payload = {
        "condominio_id": condo_id,
        "tipo": "Sabesp",
        "instalacao": "9999",
        "dia_vencimento": 5,
        "valor_medio": 50.0,
        "debito_automatico": True,
        "leitura_individualizada": False
    }
    r = await auth_client.post("/api/concessionarias", json=payload)
    if r.status_code != 201:
        print(f"DEBUG: {r.json()}")
    assert r.status_code == 201
    conc_id = r.json()["id"]

    # Update
    upd = await auth_client.put(f"/api/concessionarias/{conc_id}", json={"valor_medio": 60.0, "tipo": "Comgás"})
    assert upd.status_code == 200
    assert upd.json()["valor_medio"] == 60.0
    assert upd.json()["tipo"] == "Comgás"

@pytest.mark.asyncio
async def test_delete_concessionaria(auth_client: AsyncClient):
    uid = uuid.uuid4().hex[:4]
    c_resp = await auth_client.post("/api/condominios", json={
        "nome": f"Condo D {uid}", "numero": f"D{uid}", "endereco": "D", 
        "cnpj": "11.222.333/0001-81", "sindico": "D"
    })
    assert c_resp.status_code == 201
    condo_id = c_resp.json()["id"]

    payload = {
        "condominio_id": condo_id,
        "tipo": "Sabesp",
        "instalacao": "8888",
        "dia_vencimento": 15,
        "debito_automatico": True,
        "leitura_individualizada": False
    }
    r = await auth_client.post("/api/concessionarias", json=payload)
    assert r.status_code == 201
    conc_id = r.json()["id"]

    d_resp = await auth_client.delete(f"/api/concessionarias/{conc_id}")
    assert d_resp.status_code == 204
