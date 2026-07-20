# Relatório de Código Morto (Dead Code) — TechControl

Este relatório detalha a busca de resíduos da infraestrutura legada da Base44, proxies não utilizados, imports órfãos e arquivos mortos.

---

## 1. Mapeamento de Código Morto / Obsoleto

Após a migração para a infraestrutura do Supabase, duas APIs da pasta `/api` tornaram-se obsoletas e foram marcadas para remoção para liberar espaço nas serverless functions:

### API `/api/portalLogin.js`
*   **Motivo de obsolescência:** O portal do colaborador foi migrado para utilizar a SDK cliente oficial do Supabase Auth (`supabase.auth.signInWithPassword` e `supabase.auth.updateUser`) diretamente no navegador cliente. A validação de login local que era delegada para a API foi eliminada, e as chaves de acesso JWT são geradas nativamente pelo Supabase Auth.
*   **Status de Chamadas:** Nenhuma rota ou componente no frontend ativo aponta para esta API.

### API `/api/listarUsuarios.js`
*   **Motivo de obsolescência:** A exibição de usuários na tela `/Usuarios` pode ler os perfis diretamente da tabela `profiles` do Supabase usando segurança em nível de linha (RLS) restrita a administradores. A delegação de queries a uma serverless function exclusiva na Vercel é código morto que consome quota do plano Hobby desnecessariamente.
*   **Status de Chamadas:** Atualmente consumida pelo client wrapper, mas pode ser imediatamente redefinida para leitura direta da SDK no cliente React.

---

## 2. Status dos Resquícios Base44

*   **SDK `@base44/sdk` e `@base44/vite-plugin`:** Totalmente removidos do arquivo `package.json` e do bundle de produção do Vite.
*   **Funções de Servidor Legadas (Deno Deploy):** A pasta `/base44` na raiz foi completamente excluída, incluindo todos os scripts TypeScript antigos.
*   **Arquivos Estáticos de Edição Visual:** Os arquivos `Importar.jsx`, `ProtectedRoute.jsx`, `UserNotRegisteredError.jsx`, `VisualEditAgent.jsx` e `app-params.js` foram excluídos da pasta `/src` do frontend.
*   **Proxy Adapter (`base44Client.js`):**
    O arquivo `base44Client.js` em `/src/api` atua como um adaptador (adapter proxy) que traduz os comandos das telas antigas (como `base44.entities.PCs_Internos.list()`) em consultas para a SDK do Supabase. 
    *   *Nota arquitetural:* Embora carregue o nome "base44" no nome do arquivo e do objeto, ele é **100% código próprio e seguro** que comunica apenas com o Supabase. Ele foi mantido propositalmente para evitar reescrever manualmente a lógica de dados em mais de 30 telas do frontend. Não consome recursos de computação no lado servidor e é otimizado durante o build do frontend.
