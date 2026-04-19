import asyncio
import logging
import base64
import email
import io
from pathlib import Path
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models.fatura import Fatura
from app.models.concessionaria import Concessionaria
from app.models.condominio import Condominio
from app.services.email_monitor import get_imap_connection, get_pdf_attachments
from app.services.pdf_processor import unlock_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def backfill_v6():
    print("Iniciando backfill de PDF base64 (v6 fix senha_acesso)...")
    
    mail = get_imap_connection()
    if not mail: return

    try:
        async with AsyncSessionLocal() as session:
            # Seleciona faturas com relacionamento de concessionária e condomínio
            stmt = select(Fatura).where(Fatura.pdf_base64.is_(None)).options(
                selectinload(Fatura.concessionaria),
                selectinload(Fatura.condominio)
            )
            result = await session.execute(stmt)
            faturas = result.scalars().all()
            print(f"Encontradas {len(faturas)} faturas para checar.")
            
            mail.select('"[Gmail]/All Mail"', readonly=True)

            count = 0
            for f in faturas:
                try:
                    if f.gmail_message_id:
                        print(f"Buscando: {f.referencia} | MSGID: {f.gmail_message_id}")
                        
                        found_uid = None
                        try:
                            # Tenta X-GM-MSGID se for hex
                            decimal_id = int(f.gmail_message_id, 16)
                            status, search_data = mail.uid('search', None, f'X-GM-MSGID {decimal_id}')
                            if status == "OK" and search_data[0]:
                                found_uid = search_data[0].split()[0]
                        except: pass
                        
                        if not found_uid:
                            # Tenta Message-ID header
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
                                    
                                    # Desbloqueio se necessário
                                    if f.pdf_desbloqueado and f.concessionaria:
                                        cnpj = f.condominio.cnpj_digits if f.condominio else ""
                                        password = f.concessionaria.gerar_senha_pdf(cnpj)
                                        unlocked = unlock_pdf(pdf_bytes, password)
                                        if unlocked: pdf_bytes = unlocked
                                                
                                    f.pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
                                    count += 1
                                    print(f"  [OK] Sucesso!")
                except Exception as e:
                    logger.error(f"Erro ao processar fatura {f.id}: {e}")
                
                if count > 0 and count % 5 == 0:
                    await session.commit()
            
            await session.commit()
            print(f"Finalizado! {count} faturas atualizadas.")
    finally:
        mail.logout()

if __name__ == "__main__":
    asyncio.run(backfill_v6())
