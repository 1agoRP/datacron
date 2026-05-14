---
trigger: always_on
description: >
  Antes de qualquer tarefa de código, consulte o knowledge graph do Datacron
  (graphify-out/) para entender a arquitetura sem ler arquivos desnecessários.
  Após modificações, atualize o grafo e o vault Obsidian.
---

# Regra: Graphify Knowledge Graph — Datacron

## 📋 FLUXO OBRIGATÓRIO

### ANTES de qualquer tarefa de código:
1. Leia `graphify-out/GRAPH_REPORT.md` para identificar os God Nodes e comunidades relevantes
2. Use `graphify query "<pergunta>"` para localizar os nós envolvidos (evita ler arquivos inteiros)
3. Use `graphify explain "<NomeDoNó>"` para entender um módulo específico
4. Use `graphify path "<A>" "<B>"` para entender como dois módulos se conectam
5. **Só abra arquivos reais** (`view_file`) quando o grafo não for suficiente para a decisão

### DEPOIS de qualquer modificação de código:
Execute o script de atualização:
```powershell
powershell -File scratch/update_obsidian.ps1
```
Ou manualmente:
```powershell
graphify update . --force
python scratch/graphify_obsidian.py
```

---

## 🗺️ MAPA DE ARQUIVOS DO DATACRON

### God Nodes (mais conectados — acesse via grafo primeiro):
- `ApiClient` (71 conexões) → `src/lib/api.ts`
- `BaseModel` (39 conexões) → Pydantic, `backend/app/schemas.py`
- `schemas.py` (33 conexões) → `backend/app/schemas.py`
- `User` (32 conexões) → `backend/app/models/user.py`
- `useAuth()` (29 conexões) → `src/context/AuthContext.tsx`
- `process_email_message()` (21 conexões) → `backend/app/services/email_monitor.py`
- `condominios.py` (20 conexões) → `backend/app/routers/condominios.py`
- `n8n_email_invoice()` (17 conexões) → `backend/app/routers/webhooks.py`

### Camadas da Arquitetura:
| Camada | Localização | Nós relevantes |
|---|---|---|
| Frontend (Next.js) | `src/` | `ApiClient`, `useAuth()`, `Shell()`, pages |
| API Routes (FastAPI) | `backend/app/routers/` | `condominios.py`, `auth.py`, `faturas.py` |
| Schemas (Pydantic) | `backend/app/schemas.py` | `schemas.py` (33 conexões) |
| Models (SQLAlchemy) | `backend/app/models/` | `User`, `Fatura`, `Concessionaria`, `Condominio` |
| Services | `backend/app/services/` | `email_monitor.py`, `email_sender.py`, `alert_manager.py` |
| Config/Auth | `backend/app/` | `dependencies.py`, `config.py`, `main.py` |

---

## 🔍 COMANDOS DE CONSULTA (preferir antes de abrir arquivos)

```powershell
# Encontrar onde uma funcionalidade está implementada:
graphify query "como funciona o download de faturas em lote"

# Entender um nó específico e seus vizinhos:
graphify explain "ApiClient"
graphify explain "process_email_message()"

# Caminho entre dois módulos:
graphify path "useAuth()" "ApiClient"
graphify path "n8n_email_invoice()" "Fatura"

# Explorar uma comunidade de nós relacionados:
graphify query "autenticação JWT token" --budget 1500
graphify query "email monitor concessionaria" --budget 2000
```

---

## 📁 VAULT OBSIDIAN

Localização: `graphify-out/obsidian/`
Ponto de entrada: `graphify-out/obsidian/00_ÍNDICE.md`
Grafo HTML interativo: `graphify-out/graph.html`

O vault contém:
- **895 notas** de nós (funções, classes, rotas, modelos)
- **96 hubs de comunidade** (`_COMMUNITY_*.md`)
- Links bidirecionais via `[[wikilinks]]`
- Frontmatter YAML com tags por tipo

---

## ⚡ REGRAS DE ECONOMIA DE TOKENS

1. **NUNCA** use `view_file` em um arquivo que o grafo já descreve completamente
2. **PREFIRA** `graphify query` a `grep_search` para questões arquiteturais
3. **USE** `graphify explain "<nó>"` antes de abrir o arquivo-fonte
4. **LEIA** apenas os trechos relevantes quando precisar do código exato (use `StartLine`/`EndLine`)
5. O script de atualização é **sem custo de LLM** (apenas AST — rápido e barato)
