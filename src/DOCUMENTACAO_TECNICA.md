# DOCUMENTAÇÃO TÉCNICA – TechControl
> **Versão:** 2.5.0 | **Data de geração:** 28/04/2026 | **Ambiente:** Produção (Base44)

---

## ÍNDICE
1. [Visão Geral](#1-visão-geral)
2. [Arquitetura Técnica](#2-arquitetura-técnica)
3. [Domínios e URLs](#3-domínios-e-urls)
4. [Mapeamento de Módulos e Telas](#4-mapeamento-de-módulos-e-telas)
5. [Fluxos e Jornadas](#5-fluxos-e-jornadas)
6. [Banco de Dados](#6-banco-de-dados)
7. [APIs e Endpoints](#7-apis-e-endpoints)
8. [Permissões e Usuários](#8-permissões-e-usuários)
9. [Automações](#9-automações)
10. [Templates de E-mail](#10-templates-de-e-mail)
11. [Problemas Conhecidos](#11-problemas-conhecidos)
12. [Guia de Migração](#12-guia-de-migração)
13. [CHANGELOG](#changelog)

---

## 1. VISÃO GERAL

**Nome do Sistema:** TechControl
**Propósito:** Sistema completo de gestão de TI corporativa. Centraliza controle de patrimônio tecnológico, atendimento de suporte (helpdesk), reservas de equipamentos e sala, gestão de colaboradores, ramais e avaliações periódicas de equipamentos.
**Público-alvo:**
- **Equipe de TI / Administradores** → painel administrativo completo
- **Colaboradores da empresa** → portal dedicado com autenticação própria

---

## 2. ARQUITETURA TÉCNICA

### Stack Completa

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Frontend Framework | React | 18.2.0 |
| Linguagem | JavaScript (JSX) | ES2022+ |
| Estilização | Tailwind CSS | 3.x |
| Componentes UI | shadcn/ui (Radix UI) | Latest |
| Ícones | Lucide React | 0.475.0 |
| Roteamento | React Router DOM | 6.26.0 |
| Cache / Fetch | TanStack React Query | 5.84.1 |
| Datas | date-fns (ptBR) | 3.6.0 |
| Build Tool | Vite | Latest |
| Backend as a Service | Base44 Platform | 0.8.25+ |
| Banco de Dados | Base44 (NoSQL – documentos) | – |
| Backend Functions | Deno Deploy (via Base44) | – |
| Auth Admin | Base44 Auth (JWT) | – |
| Auth Portal | SessionStorage customizado | – |
| E-mail | Resend API (`onboarding@resend.dev`) | – |
| Upload de Arquivos | Base44 Core – UploadFile | – |

### Serviços Externos Integrados

| Serviço | Uso | Autenticação |
|---------|-----|--------------|
| **Resend API** | E-mails de chamados (helpdesk) via domínio `suporte@techcontrol.site` | `RESEND_API_KEY` (secret) |
| **Base44 Core – SendEmail** | E-mails de **comunicados internos** (aniversários, boas-vindas, despedida) | Automático via SDK — sem configuração extra |
| **Base44 Core – UploadFile** | Upload de imagens/arquivos | Automático via SDK |
| **Base44 Core – InvokeLLM** | IA para avaliações | Automático via SDK |

### Variáveis de Ambiente

| Variável | Obrigatória | Uso |
|----------|-------------|-----|
| `RESEND_API_KEY` | ✅ Sim | Envio de e-mails de **chamados** (helpdesk) via Resend |
| `BASE44_APP_ID` | ✅ Sim (auto) | ID do app (pré-populado pela plataforma) |

> **IMPORTANTE – Dois sistemas de e-mail:**
> - **Chamados (helpdesk):** usam Resend diretamente via `fetch` com `from: "TechControl <suporte@techcontrol.site>"` — domínio verificado.
> - **Comunicados internos:** usam `base44.asServiceRole.integrations.Core.SendEmail()` — integração nativa Base44, sem domínio a verificar, sem API key separada, envia para qualquer destinatário.

---

## 3. DOMÍNIOS E URLS

### Estrutura de Rotas do Sistema

| Rota | Componente | Acesso | Descrição |
|------|------------|--------|-----------|
| `/` | `Dashboard` | Admin | Dashboard principal |
| `/Dashboard` | `Dashboard` | Admin | Dashboard (alias) |
| `/PCs_Internos` | `PCs_Internos` | Admin | Gestão de PCs e monitores internos |
| `/Notebooks_Externos` | `Notebooks_Externos` | Admin | Gestão de notebooks externos |
| `/Tablets` | `Tablets` | Admin | Gestão de tablets |
| `/Smartphones` | `Smartphones` | Admin | Gestão de smartphones |
| `/Cameras` | `Cameras` | Admin | Gestão de câmeras |
| `/Coletores` | `Coletores` | Admin | Gestão de coletores de dados |
| `/Canetas_Vibracao` | `Canetas_Vibracao` | Admin | Gestão de canetas de vibração |
| `/Colaboradores` | `Colaboradores` | Admin | Gestão de colaboradores |
| `/Chamados` | `Chamados` | Admin | Central de chamados de suporte |
| `/Reservas` | `Reservas` | Admin | Gestão de reservas de equipamentos |
| `/sala-treinamento` | `sala-treinamento` | Admin | Gestão da sala de treinamento |
| `/Ramais` | `Ramais` | Admin | Gestão de ramais telefônicos |
| `/Usuarios` | `Usuarios` | Admin | Gestão de usuários do sistema |
| `/Avaliacoes_Equipamentos` | `Avaliacoes_Equipamentos` | Admin | Avaliações técnicas de equipamentos |
| `/ProjetosTerceiros` | `ProjetosTerceiros` | Admin | Dashboard analítico de projetos terceiros |
| `/Comunicados` | `Comunicados` | Admin / Comunicados | Gestão de artes de comunicados e visão de datas de eventos |
| `/Importar` | `Importar` | Admin | Importação de dados em massa |
| `/Resumo` | `Resumo` | Admin | Relatório consolidado exportável |
| `/portal-login` | `portal-login` | Público | Login do Portal do Colaborador |
| `/portal` | `portal` | Portal | Dashboard do colaborador |
| `/portal-chamados` | `portal-chamados` | Portal | Chamados do colaborador |
| `/portal-reservas` | `portal-reservas` | Portal | Reservas de equipamentos |
| `/portal-sala` | `portal-sala` | Portal | Reservas da sala de treinamento |
| `/portal-equipamentos` | `portal-equipamentos` | Portal | Equipamentos do colaborador |
| `/portal-ramais` | `portal-ramais` | Portal | Lista de ramais (somente leitura) |
| `/portal-comunicados` | `portal-comunicados` | Portal (permissão) | Módulo de comunicados para colaboradores autorizados |
| `/chamado-publico` | `chamado-publico` | Público | Página pública para chamados externos |
| `/acompanhar-chamado` | `acompanhar-chamado` | Público | Acompanhamento público de chamados |
| `/reserva-publica` | `reserva-publica` | Público | Reserva pública de equipamentos |
| `/reserva-sala-publica` | `reserva-sala-publica` | Público | Reserva pública da sala |

### Acesso por Role (páginas admin)

| Role | Páginas acessíveis | Sidebar exibido |
|------|--------------------|-----------------|
| `admin` | Todas | Completo (Equipamentos + Gestão) |
| `user` | Todas | Completo (Equipamentos + Gestão) |
| `comunicados_arte` | Apenas `/Comunicados` (aba Artes) | Simplificado: só "Comunicados" |
| `comunicados_gestao` | `/Comunicados` (visão + envios) + `/Colaboradores` (somente leitura) | Simplificado |
| `comunicados_dp` | `/Comunicados` (todas exceto config) + `/Colaboradores` (somente leitura) | Simplificado |

---

## 4. MAPEAMENTO DE MÓDULOS E TELAS

### 4.17b Comunicados (`/Comunicados`)
> **Versão do módulo:** 2.3.0

**Arquivo:** `pages/Comunicados.jsx`
**Objetivo:** Módulo de gestão de comunicados internos no modelo de **demandas individuais** — cada colaborador com evento no mês ganha uma demanda; a responsável pelas artes faz upload; na data do evento a automação verifica e envia.

#### Abas e Visibilidade por Role

| Aba | Visível para |
|-----|-------------|
| **🎨 Artes e Demandas** | `admin`, `user`, `comunicados_arte`, `comunicados_gestao`, `comunicados_dp` |
| **📅 Este Mês** | `admin`, `user`, `comunicados_gestao`, `comunicados_dp` |
| **📆 Planejamento Anual** | `admin`, `user`, `comunicados_gestao`, `comunicados_dp` |
| **⚙️ Envios** | `admin`, `user`, `comunicados_gestao`, `comunicados_dp` |
| **🔧 Configurações** | `admin` apenas |

#### Aba: 🎨 Artes e Demandas (`ListaDemandas`)

**Arquivo:** `components/comunicados/ListaDemandas.jsx`

- Navegação de mês com botões ◀ ▶
- Stats do mês: Total / Sem arte / Arte pronta / Enviado
- Botão "Gerar Demandas do Mês" → chama `gerarDemandasComunicados`
- Filtros por status e tipo
- Banner de alerta vermelho quando há demandas `sem_arte` com evento nos próximos 7 dias
- Cada item: foto + nome + tipo + badge + botão upload de arte
- Upload via `UploadArteModal` (renderizado no nível raiz da lista)

#### Aba: 📅 Este Mês (`VisaoEventos modo="mes"`)

**Arquivo:** `components/comunicados/VisaoEventos.jsx`

Cards por categoria do mês atual: Aniversariantes / Tempo de Empresa / Cônjuges / Filhos 1 ano / Desligamentos.
- Badge `ArteBadge` por evento — clicável abre `UploadArteModal`
- Botão "Enviar" em desligamentos (se `podeEnviarDespedida`)
- Badge "📤 Enviado DD/MM" exibe data formatada quando `status_arte = "enviado"`

#### Aba: 📆 Planejamento Anual (`VisaoEventos modo="anual"`)

**Arquivo:** `components/comunicados/VisaoEventos.jsx`

Visão anual mês a mês com acordeão. Funcionalidades v2.3:

**Barra de filtros globais:**
- Campo de busca por nome do colaborador
- Select por tipo de evento (aniversario_colaborador, conjuge, filho, tempo_empresa, despedida)
- Select por status de arte (sem_arte, arte_carregada, enviado)
- Botão "Limpar" filtros

**Cabeçalho de cada mês (badges lado a lado):**
- Badge indigo: "X eventos"
- Badge verde: "X prontas"
- Badge laranja: "⚠️ X sem arte"
- Badge cinza: "📤 X enviadas"

**Tabela interna (quando mês expandido):**
- Colunas: Colaborador | Evento | Detalhe | Arte | Envio
- Coluna "Detalhe": exibe data do evento formatada (DD/MM) por tipo; "📅 Data não cadastrada" em laranja se campo vazio
- Coluna "Arte": `ArteBadge` clicável
- Coluna "Envio": "Não enviado" (arte_carregada) ou "Enviado DD/MM" verde (enviado)
- Ordenação automática: sem_arte → arte_carregada → enviado; dentro do grupo por data

**Bug fix (v2.3.0):** O `UploadArteModal` é renderizado UMA VEZ no nível raiz do `VisaoEventos`. O estado `modalUpload` armazena apenas primitivos `{ demandaId, colaboradorId, colaboradorNome, tipo }`. O `handleUploadSuccess` captura `const id = demandaId` antes de qualquer `await`, garantindo closure estável independente de re-renders.

#### Aba: ⚙️ Envios (`AbaEnvios`)

**Arquivo:** `components/comunicados/AbaEnvios.jsx`

**Seção 1 — Status das Automações:**
Tabela com as 5 automações automáticas + linha manual da Despedida.
- Horário: lido de `Comunicados_Config` (não hardcoded)
- Badge "Desativado" vermelho se `config.ativo === false`
- Último Disparo: último registro em `Comunicados_Log` por `tipo_comunicado`
- Status: badge colorido do último disparo
- Botão "▶ Disparar agora" → modal de confirmação → executa função backend → exibe resultado

**Seção 2 — Histórico de Envios:**
- Busca em `Comunicados_Log` (200 últimos registros, ordenados por `-data_envio`)
- Filtros: por mês (calculado dos dados) e por status
- Botão "Atualizar"
- Modal de detalhes: colaborador, tipo, status, data, assunto, lista completa de destinatários, detalhe de erro

#### Aba: 🔧 Configurações (`AbaConfiguracoes`)

**Arquivo:** `components/comunicados/AbaConfiguracoes.jsx`
**Visível apenas para:** `admin`

Card por tipo de comunicado (5 tipos). Cada card contém:
- Switch Ativo/Inativo (opacidade 60% quando inativo)
- Horário de Envio (time input, exceto Despedida que é "Manual") — com texto auxiliar: *"(referência visual — não altera o horário de disparo automático)"*
- Assunto do E-mail com variáveis dinâmicas (`{nome}`, `{nome_conjuge}`, `{nome_filho}`, `{anos}`, `{area}`)
- Select Destinatários: todos_colaboradores / colaborador_conjuge_gestor / colaborador_e_gestor / manual
- E-mails adicionais (sempre recebem, separados por vírgula)
- E-mails em cópia CC (separados por vírgula)
- Botão "Salvar" por card (upsert)

**Auto-inicialização:** Se `Comunicados_Config` estiver vazia (primeira vez), os 5 registros padrão são criados automaticamente ao abrir a aba.

**⚠️ Banner informativo fixo no topo da aba (v2.4.0):**
> "O horário configurado aqui é apenas uma referência visual. Ele aparece na aba Envios para informar o horário esperado, mas **não altera o horário real de disparo automático**. O disparo real é controlado pelo `start_time` de cada automação no painel Base44."

Isso elimina a confusão de admin alterar o horário e achar que o disparo mudou. Para alterar o horário real, é necessário editar o `start_time` das automações no Base44 Dashboard → Automações.

**Valores padrão:**

| Tipo | Horário | Destinatários |
|------|---------|---------------|
| aniversario_colaborador | 08:00 | todos_colaboradores |
| aniversario_conjuge | 08:00 | colaborador_conjuge_gestor |
| aniversario_filho_1ano | 08:00 | colaborador_conjuge_gestor |
| tempo_empresa | 08:00 | todos_colaboradores |
| despedida | manual | manual |

---

## 5. FLUXOS E JORNADAS

### 5.1 Fluxo Completo de Comunicado (v2.3.0)

```
[Dia 1 do mês — 09:00 UTC] Automação cron "0 9 1 * *"
    → gerarDemandasComunicados (próximo mês)
    → Anti-duplicata por (colaborador_id, tipo_comunicado, data_evento)
    → Cria demandas com status_arte = "sem_arte"

[Responsável de artes] acessa /Comunicados → aba "🎨 Artes e Demandas"
    → Navega até o mês desejado
    → Clica "Carregar Arte" em cada demanda
    → UploadArteModal: seleciona imagem → confirma → status_arte = "arte_carregada"

[Data do evento — 10:00 BRT] Automação diária (start_time: "10:00")
    → ex: enviarAniversariosColaboradores
    → Busca: tipo_comunicado = "aniversario_colaborador", data_evento = hoje, status_arte = "arte_carregada"
    → Para cada demanda encontrada:
        → Valida que o aniversário é realmente hoje (campo data_nascimento)
        → Envia via Resend (from: onboarding@resend.dev) para cada destinatário
        → Verifica result.error individualmente
        → Marca status_arte = "enviado" + data_envio = agora
        → Grava Comunicados_Log: status = "enviado" ou "erro", detalhe_erro se aplicável

[Admin] acessa aba "⚙️ Envios"
    → Vê tabela de automações com horário real da Comunicados_Config
    → Vê histórico de envios com status por colaborador
    → "Disparar agora" → confirmação → executa função → resultado em banner
```

### 5.2 Fluxo de Upload de Arte (Bug Fix v2.3.0)

**Problema anterior:** `onSuccess` perdia o `demanda.id` após re-render assíncrono.

**Solução implementada:**
```
1. Clicar "⚠️ Sem arte" → abrirModal(colaborador, tipo, demanda, mesFiltro)
2. setModalUpload({ demandaId: demanda?.id, colaboradorId, colaboradorNome, tipo })
   → Apenas primitivos — sem objetos instáveis
3. UploadArteModal faz upload → chama onSuccess(fileUrl)
4. handleUploadSuccess:
   const { demandaId, colaboradorId, colaboradorNome, tipo } = modalUpload
   if (demandaId) {
     const id = demandaId  ← capturado ANTES do await
     await base44.entities.Comunicados_Artes.update(id, ...)
   } else {
     await base44.entities.Comunicados_Artes.create(...)
   }
   queryClient.invalidateQueries(["comunicados_artes"])
   → Badge muda imediatamente para "✅ Arte pronta"
```

### 5.3 Fluxo de Envio via Resend (v2.3.0)

```
Para cada email em lista de destinatários:
  const result = await resend.emails.send({ from: "TechControl <onboarding@resend.dev>", to: email, subject, html })
  if (result.error) {
    console.error("RESEND ERRO:", JSON.stringify(result.error))
    emailsErro.push(email)
  } else {
    emailsOk.push(email)
  }

Após loop:
  → Atualiza demanda: status_arte = "enviado", data_envio = agora
  → Grava Comunicados_Log:
      status = "enviado" (se qualquer e-mail passou) ou "erro" (se todos falharam)
      destinatarios = emailsOk (apenas os que chegaram)
      detalhe_erro = "Falhou para: x@y.com, ..." (se algum falhou)
```

---

## 6. BANCO DE DADOS

### Lista Completa de Coleções (19 total)

| # | Entidade | Descrição | Arquivo Schema |
|---|----------|-----------|----------------|
| 1 | `Colaboradores` | Colaboradores da empresa | `entities/Colaboradores.json` |
| 2 | `Chamados` | Chamados de suporte | `entities/Chamados.json` |
| 3 | `ChamadosChat` | Mensagens do chat dos chamados | `entities/ChamadosChat.json` |
| 4 | `ReservasSala` | Reservas da sala de treinamento | `entities/ReservasSala.json` |
| 5 | `Reservas` | Reservas de equipamentos | `entities/Reservas.json` |
| 6 | `PCs_Internos` | PCs, monitores, notebooks internos | `entities/PCs_Internos.json` |
| 7 | `Notebooks_Externos` | Notebooks externos | `entities/Notebooks_Externos.json` |
| 8 | `Tablets` | Tablets | `entities/Tablets.json` |
| 9 | `Smartphones` | Smartphones corporativos | `entities/Smartphones.json` |
| 10 | `Cameras` | Câmeras | `entities/Cameras.json` |
| 11 | `Coletores` | Coletores de dados | `entities/Coletores.json` |
| 12 | `Canetas_Vibracao` | Canetas de vibração | `entities/Canetas_Vibracao.json` |
| 13 | `Avaliacoes` | Avaliações técnicas de equipamentos | `entities/Avaliacoes.json` |
| 14 | `Ramais` | Ramais telefônicos | `entities/Ramais.json` |
| 15 | `FilaEmails` | Fila de e-mails a enviar (chamados) | `entities/FilaEmails.json` |
| 16 | `Comunicados_Artes` | Demandas individuais de comunicados | `entities/Comunicados_Artes.json` |
| 17 | `Comunicados_Log` | Histórico de todos os envios de comunicados | `entities/Comunicados_Log.json` |
| 18 | `Comunicados_Config` | Configurações por tipo de comunicado | `entities/Comunicados_Config.json` |
| 19 | `User` | Usuários admin (built-in Base44) | – |

### Campos Built-in (todos os registros)
```
id           – string (UUID, chave primária)
created_date – ISO datetime
updated_date – ISO datetime
created_by   – string (email do criador)
```

### Entidade: `Comunicados_Artes` (v2.0)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `colaborador_id` | string | — | ID do colaborador |
| `colaborador_nome` | string | — | Preenchido automaticamente |
| `tipo_comunicado` | enum | ✅ | `aniversario_colaborador`, `aniversario_conjuge`, `aniversario_filho_1ano`, `tempo_empresa`, `despedida` |
| `data_evento` | date | — | Data em que o e-mail deve ser enviado (YYYY-MM-DD) |
| `descricao_evento` | string | — | Texto descritivo gerado automaticamente |
| `imagem_url` | string | — | URL da arte após upload |
| `status_arte` | enum | — | `sem_arte` (padrão), `arte_carregada`, `enviado`, `erro_envio` |
| `criado_por` | string | — | Preenchido automaticamente |
| `observacoes` | string | — | Campo livre |
| `ano_referencia` | number | — | Ano do evento |
| `anos_empresa` | number | — | Anos de empresa (só para `tempo_empresa`) |
| `filho_nome` | string | — | Nome do filho (só para `aniversario_filho_1ano`) |
| `data_envio` | datetime | — | Timestamp do envio bem-sucedido |

### Entidade: `Comunicados_Log`

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `tipo_comunicado` | string | ✅ | Tipo do comunicado enviado |
| `colaborador_nome` | string | — | Nome do colaborador |
| `colaborador_id` | string | — | ID do colaborador |
| `destinatarios` | array[string] | — | E-mails dos destinatários que **receberam** (emailsOk) |
| `assunto_enviado` | string | — | Assunto do e-mail |
| `data_envio` | datetime | — | Timestamp do envio |
| `status` | enum | ✅ | `enviado`, `erro`, `sem_arte`, `sem_destinatario` |
| `detalhe_erro` | string | — | Detalhes do erro (emails que falharam) |
| `demanda_id` | string | — | ID da demanda em Comunicados_Artes |

### Entidade: `Comunicados_Config`

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `tipo_comunicado` | string | ✅ | Chave única (ex: `aniversario_colaborador`) |
| `label` | string | — | Rótulo amigável |
| `ativo` | boolean | ✅ | Se false, automação não envia |
| `horario_envio` | string (HH:MM) | — | Horário exibido na aba Envios (referência visual — as automações rodam no horário configurado no Base44) |
| `assunto_template` | string | — | Template com variáveis `{nome}`, `{anos}`, `{nome_conjuge}`, `{nome_filho}`, `{area}` |
| `destinatarios_tipo` | enum | — | `todos_colaboradores` / `colaborador_conjuge_gestor` / `colaborador_e_gestor` / `manual` |
| `destinatarios_adicionais` | array[string] | — | E-mails fixos adicionais |
| `cc_emails` | array[string] | — | E-mails sempre em cópia |

### Entidade: `Colaboradores` — Campos Relevantes para Comunicados

| Campo | Tipo | Uso em Comunicados |
|-------|------|--------------------|
| `data_nascimento` | date | Detecta aniversário do colaborador |
| `conjuge_nome` | string | Nome do cônjuge no assunto |
| `conjuge_email` | string | Destinatário do aniversário de cônjuge |
| `conjuge_data_nascimento` | date | Detecta aniversário do cônjuge |
| `filhos` | array[{filho_nome, filho_data_nascimento}] | Detecta filhos completando 1 ano |
| `data_admissao` | date | Detecta marcos de tempo de empresa |
| `incluir_comunicados` | boolean | Se false, não é incluído em destinatários gerais |
| `comunicado_boas_vindas_enviado` | boolean | Anti-duplicata para boas-vindas |
| `comunicado_despedida_enviado` | boolean | Controle de despedida já enviada |
| `comunicados_historico` | array | Histórico de envios (tipo, data, ano, destinatários, assunto) |
| `permissoes_comunicados` | array[enum] | Permissões no portal de comunicados |

---

## 7. APIS E ENDPOINTS

### Backend Functions — Comunicados

| Arquivo | Trigger | Descrição |
|---------|---------|-----------|
| `functions/enviarAniversariosColaboradores.js` | Automação diária (10:00 BRT) | Busca demandas `tipo=aniversario_colaborador, data_evento=hoje, status_arte=arte_carregada`. Valida `data_nascimento` do colaborador. Envia para todos os ativos com `incluir_comunicados`. |
| `functions/enviarAniversarioConjuge.js` | Automação diária (10:00 BRT) | Busca demandas `tipo=aniversario_conjuge`. Envia para colaborador + cônjuge + gestor. |
| `functions/enviarAniversarioFilho1Ano.js` | Automação diária (10:00 BRT) | Busca demandas `tipo=aniversario_filho_1ano`. Envia para colaborador + cônjuge + gestor. |
| `functions/enviarAniversarioTempoEmpresa.js` | Automação diária (10:00 BRT) | Busca demandas `tipo=tempo_empresa`. Envia para todos os ativos com `incluir_comunicados`. |
| `functions/enviarBoasVindas.js` | Diário ou chamada manual | **Modo automático** (sem `colaborador_id`): processa colaboradores com `comunicado_boas_vindas_enviado = false` **E `data_admissao` nos últimos 7 dias** — evita spam em massa para colaboradores antigos. **Modo manual** (com `colaborador_id`): sem restrição de data, envia para o colaborador específico. Busca arte específica → fallback arte genérica. |
| `functions/enviarDespedida.js` | Chamada manual (admin ou portal) | Exige `colaborador_id`. Busca arte do colaborador com `status_arte=arte_carregada`. Envia para todos os ativos. Marca `comunicado_despedida_enviado = true`. |
| `functions/gerarDemandasComunicados.js` | Cron dia 1 do mês (09:00 UTC) + manual | Gera demandas para o próximo mês. Anti-duplicata. Aceita `{ mes_atual: true }` para gerar o mês atual. |
| `functions/migrarBoasVindasAntigos.js` | **Executar UMA VEZ** (admin only) | Script de migração: marca `comunicado_boas_vindas_enviado = true` para colaboradores com `data_admissao < hoje - 30 dias` que ainda têm o campo `false`, sem enviar e-mail. Evita que apareçam como pendentes no modo automático. Desativar após uso. |

### Confirmação: Todas as funções gravam Comunicados_Log (v2.3.0+)

Todas as 6 funções de comunicado (`enviarAniversariosColaboradores`, `enviarAniversarioConjuge`, `enviarAniversarioFilho1Ano`, `enviarAniversarioTempoEmpresa`, `enviarBoasVindas`, `enviarDespedida`) gravam um registro em `Comunicados_Log` após cada tentativa de envio (sucesso ou erro). A aba Envios exibe "Último Disparo" correto para todos os tipos.

### Padrão de Envio das Funções de Comunicado (v2.5.0)

Todas as funções de comunicado usam `base44.asServiceRole.integrations.Core.SendEmail()` com tratamento via try/catch:

```javascript
try {
  for (const email of destinatarios) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: assunto,
      body: html,
    });
  }
  // Grava log status: "enviado"
} catch (erro) {
  // Grava log status: "erro", detalhe_erro: erro.message
}
```

> **Nota:** Ao contrário do Resend (que retorna `result.error`), o `SendEmail` nativo lança exceção em caso de falha — por isso o `try/catch` substitui a verificação `if (result.error)`.

### Backend Functions — Chamados

| Arquivo | Trigger | Descrição |
|---------|---------|-----------|
| `functions/sendEmailTicketCreated.js` | Entity automation (create Chamados) | E-mail de abertura. Controle via `email_abertura_enviado`. |
| `functions/sendEmailTicketStarted.js` | Chamada manual pelo admin | E-mail de início de atendimento. Controle via `email_inicio_enviado`. |
| `functions/sendEmailTicketClosed.js` | Chamada manual pelo admin | E-mail de conclusão com link de avaliação. Controle via `email_conclusao_enviado`. |
| `functions/sendEmailChatMessage.js` | Ao enviar mensagem no chat | Notifica destinatário correto de nova mensagem. Rate limiting via `ultimo_email_admin_chat`. |
| `functions/lembreteAvaliacao.js` | A cada 12h | Lembrete para chamados em "Aguardando Avaliação". Anti-spam via `ultimo_lembrete_enviado`. |
| `functions/listarUsuarios.js` | Chamada do frontend | Lista usuários do sistema (requer service role). |
| `functions/processarFilaEmails.js` | Automação agendada | Processa e-mails pendentes na `FilaEmails`. |

---

## 8. PERMISSÕES E USUÁRIOS

### Perfis do Sistema Administrativo

| Perfil | Role | Capacidades |
|--------|------|-------------|
| Administrador | `admin` | Acesso total. Pode convidar usuários. Vê aba "🔧 Configurações" de comunicados. |
| Usuário | `user` | Acesso a módulos operacionais. Sem gerenciamento de usuários. |
| Arte Comunicados | `comunicados_arte` | Apenas aba "🎨 Artes e Demandas". |
| Gestão Comunicados | `comunicados_gestao` | Abas "📅 Este Mês", "📆 Anual", "⚙️ Envios" + Colaboradores (somente leitura). |
| DP Comunicados | `comunicados_dp` | Tudo de `comunicados_gestao` + botão "Enviar" nas despedidas. |

### Abas de `/Comunicados` por Role

| Role | Artes | Este Mês | Anual | Envios | Config |
|------|-------|----------|-------|--------|--------|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `user` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `comunicados_arte` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `comunicados_gestao` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `comunicados_dp` | ✅ | ✅ | ✅ | ✅ | ❌ |

### Permissões de Comunicados do Colaborador (Portal)

Campo `permissoes_comunicados` em `Colaboradores` — array de strings. Configurável apenas por `admin`.

| Permissão | O que permite no portal |
|-----------|--------------------------|
| `ver_visao_geral` | Abas "📅 Este Mês", "📆 Planejamento Anual", "⚙️ Envios" |
| `cadastrar_artes` | Aba "🎨 Artes" (upload/edição) |
| `enviar_boas_vindas` | Reservado para uso futuro |
| `enviar_despedida` | Botão "Enviar" nas despedidas pendentes |
| `gerir_colaboradores` | Aba "👥 Colaboradores" (gestão completa sem senhas) |

### Segurança de Funções Backend (Portal)

As funções `enviarBoasVindas` e `enviarDespedida` verificam o header `x-portal-colaborador-id`. Se presente, buscam o colaborador no banco e verificam a permissão correspondente antes de executar. Retornam 403 se a permissão não estiver no array.

---

## 9. AUTOMAÇÕES

### Automações Ativas

| ID | Nome | Tipo | Trigger | Função | Status |
|----|------|------|---------|--------|--------|
| `69e91f8cc36af69a91d40190` | Aniversários de Colaboradores — Diário 07h | scheduled | Diário 10:00 BRT | `enviarAniversariosColaboradores` | ✅ Ativa (5 execuções) |
| `69e91f8fc36af69a91d40191` | Aniversários de Cônjuges — Diário 07h | scheduled | Diário 10:00 BRT | `enviarAniversarioConjuge` | ✅ Ativa (5 execuções) |
| `69e91f92c36af69a91d40192` | Aniversário de Filhos 1 Ano — Diário 07h | scheduled | Diário 10:00 BRT | `enviarAniversarioFilho1Ano` | ✅ Ativa (5 execuções) |
| `69e91f96c36af69a91d40196` | Tempo de Empresa — Diário 07h | scheduled | Diário 10:00 BRT | `enviarAniversarioTempoEmpresa` | ✅ Ativa (5 execuções) |
| `69e9f7986230ef3409dc8aa5` | Gerar Demandas de Comunicados (Mensal) | scheduled | Cron `0 9 1 * *` | `gerarDemandasComunicados` | ✅ Ativa (0 execuções ainda) |
| `69b152a41cd163fa6fa5e455` | Email ao Abrir Chamado | entity | Create em `Chamados` | `sendEmailTicketCreated` | ✅ Ativa (74 execuções) |
| `69b0122f1429e149a3e7fb44` | Lembrete de Avaliação de Chamado (12h) | scheduled | A cada 12h | `lembreteAvaliacao` | ✅ Ativa (122 execuções) |

> **Nota:** As automações de comunicado rodam diariamente às 10:00 BRT (13:00 UTC, configurado como `start_time: "10:00"` no fuso America/Sao_Paulo). O campo `horario_envio` em `Comunicados_Config` é referência visual na aba Envios — para mudar o horário real, alterar o `start_time` da automação no Base44.

---

## 10. TEMPLATES DE E-MAIL

### E-mails de Comunicados Internos

Template minimalista gerado inline em cada função:
```html
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#ffffff;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;">
    <img src="{arteUrl}" style="display:block;width:100%;max-width:640px;border:0;margin:0;padding:0;" />
    <div style="padding:12px 0;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">© {ANO} · Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>
```

- ❌ Sem header colorido, sem banner, sem botão CTA, sem texto
- ✅ Imagem da arte ocupa 100% (max 640px)
- ✅ Rodapé discreto 11px cinza

**Envio:** `base44.asServiceRole.integrations.Core.SendEmail()` — sem remetente configurável pelo desenvolvedor; o remetente é gerenciado pela plataforma Base44. Envia para qualquer destinatário sem necessidade de verificação prévia.

### E-mails de Chamados (helpdesk)

Template com header azul, banner colorido por status, número do chamado em destaque e botão CTA. Gerado pela função `buildEmailHtml` em `pages/Chamados.jsx`.

---

## 11. PROBLEMAS CONHECIDOS

| # | Problema | Módulo | Severidade | Impacto |
|---|---------|--------|------------|---------|
| 1 | **Senhas em texto plano** – `senha_portal`, `senha_microsoft`, `senha_login_maquina` sem hash | Colaboradores / Portal | 🔴 Alta | Exposição de dados sensíveis |
| 2 | **Vínculo frágil por nome** – Equipamentos vinculados por `usuario_atual = nome_completo` | Todos os equip. | 🟡 Média | Inconsistência de dados |
| 3 | **Sessão em sessionStorage** – Portal perde sessão ao fechar aba | Portal | 🟡 Média | UX |
| 4 | **Sem validação MIME no servidor** – Upload só valida por `accept` HTML | Chamados | 🟡 Média | Segurança de upload |
| 5 | **FilaEmails sem limpeza** – Registros "enviado" nunca removidos | E-mails | 🟢 Baixa | Performance futura |
| 6 | **Chamado travado em Aguardando Avaliação** – Se colaborador não avaliar | Chamados | 🟢 Baixa | Métricas incorretas |
| 7 | **Comunicados usam SendEmail nativo** – Remetente controlado pela Base44. Não é possível personalizar o `from:` nos comunicados internos. Se necessário, migrar de volta para Resend com domínio verificado. | Comunicados | 🟢 Baixa | Branding |
| 8 | **gerarDemandasComunicados com 0 execuções** – A automação cron `0 9 1 * *` nunca rodou automaticamente. Primeira execução será dia 01/05/2026 às 09:00 UTC. Monitorar. Como fallback, usar botão "Gerar Demandas do Mês" manualmente. | Comunicados | 🟡 Média | Demandas de maio não existem ainda |
| 9 | **migrarBoasVindasAntigos deve ser executada** – A função de migração `functions/migrarBoasVindasAntigos.js` deve ser executada uma única vez por um admin para limpar colaboradores antigos com `comunicado_boas_vindas_enviado = false`. Sem isso, o campo fica inconsistente na UI (aparece como pendente mas nunca será processado). | Comunicados | 🟡 Média | UI desatualizada |

---

## 12. GUIA DE MIGRAÇÃO

### 12a. Migração para GitHub

Estrutura sugerida:
```
techcontrol/
├── src/
│   ├── pages/
│   ├── components/
│   │   ├── ui/
│   │   ├── portal/
│   │   ├── colaboradores/
│   │   ├── equipamentos/
│   │   └── comunicados/      ← ListaDemandas, VisaoEventos, UploadArteModal, AbaEnvios, AbaConfiguracoes
│   ├── entities/
│   ├── functions/
│   ├── api/
│   ├── lib/
│   ├── hooks/
│   └── utils/
├── index.html
├── tailwind.config.js
├── .env.example
└── README.md
```

`.env.example`:
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
BASE44_APP_ID=your_app_id
```

---

## CHANGELOG

| Data | Versão | Módulo | Descrição |
|------|--------|--------|-----------|
| 09/04/2026 | 1.0.0 | Sistema completo | Documentação técnica inicial |
| 09/04/2026 | 1.1.0 | Chamados | Chamados para empresas terceiras, tempo útil, aba Projeto/Terceiro, filtro de período |
| 09/04/2026 | 1.2.0 | ProjetosTerceiros | Nova página de dashboard analítico de projetos terceiros |
| 15/04/2026 | 1.3.0 | Reservas + Portal | Bloqueio de reservas entre dias, calendário mensal no portal |
| 22/04/2026 | 1.6.0 | Comunicados | Módulo completo com visão geral e artes, 3 novos roles, sidebar adaptativo, funções de envio minimalistas |
| 22/04/2026 | 1.7.0 | Portal Comunicados | Nova página `/portal-comunicados` com controle por `permissoes_comunicados` |
| 22/04/2026 | 1.8.0 | Portal Comunicados | Abas renomeadas, `GestaoColaboradoresPortal`, `PortalLayout` sem prop externa, race condition corrigida |
| 23/04/2026 | 2.0.0 | Comunicados | Reestruturação para modelo de demandas individuais. Entidade `Comunicados_Artes` reformulada. `gerarDemandasComunicados`. Componentes compartilhados `ListaDemandas` e `VisaoEventos`. Funções de envio refatoradas. |
| 23/04/2026 | 2.1.0 | Colaboradores | Schema com 30+ campos (família, cônjuge, filhos). `ColaboradorForm` em 4 abas. `GestaoColaboradoresPortal` com 3 abas. `VisaoEventos` com coluna Detalhe e `UploadArteModal` clicável. |
| 24/04/2026 | 2.2.0 | Comunicados | `AbaEnvios` (tabela de automações + histórico de logs). `AbaConfiguracoes` (cards por tipo com auto-inicialização). Entidades `Comunicados_Log` e `Comunicados_Config`. `enviarAniversariosColaboradores` grava log. |
| 27/04/2026 | 2.3.0 | Comunicados | **Bug fix upload:** `modalUpload` armazena apenas primitivos; `const id = demandaId` capturado antes do `await` — closure estável. **Resend:** todas as funções tratam `result.error` individualmente por email, gravam `Comunicados_Log` com emailsOk/emailsErro, usam `onboarding@resend.dev`. **AbaEnvios:** horário lido de `Comunicados_Config` (não hardcoded); badge "Desativado" se `ativo === false`. **Planejamento Anual:** barra de filtros (busca por nome, tipo, status de arte), badges de prontidão separados (prontas/sem arte/enviadas), coluna "Envio", ordenação automática (sem arte primeiro). **Funções:** todas adotam padrão de tratamento de erro do Resend com log individual. |
| 27/04/2026 | 2.4.0 | Comunicados | **AbaConfiguracoes:** banner informativo azul fixo no topo explicando que `horario_envio` é referência visual; texto auxiliar abaixo de cada campo de horário. **enviarBoasVindas:** modo automático (sem `colaborador_id`) agora restrito a colaboradores com `data_admissao >= hoje - 7 dias` — elimina risco de spam em massa. Modo manual (com ID) sem restrição. **migrarBoasVindasAntigos.js:** novo script admin-only que marca `comunicado_boas_vindas_enviado = true` para colaboradores com admissão anterior a 30 dias sem enviar e-mail. **Documentação:** seção 7 atualizada (enviarBoasVindas e migração); confirmação de que todas as funções gravam Comunicados_Log; problemas conhecidos revisados. |
| 28/04/2026 | 2.5.0 | Comunicados | **Migração de e-mail:** todas as 6 funções de comunicado (`enviarAniversariosColaboradores`, `enviarAniversarioConjuge`, `enviarAniversarioFilho1Ano`, `enviarAniversarioTempoEmpresa`, `enviarBoasVindas`, `enviarDespedida`) migradas de Resend (`onboarding@resend.dev`) para `base44.asServiceRole.integrations.Core.SendEmail()`. Eliminado `import Resend` e uso de `RESEND_API_KEY` nas funções de comunicado. Tratamento de erro alterado de `if (result.error)` para `try/catch`. Chamados (helpdesk) permanecem no Resend com domínio `suporte@techcontrol.site`. |

---

*Documento gerado e mantido manualmente. Toda alteração no sistema deve ser refletida aqui com nova entrada no CHANGELOG.*