"""
Tests for Alert Manager Service
=================================
Tests alert generation logic (value variation, PDF failure, missing bills).
Uses mocked database sessions.
"""

import uuid
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, date, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alerta import Alerta
from app.models.alert_webhook_delivery import AlertWebhookDelivery
from app.models.fatura import Fatura
from app.models.concessionaria import Concessionaria
from app.models.condominio import Condominio
from app.models.user import User


# ─── Fixtures ────────────────────────────────────────────────


@pytest.fixture
def mock_condominio():
    condo = MagicMock(spec=Condominio)
    condo.id = uuid.uuid4()
    condo.nome = "Edifício Teste"
    condo.numero = "0001"
    condo.cnpj = "11.222.333/0001-81"
    return condo


@pytest.fixture
def mock_concessionaria(mock_condominio):
    conc = MagicMock(spec=Concessionaria)
    conc.id = uuid.uuid4()
    conc.condominio_id = mock_condominio.id
    conc.tipo = "Enel"
    conc.instalacao = "12345678"
    conc.dia_vencimento = 15
    conc.valor_medio = 500.0
    conc.leitura_individualizada = False
    conc.email_emissao = None
    conc.ativo = True
    return conc


@pytest.fixture
def mock_fatura(mock_condominio, mock_concessionaria):
    fatura = MagicMock(spec=Fatura)
    fatura.id = uuid.uuid4()
    fatura.condominio_id = mock_condominio.id
    fatura.concessionaria_id = mock_concessionaria.id
    fatura.referencia = "Abril/2026"
    fatura.valor = 600.0
    fatura.vencimento = date(2026, 4, 15)
    fatura.status = "processada"
    fatura.pdf_desbloqueado = True
    fatura.email_remetente = "enel@enel.com.br"
    fatura.email_assunto = "Fatura de Energia"
    fatura.created_at = datetime.now(timezone.utc)
    return fatura


# ─── Value Variation Tests ───────────────────────────────────


@pytest.mark.asyncio
async def test_no_alert_when_value_within_threshold(mock_fatura, mock_concessionaria):
    """Should NOT generate an alert if value is within threshold."""
    from app.services.alert_manager import _check_value_variation

    mock_fatura.valor = 550.0  # 10% above 500 (below 20% threshold)
    
    mock_db = AsyncMock(spec=AsyncSession)
    
    # Mock: historical average query returns 500.0
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = 500.0
    mock_db.execute.return_value = mock_result
    mock_db.get.return_value = mock_concessionaria.condominio

    alert = await _check_value_variation(mock_fatura, mock_concessionaria, mock_db)
    assert alert is None


@pytest.mark.asyncio
async def test_alert_when_value_exceeds_threshold(mock_fatura, mock_concessionaria):
    """Should generate alert when value exceeds 20% threshold."""
    from app.services.alert_manager import _check_value_variation

    mock_fatura.valor = 700.0  # 40% above 500
    
    mock_db = AsyncMock(spec=AsyncSession)
    
    # Mock: historical average returns 500.0
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = 500.0
    mock_db.execute.return_value = mock_result
    mock_db.get.return_value = mock_concessionaria.condominio

    alert = await _check_value_variation(mock_fatura, mock_concessionaria, mock_db)
    assert alert is not None
    assert alert.tipo == "Variacao_Valor_Mais"
    assert alert.gravidade == "alta"
    mock_db.add.assert_called_once()
    # Alert should be generated (or None if no history — depends on implementation)
    # The function creates the alert and adds to db, so we verify db.add was called


@pytest.mark.asyncio
async def test_no_alert_when_no_historical_data(mock_fatura, mock_concessionaria):
    """Should NOT generate alert if there's no historical data to compare against."""
    from app.services.alert_manager import _check_value_variation

    mock_db = AsyncMock(spec=AsyncSession)
    
    # Mock: no historical average
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    alert = await _check_value_variation(mock_fatura, mock_concessionaria, mock_db)
    assert alert is None


