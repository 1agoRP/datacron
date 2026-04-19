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

async def backfill_v2():
    print("Iniciando backfill de PDF base64 (v2 com fallback Gmail)...")
    
    mail = get_imap_connection()
    if not mail:
        print("Erro: Não foi possível conectar ao Gmail para o fallback.")
        return

    try:
        async with AsyncSessionLocal() as session:
            # Seleciona faturas que precisam de base64
            stmt = select(Fatura).where(Fatura.pdf_base64.is_(None))
            result = await session.execute(stmt)
            faturas = result.scalars().all()
            
            print(f"Encontradas {len(faturas)} faturas para checar.")
            
            count = 0
            for f in faturas:
                try:
                    # 1. Tentar local primeiro
                    if f.pdf_path:
                        path = Path(f.pdf_path)
                        if path.exists():
                            data = path.read_bytes()
                            f.pdf_base64 = base64.b64encode(data).decode('utf-8')
                            count += 1
                            continue
                    
                    # 2. Fallback Gmail
                    if f.gmail_message_id:
                        print(f"Buscando no Gmail: {f.referencia} ({f.id})...")
                        mail.select("INBOX") # Tenta na inbox primeiro
                        status, data = mail.search(None, f'HEADER Message-ID "{f.gmail_message_id}"')
                        
                        if status != "OK" or not data[0]:
                            # Tenta em Todos os e-mails se não estiver na inbox
                            mail.select('"[Gmail]/Todos os e-mails"')
                            status, data = mail.search(None, f'HEADER Message-ID "{f.gmail_message_id}"')
                        
                        if status == "OK" and data[0]:
                            msg_num = data[0].split()[0]
                            res, msg_data = mail.fetch(msg_num, "(RFC822)")
                            if res == "OK":
                                raw_email = msg_data[0][1]
                                msg = email.message_from_bytes(raw_email)
                                attachments = get_pdf_attachments(msg)
                                
                                if attachments:
                                    # Pega o primeiro PDF que bata com o nome original ou simplesmente o primeiro
                                    pdf_content = None
                                    for fname, content in attachments:
                                        if f.pdf_nome_original and fname in f.pdf_nome_original:
                                            pdf_content = content
                                            break
                                    
                                    if not pdf_content:
                                        pdf_content = attachments[0][1]
                                    
                                    # Se a fatura devia estar desbloqueada, tentamos desbloquear
                                    if f.pdf_desbloqueado:
                                        # Precisamos da senha da concessionária
                                        res_conc = await session.execute(select(Concessionaria).where(Concessionaria.id == f.concessionaria_id))
                                        conc = res_conc.scalar_one_or_none()
                                        if conc and conc.senha_acesso:
                                            unlocked = unlock_pdf(pdf_content, conc.senha_acesso)
                                            if unlocked:
                                                pdf_content = unlocked
                                                
                                    f.pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
                                    count += 1
                                    print(f"  [OK] Recuperado do Gmail.")
                except Exception as e:
                    logger.error(f"Erro ao processar fatura {f.id}: {e}")
                
                if count > 0 and count % 5 == 0:
                    await session.commit()
            
            await session.commit()
            print(f"Finalizado! {count} faturas atualizadas.")

    finally:
        mail.logout()

if __name__ == "__main__":
    asyncio.run(backfill_v2())
