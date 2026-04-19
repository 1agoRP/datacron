import asyncio
import logging
import base64
from pathlib import Path
from sqlalchemy import select, and_
from app.database import AsyncSessionLocal
from app.models.fatura import Fatura

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def backfill():
    print("Iniciando backfill de PDF base64...")
    async with AsyncSessionLocal() as session:
        # Seleciona faturas que estão desbloqueadas, têm path e o base64 está nulo
        stmt = select(Fatura).where(
            and_(
                Fatura.pdf_desbloqueado == True,
                Fatura.pdf_path.isnot(None),
                Fatura.pdf_base64.is_(None)
            )
        )
        result = await session.execute(stmt)
        faturas = result.scalars().all()
        
        print(f"Encontradas {len(faturas)} faturas para processar.")
        
        count = 0
        for f in faturas:
            try:
                path = Path(f.pdf_path)
                if path.exists():
                    data = path.read_bytes()
                    f.pdf_base64 = base64.b64encode(data).decode('utf-8')
                    count += 1
                    if count % 10 == 0:
                        print(f"Processadas {count} faturas...")
                else:
                    logger.warning(f"Arquivo não encontrado para fatura {f.id}: {f.pdf_path}")
            except Exception as e:
                logger.error(f"Erro ao processar fatura {f.id}: {e}")
        
        if count > 0:
            await session.commit()
            print(f"Finalizado! {count} faturas atualizadas com sucesso.")
        else:
            print("Nenhuma fatura precisou de atualização.")

if __name__ == "__main__":
    asyncio.run(backfill())
