import pytest
from httpx import AsyncClient
import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alerta import Alerta
from app.models.concessionaria import Concessionaria
from app.models.condominio import Condominio
from app.models.fatura import Fatura
from app.models.user import User

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


@pytest.mark.asyncio
async def test_fatura_manual_generates_value_variation_alert(
    auth_client: AsyncClient,
    db_session: AsyncSession,
):
    uid = uuid.uuid4().hex[:6]
    condo = Condominio(
        id=uuid.uuid4(),
        nome=f"Fatura Variacao {uid}",
        numero=f"FV{uid}",
        endereco="F",
        cnpj=f"11.222.{uid[:3]}/0001-81",
        sindico="F",
        ativo=True,
    )
    conc = Concessionaria(
        id=uuid.uuid4(),
        condominio_id=condo.id,
        tipo="Sabesp",
        instalacao=f"UC-VAR-{uid}",
        dia_vencimento=15,
        ativo=True,
    )
    historica = Fatura(
        id=uuid.uuid4(),
        condominio_id=condo.id,
        concessionaria_id=conc.id,
        valor=100.0,
        vencimento=date(2026, 4, 15),
        referencia="Abril/2026",
        status="processada",
    )
    gerente = User(
        id=uuid.uuid4(),
        nome="Gerente",
        email="gerente.manual@test.com",
        senha_hash="hash",
        role="gerencia",
        ativo=True,
        codigo_condominio=condo.numero,
    )
    assistente = User(
        id=uuid.uuid4(),
        nome="Assistente",
        email="assistente.manual@test.com",
        senha_hash="hash",
        role="assistente",
        ativo=True,
        codigo_condominio=condo.numero,
    )
    db_session.add_all([condo, conc, historica, gerente, assistente])
    await db_session.commit()

    response = MagicMock()
    response.status_code = 200
    response.raise_for_status.return_value = None

    with patch("app.services.alert_manager.settings.OUTBOUND_EMAIL_WEBHOOK_URL", "https://n8n.test/webhook/alerts"), \
         patch("httpx.AsyncClient") as client_cls:
        client = AsyncMock()
        client.post.return_value = response
        client_cls.return_value.__aenter__.return_value = client

        resp = await auth_client.post("/api/faturas/manual", data={
            "condominio_id": str(condo.id),
            "concessionaria_id": str(conc.id),
            "valor": "120.00",
            "vencimento": "2026-05-15",
        })

    assert resp.status_code == 200

    alert = (
        await db_session.execute(
            select(Alerta).where(
                Alerta.condominio_id == condo.id,
                Alerta.tipo == "Variacao_Valor_Mais",
            )
        )
    ).scalar_one()
    assert alert.fatura_id == uuid.UUID(resp.json()["id"])

    _, kwargs = client.post.call_args
    assert kwargs["json"]["tipo_de_alerta"] == "alerta_conta_alta"
    assert kwargs["json"]["usuarios_responsaveis"] == [
        "assistente.manual@test.com",
        "gerente.manual@test.com",
    ]
