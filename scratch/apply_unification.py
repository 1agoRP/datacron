import asyncio
import os
import sys
import pandas as pd
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres.zqxyjgvsduypfuisgxgx:Ip@26032001A@15.229.150.166:6543/postgres"
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
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # Read the data from excel
    excel_path = r'c:\Users\Iago R. Prado Man\.gemini\antigravity\Datacron\Users.xlsx'
    df = pd.read_excel(excel_path)
    # Replaces nan to None
    df = df.where(pd.notnull(df), None)

    async with async_session() as db:
        # First, let's drop database_usuarios
        print("Dropping legacy 'database_usuarios' table...")
        await db.execute(text("DROP TABLE IF EXISTS database_usuarios;"))
        await db.commit()

        print(f"Loaded {len(df)} users from Excel")
        
        for index, row in df.iterrows():
            uudi = row.get("uudi")
            login = str(row.get("login", "")).strip() if row.get("login") is not None else ""
            nome = str(row.get("nomeUsuario", "")).strip() if row.get("nomeUsuario") is not None else ""
            senha = str(row.get("senha", "")).strip() if row.get("senha") is not None else ""
            tipo = str(row.get("tipo", "geral")).strip().lower() if row.get("tipo") is not None else "geral"
            codigo_usuario = row.get("codigoUsuario")
            codigo_condominio = str(row.get("codigoCondominio", "")).strip() if row.get("codigoCondominio") is not None else ""
            administradora = str(row.get("administradora", "")).strip() if row.get("administradora") is not None else None
            
            gestor_usuarios = row.get("gestorUsuarios")
            gestor_fornecedor = row.get("gestorFornecedor")
            gestor_condominios = row.get("gestorCondominios")
            notificar_whatsapp = row.get("notificarWhatsapp")
            notificar_email = row.get("notificarEmail")
            
            if not login or not nome:
                print(f"[{index}] SKIPPING record with empty email or name")
                continue

            role = ROLE_MAP.get(tipo, "geral")
            
            # Use raw UUID if possible, if it's missing or float NaN we skip
            if not uudi or str(uudi) == 'nan':
                uudi = None

            params = {
                "nome": nome,
                "email": login,
                "role": role,
                "codigo": int(codigo_usuario) if codigo_usuario is not None and not pd.isna(codigo_usuario) else None,
                "administradora": administradora,
                "codigo_condominio": codigo_condominio,
                "gestor_u": str(gestor_usuarios) if gestor_usuarios is not None else None,
                "gestor_f": str(gestor_fornecedor) if gestor_fornecedor is not None else None,
                "gestor_c": str(gestor_condominios) if gestor_condominios is not None else None,
                "notif_w": str(notificar_whatsapp) if notificar_whatsapp is not None else None,
                "notif_e": str(notificar_email) if notificar_email is not None else None,
            }
            
            existing = await db.execute(
                text("SELECT id, senha_hash FROM users WHERE email = :email"),
                {"email": login}
            )
            existing_row = existing.mappings().one_or_none()
            
            # Only re-hash password if it's a new plain password or empty/datacron123.
            # Usually password from excel will be in plain format or missing if not changed. 
            # If the user already has a hash and the excel has the plain text, we should probably update it ONLY if they differ, but wait, excel might just have text passwords.
            if existing_row:
                uid = existing_row["id"]
                # For update, we will only change password if a new one is provided in the excel explicitly and it doesn't look like a hash. Just hash what excel has if passed.
                # Let's always hash what's on excel, unless it's empty, then keep current.
                if senha:
                    hash_val = pwd_context.hash(senha)
                else:
                    hash_val = existing_row["senha_hash"]
                params["hash"] = hash_val
                params["uid"] = uid
                
                await db.execute(text("""
                    UPDATE users
                    SET nome = :nome,
                        senha_hash = :hash,
                        role = :role,
                        codigo_usuario = :codigo,
                        administradora = :administradora,
                        codigo_condominio = :codigo_condominio,
                        gestor_usuarios = :gestor_u,
                        gestor_fornecedor = :gestor_f,
                        gestor_condominios = :gestor_c,
                        notificar_whatsapp = :notif_w,
                        notificar_email = :notif_e,
                        updated_at = NOW()
                    WHERE id = :uid
                """), params)
                print(f"  UPDATED: {login} (id: {uid})")
            else:
                # Insert
                hash_val = pwd_context.hash(senha) if senha else pwd_context.hash("datacron123")
                params["hash"] = hash_val
                if uudi:
                     params["uid"] = uudi
                     await db.execute(text("""
                        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                        VALUES (:uid, :nome, :email, :hash, :role, true, :codigo, :administradora, :codigo_condominio, :gestor_u, :gestor_f, :gestor_c, :notif_w, :notif_e)
                     """), params)
                     uid = uudi
                else:    
                     res = await db.execute(text("""
                        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                        VALUES (gen_random_uuid(), :nome, :email, :hash, :role, true, :codigo, :administradora, :codigo_condominio, :gestor_u, :gestor_f, :gestor_c, :notif_w, :notif_e)
                        RETURNING id
                     """), params)
                     uid = res.scalar_one()
                print(f"  CREATED: {login} (id: {uid})")

            # 2. Resync user_condominios
            # Clear existing links for this user
            await db.execute(text("DELETE FROM user_condominios WHERE user_id = :uid"), {"uid": uid})
            
            if codigo_condominio and str(codigo_condominio).lower() != "todos" and str(codigo_condominio).lower() != "nan":
                codes = [c.strip() for c in str(codigo_condominio).split(",") if c.strip()]
                for code in codes:
                    condo_res = await db.execute(text("SELECT id FROM condominios WHERE numero = :num LIMIT 1"), {"num": code})
                    condo_id = condo_res.scalar_one_or_none()
                    if condo_id:
                        await db.execute(text("""
                            INSERT INTO user_condominios (id, user_id, condominio_id)
                            VALUES (gen_random_uuid(), :uid, :cid)
                            ON CONFLICT (user_id, condominio_id) DO NOTHING
                        """), {"uid": uid, "cid": condo_id})

            await db.commit()

        # Print summary
        total_users = await db.execute(text("SELECT COUNT(*) FROM users"))
        total_links = await db.execute(text("SELECT COUNT(*) FROM user_condominios"))
        print(f"\n+++ ALL DONE +++")
        print(f"Total Users: {total_users.scalar_one()}")
        print(f"Total user_condominios links: {total_links.scalar_one()}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
