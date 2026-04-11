import asyncio
import logging
import os
import imaplib
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, select

# Configuração de Logs
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("sync_labels_direct")

# Carrega .env
env_path = os.path.join(os.getcwd(), "backend", ".env")
load_dotenv(env_path)

# Configurações do Banco
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Configurações do Gmail
GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")

# Modelo Simplificado para o script
Base = declarative_base()
class Condominio(Base):
    __tablename__ = "condominios"
    id = Column(String, primary_key=True)
    nome = Column(String)

def ensure_gmail_label(mail, label_name):
    try:
        # UTF-7 encoding for Gmail labels with special characters
        # Simplificado: imaplib geralmente lida com strings simples, 
        # mas nomes com espaços/acentos podem precisar de aspas
        status, resp = mail.create(f'"{label_name}"')
        if status == 'OK':
            return True
        # Se já existe, retorna OK mas resp terá mensagem de erro "Already exists"
        return "Already exists" in str(resp) or "ALREADYEXISTS" in str(resp)
    except Exception as e:
        logger.error(f"Erro ao criar label {label_name}: {e}")
        return False

async def run_sync():
    logger.info("Iniciando script de sincronização direta...")
    
    if not DATABASE_URL:
        logger.error("DATABASE_URL não encontrada no .env")
        return

    if not GMAIL_USER or not GMAIL_PASSWORD:
        logger.error("Credenciais do Gmail não encontradas no .env")
        return

    # Conectar ao Gmail
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(GMAIL_USER, GMAIL_PASSWORD)
        logger.info("Conectado ao Gmail com sucesso.")
    except Exception as e:
        logger.error(f"Falha na conexão IMAP: {e}")
        return

    # Garantir pastas base
    ensure_gmail_label(mail, "Datacron")
    ensure_gmail_label(mail, "Datacron/E-mails nao identificados")

    # Conectar ao Banco e buscar condomínios
    engine = create_async_engine(
        DATABASE_URL,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0
        }
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with async_session() as session:
            result = await session.execute(select(Condominio))
            condos = result.scalars().all()
            logger.info(f"Encontrados {len(condos)} condomínios.")

            for condo in condos:
                if not condo.nome: continue
                label = f"Datacron/{condo.nome}"
                logger.info(f"Sincronizando: {label}")
                if ensure_gmail_label(mail, label):
                    logger.info(f"✓ {label} OK")
                else:
                    logger.warning(f"✗ Falha em {label}")

    except Exception as e:
        logger.error(f"Erro durante o processamento do banco: {e}")
    finally:
        await engine.dispose()
        try:
            mail.logout()
        except:
            pass

    logger.info("Sincronização concluída.")

if __name__ == "__main__":
    asyncio.run(run_sync())
