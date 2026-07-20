# COMPLETE_PROJECT_ANALYSIS.md — TechControl
> **Relatório Completo de Arquitetura, Mapeamento de Rotas, Componentes, APIs e Permissões**  
> **Autor:** Antigravity (Arquiteto Principal de Sistemas)  
> **Data:** 20 de Julho de 2026

---

## 1. INTRODUÇÃO E ESCOPO DO RELATÓRIO
Este documento apresenta uma varredura completa do ecossistema do **TechControl**, cobrindo o frontend desenvolvido em React, as rotas serverless na Vercel, o banco de dados (esquemas legados e novos), dependências de pacotes, chamadas de rede, fluxo de autenticação e permissões em nível administrativo e de portal do colaborador.

---

## 2. MAPEAMENTO DE ROTAS

O sistema possui um sistema de roteamento dinâmico em que as páginas são auto-registradas no arquivo [pages.config.js](file:///c:/techcontrol/Techcontrolv1-main/src/pages.config.js) com base nos arquivos criados na pasta `pages/`. O `LayoutWrapper` intercepta as rotas para injetar o layout administrativo correspondente.

### 2.1 Rotas Administrativas (Acesso Restrito a Administradores e Usuários de TI)
*   `/` / `/Dashboard` ➡️ `Dashboard`: Painel central do sistema com KPIs globais de chamados, pendências de avaliações, status de equipamentos e atalhos rápidos.
*   `/PCs_Internos` ➡️ `PCs_Internos`: Inventário detalhado de desktops, notebooks corporativos internos e monitores físicos de mesa.
*   `/Notebooks_Externos` ➡️ `Notebooks_Externos`: Gerenciamento de notebooks sob posse temporária ou definitiva de funcionários externos.
*   `/Tablets` ➡️ `Tablets`: Gestão de tablets corporativos distribuídos para uso em campo.
*   `/Smartphones` ➡️ `Smartphones`: Inventário de aparelhos celulares corporativos, incluindo controle de operadoras, linhas e IMEI.
*   `/Cameras` ➡️ `Cameras`: Controle de patrimônio de câmeras de monitoramento da empresa.
*   `/Coletores` ➡️ `Coletores`: Cadastro de coletores industriais de dados (usados em estoque/expedição).
*   `/Canetas_Vibracao` ➡️ `Canetas_Vibracao`: Inventário de canetas de vibração mecânica para manutenção preditiva.
*   `/Colaboradores` ➡️ `Colaboradores`: Tela de cadastro e edição de funcionários. Contém campos pessoais, profissionais e permissões do portal.
*   `/Chamados` ➡️ `Chamados`: Central geral de suporte de TI (Helpdesk) com fila de chamados, filtros e histórico.
*   `/Reservas` ➡️ `Reservas`: Módulo de reservas de equipamentos corporativos (especialmente notebooks).
*   `/sala-treinamento` ➡️ `sala-treinamento`: Gerenciador de reservas físicas da sala de treinamento com visualização de calendário.
*   `/Ramais` ➡️ `Ramais`: Gestão de lista telefônica interna (ramais de departamentos e funcionários).
*   `/Usuarios` ➡️ `Usuarios`: Controle de perfis administrativos do dashboard, atribuição de cargos/roles e convites.
*   `/Avaliacoes_Equipamentos` ➡️ `Avaliacoes_Equipamentos`: Central de avaliações técnicas e checklist de integridade física/sistema dos computadores.
*   `/ProjetosTerceiros` ➡️ `ProjetosTerceiros`: Dashboard analítico de chamados atendidos por empresas de terceirização de TI.
*   `/RequisicaoCompras` ➡️ `RequisicaoCompras`: Central de requisições de compras de itens/periféricos de TI.
*   `/CentrosCusto` ➡️ `CentrosCusto`: Gestão dos códigos e nomes dos centros de custo para alocação orçamentária.
*   `/Comunicados` ➡️ `Comunicados`: Central de envio de comunicados internos corporativos (aniversários, tempo de empresa, etc.).
*   `/Importar` ➡️ `Importar`: Ferramenta para importação em massa de patrimônios ou colaboradores via arquivos estruturados (JSON/CSV).
*   `/Resumo` ➡️ `Resumo`: Relatório consolidado exportável de todos os módulos de inventário.

### 2.2 Rotas do Portal do Colaborador (Acesso via sessionStorage de Funcionário)
*   `/portal-login` ➡️ `portal-login`: Tela de autenticação exclusiva para funcionários do portal.
*   `/portal` ➡️ `portal`: Dashboard individual do colaborador exibindo chamados abertos, reservas ativas e atalhos rápidos.
*   `/portal-chamados` ➡️ `portal-chamados`: Central onde o funcionário pode abrir tickets e interagir com o suporte por chat.
*   `/portal-reservas` ➡️ `portal-reservas`: Tela de solicitação de notebooks/equipamentos móveis.
*   `/portal-sala` ➡️ `portal-sala`: Agendamento de horários para a sala de treinamentos corporativa.
*   `/portal-equipamentos` ➡️ `portal-equipamentos`: Exibição de todos os patrimônios de TI associados ao funcionário. Permite iniciar auto-avaliações.
*   `/portal-ramais` ➡️ `portal-ramais`: Consulta de ramais da empresa (somente leitura).
*   `/portal-requisicoes` ➡️ `portal-requisicoes`: Cadastro e acompanhamento de requisições de compra, com aba dedicada "Para Aprovar" (exclusiva para gestores).
*   `/portal-comunicados` ➡️ `portal-comunicados`: Acesso ao calendário de eventos e upload de artes de aniversários para colaboradores autorizados.

### 2.3 Rotas Públicas (Sem necessidade de login)
*   `/login` ➡️ `Login`: Página de autenticação administrativa do dashboard.
*   `/chamado-publico` ➡️ `chamado-publico`: Rota aberta para abertura de tickets por usuários sem login (ex: terceirizados, clientes externos).
*   `/acompanhar-chamado` ➡️ `acompanhar-chamado`: Rota pública para acompanhar a evolução de chamados sem logar.
*   `/reserva-publica` ➡️ `reserva-publica`: Solicitação simplificada de reserva de equipamentos móveis.
*   `/reserva-sala-publica` ➡️ `reserva-sala-publica`: Reserva externa da sala de treinamentos.
*   `/aprovacao-diretor` ➡️ `aprovacao-diretor`: Rota para tomada de decisão do diretor (Aprovar/Reprovar requisição) por meio de links com tokens únicos enviados por e-mail.

---

## 3. LAYOUTS DO SISTEMA

O sistema divide-se em dois eixos de design visual e navegação:

### 3.1 Layout Administrativo (`src/Layout.jsx`)
Encapsula todas as rotas privadas de administração.
*   **Sidebar Esquerdo:** Divide-se em blocos de "Equipamentos" e "Gestão".
*   **Controle de Acesso Visual:** Renderiza uma sidebar enxuta e simplificada se o usuário conectado possuir roles específicas de comunicados (`comunicados_arte`, `comunicados_gestao`, `comunicados_dp`).
*   **Tema:** Gerencia a alternância entre modo claro e escuro escrevendo classes CSS diretamente em `document.documentElement` e gravando a preferência do usuário localmente.
*   **Perfil & Logout:** Exibe o avatar do administrador conectado, e-mail e botão de desconectar integrado ao SDK de autenticação.

### 3.2 Layout do Portal (`src/components/portal/PortalLayout.jsx`)
Estrutura visual adaptada para o funcionário final, com navegação amigável focada em tarefas de autoatendimento.
*   **Navegação Mobile-Friendly:** Sidebar responsivo com itens adaptáveis dependendo se o funcionário possui permissões de comunicados ou gerenciamento de equipe.
*   **Navbar Superior:** Atalho rápido para ramais, perfil pessoal e troca de tema de cores.

---

## 4. MAPEAMENTO DE COMPONENTES

A lógica de componentes do TechControl está organizada por contextos de negócios dentro de `src/components/`:

### 4.1 Colaboradores (`/colaboradores`)
*   `ColaboradorForm.jsx`: Formulário dividido em 4 abas para cadastro e atualização completa de colaboradores (Dados Pessoais, Dados Profissionais, Informações Familiares e Acessos/Permissões).
*   `ColaboradorDetalhes.jsx`: Modal ou painel lateral que exibe os dados do colaborador, histórico de comunicados enviados e histórico de equipamentos custodiados pelo mesmo.

### 4.2 Comunicados (`/comunicados`)
*   `ListaDemandas.jsx`: Exibe a listagem de demandas geradas de artes mensais, com filtros, stats e controle de upload.
*   `UploadArteModal.jsx`: Modal que lida com o upload do arquivo de imagem da arte e atualização do status correspondente na coleção `Comunicados_Artes`.
*   `VisaoEventos.jsx`: Controla a exibição mensal e anual de aniversariantes, marcos de empresa e controle de disparo manual/despedida.
*   `AbaEnvios.jsx`: Exibe o estado de ativação dos agendamentos de disparo automático de e-mails de comunicados e a listagem histórica de disparos (`Comunicados_Log`).
*   `AbaConfiguracoes.jsx`: Central (acessível por admins) para parametrização do texto do assunto, cópias, templates de e-mail e regras de destinatários por tipo de comunicado.

### 4.3 Equipamentos (`/equipamentos`)
*   `EquipamentoForm.jsx`: Formulário inteligente para cadastro e manutenção de PCs, Notebooks e outros patrimônios de TI, permitindo associar ao colaborador atual.
*   `EquipamentoDetalhes.jsx`: Painel com as especificações técnicas detalhadas, marca, modelo, etiqueta interna, service tag e histórico.
*   `UsuariosAnteriores.jsx`: Histórico descritivo de ex-portadores do hardware.
*   `AvaliacaoEquipamento.jsx`: Interface de preenchimento de checklist de estado do equipamento (RAM, HD, Windows, antivírus, satisfação do usuário).

### 4.4 Requisições de Compra (`/requisicoes`)
*   `IndicadoresRequisicao.jsx`: Cards informativos exibindo total gasto, requisições aprovadas, recusadas e pendentes.
*   `NovaRequisicaoForm.jsx`: Formulário de requisição com cálculo automático de custos estimados (mínimos/máximos) e envio de gatilhos de aprovação.
*   `EditarRequisicaoForm.jsx`: Formulário para retificação e reenvio de requisições devolvidas ou reprovadas.
*   `PainelAprovador.jsx`: Tabela para gestores aprovarem ou reprovarem requisições de seus liderados diretos.
*   `ModuloAprovador.jsx`: Agrupador funcional do fluxo de aprovação corporativa.
*   `ConfiguracoesDiretor.jsx`: Formulário para definir o e-mail do Diretor Geral da empresa nas configurações do sistema.
*   `RequisicaoDetalhes.jsx`: Visualizador completo do histórico e dados da compra, com botões de tomada de decisão.

### 4.5 Componentes Globais / Estruturais
*   `ProtectedRoute.jsx`: Componente de rota privada baseado no React Router que intercepta o carregamento de páginas internas, validando o status de autenticação administrativa do usuário.
*   `UserNotRegisteredError.jsx`: Tela amigável de restrição exibida quando o usuário efetua login, mas não está registrado na base de dados de TI (`profiles`).

---

## 5. CONTEXTS & HOOKS

O TechControl utiliza o **React Query** (TanStack) para gerenciamento global de cache de dados e hooks customizados para a sessão de usuário.

### 5.1 Contexts
*   `AuthContext` (`src/lib/AuthContext.jsx`): Gerencia a sessão administrativa.
    *   **Estados:** `user` (objeto do usuário), `isLoadingAuth` (status de carregamento), `authChecked` (se a checagem inicial foi feita), `authError` (erros de registro).
    *   **Métodos:** `logout()`, `navigateToLogin()`, `checkUserAuth()`.
    *   **Consumo:** Provedor raiz do aplicativo, garantindo que o estado da sessão de TI esteja disponível globalmente.

### 5.2 Hooks Customizados
*   `useAuth` (`src/lib/AuthContext.jsx`): Facilita o consumo do contexto de autenticação do dashboard.
*   `useCurrentUser` (`src/hooks/useCurrentUser.js`): Wrapper simplificado sobre `useAuth` para ler o usuário conectado no dashboard administrativo.
*   `usePortalColaborador` (`src/components/portal/usePortalColaborador.jsx`):
    *   Carrega sincronamente a sessão salva do portal no `sessionStorage`.
    *   Em background, faz uma busca no banco pelo registro do colaborador para obter as permissões mais recentes.
    *   Grava automaticamente os dados atualizados de volta no `sessionStorage` e invalida queries expiradas via React Query (com staleTime de 5 min).
*   `usePortalAuth` (`src/components/portal/usePortalAuth.jsx`):
    *   Controla a barreira de autenticação do portal.
    *   Disponibiliza os métodos `logout()` (remoção de sessionStorage + redirecionamento) e `requireAuth()` (bloqueia o carregamento de páginas internas do funcionário sem sessão).
*   `use-mobile` (`src/hooks/use-mobile.jsx`): Escuta redimensionamentos do navegador para alternar visualizações de tabelas e menus da barra lateral quando acessado por smartphones.

---

## 6. BIBLIOTECAS & DEPENDÊNCIAS

Mapeamento extraído diretamente do arquivo `package.json`:

*   **Core:** React v18.2.0, Vite v6.1.0, TypeScript v5.8.2.
*   **Gerenciamento de Estado/Cache:** `@tanstack/react-query` v5.84.1 (usado extensivamente no frontend para manter dados cacheados e gerenciar invalidações de cache após inserções/edições).
*   **Roteamento:** `react-router-dom` v6.26.0.
*   **Estilização e Componentes Visuais:** `tailwindcss` v3.4.17, `tailwind-merge`, `tailwindcss-animate`, `class-variance-authority`, `framer-motion` (animações), `lucide-react` (ícones), `embla-carousel-react` (galerias/sliders), `vaul` (gavetas de formulários em mobile).
*   **Formulários & Validação:** `react-hook-form` v7.54.2, `@hookform/resolvers`, `zod` v3.24.2.
*   **Componentes de UI Baseados em Radix (shadcn):** Accordion, Alert-Dialog, Aspect-Ratio, Avatar, Checkbox, Collapsible, Context-Menu, Dialog, Dropdown-Menu, Hover-Card, Input-Otp, Label, Menubar, Navigation-Menu, Popover, Progress, Radio-Group, Scroll-Area, Select, Separator, Slider, Switch, Tabs, Toast, Toggle, Tooltip.
*   **Utilitários de Manipulação de Dados e Datas:** `date-fns` v3.6.0 (formatação de datas pt-BR), `moment` v2.30.1, `lodash` v4.17.21.
*   **Exportação de Relatórios:** `jspdf` v2.5.2 (exportador de PDF de relatórios), `html2canvas` v1.4.1 (captura seções visuais das avaliações e relatórios para injetar nos PDFs).
*   **Gráficos:** `recharts` v2.15.4 (usado nos Dashboards de TI e de Terceirizados para plotar gráficos de linhas, barras e pizza).
*   **Outros Recursos:** `canvas-confetti` (para efeitos festivos nas datas de comunicados), `react-leaflet` (mapas de ativos geolocalizados), `react-markdown` (renderizador de textos explicativos), `react-quill` (editor rich-text para descrição de chamados).

---

## 7. CHAMADAS HTTP E INTEGRAÇÃO DE APIs
No frontend, a comunicação é intermediada pelo SDK da Base44, que envelopa chamadas REST seguras sob wrappers internos. O mapeamento abaixo detalha a origem e destino das requisições.

### 7.1 Chamadas Frontend para API Interna (/api)
O frontend consome as Vercel Serverless Functions utilizando `base44.functions.invoke(nomeDaFuncao, body)`:
1.  `base44.functions.invoke('portalLogin', { action, email, senha, ... })`: Acionada em `/portal-login` para validação de senha e alteração de senha obrigatória do funcionário.
2.  `base44.functions.invoke('listarUsuarios', {})`: Acionada em `/Usuarios` para recuperar a lista de logins de TI.
3.  `base44.functions.invoke('gerarDemandasComunicados', { mes_atual: true/false })`: Acionada na aba de Artes de comunicados para forçar a geração de demandas pendentes de imagem.
4.  `base44.functions.invoke('enviarDespedida', { colaborador_id })`: Acionada na listagem de aniversariantes para disparar o envio em massa da arte de encerramento de contrato de um funcionário.
5.  `base44.functions.invoke('sendEmailTicketCreated', { chamado_id })`: Envia notificação por e-mail de abertura de ticket.
6.  `base44.functions.invoke('sendEmailChatMessage', { chamado_id, message, sender })`: Notifica o usuário por e-mail sobre mensagens digitadas no chat do ticket.
7.  `base44.functions.invoke('notificarAprovadorRequisicao', { ... })`: Envia e-mails de alerta e confirmação ao aprovador e ao solicitante de uma requisição de compras.
8.  `base44.functions.invoke('requisicaoComprasAction', { action, ... })`: Dispara fluxos de aprovação de requisições pelo aprovador ou diretor.

---

## 8. SUPABASE

### 8.1 Cliente no Frontend
O frontend possui um arquivo [supabase.js](file:///c:/techcontrol/Techcontrolv1-main/src/lib/supabase.js) contendo um mock estático. Para migrar, este mock deve ser substituído por:
```js
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### 8.2 Cliente no Backend (/api)
As API Routes executam consultas como administradores do banco usando a chave `service_role` (ignora políticas RLS):
```js
import { createClient } from '@supabase/supabase-js';
export function createSupabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
```

### 8.3 Segurança em Nível de Linha (RLS)
O Supabase restringe o acesso aos dados com base em duas regras de conexão (detalhadas no [SUPABASE_RLS_FIX.sql](file:///c:/techcontrol/Techcontrolv1-main/SUPABASE_RLS_FIX.sql)):
*   **Role `authenticated` (Usuários de TI com login administrativo):** Acesso completo (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) em todas as tabelas.
*   **Role `anon` (Acesso do Portal do Colaborador):**
    *   `colaboradores`, `notebooks_externos`, `ramais`, `comunicados_artes`, `pcs_internos`, `tablets`, `smartphones`: Permissão exclusiva de leitura (`SELECT`).
    *   `chamados`, `chamados_chat`, `reservas`, `reservas_sala`, `avaliacoes`: Permissões de escrita (`INSERT`), leitura (`SELECT`) e atualização (`UPDATE`) necessárias para operação de chamados, agendamentos e checklists pelo portal público.

---

## 9. BASE44

### 9.1 SDK Cliente
A base do frontend importa a dependência da Base44, que inicia o cliente utilizando um ID fixo do aplicativo:
```js
// src/api/base44Client.js
import { createClient } from '@base44/sdk';
export const base44 = createClient({ appId: "691323397a0bc5c15e63e15d" });
```

### 9.2 Coleções NoSQL Usadas no Frontend
Todas as requisições de banco de dados são operadas via SDK através da propriedade `base44.entities`:
*   `base44.entities.Colaboradores`
*   `base44.entities.Chamados`
*   `base44.entities.ChamadosChat`
*   `base44.entities.ReservasSala`
*   `base44.entities.Reservas`
*   `base44.entities.PCs_Internos`
*   `base44.entities.Notebooks_Externos`
*   `base44.entities.Tablets`
*   `base44.entities.Smartphones`
*   `base44.entities.Cameras`
*   `base44.entities.Coletores`
*   `base44.entities.Canetas_Vibracao`
*   `base44.entities.Avaliacoes`
*   `base44.entities.Ramais`
*   `base44.entities.FilaEmails`
*   `base44.entities.Comunicados_Artes`
*   `base44.entities.Comunicados_Log`
*   `base44.entities.Comunicados_Config`
*   `base44.entities.CentrosCusto`
*   `base44.entities.Configuracoes`
*   `base44.entities.RequisicaoCompras`
*   `base44.entities.User` (para listar e editar perfis admins)

---

## 10. RESEND API
A biblioteca da **Resend** é utilizada para disparar e-mails dinâmicos de atendimento ao cliente (Helpdesk) com templates formatados em HTML moderno (marcação com cores, botões com links diretos de redirecionamento e KPIs do chamado).
*   **Autenticação:** A chave secreta é lida da variável de ambiente `RESEND_API_KEY` na Vercel.
*   **Domínio:** Os e-mails são enviados a partir do domínio corporativo verificado `"TechControl <suporte@techcontrol.site>"`.

---

## 11. COOKIES E LOCAL STORAGE

O projeto não utiliza **cookies** para armazenamento ou transmissão de dados do cliente. Toda a persistência é dividida em dois adaptadores nativos do navegador:

1.  **Local Storage (Permanente por Navegador):**
    *   Chave: `techcontrol_theme`
    *   Valores: `'dark'` / `'light'`
    *   Uso: Salva a preferência de tema escuro do usuário. É lida ao inicializar os layouts para injetar a classe `.dark` no HTML raiz do documento.
2.  **Session Storage (Expira ao Fechar a Aba):**
    *   Chave: `portal_colaborador`
    *   Valor: Payload JSON do funcionário logado:
        ```json
        {
          "id": "UUID-colaborador",
          "nome_completo": "Nome Completo",
          "email": "colaborador@empresa.com",
          "area": "Departamento",
          "tipo_funcionario": "Interno/Externo",
          "permissoes_comunicados": ["ver_visao_geral", "cadastrar_artes"]
        }
        ```
    *   Uso: Mantém o estado de login do funcionário no portal, fornecendo acesso síncrono instantâneo a todas as páginas sem latência de API.

---

## 12. AUTENTICAÇÃO DO USUÁRIO

### 12.1 Fluxo Administrativo (Dashboard de TI)
O acesso dos administradores do sistema à área privada segue os seguintes passos:
1.  O usuário entra no sistema administrativo.
2.  O `AuthProvider` chama `base44.auth.me()` para verificar se o token JWT atual nos cabeçalhos ou localStorage é válido.
3.  Se válido, a sessão é preenchida e a página solicitada é renderizada.
4.  Se inválido, o sistema aciona `base44.auth.redirectToLogin('/Dashboard')`, que redireciona o usuário para a tela de autenticação unificada hospedada pela própria Base44.
5.  Após login bem-sucedido na Base44, o usuário retorna ao TechControl já autenticado.
*   *(Nota: No Supabase, este redirecionamento de tela externa é substituído pela digitação direta na tela de login interna em `/login`)*.

### 12.2 Fluxo do Portal do Colaborador
Como os colaboradores comuns não possuem contas cadastradas na Vercel/Supabase Auth (para reduzir custos de usuários de infraestrutura), o portal utiliza autenticação por banco:
1.  O funcionário preenche e-mail e senha no formulário do portal em `/portal-login`.
2.  O formulário chama a API Route `/api/portalLogin` passando as credenciais.
3.  A API Route busca o registro do e-mail correspondente na tabela `colaboradores` (Postgres).
4.  Se o campo `senha_portal` for igual à senha informada, a API valida o acesso.
5.  Se o campo `senha_precisa_trocar` for verdadeiro (primeiro acesso), a API retorna um código especial que exige a definição de uma nova senha pessoal antes de liberar o login.
6.  Após a validação, a API retorna as informações do funcionário e o frontend insere o JSON resultante no `sessionStorage`.

---

## 13. MIDDLEWARE E BARREIRAS DE ACESSO

O projeto não adota um arquivo de middleware de borda (`middleware.js` global da Vercel/Vite). As barreiras de acesso e controle são distribuídas no frontend e no backend:

### 13.1 Barreiras no Frontend (React Router)
*   **ProtectedRoute (`src/components/ProtectedRoute.jsx`):** Intercepta e envelopa as rotas de inventário e gestão administrativa. Ele verifica o estado `isAuthenticated` vindo de `AuthContext`. Caso não haja sessão administrativa ativa, a rota é bloqueada e o usuário é redirecionado de volta para `/login`.
*   **Portal Route Guard (Portal `requireAuth`):** As rotas do portal de colaboradores executam o método síncrono `requireAuth()` exposto pelo hook `usePortalAuth()`. Se o payload `portal_colaborador` não existir no `sessionStorage`, a página é limpa e o navegador é redirecionado para `/portal-login`.

### 13.2 Barreiras de API (Backend Serverless)
As rotas serverless sob a pasta `api/` implementam validação manual de cabeçalhos de requisição:
1.  **API de Login e Ações de Compras Públicas:** Não exigem autenticação ativa nos headers para permitir a digitação de senhas e a aprovação de compras de diretores vindas de links em e-mails (as quais são validadas através de um hash UUID de segurança `token_aprovacao` contido no link).
2.  **API Administrativas (ex: `inviteUser.js`, `listarUsuarios.js`):**
    *   Exigem que o cabeçalho da requisição possua um Bearer Token (`req.headers.authorization`).
    *   A API executa `supabase.auth.getUser(token)` no Supabase Auth para validar o JWT.
    *   Uma busca subsequente na tabela `profiles` é feita para atestar que a role do portador é `'admin'`. Se for diferente, retorna status `403 Forbidden`.

---

## 14. PERMISSÕES

O sistema aplica controle de níveis de acesso em dois cenários:

### 14.1 Roles Administrativas (Dashboard de TI)
Atribuídas na tabela `profiles` e verificadas na barra lateral do painel admin.

*   `admin`: Controle total do sistema, cadastros de patrimônios de TI, gestão de colaboradores e acesso completo às configurações de comunicados e usuários.
*   `user`: Operador de TI. Possui permissão de cadastro, leitura e edição de equipamentos e chamados, mas não consegue acessar o gerenciamento de contas de TI ou o painel de configurações de comunicados.
*   `comunicados_arte`: Perfil restrito para designers. O menu lateral exibe apenas a rota `/Comunicados` (Aba de Artes e Demandas) para fins de upload de imagens.
*   `comunicados_gestao`: Perfil de supervisão. Acesso ao calendário de datas de comunicados do mês e ano e à aba de histórico de disparos automáticos. Pode ler a lista de colaboradores (sem alterar).
*   `comunicados_dp`: Possui todas as capacidades do gestor de comunicados, acrescido do botão para disparar a notificação de despedida corporativa de um funcionário desligado.

### 14.2 Permissões do Colaborador (Portal do Colaborador)
Definidas no array `permissoes_comunicados` de cada colaborador na tabela `colaboradores`.

*   `ver_visao_geral`: Habilita as abas de calendário (Este Mês / Anual) e aba de disparos.
*   `cadastrar_artes`: Permite que o funcionário faça upload de artes e imagens no portal.
*   `enviar_despedida`: Permite que o funcionário acione a automação de e-mail de desligamento de outros colaboradores.
*   `gerir_colaboradores`: Permite visualizar a listagem completa de colaboradores no portal (somente leitura de perfis).
