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

async def backfill_v9():
    print("Iniciando backfill de PDF base64 (v9 - Mapeamento Global Refinado)...")
    
    mail = get_imap_connection()
    if not mail: return

    try:
        # 1. Mapear Todas as Mensagens (X-GM-MSGID -> UID e Message-ID -> UID)
        print("Selecionando [Gmail]/All Mail...")
        mail.select('"[Gmail]/All Mail"', readonly=True)
        
        status, messages = mail.uid('search', None, 'ALL')
        uids = messages[0].split()
        print(f"Total de mensagens no Gmail: {len(uids)}")
        
        msgid_to_uid = {}
        rfcid_to_uid = {}
        
        print("Mapeando cabeçalhos (X-GM-MSGID e Message-ID)...")
        batch_size = 500
        for i in range(0, len(uids), batch_size):
            batch = uids[i:i+batch_size]
            batch_str = ",".join([u.decode() for u in batch])
            # Fetch both IDs
            res, data = mail.uid('fetch', batch_str, "(X-GM-MSGID BODY[HEADER.FIELDS (MESSAGE-ID)])")
            if res == "OK":
                current_uid = None
                for item in data:
                    if isinstance(item, tuple):
                        header_part = item[1].decode()
                        # Extract UID from the first part of tuple if it's there
                        # item[0] format: b'46 (UID 46 X-GM-MSGID 1859760038580852014 BODY[HEADER.FIELDS (MESSAGE-ID)] {57}'
                        meta = item[0].decode()
                        uid_match = re.search(r"UID (\d+)", meta)
                        if uid_match:
                            current_uid = uid_match.group(1)
                            
                        # Extract X-GM-MSGID
                        gm_match = re.search(r"X-GM-MSGID (\d+)", meta)
                        if gm_match and current_uid:
                            hex_id = hex(int(gm_match.group(1))).replace("0x", "")
                            msgid_to_uid[hex_id] = current_uid
                        
                        # Extract RFC Message-ID
                        mid_match = re.search(r"Message-ID:\s*(<[^>]+>)", header_part, re.IGNORECASE)
                        if mid_match and current_uid:
                            rfcid_to_uid[mid_match.group(1).strip()] = current_uid
            
            if (i + batch_size) % 1000 == 0 or i + batch_size >= len(uids):
                print(f"  Processados {min(i+batch_size, len(uids))}...")

        print(f"Mapeamento concluído. {len(msgid_to_uid)} GM-IDs e {len(rfcid_to_uid)} RFC-IDs.")

        # 2. Processar Faturas
        async with AsyncSessionLocal() as session:
            stmt = select(Fatura).where(Fatura.pdf_base64.is_(None)).options(
                selectinload(Fatura.concessionaria),
                selectinload(Fatura.condominio)
            )
            result = await session.execute(stmt)
            faturas = result.scalars().all()
            print(f"Encontradas {len(faturas)} faturas no DB para processar.")
            
            count = 0
            for f in faturas:
                try:
                    uid = None
                    if f.gmail_message_id:
                        clean_id = f.gmail_message_id.strip()
                        # Tenta match em ambos os mapas
                        uid = msgid_to_uid.get(clean_id.strip("<>")) or rfcid_to_uid.get(clean_id)
                        if not uid and not clean_id.startswith('<'):
                            uid = rfcid_to_uid.get(f"<{clean_id}>")
                    
                    if uid:
                        print(f"Recuperando PDF para {f.referencia}...")
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
                    else:
                        # Silently skip if not found in Gmail
                        pass

                except Exception as e:
                    logger.error(f"Erro na fatura {f.id}: {e}")
                
                if count > 0 and count % 20 == 0:
                    await session.commit()
            
            await session.commit()
            print(f"Finalizado! {count} faturas atualizadas com base64.")
    finally:
        mail.logout()

if __name__ == "__main__":
    asyncio.run(backfill_v9())
