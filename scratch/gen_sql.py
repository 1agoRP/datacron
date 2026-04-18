import pandas as pd
from passlib.context import CryptContext

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

def escape_sql_string(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def main():
    excel_path = r'c:\Users\Iago R. Prado Man\.gemini\antigravity\Datacron\Users.xlsx'
    df = pd.read_excel(excel_path)
    df = df.where(pd.notnull(df), None)

    sql_statements = []
    
    # 1. Drop old table
    sql_statements.append("DROP TABLE IF EXISTS database_usuarios;")
    
    # Pre-parse users
    for index, row in df.iterrows():
        uudi = row.get("uudi")
        login = str(row.get("login", "")).strip() if row.get("login") is not None else ""
        nome = str(row.get("nomeUsuario", "")).strip() if row.get("nomeUsuario") is not None else ""
        senha = str(row.get("senha", "")).strip() if row.get("senha") is not None else ""
        tipo = str(row.get("tipo", "geral")).strip().lower() if row.get("tipo") is not None else "geral"
        
        codigo_usuario = row.get("codigoUsuario")
        codigo_usuario_sql = str(int(codigo_usuario)) if codigo_usuario is not None and not pd.isna(codigo_usuario) else "NULL"
        
        codigo_condominio = str(row.get("codigoCondominio", "")).strip() if row.get("codigoCondominio") is not None else ""
        administradora = str(row.get("administradora", "")).strip() if row.get("administradora") is not None else None
        
        gestor_usuarios = row.get("gestorUsuarios")
        gestor_fornecedor = row.get("gestorFornecedor")
        gestor_condominios = row.get("gestorCondominios")
        notificar_whatsapp = row.get("notificarWhatsapp")
        notificar_email = row.get("notificarEmail")
        
        if not login or not nome:
            continue

        role = ROLE_MAP.get(tipo, "geral")
        if str(uudi) == 'nan' or not uudi:
            uudi = None

        # Just hash the senha if provided, else datacron123 for default
        hash_val = pwd_context.hash(senha) if senha else pwd_context.hash("datacron123")
        
        uid_sql = escape_sql_string(uudi) if uudi else "gen_random_uuid()"
        login_sql = escape_sql_string(login)
        nome_sql = escape_sql_string(nome)
        hash_sql = escape_sql_string(hash_val)
        role_sql = escape_sql_string(role)
        admin_sql = escape_sql_string(administradora)
        cc_sql = escape_sql_string(codigo_condominio)
        gu_sql = escape_sql_string(gestor_usuarios)
        gf_sql = escape_sql_string(gestor_fornecedor)
        gc_sql = escape_sql_string(gestor_condominios)
        nw_sql = escape_sql_string(notificar_whatsapp)
        ne_sql = escape_sql_string(notificar_email)

        # Upsert user based on email (Wait, email is unique, we should handle ON CONFLICT on email? Wait, email is unique in users? Let's assume yes because it usually is, wait, we don't know if there is a unique constraint on email. Let's just DELETE and INSERT or UPDATE)
        # We can do an automated block:
        stmt = f"""
            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = {login_sql} LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = {nome_sql},
                        senha_hash = {hash_sql},
                        role = {role_sql},
                        codigo_usuario = {codigo_usuario_sql},
                        administradora = {admin_sql},
                        codigo_condominio = {cc_sql},
                        gestor_usuarios = {gu_sql},
                        gestor_fornecedor = {gf_sql},
                        gestor_condominios = {gc_sql},
                        notificar_whatsapp = {nw_sql},
                        notificar_email = {ne_sql},
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    {"v_uid := " + uid_sql + ";" if uudi else "v_uid := gen_random_uuid();"}
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, {nome_sql}, {login_sql}, {hash_sql}, {role_sql}, true, {codigo_usuario_sql}, {admin_sql}, {cc_sql}, {gu_sql}, {gf_sql}, {gc_sql}, {nw_sql}, {ne_sql});
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        """
        
        # Link user_condominios
        if codigo_condominio and str(codigo_condominio).lower() not in ["todos", "nan", "none"]:
            codes = [c.strip() for c in str(codigo_condominio).split(",") if c.strip()]
            for code in codes:
                code_sql = escape_sql_string(code)
                stmt += f"""
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = {code_sql} LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                """
        stmt += "END $$;"
        sql_statements.append(stmt)
        
    with open("scratch/sync_users_from_excel.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))
    
    print(f"Generated SQL for {len(sql_statements)-1} users to scratch/sync_users_from_excel.sql")

if __name__ == "__main__":
    main()
