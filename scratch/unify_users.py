import pandas as pd
import uuid
import os
import asyncio
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# --- Configuration ---
DATABASE_URL = "postgresql+asyncpg://postgres.zqxyjgvsduypfuisgxgx:Ip@26032001A@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
EXCEL_PATH = r'c:\Users\Iago R. Prado Man\.gemini\antigravity\Datacron\Users.xlsx'

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

async def unify():
    print("Reading Excel...")
    df = pd.read_excel(EXCEL_PATH)
    
    # Clean data
    df = df.where(pd.notnull(df), None)
    
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        print("Adding columns to 'users' table if they don't exist...")
        await conn.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS codigo_condominio TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS gestor_usuarios TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS gestor_fornecedor TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS gestor_condominios TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS notificar_whatsapp TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS notificar_email TEXT;
        """))
        
        print("Upserting user data...")
        for _, row in df.iterrows():
            email = str(row['login']).strip().lower()
            if not email or email == 'none':
                continue
                
            user_id = row['uudi']
            if not user_id or user_id == 'None':
                user_id = str(uuid.uuid4())
            
            nome = str(row['nomeUsuario']).strip()
            senha_plana = str(row['senha']).strip()
            senha_hash = pwd_context.hash(senha_plana)
            
            # Map role
            # admin | gerencia | assistente | contabilidade | financeiro | providencias | geral
            tipo = str(row['tipo']).strip().lower()
            role_map = {
                "admin": "admin",
                "gerencia": "gerencia",
                "assistente": "assistente",
                "contabilidade": "contabilidade",
                "financeiro": "financeiro",
                "providencias": "providencias",
                "gerente": "gerencia",
                "emissão": "geral", # default to geral if unknown
                "emissao": "geral"
            }
            role = role_map.get(tipo, "geral")
            
            codigo_usuario = row['codigoUsuario']
            try:
                codigo_usuario = int(codigo_usuario)
            except:
                codigo_usuario = None
                
            whatsapp = row.get('whatsappUsuario')
            try:
                whatsapp = int(whatsapp)
            except:
                whatsapp = None
                
            administradora = str(row['administradora']).strip()
            codigo_condominio = str(row['codigoCondominio']).strip()
            
            gestor_users = str(row['gestorUsuarios']).strip() if row['gestorUsuarios'] else None
            gestor_forn = str(row['gestorFornecedor']).strip() if row['gestorFornecedor'] else None
            gestor_condos = str(row['gestorCondominios']).strip() if row['gestorCondominios'] else None
            notif_zap = str(row['notificarWhatsapp']).strip() if row['notificarWhatsapp'] else None
            notif_email = str(row['notificarEmail']).strip() if row['notificarEmail'] else None

            # Upsert
            await conn.execute(text("""
                INSERT INTO users (
                    id, nome, email, senha_hash, role, ativo, 
                    codigo_usuario, whatsapp, administradora,
                    codigo_condominio, gestor_usuarios, gestor_fornecedor, 
                    gestor_condominios, notificar_whatsapp, notificar_email
                ) VALUES (
                    :id, :nome, :email, :senha_hash, :role, true, 
                    :codigo_usuario, :whatsapp, :administradora,
                    :codigo_condominio, :gestor_usuarios, :gestor_fornecedor, 
                    :gestor_condominios, :notificar_whatsapp, :notificar_email
                )
                ON CONFLICT (email) DO UPDATE SET
                    nome = EXCLUDED.nome,
                    senha_hash = EXCLUDED.senha_hash,
                    role = EXCLUDED.role,
                    codigo_usuario = EXCLUDED.codigo_usuario,
                    whatsapp = EXCLUDED.whatsapp,
                    administradora = EXCLUDED.administradora,
                    codigo_condominio = EXCLUDED.codigo_condominio,
                    gestor_usuarios = EXCLUDED.gestor_usuarios,
                    gestor_fornecedor = EXCLUDED.gestor_fornecedor,
                    gestor_condominios = EXCLUDED.gestor_condominios,
                    notificar_whatsapp = EXCLUDED.notificar_whatsapp,
                    notificar_email = EXCLUDED.notificar_email,
                    updated_at = NOW()
            """), {
                "id": user_id,
                "nome": nome,
                "email": email,
                "senha_hash": senha_hash,
                "role": role,
                "codigo_usuario": codigo_usuario,
                "whatsapp": whatsapp,
                "administradora": administradora,
                "codigo_condominio": codigo_condominio,
                "gestor_usuarios": gestor_users,
                "gestor_fornecedor": gestor_forn,
                "gestor_condominios": gestor_condos,
                "notificar_whatsapp": notif_zap,
                "notificar_email": notif_email
            })

        print("Dropping legacy 'database_usuarios' table...")
        await conn.execute(text("DROP TABLE IF EXISTS database_usuarios;"))
        
    print("Unification complete!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(unify())
