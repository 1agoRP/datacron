import asyncio
import os
import sys
import uuid
from passlib.context import CryptContext
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# DB URL
DATABASE_URL = "postgresql+asyncpg://postgres.zqxyjgvsduypfuisgxgx:Ip@26032001A@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")

# Roles Map
ROLE_MAP = {
    "admin": "admin",
    "supervisor": "admin", # supervisor acts as admin
    "subgerente": "admin", # supervisor level
    "gerencia": "gerencia",
    "gerencia": "gerencia",
    "assistente": "assistente",
    "contabilidade": "contabilidade",
    "concessionarias": "contabilidade", # limitadas
    "emissao": "geral", # limitadas
}

# Data from Screenshot
USER_DATA = [
    {"uuid": "6c7b21fe-3725-48fe-ba31-45d2abbd03df", "cod": 4328, "condo": "todos", "nome": "Iago R. Prado Man - Admin", "tipo": "admin", "email": "iago@propstarter.com.br", "pw": "Prop516@@#"},
    {"uuid": "a434b423-7a3d-4d30-95b3-7643b423a644", "cod": 4794, "condo": "todos", "nome": "Admin Teste", "tipo": "supervisor", "email": "fernando@propstarter.com.br", "pw": "Prop536@@#"},
    {"uuid": "5e57193b-a28a-4c28-bd16-79b8f155953d", "cod": 6872, "condo": "14, 15, 61, 63, 104, 143, 178, 183, 201, 209, 210, 242, 254, 251, 267, 271, 280, 301, 340, 350, 359, 377, 395, 397, 412, 413, 411, 442, 447, 453, 159", "nome": "Danilo Sanjuan", "tipo": "assistente", "email": "assistente.gerencia@propstarter.com.br", "pw": "Dan$356##"},
    {"uuid": "645f7c32-15f5-4e78-bdb4-d25799abdb07", "cod": 7654, "condo": "16, 64, 86, 137, 152, 183, 222, 254, 280, 308, 312, 323, 324, 335, 345, 360, 411, 426, 453, 454, 461, 465, 480", "nome": "Fernando Fernandes", "tipo": "assistente", "email": "assistente.gerencia1@propstarter.com.br", "pw": "Fer#2443$"},
    {"uuid": "e7cd4125-9eb4-43be-b4e3-f3b552135c3c", "cod": 3105, "condo": "18, 25, 59, 103, 125, 127, 137, 202, 203, 229, 302, 307, 315, 326, 330, 341, 346, 366, 367, 373, 381, 394, 402, 403, 461, 474, 479", "nome": "Leonardo Pecoraro", "tipo": "assistente", "email": "assistente.gerencia10@propstarter.com.br", "pw": "Leo57&2#"},
    {"uuid": "959efad7-c353-40fa-a22a-f10d4c1ad0d7", "cod": 2518, "condo": "2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 230, 245, 248, 246, 288, 302, 322, 353, 365, 403, 410, 420, 423, 424, 437, 439, 443, 460, 465, 472, 477", "nome": "Jenifer Barros", "tipo": "assistente", "email": "assistente.gerencia11@propstarter.com.br", "pw": "Jeni50!#"},
    {"uuid": "2c1d2844-3eb8-4ecd-a932-7ba12343ad23", "cod": 4028, "condo": "31, 52, 126, 141, 148, 155, 175, 185, 188, 224, 226, 240, 247, 243, 256, 277, 283, 284, 285, 314, 325, 344, 352, 388, 403, 415, 422, 430, 436, 446, 470, 471", "nome": "Gabriel Vieira", "tipo": "assistente", "email": "assistente.gerencia2@propstarter.com.br", "pw": "Gab323$@"},
    {"uuid": "cc43e4be-21e8-45ad-9ea4-db4deff825c6", "cod": 1303, "condo": "39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 278, 283, 294, 296, 297, 313, 317, 332, 353, 357, 375, 376, 404, 415, 431, 433, 464, 465, 375", "nome": "Fabiana Ferreira Fernandes", "tipo": "assistente", "email": "assistente.gerencia3@propstarter.com.br", "pw": "Fabi97@#"},
    {"uuid": "2e3792cb-05bd-44a7-8f5b-e24483ae5f3b", "cod": 3405, "condo": "45, 54, 62, 98, 107, 111, 112, 119, 131, 172, 178, 222, 293, 300, 313, 329, 334, 355, 371, 375, 395, 405, 418, 425, 427, 455, 467, 468, 472", "nome": "Pedro Henrique", "tipo": "assistente", "email": "assistente.gerencia5@propstarter.com.br", "pw": "Pedro#329"},
    {"uuid": "139eff1f-b3f5-4d7a-af31-2f777ae36621", "cod": 6095, "condo": "6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 310, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479", "nome": "Iago R. Prado Man", "tipo": "assistente", "email": "assistente.gerencia7@propstarter.com.br", "pw": "Iago33@!"},
    {"uuid": "33a8a8eb-42a3-4371-b66e-36578decb5df", "cod": 1275, "condo": "7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458", "nome": "Victor Balanovski", "tipo": "assistente", "email": "assistente.gerencia8@propstarter.com.br", "pw": "Vic192@&"},
    {"uuid": "0d2b78a9-da1a-472d-a43a-e245a331dd21", "cod": 5508, "condo": "3, 20, 68, 81, 94, 120, 153, 171, 221, 223, 252, 273, 274, 276, 282, 315, 340, 351, 355, 383, 402, 410, 440, 441, 445, 451, 452", "nome": "Silvia Macedo", "tipo": "assistente", "email": "assistente.gerencia9@propstarter.com.br", "pw": "Sil&231#"},
    {"uuid": "8ad200d7-e0d2-4311-b1de-daba86a7ff89", "cod": 2581, "condo": "todos", "nome": "concessionarias", "tipo": "concessionarias", "email": "concessionarias@propstarter.com.br", "pw": "Con@ss@0"},
    {"uuid": "0820f8c3-f0d7-467b-832a-dd044aa75037", "cod": 5402, "condo": "todos", "nome": "Contabilidade", "tipo": "contabilidade", "email": "contabilidade@propstarter.com.br", "pw": "Contab@#"},
    {"uuid": "12b7a8a6-dfae-4d8e-a3b4-125a0b7e27ec", "cod": 1028, "condo": "14, 15, 61, 63, 104, 143, 178, 183, 201, 209, 210, 242, 254, 251, 267, 271, 280, 301, 340, 350, 359, 377, 395, 397, 412, 413, 411, 442, 447, 453, 159", "nome": "Rodrigo Cavalcante", "tipo": "gerencia", "email": "rodrigo.cavalcante@propstarter.com.br", "pw": "Rodr2107#"},
    {"uuid": "e2d1d4d3-b1d5-4e78-bdb4-d25799abdb07", "cod": 3885, "condo": "16, 64, 86, 137, 152, 183, 222, 254, 280, 308, 312, 323, 324, 335, 345, 360, 411, 426, 453, 454, 461, 465, 480", "nome": "Diogo dos Santos Andrade", "tipo": "gerencia", "email": "diogo@propstarter.com.br", "pw": "Diog#13!1"},
    {"uuid": "d24ca7a6-e2de-422a-b4e3-f3b552135c3c", "cod": 3842, "condo": "18, 25, 59, 103, 125, 127, 137, 202, 203, 229, 302, 307, 315, 326, 330, 341, 346, 366, 367, 373, 381, 394, 402, 403, 461, 474, 479", "nome": "Sheilla Fonseca", "tipo": "gerencia", "email": "sheilla@propstarter.com.br", "pw": "Shei4!@!"},
    {"uuid": "ca4ac325-a1c3-4353-a22a-f10d4c1ad0d7", "cod": 2307, "condo": "2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 230, 245, 248, 246, 288, 302, 322, 353, 365, 403, 410, 420, 423, 424, 437, 439, 443, 460, 465, 472, 477", "nome": "Aline Haick", "tipo": "gerencia", "email": "aline@propstarter.com.br", "pw": "Ali!98m$"},
    {"uuid": "bd1dab44-3eb8-4ecd-a932-7ba12343ad23", "cod": 1102, "condo": "31, 52, 126, 141, 148, 155, 175, 185, 188, 224, 226, 240, 247, 243, 256, 277, 283, 284, 285, 314, 325, 344, 352, 388, 403, 415, 422, 430, 436, 446, 470, 471", "nome": "Natalia Merlim", "tipo": "gerencia", "email": "natalia@propstarter.com.br", "pw": "Nat@!#47"},
    {"uuid": "cc43e4be-21e8-45ad-9ea4-db4deff825c6", "cod": 2102, "condo": "39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 278, 283, 294, 296, 297, 313, 317, 332, 353, 357, 375, 376, 404, 415, 431, 433, 464, 465, 375", "nome": "Eduardo Arrendato", "tipo": "gerencia", "email": "eduardo@propstarter.com.br", "pw": "Edu!@#11"},
    {"uuid": "2e3792cb-05bd-44a7-8f5b-e24483ae5f3b", "cod": 3328, "condo": "45, 54, 62, 98, 107, 111, 112, 119, 131, 172, 178, 222, 293, 300, 313, 329, 334, 355, 371, 375, 395, 405, 418, 425, 427, 455, 467, 468, 472", "nome": "Juliana Ferraro", "tipo": "gerencia", "email": "juliana.ferraro@propstarter.com.br", "pw": "Juli@!#9"},
    {"uuid": "139eff1f-b3f5-4d7a-af31-2f777ae36621", "cod": 3154, "condo": "6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 310, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479", "nome": "Moizes Junior", "tipo": "gerencia", "email": "moizes@propstarter.com.br", "pw": "Moiz!!3#"},
    {"uuid": "33a8a8eb-42a3-4371-b66e-36578decb5df", "cod": 1928, "condo": "7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458", "nome": "Pedro Ferreira", "tipo": "gerencia", "email": "pedrof@propstarter.com.br", "pw": "PeF#!!4h"},
    {"uuid": "0d2b78a9-da1a-472d-a43a-e245a331dd21", "cod": 3374, "condo": "3, 20, 68, 81, 94, 120, 153, 171, 221, 223, 252, 273, 274, 276, 282, 315, 340, 351, 355, 383, 402, 410, 440, 441, 445, 451, 452", "nome": "Marina Leite", "tipo": "gerencia", "email": "marina@propstarter.com.br", "pw": "Mari3!@1"},
    {"uuid": "ac3b8279-bfae-48be-a3b4-125a0b7e27ec", "cod": 1124, "condo": "todos", "nome": "Eduardo Pereira Bardella", "tipo": "supervisor", "email": "pbardella@propstarter.com.br", "pw": "Edu#!!1a"},
    {"uuid": "2d1d4d3b-1d54-4e78-bdb4-d25799abdb07", "cod": 2155, "condo": "7, 55, 83, 102...", "nome": "Valter Balanovski", "tipo": "subgerente", "email": "valter@propstarter.com.br", "pw": "Valt!3!0"},
    {"uuid": "7e2db78a-9da1-472d-a43a-e245a331dd21", "cod": 3110, "condo": "todos", "nome": "Fechamento 01", "tipo": "contabilidade", "email": "fechamento1@propstarter.com.br", "pw": "Fe#1@Ph"},
    {"uuid": "6c7b21fe-3725-48fe-ba31-45d2abbd03df-v2", "cod": 1225, "condo": "todos", "nome": "Fechamento 02", "tipo": "contabilidade", "email": "fechamento2@propstarter.com.br", "pw": "Fe%2*Ph"},
    {"uuid": "2af78a9c-da1a-472d-a43a-e245a33dd121", "cod": 3322, "condo": "todos", "nome": "Fechamento 03", "tipo": "contabilidade", "email": "fechamento3@propstarter.com.br", "pw": "Fe%3#Ph"},
    {"uuid": "1b2b8a7c-472d-4d30-b1ae-01ba2131a17e", "cod": 8225, "condo": "todos", "nome": "Fechamento 04", "tipo": "contabilidade", "email": "fechamento4@propstarter.com.br", "pw": "Fe$4!Ph"},
    {"uuid": "fd32c161-0d33-4f51-b8ae-01ba2131a17e", "cod": 1322, "condo": "todos", "nome": "Fechamento 05", "tipo": "contabilidade", "email": "fechamento5@propstarter.com.br", "pw": "Fe&5bPh"},
    {"uuid": "cc43e4be-21e8-45ad-9ea4-db4deff825c6-v2", "cod": 4872, "condo": "todos", "nome": "Fechamento 06", "tipo": "contabilidade", "email": "fechamento6@propstarter.com.br", "pw": "Fe#6aPh"},
    {"uuid": "2e3792cb-05bd-44a7-8f5b-e24483ae5f3b-v2", "cod": 5271, "condo": "todos", "nome": "Fechamento 07", "tipo": "contabilidade", "email": "fechamento7@propstarter.com.br", "pw": "Fe+7cPh"},
    {"uuid": "139eff1f-b3f5-4d7a-af31-2f777ae36621-v2", "cod": 3317, "condo": "todos", "nome": "Fechamento 08", "tipo": "contabilidade", "email": "fechamento8@propstarter.com.br", "pw": "Fe=dePh"},
    {"uuid": "33a8a8eb-42a3-4371-b66e-36578decb5df-v2", "cod": 2337, "condo": "todos", "nome": "Fechamento 09", "tipo": "contabilidade", "email": "fechamento9@propstarter.com.br", "pw": "Fe%9fPh"},
    {"uuid": "0d2b78a9-da1a-472d-a43a-e245a331dd21-v2", "cod": 2228, "condo": "todos", "nome": "Fechamento 10", "tipo": "contabilidade", "email": "fechamento10@propstarter.com.br", "pw": "Fe#10gPh"},
    {"uuid": "8b96c832-512a-4605-94ab-c161de42f06d-v2", "cod": 4008, "condo": "todos", "nome": "Fechamento 11", "tipo": "contabilidade", "email": "fechamento11@propstarter.com.br", "pw": "Fe!11hPh"},
    {"uuid": "664db9bb-9824-4550-96fb-fb1153131a56-v2", "cod": 5773, "condo": "todos", "nome": "Fechamento 12", "tipo": "contabilidade", "email": "fechamento12@propstarter.com.br", "pw": "Fe^12jPh"},
    {"uuid": "caf37465-9719-4f9d-809f-e97930e8bcf7-v2", "cod": 6328, "condo": "todos", "nome": "Fechamento 13", "role": "contabilidade", "email": "fechamento13@propstarter.com.br", "pw": "Fe*13kPh"},
    {"uuid": "01f74389-2172-472c-b99c-4b9991ed1242-v2", "cod": 1402, "condo": "todos", "nome": "Donner", "tipo": "emissao", "email": "emissao@propstarter.com.br", "pw": "Don#&83@"},
    {"uuid": "71b7230c-55c1-4813-97e4-a306fd5e4e54-v2", "cod": 6235, "condo": "todos", "nome": "Millena", "tipo": "emissao", "email": "seguranca@propstarter.com.br", "pw": "Mill@##3"}
]

