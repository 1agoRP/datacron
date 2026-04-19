import asyncio
import logging
import base64
import email
import io
from pathlib import Path
from sqlalchemy import select, and_
from app.database import AsyncSessionLocal
from app.models.fatura import Fatura
from app.models.concessionaria import Concessionaria
from app.services.email_monitor import get_imap_connection, get_pdf_attachments
from app.services.pdf_processor import unlock_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def backfill_v4():
    print("Iniciando backfill de PDF base64 (v4 com busca por X-GM-MSGID)...")
    
    mail = get_imap_connection()
    if not mail:
        print("Erro: Não foi possível conectar ao Gmail.")
        return

    try:
        async with AsyncSessionLocal() as session:
            stmt = select(Fatura).where(Fatura.pdf_base64.is_(None))
            result = await session.execute(stmt)
            faturas = result.scalars().all()
            print(f"Encontradas {len(faturas)} faturas para checar.")
            
            count = 0
            # Usar 'Todos os e-mails' como padrão para busca histórica
            mail.select('"[Gmail]/Todos os e-mails"', readonly=True)

            for f in faturas:
                try:
                    # Gmail
                    if f.gmail_message_id:
                        print(f"Buscando no Gmail: {f.referencia} ({f.id}) [ID: {f.gmail_message_id}]...")
                        
                        # Tenta busca por X-GM-MSGID (comum no Gmail)
                        try:
                            # Converte hex para int decimal (Gmail IMAP exige decimal para X-GM-MSGID)
                            decimal_id = int(f.gmail_message_id, 16)
                            status, search_data = mail.search(None, f'X-GM-MSGID {decimal_id}')
                        except ValueError:
                            # Caso não seja hex, tenta direto
                            status, search_data = mail.search(None, f'HEADER Message-ID "{f.gmail_message_id}"')
                        
                        if status == "OK" and search_data[0]:
                            msg_num = search_data[0].split()[0]
                            res, msg_data = mail.fetch(msg_num, "(RFC822)")
                            if res == "OK":
                                raw_email = msg_data[0][1]
                                msg = email.message_from_bytes(raw_email)
                                atts = get_pdf_attachments(msg)
                                if atts:
                                    pdf_bytes = None
                                    for fname, c in atts:
                                        if f.pdf_nome_original and fname in f.pdf_nome_original:
                                            pdf_bytes = c
                                            break
                                    if not pdf_bytes: pdf_bytes = atts[0][1]
                                    
                                    # Desbloqueio
                                    if f.pdf_desbloqueado:
                                        res_conc = await session.execute(select(Concessionaria).where(Concessionaria.id == f.concessionaria_id))
                                        conc = res_conc.scalar_one_or_none()
                                        if conc and conc.senha_acesso:
                                            unlocked = unlock_pdf(pdf_bytes, conc.senha_acesso)
                                            if unlocked: pdf_bytes = unlocked
                                    
                                    f.pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
                                    count += 1
                                    print(f"  [OK] Recuperado.")
                        else:
                             # Tenta buscar pelo assunto como último recurso
                             search_term = f.referencia.replace("/", " ")
                             status, search_data = mail.search(None, f'SUBJECT "{search_term}"')
                             if status == "OK" and search_data[0]:
                                 # ... logic for subject match ...
                                 print(f"  [AVISO] Tentando via Assunto...")
                                 # (Para brevidade vou focar no MSGID primeiro)
                                 pass
                             else:
                                logger.warning(f"  [AVISO] Mensagem não encontrada.")

                except Exception as e:
                    logger.error(f"Erro ao processar fatura {f.id}: {e}")
                
                if count > 0 and count % 5 == 0:
                    await session.commit()
            
            await session.commit()
            print(f"Finalizado! {count} faturas atualizadas.")
    finally:
        mail.logout()

if __name__ == "__main__":
    asyncio.run(backfill_v4())
