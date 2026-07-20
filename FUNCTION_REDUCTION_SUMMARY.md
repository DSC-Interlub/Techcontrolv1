# Resumo de Redução de Serverless Functions — TechControl

Este documento resume de forma concisa e direta a drástica redução das Serverless Functions ativas no projeto.

---

## 📈 Quadro de Evolução de Funções na Vercel

```
┌──────────────────────────────────────┐
│  Antes: 14 Serverless Functions      │  (Estourava limite de 12 do plano Hobby)
└──────────────────┬───────────────────┘
                   │
                   ▼  Refatoração & Consolidação
┌──────────────────────────────────────┐
│  Depois: 4 Serverless Functions      │  (Plena conformidade com folga de 66%)
└──────────────────────────────────────┘
```

---

## 🔍 Detalhamento do Status de Cada Função

### ❌ Deletadas (Bypassed) — Quantidade: 2
1.  **`portalLogin.js`**: Removida por obsolescência. Login agora é nativo via Supabase Auth no client.
2.  **`listarUsuarios.js`**: Removida. Listagem agora é feita direta na tabela `profiles` via client React (blindado por RLS).

### 🔀 Migrada para o Banco de Dados (Supabase) — Quantidade: 1
3.  **`gerarDemandasComunicados.js`**: Convertida em Stored Procedure SQL (`public.gerar_demandas_comunicados`) e agendada via `pg_cron`.

### 📂 Mescladas em `/api/notificar.js` (E-mails) — Quantidade: 7
4.  `enviarBoasVindas.js`
5.  `enviarDespedida.js`
6.  `notificarAprovadorRequisicao.js`
7.  `sendEmailTicketCreated.js`
8.  `sendEmailTicketStarted.js`
9.  `sendEmailTicketClosed.js`
10. `sendEmailChatMessage.js`

### 📂 Mescladas em `/api/cronDiario.js` (Crons) — Quantidade: 2
11. `enviarComunicadosDiarios.js`
12. `lembreteAvaliacao.js`

---

## 🚀 As 4 Funções Finais Ativas na Vercel

Estas são as únicas rotas ativas compiladas pela Vercel no deploy:

1.  **`/api/notificar`**: Centraliza todos os disparos de e-mails transacionais e de RH (Resend e Gmail).
2.  **`/api/cronDiario`**: Executa as crons diárias consolidadas.
3.  **`/api/inviteUser`**: Permite aos administradores de TI convidarem novos usuários para o Supabase Auth.
4.  **`/api/requisicaoComprasAction`**: Gerencia o fluxo de aprovações de compras dos gestores e do diretor por links.
