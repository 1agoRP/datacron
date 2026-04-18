import uuid
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")

ROLE_MAP = {
    "admin": "admin",
    "supervisor": "admin",
    "subgerente": "admin",
    "gerencia": "gerencia",
    "assistente": "assistente",
    "contabilidade": "contabilidade",
    "concessionarias": "contabilidade",
    "emissao": "geral",
}

USER_DATA = [
    {"cod": 4328, "condo": "todos", "nome": "Iago R. Prado Man - Admin", "tipo": "admin", "email": "iago@propstarter.com.br", "pw": "Prop516@@#"},
    {"cod": 4794, "condo": "todos", "nome": "Admin Teste", "tipo": "supervisor", "email": "fernando@propstarter.com.br", "pw": "Prop536@@#"},
    {"cod": 6872, "condo": "14, 15, 61, 63, 104, 143, 178, 183, 201, 209, 210, 242, 254, 251, 267, 271, 280, 301, 340, 350, 359, 377, 395, 397, 412, 413, 411, 442, 447, 453, 159", "nome": "Danilo Sanjuan", "tipo": "assistente", "email": "assistente.gerencia@propstarter.com.br", "pw": "Dan$356##"},
    {"cod": 7654, "condo": "16, 64, 86, 137, 152, 183, 222, 254, 280, 308, 312, 323, 324, 335, 345, 360, 411, 426, 453, 454, 461, 465, 480", "nome": "Fernando Fernandes", "tipo": "assistente", "email": "assistente.gerencia1@propstarter.com.br", "pw": "Fer#2443$"},
    {"cod": 3105, "condo": "18, 25, 59, 103, 125, 127, 137, 202, 203, 229, 302, 307, 315, 326, 330, 341, 346, 366, 367, 373, 381, 394, 402, 403, 461, 474, 479", "nome": "Leonardo Pecoraro", "tipo": "assistente", "email": "assistente.gerencia10@propstarter.com.br", "pw": "Leo57&2#"},
    {"cod": 2518, "condo": "2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 230, 245, 248, 246, 288, 302, 322, 353, 365, 403, 410, 420, 423, 424, 437, 439, 443, 460, 465, 472, 477", "nome": "Jenifer Barros", "tipo": "assistente", "email": "assistente.gerencia11@propstarter.com.br", "pw": "Jeni50!#"},
    {"cod": 4028, "condo": "31, 52, 126, 141, 148, 155, 175, 185, 188, 224, 226, 240, 247, 243, 256, 277, 283, 284, 285, 314, 325, 344, 352, 388, 403, 415, 422, 430, 436, 446, 470, 471", "nome": "Gabriel Vieira", "tipo": "assistente", "email": "assistente.gerencia2@propstarter.com.br", "pw": "Gab323$@"},
    {"cod": 1303, "condo": "39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 278, 283, 294, 296, 297, 313, 317, 332, 353, 357, 375, 376, 404, 415, 431, 433, 464, 465, 375", "nome": "Fabiana Ferreira Fernandes", "tipo": "assistente", "email": "assistente.gerencia3@propstarter.com.br", "pw": "Fabi97@#"},
    {"cod": 3405, "condo": "45, 54, 62, 98, 107, 111, 112, 119, 131, 172, 178, 222, 293, 300, 313, 329, 334, 355, 371, 375, 395, 405, 418, 425, 427, 455, 467, 468, 472", "nome": "Pedro Henrique", "tipo": "assistente", "email": "assistente.gerencia5@propstarter.com.br", "pw": "Pedro#329"},
    {"cod": 6095, "condo": "6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 310, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479", "nome": "Iago R. Prado Man", "tipo": "assistente", "email": "assistente.gerencia7@propstarter.com.br", "pw": "Iago33@!"},
    {"cod": 1275, "condo": "7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458", "nome": "Victor Balanovski", "tipo": "assistente", "email": "assistente.gerencia8@propstarter.com.br", "pw": "Vic192@&"},
    {"cod": 5508, "condo": "3, 20, 68, 81, 94, 120, 153, 171, 221, 223, 252, 273, 274, 276, 282, 315, 340, 351, 355, 383, 402, 410, 440, 441, 445, 451, 452", "nome": "Silvia Macedo", "tipo": "assistente", "email": "assistente.gerencia9@propstarter.com.br", "pw": "Sil&231#"},
    {"cod": 2581, "condo": "todos", "nome": "concessionarias", "tipo": "concessionarias", "email": "concessionarias@propstarter.com.br", "pw": "Con@ss@0"},
    {"cod": 5402, "condo": "todos", "nome": "Contabilidade", "tipo": "contabilidade", "email": "contabilidade@propstarter.com.br", "pw": "Contab@#"},
    {"cod": 1028, "condo": "14, 15, 61, 63, 104, 143, 178, 183, 201, 209, 210, 242, 254, 251, 267, 271, 280, 301, 340, 350, 359, 377, 395, 397, 412, 413, 411, 442, 447, 453, 159", "nome": "Rodrigo Cavalcante", "tipo": "gerencia", "email": "rodrigo.cavalcante@propstarter.com.br", "pw": "Rodr2107#"},
    {"cod": 3885, "condo": "16, 64, 86, 137, 152, 183, 222, 254, 280, 308, 312, 323, 324, 335, 345, 360, 411, 426, 453, 454, 461, 465, 480", "nome": "Diogo dos Santos Andrade", "tipo": "gerencia", "email": "diogo@propstarter.com.br", "pw": "Diog#13!1"},
    {"cod": 3842, "condo": "18, 25, 59, 103, 125, 127, 137, 202, 203, 229, 302, 307, 315, 326, 330, 341, 346, 366, 367, 373, 381, 394, 402, 403, 461, 474, 479", "nome": "Sheilla Fonseca", "tipo": "gerencia", "email": "sheilla@propstarter.com.br", "pw": "Shei4!@!"},
    {"cod": 2307, "condo": "2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 230, 245, 248, 246, 288, 302, 322, 353, 365, 403, 410, 420, 423, 424, 437, 439, 443, 460, 465, 472, 477", "nome": "Aline Haick", "tipo": "gerencia", "email": "aline@propstarter.com.br", "pw": "Ali!98m$"},
    {"cod": 1102, "condo": "31, 52, 126, 141, 148, 155, 175, 185, 188, 224, 226, 240, 247, 243, 256, 277, 283, 284, 285, 314, 325, 344, 352, 388, 403, 415, 422, 430, 436, 446, 470, 471", "nome": "Natalia Merlim", "tipo": "gerencia", "email": "natalia@propstarter.com.br", "pw": "Nat@!#47"},
    {"cod": 2102, "condo": "39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 278, 283, 294, 296, 297, 313, 317, 332, 353, 357, 375, 376, 404, 415, 431, 433, 464, 465, 375", "nome": "Eduardo Arrendato", "tipo": "gerencia", "email": "eduardo@propstarter.com.br", "pw": "Edu!@#11"},
    {"cod": 3328, "condo": "45, 54, 62, 98, 107, 111, 112, 119, 131, 172, 178, 222, 293, 300, 313, 329, 334, 355, 371, 375, 395, 405, 418, 425, 427, 455, 467, 468, 472", "nome": "Juliana Ferraro", "tipo": "gerencia", "email": "juliana.ferraro@propstarter.com.br", "pw": "Juli@!#9"},
    {"cod": 3154, "condo": "6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 310, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479", "nome": "Moizes Junior", "tipo": "gerencia", "email": "moizes@propstarter.com.br", "pw": "Moiz!!3#"},
    {"cod": 1928, "condo": "7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458", "nome": "Pedro Ferreira", "tipo": "gerencia", "email": "pedrof@propstarter.com.br", "pw": "PeF#!!4h"},
    {"cod": 3374, "condo": "3, 20, 68, 81, 94, 120, 153, 171, 221, 223, 252, 273, 274, 276, 282, 315, 340, 351, 355, 383, 402, 410, 440, 441, 445, 451, 452", "nome": "Marina Leite", "tipo": "gerencia", "email": "marina@propstarter.com.br", "pw": "Mari3!@1"},
    {"cod": 1124, "condo": "todos", "nome": "Eduardo Pereira Bardella", "tipo": "supervisor", "email": "pbardella@propstarter.com.br", "pw": "Edu#!!1a"},
    {"cod": 2155, "condo": "7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458", "nome": "Valter Balanovski", "tipo": "subgerente", "email": "valter@propstarter.com.br", "pw": "Valt!3!0"},
    {"cod": 3110, "condo": "todos", "nome": "Fechamento 01", "tipo": "contabilidade", "email": "fechamento1@propstarter.com.br", "pw": "Fe#1@Ph"},
    {"cod": 1225, "condo": "todos", "nome": "Fechamento 02", "tipo": "contabilidade", "email": "fechamento2@propstarter.com.br", "pw": "Fe%2*Ph"},
    {"cod": 3322, "condo": "todos", "nome": "Fechamento 03", "tipo": "contabilidade", "email": "fechamento3@propstarter.com.br", "pw": "Fe%3#Ph"},
    {"cod": 8225, "condo": "todos", "nome": "Fechamento 04", "tipo": "contabilidade", "email": "fechamento4@propstarter.com.br", "pw": "Fe$4!Ph"},
    {"cod": 1322, "condo": "todos", "nome": "Fechamento 05", "tipo": "contabilidade", "email": "fechamento5@propstarter.com.br", "pw": "Fe&5bPh"},
    {"cod": 4872, "condo": "todos", "nome": "Fechamento 06", "tipo": "contabilidade", "email": "fechamento6@propstarter.com.br", "pw": "Fe#6aPh"},
    {"cod": 5271, "condo": "todos", "nome": "Fechamento 07", "tipo": "contabilidade", "email": "fechamento7@propstarter.com.br", "pw": "Fe+7cPh"},
    {"cod": 3317, "condo": "todos", "nome": "Fechamento 08", "tipo": "contabilidade", "email": "fechamento8@propstarter.com.br", "pw": "Fe=dePh"},
    {"cod": 2337, "condo": "todos", "nome": "Fechamento 09", "tipo": "contabilidade", "email": "fechamento9@propstarter.com.br", "pw": "Fe%9fPh"},
    {"cod": 2228, "condo": "todos", "nome": "Fechamento 10", "tipo": "contabilidade", "email": "fechamento10@propstarter.com.br", "pw": "Fe#10gPh"},
    {"cod": 4008, "condo": "todos", "nome": "Fechamento 11", "tipo": "contabilidade", "email": "fechamento11@propstarter.com.br", "pw": "Fe!11hPh"},
    {"cod": 5773, "condo": "todos", "nome": "Fechamento 12", "tipo": "contabilidade", "email": "fechamento12@propstarter.com.br", "pw": "Fe^12jPh"},
    {"cod": 6328, "condo": "todos", "nome": "Fechamento 13", "tipo": "contabilidade", "email": "fechamento13@propstarter.com.br", "pw": "Fe*13kPh"},
    {"cod": 1402, "condo": "todos", "nome": "Donner", "tipo": "emissao", "email": "emissao@propstarter.com.br", "pw": "Don#&83@"},
    {"cod": 6235, "condo": "todos", "nome": "Millena", "tipo": "emissao", "email": "seguranca@propstarter.com.br", "pw": "Mill@##3"}
]

sql_script = ""

for u in USER_DATA:
    email = u["email"].strip().lower()
    nome = u["nome"]
    cod_u = u["cod"]
    pw_plain = u["pw"]
    role = ROLE_MAP.get(u.get("tipo", "geral").lower(), "geral")
    condo_codes = u["condo"]
    hashed = pwd_context.hash(pw_plain)
    
    sql_script += f"""
DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = '{email}';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, '{nome}', '{email}', '{hashed}', '{role}', true, {cod_u}, now());
    ELSE
        UPDATE users SET nome = '{nome}', senha_hash = '{hashed}', role = '{role}', codigo_usuario = {cod_u}, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = '{email}';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, '{email}', '{pw_plain}', '{nome}', '{u.get("tipo", "geral")}', {cod_u}, '{condo_codes}', 'Prop Starter', now());

    -- user_condominios links
    IF '{condo_codes}' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('{condo_codes}', ' ', ''), ','));
    END IF;
END $$;
"""

print(sql_script)
