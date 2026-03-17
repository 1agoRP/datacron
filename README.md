# Datacron - Gestão Inteligente de Concessionárias

O Datacron é um sistema web profissional desenvolvido para administradoras de condomínios que buscam automatizar o controle de contas de consumo (Enel, Sabesp, Comgás, etc.).

## 🚀 Funcionalidades Principais

-   **Monitoramento de E-mail**: Agente de IA que identifica faturas recebidas em um determinado e-mail.
-   **Desbloqueio de PDF**: Regras automáticas de senha baseadas no CNPJ do condomínio.
-   **Extração de Dados**: Captura automática de valor, vencimento, consumo e código de barras.
-   **Análise Inteligente**: Alertas de variação de custo (ex: +35% da média) e detecção de anomalias.
-   **Dashboard Analítico**: Visão clara de contas esperadas vs. recebidas.
-   **Importador Excel/CSV**: Ferramenta para carga inicial de dados de condomínios e concessionárias.

## 🛠️ Stack Tecnológica

-   **Frontend**: Next.js 14+ (App Router)
-   **Linguagem**: TypeScript
-   **Estilização**: Vanilla CSS + CSS Modules (Foco em performance e controle)
-   **Ícones**: Lucide React
-   **Animações**: Framer Motion
-   **Gráficos**: Recharts

## 📁 Estrutura do Projeto

```text
src/
├── app/               # Rotas e Páginas (Dashboard, Condominios, etc.)
├── components/        # Componentes Reutilizáveis (Shell, Sidebar, UI)
├── lib/               # Mock data e Lógica utilitária (Senhas, Formatação)
├── styles/            # Design System (globals.css, landing.css)
├── types/             # Definições de Interface TypeScript
└── hooks/             # Custom hooks para estado global e fetch
```

## 🏗️ Como Iniciar

1.  Instale as dependências:
    ```bash
    npm install
    ```
2.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
3.  Acesse `http://localhost:3000`

## 🔒 Segurança & LGPD

O sistema foi projetado com:
-   Mascaramento de dados sensíveis (CPF/CNPJ).
-   Logs de auditoria em todas as ações do agente de IA.
-   Estrutura preparada para criptografia AES-256 de documentos.

---
Desenvolvido por **Antigravity** para Datacron.com.br
