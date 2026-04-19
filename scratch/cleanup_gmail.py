import imaplib
import logging
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def cleanup_gmail():
    if not settings.GMAIL_USER or not settings.GMAIL_PASSWORD:
        print("Erro: Credenciais do Gmail não configuradas no .env")
        return

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(settings.GMAIL_USER, settings.GMAIL_PASSWORD)
        print(f"Logado em: {settings.GMAIL_USER}")

        # Listar todas as pastas (labels)
        # O formato do retorno é: ('OK', [b'(\\HasNoChildren) "/" "INBOX"', ...])
        status, folder_list = mail.list()
        if status != "OK":
            print("Erro ao listar pastas")
            return

        standard_folders = ['"INBOX"', '"Drafts"', '"Sent"', '"Spam"', '"Trash"', '"Starred"', '"All Mail"', '"Important"']
        
        # Regex para extrair o nome da pasta entre aspas no final
        import re
        folder_pattern = re.compile(r'[^"]*"/"\s+"([^"]*)"')

        for folder_bytes in folder_list:
            # Pular pastas vazias
            if not folder_bytes: continue
            
            line = folder_bytes.decode('utf-8')
            match = folder_pattern.search(line)
            if not match: continue
            
            folder_name = match.group(1)
            
            # Pular pastas padrão do Gmail (e seus mapeamentos)
            # Geralmente as pastas do sistema começam com [Gmail]
            if folder_name.upper() == "INBOX" or folder_name.startswith("[Gmail]"):
                continue
            
            print(f"\nProcessando pasta: {folder_name}...")
            
            # Mover e-mails para a Inbox
            mail.select(f'"{folder_name}"')
            status, msg_ids = mail.search(None, "ALL")
            
            if status == "OK":
                ids = msg_ids[0].split()
                if ids:
                    print(f" - Movendo {len(ids)} e-mails para a Inbox...")
                    for msg_id in ids:
                        # Copiar para INBOX
                        mail.copy(msg_id, "INBOX")
                        # Marcar para deletar na pasta atual
                        mail.store(msg_id, '+FLAGS', '(\\Deleted)')
                    mail.expunge() # Efetivar deleções
                else:
                    print(" - Pasta vazia.")
            
            # Apagar a pasta
            # Primeiro precisamos deselecionar a pasta (voltando para INBOX por exemplo)
            mail.select("INBOX")
            delete_status, _ = mail.delete(f'"{folder_name}"')
            if delete_status == "OK":
                print(f" - Pasta '{folder_name}' excluída com sucesso.")
            else:
                print(f" - Erro ao excluir pasta '{folder_name}': {delete_status}")

        mail.logout()
        print("\nCleanup finalizado!")

    except Exception as e:
        print(f"Ocorreu um erro: {e}")

if __name__ == "__main__":
    cleanup_gmail()
