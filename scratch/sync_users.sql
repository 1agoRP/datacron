
DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'iago@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Iago R. Prado Man - Admin', 'iago@propstarter.com.br', '$pbkdf2-sha256$29000$KqXUGuPc.59TKgXgfG.ttQ$YDuMgIAKayDMzLlLeq7nEy9B/wVnopgYp6zL5cw7qsc', 'admin', true, 4328, now());
    ELSE
        UPDATE users SET nome = 'Iago R. Prado Man - Admin', senha_hash = '$pbkdf2-sha256$29000$KqXUGuPc.59TKgXgfG.ttQ$YDuMgIAKayDMzLlLeq7nEy9B/wVnopgYp6zL5cw7qsc', role = 'admin', codigo_usuario = 4328, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'iago@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'iago@propstarter.com.br', 'Prop516@@#', 'Iago R. Prado Man - Admin', 'admin', 4328, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fernando@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Admin Teste', 'fernando@propstarter.com.br', '$pbkdf2-sha256$29000$GINQas1Zy5nznrN2bo2RUg$3D8FccB2Ow3DHn.htvss8QZN39ZnaktEZTn0bhF8L5Y', 'admin', true, 4794, now());
    ELSE
        UPDATE users SET nome = 'Admin Teste', senha_hash = '$pbkdf2-sha256$29000$GINQas1Zy5nznrN2bo2RUg$3D8FccB2Ow3DHn.htvss8QZN39ZnaktEZTn0bhF8L5Y', role = 'admin', codigo_usuario = 4794, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fernando@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fernando@propstarter.com.br', 'Prop536@@#', 'Admin Teste', 'supervisor', 4794, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'assistente.gerencia@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Danilo Sanjuan', 'assistente.gerencia@propstarter.com.br', '$pbkdf2-sha256$29000$uRdCKIVwbm1NiZFSKoWwdg$zwRVj.ryGPth.vfVntwHrpF.Z.52YY5eDMGn4pHeLWk', 'assistente', true, 6872, now());
    ELSE
        UPDATE users SET nome = 'Danilo Sanjuan', senha_hash = '$pbkdf2-sha256$29000$uRdCKIVwbm1NiZFSKoWwdg$zwRVj.ryGPth.vfVntwHrpF.Z.52YY5eDMGn4pHeLWk', role = 'assistente', codigo_usuario = 6872, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'assistente.gerencia@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'assistente.gerencia@propstarter.com.br', 'Dan$356##', 'Danilo Sanjuan', 'assistente', 6872, '14, 15, 61, 63, 104, 143, 178, 183, 201, 209, 210, 242, 254, 251, 267, 271, 280, 301, 340, 350, 359, 377, 395, 397, 412, 413, 411, 442, 447, 453, 159', 'Prop Starter', now());

    -- user_condominios links
    IF '14, 15, 61, 63, 104, 143, 178, 183, 201, 209, 210, 242, 254, 251, 267, 271, 280, 301, 340, 350, 359, 377, 395, 397, 412, 413, 411, 442, 447, 453, 159' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('14, 15, 61, 63, 104, 143, 178, 183, 201, 209, 210, 242, 254, 251, 267, 271, 280, 301, 340, 350, 359, 377, 395, 397, 412, 413, 411, 442, 447, 453, 159', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'assistente.gerencia1@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fernando Fernandes', 'assistente.gerencia1@propstarter.com.br', '$pbkdf2-sha256$29000$rvX.P2esNWas1dqbE.Kccw$VY7beKI.9HwNlytHAiK4CwajI0uQzHVXG1s/JYMkuL8', 'assistente', true, 7654, now());
    ELSE
        UPDATE users SET nome = 'Fernando Fernandes', senha_hash = '$pbkdf2-sha256$29000$rvX.P2esNWas1dqbE.Kccw$VY7beKI.9HwNlytHAiK4CwajI0uQzHVXG1s/JYMkuL8', role = 'assistente', codigo_usuario = 7654, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'assistente.gerencia1@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'assistente.gerencia1@propstarter.com.br', 'Fer#2443$', 'Fernando Fernandes', 'assistente', 7654, '16, 64, 86, 137, 152, 183, 222, 254, 280, 308, 312, 323, 324, 335, 345, 360, 411, 426, 453, 454, 461, 465, 480', 'Prop Starter', now());

    -- user_condominios links
    IF '16, 64, 86, 137, 152, 183, 222, 254, 280, 308, 312, 323, 324, 335, 345, 360, 411, 426, 453, 454, 461, 465, 480' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('16, 64, 86, 137, 152, 183, 222, 254, 280, 308, 312, 323, 324, 335, 345, 360, 411, 426, 453, 454, 461, 465, 480', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'assistente.gerencia10@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Leonardo Pecoraro', 'assistente.gerencia10@propstarter.com.br', '$pbkdf2-sha256$29000$NMbYG8O4V6oVIqQUAiBkjA$k63pVOHFKucKqJVY0yq9IsAF6zO7pPxGVb0TZhlh79g', 'assistente', true, 3105, now());
    ELSE
        UPDATE users SET nome = 'Leonardo Pecoraro', senha_hash = '$pbkdf2-sha256$29000$NMbYG8O4V6oVIqQUAiBkjA$k63pVOHFKucKqJVY0yq9IsAF6zO7pPxGVb0TZhlh79g', role = 'assistente', codigo_usuario = 3105, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'assistente.gerencia10@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'assistente.gerencia10@propstarter.com.br', 'Leo57&2#', 'Leonardo Pecoraro', 'assistente', 3105, '18, 25, 59, 103, 125, 127, 137, 202, 203, 229, 302, 307, 315, 326, 330, 341, 346, 366, 367, 373, 381, 394, 402, 403, 461, 474, 479', 'Prop Starter', now());

    -- user_condominios links
    IF '18, 25, 59, 103, 125, 127, 137, 202, 203, 229, 302, 307, 315, 326, 330, 341, 346, 366, 367, 373, 381, 394, 402, 403, 461, 474, 479' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('18, 25, 59, 103, 125, 127, 137, 202, 203, 229, 302, 307, 315, 326, 330, 341, 346, 366, 367, 373, 381, 394, 402, 403, 461, 474, 479', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'assistente.gerencia11@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Jenifer Barros', 'assistente.gerencia11@propstarter.com.br', '$pbkdf2-sha256$29000$YMyZc845J4TwvpfSek/JWQ$XLdCzrCMHOVaBgqZdP/o9BS35CRvM.9QQkO4FmahpE4', 'assistente', true, 2518, now());
    ELSE
        UPDATE users SET nome = 'Jenifer Barros', senha_hash = '$pbkdf2-sha256$29000$YMyZc845J4TwvpfSek/JWQ$XLdCzrCMHOVaBgqZdP/o9BS35CRvM.9QQkO4FmahpE4', role = 'assistente', codigo_usuario = 2518, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'assistente.gerencia11@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'assistente.gerencia11@propstarter.com.br', 'Jeni50!#', 'Jenifer Barros', 'assistente', 2518, '2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 230, 245, 248, 246, 288, 302, 322, 353, 365, 403, 410, 420, 423, 424, 437, 439, 443, 460, 465, 472, 477', 'Prop Starter', now());

    -- user_condominios links
    IF '2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 230, 245, 248, 246, 288, 302, 322, 353, 365, 403, 410, 420, 423, 424, 437, 439, 443, 460, 465, 472, 477' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 230, 245, 248, 246, 288, 302, 322, 353, 365, 403, 410, 420, 423, 424, 437, 439, 443, 460, 465, 472, 477', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'assistente.gerencia2@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Gabriel Vieira', 'assistente.gerencia2@propstarter.com.br', '$pbkdf2-sha256$29000$kXLuvfdeS2nNWSsFgHAOwQ$5PQuXKY0YJe0xqwUc7gEH.DObV8nXQIJTocydv8j2SM', 'assistente', true, 4028, now());
    ELSE
        UPDATE users SET nome = 'Gabriel Vieira', senha_hash = '$pbkdf2-sha256$29000$kXLuvfdeS2nNWSsFgHAOwQ$5PQuXKY0YJe0xqwUc7gEH.DObV8nXQIJTocydv8j2SM', role = 'assistente', codigo_usuario = 4028, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'assistente.gerencia2@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'assistente.gerencia2@propstarter.com.br', 'Gab323$@', 'Gabriel Vieira', 'assistente', 4028, '31, 52, 126, 141, 148, 155, 175, 185, 188, 224, 226, 240, 247, 243, 256, 277, 283, 284, 285, 314, 325, 344, 352, 388, 403, 415, 422, 430, 436, 446, 470, 471', 'Prop Starter', now());

    -- user_condominios links
    IF '31, 52, 126, 141, 148, 155, 175, 185, 188, 224, 226, 240, 247, 243, 256, 277, 283, 284, 285, 314, 325, 344, 352, 388, 403, 415, 422, 430, 436, 446, 470, 471' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('31, 52, 126, 141, 148, 155, 175, 185, 188, 224, 226, 240, 247, 243, 256, 277, 283, 284, 285, 314, 325, 344, 352, 388, 403, 415, 422, 430, 436, 446, 470, 471', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'assistente.gerencia3@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fabiana Ferreira Fernandes', 'assistente.gerencia3@propstarter.com.br', '$pbkdf2-sha256$29000$CCFk7J3T.h9jbO0d47xXqg$lWdz7oob02KZPOkA9G4bdctwFtW/CilN2UrCiTPZUcw', 'assistente', true, 1303, now());
    ELSE
        UPDATE users SET nome = 'Fabiana Ferreira Fernandes', senha_hash = '$pbkdf2-sha256$29000$CCFk7J3T.h9jbO0d47xXqg$lWdz7oob02KZPOkA9G4bdctwFtW/CilN2UrCiTPZUcw', role = 'assistente', codigo_usuario = 1303, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'assistente.gerencia3@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'assistente.gerencia3@propstarter.com.br', 'Fabi97@#', 'Fabiana Ferreira Fernandes', 'assistente', 1303, '39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 278, 283, 294, 296, 297, 313, 317, 332, 353, 357, 375, 376, 404, 415, 431, 433, 464, 465, 375', 'Prop Starter', now());

    -- user_condominios links
    IF '39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 278, 283, 294, 296, 297, 313, 317, 332, 353, 357, 375, 376, 404, 415, 431, 433, 464, 465, 375' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 278, 283, 294, 296, 297, 313, 317, 332, 353, 357, 375, 376, 404, 415, 431, 433, 464, 465, 375', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'assistente.gerencia5@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Pedro Henrique', 'assistente.gerencia5@propstarter.com.br', '$pbkdf2-sha256$29000$.N9b692bc27tnTMGoBRibA$uyvd8DZqTChqPh48loxMh9JhKxUvzV2dWYqkcJiTSQg', 'assistente', true, 3405, now());
    ELSE
        UPDATE users SET nome = 'Pedro Henrique', senha_hash = '$pbkdf2-sha256$29000$.N9b692bc27tnTMGoBRibA$uyvd8DZqTChqPh48loxMh9JhKxUvzV2dWYqkcJiTSQg', role = 'assistente', codigo_usuario = 3405, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'assistente.gerencia5@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'assistente.gerencia5@propstarter.com.br', 'Pedro#329', 'Pedro Henrique', 'assistente', 3405, '45, 54, 62, 98, 107, 111, 112, 119, 131, 172, 178, 222, 293, 300, 313, 329, 334, 355, 371, 375, 395, 405, 418, 425, 427, 455, 467, 468, 472', 'Prop Starter', now());

    -- user_condominios links
    IF '45, 54, 62, 98, 107, 111, 112, 119, 131, 172, 178, 222, 293, 300, 313, 329, 334, 355, 371, 375, 395, 405, 418, 425, 427, 455, 467, 468, 472' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('45, 54, 62, 98, 107, 111, 112, 119, 131, 172, 178, 222, 293, 300, 313, 329, 334, 355, 371, 375, 395, 405, 418, 425, 427, 455, 467, 468, 472', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'assistente.gerencia7@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Iago R. Prado Man', 'assistente.gerencia7@propstarter.com.br', '$pbkdf2-sha256$29000$r9Uag1DKGeO8txYipHQu5Q$H8EsuVbGZek9LiSabWmftLgjLAx/Em5Dc2hsjIdXOuM', 'assistente', true, 6095, now());
    ELSE
        UPDATE users SET nome = 'Iago R. Prado Man', senha_hash = '$pbkdf2-sha256$29000$r9Uag1DKGeO8txYipHQu5Q$H8EsuVbGZek9LiSabWmftLgjLAx/Em5Dc2hsjIdXOuM', role = 'assistente', codigo_usuario = 6095, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'assistente.gerencia7@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'assistente.gerencia7@propstarter.com.br', 'Iago33@!', 'Iago R. Prado Man', 'assistente', 6095, '6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 310, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479', 'Prop Starter', now());

    -- user_condominios links
    IF '6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 310, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 310, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'assistente.gerencia8@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Victor Balanovski', 'assistente.gerencia8@propstarter.com.br', '$pbkdf2-sha256$29000$kfI.x3jPuXcOoZTyntNayw$CPPK5aJM9SPuE6hLHxlsZUZsJABzN/6pSffpLDyc0ho', 'assistente', true, 1275, now());
    ELSE
        UPDATE users SET nome = 'Victor Balanovski', senha_hash = '$pbkdf2-sha256$29000$kfI.x3jPuXcOoZTyntNayw$CPPK5aJM9SPuE6hLHxlsZUZsJABzN/6pSffpLDyc0ho', role = 'assistente', codigo_usuario = 1275, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'assistente.gerencia8@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'assistente.gerencia8@propstarter.com.br', 'Vic192@&', 'Victor Balanovski', 'assistente', 1275, '7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458', 'Prop Starter', now());

    -- user_condominios links
    IF '7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'assistente.gerencia9@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Silvia Macedo', 'assistente.gerencia9@propstarter.com.br', '$pbkdf2-sha256$29000$JWQspTRGaI1RypkTolSKcQ$d.SvcxjUA.BzF.J0X47Fbr5j/a/Kc8J0gLAhhSVFUAI', 'assistente', true, 5508, now());
    ELSE
        UPDATE users SET nome = 'Silvia Macedo', senha_hash = '$pbkdf2-sha256$29000$JWQspTRGaI1RypkTolSKcQ$d.SvcxjUA.BzF.J0X47Fbr5j/a/Kc8J0gLAhhSVFUAI', role = 'assistente', codigo_usuario = 5508, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'assistente.gerencia9@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'assistente.gerencia9@propstarter.com.br', 'Sil&231#', 'Silvia Macedo', 'assistente', 5508, '3, 20, 68, 81, 94, 120, 153, 171, 221, 223, 252, 273, 274, 276, 282, 315, 340, 351, 355, 383, 402, 410, 440, 441, 445, 451, 452', 'Prop Starter', now());

    -- user_condominios links
    IF '3, 20, 68, 81, 94, 120, 153, 171, 221, 223, 252, 273, 274, 276, 282, 315, 340, 351, 355, 383, 402, 410, 440, 441, 445, 451, 452' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('3, 20, 68, 81, 94, 120, 153, 171, 221, 223, 252, 273, 274, 276, 282, 315, 340, 351, 355, 383, 402, 410, 440, 441, 445, 451, 452', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'concessionarias@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'concessionarias', 'concessionarias@propstarter.com.br', '$pbkdf2-sha256$29000$ihGCMCaEsDbGOAeglBJi7A$y8YPiWzvy67Cx2vjCkIfMP7smwRcEh4mRePhxcj545c', 'contabilidade', true, 2581, now());
    ELSE
        UPDATE users SET nome = 'concessionarias', senha_hash = '$pbkdf2-sha256$29000$ihGCMCaEsDbGOAeglBJi7A$y8YPiWzvy67Cx2vjCkIfMP7smwRcEh4mRePhxcj545c', role = 'contabilidade', codigo_usuario = 2581, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'concessionarias@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'concessionarias@propstarter.com.br', 'Con@ss@0', 'concessionarias', 'concessionarias', 2581, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'contabilidade@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Contabilidade', 'contabilidade@propstarter.com.br', '$pbkdf2-sha256$29000$D4Hwvtea07qXkjKG8D5HqA$abFYIFImsZNDYK4JeldCtgI.i9PMZaFA6nYdW76iYc0', 'contabilidade', true, 5402, now());
    ELSE
        UPDATE users SET nome = 'Contabilidade', senha_hash = '$pbkdf2-sha256$29000$D4Hwvtea07qXkjKG8D5HqA$abFYIFImsZNDYK4JeldCtgI.i9PMZaFA6nYdW76iYc0', role = 'contabilidade', codigo_usuario = 5402, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'contabilidade@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'contabilidade@propstarter.com.br', 'Contab@#', 'Contabilidade', 'contabilidade', 5402, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'rodrigo.cavalcante@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Rodrigo Cavalcante', 'rodrigo.cavalcante@propstarter.com.br', '$pbkdf2-sha256$29000$lNJay9nbWyslxDjH2DsHoA$V6dh5aSahU7ddD8qiM9.HNBuAHHyZEEqBiSV901FmAU', 'gerencia', true, 1028, now());
    ELSE
        UPDATE users SET nome = 'Rodrigo Cavalcante', senha_hash = '$pbkdf2-sha256$29000$lNJay9nbWyslxDjH2DsHoA$V6dh5aSahU7ddD8qiM9.HNBuAHHyZEEqBiSV901FmAU', role = 'gerencia', codigo_usuario = 1028, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'rodrigo.cavalcante@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'rodrigo.cavalcante@propstarter.com.br', 'Rodr2107#', 'Rodrigo Cavalcante', 'gerencia', 1028, '14, 15, 61, 63, 104, 143, 178, 183, 201, 209, 210, 242, 254, 251, 267, 271, 280, 301, 340, 350, 359, 377, 395, 397, 412, 413, 411, 442, 447, 453, 159', 'Prop Starter', now());

    -- user_condominios links
    IF '14, 15, 61, 63, 104, 143, 178, 183, 201, 209, 210, 242, 254, 251, 267, 271, 280, 301, 340, 350, 359, 377, 395, 397, 412, 413, 411, 442, 447, 453, 159' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('14, 15, 61, 63, 104, 143, 178, 183, 201, 209, 210, 242, 254, 251, 267, 271, 280, 301, 340, 350, 359, 377, 395, 397, 412, 413, 411, 442, 447, 453, 159', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'diogo@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Diogo dos Santos Andrade', 'diogo@propstarter.com.br', '$pbkdf2-sha256$29000$SgmhdO6dE4JwrnWOkVJqbQ$VNT6Pj83qGhOTR/AOZPf3qNmpYOnmvOwqDjC93bOuR8', 'gerencia', true, 3885, now());
    ELSE
        UPDATE users SET nome = 'Diogo dos Santos Andrade', senha_hash = '$pbkdf2-sha256$29000$SgmhdO6dE4JwrnWOkVJqbQ$VNT6Pj83qGhOTR/AOZPf3qNmpYOnmvOwqDjC93bOuR8', role = 'gerencia', codigo_usuario = 3885, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'diogo@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'diogo@propstarter.com.br', 'Diog#13!1', 'Diogo dos Santos Andrade', 'gerencia', 3885, '16, 64, 86, 137, 152, 183, 222, 254, 280, 308, 312, 323, 324, 335, 345, 360, 411, 426, 453, 454, 461, 465, 480', 'Prop Starter', now());

    -- user_condominios links
    IF '16, 64, 86, 137, 152, 183, 222, 254, 280, 308, 312, 323, 324, 335, 345, 360, 411, 426, 453, 454, 461, 465, 480' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('16, 64, 86, 137, 152, 183, 222, 254, 280, 308, 312, 323, 324, 335, 345, 360, 411, 426, 453, 454, 461, 465, 480', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'sheilla@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Sheilla Fonseca', 'sheilla@propstarter.com.br', '$pbkdf2-sha256$29000$opSSEoLQ.v9/zxkDQKgVog$TmjKEXXMCqmX/6g8S2ZUTRjq.cFu0jPT1xYvTMTYRN8', 'gerencia', true, 3842, now());
    ELSE
        UPDATE users SET nome = 'Sheilla Fonseca', senha_hash = '$pbkdf2-sha256$29000$opSSEoLQ.v9/zxkDQKgVog$TmjKEXXMCqmX/6g8S2ZUTRjq.cFu0jPT1xYvTMTYRN8', role = 'gerencia', codigo_usuario = 3842, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'sheilla@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'sheilla@propstarter.com.br', 'Shei4!@!', 'Sheilla Fonseca', 'gerencia', 3842, '18, 25, 59, 103, 125, 127, 137, 202, 203, 229, 302, 307, 315, 326, 330, 341, 346, 366, 367, 373, 381, 394, 402, 403, 461, 474, 479', 'Prop Starter', now());

    -- user_condominios links
    IF '18, 25, 59, 103, 125, 127, 137, 202, 203, 229, 302, 307, 315, 326, 330, 341, 346, 366, 367, 373, 381, 394, 402, 403, 461, 474, 479' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('18, 25, 59, 103, 125, 127, 137, 202, 203, 229, 302, 307, 315, 326, 330, 341, 346, 366, 367, 373, 381, 394, 402, 403, 461, 474, 479', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'aline@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Aline Haick', 'aline@propstarter.com.br', '$pbkdf2-sha256$29000$Y2ytFQIgJOT8HyNESOk9pw$XBFwMJivsP48JWyScFGuKfOwo1U/TEn0H01xq6uAMns', 'gerencia', true, 2307, now());
    ELSE
        UPDATE users SET nome = 'Aline Haick', senha_hash = '$pbkdf2-sha256$29000$Y2ytFQIgJOT8HyNESOk9pw$XBFwMJivsP48JWyScFGuKfOwo1U/TEn0H01xq6uAMns', role = 'gerencia', codigo_usuario = 2307, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'aline@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'aline@propstarter.com.br', 'Ali!98m$', 'Aline Haick', 'gerencia', 2307, '2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 230, 245, 248, 246, 288, 302, 322, 353, 365, 403, 410, 420, 423, 424, 437, 439, 443, 460, 465, 472, 477', 'Prop Starter', now());

    -- user_condominios links
    IF '2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 230, 245, 248, 246, 288, 302, 322, 353, 365, 403, 410, 420, 423, 424, 437, 439, 443, 460, 465, 472, 477' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 230, 245, 248, 246, 288, 302, 322, 353, 365, 403, 410, 420, 423, 424, 437, 439, 443, 460, 465, 472, 477', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'natalia@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Natalia Merlim', 'natalia@propstarter.com.br', '$pbkdf2-sha256$29000$2bs35rz3HoNQau3du3cOIQ$qS52e9tKACt77M8WLeI0LUKrIyGmMHJNe4HwCN8ZTFA', 'gerencia', true, 1102, now());
    ELSE
        UPDATE users SET nome = 'Natalia Merlim', senha_hash = '$pbkdf2-sha256$29000$2bs35rz3HoNQau3du3cOIQ$qS52e9tKACt77M8WLeI0LUKrIyGmMHJNe4HwCN8ZTFA', role = 'gerencia', codigo_usuario = 1102, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'natalia@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'natalia@propstarter.com.br', 'Nat@!#47', 'Natalia Merlim', 'gerencia', 1102, '31, 52, 126, 141, 148, 155, 175, 185, 188, 224, 226, 240, 247, 243, 256, 277, 283, 284, 285, 314, 325, 344, 352, 388, 403, 415, 422, 430, 436, 446, 470, 471', 'Prop Starter', now());

    -- user_condominios links
    IF '31, 52, 126, 141, 148, 155, 175, 185, 188, 224, 226, 240, 247, 243, 256, 277, 283, 284, 285, 314, 325, 344, 352, 388, 403, 415, 422, 430, 436, 446, 470, 471' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('31, 52, 126, 141, 148, 155, 175, 185, 188, 224, 226, 240, 247, 243, 256, 277, 283, 284, 285, 314, 325, 344, 352, 388, 403, 415, 422, 430, 436, 446, 470, 471', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'eduardo@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Eduardo Arrendato', 'eduardo@propstarter.com.br', '$pbkdf2-sha256$29000$XYsxhtD6HyMkREgppZSydg$scyZIVc4A/Vh5oD2iFqs3MPBPBaH/jznHtJtcpL/zBc', 'gerencia', true, 2102, now());
    ELSE
        UPDATE users SET nome = 'Eduardo Arrendato', senha_hash = '$pbkdf2-sha256$29000$XYsxhtD6HyMkREgppZSydg$scyZIVc4A/Vh5oD2iFqs3MPBPBaH/jznHtJtcpL/zBc', role = 'gerencia', codigo_usuario = 2102, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'eduardo@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'eduardo@propstarter.com.br', 'Edu!@#11', 'Eduardo Arrendato', 'gerencia', 2102, '39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 278, 283, 294, 296, 297, 313, 317, 332, 353, 357, 375, 376, 404, 415, 431, 433, 464, 465, 375', 'Prop Starter', now());

    -- user_condominios links
    IF '39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 278, 283, 294, 296, 297, 313, 317, 332, 353, 357, 375, 376, 404, 415, 431, 433, 464, 465, 375' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 278, 283, 294, 296, 297, 313, 317, 332, 353, 357, 375, 376, 404, 415, 431, 433, 464, 465, 375', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'juliana.ferraro@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Juliana Ferraro', 'juliana.ferraro@propstarter.com.br', '$pbkdf2-sha256$29000$tfYeA8B4T2nNeS8FgNAaow$AAgX0hZdgpk5hjAPdUtke/9Sb2Usag5bAdbT4MnBx9s', 'gerencia', true, 3328, now());
    ELSE
        UPDATE users SET nome = 'Juliana Ferraro', senha_hash = '$pbkdf2-sha256$29000$tfYeA8B4T2nNeS8FgNAaow$AAgX0hZdgpk5hjAPdUtke/9Sb2Usag5bAdbT4MnBx9s', role = 'gerencia', codigo_usuario = 3328, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'juliana.ferraro@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'juliana.ferraro@propstarter.com.br', 'Juli@!#9', 'Juliana Ferraro', 'gerencia', 3328, '45, 54, 62, 98, 107, 111, 112, 119, 131, 172, 178, 222, 293, 300, 313, 329, 334, 355, 371, 375, 395, 405, 418, 425, 427, 455, 467, 468, 472', 'Prop Starter', now());

    -- user_condominios links
    IF '45, 54, 62, 98, 107, 111, 112, 119, 131, 172, 178, 222, 293, 300, 313, 329, 334, 355, 371, 375, 395, 405, 418, 425, 427, 455, 467, 468, 472' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('45, 54, 62, 98, 107, 111, 112, 119, 131, 172, 178, 222, 293, 300, 313, 329, 334, 355, 371, 375, 395, 405, 418, 425, 427, 455, 467, 468, 472', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'moizes@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Moizes Junior', 'moizes@propstarter.com.br', '$pbkdf2-sha256$29000$TElpbY1RKkVoDWGMMSZEiA$knGqiylGTv2CaA5s2Fs.8ROLQbVhhP8nqFnOP0puA5o', 'gerencia', true, 3154, now());
    ELSE
        UPDATE users SET nome = 'Moizes Junior', senha_hash = '$pbkdf2-sha256$29000$TElpbY1RKkVoDWGMMSZEiA$knGqiylGTv2CaA5s2Fs.8ROLQbVhhP8nqFnOP0puA5o', role = 'gerencia', codigo_usuario = 3154, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'moizes@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'moizes@propstarter.com.br', 'Moiz!!3#', 'Moizes Junior', 'gerencia', 3154, '6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 310, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479', 'Prop Starter', now());

    -- user_condominios links
    IF '6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 310, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 310, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'pedrof@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Pedro Ferreira', 'pedrof@propstarter.com.br', '$pbkdf2-sha256$29000$E2JsDSHE2FurdY7RmlPKWQ$gioXlhjUuQokpvRYJ6B3ZfemhUkHOZit8fbqE1dh5YU', 'gerencia', true, 1928, now());
    ELSE
        UPDATE users SET nome = 'Pedro Ferreira', senha_hash = '$pbkdf2-sha256$29000$E2JsDSHE2FurdY7RmlPKWQ$gioXlhjUuQokpvRYJ6B3ZfemhUkHOZit8fbqE1dh5YU', role = 'gerencia', codigo_usuario = 1928, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'pedrof@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'pedrof@propstarter.com.br', 'PeF#!!4h', 'Pedro Ferreira', 'gerencia', 1928, '7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458', 'Prop Starter', now());

    -- user_condominios links
    IF '7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'marina@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Marina Leite', 'marina@propstarter.com.br', '$pbkdf2-sha256$29000$u1fKuZeS0pozJoSQsrZWCg$V34E9Oz994NSiZs7N3RPuSNf2W5pJbaCakIoHeJ18Vs', 'gerencia', true, 3374, now());
    ELSE
        UPDATE users SET nome = 'Marina Leite', senha_hash = '$pbkdf2-sha256$29000$u1fKuZeS0pozJoSQsrZWCg$V34E9Oz994NSiZs7N3RPuSNf2W5pJbaCakIoHeJ18Vs', role = 'gerencia', codigo_usuario = 3374, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'marina@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'marina@propstarter.com.br', 'Mari3!@1', 'Marina Leite', 'gerencia', 3374, '3, 20, 68, 81, 94, 120, 153, 171, 221, 223, 252, 273, 274, 276, 282, 315, 340, 351, 355, 383, 402, 410, 440, 441, 445, 451, 452', 'Prop Starter', now());

    -- user_condominios links
    IF '3, 20, 68, 81, 94, 120, 153, 171, 221, 223, 252, 273, 274, 276, 282, 315, 340, 351, 355, 383, 402, 410, 440, 441, 445, 451, 452' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('3, 20, 68, 81, 94, 120, 153, 171, 221, 223, 252, 273, 274, 276, 282, 315, 340, 351, 355, 383, 402, 410, 440, 441, 445, 451, 452', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'pbardella@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Eduardo Pereira Bardella', 'pbardella@propstarter.com.br', '$pbkdf2-sha256$29000$5Rwj5Px/T.m9t9ZaizGmlA$18lYPoa2Y7NA3VwyXKGIFCb62bUpJaBJJc2bmDfcIX4', 'admin', true, 1124, now());
    ELSE
        UPDATE users SET nome = 'Eduardo Pereira Bardella', senha_hash = '$pbkdf2-sha256$29000$5Rwj5Px/T.m9t9ZaizGmlA$18lYPoa2Y7NA3VwyXKGIFCb62bUpJaBJJc2bmDfcIX4', role = 'admin', codigo_usuario = 1124, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'pbardella@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'pbardella@propstarter.com.br', 'Edu#!!1a', 'Eduardo Pereira Bardella', 'supervisor', 1124, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'valter@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Valter Balanovski', 'valter@propstarter.com.br', '$pbkdf2-sha256$29000$x5hzTglhrHWOkRLiXAvhXA$Znlb/XXZDcO6dv338dmViIaIbIgmoIA14SmwZV4oU3I', 'admin', true, 2155, now());
    ELSE
        UPDATE users SET nome = 'Valter Balanovski', senha_hash = '$pbkdf2-sha256$29000$x5hzTglhrHWOkRLiXAvhXA$Znlb/XXZDcO6dv338dmViIaIbIgmoIA14SmwZV4oU3I', role = 'admin', codigo_usuario = 2155, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'valter@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'valter@propstarter.com.br', 'Valt!3!0', 'Valter Balanovski', 'subgerente', 2155, '7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458', 'Prop Starter', now());

    -- user_condominios links
    IF '7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('7, 55, 83, 102, 103, 105, 109, 113, 117, 132, 155, 165, 173, 187, 288, 291, 301, 302, 310, 340, 351, 365, 382, 383, 387, 403, 410, 421, 423, 433, 444, 458', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento1@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 01', 'fechamento1@propstarter.com.br', '$pbkdf2-sha256$29000$Q0ipVcp5L0XIGQNAKMW4Fw$pZwiKi41orTtZndrVoczyuOkr38SCHZtM79rvWkahMw', 'contabilidade', true, 3110, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 01', senha_hash = '$pbkdf2-sha256$29000$Q0ipVcp5L0XIGQNAKMW4Fw$pZwiKi41orTtZndrVoczyuOkr38SCHZtM79rvWkahMw', role = 'contabilidade', codigo_usuario = 3110, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento1@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento1@propstarter.com.br', 'Fe#1@Ph', 'Fechamento 01', 'contabilidade', 3110, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento2@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 02', 'fechamento2@propstarter.com.br', '$pbkdf2-sha256$29000$SskZgzDm/D/n3LtXCqH0Hg$zvecAX7wiBKj5VuWnamoCx6XnjiedPGXUeZk/tbjn6w', 'contabilidade', true, 1225, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 02', senha_hash = '$pbkdf2-sha256$29000$SskZgzDm/D/n3LtXCqH0Hg$zvecAX7wiBKj5VuWnamoCx6XnjiedPGXUeZk/tbjn6w', role = 'contabilidade', codigo_usuario = 1225, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento2@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento2@propstarter.com.br', 'Fe%2*Ph', 'Fechamento 02', 'contabilidade', 1225, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento3@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 03', 'fechamento3@propstarter.com.br', '$pbkdf2-sha256$29000$wJiTknIOQUjpfS/lnPPe.w$2iERF6JYP2EppHaDY6ckrMIo/bCuGsyxw5uRiI5TItg', 'contabilidade', true, 3322, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 03', senha_hash = '$pbkdf2-sha256$29000$wJiTknIOQUjpfS/lnPPe.w$2iERF6JYP2EppHaDY6ckrMIo/bCuGsyxw5uRiI5TItg', role = 'contabilidade', codigo_usuario = 3322, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento3@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento3@propstarter.com.br', 'Fe%3#Ph', 'Fechamento 03', 'contabilidade', 3322, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento4@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 04', 'fechamento4@propstarter.com.br', '$pbkdf2-sha256$29000$lTLGGAMgZExpTYkRYozx/g$hqHspMoWRyXavaKhOIz7NE.QXcuWR1eDd4EaopcNVRs', 'contabilidade', true, 8225, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 04', senha_hash = '$pbkdf2-sha256$29000$lTLGGAMgZExpTYkRYozx/g$hqHspMoWRyXavaKhOIz7NE.QXcuWR1eDd4EaopcNVRs', role = 'contabilidade', codigo_usuario = 8225, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento4@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento4@propstarter.com.br', 'Fe$4!Ph', 'Fechamento 04', 'contabilidade', 8225, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento5@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 05', 'fechamento5@propstarter.com.br', '$pbkdf2-sha256$29000$hVCqde59L8W413qPMQYAAA$xllOIJlR2gprkBAGYWd6VS1xQBWHve.eucFgoMxjJqI', 'contabilidade', true, 1322, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 05', senha_hash = '$pbkdf2-sha256$29000$hVCqde59L8W413qPMQYAAA$xllOIJlR2gprkBAGYWd6VS1xQBWHve.eucFgoMxjJqI', role = 'contabilidade', codigo_usuario = 1322, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento5@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento5@propstarter.com.br', 'Fe&5bPh', 'Fechamento 05', 'contabilidade', 1322, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento6@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 06', 'fechamento6@propstarter.com.br', '$pbkdf2-sha256$29000$5pzzXut9b01JCYFwTokRog$MQggVFeguSHsVuZ.7ADZvlNaf3YoioBDw7XlfmKDbMI', 'contabilidade', true, 4872, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 06', senha_hash = '$pbkdf2-sha256$29000$5pzzXut9b01JCYFwTokRog$MQggVFeguSHsVuZ.7ADZvlNaf3YoioBDw7XlfmKDbMI', role = 'contabilidade', codigo_usuario = 4872, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento6@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento6@propstarter.com.br', 'Fe#6aPh', 'Fechamento 06', 'contabilidade', 4872, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento7@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 07', 'fechamento7@propstarter.com.br', '$pbkdf2-sha256$29000$WiuFsPaeUyoFwDjHuJcyhg$KIrr0AEexjrg2JAby/PP9pIqj7bUE6xpUMJyIUMjWv4', 'contabilidade', true, 5271, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 07', senha_hash = '$pbkdf2-sha256$29000$WiuFsPaeUyoFwDjHuJcyhg$KIrr0AEexjrg2JAby/PP9pIqj7bUE6xpUMJyIUMjWv4', role = 'contabilidade', codigo_usuario = 5271, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento7@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento7@propstarter.com.br', 'Fe+7cPh', 'Fechamento 07', 'contabilidade', 5271, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento8@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 08', 'fechamento8@propstarter.com.br', '$pbkdf2-sha256$29000$W2uNcW5tzZnTmlPKmfM.Bw$ki0/fwQNxZm59uH8oEsHxJyF44HLpRH6THpoU3dvGAY', 'contabilidade', true, 3317, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 08', senha_hash = '$pbkdf2-sha256$29000$W2uNcW5tzZnTmlPKmfM.Bw$ki0/fwQNxZm59uH8oEsHxJyF44HLpRH6THpoU3dvGAY', role = 'contabilidade', codigo_usuario = 3317, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento8@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento8@propstarter.com.br', 'Fe=dePh', 'Fechamento 08', 'contabilidade', 3317, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento9@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 09', 'fechamento9@propstarter.com.br', '$pbkdf2-sha256$29000$HKN0TqnV2tubk9Kac45xjg$bmHOzQysVNPpW3rGSZsPcDc39nB5oZ6v0Is.9ODe7Ns', 'contabilidade', true, 2337, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 09', senha_hash = '$pbkdf2-sha256$29000$HKN0TqnV2tubk9Kac45xjg$bmHOzQysVNPpW3rGSZsPcDc39nB5oZ6v0Is.9ODe7Ns', role = 'contabilidade', codigo_usuario = 2337, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento9@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento9@propstarter.com.br', 'Fe%9fPh', 'Fechamento 09', 'contabilidade', 2337, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento10@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 10', 'fechamento10@propstarter.com.br', '$pbkdf2-sha256$29000$l7IWIiQEICQEgBDi/F.rNQ$rlPgQg2qov3KHjGHp2tHtoAsZHzkwmZKfUZA0klgheA', 'contabilidade', true, 2228, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 10', senha_hash = '$pbkdf2-sha256$29000$l7IWIiQEICQEgBDi/F.rNQ$rlPgQg2qov3KHjGHp2tHtoAsZHzkwmZKfUZA0klgheA', role = 'contabilidade', codigo_usuario = 2228, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento10@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento10@propstarter.com.br', 'Fe#10gPh', 'Fechamento 10', 'contabilidade', 2228, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento11@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 11', 'fechamento11@propstarter.com.br', '$pbkdf2-sha256$29000$Pcd4T.ldC.GcMyak1DrnXA$LmH46uT3ceivnEn.b2diJvBb3uIJZ3wz1PNg.BHMwd0', 'contabilidade', true, 4008, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 11', senha_hash = '$pbkdf2-sha256$29000$Pcd4T.ldC.GcMyak1DrnXA$LmH46uT3ceivnEn.b2diJvBb3uIJZ3wz1PNg.BHMwd0', role = 'contabilidade', codigo_usuario = 4008, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento11@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento11@propstarter.com.br', 'Fe!11hPh', 'Fechamento 11', 'contabilidade', 4008, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento12@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 12', 'fechamento12@propstarter.com.br', '$pbkdf2-sha256$29000$khICwNj7v/d.zxmjVKo1xg$uTk0hbb/HRH8rgPZJ8qRDGjuePKagD86of4/WsOaX3U', 'contabilidade', true, 5773, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 12', senha_hash = '$pbkdf2-sha256$29000$khICwNj7v/d.zxmjVKo1xg$uTk0hbb/HRH8rgPZJ8qRDGjuePKagD86of4/WsOaX3U', role = 'contabilidade', codigo_usuario = 5773, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento12@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento12@propstarter.com.br', 'Fe^12jPh', 'Fechamento 12', 'contabilidade', 5773, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'fechamento13@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Fechamento 13', 'fechamento13@propstarter.com.br', '$pbkdf2-sha256$29000$JMQ4h7C29r4XwlhLCcF4Lw$1UQC.0SUidTnDuz8wDNcgIcATtSH8mwPCE4EQF6QFz0', 'contabilidade', true, 6328, now());
    ELSE
        UPDATE users SET nome = 'Fechamento 13', senha_hash = '$pbkdf2-sha256$29000$JMQ4h7C29r4XwlhLCcF4Lw$1UQC.0SUidTnDuz8wDNcgIcATtSH8mwPCE4EQF6QFz0', role = 'contabilidade', codigo_usuario = 6328, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'fechamento13@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'fechamento13@propstarter.com.br', 'Fe*13kPh', 'Fechamento 13', 'contabilidade', 6328, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'emissao@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Donner', 'emissao@propstarter.com.br', '$pbkdf2-sha256$29000$9x7DOGesNSZECOHc2xsjZA$BJ9sNXh./yOovKAFunBU2eDl2izydkPM60SgqNh6X2M', 'geral', true, 1402, now());
    ELSE
        UPDATE users SET nome = 'Donner', senha_hash = '$pbkdf2-sha256$29000$9x7DOGesNSZECOHc2xsjZA$BJ9sNXh./yOovKAFunBU2eDl2izydkPM60SgqNh6X2M', role = 'geral', codigo_usuario = 1402, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'emissao@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'emissao@propstarter.com.br', 'Don#&83@', 'Donner', 'emissao', 1402, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

DO $$
DECLARE
    new_uid UUID;
    next_db_id BIGINT;
BEGIN
    -- users table
    SELECT id INTO new_uid FROM users WHERE email = 'seguranca@propstarter.com.br';
    IF new_uid IS NULL THEN
        new_uid := gen_random_uuid();
        INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, updated_at)
        VALUES (new_uid, 'Millena', 'seguranca@propstarter.com.br', '$pbkdf2-sha256$29000$DWFMCYGwFoLwXiuF0HpPaQ$2T9bjmijUBWl/75AoRirIGmwkJ7RvM9kJa.VHmfsY/M', 'geral', true, 6235, now());
    ELSE
        UPDATE users SET nome = 'Millena', senha_hash = '$pbkdf2-sha256$29000$DWFMCYGwFoLwXiuF0HpPaQ$2T9bjmijUBWl/75AoRirIGmwkJ7RvM9kJa.VHmfsY/M', role = 'geral', codigo_usuario = 6235, updated_at = now()
        WHERE id = new_uid;
    END IF;

    -- database_usuarios table
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_db_id FROM database_usuarios;
    DELETE FROM database_usuarios WHERE login = 'seguranca@propstarter.com.br';
    INSERT INTO database_usuarios (id, login, senha, "nomeUsuario", tipo, "codigoUsuario", "codigoCondominio", administradora, created_at)
    VALUES (next_db_id, 'seguranca@propstarter.com.br', 'Mill@##3', 'Millena', 'emissao', 6235, 'todos', 'Prop Starter', now());

    -- user_condominios links
    IF 'todos' NOT LIKE '%todos%' THEN
        DELETE FROM user_condominios WHERE user_id = new_uid;
        INSERT INTO user_condominios (id, user_id, condominio_id)
        SELECT gen_random_uuid(), new_uid, id 
        FROM condominios 
        WHERE numero = ANY(string_to_array(REPLACE('todos', ' ', ''), ','));
    END IF;
END $$;

