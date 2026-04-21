import logging
import smtplib
from datetime import datetime
from email.message import EmailMessage
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# HTML TEMPLATES
# ─────────────────────────────────────────────────────────────────────────────

def _html_base(content: str) -> str:
    """Wraps content in the Datacron branded email shell."""
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Datacron</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                    📊 Datacron
                  </div>
                  <div style="font-size:12px;color:#bfdbfe;margin-top:4px;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;">
                    Sistema de Gestão de Concessionárias
                  </div>
                </td>
                <td align="right">
                  <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 14px;font-size:11px;color:#e0f2fe;font-weight:600;">
                    Notificação Automática
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:32px;">
            {content}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:11px;color:#94a3b8;">
                    Esta é uma mensagem automática gerada pelo sistema Datacron.<br/>
                    Não responda diretamente a este e-mail.
                  </div>
                </td>
                <td align="right">
                  <a href="https://www.datacron.com.br/dashboard"
                     style="background:#2563eb;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;padding:8px 16px;border-radius:6px;display:inline-block;">
                    Acessar Painel →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _badge(text: str, color: str, bg: str) -> str:
    return f'<span style="background:{bg};color:{color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">{text}</span>'


def _info_row(label: str, value: str) -> str:
    return f"""
    <tr>
      <td style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;width:140px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">
        {label}
      </td>
      <td style="padding:8px 12px;font-size:13px;color:#0f172a;font-weight:500;border-bottom:1px solid #f1f5f9;">
        {value or '—'}
      </td>
    </tr>"""


def render_alert_email(
    tipo: str,
    gravidade: str,
    mensagem: str,
    condo_nome: str,
    email_remetente: Optional[str] = None,
    email_assunto: Optional[str] = None,
    email_data: Optional[datetime] = None,
    fatura_referencia: Optional[str] = None,
    fatura_valor: Optional[float] = None,
    fatura_vencimento=None,
) -> str:
    """Renders a structured HTML alert notification email."""

    gravidade_colors = {
        "alta":  ("#991b1b", "#fef2f2", "🔴"),
        "media": ("#92400e", "#fffbeb", "🟡"),
        "baixa": ("#14532d", "#f0fdf4", "🟢"),
    }
    grav_color, grav_bg, grav_icon = gravidade_colors.get(gravidade, ("#334155", "#f8fafc", "⚪"))

    tipo_legivel = {
        "variacao_valor":       "Variação de Valor Detectada",
        "pdf_erro":             "Falha no Desbloqueio do PDF",
        "conta_nao_recebida":   "Conta Não Recebida",
        "mandato_vencimento":   "Vencimento de Mandato",
        "email_nao_identificado": "E-mail Não Identificado",
    }.get(tipo, tipo.replace("_", " ").title())

    # ── Seção de alerta ──────────────────────────────────────
    alert_section = f"""
    <div style="background:{grav_bg};border-left:4px solid {grav_color};border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:18px;font-weight:800;color:{grav_color};margin-bottom:8px;">
        {grav_icon} {tipo_legivel}
      </div>
      <div style="font-size:14px;color:#334155;line-height:1.6;">
        {mensagem}
      </div>
      <div style="margin-top:12px;">
        {_badge(gravidade.upper(), grav_color, grav_bg)}
        &nbsp;
        {_badge('CONDOMÍNIO: ' + condo_nome.upper(), '#1e40af', '#eff6ff')}
      </div>
    </div>
    """

    # ── Seção dados do e-mail original ──────────────────────
    email_section = ""
    if email_remetente or email_assunto:
        data_fmt = email_data.strftime("%d/%m/%Y às %H:%M") if email_data else "—"
        email_section = f"""
    <div style="margin-bottom:24px;">
      <div style="font-size:13px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
        📧 Dados do E-mail Original
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
        {_info_row("Remetente", email_remetente or "—")}
        {_info_row("Assunto", email_assunto or "—")}
        {_info_row("Recebido em", data_fmt)}
      </table>
    </div>
    """

    # ── Seção dados da fatura ────────────────────────────────
    fatura_section = ""
    if fatura_referencia or fatura_valor is not None:
        venc_fmt = fatura_vencimento.strftime("%d/%m/%Y") if fatura_vencimento else "—"
        valor_fmt = f"R$ {fatura_valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if fatura_valor is not None else "—"
        fatura_section = f"""
    <div style="margin-bottom:24px;">
      <div style="font-size:13px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">
        📄 Dados da Fatura Relacionada
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;overflow:hidden;">
        {_info_row("Referência", fatura_referencia or "—")}
        {_info_row("Valor", valor_fmt)}
        {_info_row("Vencimento", venc_fmt)}
      </table>
    </div>
    """

    content = f"""
    <h2 style="margin:0 0 20px 0;font-size:20px;font-weight:800;color:#0f172a;">
      🔔 Alerta do Sistema
    </h2>
    {alert_section}
    {email_section}
    {fatura_section}
    <div style="background:#f8fafc;border-radius:8px;padding:14px 18px;font-size:12px;color:#64748b;text-align:center;border:1px solid #e2e8f0;">
      Acesse o painel administrativo do Datacron para mais detalhes e ações disponíveis.
    </div>
    """
    return _html_base(content)


