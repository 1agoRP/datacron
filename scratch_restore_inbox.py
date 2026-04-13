import os
import sys
import logging
import imaplib
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("restore_inbox")

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")

def restore_to_inbox():
    if not GMAIL_USER or not GMAIL_PASSWORD:
        logger.error("Credenciais do Gmail não encontradas.")
        return

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(GMAIL_USER, GMAIL_PASSWORD)
        logger.info("Conectado ao Gmail.")
    except Exception as e:
        logger.error(f"Falha na conexão IMAP: {e}")
        return

    try:
        # Get all labels
        status, labels = mail.list()
        if status != "OK":
            logger.error("Falha ao listar labels.")
            return

        for label_data in labels:
            label_info = label_data.decode('utf-8', errors='ignore')
            # Extrair o nome da label
            parts = label_info.split(' "/" ')
            if len(parts) == 2:
                label_name = parts[1].strip().strip('"')
            else:
                label_name = label_info.split()[-1].strip().strip('"')

            if label_name.startswith("Datacron"):
                logger.info(f"Processando pasta: {label_name}")
                
                # Select the label, needs quotes around the name in case of spaces
                status, _ = mail.select(f'"{label_name}"')
                if status != "OK":
                    continue
                
                status, messages = mail.search(None, "ALL")
                if status == "OK" and messages[0]:
                    msg_ids = messages[0].split()
                    logger.info(f"  Encontrados {len(msg_ids)} emails. Movendo para INBOX...")
                    
                    for m_id in msg_ids:
                        mail.copy(m_id, '"INBOX"')
                        mail.store(m_id, '+FLAGS', '\\Deleted')
                    
                    mail.expunge()
                
                # Opcional: deletar a label customizada para limpar
                # if label_name != "Datacron/E-mails nao identificados":
                #    mail.delete(f'"{label_name}"')

    except Exception as e:
        logger.error(f"Erro durante o restauro: {e}")
    finally:
        try:
            # We want to be sure to logout cleanly
            mail.logout()
        except:
            pass

    logger.info("Restauração para a Caixa de Entrada concluída!")

if __name__ == "__main__":
    restore_to_inbox()