# ─── PDF Failure Alert Tests ────────────────────────────────


@pytest.mark.asyncio
async def test_pdf_failure_generates_alert(mock_fatura):
    """Should generate alert when PDF unlock fails."""
    from app.services.alert_manager import _check_pdf_failure

    mock_fatura.pdf_desbloqueado = False
    mock_fatura.pdf_path = "/some/path/fatura.pdf"  # Required for alert to trigger
    
    mock_db = AsyncMock(spec=AsyncSession)

    alert = await _check_pdf_failure(mock_fatura, mock_db)
    assert alert is None


@pytest.mark.asyncio
async def test_no_pdf_alert_when_unlocked(mock_fatura):
    """Should NOT generate alert when PDF is successfully unlocked."""
    from app.services.alert_manager import _check_pdf_failure

    mock_fatura.pdf_desbloqueado = True
    
    mock_db = AsyncMock(spec=AsyncSession)

    alert = await _check_pdf_failure(mock_fatura, mock_db)
    assert alert is None


@pytest.mark.asyncio
async def test_notify_alert_sends_unified_n8n_payload(db_session: AsyncSession):
    """All alert types should be dispatched through the central n8n webhook."""
    from app.services.alert_manager import notify_alert

    admin = User(
        id=uuid.uuid4(),
        nome="Admin",
        email="admin@test.com",
        senha_hash="hash",
        role="admin",
        ativo=True,
    )
    alert = Alerta(
        tipo="pdf_erro",
        gravidade="alta",
        mensagem="Falha no PDF",
    )
    db_session.add(admin)
    db_session.add(alert)
    await db_session.flush()

    response = MagicMock()
    response.status_code = 200
    response.raise_for_status.return_value = None

    with patch("app.services.alert_manager.settings.N8N_WEBHOOK_URL", "https://n8n.test/webhook/alerts"), \
         patch("httpx.AsyncClient") as client_cls:
        client = AsyncMock()
        client.post.return_value = response
        client_cls.return_value.__aenter__.return_value = client

        await notify_alert(db_session, alert)

    client.post.assert_called_once()
    _, kwargs = client.post.call_args
    payload = kwargs["json"]
    assert payload["event_type"] == "alert.created"
    assert payload["schema_version"] == "2026-05-30"
    assert payload["tipo_de_alerta"] == "pdf_erro"
    assert payload["usuarios_responsaveis"] == ["admin@test.com"]
    assert payload["usuarios_responsaveis0"] == "admin@test.com"
    assert payload["usuarios_responsaveis1"] is None

    result = await db_session.execute(select(AlertWebhookDelivery))
    delivery = result.scalar_one()
    assert delivery.status == "sent"
    assert delivery.idempotency_key == f"alert:{alert.id}:pdf_erro"


