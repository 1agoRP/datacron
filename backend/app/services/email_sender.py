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

def _html_base(content: str, preheader: str = "") -> str:
    """Wraps content in an enterprise-grade Datacron branded email shell."""
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Datacron</title>
  <!--[if mso]>
  <style type="text/css">
    table {{border-collapse:collapse;}}
    td, th {{font-family:Arial,sans-serif;}}
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    {preheader}
  </span>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03);">
        
        <!-- HEADER -->
        <tr>
          <td style="padding:32px 40px;background-color:#ffffff;border-bottom:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td align="left" style="vertical-align:middle;">
                  <div style="font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;line-height:1;">
                    DATACRON
                  </div>
                  <div style="font-size:11px;color:#64748b;margin-top:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">
                    Plataforma de Gestão
                  </div>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="display:inline-block;background-color:#f1f5f9;border:1px solid #cbd5e1;border-radius:16px;padding:6px 12px;font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.04em;">
                    Aviso do Sistema
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:40px;">
            {content}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background-color:#f8fafc;padding:32px 40px;border-top:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding-bottom:24px;" align="center">
                  <a href="https://app.datacron.com.br" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;text-align:center;">
                    Acessar Plataforma
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                    Este é um e-mail gerado automaticamente pelo sistema Datacron.<br/>
                    Por favor, não responda diretamente a este endereço.
                  </p>
                  <p style="margin:16px 0 0 0;font-size:11px;color:#cbd5e1;">
                    &copy; {datetime.now().year} Datacron Sistemas. Todos os direitos reservados.
                  </p>
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


def _badge(text: str, bg: str, color: str, border: str = "transparent") -> str:
    return f'<span style="display:inline-block;background-color:{bg};color:{color};border:1px solid {border};padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">{text}</span>'


