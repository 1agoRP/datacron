import asyncio
import os
import sys
from uuid import UUID
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))
sys.path.append(os.path.join(os.getcwd(), "backend"))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.fatura import Fatura
from app.models.condominio import Condominio

async def test_query():
    condo_id = UUID('1b9ca331-d70a-4d66-96de-986a92759764')
    conc_id = UUID('a73700b1-060c-463d-b169-bc5d4f8910b6') # Sabesp
    
    async with AsyncSessionLocal() as db:
        # Consulta como o router faria
        stmt = select(Fatura).where(
            Fatura.condominio_id == condo_id,
            Fatura.concessionaria_id == conc_id
        )
        result = await db.execute(stmt)
        faturas = result.scalars().all()
        
        print(f"Encontradas {len(faturas)} faturas para o condomínio {condo_id} e conc {conc_id}")
        for f in faturas:
            print(f"- ID: {f.id}, Ref: {f.referencia}, Status: {f.status}")

if __name__ == "__main__":
    asyncio.run(test_query())
