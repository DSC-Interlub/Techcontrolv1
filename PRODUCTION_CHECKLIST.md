# Checklist Pré-Produção — TechControl

Este checklist enumera todas as validações obrigatórias que devem ser executadas e marcadas como concluídas antes de liberar o acesso oficial dos colaboradores ao sistema **TechControl** em produção.

---

## 1. Banco de Dados & RLS (Supabase)
*   `[ ]` **RLS Ativo:** Certifique-se de que a segurança RLS está ativa em todas as 22 tabelas do banco. Execute no SQL Editor para verificar se há alguma tabela desprotegida:
    ```sql
    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
    ```
    *Todas as tabelas do TechControl devem exibir `true` na coluna `rowsecurity`.*
*   `[ ]` **Políticas de Anon Restritas:** Teste fazer chamadas HTTP na tabela `profiles` ou `configuracoes` sem passar token de autorização. O Supabase deve retornar um array vazio ou bloquear o acesso.
*   `[ ]` **Sincronia Auth/Profiles:** Registre um usuário de teste no Supabase Auth e confirme se a trigger inseriu automaticamente o registro correspondente em `public.profiles`.
*   `[ ]` **Integridade de Storage:** Valide se o bucket `uploads` está criado como público e se as políticas permitem o upload de imagens de chamados e barram alterações de terceiros.

---

## 2. APIs & Disparo de E-mails (Vercel & Resend)
*   `[ ]` **Status Domínio Resend:** No painel do Resend, verifique se o status do domínio está marcado como `Verified`.
*   `[ ]` **Teste de Funções Serverless:** Execute uma chamada de teste no endpoint `/api/notificarAprovadorRequisicao` e valide o recebimento de e-mail na caixa de entrada.
*   `[ ]` **Headers de Autorização:** Confirme se as funções serverless barram requisições não autenticadas que tentam acessar rotas internas (ex: `/api/listarUsuarios` ou `/api/inviteUser` devem retornar HTTP 401 ou 403 se o JWT não for fornecido).

---

## 3. Frontend & UX (Vite/React)
*   `[ ]` **Console do Navegador Limpo:** Abra a aplicação no navegador em modo de desenvolvimento, faça login e navegue pelas telas. Certifique-se de que não há erros (`Uncaught Error`) ou alertas de imports inválidos.
*   `[ ]` **Configuração de Code Splitting:** Certifique-se de que a tela de carregamento dinâmico (com o spinner animado do `Suspense`) funciona de forma fluida durante as transições de páginas mais complexas.
*   `[ ]` **Responsividade:** Abra a aplicação em modo mobile no navegador (F12 ➡️ modo responsivo) e teste a navegação em celulares de tela menor. Verifique se a gaveta lateral responsiva (`use-mobile`) fecha e abre sem quebrar o layout.
*   `[ ]` **Metadados e SEO:** Verifique se as tags HTML5 semânticas, meta descrições e títulos de páginas no `index.html` estão preenchidos de forma correta e polida.

---

## 4. Segurança de Infraestrutura
*   `[ ]` **Segredos Injetados:** Verifique na Vercel se as variáveis de ambiente sensíveis (`SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY`) estão devidamente ocultas e não expostas no código do cliente.
*   `[ ]` **Certificado SSL Ativo:** Verifique se o HTTPS está ativo no seu domínio de produção com cadeado de segurança verde válido.
*   `[ ]` **Exclusão de Stubs de Desenvolvimento:** Certifique-se de que stubs de simulação de chamadas HTTP antigos foram removidos do bundle de produção.
