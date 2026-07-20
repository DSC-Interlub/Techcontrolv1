# CHANGELOG.md — TechControl

Todo o histórico de modificações de código e reestruturação da infraestrutura.

---

## [1.0.0] — 2026-07-20

### Adicionado
*   **[init_database.sql](file:///c:/techcontrol/Techcontrolv1-main/init_database.sql):** Script SQL consolidado contendo toda a modelagem física do banco de dados relacional com 22 tabelas, triggers de sincronização do `auth.users`, índices de busca, views consolidadas (`visao_patrimonio_consolidado` e `chamados_ativos_solicitantes`), regras RLS e inserts de seed.
*   **[openapi.yaml](file:///c:/techcontrol/Techcontrolv1-main/openapi.yaml):** Especificação OpenAPI/Swagger contendo toda a documentação das 11 rotas serverless na Vercel e webhooks do Supabase.
*   **[ResetPassword.jsx](file:///c:/techcontrol/Techcontrolv1-main/src/pages/ResetPassword.jsx) [NOVO]:** Página de redefinição de senha para conclusão do fluxo de recuperação de senha por email.
*   **[requisicaoComprasAction.js](file:///c:/techcontrol/Techcontrolv1-main/api/requisicaoComprasAction.js) [NOVO]:** Serverless function em Node.js para processar aprovações por e-mail e tokens UUID do Diretor.
*   **[notificarAprovadorRequisicao.js](file:///c:/techcontrol/Techcontrolv1-main/api/notificarAprovadorRequisicao.js) [NOVO]:** Serverless function em Node.js para envio de alertas por e-mail ao gestor quando uma requisição é criada.

### Modificado
*   **[base44Client.js](file:///c:/techcontrol/Techcontrolv1-main/src/api/base44Client.js):** Reescrito integralmente como um proxy de compatibilidade para fazer a ponte transparente entre chamadas legadas da Base44 e as consultas reais de tabelas/storage/auth do Supabase JS SDK.
*   **[supabase.js](file:///c:/techcontrol/Techcontrolv1-main/src/lib/supabase.js):** Mock mockado excluído e substituído pelo cliente de conexão real instanciado com o SDK `@supabase/supabase-js`.
*   **[AuthContext.jsx](file:///c:/techcontrol/Techcontrolv1-main/src/lib/AuthContext.jsx):** Refatorado para ouvir reativamente mudanças de login e logout via `supabase.auth.onAuthStateChange`.
*   **[Login.jsx](file:///c:/techcontrol/Techcontrolv1-main/src/pages/Login.jsx):** Reconstruído do zero com um formulário de login de TI nativo (com Magic Link e recuperação de senha).
*   **[portal-login.jsx](file:///c:/techcontrol/Techcontrolv1-main/src/pages/portal-login.jsx):** Refatorada a autenticação de colaboradores para usar diretamente `supabase.auth.signInWithPassword()` e suportar a flag de troca de senha obrigatória.
*   **[pages.config.js](file:///c:/techcontrol/Techcontrolv1-main/src/pages.config.js):** Reconfigurado para usar `React.lazy` para todas as páginas e registrar a rota `/reset-password`.
*   **[App.jsx](file:///c:/techcontrol/Techcontrolv1-main/src/App.jsx):** Adicionado suporte a `React.Suspense` com loader personalizado para as rotas lazy-loaded.
*   **[Layout.jsx](file:///c:/techcontrol/Techcontrolv1-main/src/Layout.jsx):** Adicionada a exceção para a rota `/reset-password` no verificador de rotas públicas do painel.
*   **[index.html](file:///c:/techcontrol/Techcontrolv1-main/index.html):** Corrigido o link do favicon quebrado para apontar para o asset existente `react.svg`, eliminando o erro de console HTTP 404.
*   **[package.json](file:///c:/techcontrol/Techcontrolv1-main/package.json):** Removidos pacotes obsoletos `@base44/sdk` e `@base44/vite-plugin`.

### Removido (Limpeza de Código Morto)
*   **`src/pages/Importar.jsx`**: Arquivo obsoleto de página de importação de planilhas.
*   **`src/components/ProtectedRoute.jsx`**: Componente de guarda de rota inativo.
*   **`src/components/UserNotRegisteredError.jsx`**: Tela de erro inativa.
*   **`src/lib/VisualEditAgent.jsx`**: Overlay inativo para manipulação visual de classes Tailwind.
*   **`src/lib/app-params.js`**: Declaração duplicada da appId do Base44.
*   **`base44/` [Diretório]**: Excluídas todas as funções antigas do Deno Deploy (migradas definitivamente para `/api` da Vercel).
