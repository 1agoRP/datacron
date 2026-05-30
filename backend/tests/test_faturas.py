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


@pytest.mark.asyncio
async def test_fatura_manual_rejects_duplicate_same_account(auth_client: AsyncClient):
    uid = uuid.uuid4().hex[:6]
    c_resp = await auth_client.post("/api/condominios", json={
        "nome": f"Fatura Dup {uid}",
        "numero": f"FD{uid}",
        "endereco": "F",
        "cnpj": "11.222.333/0001-81",
        "sindico": "F"
    })
    assert c_resp.status_code == 201
    condo_id = c_resp.json()["id"]

    r = await auth_client.post("/api/concessionarias", json={
        "condominio_id": condo_id,
        "tipo": "Sabesp",
        "instalacao": f"UC-{uid}",
        "dia_vencimento": 15,
    })
    assert r.status_code == 201
    conc_id = r.json()["id"]

    payload = {
        "condominio_id": condo_id,
        "concessionaria_id": conc_id,
        "valor": "123.45",
        "vencimento": "2026-05-15",
    }
    first = await auth_client.post("/api/faturas/manual", data=payload)
    assert first.status_code == 200

    duplicate = await auth_client.post("/api/faturas/manual", data=payload)
    assert duplicate.status_code == 400
    assert "fatura" in duplicate.json()["detail"].lower()


@pytest.mark.asyncio
async def test_fatura_manual_allows_same_code_for_different_account_type(auth_client: AsyncClient):
    uid = uuid.uuid4().hex[:6]
    c_resp = await auth_client.post("/api/condominios", json={
        "nome": f"Fatura Tipo {uid}",
        "numero": f"FT{uid}",
        "endereco": "F",
        "cnpj": "11.222.333/0001-81",
        "sindico": "F"
    })
    assert c_resp.status_code == 201
    condo_id = c_resp.json()["id"]

    shared_code = f"UC-TIPO-{uid}"
    conc_ids = []
    for tipo in ("Sabesp", "Enel"):
        r = await auth_client.post("/api/concessionarias", json={
            "condominio_id": condo_id,
            "tipo": tipo,
            "instalacao": shared_code,
            "dia_vencimento": 15,
        })
        assert r.status_code == 201
        conc_ids.append(r.json()["id"])

    for conc_id in conc_ids:
        resp = await auth_client.post("/api/faturas/manual", data={
            "condominio_id": condo_id,
            "concessionaria_id": conc_id,
            "valor": "123.45",
            "vencimento": "2026-05-15",
        })
        assert resp.status_code == 200
