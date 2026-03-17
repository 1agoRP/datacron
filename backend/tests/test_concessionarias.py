import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_list_concessionarias_empty(auth_client: AsyncClient):
    resp = await auth_client.get("/api/concessionarias/")
    assert resp.status_code == 200
    assert resp.json() == []

@pytest.mark.asyncio
async def test_create_concessionaria(auth_client: AsyncClient):
    # Condominio required first
    c_resp = await auth_client.post("/api/condominios/", json={
        "nome": "Condo B", "numero": "B01", "endereco": "B", 
        "cnpj": "33.333.333/3333-33", "sindico": "B"
    })
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
        "valor_medio": 200.0
    }
    r = await auth_client.post("/api/concessionarias/", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["tipo"] == "Enel"
    assert data["instalacao"] == "12345"
    assert data["regra_senha"] == "manual"
    assert "senha_manual" not in data # Because it's generally shouldn't be exposed or just not in response model

@pytest.mark.asyncio
async def test_update_concessionaria(auth_client: AsyncClient):
    c_resp = await auth_client.post("/api/condominios/", json={
        "nome": "Condo C", "numero": "C01", "endereco": "C", 
        "cnpj": "44.444.444/4444-44", "sindico": "C"
    })
    condo_id = c_resp.json()["id"]

    payload = {
        "condominio_id": condo_id,
        "tipo": "Sabesp",
        "instalacao": "9999",
        "dia_vencimento": 5,
        "valor_medio": 50.0
    }
    r = await auth_client.post("/api/concessionarias/", json=payload)
    conc_id = r.json()["id"]

    # Update
    upd = await auth_client.put(f"/api/concessionarias/{conc_id}", json={"valor_medio": 60.0, "tipo": "Comgás"})
    assert upd.status_code == 200
    assert upd.json()["valor_medio"] == 60.0
    assert upd.json()["tipo"] == "Comgás"

@pytest.mark.asyncio
async def test_delete_concessionaria(auth_client: AsyncClient):
    c_resp = await auth_client.post("/api/condominios/", json={
        "nome": "Condo D", "numero": "D01", "endereco": "D", 
        "cnpj": "55.555.555/5555-55", "sindico": "D"
    })
    condo_id = c_resp.json()["id"]

    payload = {
        "condominio_id": condo_id,
        "tipo": "Sabesp",
        "instalacao": "8888",
        "dia_vencimento": 15,
    }
    r = await auth_client.post("/api/concessionarias/", json=payload)
    conc_id = r.json()["id"]

    d_resp = await auth_client.delete(f"/api/concessionarias/{conc_id}")
    assert d_resp.status_code == 204
