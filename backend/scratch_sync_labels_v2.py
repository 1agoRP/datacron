import asyncio
import logging
import sys
import os
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

# Adiciona o diretório backend ao path para importar os módulos do app
sys.path.append(os.path.join(os.getcwd(), "backend"))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.condominio import Condominio
from app.services.email_monitor import get_imap_connection, ensure_gmail_label

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sync_labels_v2")

async def sync_all_labels():
    logger.info("Iniciando sincronização de labels para condomínios existentes (Formato: 0000 - NOME)...")
    
    mail = get_imap_connection()
    if not mail:
        logger.error("Não foi possível conectar ao Gmail. Verifique as credenciais no .env")
        return

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Condominio).where(Condominio.ativo == True))
            condominios = result.scalars().all()
            
            logger.info(f"Encontrados {len(condominios)} condomínios ativos no banco.")
            
            # Garantir pasta raiz e pasta de não identificados
            ensure_gmail_label(mail, "Datacron")
            ensure_gmail_label(mail, "Datacron/E-mails não identificados")
            
            for condo in condominios:
                try:
                    # Formato: 0006 - COND. ED. DOMUS CELIA
                    # Preenche com zeros à esquerda até 4 dígitos
                    numero_str = str(condo.numero).zfill(4)
                    label_name = f"Datacron/{numero_str} - {condo.nome.upper()}"
                    
                    logger.info(f"Sincronizando: {label_name}")
                    if ensure_gmail_label(mail, label_name):
                        logger.info(f"✓ Label '{label_name}' verificado/criado.")
                    else:
                        logger.error(f"✗ Falha ao criar label '{label_name}'")
                except Exception as e:
                    logger.error(f"Erro ao processar condomínio {condo.id}: {str(e)}")
                    
        logger.info("Sincronização concluída!")
    finally:
        try:
            mail.logout()
        except:
            pass

if __name__ == "__main__":
    asyncio.run(sync_all_labels())
