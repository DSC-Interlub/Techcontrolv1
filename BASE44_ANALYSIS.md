# BASE44_ANALYSIS.md — TechControl
> **Documento de Análise Arquitetural e Estratégia de Migração**  
> **Autor:** Antigravity (Arquiteto Principal de Sistemas)  
> **Data:** 20 de Julho de 2026

---

## 1. ARQUITETURA ANTIGA (BASE44)
A arquitetura antiga do TechControl era totalmente centrada na plataforma **Base44** como backend-as-a-service (BaaS), oferecendo banco de dados NoSQL, autenticação nativa, hospedagem de funções em Deno Deploy e integrações de sistema.

```mermaid
graph TD
    A[Frontend React + Vite] -->|@base44/sdk| B(Base44 Platform)
    B --> C[(Base44 NoSQL DB)]
    B --> D[Base44 Auth]
    B --> E[Deno Deploy Functions]
    B --> F[Base44 Core Integrations]
    F -->|UploadFile| G[Base44 Storage]
    F -->|SendEmail| H[Gmail / SMTP Base44]
```

### Características Principais
*   **Linguagem & SDK:** O frontend utiliza o pacote `@base44/sdk` para se comunicar diretamente com o BaaS via HTTPS, gerenciando sessão, dados e envio de arquivos.
*   **Banco de Dados:** Banco orientado a documentos (NoSQL), operado em formato JSON schema definido na pasta `base44/entities/`.
*   **Backend Serverless:** As lógicas de negócios complexas (e-mails, geração de demandas de comunicados, fechamentos e autenticação externa) eram processadas no **Deno Deploy** (hospedado pela Base44) usando TypeScript.
*   **Automações:** Crons diários/mensais e gatilhos de entidades (triggers) eram gerenciados nativamente no dashboard do painel Base44.
*   **Storage:** Uploads de mídias (fotos de colaboradores, anexos de chamados e artes de comunicados) eram enviados pelo SDK da Base44, que gerava URLs públicas de download.

---

## 2. ARQUITETURA ATUAL (ESTADO DE TRANSIÇÃO)
Atualmente, o projeto está em um **estado híbrido / transicional**. O backend de APIs foi parcialmente implementado em Node.js para rodar na Vercel e o banco de dados Supabase foi modelado, mas o frontend permanece 100% dependente do SDK e das coleções NoSQL da Base44.

```mermaid
graph TD
    subgraph Frontend (Não Migrado)
        A[React 18 App] -->|Usa base44Client.js| B(Mocked / Stub Supabase Client)
        A -->|Chamadas diretas de dados| C[@base44/sdk]
    end
    subgraph Backend & DB (Migrado / Em Preparação)
        D[Vercel Serverless Functions /api] -->|@supabase/supabase-js| E[(Supabase PostgreSQL)]
        D -->|Nodemailer| F[Gmail SMTP]
        D -->|Resend SDK| G[Resend API]
    end
```

