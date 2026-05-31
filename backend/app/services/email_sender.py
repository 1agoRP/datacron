import logging
from datetime import datetime, date
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)
OFFICIAL_OUTBOUND_EMAIL_WEBHOOK_URL = (
    "https://n8n-n8n.7vjfup.easypanel.host/webhook/datacron-outbound-email"
)

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
    fatura_vencimento: Optional[date] = None,
    instalacao: Optional[str] = None,
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
            {f'&nbsp; {_badge(f"UC: {instalacao}", "#ffffff", "#1e40af", "#bfdbfe")}' if instalacao else ''}
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


def render_resolution_email(
    tipo: str,
    mensagem: str,
    condo_nome: Optional[str] = None,
    email_remetente: Optional[str] = None,
    email_assunto: Optional[str] = None,
    instalacao: Optional[str] = None,
) -> str:
    """Renders a structured HTML resolution confirmation email with premium design."""

    tipo_legivel = {
        "variacao_valor":       "Variação de Valor Detectada",
        "pdf_erro":             "Falha no Desbloqueio do PDF",
        "conta_nao_recebida":   "Conta Não Recebida",
        "mandato_vencimento":   "Vencimento de Mandato",
        "email_nao_identificado": "E-mail Não Identificado",
    }.get(tipo, tipo.replace("_", " ").title())

    # Success colors (green)
    succ_color, succ_bg, succ_border, succ_label = ("#16a34a", "#f0fdf4", "#86efac", "RESOLVIDO")

    content = f"""
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background-color: {succ_bg}; padding: 12px 48px; border-radius: 8px; border: 1px solid {succ_border};">
         <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: {succ_color}; text-transform: uppercase; letter-spacing: 0.05em;">
           Resolução Confirmada
         </h2>
      </div>
    </div>

    <p style="margin:0 0 24px 0;font-size:16px;color:#475569;line-height:1.6;">
      O alerta abaixo foi marcado como <strong>resolvido</strong> e arquivado no histórico do sistema.
    </p>

    <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:24px; margin-bottom:32px; border-left: 4px solid {succ_color};">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">
        Tipo do Alerta
      </div>
      <div style="font-size:16px;font-weight:800;color:#1e293b;margin-bottom:4px;text-transform:uppercase;">
        {tipo_legivel}
      </div>
      <div style="font-size:14px;color:#475569;margin-bottom:20px;line-height:1.5;">
        {mensagem}
      </div>

      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td>
             {_badge(succ_label, "#ffffff", succ_color, succ_border)}
          </td>
          <td style="padding-left:8px;">
             {_badge(condo_nome or 'Sistema', "#ffffff", "#334155", "#cbd5e1")}
          </td>
          {f'<td style="padding-left:8px;">{_badge(f"UC: {instalacao}", "#ffffff", "#1e40af", "#bfdbfe")}</td>' if instalacao else ''}
        </tr>
      </table>
    </div>
    """

    if email_remetente or email_assunto:
        content += f"""
    <div style="margin-bottom:32px;">
      <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">
        Origem do Evento
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;border-collapse:collapse;">
        {_info_row("Remetente", email_remetente or "—")}
        {_info_row("Assunto", email_assunto or "—", is_last=True)}
      </table>
    </div>
    """

    return _html_base(content, preheader=f"Resolvido: {tipo_legivel} - {condo_nome or 'Sistema'}")


