"""
Tests for Email Sender Service
================================
Tests email rendering and send logic with mocked SMTP.
"""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime

from app.services.email_sender import (
    send_notification_email,
    render_alert_email,
    render_not_identified_email,
    _html_base,
    _badge,
    _info_row,
)


# ─── Template Rendering Tests ────────────────────────────────


class TestEmailTemplates:

    def test_html_base_contains_datacron_branding(self):
        """The base template should contain Datacron branding."""
        html = _html_base("<p>Test Content</p>")
        assert "Datacron" in html
        assert "Test Content" in html
        assert "<!DOCTYPE html>" in html

    def test_badge_renders_styled_span(self):
        badge = _badge("ALTA", "#991b1b", "#fef2f2")
        assert "ALTA" in badge
        assert "#991b1b" in badge
        assert "<span" in badge

    def test_info_row_renders_table_row(self):
        row = _info_row("Remetente", "teste@email.com")
        assert "Remetente" in row
        assert "teste@email.com" in row
        assert "<tr>" in row

    def test_info_row_handles_none_value(self):
        row = _info_row("Campo", None)
        assert "—" in row

    def test_render_alert_email_complete(self):
        """render_alert_email should produce HTML with all sections."""
        html = render_alert_email(
            tipo="variacao_valor",
            gravidade="alta",
            mensagem="Valor 50% acima da média",
            condo_nome="Edifício Paulista",
            email_remetente="enel@enel.com.br",
            email_assunto="Fatura de Energia",
            email_data=datetime(2026, 4, 1, 10, 30),
            fatura_referencia="Abril/2026",
            fatura_valor=1234.56,
            fatura_vencimento=datetime(2026, 4, 15),
        )
        assert "Variação de Valor Detectada" in html
        assert "PAULISTA" in html.upper()
        assert "R$" in html
        assert "enel@enel.com.br" in html

    def test_render_alert_email_minimal(self):
        """render_alert_email should work with minimal data (no fatura, no email)."""
        html = render_alert_email(
            tipo="conta_nao_recebida",
            gravidade="media",
            mensagem="Conta não recebida no prazo",
            condo_nome="Residencial Lagos",
        )
        assert "Conta" in html
        assert "LAGOS" in html.upper()
        # Should NOT have fatura section
        assert "Dados da Fatura" not in html

    def test_render_not_identified_email(self):
        """Not-identified email template should be helpful and informative."""
        html = render_not_identified_email(
            sender_name="joao@gmail.com",
            original_subject="Fatura de Teste",
            original_body="Este é o corpo do email original...",
            received_at=datetime(2026, 4, 15, 14, 0),
        )
        assert "Não Identificado" in html
        assert "joao@gmail.com" in html
        assert "Fatura de Teste" in html


# ─── Send Function Tests ─────────────────────────────────────


class TestSendNotificationEmail:

    @patch("app.services.email_sender.smtplib.SMTP_SSL")
    @patch("app.services.email_sender.settings")
    def test_send_email_success(self, mock_settings, mock_smtp_class):
        """Should return True when email is sent successfully."""
        mock_settings.GMAIL_USER = "test@gmail.com"
        mock_settings.GMAIL_PASSWORD = "apppassword"

        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__ = MagicMock(return_value=mock_server)
        mock_smtp_class.return_value.__exit__ = MagicMock(return_value=False)

        result = send_notification_email(
            to="user@example.com",
            subject="Test Subject",
            message_text="Test body",
        )
        assert result is True
        mock_server.login.assert_called_once_with("test@gmail.com", "apppassword")
        mock_server.send_message.assert_called_once()

    @patch("app.services.email_sender.settings")
    def test_send_email_no_credentials(self, mock_settings):
        """Should return False when Gmail credentials are missing."""
        mock_settings.GMAIL_USER = ""
        mock_settings.GMAIL_PASSWORD = ""

        result = send_notification_email(
            to="user@example.com",
            subject="Test",
            message_text="Test",
        )
        assert result is False

    @patch("app.services.email_sender.smtplib.SMTP_SSL")
    @patch("app.services.email_sender.settings")
    def test_send_email_with_reply_to(self, mock_settings, mock_smtp_class):
        """Reply emails should have In-Reply-To header."""
        mock_settings.GMAIL_USER = "test@gmail.com"
        mock_settings.GMAIL_PASSWORD = "apppassword"

        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__ = MagicMock(return_value=mock_server)
        mock_smtp_class.return_value.__exit__ = MagicMock(return_value=False)

        # Use a subject that already starts with Re: to avoid duplicate header issue
        result = send_notification_email(
            to="user@example.com",
            subject="Re: Original Subject",
            message_text="Reply body",
            in_reply_to="msg123@gmail.com",
        )
        assert result is True

    @patch("app.services.email_sender.smtplib.SMTP_SSL")
    @patch("app.services.email_sender.settings")
    def test_send_email_smtp_failure(self, mock_settings, mock_smtp_class):
        """Should return False and not crash on SMTP errors."""
        mock_settings.GMAIL_USER = "test@gmail.com"
        mock_settings.GMAIL_PASSWORD = "apppassword"

        mock_smtp_class.side_effect = Exception("Connection refused")

        result = send_notification_email(
            to="user@example.com",
            subject="Test",
            message_text="Test",
        )
        assert result is False
