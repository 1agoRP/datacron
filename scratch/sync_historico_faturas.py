import asyncio
import logging
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.fatura import Fatura
from app.models.historico_fatura import HistoricoFatura

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def sync_historico():
    print("Sincronizando faturas desbloqueadas para a tabela historico_faturas...")
    
    async with AsyncSessionLocal() as session:
        # Pega todas as faturas que já têm base64 e estão desbloqueadas
        stmt = select(Fatura).where(
            Fatura.pdf_desbloqueado == True,
            Fatura.pdf_base64.isnot(None)
        )
        result = await session.execute(stmt)
        faturas = result.scalars().all()
        print(f"Encontradas {len(faturas)} faturas elegíveis.")

        # Pega IDs que já estão no histórico para evitar duplicatas simples (pela referência e id da fatura no id do historico?)
        # Na verdade id do historico é uuid, mas podemos usar o id da fatura como base ou uuid aleatorio.
        # O usuário não definiu se o ID deve ser o mesmo. Vamos usar o mesmo UUID se possível ou apenas checar duplicatas por (condo, conc, ref).
        
        hist_stmt = select(HistoricoFatura.referencia, HistoricoFatura.condominio_id, HistoricoFatura.concessionaria_id)
        hist_result = await session.execute(hist_stmt)
        existing = set(hist_result.all())
        
        count = 0
        for f in faturas:
            key = (f.referencia, f.condominio_id, f.concessionaria_id)
            if key not in existing:
                hist = HistoricoFatura(
                    id=f.id, # Vamos usar o mesmo ID para facilitar rastreio
                    condominio_id=f.condominio_id,
                    concessionaria_id=f.concessionaria_id,
                    referencia=f.referencia,
                    vencimento=f.vencimento,
                    valor=f.valor,
                    pdf_nome_original=f.pdf_nome_original,
                    base_64=f.pdf_base64,
                    debito_automatico=f.debito_automatico,
                    created_at=f.created_at,
                    updated_at=f.updated_at
                )
                session.add(hist)
                count += 1
                existing.add(key)
        
        await session.commit()
        print(f"Finalizado! {count} registros inseridos em historico_faturas.")

if __name__ == "__main__":
    asyncio.run(sync_historico())
