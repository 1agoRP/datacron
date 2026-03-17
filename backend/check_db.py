import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.condominio import Condominio

async def check_condos():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Condominio))
        condos = result.scalars().all()
        print(f"Total condos in DB: {len(condos)}")
        for c in condos:
            print(f"- {c.nome} (Ativo: {c.ativo})")

if __name__ == "__main__":
    asyncio.run(check_condos())