### Detalhes do Estado Atual
1.  **Frontend (React/Vite):** O arquivo [supabase.js](file:///c:/techcontrol/Techcontrolv1-main/src/lib/supabase.js) é apenas um *stub* (mock estático) com funções vazias. Todo o fluxo real das 37 páginas e dezenas de componentes ainda depende de `base44.entities.*` e chamadas de Deno functions via `base44.functions.invoke()`.
2.  **Banco de Dados (Supabase):** Há um script de criação de 19 tabelas PostgreSQL no [MIGRATION_GUIDE.md](file:///c:/techcontrol/Techcontrolv1-main/src/MIGRATION_GUIDE.md) e regras de segurança RLS detalhadas no [SUPABASE_RLS_FIX.sql](file:///c:/techcontrol/Techcontrolv1-main/SUPABASE_RLS_FIX.sql), mas as tabelas de compra/configurações estão ausentes (veja seção de Problemas).
3.  **Backend (Vercel API Routes):** Criada a pasta `/api` na raiz com funções prontas em Node.js que acessam o Supabase via `service_role` e disparam e-mails via Nodemailer ou Resend.

---

## 3. DEPENDÊNCIAS
A eliminação da Base44 alterará o grafo de dependências do frontend e das APIs.

### Dependências Antigas a Serem Removidas
*   `@base44/sdk` (SDK cliente do BaaS)
*   `@base44/vite-plugin` (Plugin do Vite para injeção de parâmetros da Base44)

### Dependências Novas / Mantidas (Vercel & Node.js)
*   `@supabase/supabase-js` (SDK de banco, auth e storage)
*   `resend` (Envio de e-mails para chamados)
*   `nodemailer` (Envio de comunicados via Gmail)
*   `openai` (API direta da OpenAI caso as avaliações usem IA no futuro)

---

## 4. RISCOS
A migração de um BaaS NoSQL para uma arquitetura híbrida de banco de dados relacional (Supabase) + Serverless (Vercel) apresenta riscos que devem ser mitigados:

> [!WARNING]
> **Inconsistência de Modelagem (Tipos nulos e vazios):** O NoSQL aceita formatos livres. Ao migrar os dados JSON exportados da Base44 para as tabelas rígidas do Postgres, campos vazios `""` em chaves estrangeiras UUID (como `colaborador_id`) causarão falhas de violação de chave.
> 
> **Perda de Reatividade e Clientes em Tempo Real:** Chamadas como `base44.entities.X.subscribe()` precisam ser migradas para Supabase Realtime Channels. Falhas de configuração na Vercel ou no Supabase RLS interromperão o chat dos chamados e o recebimento de mensagens instantâneas.
> 
> **Falta de Segurança nos Endpoints Públicos (RLS):** As páginas de chamados e reservas públicas (`/chamado-publico`, `/reserva-publica`) usam o cliente `anon` do Supabase. A configuração inadequada do RLS nas tabelas `chamados` e `reservas` pode permitir que um usuário mal-intencionado liste e altere todos os chamados da corporação.

---

## 5. SERVIÇOS UTILIZADOS

| Serviço | Função Antiga (Base44) | Nova Função (Supabase / Vercel) |
| :--- | :--- | :--- |
| **Banco de Dados** | Base44 NoSQL Document Store | Supabase PostgreSQL (Relacional) |
| **Autenticação** | Base44 Auth (hosted JWT) | Supabase Auth + Tabela `profiles` |
| **Hospedagem API** | Base44 Deno Deploy | Vercel Serverless Functions (Node.js) |
| **Automação (Cron)** | Base44 Automations Scheduler | Vercel Cron Jobs (configurados no `vercel.json`) |
| **Triggers (Eventos)** | Base44 Entity Automations | Supabase Database Webhooks |
| **Storage de Mídias** | Base44 Core.UploadFile | Supabase Storage (Bucket público `uploads`) |
| **Email (Chamados)** | Resend API (via Base44 SDK) | Resend API (direto via SDK Vercel) |
| **Email (Comunicados)** | Base44 Core.SendEmail | Gmail SMTP (via Nodemailer na Vercel) |
| **DNS / Domínio** | Apontado para Deno Deploy | Apontado para a Vercel (Ionos DNS) |

---

## 6. AUTENTICAÇÃO

### Sistema Administrativo (Dashboard)
*   **Como era:** O layout interceptava a navegação se `base44.auth.me()` falhasse e redirecionava para a tela de login própria da Base44 (`redirectToLogin`).
*   **Como fica:** O frontend exibirá uma tela de login interna em `/login` (já estruturada estaticamente em [Login.jsx](file:///c:/techcontrol/Techcontrolv1-main/src/pages/Login.jsx)). Ela capturará o e-mail e a senha do usuário, chamando `supabase.auth.signInWithPassword()`.
*   **Gestão de Roles:** O Supabase cria o usuário na tabela interna `auth.users`. O trigger `on_auth_user_created` insere automaticamente um registro correspondente na tabela `profiles`. A role (`admin`, `user`, etc.) é validada a partir desta tabela.

### Portal do Colaborador
*   **Como era:** Um endpoint customizado `portalLogin` recebia as credenciais do funcionário e consultava o banco Base44. Se válidas, os dados do colaborador eram salvos no `sessionStorage` do navegador.
*   **Como fica:** O fluxo de sessão em `sessionStorage` permanece exatamente igual para evitar refatoração massiva no portal do colaborador. No entanto, a chamada à API da Base44 é substituída por uma requisição HTTP `POST` para `/api/portalLogin`, que utiliza a conexão segura do Supabase para conferir a senha e retornar o payload do funcionário.

---

## 7. BANCO DE DADOS
O banco NoSQL será substituído pelo PostgreSQL no Supabase. O mapeamento completo das tabelas exige a criação de **22 tabelas relacionais**.

### Lista Geral de Tabelas (Banco Relacional)
1.  `profiles` (tabela de perfil conectada ao Auth, substitui `User`)
2.  `colaboradores` (cadastro geral de funcionários)
3.  `chamados` (atendimentos abertos de TI/Suporte)
4.  `chamados_chat` (mensagens internas e do cliente no chamado)
5.  `reservas_sala` (reserva física da sala de treinamentos)
6.  `reservas` (reserva de notebooks e periféricos móveis)
7.  `pcs_internos` (inventário de Desktops, Notebooks e Monitores internos)
8.  `notebooks_externos` (inventário de notebooks sob custódia externa)
9.  `tablets` (inventário de tablets corporativos)
10. `smartphones` (smartphones de uso operacional/comercial)
11. `cameras` (câmeras de monitoramento/segurança)
12. `coletores` (coletores de código de barras de estoque/expedição)
13. `canetas_vibracao` (canetas de análise de vibração industrial)
14. `avaliacoes` (avaliações de hardware e sistemas)
15. `ramais` (gestão de ramais telefônicos corporativos)
16. `fila_emails` (buffer de e-mails para envio assíncrono de tickets)
17. `comunicados_artes` (tabela de controle de artes de comunicados)
18. `comunicados_log` (logs de envios diários e mensais)
19. `comunicados_config` (template e regras por categoria de comunicado)
20. `centros_custo` *(Ausente na migração anterior)*
21. `configuracoes` *(Ausente na migração anterior)*
22. `requisicao_compras` *(Ausente na migração anterior)*

---

## 8. STORAGE
O sistema armazena imagens de colaboradores, artes de aniversários, logos e PDFs anexados a requisições e chamados.

*   **Antigo:** `base44.integrations.Core.UploadFile({ file })` salvava o arquivo e retornava a URL diretamente.
*   **Atual/Destino:** Supabase Storage. Criar um bucket público com o nome `uploads`. As regras RLS em `storage.objects` devem permitir que usuários autenticados (`authenticated`) e anônimos (`anon`) insiram registros no bucket `uploads` para permitir anexos vindos do portal do colaborador.
*   **Mapeamento de código:**
    ```js
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
    const { error } = await supabase.storage.from('uploads').upload(`public/${fileName}`, file);
    const { data } = supabase.storage.from('uploads').getPublicUrl(`public/${fileName}`);
    const file_url = data.publicUrl;
    ```

---

## 9. E-MAILS
O sistema opera em duas vias de e-mails, agora totalmente descentralizadas da Base44:

1.  **Chamados e Helpdesk (Resend API):**
    *   Mantém o uso da API da **Resend** e o domínio corporativo `@techcontrol.site` configurado na Ionos DNS.
    *   Substitui chamadas SDK da Base44 por requisições HTTP nativas de dentro de `/api/sendEmail*.js`.
2.  **Comunicados Internos (Gmail SMTP):**
    *   No Deno, o envio era feito via `base44.asServiceRole.integrations.Core.SendEmail()`.
    *   Na Vercel, as rotas `/api/enviarComunicadosDiarios` e `/api/enviarBoasVindas` utilizam a biblioteca **Nodemailer** para disparar comunicados usando credenciais SMTP do Gmail (`GMAIL_USER` e `GMAIL_APP_PASSWORD`).

---

## 10. FUNÇÕES (BACKEND BACKBONE)
As 21 funções criadas no Deno Deploy (`base44/functions/`) foram consolidadas e reestruturadas para rodarem como **Vercel Serverless Functions** (pasta `/api`) usando o runtime Node.js.

### Tabela de Mapeamento de Funções

| Função Base44 (Deno) | Endpoint Vercel (/api) | Tipo / Trigger | Observações / Consolidação |
| :--- | :--- | :--- | :--- |
| `portalLogin` | `/api/portalLogin.js` | HTTP `POST` | Autentica colaborador do portal via `senha_portal` plano. |
| `listarUsuarios` | `/api/listarUsuarios.js` | HTTP `POST` | Lista perfis da tabela `profiles` (apenas admin). |
| `enviarBoasVindas` | `/api/enviarBoasVindas.js` | HTTP `POST` | Dispara e-mail de admissão. Bloqueia duplicidade. |
| `enviarDespedida` | `/api/enviarDespedida.js` | HTTP `POST` | Envia comunicado de desligamento (disparo manual). |
| `gerarDemandasComunicados` | `/api/gerarDemandasComunicados.js` | Cron mensal | Cria registros pendentes de artes para o mês seguinte. |
| `lembreteAvaliacao` | `/api/lembreteAvaliacao.js` | Cron (12h) | Lembrete automático para chamados resolvidos sem nota. |
| `sendEmailTicketCreated` | `/api/sendEmailTicketCreated.js` | DB Webhook | Disparado ao inserir chamado (`INSERT` na tabela `chamados`). |
| `sendEmailTicketStarted` | `/api/sendEmailTicketStarted.js` | HTTP `POST` | Notifica usuário de que o atendimento iniciou. |
| `sendEmailTicketClosed` | `/api/sendEmailTicketClosed.js` | HTTP `POST` | Notifica conclusão e envia o link de avaliação. |
| `sendEmailChatMessage` | `/api/sendEmailChatMessage.js` | HTTP `POST` | Disparado ao inserir nova mensagem no chat do suporte. |
| `enviarAniversariosColaboradores` | `/api/enviarComunicadosDiarios.js` | Cron diário | Consolidados em uma única execução diária de cron |
| `enviarAniversarioConjuge` | `/api/enviarComunicadosDiarios.js` | Cron diário | para otimizar tempo de execução na Vercel e |
| `enviarAniversarioFilho1Ano` | `/api/enviarComunicadosDiarios.js` | Cron diário | evitar chamadas redundantes a transporters. |
| `enviarAniversarioTempoEmpresa` | `/api/enviarComunicadosDiarios.js` | Cron diário | |
| `processarFilaEmails` | *Pode ser descartado* | Cron / Interno | Desnecessário se o envio do chamado for em tempo real. |
| `notificarAprovadorRequisicao`| **Não migrado** | HTTP `POST` | **[CRÍTICO]** Função ausente no diretório `/api`. |
| `requisicaoComprasAction` | **Não migrado** | HTTP `POST` | **[CRÍTICO]** Função ausente no diretório `/api`. |

---

## 11. APIS (MAPA DE TRADUÇÃO DE COMANDOS)
Ao refatorar o frontend, todas as operações que usavam o SDK da Base44 devem ser reescritas para usar a sintaxe do Supabase.

| Operação | Antigo (Base44 SDK) | Novo (Supabase JS SDK) |
| :--- | :--- | :--- |
| **Listar todos** | `base44.entities.X.list()` | `supabase.from('x').select('*')` |
| **Listar ordenado** | `base44.entities.X.list('-data_evento')` | `supabase.from('x').select('*').order('data_evento', { ascending: false })` |
| **Filtrar por igualdade** | `base44.entities.X.filter({ status: 'Ativo' })` | `supabase.from('x').select('*').eq('status', 'Ativo')` |
| **Obter único por ID** | `base44.entities.X.get(id)` | `supabase.from('x').select('*').eq('id', id).single()` |
| **Criar registro** | `base44.entities.X.create(dados)` | `supabase.from('x').insert(dados).select().single()` |
| **Atualizar registro** | `base44.entities.X.update(id, dados)` | `supabase.from('x').update(dados).eq('id', id).select().single()` |
| **Excluir registro** | `base44.entities.X.delete(id)` | `supabase.from('x').delete().eq('id', id)` |
| **Invocar Função** | `base44.functions.invoke('fn', payload)` | `fetch('/api/fn', { method: 'POST', body: JSON.stringify(payload) })` |
| **Upload de Arquivo** | `base44.integrations.Core.UploadFile({ file })` | `supabase.storage.from('uploads').upload(path, file)` |

---

## 12. PROBLEMAS ENCONTRADOS E INCONSISTÊNCIAS DETECTADAS

### ⚠️ [CRÍTICO] Tabelas de Compras Ausentes no Guia de Banco de Dados
O script SQL contido no [MIGRATION_GUIDE.md](file:///c:/techcontrol/Techcontrolv1-main/src/MIGRATION_GUIDE.md) e [SUPABASE_RLS_FIX.sql](file:///c:/techcontrol/Techcontrolv1-main/SUPABASE_RLS_FIX.sql) mapeia apenas 19 das 22 tabelas necessárias. Estão faltando as seguintes tabelas:
*   `centros_custo`
*   `configuracoes`
*   `requisicao_compras`

Se a migração for executada sem essas definições, as telas `/RequisicaoCompras`, `/CentrosCusto` e o portal de requisições quebrarão instantaneamente no primeiro acesso devido à ausência das tabelas no banco de dados.

### ⚠️ [CRÍTICO] Funções Backend de Compras Ausentes no Diretório `/api`
As funções [notificarAprovadorRequisicao](file:///c:/techcontrol/Techcontrolv1-main/base44/functions/notificarAprovadorRequisicao/entry.ts) e [requisicaoComprasAction](file:///c:/techcontrol/Techcontrolv1-main/base44/functions/requisicaoComprasAction/entry.ts) existem apenas no diretório antigo `/base44` (formato Deno Deploy). Elas **não foram recriadas** no diretório `/api/` (Vercel Serverless Functions). Isso impossibilita qualquer fluxo de compras, aprovação do diretor, geração de tokens de e-mail e envio de notificações para compras no novo sistema.

### 🔴 Senhas em Texto Plano (Gravação Insegura)
Os campos `senha_portal`, `senha_microsoft` e `senha_login_maquina` na tabela `colaboradores` são salvos como strings puras, sem qualquer hash criptográfico (como bcrypt ou argon2). Qualquer pessoa com permissão de leitura sobre a tabela `colaboradores` ou acesso ao banco de dados pode visualizar as senhas de todos os funcionários.

### 🟡 Acoplamento Frágil de Equipamentos por String (`nome_completo`)
A vinculação dos equipamentos (Computadores, Tablets, Smartphones, etc.) ao colaborador atual é feita comparando o campo de string `usuario_atual` com o `nome_completo` do funcionário. Não há uso de chaves estrangeiras (`colaborador_id`) em nível de banco de dados para esses relacionamentos. Se o nome do colaborador for alterado ou cadastrado com um espaço/acento diferente, o vínculo com seus aparelhos patrimoniais é perdido.

### 🟡 Expiração do Portal do Colaborador por SessionStorage
Os dados de sessão do portal de colaboradores são salvos em `sessionStorage`. Ao fechar a aba do navegador, o usuário perde o acesso e precisa digitar a senha novamente. Recomenda-se migrar para cookies seguros (`HttpOnly`) ou `localStorage` de prazo limitado após a transição.

---

## 13. ESTRATÉGIA DE MIGRAÇÃO RECOMENDADA

Para garantir uma migração livre de bugs e interrupções, sugerimos um plano dividido em **5 fases sequenciais**:

### Fase 1: Correção do Schema & Criação das Tabelas Faltantes
Executar o script SQL complementar no editor do Supabase para sanar a omissão das tabelas e RLS de compras:
```sql
-- 1. Tabela de Centros de Custo
CREATE TABLE centros_custo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE
);

-- 2. Tabela de Configurações
CREATE TABLE configuracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descricao TEXT
);

-- 3. Tabela de Requisições de Compras
CREATE TABLE requisicao_compras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  numero_requisicao TEXT,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  colaborador_nome TEXT,
  colaborador_email TEXT,
  colaborador_area TEXT,
  aprovador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  aprovador_nome TEXT,
  aprovador_email TEXT,
  item TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  centro_custo_codigo TEXT,
  centro_custo_nome TEXT,
  valor_unitario_minimo NUMERIC,
  valor_unitario_maximo NUMERIC,
  valor_minimo NUMERIC,
  valor_maximo NUMERIC,
  justificativa TEXT NOT NULL,
  urgencia TEXT DEFAULT 'Média' CHECK (urgencia IN ('Baixa','Média','Alta','Urgente')),
  fornecedor_sugerido TEXT,
  anexos JSONB DEFAULT '[]',
  status TEXT DEFAULT 'Aguardando Aprovador' CHECK (status IN ('Aguardando Aprovador','Aguardando Diretor','Aprovada','Reprovada pelo Aprovador','Reprovada pelo Diretor')),
  token_aprovacao TEXT,
  aprovador_comentario TEXT,
  aprovador_data TIMESTAMPTZ,
  diretor_comentario TEXT,
  diretor_data TIMESTAMPTZ,
  historico JSONB DEFAULT '[]'
);

-- Aplicar gatilho de updated_date nas tabelas novas
CREATE TRIGGER trg_centros_custo_updated BEFORE UPDATE ON centros_custo FOR EACH ROW EXECUTE FUNCTION update_updated_date();
CREATE TRIGGER trg_configuracoes_updated BEFORE UPDATE ON configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_date();
CREATE TRIGGER trg_requisicao_compras_updated BEFORE UPDATE ON requisicao_compras FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- Ativar RLS
ALTER TABLE centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisicao_compras ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "auth_all_centros_custo" ON centros_custo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_centros_custo" ON centros_custo FOR SELECT TO anon USING (true);

CREATE POLICY "auth_all_configuracoes" ON configuracoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_requisicao_compras" ON requisicao_compras FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_requisicao_compras" ON requisicao_compras FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_requisicao_compras" ON requisicao_compras FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_requisicao_compras" ON requisicao_compras FOR UPDATE TO anon USING (true) WITH CHECK (true);
```

### Fase 2: Recriação dos Endpoints de Compras na Vercel (`/api`)
1.  Traduzir a lógica de [requisicaoComprasAction](file:///c:/techcontrol/Techcontrolv1-main/base44/functions/requisicaoComprasAction/entry.ts) para Node.js, salvando como `api/requisicaoComprasAction.js`.
2.  Traduzir a lógica de [notificarAprovadorRequisicao](file:///c:/techcontrol/Techcontrolv1-main/base44/functions/notificarAprovadorRequisicao/entry.ts) para Node.js, salvando como `api/notificarAprovadorRequisicao.js`.

### Fase 3: Substituição do SDK Cliente no Frontend
1.  Remover os pacotes Base44 do `package.json`.
2.  Excluir `src/api/base44Client.js`, `src/api/entities.js` e `src/api/integrations.js`.
3.  Configurar a conexão real do Supabase em `src/lib/supabase.js`.
4.  Reescrever o Contexto de Autenticação (`src/lib/AuthContext.jsx`) para usar o gerenciador do Supabase.
5.  Refatorar as 37 páginas substituindo `base44.entities.X.*` pelas queries `supabase.from('x').*`.

### Fase 4: Configuração de Gatilhos e Crons na Nuvem
1.  Configurar o arquivo `vercel.json` para agendar os Cron Jobs (execuções do `enviarComunicadosDiarios`, `lembreteAvaliacao` e `gerarDemandasComunicados`).
2.  Adicionar um **Database Webhook** no console do Supabase na tabela `chamados` monitorando eventos de `INSERT` para notificar a URL `/api/sendEmailTicketCreated`.

### Fase 5: Atualização de DNS e Testes
1.  Exportar dados finais em JSON da Base44 e importá-los para o PostgreSQL do Supabase.
2.  Alterar os registros DNS (A e CNAME) no painel da Ionos apontando o domínio `techcontrol.site` para o IP de borda da Vercel.
3.  Garantir a preservação dos registros TXT de verificação da API do Resend para envio de chamados.
