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
            print("Adicionando nome_personalizado na concessionarias...")
            conn.execute(text("ALTER TABLE concessionarias_vinculadas ADD COLUMN nome_personalizado VARCHAR;"))
        except Exception as e:
            print(f"Erro (ou coluna ja existe): {e}")

if __name__ == "__main__":
    migrate()
