import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_list_condominios_empty(auth_client: AsyncClient):
    """Test listing condominios when database is empty."""
    resp = await auth_client.get("/api/condominios/")
    assert resp.status_code == 200
    assert resp.json() == []

@pytest.mark.asyncio
async def test_create_condominio(auth_client: AsyncClient):
    """Test creating a valid condominio."""
    payload = {
        "nome": "Condomínio Teste",
        "numero": "0001",
        "endereco": "Av. Paulista, 100",
        "cnpj": "12.345.678/0001-90",
        "sindico": "Iago Prado",
        "cpf_sindico": "123.456.789-00"
    }
    resp = await auth_client.post("/api/condominios/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["nome"] == "Condomínio Teste"
    assert data["numero"] == "0001"
    assert "id" in data

@pytest.mark.asyncio
async def test_create_condominio_invalid_cnpj(auth_client: AsyncClient):
    """Test creating a condominio with an invalid CNPJ length."""
    payload = {
        "nome": "Condomínio Inválido",
        "numero": "0002",
        "endereco": "Rua Torta, 0",
        "cnpj": "123", # Invalid
        "sindico": "João"
    }
    resp = await auth_client.post("/api/condominios/", json=payload)
    assert resp.status_code == 422
    assert "CNPJ deve ter 14" in str(resp.json())

@pytest.mark.asyncio
async def test_update_condominio(auth_client: AsyncClient):
    """Test updating an existing condominio."""
    # Create
    payload = {
        "nome": "Condomínio A",
        "numero": "A01",
        "endereco": "Rua A",
        "cnpj": "11.111.111/1111-11",
        "sindico": "A"
    }
    resp_create = await auth_client.post("/api/condominios/", json=payload)
    item_id = resp_create.json()["id"]

    # Update
    update_payload = {"nome": "Condomínio A Atualizado", "sindico": "B"}
    resp_update = await auth_client.put(f"/api/condominios/{item_id}", json=update_payload)
    assert resp_update.status_code == 200
    assert resp_update.json()["nome"] == "Condomínio A Atualizado"
    assert resp_update.json()["sindico"] == "B"

@pytest.mark.asyncio
async def test_delete_condominio(auth_client: AsyncClient):
    """Test soft-deleting a condominio."""
    # Create
    payload = {
        "nome": "Para Apagar",
        "numero": "DEL",
        "endereco": "Del",
        "cnpj": "22.222.222/2222-22",
        "sindico": "Del"
    }
    resp_create = await auth_client.post("/api/condominios/", json=payload)
    item_id = resp_create.json()["id"]

    # Delete
    resp_delete = await auth_client.delete(f"/api/condominios/{item_id}")
    assert resp_delete.status_code == 204

    # Fetch (it should have ativo=False, so list_condominios shouldn't return it by default)
    resp_list = await auth_client.get("/api/condominios/")
    ids = [c["id"] for c in resp_list.json()]
    assert item_id not in ids
