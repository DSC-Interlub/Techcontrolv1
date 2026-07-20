# Relatório de Migração de Funções (Function Migration Report) — TechControl

Este relatório documenta detalhadamente a migração e o novo destino de cada uma das APIs originais do projeto para a nova arquitetura unificada.

---

## 📋 Tabela de Destino de Migração

| Antigo Arquivo Físico (`/api/`) | Categoria da Função | Novo Destino Arquitetural | Tipo de Ação |
| :--- | :--- | :--- | :--- |
| `portalLogin.js` | Autenticação | **Eliminado** | Acesso cliente direto no Supabase Auth |
| `listarUsuarios.js` | CRUD / Query | **Eliminado** | Acesso cliente direto em `profiles` (RLS ativa) |
| `inviteUser.js` | Autenticação | **Mantido na Vercel** (`api/inviteUser.js`) | Chamada HTTP POST |
| `requisicaoComprasAction.js` | Integrações | **Mantido na Vercel** (`api/requisicaoComprasAction.js`) | Chamada HTTP POST |
| `enviarBoasVindas.js` | Envio de e-mails | **Consolidado** em `/api/notificar` (Gmail) | Chamada HTTP POST com payload |
| `enviarDespedida.js` | Envio de e-mails | **Consolidado** em `/api/notificar` (Gmail) | Chamada HTTP POST com payload |
| `notificarAprovadorRequisicao.js`| Envio de e-mails | **Consolidado** em `/api/notificar` (Resend) | Chamada HTTP POST com payload |
| `sendEmailTicketCreated.js` | Envio de e-mails | **Consolidado** em `/api/notificar` (Resend) | Chamada HTTP POST com payload |
| `sendEmailTicketStarted.js` | Envio de e-mails | **Consolidado** em `/api/notificar` (Resend) | Chamada HTTP POST com payload |
| `sendEmailTicketClosed.js` | Envio de e-mails | **Consolidado** em `/api/notificar` (Resend) | Chamada HTTP POST com payload |
| `sendEmailChatMessage.js` | Envio de e-mails | **Consolidado** em `/api/notificar` (Resend) | Chamada HTTP POST com payload |
| `enviarComunicadosDiarios.js` | Cron Jobs | **Consolidado** em `/api/cronDiario` (Gmail) | Cron Diária (13:00) / HTTP GET/POST |
| `lembreteAvaliacao.js` | Cron Jobs | **Consolidado** em `/api/cronDiario` (Resend) | Cron Diária (13:00) / HTTP GET/POST |
| `gerarDemandasComunicados.js` | Cron / DB Job | **Migrado para Supabase RPC** | Database PL/pgSQL Stored Procedure |

---

## 🔄 Lógica de Redirecionamento no Adaptador Client (`base44Client.js`)

Para manter total compatibilidade com as telas do frontend sem precisar reescrever as chamadas em mais de 30 páginas do site, o adaptador proxy local **`src/api/base44Client.js`** intercepta o método `base44.functions.invoke(name, payload)` e realiza o redirecionamento dinâmico:

*   **`listarUsuarios`** ➡️ Interceptado e executado como `supabase.from('profiles').select('*')`.
*   **`gerarDemandasComunicados`** ➡️ Interceptado e executado como `supabase.rpc('gerar_demandas_comunicados', { usar_mes_atual: payload.mes_atual })`.
*   **APIs de E-mail / Notificações** ➡️ Interceptadas e encaminhadas para `/api/notificar` passando `{ type: name, data: payload }`.
*   **APIs de Cron** ➡️ Interceptadas e encaminhadas para `/api/cronDiario` passando `{ runType: 'avaliacoes' }`.
*   **Demais Rotas (`inviteUser`, `requisicaoComprasAction`)** ➡️ Encaminhadas diretamente para os respectivos endpoints da Vercel.
