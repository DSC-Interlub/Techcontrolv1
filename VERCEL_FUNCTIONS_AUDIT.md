# Auditoria de Serverless Functions (Vercel) — TechControl

Este documento detalha a auditoria realizada nas APIs do diretório `/api`, identificando a quantidade de funções carregadas, o motivo pelo qual estouram o limite da Vercel no plano Hobby e os arquivos mapeados.

---

## 1. O Problema Identificado

O deploy do TechControl na Vercel está falhando com o erro:
> **"No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan."**

Esse erro ocorre porque a Vercel, no plano **Hobby**, limita o número máximo de Serverless Functions por projeto a **12**. Atualmente, a pasta `/api` do repositório contém **15 arquivos Javascript**, dos quais **14** são processados e empacotados de forma independente como Serverless Functions.

---

## 2. Contagem Detalhada das Funções

A pasta `/api` possui os seguintes arquivos:

| # | Arquivo | Status na Vercel | Função |
| :--- | :--- | :--- | :--- |
| 1 | `_supabase.js` | **Ignorado** | Biblioteca helper (iniciada com `_`) |
| 2 | `enviarBoasVindas.js` | **Mapeado como Function** | Envio de e-mail transacional (Resend) |
| 3 | `enviarComunicadosDiarios.js` | **Mapeado como Function** | Cron diária de aniversários (Resend) |
| 4 | `enviarDespedida.js` | **Mapeado como Function** | Envio em massa de e-mail (Resend) |
| 5 | `gerarDemandasComunicados.js` | **Mapeado como Function** | Cron mensal de criação de linhas no banco |
| 6 | `inviteUser.js` | **Mapeado como Function** | Convite administrativo de logins de TI |
| 7 | `lembreteAvaliacao.js` | **Mapeado como Function** | Cron diária de e-mails de auto-avaliação |
| 8 | `listarUsuarios.js` | **Mapeado como Function** | Retorno de logins da TI para o grid |
| 9 | `notificarAprovadorRequisicao.js` | **Mapeado como Function** | Alertas de compras (Resend) |
| 10 | `portalLogin.js` | **Mapeado como Function** | Autenticação legada de colaboradores |
| 11 | `requisicaoComprasAction.js` | **Mapeado como Function** | Aprovações de compras pelo aprovador/diretor |
| 12 | `sendEmailChatMessage.js` | **Mapeado como Function** | Notificação de chat do chamado (Resend) |
| 13 | `sendEmailTicketClosed.js` | **Mapeado como Function** | Notificação de chamado encerrado (Resend) |
| 14 | `sendEmailTicketCreated.js` | **Mapeado como Function** | Notificação de chamado aberto (Resend) |
| 15 | `sendEmailTicketStarted.js` | **Mapeado como Function** | Notificação de chamado iniciado (Resend) |

*   **Total de Funções Mapeadas:** 14
*   **Limite do Plano Hobby:** 12
*   **Excesso:** +2 Funções acima do limite.

---

## 3. Análise dos Cron Jobs (`vercel.json`)

Três das funções mapeadas são disparadas em segundo plano via crons configuradas no arquivo `vercel.json`:
*   `/api/enviarComunicadosDiarios` ➡️ Diário (`0 13 * * *`)
*   `/api/gerarDemandasComunicados` ➡️ Mensal (`0 9 1 * *`)
*   `/api/lembreteAvaliacao` ➡️ Diário (`0 15 * * *`)

Essas rotas precisam ser mantidas ativas de alguma forma para não quebrar a automação das comunicações e cobranças de auditorias patrimoniais de TI.
