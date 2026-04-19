import asyncio
import logging
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.condominio import Condominio
from app.services.email_monitor import get_imap_connection, ensure_gmail_label
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_all_condo_folders():
    print("Iniciando criação de pastas no Gmail para todos os condomínios...")
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Condominio).where(Condominio.ativo == True))
        condominios = result.scalars().all()
        
    print(f"Encontrados {len(condominios)} condomínios ativos.")
    
    mail = get_imap_connection()
    if not mail:
        print("Erro: Não foi possível conectar ao Gmail. Verifique GMAIL_USER e GMAIL_APP_PASSWORD.")
        return

    try:
        for condo in condominios:
            label_name = condo.nome
            print(f"Verificando pasta para: {label_name}...")
            success = ensure_gmail_label(mail, label_name)
            if success:
                print(f"  [OK] Pasta '{label_name}' garantida.")
            else:
                print(f"  [ERRO] Falha ao criar pasta para '{label_name}'.")
    finally:
        mail.logout()
    
    print("\nProcesso concluído!")

if __name__ == "__main__":
    asyncio.run(create_all_condo_folders())
