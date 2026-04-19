import imaplib
import logging
import re
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def cleanup_gmail():
    if not settings.GMAIL_USER or not settings.GMAIL_PASSWORD:
        print("Erro: Credenciais do Gmail não configuradas.")
        return

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(settings.GMAIL_USER, settings.GMAIL_PASSWORD)
        print(f"Logado com sucesso em: {settings.GMAIL_USER}")

        # Buscar todas as pastas
        status, folder_list = mail.list()
        if status != "OK":
            print("Erro ao listar pastas do Gmail.")
            return

        # Pastas do sistema que NUNCA devem ser apagadas
        system_folders = {'INBOX', '[GMAIL]/ALL MAIL', '[GMAIL]/DRAFTS', '[GMAIL]/SENT MAIL', 
                         '[GMAIL]/SPAM', '[GMAIL]/STARRED', '[GMAIL]/TRASH', '[GMAIL]/IMPORTANT'}
        
        folders_to_process = []
        folder_pattern = re.compile(r'\((?P<flags>.*?)\)\s+"(?P<sep>.*?)"\s+"(?P<name>.*?)"')

        for f in folder_list:
            match = folder_pattern.search(f.decode('utf-8'))
            if not match: continue
            
            name = match.group('name')
            if name.upper() in system_folders or name.upper().startswith('[GMAIL]'):
                continue
            folders_to_process.append(name)

        # Ordenar pastas por profundidade (filhas primeiro se houver '/' no nome)
        folders_to_process.sort(key=lambda x: x.count('/'), reverse=True)

        print(f"Encontradas {len(folders_to_process)} subpastas para limpar.")

        for folder in folders_to_process:
            print(f"\n---> LIMPANDO: {folder}")
            
            # 1. Selecionar a pasta
            select_status, data = mail.select(f'"{folder}"')
            if select_status != "OK":
                print(f"      [!] Erro ao selecionar pasta '{folder}': {data}")
                continue

            # 2. Buscar e-mails
            search_status, msg_ids = mail.search(None, "ALL")
            if search_status == "OK":
                ids = msg_ids[0].split()
                if ids:
                    print(f"      [ ] Movendo {len(ids)} e-mails para a Inbox...")
                    for idx, msg_id in enumerate(ids):
                        # Copiar
                        copy_status, _ = mail.copy(msg_id, "INBOX")
                        if copy_status == "OK":
                            # Marcar para deleção na pasta atual
                            mail.store(msg_id, '+FLAGS', '(\\Deleted)')
                        if idx % 50 == 0 and idx > 0:
                            print(f"          ... {idx} e-mails movidos")
                    
                    mail.expunge()
                    print(f"      [+] E-mails movidos com sucesso.")
                else:
                    print(f"      [ ] Pasta já está vazia.")

            # 3. Deselecionar antes de apagar (importante para o Gmail)
            mail.close() # Fecha a pasta selecionada

            # 4. Apagar a pasta (label)
            delete_status, delete_data = mail.delete(f'"{folder}"')
            if delete_status == "OK":
                print(f"      [OK] Subpasta '{folder}' excluída.")
            else:
                # Se falhar o delete simples, tenta renomear ou algo do tipo? 
                # No Gmail, apagar um label via IMAP delete as vezes retorna NO se o label estiver em uso ou for restrito.
                print(f"      [ERRO] Falha ao excluir label: {delete_data}")

        mail.logout()
        print("\n\n=== LIMPEZA CONCLUÍDA ===")

    except Exception as e:
        print(f"Erro fatal: {e}")

if __name__ == "__main__":
    cleanup_gmail()
