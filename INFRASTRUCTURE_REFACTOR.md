# Plano de Reestruturação da Infraestrutura — TechControl

Este documento detalha o plano de refatoração arquitetural executado para transferir a responsabilidade lógica do backend da Vercel para o Supabase, eliminando o acoplamento severo de serverless functions e reduzindo o consumo de APIs para enquadramento perfeito no plano Hobby da Vercel.

---

## 1. Visão Geral da Refatoração

Anteriormente, o sistema dependia de **14 Serverless Functions** ativas na Vercel para gerenciar autenticação, consultas administrativas, disparos de e-mail e rotinas agendadas (Crons). Isso causava o travamento do build na Vercel devido ao limite máximo de **12** functions do plano Hobby.

### Estratégia de Consolidação e Eliminação:
```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│       INFRAESTRUTURA ANTERIOR        │     │         NOVA ARQUITETURA             │
│ - 14 Serverless Functions (Vercel)   │ ──> │ - 4 Serverless Functions (Vercel)    │
│ - Crons agendadas via Vercel         │     │ - RPCs / Stored Procedures (Supabase)│
│ - Funções de query na Vercel         │     │ - Consultas diretas via RLS          │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

---

## 2. Nova Divisão de Responsabilidades

### A. Exclusivas do Banco de Dados (Supabase)
*   **Geração de Demandas Mensais de RH:** Toda a lógica de varredura de aniversariantes e inserção de dados da antiga função `gerarDemandasComunicados.js` foi convertida em uma stored procedure PL/pgSQL nativa no Supabase chamada `public.gerar_demandas_comunicados()`. Ela é acionada via RPC pelo painel administrativo e agendada automaticamente via extensão `pg_cron`.
*   **Listagem de Usuários:** A API `/api/listarUsuarios` foi eliminada. A listagem de logins agora é realizada diretamente pelo cliente React na tabela `public.profiles` protegida por segurança RLS restrita a administradores.

### B. Unificadas na Vercel (Redução drástica de Functions)
*   **Notificações de E-mail:** Todos os disparos transacionais (chamados abertos, andamentos, chats, boas-vindas, despedida, alertas de requisições de compras) foram consolidados no endpoint genérico **`/api/notificar`**.
*   **Central de Envios (`api/_email.js`):** Um serviço helper privado centraliza as conexões HTTP com a API do Resend e SMTP (Nodemailer do Gmail), evitando duplicações de credenciais.
*   **Cron Job Consolidada (`api/cronDiario`):** As crons diárias de envio de comunicados e cobranças de auditoria de chamados foram consolidadas em uma única serverless function `/api/cronDiario`, acionada uma vez ao dia pela Vercel.

---

## 3. Benefícios Arquiteturais Obtidos

1.  **Conformidade de Deploy:** Redução de 14 para **4** funções compiladas na Vercel, permitindo a publicação instantânea sem erros no plano Hobby.
2.  **Performance:** As transações de dados de RH rodam nativamente dentro do banco de dados (Stored Procedure), eliminando transações de rede HTTP desnecessárias entre Vercel e Supabase.
3.  **Segurança:** A listagem de perfis administrativos está blindada por políticas de banco (Row Level Security) diretamente na tabela `profiles`.
4.  **Manutenibilidade:** Menos arquivos órfãos, código limpo e sem redundâncias de bibliotecas de e-mail (Resend/Nodemailer).
