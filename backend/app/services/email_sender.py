import logging
import smtplib
from email.message import EmailMessage
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

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
            # Ensure Message-ID is wrapped in brackets
            ref_id = f"<{in_reply_to.strip('<>')}>"
            msg["In-Reply-To"] = ref_id
            msg["References"] = ref_id
            # Also common to prefix subject with Re: if missing
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
