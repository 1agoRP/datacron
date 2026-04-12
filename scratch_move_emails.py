import asyncio
import os
import sys
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)

# Configura o path e carrega as variáveis de ambiente
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

from backend.app.services.email_monitor import run_email_scan

if __name__ == '__main__':
    print("Iniciando varredura da caixa de entrada e organização de pastas...")
    asyncio.run(run_email_scan())
    print("Concluído!")
