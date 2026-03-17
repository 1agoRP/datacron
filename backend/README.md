# Datacron — Backend (FastAPI)

Este é o backend do sistema Datacron, construído com FastAPI, PostgreSQL (via SQLAlchemy) e processamento inteligente de e-mails/PDFs.

## 🚀 Como Executar Localmente

### 1. Criar ambiente virtual e instalar dependências
Certifique-se de estar na pasta `/backend`.
```bash
python -m venv venv
source venv/bin/activate  # No Windows: venv\\Scripts\\activate
pip install -r requirements.txt
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e preencha com suas credenciais do Banco de Dados (Supabase ou Local) e da Gmail API.
```bash
cp .env.example .env
```

### 3. Criar o Banco e Usuário Inicial
O script `seed.py` cria as tabelas e o primeiro usuário administrador.
```bash
python seed.py
```

### 4. Rodar o Servidor
```bash
uvicorn app.main:app --reload --port 8000
```
Acesse a documentação interativa em: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

---

## 🏗️ Estrutura do Backend

*   **`app/main.py`**: Ponto de entrada da aplicação.
*   **`app/database.py`**: Configuração do SQLAlchemy Async.
*   **`app/models/`**: Modelos do banco de dados (Postgres).
*   **`app/schemas.py`**: Validação de dados de entrada/saída (Pydantic).
*   **`app/routers/`**: Endpoints agrupados por funcionalidade (Faturas, Condomínios, etc).
*   **`app/services/`**: Lógica pesada (gmail\_monitor.py e pdf\_processor.py).
*   **`app/workers/`**: Jobs em background para varrer e-mails automaticamente.

---

## 🔒 Autenticação

O sistema utiliza JWT (JSON Web Token). Para acessar a maioria das rotas, você deve:
1.  Fazer login em `/api/auth/login`.
2.  Capturar o `access_token`.
3.  Enviar no cabeçalho das próximas requisições: `Authorization: Bearer <seu_token>`.

---

## 📧 Monitoramento de E-mails

O sistema usa a Gmail API. Para que funcione:
1.  Crie um projeto no Google Cloud Console.
2.  Ative a Gmail API.
3.  Crie credenciais OAuth 2.0 (Desktop App).
4.  Baixe o arquivo JSON e salve como `backend/credentials.json`.
5.  Ao rodar o sistema pela primeira vez, o terminal abrirá o navegador para consentimento.
