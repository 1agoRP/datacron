import asyncio
import logging
import base64
import email
import io
import re
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

async def backfill_v8():
    print("Iniciando backfill de PDF base64 (v8 - Mapeamento Global)...")
    
    mail = get_imap_connection()
    if not mail: return

    try:
        # 1. Mapear Todas as Mensagens do All Mail (X-GM-MSGID -> UID)
        print("Selecionando [Gmail]/All Mail...")
        mail.select('"[Gmail]/All Mail"', readonly=True)
        
        print("Mapeando X-GM-MSGID de todas as faturas (isso pode levar 1-2 minutos)...")
        # Buscamos apenas os últimos meses para ser mais rápido? Não, melhor tudo se possível.
        # RFC822.SIZE é útil também
        status, messages = mail.uid('search', None, 'ALL')
        uids = messages[0].split()
        print(f"Total de mensagens encontradas: {len(uids)}")
        
        # Batch fetch for X-GM-MSGID
        msgid_to_uid = {}
        batch_size = 1000
        for i in range(0, len(uids), batch_size):
            batch = uids[i:i+batch_size]
            batch_str = ",".join([u.decode() for u in batch])
            res, data = mail.uid('fetch', batch_str, "(X-GM-MSGID)")
            if res == "OK":
                for item in data:
                    if isinstance(item, tuple):
                        content = item[1].decode()
                        print(f"DEBUG: item content: {content}") # DEBUG
                        # Extract X-GM-MSGID value. Format: (X-GM-MSGID 123456789)
                        match = re.search(r"X-GM-MSGID (\d+)", content)
                        if match:
                            decimal_id = match.group(1)
                            # Convert decimal string to hex string for matching with DB
                            hex_id = hex(int(decimal_id)).replace("0x", "")
                            # Map both hex and decimal just in case
                            msgid_to_uid[hex_id] = item[0].split()[0] # UID
            print(f"  Mapeados {min(i+batch_size, len(uids))}...")

        print(f"Mapeamento concluído. {len(msgid_to_uid)} IDs únicos mapeados.")

        # 2. Processar Faturas
        async with AsyncSessionLocal() as session:
            stmt = select(Fatura).where(Fatura.pdf_base64.is_(None)).options(
                selectinload(Fatura.concessionaria),
                selectinload(Fatura.condominio)
            )
            result = await session.execute(stmt)
            faturas = result.scalars().all()
            print(f"Encontradas {len(faturas)} faturas no DB.")
            
            count = 0
            for f in faturas:
                try:
                    uid = None
                    if f.gmail_message_id:
                        # Limpa brackets do ID se existirem no banco
                        clean_id = f.gmail_message_id.strip("<>")
                        uid = msgid_to_uid.get(clean_id)
                    
                    if uid:
                        print(f"Recuperando PDF para fatura {f.id} (Ref: {f.referencia})...")
                        res, msg_data = mail.uid('fetch', uid, "(RFC822)")
                        if res == "OK":
                            raw_email = msg_data[0][1]
                            msg = email.message_from_bytes(raw_email)
                            atts = get_pdf_attachments(msg)
                            if atts:
                                pdf_bytes = atts[0][1]
                                for fname, c in atts:
                                    if f.pdf_nome_original and fname in f.pdf_nome_original:
                                        pdf_bytes = c
                                        break
                                
                                if f.pdf_desbloqueado and f.concessionaria:
                                    cnpj = f.condominio.cnpj_digits if f.condominio else ""
                                    password = f.concessionaria.gerar_senha_pdf(cnpj)
                                    unlocked = unlock_pdf(pdf_bytes, password)
                                    if unlocked: pdf_bytes = unlocked
                                            
                                f.pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
                                count += 1
                                print(f"  [OK] Salvo.")
                    else:
                        # Fallback por assunto se Message-ID não resolveu
                        # (Opcional, mas vamos focar no MSGID primeiro)
                        pass

                except Exception as e:
                    logger.error(f"Erro na fatura {f.id}: {e}")
                
                if count > 0 and count % 10 == 0:
                    await session.commit()
            
            await session.commit()
            print(f"Finalizado! {count} faturas atualizadas.")
    finally:
        mail.logout()

if __name__ == "__main__":
    asyncio.run(backfill_v8())
