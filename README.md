# 📂 Datacron — Gestão Inteligente de Concessionárias

> **[Aviso de Propriedade Privada]** Este software e todos os seus arquivos associados são propriedade exclusiva da **Datacron.com.br**. Todos os direitos reservados.

O **Datacron** é um ecossistema profissional de alta performance, projetado para administradoras de condomínios que precisam mitigar erros operacionais e automatizar o ciclo completo de gestão de faturas de consumo (Enel, Sabesp, Comgás, etc.).

---

## 🚀 Funcionalidades de Engenharia

*   **🕵️ Agente de IA para Monitoramento**: Escaneamento proativo de caixas de entrada para identificação e captura de faturas em tempo real.
*   **🔓 Desbloqueio Dinâmico de PDF**: Motor de regras integrando algoritmos de quebra de senha baseados em metadados e CNPJ.
*   **📊 Extração Granular (OCR/Heurística)**: Captura automatizada de valores, datas de vencimento, volumes de consumo e linhas digitáveis.
*   **🧠 Análise de Anomalias**: Sistema de alertas configuráveis para variações abruptas de consumo (ex: >35% da média histórica).
*   **📈 Dashboard Executivo**: Interface de controle centralizado exibindo o status de "Contas Esperadas vs. Recebidas".
*   **📥 Engine de Importação Híbrida**: Ferramenta de ETL para carga massiva de legacy data via Excel ou CSV com validação de integridade.

---

## 🛠️ Stack Tecnológica (Modern Web)

*   **Frontend**: Next.js 14+ (Arquitetura App Router)
*   **Linguagem**: TypeScript (Strict Mode para segurança de tipos)
*   **Styling**: Vanilla CSS + CSS Modules para máxima performance e zero overhead de frameworks utilitários.
*   **Animações & UX**: Framer Motion & Lucide React.
*   **Visualização**: Recharts para modelagem de dados financeiros.

---

## 📁 Arquitetura do Sistema

```text
src/
├── app/               # Rotas dinâmicas e Server Components
├── components/        # UI Kit e Componentes de layout (Shell, Sidebar)
├── lib/               # Clientes de API, lógica de negócio e utilitários
├── styles/            # Design System (tokens, globals.css, landing.css)
├── types/             # Definições de contratos e interfaces TS
└── hooks/             # Estado global e hooks de persistência de dados
```

---

## 🏗️ Setup de Desenvolvimento

1.  **Instalação**: 
    ```bash
    npm install
    ```
2.  **Execução**:
    ```bash
    npm run dev
    ```
3.  **Acesso**: Localhost disponível em [http://localhost:3000](http://localhost:3000)

---

## 🔒 Segurança & Compliance (LGPD)

O Datacron foi desenvolvido sob o paradigma de *Privacy by Design*:
*   **Mascaramento de PII**: Dados sensíveis (CPF/CNPJ) são tratados com camadas de ofuscação na visualização.
*   **Log de Auditoria**: Rastreamento completo de todas as decisões tomadas pelo agente de IA.
*   **Criptografia**: Preparado para integração com AES-256 no armazenamento de documentos críticos.

---

## ⚖️ Licença e Direitos Autorais (RESTRICTED DISTRIBUTION)

**Copyright (c) 2024-2026 Datacron.com.br. Todos os direitos reservados.**

**ESTE SOFTWARE É PROPRIETÁRIO E CONFIDENCIAL.**

Mesmo que este repositório esteja configurado como público para fins de demonstração técnica, **NÃO É PERMITIDA** a cópia, reprodução, redistribuição, sublicenciamento ou qualquer uso comercial deste código-fonte sem a autorização expressa e por escrito dos proprietários legais.

1.  **Uso Proibido**: Qualquer reprodução total ou parcial deste código para uso em outros projetos é estritamente proibida.
2.  **Derivados**: A criação de trabalhos derivados baseados neste código é proibida.
3.  **Engenharia Reversa**: Tentativas de descompilação ou engenharia reversa do software são ilegais.

*Qualquer violação destes termos estará sujeita às sanções previstas na Lei de Direitos Autorais (Lei nº 9.610/98) e legislação internacional de propriedade intelectual.*

---
*Desenvolvido por **Iago R. Prado Man** para Datacron.*