def _info_row(label: str, value: str, is_last: bool = False) -> str:
    border_bottom = "none" if is_last else "1px solid #f1f5f9"
    return f"""
    <tr>
      <td width="35%" style="padding:14px 16px;font-size:13px;color:#64748b;font-weight:500;border-bottom:{border_bottom};vertical-align:top;">
        {label}
      </td>
      <td width="65%" style="padding:14px 16px;font-size:14px;color:#0f172a;font-weight:600;border-bottom:{border_bottom};vertical-align:top;">
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
        "alta":  ("#dc2626", "#fef2f2", "#fca5a5", "Ação Requerida"),
        "media": ("#d97706", "#fffbeb", "#fcd34d", "Atenção"),
        "baixa": ("#16a34a", "#f0fdf4", "#86efac", "Informativo"),
    }
    grav_color, grav_bg, grav_border, grav_label = gravidade_colors.get(gravidade.lower(), ("#475569", "#f8fafc", "#cbd5e1", "Sistema"))

    tipo_legivel = {
        "variacao_valor":       "Variação de Valor Detectada",
        "pdf_erro":             "Falha no Desbloqueio do PDF",
        "conta_nao_recebida":   "Conta Não Recebida",
        "mandato_vencimento":   "Vencimento de Mandato",
        "email_nao_identificado": "E-mail Não Identificado",
    }.get(tipo, tipo.replace("_", " ").title())

    # ── Seção de alerta ──────────────────────────────────────
    alert_section = f"""
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;">
      {tipo_legivel}
    </h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.6;">
      {mensagem}
    </p>
    
    <div style="background-color:{grav_bg};border:1px solid {grav_border};border-radius:6px;padding:20px;margin-bottom:32px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td>
            {_badge(grav_label, "#ffffff", grav_color, grav_border)}
            &nbsp;
            {_badge(condo_nome, "#ffffff", "#334155", "#cbd5e1")}
          </td>
        </tr>
      </table>
    </div>
    """

    # ── Seção dados do e-mail original ──────────────────────
    email_section = ""
    if email_remetente or email_assunto:
        data_fmt = email_data.strftime("%d/%m/%Y às %H:%M") if email_data else "—"
        email_section = f"""
    <div style="margin-bottom:32px;">
      <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">
        Origem do Evento
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;border-collapse:collapse;">
        {_info_row("Remetente", email_remetente or "—")}
        {_info_row("Assunto", email_assunto or "—")}
        {_info_row("Recebido em", data_fmt, is_last=True)}
      </table>
    </div>
    """

    # ── Seção dados da fatura ────────────────────────────────
    fatura_section = ""
    if fatura_referencia or fatura_valor is not None:
        venc_fmt = fatura_vencimento.strftime("%d/%m/%Y") if fatura_vencimento else "—"
        valor_fmt = f"R$ {fatura_valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if fatura_valor is not None else "—"
        fatura_section = f"""
    <div style="margin-bottom:32px;">
      <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">
        Detalhes da Fatura
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;border-collapse:collapse;">
        {_info_row("Referência", fatura_referencia or "—")}
        {_info_row("Valor", valor_fmt)}
        {_info_row("Vencimento", venc_fmt, is_last=True)}
      </table>
    </div>
    """

    content = f"""
    {alert_section}
    {email_section}
    {fatura_section}
    """
    return _html_base(content, preheader=f"Alerta: {tipo_legivel} - {condo_nome}")


def render_not_identified_email(
    sender_name: str,
    original_subject: str,
    original_body: str,
    received_at: Optional[datetime] = None,
) -> str:
    """Renders a highly professional 'not identified' reply."""

    data_fmt = received_at.strftime("%d/%m/%Y às %H:%M") if received_at else "—"
    body_preview = (original_body[:600] + "...") if len(original_body) > 600 else original_body
    body_preview = body_preview.replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")

    content = f"""
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;">
      E-mail Não Identificado
    </h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.6;">
      Recebemos um documento encaminhado para nossa base, porém o sistema não conseguiu vinculá-lo automaticamente a um condomínio ou concessionária ativa.
    </p>

    <div style="background-color:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:20px;margin-bottom:32px;">
      <div style="font-size:14px;font-weight:700;color:#d97706;margin-bottom:8px;">
        Ação Necessária
      </div>
      <div style="font-size:14px;color:#92400e;line-height:1.5;">
        Acesse a Central de Recebimento no painel do Datacron para revisar o anexo e fazer a vinculação manual ou corrigir o cadastro da concessionária correspondente.
      </div>
    </div>

    <div style="margin-bottom:32px;">
      <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">
        Dados da Mensagem Recebida
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;border-collapse:collapse;">
        {_info_row("Remetente", sender_name)}
        {_info_row("Assunto", original_subject)}
        {_info_row("Data de Recebimento", data_fmt, is_last=True)}
      </table>
    </div>

    <div style="margin-bottom:24px;">
      <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">
        Visualização do Conteúdo
      </div>
      <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px 20px;font-size:13px;color:#475569;line-height:1.7;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;max-height:250px;overflow:auto;">
        {body_preview if body_preview.strip() else '<em style="color:#94a3b8;">Corpo de texto vazio.</em>'}
      </div>
    </div>
    """
    return _html_base(content, preheader="E-mail não identificado recebido no Datacron.")


# ─────────────────────────────────────────────────────────────────────────────
# SEND FUNCTION (VIA n8n WEBHOOK)
# ─────────────────────────────────────────────────────────────────────────────

def send_notification_email(
    to: str,
    subject: str,
    message_text: str,
    in_reply_to: Optional[str] = None,
    attachments: Optional[list[tuple[str, bytes]]] = None,
    html_body: Optional[str] = None,
    tipo: str = "alerta"
) -> bool:
    """
    Sends an email by triggering the n8n outbound webhook.
    tipo can be 'alerta', 'transacional', 'leitura'
    """
    import base64
    import httpx
    
    url = "https://n8n-n8n.7vjfup.easypanel.host/webhook/datacron-outbound-email"
    
    payload = {
        "tipo": tipo,
        "destinatario": to,
        "assunto": subject,
        "corpo_html": html_body if html_body else message_text,
    }

    if attachments:
        anexos_list = []
        for filename, data in attachments:
            b64_data = base64.b64encode(data).decode("utf-8")
            mime = "application/pdf"
            if filename.lower().endswith(".png"):
                mime = "image/png"
            elif filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
                mime = "image/jpeg"
                
            anexos_list.append({
                "nome": filename,
                "mime": mime,
                "base64": b64_data
            })
        payload["anexos"] = anexos_list

    try:
        response = httpx.post(url, json=payload, timeout=15.0)
        response.raise_for_status()
        logger.info(f"Successfully triggered n8n email webhook for {to} (Tipo: {tipo})")
        return True
    except Exception as e:
        logger.error(f"Failed to trigger n8n email webhook to {to}: {str(e)}")
        return False