def render_not_identified_email(
    sender_name: str,
    original_subject: str,
    original_body: str,
    received_at: Optional[datetime] = None,
    codigo_sugerido: str = "N/D",
    tipo_sugerido: str = "Concessionária"
) -> str:
    """Renders a highly professional 'not identified' reply for the sender."""

    data_fmt = received_at.strftime("%d/%m/%Y às %H:%M") if received_at else "—"
    body_preview = (original_body[:600] + "...") if len(original_body) > 600 else original_body
    body_preview = body_preview.replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")

    content = f"""
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;">
      E-mail Não Identificado
    </h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.6;">
      Recebemos um documento encaminhado, porém o sistema não conseguiu vinculá-lo automaticamente a um condomínio ou concessionária ativa.
    </p>

    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin-bottom:32px;">
      <div style="font-size:14px;font-weight:700;color:#991b1b;margin-bottom:8px;">
        Dados Detectados
      </div>
      <div style="font-size:14px;color:#7f1d1d;line-height:1.5;">
        <strong>Concessionária:</strong> {tipo_sugerido}<br/>
        <strong>Código/Instalação:</strong> {codigo_sugerido}
      </div>
      <div style="font-size:13px;color:#991b1b;margin-top:12px;padding-top:12px;border-top:1px solid #fee2e2;">
        <strong>Ação Necessária:</strong> Acesse o portal Datacron para revisar o anexo e fazer a vinculação manual ou corrigir o cadastro da concessionária correspondente.
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


def render_unidentified_sender_email(
    original_subject: str,
    tipo_label: str = "Concessionária",
    codigo_label: str = "Código",
    codigo_valor: str = "N/D"
) -> str:
    """Renders a professional reply to the sender of an unidentified document."""

    content = f"""
    <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:800;color:#1e40af;letter-spacing:-0.02em;">
      {tipo_label} — Identificação não encontrada
    </h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.6;">
      Prezado(a), recebemos o e-mail encaminhado com o assunto <strong>"{original_subject}"</strong>,
      porém o sistema não conseguiu vinculá-lo automaticamente a um condomínio ativo.
    </p>

    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:24px;margin-bottom:32px;">
      <div style="font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">
        Dados Detectados
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td width="40%" style="font-size:14px;color:#7f1d1d;padding:4px 0;"><strong>Concessionária:</strong></td>
          <td width="60%" style="font-size:14px;color:#b91c1c;padding:4px 0;">{tipo_label}</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#7f1d1d;padding:4px 0;"><strong>{codigo_label}:</strong></td>
          <td style="font-size:14px;color:#b91c1c;padding:4px 0;">{codigo_valor}</td>
        </tr>
      </table>

      <div style="font-size:13px;color:#991b1b;line-height:1.5;border-top:1px solid #fee2e2;padding-top:16px;">
        <strong>Ação Necessária:</strong> Verifique se este código está cadastrado corretamente no portal Datacron. Caso contrário, o sistema continuará não reconhecendo os e-mails desta unidade.
      </div>
    </div>

    <p style="font-size:14px;color:#64748b;margin-bottom:0;">
      Uma revisão manual será realizada pela nossa administração para garantir o processamento.
    </p>
    """

    return _html_base(content, preheader=f"Aviso: {tipo_label} não identificada no Datacron.")


# ─────────────────────────────────────────────────────────────────────────────
# SEND FUNCTION (VIA n8n WEBHOOK)
# ─────────────────────────────────────────────────────────────────────────────

async def send_notification_email(
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
    
    url = settings.OUTBOUND_EMAIL_WEBHOOK_URL or OFFICIAL_OUTBOUND_EMAIL_WEBHOOK_URL
    if not url:
        logger.warning("Outbound email webhook is not configured")
        return False
    
    payload = {
        "tipo": tipo,
        "destinatario": to,
        "assunto": subject,
        "remetente_nome": "Datacron Avisos",
        "remetente_email": "avisos@datacron.com.br",
        "corpo_html": html_body if html_body else message_text,
        "in_reply_to": in_reply_to
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
        headers = {}
        if settings.OUTBOUND_EMAIL_WEBHOOK_SECRET:
            headers["X-Webhook-Secret"] = settings.OUTBOUND_EMAIL_WEBHOOK_SECRET

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=15.0)
            response.raise_for_status()
        logger.info(f"Successfully triggered n8n email webhook for {to} (Tipo: {tipo})")
        return True
    except Exception as e:
        logger.error(f"Failed to trigger n8n email webhook to {to}: {str(e)}")
        return False
