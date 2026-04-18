import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_faturas_export(auth_client: AsyncClient):
    # Create condo and concessionaria
    uid = uuid.uuid4().hex[:4]
    c_resp = await auth_client.post("/api/condominios", json={
        "nome": f"Fatura C {uid}", "numero": f"F{uid}", "endereco": "F", 
        "cnpj": "11.222.333/0001-81", "sindico": "F"
    })
    assert c_resp.status_code == 201
    condo_id = c_resp.json()["id"]

    r = await auth_client.post("/api/concessionarias", json={
        "condominio_id": condo_id,
        "tipo": "Sabesp",
        "instalacao": "8888",
        "dia_vencimento": 15,
    })
    assert r.status_code == 201
    conc_id = r.json()["id"]

    # Just testing the export endpoint doesn't crash
    resp = await auth_client.get("/api/faturas/exportar?formato=csv")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]

    resp = await auth_client.get("/api/faturas/exportar?formato=excel")
    assert resp.status_code == 200
    assert "spreadsheetml" in resp.headers["content-type"]
