# Mapeamento de Funções (Function Mapping) — TechControl

Este documento mapeia visual e tecnicamente a relação entre os arquivos físicos da pasta `/api`, as rotas virtuais de HTTP consumidas pelo frontend e agendadores, e os recursos correspondentes no banco de dados.

---

## 🗺️ Mapa de Fluxo de Execução

```
                    ┌─────────────────────────┐
                    │     Vercel Router       │
                    └───────────┬─────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HTTP CLIENT   │    │   VERCEL CRONS  │    │  DATABASE EVENT │
│ (Frontend Web)  │    │  (Agendamentos) │    │   (Trigger/DB)  │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         ├─ /api/inviteUser     ├─ /api/enviarComun... └─ (Futuro)
         ├─ /api/listarUsuarios ├─ /api/gerarDemand...
         ├─ /api/portalLogin    ├─ /api/lembreteAva...
         └─ /api/requisicao...
```

---

## 📊 Tabela de Mapeamento Completo

| Rota HTTP da API | Arquivo Físico (`/api/`) | Evento / Gatilho | Consumidor / Frontend |
| :--- | :--- | :--- | :--- |
| `/api/inviteUser` | `inviteUser.js` | POST HTTP (Manual) | Administradores (`/Usuarios`) |
| `/api/listarUsuarios` | `listarUsuarios.js` | GET HTTP (Manual) | Administradores (`/Usuarios`) |
| `/api/portalLogin` | `portalLogin.js` | POST HTTP (Manual) | *Nenhum (Obsoleto)* |
| `/api/requisicaoComprasAction` | `requisicaoComprasAction.js` | GET HTTP (Manual) | Aprovador/Diretor (via Link E-mail) |
| `/api/notificarAprovadorRequisicao` | `notificarAprovadorRequisicao.js` | POST HTTP (Manual) | Solicitante de Compra (`/Compras`) |
| `/api/sendEmailTicketCreated` | `sendEmailTicketCreated.js` | POST HTTP (Manual) | Abertura de Chamado (`/chamados`) |
| `/api/sendEmailTicketStarted` | `sendEmailTicketStarted.js` | POST HTTP (Manual) | Início de Chamado (`/chamados`) |
| `/api/sendEmailTicketClosed` | `sendEmailTicketClosed.js` | POST HTTP (Manual) | Encerramento de Chamado (`/chamados`) |
| `/api/sendEmailChatMessage` | `sendEmailChatMessage.js` | POST HTTP (Manual) | Chat do Chamado (`/chamados/chat`) |
| `/api/enviarBoasVindas` | `enviarBoasVindas.js` | POST HTTP (Manual) | Administradores (`/Colaboradores`) |
| `/api/enviarDespedida` | `enviarDespedida.js` | POST HTTP (Manual) | Administradores (`/Colaboradores`) |
| `/api/enviarComunicadosDiarios` | `enviarComunicadosDiarios.js` | Cron (13:00 Diário) | Disparo Automatizado (Vercel Cron) |
| `/api/gerarDemandasComunicados` | `gerarDemandasComunicados.js` | Cron (09:00 Mensal) | Disparo Automatizado (Vercel Cron) |
| `/api/lembreteAvaliacao` | `lembreteAvaliacao.js` | Cron (15:00 Diário) | Disparo Automatizado (Vercel Cron) |

---

## 🛠️ Análise de Chaves de Acesso Utilizadas

*   **Chaves de Alto Privilégio:** `inviteUser.js` e `requisicaoComprasAction.js` requerem a chave de serviço administrativa (`service_role`) para interagir com o auth e tabelas protegidas.
*   **Chaves Públicas / Anon:** As chamadas de e-mail de chamados são feitas pelo cliente autenticado no frontend sob a chave `anon` padrão, passando o cabeçalho JWT Bearer para autorização do usuário logado.