async def sync():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        for u in USER_DATA:
            email = u["email"].strip().lower()
            nome = u["nome"]
            cod_u = u["cod"]
            pw_plain = u["pw"]
            role = ROLE_MAP.get(u.get("tipo", "geral").lower(), "geral")
            condo_codes = u["condo"]

            # Hash pass
            hashed = pwd_context.hash(pw_plain)

            print(f"Processing {email}...")

            # 1. Update/Insert in 'users'
            res = await db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email})
            row = res.fetchone()
            
            if row:
                uid = row[0]
                await db.execute(text("""
                    UPDATE users 
                    SET nome = :nome, senha_hash = :hash, role = :role, codigo_usuario = :cod, updated_at = now()
                    WHERE id = :id
                """), {"nome": nome, "hash": hashed, "role": role, "cod": cod_u, "id": uid})
                print(f"  Updated users: {email}")
            else:
                uid = uuid.uuid4()
                await db.execute(text("""
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario)
                    VALUES (:id, :nome, :email, :hash, :role, true, :cod)
                """), {"id": uid, "nome": nome, "email": email, "hash": hashed, "role": role, "cod": cod_u})
                print(f"  Inserted users: {email}")

            # 2. Update/Insert in 'database_usuarios' (legacy)
            # Use login as key
            await db.execute(text("""
                INSERT INTO database_usuarios ("login", "senha", "nomeUsuario", "tipo", "codigoUsuario", "codigoCondominio", "administradora")
                VALUES (:login, :senha, :nome, :tipo, :cod, :condo, 'Prop Starter')
                ON CONFLICT ("login") DO UPDATE SET
                    "senha" = EXCLUDED."senha",
                    "nomeUsuario" = EXCLUDED."nomeUsuario",
                    "tipo" = EXCLUDED."tipo",
                    "codigoUsuario" = EXCLUDED."codigoUsuario",
                    "codigoCondominio" = EXCLUDED."codigoCondominio"
            """), {
                "login": email,
                "senha": pw_plain, # spreadsheet has plain text
                "nome": nome,
                "tipo": u.get("tipo", "geral"),
                "cod": cod_u,
                "condo": condo_codes
            })

            # 3. Sync 'user_condominios'
            if condo_codes and "todos" not in condo_codes.lower():
                # Delete old links
                await db.execute(text("DELETE FROM user_condominios WHERE user_id = :uid"), {"uid": uid})
                
                codes = [c.strip() for c in condo_codes.split(",") if c.strip()]
                for code in codes:
                    # Resolve ID
                    c_res = await db.execute(text("SELECT id FROM condominios WHERE numero = :num LIMIT 1"), {"num": code})
                    c_row = c_res.fetchone()
                    if c_row:
                        cid = c_row[0]
                        await db.execute(text("""
                            INSERT INTO user_condominios (id, user_id, condominio_id)
                            VALUES (gen_random_uuid(), :uid, :cid)
                            ON CONFLICT (user_id, condominio_id) DO NOTHING
                        """), {"uid": uid, "cid": cid})

        await db.commit()
    print("Sync Done.")

if __name__ == "__main__":
    asyncio.run(sync())
