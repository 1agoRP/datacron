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

async def backfill_v5():
    print("Iniciando backfill de PDF base64 (v5 com busca All Mail)...")
    
    mail = get_imap_connection()
    if not mail: return

    try:
        async with AsyncSessionLocal() as session:
            stmt = select(Fatura).where(Fatura.pdf_base64.is_(None))
            result = await session.execute(stmt)
            faturas = result.scalars().all()
            print(f"Encontradas {len(faturas)} faturas para checar.")
            
            # Seleciona All Mail
            res, _ = mail.select('"[Gmail]/All Mail"', readonly=True)
            if res != "OK":
                print("Erro ao selecionar All Mail")
                return

            count = 0
            for f in faturas:
                try:
                    if f.gmail_message_id:
                        print(f"Buscando: {f.referencia} | MSGID: {f.gmail_message_id}")
                        
                        # 1. Tenta X-GM-MSGID se for hex
                        found_uid = None
                        try:
                            decimal_id = int(f.gmail_message_id, 16)
                            status, search_data = mail.uid('search', None, f'X-GM-MSGID {decimal_id}')
                            if status == "OK" and search_data[0]:
                                found_uid = search_data[0].split()[0]
                        except: pass
                        
                        # 2. Tenta Message-ID header
                        if not found_uid:
                            # Tenta com e sem brackets se necessário, mas aqui usaremos o que está no banco
                            msg_id_query = f.gmail_message_id
                            if not msg_id_query.startswith('<'): msg_id_query = f"<{msg_id_query}>"
                            
                            status, search_data = mail.uid('search', None, f'HEADER Message-ID "{msg_id_query}"')
                            if status == "OK" and search_data[0]:
                                found_uid = search_data[0].split()[0]
                        
                        if found_uid:
                            res, msg_data = mail.uid('fetch', found_uid, "(RFC822)")
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
                                    
                                    if f.pdf_desbloqueado:
                                        res_conc = await session.execute(select(Concessionaria).where(Concessionaria.id == f.concessionaria_id))
                                        conc = res_conc.scalar_one_or_none()
                                        if conc and conc.senha_acesso:
                                            unlocked = unlock_pdf(pdf_bytes, conc.senha_acesso)
                                            if unlocked: pdf_bytes = unlocked
                                    
                                    f.pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
                                    count += 1
                                    print(f"  [OK] Sucesso!")
                        else:
                            print(f"  [falha] Não encontrado.")

                except Exception as e:
                    logger.error(f"Erro ao processar fatura {f.id}: {e}")
                
                if count > 0 and count % 5 == 0:
                    await session.commit()
            
            await session.commit()
            print(f"Finalizado! {count} faturas atualizadas.")
    finally:
        mail.logout()

if __name__ == "__main__":
    asyncio.run(backfill_v5())
