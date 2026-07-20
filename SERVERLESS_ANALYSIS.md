# Análise Detalhada de Serverless Functions — TechControl

Este documento detalha o comportamento, relevância e alternativas arquiteturais para cada uma das 14 Serverless Functions ativas no projeto.

---

## 🚀 Mapeamento Geral e Possíveis Destinos

Podemos agrupar as funções em 4 categorias de migração:
1.  **Elimináveis (Código Morto / Substituído por RLS no Frontend)**
2.  **Conversão para Banco de Dados (Database Functions / Stored Procedures)**
3.  **Unificáveis (Consolidar rotas semelhantes de e-mail numa única API)**
4.  **Edge Functions (Migrar para Supabase Edge Functions)**

---

## 🔍 Fichas Individuais de Investigação

### 1. `enviarBoasVindas.js`
*   **Caminho:** `api/enviarBoasVindas.js`
*   **Finalidade:** Dispara e-mail de boas-vindas transacional com os dados de acesso inicial do novo colaborador cadastrado pelo TI.
*   **Dependências:** `_supabase.js` (cliente admin), SDK do Resend.
*   **Motivo de ser Function:** Lida com disparo de e-mails em segundo plano usando chaves privadas.
*   **Necessidade:** Alta.
*   **Destino Recomendado:** **Supabase Edge Function** ou **Disparo via Trigger do Banco**.
*   **Alternativas de Implementação:** Pode ser executada pelo frontend? **Não**, pois exporia a chave do Resend. Pode ser RPC/Database Function? Não diretamente, pois faz chamadas HTTP para o Resend. Pode ser Supabase Edge Function? **Sim**, porta-se perfeitamente para Deno/TypeScript.
*   **Impacto de Remoção:** Novos colaboradores não receberiam e-mails contendo suas credenciais de portal criadas pelo TI.

### 2. `enviarComunicadosDiarios.js`
*   **Caminho:** `api/enviarComunicadosDiarios.js`
*   **Finalidade:** Cron job diário. Varre aniversariantes e tempo de empresa, enviando e-mails com layouts automatizados.
*   **Dependências:** `_supabase.js`, SDK do Resend.
*   **Motivo de ser Function:** Rotina agendada (Cron) que faz queries no banco e dispara e-mails.
*   **Necessidade:** Média/Alta.
*   **Destino Recomendado:** **Supabase Edge Function** acionada por `pg_cron`.
*   **Impacto de Remoção:** Funcionários não receberiam homenagens de aniversário do DP.

### 3. `enviarDespedida.js`
*   **Caminho:** `api/enviarDespedida.js`
*   **Finalidade:** Envia e-mail em massa comunicando o desligamento de um colaborador.
*   **Dependências:** `_supabase.js`, SDK do Resend.
*   **Motivo de ser Function:** Envio de e-mails usando chaves privadas de envio em massa.
*   **Necessidade:** Média.
*   **Destino Recomendado:** **Supabase Edge Function**.
*   **Impacto de Remoção:** Interrupção do disparo automático de avisos de desligamento para a equipe.

### 4. `gerarDemandasComunicados.js`
*   **Caminho:** `api/gerarDemandasComunicados.js`
*   **Finalidade:** Cron mensal que varre aniversariantes do próximo mês e insere demandas na tabela `comunicados_artes`.
*   **Dependências:** `_supabase.js`.
*   **Motivo de ser Function:** Cron job agendada via Vercel.
*   **Necessidade:** Alta.
*   **Destino Recomendado:** **Database Function (Stored Procedure) + pg_cron** no Supabase.
*   **Por que?** Ela realiza **apenas** SELECTs e INSERTs internos no banco de dados. Não faz requisições externas para o Resend ou outras APIs. Rodar isso em PL/pgSQL elimina 100% o overhead HTTP e a dependência de uma serverless function na Vercel!
*   **Impacto de Remoção:** As demandas de artes mensais do DP deixam de ser listadas.

### 5. `inviteUser.js`
*   **Caminho:** `api/inviteUser.js`
*   **Finalidade:** Convida um usuário administrativo de TI para o Supabase Auth usando o SDK Admin (`auth.admin.inviteUserByEmail`).
*   **Dependências:** `_supabase.js` (cliente admin).
*   **Motivo de ser Function:** Requer a `service_role` com bypass de RLS para interagir com o módulo Auth de administração do Supabase.
*   **Necessidade:** Alta.
*   **Destino Recomendado:** **Supabase Edge Function** usando privilégios administrativos.
*   **Impacto de Remoção:** Impossibilidade de convidar novos usuários do painel administrativo.