def render_not_identified_email(
    sender_name: str,
    original_subject: str,
    original_body: str,
    received_at: Optional[datetime] = None,
) -> str:
    """Renders a friendly 'not identified' reply to the user who forwarded an unknown email."""

    data_fmt = received_at.strftime("%d/%m/%Y às %H:%M") if received_at else "—"
    body_preview = (original_body[:600] + "...") if len(original_body) > 600 else original_body
    body_preview = body_preview.replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")

    content = f"""
    <h2 style="margin:0 0 20px 0;font-size:20px;font-weight:800;color:#0f172a;">
      ⚠️ E-mail Não Identificado
    </h2>

    <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:15px;font-weight:700;color:#92400e;margin-bottom:8px;">
        Não foi possível identificar o condomínio
      </div>
      <div style="font-size:13px;color:#78350f;line-height:1.6;">
        Olá, recebemos o e-mail que você encaminhou para o Datacron, mas o sistema 
        <strong>não conseguiu identificar automaticamente</strong> a qual condomínio ou 
        concessionária ele pertence.<br/><br/>
        Por favor, verifique se o número de instalação / código UC está correto e cadastrado 
        no sistema, ou vincule manualmente a fatura pelo painel administrativo.
      </div>
    </div>

    <div style="margin-bottom:24px;">
      <div style="font-size:13px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">
        📧 Dados do E-mail Encaminhado
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
        {_info_row("Enviado por", sender_name)}
        {_info_row("Assunto original", original_subject)}
        {_info_row("Recebido em", data_fmt)}
      </table>
    </div>

    <div style="margin-bottom:24px;">
      <div style="font-size:13px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">
        📋 Conteúdo do E-mail Original
      </div>
      <div style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:16px 20px;font-size:12px;color:#334155;line-height:1.7;font-family:monospace;max-height:300px;overflow:auto;">
        {body_preview if body_preview.strip() else '<em style="color:#94a3b8;">Conteúdo de texto não disponível.</em>'}
      </div>
    </div>

    <div style="background:#eff6ff;border-radius:8px;padding:14px 18px;font-size:12px;color:#1e40af;border:1px solid #bfdbfe;">
      💡 <strong>O que fazer agora?</strong> Acesse o painel do Datacron → Central de Recebimento 
      e verifique os registros aguardando vinculação manual.
    </div>
    """
    return _html_base(content)


# ─────────────────────────────────────────────────────────────────────────────
# SEND FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

def send_notification_email(
    to: str,
    subject: str,
    message_text: str,
    in_reply_to: Optional[str] = None,
    attachments: Optional[list[tuple[str, bytes]]] = None,
    html_body: Optional[str] = None
) -> bool:
    """Sends an email using Gmail SMTP, optionally as a reply to a Message-ID."""
    if not settings.GMAIL_USER or not settings.GMAIL_PASSWORD:
        logger.error("Credenciais do Gmail não configuradas para enviar e-mail.")
        return False
    try:
        msg = EmailMessage()
        msg.set_content(message_text)
        if html_body:
            msg.add_alternative(html_body, subtype='html')

        msg["To"] = to
        msg["From"] = settings.GMAIL_USER
        msg["Subject"] = subject

        if in_reply_to:
            ref_id = f"<{in_reply_to.strip('<>')}>"
            msg["In-Reply-To"] = ref_id
            msg["References"] = ref_id
            if not subject.lower().startswith("re:"):
                msg["Subject"] = f"Re: {subject}"

        if attachments:
            for filename, data in attachments:
                msg.add_attachment(
                    data,
                    maintype='application',
                    subtype='pdf',
                    filename=filename
                )

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.GMAIL_USER, settings.GMAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {str(e)}")
        return False