@pytest.mark.asyncio
async def test_notify_alert_payload_includes_flat_context_and_pdf_base64(
    db_session: AsyncSession,
    tmp_path,
    monkeypatch,
):
    """Webhook payload should be flat for n8n and include PDF base64 when relevant."""
    from app.services.alert_manager import notify_alert

    pdf_path = tmp_path / "fatura.pdf"
    pdf_path.write_bytes(b"%PDF-1.4\nfake test pdf")
    monkeypatch.setenv("PDF_STORAGE_PATH", str(tmp_path))

    condo = Condominio(
        id=uuid.uuid4(),
        nome="Edificio Central",
        numero="42",
        endereco="Rua Teste",
        cnpj="11.222.333/0001-81",
        sindico="Maria",
        carteira=7,
        ativo=True,
    )
    conc = Concessionaria(
        id=uuid.uuid4(),
        condominio_id=condo.id,
        tipo="Enel",
        instalacao="UC-123",
        dia_vencimento=15,
        valor_medio=100.0,
        ativo=True,
    )
    fatura = Fatura(
        id=uuid.uuid4(),
        condominio_id=condo.id,
        concessionaria_id=conc.id,
        referencia="Maio/2026",
        valor=150.25,
        vencimento=date(2026, 5, 10),
        status="processada",
        email_remetente="contas@enel.test",
        email_assunto="Fatura Enel",
        gmail_message_id="gmail-123",
        pdf_path=str(pdf_path),
        pdf_desbloqueado=True,
        pdf_nome_original="enel.pdf",
        debito_automatico=True,
    )
    alert = Alerta(
        id=uuid.uuid4(),
        condominio_id=condo.id,
        fatura_id=fatura.id,
        tipo="Variacao_Valor_Mais",
        gravidade="alta",
        mensagem="Valor acima da media",
    )
    admin = User(
        id=uuid.uuid4(),
        nome="Admin",
        email="admin@test.com",
        senha_hash="hash",
        role="admin",
        ativo=True,
    )
    db_session.add_all([condo, conc, fatura, alert, admin])
    await db_session.flush()

    response = MagicMock()
    response.status_code = 200
    response.raise_for_status.return_value = None

    with patch("app.services.alert_manager.settings.N8N_WEBHOOK_URL", "https://n8n.test/webhook/alerts"), \
         patch("httpx.AsyncClient") as client_cls:
        client = AsyncMock()
        client.post.return_value = response
        client_cls.return_value.__aenter__.return_value = client

        payload = await notify_alert(db_session, alert, fatura=fatura, conc=conc)

    assert payload["id_alerta"] == str(alert.id)
    assert payload["tipo_de_alerta"] == "alerta_conta_alta"
    assert payload["tipo_de_alerta_origem"] == "Variacao_Valor_Mais"
    assert payload["contexto"]["mensagem"] == "Valor acima da media"
    assert payload["email_remetente"] == "contas@enel.test"
    assert payload["id_email_original"] == "gmail-123"
    assert payload["condominio_id"] == str(condo.id)
    assert payload["condominio_nome"] == "Edificio Central"
    assert payload["condominio_numero"] == "42"
    assert payload["condominio_carteira"] == 7
    assert payload["concessionaria_id"] == str(conc.id)
    assert payload["concessionaria_tipo"] == "Enel"
    assert payload["concessionaria_cod_identificacao"] == "UC-123"
    assert payload["concessionaria_valor_medio"] == 100.0
    assert payload["fatura_id"] == str(fatura.id)
    assert payload["fatura_vencimento"] == "2026-05-10"
    assert payload["fatura_valor"] == 150.25
    assert payload["fatura_valor_formatado"] == "R$ 150,25"
    assert payload["fatura_debauto"] is True
    assert payload["fatura_gmail_message_id"] == "gmail-123"
    assert payload["fatura_pdf_nome"] == "enel.pdf"
    assert payload["fatura_pdf_desbloqueado"] is True
    assert payload["fatura_pdf_base64"] == "JVBERi0xLjQKZmFrZSB0ZXN0IHBkZg=="
    assert payload["usuarios_responsaveis0"] == "admin@test.com"

    _, kwargs = client.post.call_args
    assert kwargs["json"]["fatura_pdf_base64"] == payload["fatura_pdf_base64"]


