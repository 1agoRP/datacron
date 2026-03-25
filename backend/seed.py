import asyncio
import uuid
from sqlalchemy import select
from app.database import AsyncSessionLocal, engine, Base
from app.models.user import User
from app.dependencies import hash_password

async def seed_data():
    async with engine.begin() as conn:
        # Create tables
        try:
            await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            print(f"Skipping table creation (typical with Supabase transaction poolers): {e}")
    
    async with AsyncSessionLocal() as db:
        # Check if admin already exists
        result = await db.execute(select(User).where(User.email == "admin@datacron.com.br"))
        if result.scalar_one_or_none():
            print("Admin user already exists.")
            return

        # Add admin user
        admin = User(
            nome="Administrador Datacron",
            email="admin@datacron.com.br",
            senha_hash=await hash_password("admin123"),
            role="admin"
        )
        db.add(admin)
        await db.commit()
        print("Admin user created successfully.")

if __name__ == "__main__":
    asyncio.run(seed_data())
