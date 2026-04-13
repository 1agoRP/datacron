"""
Migração dos usuários de database_usuarios para a tabela users.
Executar via: python backend/migrate_users.py
"""
import asyncio
import os
import sys

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from passlib.context import CryptContext
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# DB URL from environment or default
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres.zqxyjgvsduypfuisgxgx:Ip@26032001A@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
)

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


ROLE_MAP = {
    "admin": "admin",
    "gerente": "gerencia",
    "assistente": "assistente",
    "contabilidade": "contabilidade",
    "financeiro": "financeiro",
    "providencias": "providencias",
    "geral": "geral",
}


async def migrate():
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        pool_size=5,
        max_overflow=0,
        connect_args={"statement_cache_size": 0},
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # 1. Read all legacy users
        result = await db.execute(text('SELECT * FROM database_usuarios'))
        legacy_users = result.mappings().all()
        print(f"Found {len(legacy_users)} legacy users to migrate")

        for lu in legacy_users:
            login = lu.get("login", "").strip()
            nome = lu.get("nomeUsuario", "").strip()
            senha = lu.get("senha", "").strip()
            tipo = lu.get("tipo", "geral").strip().lower()
            codigo = lu.get("codigoUsuario")
            whatsapp = lu.get("whatsappUsuario")
            administradora = lu.get("administradora", "").strip() or None
            codigo_condominios_str = lu.get("codigoCondominio", "").strip()

            if not login or not nome:
                print(f"  SKIP: missing login or nome for ID {lu.get('id')}")
                continue

            # Map role
            role = ROLE_MAP.get(tipo, "geral")

            # Check if user already exists
            existing = await db.execute(
                select(text("1")).select_from(text("users")).where(text(f"email = '{login}'"))
            )
            if existing.scalar_one_or_none() is not None:
                print(f"  EXISTS: {login} — skipping")
                continue

            # Hash password
            hashed = pwd_context.hash(senha) if senha else pwd_context.hash("datacron123")

            # Insert user
            insert_result = await db.execute(text("""
                INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, whatsapp, administradora)
                VALUES (gen_random_uuid(), :nome, :email, :hash, :role, true, :codigo, :whatsapp, :administradora)
                RETURNING id
            """), {
                "nome": nome,
                "email": login,
                "hash": hashed,
                "role": role,
                "codigo": codigo,
                "whatsapp": whatsapp,
                "administradora": administradora,
            })
            new_user_id = insert_result.scalar_one()
            print(f"  CREATED: {login} -> role={role}, id={new_user_id}")

            # 2. Associate condominios
            if codigo_condominios_str:
                codes = [c.strip() for c in codigo_condominios_str.split(",") if c.strip()]
                for code in codes:
                    # Find condominio by numero (which was codeCond)
                    condo_result = await db.execute(text("""
                        SELECT id FROM condominios WHERE numero = :num LIMIT 1
                    """), {"num": code})
                    condo_id = condo_result.scalar_one_or_none()
                    if condo_id:
                        await db.execute(text("""
                            INSERT INTO user_condominios (id, user_id, condominio_id)
                            VALUES (gen_random_uuid(), :uid, :cid)
                            ON CONFLICT (user_id, condominio_id) DO NOTHING
                        """), {"uid": new_user_id, "cid": condo_id})
                    else:
                        print(f"    WARN: Condominio code={code} not found — skipping link")

            await db.commit()

        # Summary
        total_users = await db.execute(text("SELECT COUNT(*) FROM users"))
        total_links = await db.execute(text("SELECT COUNT(*) FROM user_condominios"))
        print(f"\n=== Migration Complete ===")
        print(f"Total users in DB: {total_users.scalar_one()}")
        print(f"Total user-condominio links: {total_links.scalar_one()}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate())
