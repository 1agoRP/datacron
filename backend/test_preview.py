import asyncio
import io
import sys
import pandas as pd
from app.database import get_db, Base, engine
from app.routers.importacoes import _parse_excel_or_csv

async def test_parse():
    print("Testing pandas parse with empty DF...")
    df = pd.DataFrame({"Nº Cond.": ["006"], "Tipo": ["Sabesp"], "Valor Médio": [None]})
    content = io.BytesIO()
    df.to_excel(content, index=False)
    content.seek(0)
    
    rows = _parse_excel_or_csv(content.read(), "template.xlsx")
    print("Rows mapped:", rows)
    
asyncio.run(test_parse())
