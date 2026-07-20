# AUDIT_REPORT.md — TechControl
> **Relatório Detalhado de Auditoria do Sistema**  
> **Autor:** Antigravity (Arquiteto Principal de Sistemas)  
> **Data:** 20 de Julho de 2026

---

## 1. CÓDIGO MORTO E COMPONENTES NÃO UTILIZADOS
Foram identificados arquivos de componentes e scripts que não são importados, referenciados ou utilizados em nenhum fluxo ativo do sistema, representando código obsoleto (dead code):

1.  **`src/pages/Importar.jsx` (Página Morta):**
    *   **Situação:** É uma página completa de 26KB para importação em massa de planilhas.
    *   **Problema:** Não é importada nem registrada no [pages.config.js](file:///c:/techcontrol/Techcontrolv1-main/src/pages.config.js). Não existe rota cadastrada para ela e o layout do menu lateral não a referencia.
2.  **`src/pages/Home.jsx` (Placeholder Vazio):**
    *   **Situação:** Registrada nas rotas como `/Home`, mas seu conteúdo retorna apenas uma `div` vazia (`<div></div>`).
    *   **Problema:** É um arquivo sem utilidade funcional. A página inicial padrão do sistema está configurada no config como `/Dashboard`.
3.  **`src/components/ProtectedRoute.jsx` (Componente Inativo):**
    *   **Situação:** Componente que deveria fazer a guarda de rotas de TI com base na sessão.
    *   **Problema:** O arquivo [App.jsx](file:///c:/techcontrol/Techcontrolv1-main/src/App.jsx) não importa este componente. O bloqueio de navegação está sendo feito de forma descentralizada e imperativa direto no [Layout.jsx](file:///c:/techcontrol/Techcontrolv1-main/src/Layout.jsx) (redirecionando com `window.location.href`).
4.  **`src/components/UserNotRegisteredError.jsx` (Componente Inativo):**
    *   **Situação:** Tela de erro para usuários não cadastrados na base de perfis.
    *   **Problema:** Só é importada por `ProtectedRoute.jsx`. Como o `ProtectedRoute` está inativo, esta tela nunca é exibida.
5.  **`src/lib/VisualEditAgent.jsx` (Script de Sandbox):**
    *   **Situação:** Arquivo de 20KB que escuta eventos `postMessage` da janela pai para manipulação visual de classes do Tailwind CSS no sandbox de desenvolvimento.
    *   **Problema:** Sem uso em produção e sem nenhuma referência/import no código principal.
6.  **`src/lib/app-params.js` (Configuração Duplicada):**
    *   **Situação:** Declara o objeto `appParams` contendo a chave `appId`.
    *   **Problema:** Sem imports ativos. O SDK da Base44 é inicializado diretamente no arquivo [base44Client.js](file:///c:/techcontrol/Techcontrolv1-main/src/api/base44Client.js) com a string literal do ID.
7.  **`src/lib/supabase.js` (Stub Mockado):**
    *   **Situação:** Arquivo contendo mock estático com retornos nulos para simular chamadas de autenticação e tabelas do Supabase.
    *   **Problema:** Sem imports no frontend ativo, existindo apenas para evitar falhas em referências da documentação.

---

## 2. IMPORTS INVÁLIDOS E ROTAS QUEBRADAS

### 2.1 Imports de Assets Inválidos
*   **`index.html` (Favicon Inexistente):**  
    O cabeçalho HTML declara a tag:  
    `<link rel="icon" type="image/svg+xml" href="/favicon.ico" />`  
    No entanto, o arquivo `favicon.ico` **não existe** nem na raiz do projeto nem na pasta `/public`, gerando uma requisição de asset quebrada (Erro HTTP 404) no navegador de todos os usuários.

### 2.2 Rotas Quebradas / Sem Link
*   **Rota `/Importar`:** A funcionalidade de importação de dados de TI está totalmente inacessível para o usuário, pois a rota não existe no roteador e o botão/link correspondente foi omitido no painel administrativo.
*   **Rota `/Home`:** Cadastrada e ativa, porém exibe uma tela totalmente branca/vazia caso o usuário acesse `/Home` diretamente pela barra de endereços do navegador.

---

## 3. ASSETS DUPLICADOS E IMAGENS NÃO UTILIZADAS
*   **`src/assets/react.svg` (Asset Não Utilizado):**  
    O arquivo SVG padrão do template do React (instalado pelo Vite) está presente na pasta de assets, mas não é consumido por nenhum componente do sistema.

---

## 4. APIs E DEPENDÊNCIAS QUEBRADAS

### 4.1 APIs e Funções do Backend Quebradas/Ausentes
*   **Endpoints de Compra Ausentes na Vercel:** As funções `requisicaoComprasAction` e `notificarAprovadorRequisicao` existem no formato de arquivo Deno Deploy sob a pasta `base44/functions`, mas **não possuem correspondente** no diretório `/api/` da Vercel. Qualquer requisição do frontend do módulo de compras para estas APIs resultará em Erro HTTP 404.
*   **API `listarUsuarios.js`:** A rota na Vercel tenta ler todos os perfis em `supabase.from('profiles').select('*')`. No entanto, se o admin não cadastrou a chave `SUPABASE_SERVICE_ROLE_KEY` nas variáveis de ambiente da Vercel, o endpoint falhará ao tentar listar perfis ou convidar usuários.

### 4.2 Riscos e Vulnerabilidades de Dependências (NPM Audit)
A auditoria via `npm audit` detectou **26 vulnerabilidades** nas dependências atuais do projeto:
*   **1** Crítica
*   **14** de Alta severidade
*   **10** Moderadas
*   **1** Baixa
*   *Depreciação:* O pacote `node-domexception` (declarado de forma transitória) está marcado como obsoleto. A stack deve ser atualizada para utilizar o DOMException nativo do Node.js.

---

## 5. SECRETS EXPOSTOS
*   **Análise de Código:** Não foram encontrados secrets privados (como chaves de API da Resend, credenciais SMTP ou chaves Service Role do Supabase) em texto plano no código de frontend ou backend do repositório. Todos os endpoints acessam chaves sensíveis através de variáveis de ambiente (`process.env`).

---

## 6. PROBLEMAS DE SEGURANÇA (Vulnerabilidades Arquiteturais)

### ⚠️ [CRÍTICO] Senhas em Texto Plano no Banco de Dados
A tabela `colaboradores` (tanto na Base44 quanto mapeada para o Supabase) armazena a senha de acesso ao portal (`senha_portal`), a senha da máquina local (`senha_login_maquina`) e a senha da conta Microsoft do funcionário (`senha_microsoft`) em **texto puro (plano)**, sem criptografia (como hash bcrypt/argon2).
*   **Risco:** Se a base for vazada, ou se um funcionário de TI mal-intencionado acessar a tabela `colaboradores` via console do Supabase, terá acesso imediato à senha de todos os colaboradores do portal.

### ⚠️ [CRÍTICO] Falha de RLS (Row Level Security) em Chamados e Reservas Públicas
O arquivo de regras RLS do Supabase (`SUPABASE_RLS_FIX.sql`) define que o acesso anônimo (`anon`) pode ler, inserir e atualizar dados nas tabelas `chamados`, `reservas` e `reservas_sala` sem verificação de autenticação:
```sql
CREATE POLICY "anon_select_chamados" ON chamados FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_chamados" ON chamados FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_chamados" ON chamados FOR UPDATE TO anon USING (true) WITH CHECK (true);
```
*   **Risco:** Qualquer pessoa na internet que possua a chave pública do Supabase (`VITE_SUPABASE_ANON_KEY`) pode rodar um script externo para listar e alterar TODOS os chamados da empresa, alterar os anexos, modificar o status de chamados para "Resolvido", deletar dados do chat ou criar reservas fraudulentas.
*   **Correção Necessária:** O RLS anônimo deve restringir leituras e escritas associando as linhas a um identificador do solicitante (por exemplo, exigindo que o e-mail ou o hash da reserva coincida, ou forçando que ações de modificação passem exclusivamente por endpoints seguros em `/api/`).

---

## 7. PROBLEMAS DE PERFORMANCE

### 🔴 Inicialização Lenta por Falta de Code-Splitting (Tamanho do Bundle)
O build final do Vite acusa que o arquivo gerado do bundle principal (`dist/assets/index-CqEE32PP.js`) possui **1.158,92 KB** (mais que o dobro do limite de aviso de 500 KB).
*   **Causa:** O arquivo [pages.config.js](file:///c:/techcontrol/Techcontrolv1-main/src/pages.config.js) importa estaticamente as 37 páginas no topo do arquivo. Isso força o Rollup/Vite a compilar todo o código de todos os módulos de TI (tabelas, modais, gráficos e editores) em um único arquivo Javascript monolítico.
*   **Impacto:** Ao abrir a tela de Login (`/login`) ou qualquer página simples (como `/Ramais`), o navegador do usuário é forçado a baixar e processar 1.15MB de código de outras 36 telas que ele não está visualizando, prejudicando severamente o tempo até a interatividade (TTI) e o Lighthouse score do sistema.
*   **Solução:** Refatorar o roteador para usar importação dinâmica (`React.lazy`) e componentes suspensos (`React.Suspense`):
    ```js
    import { lazy } from 'react';
    const Cameras = lazy(() => import('./pages/Cameras'));
    ```

### 🟡 Latência de Validação de Sessão no Portal do Colaborador
O hook `usePortalColaborador.jsx` verifica dados locais do `sessionStorage`, mas a cada transição de rota ele ativa o trigger do React Query para consultar o banco de dados. Caso ocorra lentidão na rede ou no banco de dados Supabase, a interface pode apresentar engasgos ou exibição de spinners devido à validação repetida.
