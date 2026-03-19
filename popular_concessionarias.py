import asyncio
import os
import sys

# Change to backend dir
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.database import SessionLocal
from app.models.condominio import Condominio
from app.models.concessionaria import Concessionaria
from sqlalchemy import select

dados = [
    ("006", "SABESP", "106509209001", "assistente.gerencia4@propstarter.com.br", "manual", "650", 10, 6501.00),
    ("012", "SABESP", "64387410002", "assistente.gerencia4@propstarter.com.br", "manual", "538", 10, 20001.00),
    ("047", "SABESP", "03057001", "assistente.gerencia4@propstarter.com.br", "manual", "030", 15, 8293.88),
    ("076", "SABESP", "84493682001", "assistente.gerencia4@propstarter.com.br", "manual", "039", 8, 8000.00),
    ("136", "SABESP", "95318232001", "assistente.gerencia4@propstarter.com.br", "manual", "676", 20, 9301.00),
    ("154", "SABESP", "82034230001", "assistente.gerencia4@propstarter.com.br", "manual", "070", 24, 7150.28),
    ("160", "SABESP", "77975324001", "assistente.gerencia4@propstarter.com.br", "manual", "543", 20, 5123.26),
    ("168", "SABESP", "59235225001", "assistente.gerencia4@propstarter.com.br", "manual", "554", 5, 4944.74),
    ("194", "SABESP", "81392702001", "assistente.gerencia4@propstarter.com.br", "manual", "113", 25, 12814.89),
    ("203", "SABESP", "244714967001", "assistente.gerencia4@propstarter.com.br", "manual", "546", 5, 4951.00),
    ("203", "SABESP", "244715009001", "assistente.gerencia4@propstarter.com.br", "manual", "546", 5, 4181.00),
    ("203", "SABESP", "244715181001", "assistente.gerencia4@propstarter.com.br", "manual", "546", 5, 4651.00),
    ("203", "SABESP", "668130695001", "assistente.gerencia4@propstarter.com.br", "manual", "546", 5, 5501.00),
    ("203", "SABESP", "668130695001", "assistente.gerencia4@propstarter.com.br", "manual", "546", 5, 5501.00),
    ("204", "SABESP", "56671784001", "assistente.gerencia4@propstarter.com.br", "manual", "547", 26, 8471.00),
    ("225", "SABESP", "93005628001", "assistente.gerencia4@propstarter.com.br", "manual", "567", 7, 9901.00),
    ("248", "SABESP", "194359409001", "assistente.gerencia4@propstarter.com.br", "manual", "586", 10, 4249.14),
    ("304", "SABESP", "82185360001", "assistente.gerencia4@propstarter.com.br", "manual", "650", 14, 3601.00),
    ("306", "SABESP", "95318232001", "assistente.gerencia4@propstarter.com.br", "manual", "737", 5, 10800.00),
    ("308", "SABESP", "609129015001", "assistente.gerencia4@propstarter.com.br", "manual", "053", 5, 14301.00),
    ("318", "SABESP", "108079503001", "assistente.gerencia4@propstarter.com.br", "manual", "040", 17, 24871.00),
    ("332", "SABESP", "78091900002", "assistente.gerencia4@propstarter.com.br", "manual", "094", 17, 6601.00),
    ("337", "SABESP", "53345606002", "assistente.gerencia4@propstarter.com.br", "manual", "223", 15, 29001.00),
    ("342", "SABESP", "86040616094465", "assistente.gerencia4@propstarter.com.br", "manual", "341", 26, 651.00),
    ("356", "SABESP", "66509700001", "assistente.gerencia4@propstarter.com.br", "manual", "542", 17, 3700.00),
    ("364", "SABESP", "56672403001", "assistente.gerencia4@propstarter.com.br", "manual", "388", 15, 3638.58),
    ("388", "SABESP", "194365301001", "assistente.gerencia4@propstarter.com.br", "manual", "010", 20, 3961.00),
    ("392", "SABESP", "61902780001", "assistente.gerencia4@propstarter.com.br", "manual", "540", 10, 5941.00),
    ("414", "SABESP", "81160160001", "assistente.gerencia4@propstarter.com.br", "manual", "032", 15, 9325.91),
    ("417", "SABESP", "757914551002", "assistente.gerencia4@propstarter.com.br", "manual", "132", 15, 21436.21),
    ("426", "SABESP", "84394277001", "assistente.gerencia4@propstarter.com.br", "manual", "038", 25, 10201.00),
]

async def popular():
    async with SessionLocal() as db:
        for num_cond, tipo, instalacao, email_esperado, regra_senha, senha_manual, dia_venc, valor_medio in dados:
            print(f"Processando condomínio {num_cond} - {instalacao}")
            cond = await db.execute(select(Condominio).where(Condominio.numero == num_cond))
            cond = cond.scalar_one_or_none()
            
            if not cond:
                print(f"  -> Condominio {num_cond} não encontrado no banco de dados, ignorando.")
                continue
                
            conds_assoc = await db.execute(select(Concessionaria).where(
                (Concessionaria.condominio_id == cond.id) & 
                (Concessionaria.instalacao == instalacao) &
                (Concessionaria.tipo == tipo)
            ))
            if conds_assoc.scalar_one_or_none():
                print(f"  -> Concessionária {instalacao} ({tipo}) já existe para o {num_cond}. Pulando.")
                continue
                
            c = Concessionaria(
                condominio_id=cond.id,
                tipo=tipo,
                instalacao=instalacao,
                email_esperado=email_esperado,
                regra_senha=regra_senha,
                senha_manual=senha_manual,
                dia_vencimento=dia_venc,
                valor_medio=valor_medio
            )
            db.add(c)
        
        await db.commit()
        print("Operação concluída com sucesso! Banco atualizado.")

if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))
    asyncio.run(popular())
