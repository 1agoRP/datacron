DROP TABLE IF EXISTS database_usuarios;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'iago@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Iago R. Prado Man - Admin',
                        senha_hash = '$pbkdf2-sha256$29000$ldLa.5.ztvbe.18rJSREiA$hQa3vp31NZov0dKuW/qucuU.wPVTVgJsZA4DwIBouMc',
                        role = 'admin',
                        codigo_usuario = 4838,
                        administradora = 'Administrador',
                        codigo_condominio = 'todos',
                        gestor_usuarios = 'SIM',
                        gestor_fornecedor = 'SIM',
                        gestor_condominios = 'SIM',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '8c78237d-572d-4bfe-bd93-45d2ebb101df';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Iago R. Prado Man - Admin', 'iago@propstarter.com.br', '$pbkdf2-sha256$29000$ldLa.5.ztvbe.18rJSREiA$hQa3vp31NZov0dKuW/qucuU.wPVTVgJsZA4DwIBouMc', 'admin', true, 4838, 'Administrador', 'todos', 'SIM', 'SIM', 'SIM', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fernando@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'AdminTeste',
                        senha_hash = '$pbkdf2-sha256$29000$jfHe29ubE.Kc03rvvZcSwg$H33xl4vZ6pUP/wS3XLkWT9s1cESJwyASym4.h5goFZg',
                        role = 'geral',
                        codigo_usuario = 4794,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos',
                        gestor_usuarios = 'SIM',
                        gestor_fornecedor = 'SIM',
                        gestor_condominios = 'SIM',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'a454b432-7e8d-4d50-96b0-7ad42c31a644';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'AdminTeste', 'fernando@propstarter.com.br', '$pbkdf2-sha256$29000$jfHe29ubE.Kc03rvvZcSwg$H33xl4vZ6pUP/wS3XLkWT9s1cESJwyASym4.h5goFZg', 'geral', true, 4794, 'Prop Starter', 'todos', 'SIM', 'SIM', 'SIM', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'assistente.gerencia3@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Danilo Sanjuan',
                        senha_hash = '$pbkdf2-sha256$29000$YIwx5nwP4Rxj7F0rRSjl3A$dLxCq5cF48wiDR8YPP8tBkqScMhAyc/o7EZ2JhiTeyI',
                        role = 'assistente',
                        codigo_usuario = 8872,
                        administradora = 'Prop Starter',
                        codigo_condominio = '14, 15, 61, 63, 104, 143, 176, 183, 193, 201, 208, 210, 242, 234, 251, 267, 271, 286, 331, 343, 350, 359, 377, 389, 393, 397, 412, 413, 441, 442, 447, 451, 199',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '6c9f858d-6b25-4280-8d36-7510b793552d';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Danilo Sanjuan', 'assistente.gerencia3@propstarter.com.br', '$pbkdf2-sha256$29000$YIwx5nwP4Rxj7F0rRSjl3A$dLxCq5cF48wiDR8YPP8tBkqScMhAyc/o7EZ2JhiTeyI', 'assistente', true, 8872, 'Prop Starter', '14, 15, 61, 63, 104, 143, 176, 183, 193, 201, 208, 210, 242, 234, 251, 267, 271, 286, 331, 343, 350, 359, 377, 389, 393, 397, 412, 413, 441, 442, 447, 451, 199', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '14' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '15' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '61' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '63' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '104' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '143' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '176' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '183' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '193' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '201' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '208' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '210' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '242' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '234' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '251' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '267' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '271' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '286' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '331' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '343' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '350' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '359' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '377' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '389' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '393' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '397' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '412' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '413' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '441' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '442' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '447' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '451' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '199' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'assistente.gerencia10@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fernando Fernandes',
                        senha_hash = '$pbkdf2-sha256$29000$.J.TkhLi3HvPWUtpDWHMmQ$rMjypyLLsDP0L5iPXAHcRoT4a8mM/9hGnjMrYgAAmlM',
                        role = 'assistente',
                        codigo_usuario = 7684,
                        administradora = 'Prop Starter',
                        codigo_condominio = '16, 66, 86, 137, 162, 169, 254, 260, 309, 312, 323, 324, 326, 340, 372, 374, 398, 411, 428, 435, 453, 454, 461, 473, 480',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '5463971b-9f3a-483b-9613-4292799ee00e';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fernando Fernandes', 'assistente.gerencia10@propstarter.com.br', '$pbkdf2-sha256$29000$.J.TkhLi3HvPWUtpDWHMmQ$rMjypyLLsDP0L5iPXAHcRoT4a8mM/9hGnjMrYgAAmlM', 'assistente', true, 7684, 'Prop Starter', '16, 66, 86, 137, 162, 169, 254, 260, 309, 312, 323, 324, 326, 340, 372, 374, 398, 411, 428, 435, 453, 454, 461, 473, 480', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '16' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '66' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '86' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '137' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '162' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '169' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '254' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '260' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '309' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '312' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '323' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '324' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '326' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '340' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '372' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '374' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '398' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '411' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '428' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '435' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '453' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '454' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '461' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '473' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '480' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'assistente.gerencia9@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Leonardo Pecoraro',
                        senha_hash = '$pbkdf2-sha256$29000$9N7bu/c.B8C4V8r5f0/pHQ$n0SPG6VkcBPY76OdUfemRrcbtjqmjkGH0GtFSHFY.EM',
                        role = 'assistente',
                        codigo_usuario = 3105,
                        administradora = 'Prop Starter',
                        codigo_condominio = '18, 25, 59, 109, 125, 127, 197, 202, 205, 233, 280, 301, 302, 307, 316, 328, 330, 341, 345, 346, 366, 367, 368, 373, 386, 394, 432, 459, 462, 474, 478',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '97cd4105-5ab4-43de-b4a3-f5b652195c9c';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Leonardo Pecoraro', 'assistente.gerencia9@propstarter.com.br', '$pbkdf2-sha256$29000$9N7bu/c.B8C4V8r5f0/pHQ$n0SPG6VkcBPY76OdUfemRrcbtjqmjkGH0GtFSHFY.EM', 'assistente', true, 3105, 'Prop Starter', '18, 25, 59, 109, 125, 127, 197, 202, 205, 233, 280, 301, 302, 307, 316, 328, 330, 341, 345, 346, 366, 367, 368, 373, 386, 394, 432, 459, 462, 474, 478', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '18' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '25' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '59' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '109' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '125' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '127' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '197' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '202' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '205' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '233' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '280' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '301' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '302' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '307' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '316' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '328' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '330' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '341' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '345' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '346' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '366' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '367' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '368' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '373' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '386' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '394' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '432' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '459' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '462' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '474' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '478' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'assistente.gerencia1@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Jenifer Barros',
                        senha_hash = '$pbkdf2-sha256$29000$837PGWMM4fw/x5jzntP63w$9HeR3liDC01.cdhzCeYWR/zEFV9tAyw8PwOt2y/6MHs',
                        role = 'assistente',
                        codigo_usuario = 3518,
                        administradora = 'Prop Starter',
                        codigo_condominio = '2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 236, 239, 245, 268, 281, 290, 327, 369, 409, 418, 420, 423, 424, 437, 439, 443, 460, 466, 475, 477',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '9970f49d-c763-405a-a02e-4e70b42b5d07';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Jenifer Barros', 'assistente.gerencia1@propstarter.com.br', '$pbkdf2-sha256$29000$837PGWMM4fw/x5jzntP63w$9HeR3liDC01.cdhzCeYWR/zEFV9tAyw8PwOt2y/6MHs', 'assistente', true, 3518, 'Prop Starter', '2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 236, 239, 245, 268, 281, 290, 327, 369, 409, 418, 420, 423, 424, 437, 439, 443, 460, 466, 475, 477', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '2' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '19' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '43' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '56' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '65' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '135' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '145' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '157' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '221' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '228' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '236' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '239' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '245' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '268' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '281' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '290' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '327' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '369' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '409' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '418' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '420' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '423' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '424' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '437' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '439' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '443' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '460' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '466' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '475' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '477' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'assistente.gerencia6@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Gabriel Vieira',
                        senha_hash = '$pbkdf2-sha256$29000$wHhv7R3jvJcy5tzbu9daSw$hUKpdDstS7MUKeH/yadVdthGYxFypz1MECWXAXV28R8',
                        role = 'assistente',
                        codigo_usuario = 4636,
                        administradora = 'Prop Starter',
                        codigo_condominio = '31, 92, 126, 141, 146, 166, 175, 185, 186, 224, 226, 240, 247, 249, 256, 266, 277, 283, 284, 285, 314, 325, 344, 352, 381, 410, 419, 422, 430, 436, 446, 470, 471',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '2cb62044-2eb0-4ecd-a032-7bc8234345d3';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Gabriel Vieira', 'assistente.gerencia6@propstarter.com.br', '$pbkdf2-sha256$29000$wHhv7R3jvJcy5tzbu9daSw$hUKpdDstS7MUKeH/yadVdthGYxFypz1MECWXAXV28R8', 'assistente', true, 4636, 'Prop Starter', '31, 92, 126, 141, 146, 166, 175, 185, 186, 224, 226, 240, 247, 249, 256, 266, 277, 283, 284, 285, 314, 325, 344, 352, 381, 410, 419, 422, 430, 436, 446, 470, 471', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '31' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '92' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '126' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '141' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '146' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '166' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '175' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '185' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '186' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '224' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '226' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '240' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '247' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '249' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '256' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '266' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '277' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '283' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '284' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '285' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '314' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '325' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '344' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '352' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '381' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '410' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '419' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '422' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '430' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '436' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '446' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '470' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '471' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'assistente.gerencia5@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fabiana Ferreira Fernandes',
                        senha_hash = '$pbkdf2-sha256$29000$PwfAGOOck3JOKeX83zvnHA$N8zxPpMRhdEf4pLfxzhZQZSyxomcRVZuNEmSqnpeO/s',
                        role = 'assistente',
                        codigo_usuario = 1303,
                        administradora = 'Prop Starter',
                        codigo_condominio = '39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 279, 289, 293, 294, 296, 297, 303, 305, 322, 353, 357, 376, 378, 404, 415, 431, 438, 464, 465, 375',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'e0c4a38a-7340-4fb1-9faf-a58f4f0125e6';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fabiana Ferreira Fernandes', 'assistente.gerencia5@propstarter.com.br', '$pbkdf2-sha256$29000$PwfAGOOck3JOKeX83zvnHA$N8zxPpMRhdEf4pLfxzhZQZSyxomcRVZuNEmSqnpeO/s', 'assistente', true, 1303, 'Prop Starter', '39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 279, 289, 293, 294, 296, 297, 303, 305, 322, 353, 357, 376, 378, 404, 415, 431, 438, 464, 465, 375', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '39' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '48' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '70' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '73' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '129' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '150' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '181' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '244' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '259' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '270' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '275' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '279' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '289' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '293' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '294' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '296' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '297' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '303' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '305' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '322' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '353' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '357' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '376' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '378' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '404' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '415' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '431' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '438' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '464' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '465' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '375' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'assistente.gerencia@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Pedro Henrique',
                        senha_hash = '$pbkdf2-sha256$29000$jDHmHOO8VwqhNEZIiZGy9g$qAdamPkOUXagQQSPPcRrQJYtQ2EOb85DxzbNMTXDGSo',
                        role = 'assistente',
                        codigo_usuario = 3435,
                        administradora = 'Prop Starter',
                        codigo_condominio = '46, 51, 67, 87, 98, 107, 111, 112, 119, 131, 172, 178, 222, 250, 300, 310, 313, 329, 334, 355, 371, 379, 399, 405, 408, 425, 427, 455, 467, 468, 472',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'de379e0c-de6d-49c7-a02e-834ba5fe0f3b';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Pedro Henrique', 'assistente.gerencia@propstarter.com.br', '$pbkdf2-sha256$29000$jDHmHOO8VwqhNEZIiZGy9g$qAdamPkOUXagQQSPPcRrQJYtQ2EOb85DxzbNMTXDGSo', 'assistente', true, 3435, 'Prop Starter', '46, 51, 67, 87, 98, 107, 111, 112, 119, 131, 172, 178, 222, 250, 300, 310, 313, 329, 334, 355, 371, 379, 399, 405, 408, 425, 427, 455, 467, 468, 472', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '46' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '51' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '67' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '87' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '98' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '107' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '111' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '112' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '119' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '131' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '172' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '178' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '222' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '250' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '300' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '310' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '313' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '329' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '334' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '355' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '371' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '379' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '399' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '405' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '408' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '425' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '427' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '455' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '467' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '468' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '472' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'assistente.gerencia4@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Iago R. Prado Man',
                        senha_hash = '$pbkdf2-sha256$29000$h5ByztnbG4NQ6j1HqHWutQ$RYZ1pqAx2Tj2FrYyZTrSxBq.ONEY75JSGtXeZpn0ZO8',
                        role = 'assistente',
                        codigo_usuario = 6099,
                        administradora = 'Prop Starter',
                        codigo_condominio = '6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '39e2f917-b95e-4bf8-85f9-2f1774a36623';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Iago R. Prado Man', 'assistente.gerencia4@propstarter.com.br', '$pbkdf2-sha256$29000$h5ByztnbG4NQ6j1HqHWutQ$RYZ1pqAx2Tj2FrYyZTrSxBq.ONEY75JSGtXeZpn0ZO8', 'assistente', true, 6099, 'Prop Starter', '6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '6' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '12' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '47' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '76' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '136' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '154' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '160' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '168' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '194' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '203' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '204' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '225' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '248' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '304' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '306' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '308' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '318' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '332' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '337' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '342' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '356' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '364' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '388' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '392' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '414' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '417' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '426' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '456' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '463' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '469' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '476' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '479' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'assistente.gerencia2@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Victor Bakaneski',
                        senha_hash = '$pbkdf2-sha256$29000$XCvl/F.rdS4FoLR2DkFICQ$Vpr05ahygtX/oIyrnccNfsSIKsSr.BN323LeekWIpBg',
                        role = 'assistente',
                        codigo_usuario = 1275,
                        administradora = 'Prop Starter',
                        codigo_condominio = '7, 55, 80, 93, 102, 103, 106, 108, 113, 117, 132, 155, 165, 179, 182, 288, 291, 299, 361, 362, 380, 382, 383, 387, 403, 416, 421, 429, 433, 444, 458',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '19cd0940-3e42-4371-9b6a-185e2346cbdf';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Victor Bakaneski', 'assistente.gerencia2@propstarter.com.br', '$pbkdf2-sha256$29000$XCvl/F.rdS4FoLR2DkFICQ$Vpr05ahygtX/oIyrnccNfsSIKsSr.BN323LeekWIpBg', 'assistente', true, 1275, 'Prop Starter', '7, 55, 80, 93, 102, 103, 106, 108, 113, 117, 132, 155, 165, 179, 182, 288, 291, 299, 361, 362, 380, 382, 383, 387, 403, 416, 421, 429, 433, 444, 458', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '7' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '55' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '80' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '93' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '102' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '103' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '106' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '108' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '113' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '117' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '132' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '155' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '165' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '179' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '182' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '288' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '291' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '299' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '361' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '362' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '380' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '382' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '383' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '387' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '403' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '416' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '421' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '429' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '433' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '444' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '458' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'assistente.gerencia7@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Silvia Macedo',
                        senha_hash = '$pbkdf2-sha256$29000$jlFq7V3LGSOkdG6N0bpXqg$pz3TtlQqBnlQb2hRtm2j1kdz5z.mB4o9zb7iAV.Uw9A',
                        role = 'assistente',
                        codigo_usuario = 5508,
                        administradora = 'Prop Starter',
                        codigo_condominio = '9, 20, 68, 88, 94, 120, 153, 171, 227, 229, 252, 273, 274, 276, 292, 315, 348, 351, 365, 390, 407, 440, 448, 449, 450, 452',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '08284de0-4b01-437c-a54c-42b0f9e3f721';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Silvia Macedo', 'assistente.gerencia7@propstarter.com.br', '$pbkdf2-sha256$29000$jlFq7V3LGSOkdG6N0bpXqg$pz3TtlQqBnlQb2hRtm2j1kdz5z.mB4o9zb7iAV.Uw9A', 'assistente', true, 5508, 'Prop Starter', '9, 20, 68, 88, 94, 120, 153, 171, 227, 229, 252, 273, 274, 276, 292, 315, 348, 351, 365, 390, 407, 440, 448, 449, 450, 452', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '9' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '20' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '68' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '88' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '94' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '120' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '153' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '171' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '227' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '229' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '252' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '273' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '274' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '276' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '292' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '315' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '348' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '351' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '365' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '390' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '407' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '440' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '448' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '449' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '450' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '452' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'concessionarias@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Concessionarias',
                        senha_hash = '$pbkdf2-sha256$29000$fO9dy5kTAqAU4pzz3ltLCQ$kVZRporpapgMQvucDGRsCrapYhqirgCVaBSKUCYEJAw',
                        role = 'geral',
                        codigo_usuario = 2981,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '6ad70041-e0e1-48f1-810e-c0484aa70807';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Concessionarias', 'concessionarias@propstarter.com.br', '$pbkdf2-sha256$29000$fO9dy5kTAqAU4pzz3ltLCQ$kVZRporpapgMQvucDGRsCrapYhqirgCVaBSKUCYEJAw', 'geral', true, 2981, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'contabilidade@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Contabilidade',
                        senha_hash = '$pbkdf2-sha256$29000$UErJOScEAIDw/r93DqG0Vg$LwKyWbtBinT.MkwoRVAmG1ODh7vqv8OOv3a4p//OM/8',
                        role = 'contabilidade',
                        codigo_usuario = 5431,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'ca00c6a2-74b9-4e72-a2c6-33deffd913f5';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Contabilidade', 'contabilidade@propstarter.com.br', '$pbkdf2-sha256$29000$UErJOScEAIDw/r93DqG0Vg$LwKyWbtBinT.MkwoRVAmG1ODh7vqv8OOv3a4p//OM/8', 'contabilidade', true, 5431, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'rodrigo.cavalcante@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Rodrigo Cavalcante',
                        senha_hash = '$pbkdf2-sha256$29000$yNm7N2bsvRfi/H9vLaX0Pg$2TAv5VU.RFpi61tVQ9EpqTUACOst5.qIQu0wDNCPhu4',
                        role = 'geral',
                        codigo_usuario = 1626,
                        administradora = 'Prop Starter',
                        codigo_condominio = '14, 15, 61, 63, 104, 143, 176, 183, 193, 201, 208, 210, 242, 234, 251, 267, 271, 286, 331, 343, 350, 359, 377, 389, 393, 397, 412, 413, 441, 442, 447, 451, 199',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '120768b6-8d6e-4c6c-a85d-12bc08a224c7';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Rodrigo Cavalcante', 'rodrigo.cavalcante@propstarter.com.br', '$pbkdf2-sha256$29000$yNm7N2bsvRfi/H9vLaX0Pg$2TAv5VU.RFpi61tVQ9EpqTUACOst5.qIQu0wDNCPhu4', 'geral', true, 1626, 'Prop Starter', '14, 15, 61, 63, 104, 143, 176, 183, 193, 201, 208, 210, 242, 234, 251, 267, 271, 286, 331, 343, 350, 359, 377, 389, 393, 397, 412, 413, 441, 442, 447, 451, 199', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '14' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '15' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '61' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '63' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '104' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '143' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '176' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '183' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '193' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '201' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '208' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '210' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '242' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '234' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '251' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '267' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '271' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '286' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '331' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '343' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '350' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '359' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '377' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '389' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '393' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '397' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '412' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '413' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '441' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '442' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '447' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '451' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '199' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'diogo@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Diogo dos Santos Andrade',
                        senha_hash = '$pbkdf2-sha256$29000$ak1pbY1R6j2n1NrbO6d0jg$YZMulCl76QzD.ly6VXkITwhT2w0GBdF2M.sKSHEktaE',
                        role = 'geral',
                        codigo_usuario = 5883,
                        administradora = 'Prop Starter',
                        codigo_condominio = '16, 66, 86, 137, 162, 169, 254, 260, 309, 312, 323, 324, 326, 340, 372, 374, 398, 411, 428, 435, 453, 454, 461, 473, 480',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'e4911602-65b4-46cb-956d-038179a86f66';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Diogo dos Santos Andrade', 'diogo@propstarter.com.br', '$pbkdf2-sha256$29000$ak1pbY1R6j2n1NrbO6d0jg$YZMulCl76QzD.ly6VXkITwhT2w0GBdF2M.sKSHEktaE', 'geral', true, 5883, 'Prop Starter', '16, 66, 86, 137, 162, 169, 254, 260, 309, 312, 323, 324, 326, 340, 372, 374, 398, 411, 428, 435, 453, 454, 461, 473, 480', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '16' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '66' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '86' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '137' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '162' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '169' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '254' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '260' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '309' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '312' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '323' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '324' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '326' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '340' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '372' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '374' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '398' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '411' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '428' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '435' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '453' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '454' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '461' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '473' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '480' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'suellen@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Suellen Teixeira',
                        senha_hash = '$pbkdf2-sha256$29000$4vyfM2ZMCeGcE8LYO0cIoQ$mV14Zw9o3ggXKJpd/94QjoQzzE1G2NL2qUsrFWh7hrg',
                        role = 'geral',
                        codigo_usuario = 5647,
                        administradora = 'Prop Starter',
                        codigo_condominio = '18, 25, 59, 109, 125, 127, 197, 202, 205, 233, 280, 301, 302, 307, 316, 328, 330, 341, 345, 346, 366, 367, 368, 373, 386, 394, 432, 459, 462, 474, 478',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'df4c2a4a-625a-4b30-836a-4faea34a779e';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Suellen Teixeira', 'suellen@propstarter.com.br', '$pbkdf2-sha256$29000$4vyfM2ZMCeGcE8LYO0cIoQ$mV14Zw9o3ggXKJpd/94QjoQzzE1G2NL2qUsrFWh7hrg', 'geral', true, 5647, 'Prop Starter', '18, 25, 59, 109, 125, 127, 197, 202, 205, 233, 280, 301, 302, 307, 316, 328, 330, 341, 345, 346, 366, 367, 368, 373, 386, 394, 432, 459, 462, 474, 478', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '18' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '25' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '59' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '109' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '125' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '127' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '197' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '202' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '205' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '233' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '280' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '301' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '302' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '307' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '316' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '328' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '330' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '341' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '345' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '346' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '366' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '367' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '368' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '373' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '386' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '394' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '432' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '459' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '462' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '474' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '478' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'aline@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Aline Bulara',
                        senha_hash = '$pbkdf2-sha256$29000$gHBurdXam1OK0XrvnZMSgg$KJGvwfSAi9luqAd6T6VGspjjj91lMYcyi3H6fzU9cOs',
                        role = 'geral',
                        codigo_usuario = 7301,
                        administradora = 'Prop Starter',
                        codigo_condominio = '2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 236, 239, 245, 268, 281, 290, 327, 369, 409, 418, 420, 423, 424, 437, 439, 443, 460, 466, 475, 477',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '006dbe0e-77c9-4980-a0ab-5e3a87d8f7d7';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Aline Bulara', 'aline@propstarter.com.br', '$pbkdf2-sha256$29000$gHBurdXam1OK0XrvnZMSgg$KJGvwfSAi9luqAd6T6VGspjjj91lMYcyi3H6fzU9cOs', 'geral', true, 7301, 'Prop Starter', '2, 19, 43, 56, 65, 135, 145, 157, 221, 228, 236, 239, 245, 268, 281, 290, 327, 369, 409, 418, 420, 423, 424, 437, 439, 443, 460, 466, 475, 477', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '2' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '19' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '43' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '56' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '65' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '135' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '145' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '157' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '221' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '228' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '236' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '239' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '245' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '268' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '281' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '290' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '327' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '369' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '409' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '418' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '420' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '423' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '424' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '437' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '439' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '443' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '460' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '466' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '475' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '477' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'natalia@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Natalia Martins',
                        senha_hash = '$pbkdf2-sha256$29000$6f2/l1Jqzdk7p9QaA.D8Xw$xn8XUzKVrCqSBmj7zCg4L89er3AnIiE/vjP26148KnA',
                        role = 'geral',
                        codigo_usuario = 1853,
                        administradora = 'Prop Starter',
                        codigo_condominio = '31, 92, 126, 141, 146, 166, 175, 185, 186, 224, 226, 240, 247, 249, 256, 266, 277, 283, 284, 285, 314, 325, 344, 352, 381, 410, 419, 422, 430, 436, 446, 470, 471',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '64d32444-5cc0-43ae-aed9-ba6d5fd5e17f';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Natalia Martins', 'natalia@propstarter.com.br', '$pbkdf2-sha256$29000$6f2/l1Jqzdk7p9QaA.D8Xw$xn8XUzKVrCqSBmj7zCg4L89er3AnIiE/vjP26148KnA', 'geral', true, 1853, 'Prop Starter', '31, 92, 126, 141, 146, 166, 175, 185, 186, 224, 226, 240, 247, 249, 256, 266, 277, 283, 284, 285, 314, 325, 344, 352, 381, 410, 419, 422, 430, 436, 446, 470, 471', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '31' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '92' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '126' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '141' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '146' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '166' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '175' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '185' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '186' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '224' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '226' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '240' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '247' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '249' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '256' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '266' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '277' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '283' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '284' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '285' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '314' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '325' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '344' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '352' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '381' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '410' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '419' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '422' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '430' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '436' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '446' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '470' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '471' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'eduardo@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Eduardo Pessolato',
                        senha_hash = '$pbkdf2-sha256$29000$a81Zq3WOkbJ2DsFYS2ltTQ$EwdK0dUfDKAYgHEt5e0c6YfziQjQgmd5Ed5Sa9gR2bE',
                        role = 'geral',
                        codigo_usuario = 7239,
                        administradora = 'Prop Starter',
                        codigo_condominio = '39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 279, 289, 293, 294, 296, 297, 303, 305, 322, 353, 357, 376, 378, 404, 415, 431, 438, 464, 465, 375',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '4c6c7594-84a9-42ab-81ae-1ca3e605a503';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Eduardo Pessolato', 'eduardo@propstarter.com.br', '$pbkdf2-sha256$29000$a81Zq3WOkbJ2DsFYS2ltTQ$EwdK0dUfDKAYgHEt5e0c6YfziQjQgmd5Ed5Sa9gR2bE', 'geral', true, 7239, 'Prop Starter', '39, 48, 70, 73, 129, 150, 181, 244, 259, 270, 275, 279, 289, 293, 294, 296, 297, 303, 305, 322, 353, 357, 376, 378, 404, 415, 431, 438, 464, 465, 375', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '39' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '48' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '70' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '73' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '129' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '150' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '181' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '244' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '259' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '270' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '275' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '279' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '289' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '293' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '294' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '296' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '297' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '303' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '305' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '322' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '353' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '357' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '376' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '378' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '404' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '415' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '431' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '438' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '464' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '465' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '375' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'juliana.ferreira@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Juliana Ferreira',
                        senha_hash = '$pbkdf2-sha256$29000$gHBuTeldqxVCCKH0HgNg7A$xDH02GZnNGBRLrmpJX4.JKZtkby04zdO88h/20OvSI0',
                        role = 'geral',
                        codigo_usuario = 5617,
                        administradora = 'Prop Starter',
                        codigo_condominio = '46, 51, 67, 87, 98, 107, 111, 112, 119, 131, 172, 178, 222, 250, 300, 310, 313, 329, 334, 355, 371, 379, 399, 405, 408, 425, 427, 455, 467, 468, 472',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '0045e2de-7cec-428e-98a4-98a6c987616e';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Juliana Ferreira', 'juliana.ferreira@propstarter.com.br', '$pbkdf2-sha256$29000$gHBuTeldqxVCCKH0HgNg7A$xDH02GZnNGBRLrmpJX4.JKZtkby04zdO88h/20OvSI0', 'geral', true, 5617, 'Prop Starter', '46, 51, 67, 87, 98, 107, 111, 112, 119, 131, 172, 178, 222, 250, 300, 310, 313, 329, 334, 355, 371, 379, 399, 405, 408, 425, 427, 455, 467, 468, 472', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '46' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '51' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '67' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '87' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '98' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '107' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '111' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '112' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '119' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '131' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '172' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '178' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '222' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '250' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '300' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '310' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '313' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '329' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '334' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '355' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '371' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '379' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '399' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '405' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '408' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '425' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '427' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '455' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '467' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '468' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '472' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'maurojunior@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Mauro Junior',
                        senha_hash = '$pbkdf2-sha256$29000$h/C.NyakVArhHGPMOUeoFQ$vWppvuUWqjiQWsUfLamAMDHh7Yp2BMoPmgFhOK6T9kk',
                        role = 'geral',
                        codigo_usuario = 4125,
                        administradora = 'Prop Starter',
                        codigo_condominio = '6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '2372be07-3a37-46a2-9046-c3c1a60c319d';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Mauro Junior', 'maurojunior@propstarter.com.br', '$pbkdf2-sha256$29000$h/C.NyakVArhHGPMOUeoFQ$vWppvuUWqjiQWsUfLamAMDHh7Yp2BMoPmgFhOK6T9kk', 'geral', true, 4125, 'Prop Starter', '6, 12, 47, 76, 136, 154, 160, 168, 194, 203, 204, 225, 248, 304, 306, 308, 318, 332, 337, 342, 356, 364, 388, 392, 414, 417, 426, 456, 463, 469, 476, 479', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '6' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '12' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '47' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '76' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '136' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '154' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '160' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '168' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '194' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '203' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '204' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '225' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '248' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '304' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '306' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '308' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '318' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '332' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '337' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '342' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '356' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '364' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '388' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '392' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '414' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '417' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '426' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '456' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '463' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '469' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '476' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '479' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'patricia@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Patricia FranÃ§a',
                        senha_hash = '$pbkdf2-sha256$29000$wtj7n7P2njMGoLTW.t8bow$O7zcfQHqiUnxXG5UprkA4SsC/sRwzKPAId/jwztq5bo',
                        role = 'geral',
                        codigo_usuario = 3467,
                        administradora = 'Prop Starter',
                        codigo_condominio = '7, 55, 80, 93, 102, 103, 106, 108, 113, 117, 132, 155, 165, 179, 182, 288, 291, 299, 361, 362, 380, 382, 383, 387, 403, 416, 421, 429, 433, 444, 458',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '1a4d6edb-f41f-41dc-b858-b79d4207914a';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Patricia FranÃ§a', 'patricia@propstarter.com.br', '$pbkdf2-sha256$29000$wtj7n7P2njMGoLTW.t8bow$O7zcfQHqiUnxXG5UprkA4SsC/sRwzKPAId/jwztq5bo', 'geral', true, 3467, 'Prop Starter', '7, 55, 80, 93, 102, 103, 106, 108, 113, 117, 132, 155, 165, 179, 182, 288, 291, 299, 361, 362, 380, 382, 383, 387, 403, 416, 421, 429, 433, 444, 458', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '7' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '55' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '80' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '93' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '102' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '103' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '106' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '108' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '113' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '117' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '132' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '155' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '165' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '179' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '182' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '288' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '291' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '299' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '361' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '362' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '380' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '382' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '383' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '387' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '403' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '416' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '421' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '429' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '433' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '444' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '458' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'marlei@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Marlei Leite',
                        senha_hash = '$pbkdf2-sha256$29000$eE8pxdhbC0FI6T2n9H7PeQ$YmyKsOX6Qii8WUjj.X7o5onmHiT9UUSl3rx22FX0jxg',
                        role = 'geral',
                        codigo_usuario = 5525,
                        administradora = 'Prop Starter',
                        codigo_condominio = '9, 20, 68, 88, 94, 120, 153, 171, 227, 229, 252, 273, 274, 276, 292, 315, 348, 351, 365, 390, 407, 440, 448, 449, 450, 452',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'e0cb100e-0476-4bc0-a976-e8bab432768d';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Marlei Leite', 'marlei@propstarter.com.br', '$pbkdf2-sha256$29000$eE8pxdhbC0FI6T2n9H7PeQ$YmyKsOX6Qii8WUjj.X7o5onmHiT9UUSl3rx22FX0jxg', 'geral', true, 5525, 'Prop Starter', '9, 20, 68, 88, 94, 120, 153, 171, 227, 229, 252, 273, 274, 276, 292, 315, 348, 351, 365, 390, 407, 440, 448, 449, 450, 452', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '9' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '20' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '68' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '88' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '94' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '120' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '153' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '171' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '227' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '229' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '252' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '273' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '274' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '276' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '292' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '315' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '348' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '351' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '365' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '390' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '407' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '440' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '448' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '449' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '450' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '452' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'providencias@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Eduardo Pereira Bordotti',
                        senha_hash = '$pbkdf2-sha256$29000$G8N4772XEgJgbA2hVCrlnA$mxmKhpT1RXx14HyGpagK3ujxE.8QVFRkEm7FQr1DjVQ',
                        role = 'geral',
                        codigo_usuario = 1974,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'ae3cb873-8f1c-48ba-9319-46b9de63cb60';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Eduardo Pereira Bordotti', 'providencias@propstarter.com.br', '$pbkdf2-sha256$29000$G8N4772XEgJgbA2hVCrlnA$mxmKhpT1RXx14HyGpagK3ujxE.8QVFRkEm7FQr1DjVQ', 'geral', true, 1974, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'victor@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Victor Bakaneski',
                        senha_hash = '$pbkdf2-sha256$29000$qFVqbc2ZU6p17v0fozRmLA$cMkhjRx3IBThQAtJDqjE3UDXoCy5U/TSPtz7KynYmMk',
                        role = 'geral',
                        codigo_usuario = 2595,
                        administradora = 'Prop Starter',
                        codigo_condominio = '7, 55, 80, 93, 102, 103, 106, 108, 113, 117, 132, 155, 165, 179, 182, 288, 291, 299, 361, 362, 380, 382, 383, 387, 403, 416, 421, 429, 433, 444, 458',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'SIM',
                        notificar_email = 'SIM',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '9a3981b2-b4bb-42ac-9ae3-97915c938fe5';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Victor Bakaneski', 'victor@propstarter.com.br', '$pbkdf2-sha256$29000$qFVqbc2ZU6p17v0fozRmLA$cMkhjRx3IBThQAtJDqjE3UDXoCy5U/TSPtz7KynYmMk', 'geral', true, 2595, 'Prop Starter', '7, 55, 80, 93, 102, 103, 106, 108, 113, 117, 132, 155, 165, 179, 182, 288, 291, 299, 361, 362, 380, 382, 383, 387, 403, 416, 421, 429, 433, 444, 458', 'nan', 'nan', 'nan', 'SIM', 'SIM');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '7' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '55' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '80' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '93' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '102' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '103' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '106' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '108' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '113' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '117' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '132' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '155' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '165' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '179' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '182' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '288' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '291' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '299' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '361' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '362' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '380' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '382' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '383' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '387' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '403' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '416' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '421' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '429' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '433' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '444' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = '458' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento1@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 01',
                        senha_hash = '$pbkdf2-sha256$29000$03pPiZHS2vv/P2fsvZeSMg$iV5zfXY.Nv2UXTOkgYw8/mXNAcekyi7AP1casJyBwRE',
                        role = 'contabilidade',
                        codigo_usuario = 1450,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '4a78f233-77c7-48d8-8dbe-3e87bbdb25ae';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 01', 'fechamento1@propstarter.com.br', '$pbkdf2-sha256$29000$03pPiZHS2vv/P2fsvZeSMg$iV5zfXY.Nv2UXTOkgYw8/mXNAcekyi7AP1casJyBwRE', 'contabilidade', true, 1450, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento2@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 02',
                        senha_hash = '$pbkdf2-sha256$29000$3tubc06JMQYAAOB8D0GI0Q$H9Ptp7UGwg5GRIol7Y/9ObRJb2Y3SS3MNhr7t5APlsc',
                        role = 'contabilidade',
                        codigo_usuario = 8395,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '29d9d76a-65a8-4d04-9e5d-719d00cbc87a';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 02', 'fechamento2@propstarter.com.br', '$pbkdf2-sha256$29000$3tubc06JMQYAAOB8D0GI0Q$H9Ptp7UGwg5GRIol7Y/9ObRJb2Y3SS3MNhr7t5APlsc', 'contabilidade', true, 8395, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento3@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 03',
                        senha_hash = '$pbkdf2-sha256$29000$sNa611rrXct5zzknRIjxng$sSkxTDiaD9KAgRsMI15UAZtqfHmkuimut5Byza0BDI0',
                        role = 'contabilidade',
                        codigo_usuario = 3255,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'bb424982-d8ea-4838-be36-6cef2ae4b45b';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 03', 'fechamento3@propstarter.com.br', '$pbkdf2-sha256$29000$sNa611rrXct5zzknRIjxng$sSkxTDiaD9KAgRsMI15UAZtqfHmkuimut5Byza0BDI0', 'contabilidade', true, 3255, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento4@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 04',
                        senha_hash = '$pbkdf2-sha256$29000$V2othZBSau19z5kTIkTI.Q$nd7UdAOdL2/Jv7B.sk31yvI//CVxLEQDVjaN/iGwcSo',
                        role = 'contabilidade',
                        codigo_usuario = 6691,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'c601b945-fce8-4bea-8088-8b4a3191a37e';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 04', 'fechamento4@propstarter.com.br', '$pbkdf2-sha256$29000$V2othZBSau19z5kTIkTI.Q$nd7UdAOdL2/Jv7B.sk31yvI//CVxLEQDVjaN/iGwcSo', 'contabilidade', true, 6691, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento5@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 05',
                        senha_hash = '$pbkdf2-sha256$29000$iBHivLc2JmRMCSEkxFgrhQ$O9ri5reTjIHbn/3YWww0UWlthuj8zyBlxjL37DVT4rw',
                        role = 'contabilidade',
                        codigo_usuario = 1322,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'fe3ba352-9093-4135-a0b8-d611ab52d17f';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 05', 'fechamento5@propstarter.com.br', '$pbkdf2-sha256$29000$iBHivLc2JmRMCSEkxFgrhQ$O9ri5reTjIHbn/3YWww0UWlthuj8zyBlxjL37DVT4rw', 'contabilidade', true, 1322, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento6@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 06',
                        senha_hash = '$pbkdf2-sha256$29000$cE7JuVdqTSllTCnFuPfeWw$R4rdWhwChimhEX13oQWEF0JCsGYMChgaUQp4R7UtGQY',
                        role = 'contabilidade',
                        codigo_usuario = 8225,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '385b227e-9405-4442-8771-1e74e72c9838';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 06', 'fechamento6@propstarter.com.br', '$pbkdf2-sha256$29000$cE7JuVdqTSllTCnFuPfeWw$R4rdWhwChimhEX13oQWEF0JCsGYMChgaUQp4R7UtGQY', 'contabilidade', true, 8225, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento7@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 07',
                        senha_hash = '$pbkdf2-sha256$29000$vjdGyFnrXct5T2mNMQbAuA$uGvDTD..cQGGnk7M1cJcztQXBBW7Kufp2bnPjovzJ/w',
                        role = 'contabilidade',
                        codigo_usuario = 4672,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '2e9ad786-484b-4500-9567-bd48c5129033';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 07', 'fechamento7@propstarter.com.br', '$pbkdf2-sha256$29000$vjdGyFnrXct5T2mNMQbAuA$uGvDTD..cQGGnk7M1cJcztQXBBW7Kufp2bnPjovzJ/w', 'contabilidade', true, 4672, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento8@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 08',
                        senha_hash = '$pbkdf2-sha256$29000$41zrfa.VsrbWmrO2du6dkw$J4oyXxkOnUarPIYCwEwyzvW0hT0Au3BvCwsyy1QvKD4',
                        role = 'contabilidade',
                        codigo_usuario = 5271,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'ea8a83e2-f644-447d-90bc-8e186c7f65d2';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 08', 'fechamento8@propstarter.com.br', '$pbkdf2-sha256$29000$41zrfa.VsrbWmrO2du6dkw$J4oyXxkOnUarPIYCwEwyzvW0hT0Au3BvCwsyy1QvKD4', 'contabilidade', true, 5271, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento9@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 09',
                        senha_hash = '$pbkdf2-sha256$29000$3dtbK.UcA8D4f4/xfq.1dg$12UH15GGbMaO9maCPztj37hCYVFpzuS0KdFYn5IXVxI',
                        role = 'contabilidade',
                        codigo_usuario = 3237,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '108b49c1-2a57-42ed-9429-8c0fc3bac356';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 09', 'fechamento9@propstarter.com.br', '$pbkdf2-sha256$29000$3dtbK.UcA8D4f4/xfq.1dg$12UH15GGbMaO9maCPztj37hCYVFpzuS0KdFYn5IXVxI', 'contabilidade', true, 3237, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento10@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 10',
                        senha_hash = '$pbkdf2-sha256$29000$FmIMYayVEoIQwrg3RsgZAw$Lu9V0KbOnlEKYfPcLjO5ktf/FwfIEZAHG/CJS477Enc',
                        role = 'contabilidade',
                        codigo_usuario = 2228,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'ac0b7bf7-24fd-48f7-b7cc-43d1a857d6c7';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 10', 'fechamento10@propstarter.com.br', '$pbkdf2-sha256$29000$FmIMYayVEoIQwrg3RsgZAw$Lu9V0KbOnlEKYfPcLjO5ktf/FwfIEZAHG/CJS477Enc', 'contabilidade', true, 2228, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento11@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 11',
                        senha_hash = '$pbkdf2-sha256$29000$VSplzHnP.f//v/deK0XoXQ$HE62c3wY8UwVCAUUrK4sTq/vn/d1pfkjpjIEjsKhqFI',
                        role = 'contabilidade',
                        codigo_usuario = 4008,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '82d3275a-3665-477e-baaa-0b2658d7d90b';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 11', 'fechamento11@propstarter.com.br', '$pbkdf2-sha256$29000$VSplzHnP.f//v/deK0XoXQ$HE62c3wY8UwVCAUUrK4sTq/vn/d1pfkjpjIEjsKhqFI', 'contabilidade', true, 4008, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento12@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 12',
                        senha_hash = '$pbkdf2-sha256$29000$F8J4z/nf21uLcS7lPCek9A$gFOH/2YEQCIOkoYLtPGZBhwuTFDNmB4mejZgBAh6WJY',
                        role = 'contabilidade',
                        codigo_usuario = 9773,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '6afeafc9-60b1-4aba-9579-771aecc4ec69';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 12', 'fechamento12@propstarter.com.br', '$pbkdf2-sha256$29000$F8J4z/nf21uLcS7lPCek9A$gFOH/2YEQCIOkoYLtPGZBhwuTFDNmB4mejZgBAh6WJY', 'contabilidade', true, 9773, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'fechamento13@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Fechamento 13',
                        senha_hash = '$pbkdf2-sha256$29000$RogxxpjT2rvXOkdoTcmZ0w$qJ.QOt44uYI6K5WqVlggpVfhLNUpchs796BT9n9vWbU',
                        role = 'contabilidade',
                        codigo_usuario = 8239,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'bec05987-8f96-409c-839e-5b366b549c74';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Fechamento 13', 'fechamento13@propstarter.com.br', '$pbkdf2-sha256$29000$RogxxpjT2rvXOkdoTcmZ0w$qJ.QOt44uYI6K5WqVlggpVfhLNUpchs796BT9n9vWbU', 'contabilidade', true, 8239, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'emissao@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Denner',
                        senha_hash = '$pbkdf2-sha256$29000$iNF6T8lZSwmB0Prf.5.Tcg$zFC6CdqeYOg2Kf5duWq6ulNjmKWNVoL.UPkQ0bEM4Z8',
                        role = 'geral',
                        codigo_usuario = 1402,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := '8d83bd79-6650-42f3-8ec9-559609a0d3ce';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Denner', 'emissao@propstarter.com.br', '$pbkdf2-sha256$29000$iNF6T8lZSwmB0Prf.5.Tcg$zFC6CdqeYOg2Kf5duWq6ulNjmKWNVoL.UPkQ0bEM4Z8', 'geral', true, 1402, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;

            DO $$
            DECLARE
                v_uid UUID;
            BEGIN
                SELECT id INTO v_uid FROM users WHERE email = 'segundavia@propstarter.com.br' LIMIT 1;
                IF v_uid IS NOT NULL THEN
                    UPDATE users SET
                        nome = 'Milena',
                        senha_hash = '$pbkdf2-sha256$29000$NGaslXLOWYvRmhPCmNN6Dw$8EfvaRQQRIgONqlyIOPF3e1AFWJ0JfdpT4l9QyXkp/A',
                        role = 'geral',
                        codigo_usuario = 6235,
                        administradora = 'Prop Starter',
                        codigo_condominio = 'todos (funções limitadas)',
                        gestor_usuarios = 'nan',
                        gestor_fornecedor = 'nan',
                        gestor_condominios = 'nan',
                        notificar_whatsapp = 'nan',
                        notificar_email = 'nan',
                        updated_at = NOW()
                    WHERE id = v_uid;
                ELSE
                    v_uid := 'fdd02cd4-331b-4fc4-ab80-cf1204a896b1';
                    INSERT INTO users (id, nome, email, senha_hash, role, ativo, codigo_usuario, administradora, codigo_condominio, gestor_usuarios, gestor_fornecedor, gestor_condominios, notificar_whatsapp, notificar_email)
                    VALUES (v_uid, 'Milena', 'segundavia@propstarter.com.br', '$pbkdf2-sha256$29000$NGaslXLOWYvRmhPCmNN6Dw$8EfvaRQQRIgONqlyIOPF3e1AFWJ0JfdpT4l9QyXkp/A', 'geral', true, 6235, 'Prop Starter', 'todos (funções limitadas)', 'nan', 'nan', 'nan', 'nan', 'nan');
                END IF;

                DELETE FROM user_condominios WHERE user_id = v_uid;
        
                    INSERT INTO user_condominios (id, user_id, condominio_id)
                    SELECT gen_random_uuid(), v_uid, id FROM condominios WHERE numero = 'todos (funções limitadas)' LIMIT 1
                    ON CONFLICT (user_id, condominio_id) DO NOTHING;
                END $$;