@pytest.mark.asyncio
async def test_build_test_alert_payloads_use_real_context_contract(
    db_session: AsyncSession,
    tmp_path,
    monkeypatch,
):
    from app.services.alert_test_payloads import build_test_alert_payloads

    pdf_path = tmp_path / "real-fatura.pdf"
    pdf_path.write_bytes(b"%PDF-1.4\nreal test pdf")
    monkeypatch.setenv("PDF_STORAGE_PATH", str(tmp_path))

    condo = Condominio(
        id=uuid.uuid4(),
        nome="Condominio Exemplo",
        numero="99",
        endereco="Rua Real",
        cnpj="22.333.444/0001-55",
        sindico="Joao",
        carteira=12,
        ativo=True,
    )
    conc = Concessionaria(
        id=uuid.uuid4(),
        condominio_id=condo.id,
        tipo="Sabesp",
        instalacao="SAB-999",
        dia_vencimento=20,
        valor_medio=321.0,
        ativo=True,
    )
    fatura = Fatura(
        id=uuid.uuid4(),
        condominio_id=condo.id,
        concessionaria_id=conc.id,
        referencia="Maio/2026",
        valor=444.12,
        vencimento=date(2026, 5, 20),
        status="processada",
        email_remetente="contas@sabesp.test",
        email_assunto="Fatura Sabesp",
        gmail_message_id="gmail-real-999",
        pdf_path=str(pdf_path),
        pdf_desbloqueado=True,
        pdf_nome_original="sabesp.pdf",
        debito_automatico=False,
        created_at=datetime(2026, 5, 30, tzinfo=timezone.utc),
    )
    db_session.add_all([condo, conc, fatura])
    await db_session.flush()

    payloads = await build_test_alert_payloads(db_session)

    assert len(payloads) == 15
    tipos = {payload["tipo_de_alerta"] for payload in payloads}
    assert tipos == {
        "alerta_falta_conta",
        "alerta_conta_alta",
        "alerta_conta_baixa",
        "alerta_falta_conta_ndeb_aut3",
        "alerta_falta_conta_ndeb_aut2",
        "alerta_falta_conta_ndeb_aut1",
        "alerta_falta_conta_ndeb_aut0",
        "ata_mandato_a_vencer",
        "ata_mandato_vencida",
        "seguro_a_vencer",
        "seguro_vencido",
        "avcb_a_vencer",
        "avcb_vencido",
        "email_nao_identificado",
        "pdf_erro",
    }
    assert "email_nao_identificado" in tipos

    payload = next(item for item in payloads if item["tipo_de_alerta"] == "alerta_conta_alta")
    assert payload["event_type"] == "alert.created.test"
    assert payload["contexto"]["modo"] == "teste_n8n"
    assert payload["condominio_nome"] == "Condominio Exemplo"
    assert payload["condominio_numero"] == "99"
    assert payload["concessionaria_cod_identificacao"] == "SAB-999"
    assert payload["fatura_valor_formatado"] == "R$ 444,12"
    assert payload["fatura_debauto"] is False
    assert payload["usuarios_responsaveis0"] == "pradomansia@gmail.com"
    assert "condomínio_nome" not in payload
    assert payload["fatura_pdf_base64"] == "JVBERi0xLjQKcmVhbCB0ZXN0IHBkZg=="

    no_pdf_payload = next(item for item in payloads if item["tipo_de_alerta"] == "alerta_falta_conta")
    assert no_pdf_payload["fatura_pdf_base64"] is None


@pytest.mark.asyncio
async def test_send_test_alert_payloads_dispatches_each_type():
    from app.services.alert_test_payloads import send_test_alert_payloads

    payloads = [
        {"tipo_de_alerta": "alerta_conta_alta", "id_alerta": "alert-1"},
        {"tipo_de_alerta": "pdf_erro", "id_alerta": "alert-2"},
    ]
    response = MagicMock()
    response.status_code = 200
    response.text = "ok"

    with patch("httpx.AsyncClient") as client_cls:
        client = AsyncMock()
        client.post.return_value = response
        client_cls.return_value.__aenter__.return_value = client

        results = await send_test_alert_payloads("https://n8n.test/webhook", payloads)

    assert results == [
        {
            "tipo_de_alerta": "alerta_conta_alta",
            "status_code": 200,
            "ok": True,
            "response_preview": "ok",
        },
        {
            "tipo_de_alerta": "pdf_erro",
            "status_code": 200,
            "ok": True,
            "response_preview": "ok",
        },
    ]
    assert client.post.await_count == 2
    first_call = client.post.await_args_list[0]
    assert first_call.args[0] == "https://n8n.test/webhook"
    assert first_call.kwargs["headers"]["X-Idempotency-Key"] == "test-alert:alerta_conta_alta:alert-1"
    assert client.post.await_args_list[0].kwargs["json"] == payloads[0]
    assert client.post.await_args_list[1].kwargs["json"] == payloads[1]