### 6. `lembreteAvaliacao.js`
*   **Caminho:** `api/lembreteAvaliacao.js`
*   **Finalidade:** Cron diário. Envia e-mails cobrando colaboradores que não realizaram a auto-avaliação anual de suas máquinas de trabalho.
*   **Dependências:** `_supabase.js`, SDK do Resend.
*   **Necessidade:** Média.
*   **Destino Recomendado:** **Supabase Edge Function** acionada por `pg_cron`.
*   **Impacto de Remoção:** Baixo retorno dos checklists de TI.

### 7. `listarUsuarios.js`
*   **Caminho:** `api/listarUsuarios.js`
*   **Finalidade:** Retorna a lista de perfis do banco para exibir nos usuários do sistema.
*   **Dependências:** `_supabase.js`.
*   **Necessidade:** **Nenhuma (Pode ser 100% eliminada!)**.
*   **Por que?** No Supabase, o banco é acessível diretamente pelo cliente frontend. Basta habilitar leitura na tabela `profiles` restrita a usuários administradores através de uma regra de segurança RLS:
    ```sql
    CREATE POLICY "Apenas admin le perfis" ON profiles 
    FOR SELECT TO authenticated 
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
    ```
    Dessa forma, o frontend pode fazer `supabase.from('profiles').select('*')` de forma direta e segura, eliminando esta API.
*   **Impacto de Remoção:** Nenhum, desde que o frontend mude para query direta protegida por RLS.

### 8. `notificarAprovadorRequisicao.js`
*   **Caminho:** `api/notificarAprovadorRequisicao.js`
*   **Finalidade:** Dispara alertas de e-mail ao gestor e confirmação ao colaborador ao criar requisição de compras.
*   **Dependências:** `_supabase.js`, Resend.
*   **Necessidade:** Alta.
*   **Destino Recomendado:** **Supabase Webhook + Edge Function**.
*   **Impacto de Remoção:** Gestores de compras não saberiam quando há requisições abertas sem entrar ativamente no painel.

### 9. `portalLogin.js`
*   **Caminho:** `api/portalLogin.js`
*   **Finalidade:** Autenticava funcionários do portal no ecossistema legada Base44.
*   **Necessidade:** **Nenhuma (Pode ser 100% eliminada!)**.
*   **Por que?** A autenticação do Portal do Colaborador foi migrada integralmente para o Supabase Auth Nativo usando `supabase.auth.signInWithPassword` e `supabase.auth.updateUser` diretamente no frontend. Essa função é código morto.
*   **Impacto de Remoção:** Zero.

### 10. `requisicaoComprasAction.js`
*   **Caminho:** `api/requisicaoComprasAction.js`
*   **Finalidade:** Processa as ações de aprovação ou reprovação que o Diretor realiza diretamente clicando nos botões do e-mail.
*   **Dependências:** `_supabase.js`, Resend.
*   **Necessidade:** Alta.
*   **Destino Recomendado:** **Supabase Edge Function** (pois requer validação HTTP pública dos cliques de e-mail).
*   **Impacto de Remoção:** Interrupção do fluxo de aprovação de compras em lote corporativo por e-mail.

### 11 a 14. Chamados E-mails (`sendEmailTicketCreated.js`, `sendEmailTicketStarted.js`, `sendEmailTicketClosed.js`, `sendEmailChatMessage.js`)
*   **Caminhos:**
    *   `api/sendEmailTicketCreated.js`
    *   `api/sendEmailTicketStarted.js`
    *   `api/sendEmailTicketClosed.js`
    *   `api/sendEmailChatMessage.js`
*   **Finalidade:** Disparar notificações por e-mail ao solicitante e ao TI sobre a evolução do chamado (abertura, atribuição, fechamento e novas mensagens).
*   **Dependências:** `_supabase.js`, Resend.
*   **Necessidade:** Alta.
*   **Destino Recomendado:** **Unificar em 1 única Serverless Function** na Vercel (ex: `/api/sendTicketNotification.js`), recebendo o tipo do evento no payload e reduzindo o consumo de 4 functions para apenas 1!
*   **Impacto de Remoção:** Usuários não seriam avisados de respostas de chamados ou conclusões.
