import os
from sqlalchemy import create_engine, text
from app.config import settings

def migrate():
    # Convert asyncpg to psycopg2 URL
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    if "?" in db_url:
        db_url = db_url.split("?")[0]
        
    engine = create_engine(db_url)
    
    with engine.begin() as conn:
        try:
            print("Adicionando ata_eleicao_base64 no condominios...")
            conn.execute(text("ALTER TABLE condominios ADD COLUMN ata_eleicao_base64 TEXT;"))
        except Exception as e:
            print(f"Erro (ou coluna ja existe): {e}")

    with engine.begin() as conn:
        try:
            print("Adicionando ata_eleicao_nome no condominios...")
            conn.execute(text("ALTER TABLE condominios ADD COLUMN ata_eleicao_nome VARCHAR;"))
        except Exception as e:
            print(f"Erro (ou coluna ja existe): {e}")
            
if __name__ == "__main__":
    migrate()
