"""
Tests for PDF Processing Service
=================================
Tests unlock, extraction, and parsing logic without I/O dependencies.
"""

import io
import pytest
from unittest.mock import patch, MagicMock

from app.services.pdf_processor import (
    test_pdf_password as check_pdf_password,
    unlock_pdf,
    extract_data,
    save_pdf,
    _parse_fields,
    _run_ocr,
)


# ─── Fixtures ────────────────────────────────────────────────


@pytest.fixture
def simple_pdf_bytes():
    """Creates a minimal valid PDF in memory."""
    try:
        import pikepdf
        pdf = pikepdf.Pdf.new()
        pdf.add_blank_page(page_size=(612, 792))
        buf = io.BytesIO()
        pdf.save(buf)
        buf.seek(0)
        return buf.read()
    except Exception:
        pytest.skip("pikepdf not available for creating test PDFs")


@pytest.fixture
def encrypted_pdf_bytes():
    """Creates a password-encrypted PDF in memory."""
    try:
        import pikepdf
        pdf = pikepdf.Pdf.new()
        pdf.add_blank_page(page_size=(612, 792))
        buf = io.BytesIO()
        pdf.save(buf, encryption=pikepdf.Encryption(owner="owner123", user="user123"))
        buf.seek(0)
        return buf.read()
    except Exception:
        pytest.skip("pikepdf not available for creating encrypted test PDFs")


# ─── test_pdf_password ───────────────────────────────────────


def test_pdf_password_correct(encrypted_pdf_bytes):
    """Correct password should return True."""
    assert check_pdf_password(encrypted_pdf_bytes, "user123") is True


def test_pdf_password_wrong(encrypted_pdf_bytes):
    """Wrong password should return False."""
    assert check_pdf_password(encrypted_pdf_bytes, "wrongpassword") is False


def test_pdf_password_invalid_bytes():
    """Invalid PDF bytes should return False, not crash."""
    assert check_pdf_password(b"not a pdf", "anything") is False


# ─── unlock_pdf ──────────────────────────────────────────────


def test_unlock_correct_password(encrypted_pdf_bytes):
    """Unlocking with correct password should return decrypted bytes."""
    result = unlock_pdf(encrypted_pdf_bytes, "user123")
    assert result is not None
    assert len(result) > 0
    # The result should be a valid unencrypted PDF
    assert result[:5] == b"%PDF-"


def test_unlock_wrong_password(encrypted_pdf_bytes):
    """Unlocking with wrong password should return None."""
    result = unlock_pdf(encrypted_pdf_bytes, "wrongpassword")
    assert result is None


def test_unlock_unencrypted_pdf(simple_pdf_bytes):
    """Unlocking an unencrypted PDF with empty password should work."""
    result = unlock_pdf(simple_pdf_bytes, "")
    assert result is not None


# ─── _parse_fields ───────────────────────────────────────────


class TestParseFields:
    """Tests for the regex extraction engine."""

    def test_parse_valor_standard(self):
        result = {"valor": None, "vencimento": None, "codigo_barras": None,
                  "consumo_kwh": None, "referencia": None, "numero_instalacao": None,
                  "debito_automatico": False}
        _parse_fields("VALOR TOTAL R$ 1.234,56", result)
        assert result["valor"] == 1234.56

    def test_parse_vencimento(self):
        result = {"valor": None, "vencimento": None, "codigo_barras": None,
                  "consumo_kwh": None, "referencia": None, "numero_instalacao": None,
                  "debito_automatico": False}
        _parse_fields("VENCIMENTO: 15/03/2026", result)
        assert result["vencimento"] == "2026-03-15"

    def test_parse_referencia_month_name(self):
        result = {"valor": None, "vencimento": None, "codigo_barras": None,
                  "consumo_kwh": None, "referencia": None, "numero_instalacao": None,
                  "debito_automatico": False}
        _parse_fields("Referência: MARÇO/2026", result)
        assert result["referencia"] is not None
        assert "2026" in result["referencia"]

    def test_parse_consumo_kwh(self):
        result = {"valor": None, "vencimento": None, "codigo_barras": None,
                  "consumo_kwh": None, "referencia": None, "numero_instalacao": None,
                  "debito_automatico": False}
        _parse_fields("Consumo no mês: 450 kWh", result)
        assert result["consumo_kwh"] == 450.0

    def test_parse_numero_instalacao(self):
        result = {"valor": None, "vencimento": None, "codigo_barras": None,
                  "consumo_kwh": None, "referencia": None, "numero_instalacao": None,
                  "debito_automatico": False}
        _parse_fields("INSTALAÇÃO: 12345678", result)
        assert result["numero_instalacao"] == "12345678"

    def test_parse_debito_automatico_active(self):
        result = {"valor": None, "vencimento": None, "codigo_barras": None,
                  "consumo_kwh": None, "referencia": None, "numero_instalacao": None,
                  "debito_automatico": False}
        _parse_fields("DÉBITO AUTOMÁTICO - CONSIDERAR ESTA FATURA QUITADA", result)
        assert result["debito_automatico"] is True

    def test_parse_debito_automatico_invitation(self):
        """An invitation to join auto-debit should NOT flag as active."""
        result = {"valor": None, "vencimento": None, "codigo_barras": None,
                  "consumo_kwh": None, "referencia": None, "numero_instalacao": None,
                  "debito_automatico": False}
        _parse_fields("DÉBITO AUTOMÁTICO - CADASTRE-SE", result)
        assert result["debito_automatico"] is False

    def test_parse_empty_text_returns_no_fields(self):
        """Empty text should not crash and should leave all fields at defaults."""
        result = {"valor": None, "vencimento": None, "codigo_barras": None,
                  "consumo_kwh": None, "referencia": None, "numero_instalacao": None,
                  "debito_automatico": False}
        _parse_fields("", result)
        assert result["valor"] is None
        assert result["vencimento"] is None


# ─── save_pdf ────────────────────────────────────────────────


def test_save_pdf(simple_pdf_bytes, tmp_path):
    """save_pdf should write the file and return a valid path."""
    with patch("app.services.pdf_processor.settings") as mock_settings:
        mock_settings.PDF_STORAGE_PATH = str(tmp_path)
        path = save_pdf(simple_pdf_bytes, "test_output.pdf")
        assert path.endswith("test_output.pdf")
        assert (tmp_path / "test_output.pdf").exists()
        assert (tmp_path / "test_output.pdf").read_bytes() == simple_pdf_bytes
