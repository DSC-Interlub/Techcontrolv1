# DOCUMENTAÇÃO TÉCNICA – TechControl
> **Versão:** 1.2.0 | **Data de geração:** 15/04/2026 | **Ambiente:** Produção (Base44)

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

**Resumo executivo em 3 frases:**
O TechControl é um sistema de gestão de TI corporativa que centraliza o controle de equipamentos, colaboradores e chamados de suporte em um único ambiente integrado. Possui um painel administrativo completo para a equipe de TI e um portal dedicado para colaboradores acessarem serviços como abertura de chamados, reservas e consulta de equipamentos. O sistema é construído em React com backend gerenciado pela plataforma Base44, utilizando Resend para e-mails transacionais automáticos.

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
| Backend as a Service | Base44 Platform | 0.8.24 |
| Banco de Dados | Base44 (NoSQL – documentos) | – |
| Backend Functions | Deno Deploy (via Base44) | – |
| Auth Admin | Base44 Auth (JWT) | – |
| Auth Portal | SessionStorage customizado | – |
| E-mail | Resend API | – |
| Upload de Arquivos | Base44 Core – UploadFile | – |
| Drag and Drop | @hello-pangea/dnd | 17.0.0 |
| Geração PDF | jsPDF | 2.5.2 |
| Gráficos | Recharts | 2.15.4 |

### Modelo de Dados
O banco é **NoSQL orientado a documentos** (sem schema rígido, sem FK formais). Relacionamentos são mantidos por convenção de campos (ID ou nome como string).

### Serviços Externos Integrados
| Serviço | Uso | Autenticação |
|---------|-----|--------------|
| **Resend API** | Envio de e-mails transacionais | `RESEND_API_KEY` (secret) |
| **Base44 Core – UploadFile** | Upload de imagens/arquivos | Automático via SDK |
| **Base44 Core – InvokeLLM** | IA para avaliações | Automático via SDK |
| **Base44 Core – SendEmail** | E-mail via integração nativa | Automático via SDK |

### Variáveis de Ambiente
| Variável | Obrigatória | Uso |
|----------|-------------|-----|
| `RESEND_API_KEY` | ✅ Sim | Envio de e-mails via Resend |
| `BASE44_APP_ID` | ✅ Sim (auto) | ID do app (pré-populado pela plataforma) |

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
| `/Importar` | `Importar` | Admin | Importação de dados em massa |
| `/Resumo` | `Resumo` | Admin | Relatório consolidado exportável |
| `/portal-login` | `portal-login` | Público | Login do Portal do Colaborador |
| `/portal` | `portal` | Portal | Dashboard do colaborador |
| `/portal-chamados` | `portal-chamados` | Portal | Chamados do colaborador |
| `/portal-reservas` | `portal-reservas` | Portal | Reservas de equipamentos |
| `/portal-sala` | `portal-sala` | Portal | Reservas da sala de treinamento |
| `/portal-equipamentos` | `portal-equipamentos` | Portal | Equipamentos do colaborador |
| `/portal-ramais` | `portal-ramais` | Portal | Lista de ramais (somente leitura) |
| `/chamado-publico` | `chamado-publico` | Público | Página pública para chamados externos |
| `/acompanhar-chamado` | `acompanhar-chamado` | Público | Acompanhamento público de chamados |
| `/reserva-publica` | `reserva-publica` | Público | Reserva pública de equipamentos |
| `/reserva-sala-publica` | `reserva-sala-publica` | Público | Reserva pública da sala |

### Identificação de Páginas Públicas (sem autenticação)
O layout detecta rotas públicas por pathname e remove o sidebar admin, exibindo apenas o conteúdo:
```
/chamado-publico | /reserva-publica | /reserva-sala-publica |
/acompanhar-chamado | /portal-login | /portal-chamados |
/portal-reservas | /portal-sala | /portal-equipamentos |
/portal-ramais | /portal
```

---

## 4. MAPEAMENTO DE MÓDULOS E TELAS

---

### 4.1 Dashboard (`/Dashboard`)
**Arquivo:** `pages/Dashboard.jsx`
**Objetivo:** Visão geral consolidada com métricas em tempo real de todos os módulos.
**Autenticação:** Admin obrigatório (redireciona ao login se não autenticado)

#### KPIs exibidos (cards superiores)
| Métrica | Dado | Cor |
|---------|------|-----|
| Total de Equipamentos | Soma de todos os equipamentos | Azul |
| Disponíveis | Soma dos com status "Disponível" | Verde |
| Valor Total Investido | Soma dos valores de Smartphones | Roxo |
| Chamados Abertos | Contagem de chamados com status "Aberto" | Laranja |

#### Cards de Equipamentos (grid 6 cards)
Cada card exibe: nome da categoria, total, quantidade disponível, quantidade em uso.
Categorias: PCs Internos, Notebooks Externos, Smartphones, Câmeras, Coletores, Canetas.
Cada card é clicável e navega para o módulo correspondente.

#### Seção Chamados Recentes
- Lista os 5 chamados mais recentes (`list('-created_date', 5)`)
- Campos exibidos: nome do solicitante, tipo de solicitação, descrição (50 chars), badge de status
- Botão "Ver todos" → navega para `/Chamados`

#### Seção Reservas Recentes
- Lista as 5 reservas mais recentes
- Campos exibidos: nome do solicitante, equipamento, data/hora início, badge de status
- Botão "Ver todas" → navega para `/Reservas`

#### Dados Carregados (queries paralelas)
`PCs_Internos`, `Notebooks_Externos`, `Smartphones`, `Cameras`, `Coletores`, `Canetas_Vibracao`, `Chamados` (últimos 5), `Reservas` (últimos 5)

---

### 4.2 PCs Internos (`/PCs_Internos`)
**Arquivo:** `pages/PCs_Internos.jsx`
**Objetivo:** CRUD completo de equipamentos internos (Desktops, Monitores, Notebooks internos).

#### Campos do Formulário
| Campo | Tipo | Obrigatório | Valores |
|-------|------|-------------|---------|
| Tipo | Select | Não | Monitor, Desktop, Notebook |
| Marca | Input texto | Não | – |
| Modelo | Input texto | Não | – |
| Processador | Input texto | Não | – |
| Etiqueta Interna | Input texto | Não | – |
| Service Tag | Input texto | Não | – |
| Nota Fiscal | Input texto | Não | – |
| Data de Aquisição | Input data | Não | – |
| Tempo de Uso | Input texto | Não | – |
| Office | Input texto | Não | – |
| Antivírus | Select | Não | Sim, Não, Não se aplica |
| Status | Select | Não | Disponível, Em uso, Manutenção, Formatação, Danificado |
| Condição | Select | Não | Rápido, Normal, Lento, Com Problema |
| Data Formatação | Input data | Não | – |
| Disponível para Reserva | Checkbox/Switch | Não | true/false |
| Usuário Atual | Combobox (colaboradores) | Não | – |
| Usuário Desde | Input data | Não | – |
| Área | Input texto | Não | – |
| Observações | Textarea | Não | – |

#### Botões e Ações
| Botão | Ação |
|-------|------|
| + Adicionar Equipamento | Exibe formulário inline de criação |
| Salvar | Cria ou atualiza equipamento |
| Cancelar | Fecha formulário sem salvar |
| ✏️ Editar | Preenche formulário com dados do item |
| 🗑️ Excluir | Remove com `confirm()` nativo |
| 🔄 Transferir | Abre modal de transferência |
| 👤 Atribuir | Abre modal de atribuição (equipamentos disponíveis) |

#### Visualizações
- **Por Usuário** (tab padrão): Agrupa equipamentos pelo usuário atual
- **Individual**: Lista todos os equipamentos individualmente em tabela

#### Filtros e Buscas
- Campo de busca por texto livre (filtra em: usuário, modelo, etiqueta, tipo)

#### Regras de Negócio
- Ao transferir: data_fim é registrada para o usuário anterior; `usuario_atual` e `usuario_desde` são atualizados; o usuário anterior é adicionado ao array `usuarios_anteriores[]`
- `disponivel_para_reserva = true` → o equipamento aparece na lista de reservas do portal
- Equipamentos sem usuário atual aparecem como "Disponível"

#### Modal de Transferência
- Seleção de novo usuário (combobox com colaboradores ativos) OU "Disponível"
- Botão "Confirmar Transferência"

#### Modal de Atribuição
- Lista equipamentos com `disponivel_para_reserva = true` e sem usuário atual
- Seleção de colaborador destino
- Botão "Atribuir Equipamento"

---

### 4.3 Notebooks Externos (`/Notebooks_Externos`)
**Arquivo:** `pages/Notebooks_Externos.jsx`
**Objetivo:** Gestão de notebooks e tablets externos/terceiros.

Campos adicionais em relação a PCs Internos:
| Campo | Tipo |
|-------|------|
| UF (Estado) | Input texto |

---

### 4.4 Tablets (`/Tablets`)
**Arquivo:** `pages/Tablets.jsx`
Estrutura idêntica a Notebooks Externos.

---

### 4.5 Smartphones (`/Smartphones`)
**Arquivo:** `pages/Smartphones.jsx`

Campos adicionais específicos:
| Campo | Tipo |
|-------|------|
| Operadora | Input texto |
| Linha Celular | Input texto |
| Quantidade | Input número |
| Fornecedor | Input texto |
| Valor (R$) | Input número |
| Cor | Input texto |
| IMEI | Input texto |
| Uso em Anos | Input número |

> ⚠️ O campo `valor` dos smartphones é usado no Dashboard para calcular "Valor Total Investido".

---

### 4.6 Câmeras (`/Cameras`)
**Arquivo:** `pages/Cameras.jsx`

Campos adicionais:
| Campo | Tipo |
|-------|------|
| Número Sequencial (#) | Input texto |
| Fornecedor | Input texto |

---

### 4.7 Coletores (`/Coletores`)
**Arquivo:** `pages/Coletores.jsx`

Campos adicionais:
| Campo | Tipo |
|-------|------|
| Número Sequencial (#) | Input texto |
| Tipo de Coletor | Input texto |
| Fornecedor | Input texto |

---

### 4.8 Canetas de Vibração (`/Canetas_Vibracao`)
**Arquivo:** `pages/Canetas_Vibracao.jsx`

Campos adicionais:
| Campo | Tipo |
|-------|------|
| Número Sequencial (#) | Input texto |
| Tipo de Caneta | Input texto |
| Fornecedor | Input texto |

---

### 4.9 Colaboradores (`/Colaboradores`)
**Arquivo:** `pages/Colaboradores.jsx`
**Componentes:** `components/colaboradores/ColaboradorForm.jsx`, `ColaboradorDetalhes.jsx`

#### Campos do Formulário
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome Completo | Input texto | ✅ Sim |
| Email | Input email | Não |
| Área/Departamento | Input texto | ✅ Sim |
| Tipo de Funcionário | Select | Não | Interno, Externo |
| Telefone/Ramal | Input texto | Não |
| Data de Admissão | Input data | Não |
| Status | Select | Não | Ativo, Férias, Afastado, Desligado |
| Senha Portal | Input senha | Não |
| Senha Precisa Trocar | Switch | Não |
| Acesso Portal Bloqueado | Switch | Não |
| Senha Microsoft | Input senha | Não |
| Senha Login Máquina | Input senha | Não |
| Sistemas (array) | Formulário dinâmico | Não |
| → Sistema | Input texto | – |
| → Usuário | Input texto | – |
| → Senha | Input senha | – |
| → Observações | Input texto | – |
| Foto URL | Input texto | Não |
| Observações | Textarea | Não |

#### Botões e Ações
| Botão | Ação |
|-------|------|
| + Novo Colaborador | Exibe formulário |
| Salvar | Cria ou atualiza colaborador |
| Cancelar | Fecha formulário |
| Ver Detalhes | Abre painel de detalhes do colaborador |
| ✏️ Editar | Abre formulário preenchido |
| 🗑️ Excluir | Remove com confirmação |
| Exportar CSV | Gera arquivo CSV com todos os colaboradores |
| + Adicionar Sistema | Adiciona linha de sistema na lista de senhas |
| 🗑️ (sistema) | Remove linha de sistema |

#### Abas de Detalhes do Colaborador
1. **Senhas e Acessos** – Exibe senhas do portal, Microsoft, máquina e sistemas. Botão de copiar e toggle de visibilidade para cada senha
2. **Equipamentos** – Lista todos os equipamentos vinculados ao colaborador (busca em todas as entidades de equipamento por `usuario_atual`)
3. **Chamados** – Lista chamados abertos do colaborador

#### Filtros e Buscas
- Busca por texto (nome, email, área)
- Filtro por status (Ativo, Férias, Afastado, Desligado)
- Filtro por tipo (Interno, Externo)

#### Regras de Negócio
- `senha_precisa_trocar = true` → colaborador é redirecionado para tela de troca de senha ao fazer login no portal
- `acesso_portal_bloqueado = true` → bloqueia completamente o acesso ao portal
- Senhas são armazenadas em **texto plano** na coleção (sem hash – ponto de atenção de segurança)

---

### 4.10 Chamados (`/Chamados`)
**Arquivo:** `pages/Chamados.jsx`
**Objetivo:** Central de helpdesk para a equipe de TI. Gerenciamento completo de chamados.

#### Métricas exibidas (8 cards — 2 linhas)
**Linha 1:** Total | Abertos | Em Andamento | Aguardando Avaliação
**Linha 2:** Resolvidos | Tempo Médio (Interno) | Tempo Médio (Terceiros) | Avaliados

> ℹ️ O tempo médio é separado em **Interno** e **Terceiros** para análise diferenciada. O tempo interno é calculado apenas em horas úteis (seg–sex, 07:42–17:30).

#### Filtro de Período
Botões: Todos | 7 dias | 30 dias | 90 dias | Personalizado (data início – data fim)
Todos os cards e tabelas são filtrados pelo período selecionado.

#### Top Solicitantes
Dois gráficos de barras horizontais exibidos abaixo dos cards:
- **Por Colaborador** – Top 5 colaboradores com mais chamados no período
- **Por Setor** – Top 5 setores com mais chamados no período

#### Abas de Visualização (dinâmicas)
- **Em Aberto** – Chamados com status "Aberto", "Em Análise" ou sem responsável
- **Geral** – Chamados com status "Resolvido"
- **[Nome do Responsável]** – Aba gerada dinamicamente para cada responsável ativo

#### Colunas da Tabela
Nº Chamado | Solicitante + Área | Data Abertura | Tipo Completo | Urgência | Tempo Atend. | Status | Avaliação | Ações

#### Botões e Ações
| Botão/Elemento | Ação |
|----------------|------|
| 👁️ (linha da tabela) | Abre modal de detalhes |
| Copiar link público | Copia URL da página pública de chamados |
| Testar Lembrete de Avaliação | Dispara manualmente a função `lembreteAvaliacao` e exibe resultado |
| Iniciar Atendimento | Abre modal perguntando se é Interno ou Terceiro, depois muda status para "Em Andamento", registra `data_inicio_atendimento`, define responsável, envia e-mail |
| Finalizar Atendimento | Muda status para "Aguardando Avaliação", calcula tempos de resolução, envia e-mail de conclusão |
| Avaliar Atendimento | Abre formulário de avaliação por estrelas (1-5) inline no modal |
| Enviar Avaliação | Salva avaliação, muda status para "Resolvido" |
| Salvar Alterações | Salva responsável e solução, registra no histórico |
| Cancelar | Fecha modal sem salvar |
| Enviar (chat) | Envia mensagem no chat ao vivo (Enter ou botão) |

#### Modal de Detalhes do Chamado — Abas
O modal possui abas internas:

| Aba | Conteúdo |
|-----|----------|
| **Detalhes** | Tipo de solicitação, título, solicitante, equipamentos, descrição, select responsável, textarea solução, tempos de resolução, avaliação |
| **💬 Chat** | Chat em tempo real com polling a 2s |
| **📋 Projeto / Terceiro** | Visível apenas se `terceiro_envolvido = true`. Resumo financeiro, marcos, envolvidos, aprovações |
| **Histórico** | Timeline de todas as alterações do chamado |

#### Bloco de Atendimento Iniciado (modal)
Quando `data_inicio_atendimento` está preenchido, exibe card azul com:
- Data e hora de início
- Tipo de resolução (Interno ou Terceiro)
- Empresa terceira (se aplicável)
- **Número do chamado externo** (`terceiro_numero_chamado`) — exibido para referência rápida

#### Modal de Iniciar Atendimento
Ao clicar "Iniciar Atendimento", abre um modal secundário perguntando:
- **Não — Interno**: chamado tratado pela TI
- **Sim — Terceiro**: exibe campos adicionais (Empresa Terceira, Nº Chamado Externo). A data/hora de abertura com o terceiro é registrada automaticamente.

#### Aba Projeto / Terceiro (modal)
Disponível apenas quando `terceiro_envolvido = true`:
- **Resumo Financeiro**: Horas Contratadas, Horas Realizadas, Valor/Hora, Total Estimado (R$)
- **Marcos**: lista editável de marcos com data, descrição e status (Pendente/Concluído)
- **Envolvidos**: lista de nomes dos envolvidos no projeto
- **Anexos de Aprovação**: upload de arquivos de aprovação

#### Formulário de Avaliação (Admin)
4 critérios com estrelas (1-5): Tempo de Resolução, Qualidade do Atendimento, Qualidade da Solução, Comunicação + campo de comentário.

#### Card de Médias de Avaliação
Exibido quando há avaliações. Mostra Nota Geral (média dos 4 critérios).

#### Cálculo de Tempos de Resolução
| Campo | Descrição |
|-------|-----------|
| `tempo_util_minutos` | Minutos úteis (seg–sex 07:42–17:30) do início ao fim do atendimento |
| `tempo_total_minutos` | Minutos corridos totais (referência) |
| `tempo_resolucao_minutos` | Igual a `tempo_util_minutos` (campo principal) |
| Tempo do terceiro | Calculado na exibição: `terceiro_data_resolucao - terceiro_data_abertura` |

A função `calcularMinutosUteis()` percorre dia a dia entre início e fim, somando apenas os minutos dentro do horário útil.

#### Regras de Negócio
- O número do chamado é gerado no portal como `CH{últimos 8 dígitos do timestamp}`
- Histórico de alterações é mantido como array no chamado (`tipo: status | observacao | solucao | responsavel | inicio_atendimento | conclusao | avaliacao`)
- Tempo de atendimento calculado em tempo real na coluna da tabela: `data_conclusao - data_inicio_atendimento` (ou "agora" se não concluído)
- E-mails são disparados por funções backend assíncronas (`.catch` para não bloquear o fluxo)
- Chat tem polling automático a cada 2 segundos
- O responsável é definido pelo `nome_exibicao` do usuário admin (campo `User.nome_exibicao`) com fallback para `full_name`
- Chamados com `responsavel = "Kauan"` foram migrados em massa para `"adm.sp1"` (operação de abril/2026)

---

### 4.11 Reservas (`/Reservas`)
**Arquivo:** `pages/Reservas.jsx`
**Objetivo:** Gestão administrativa de reservas de equipamentos (notebooks/PCs).

#### Regras de Negócio (Atualizadas)
- **Reservas devem obrigatoriamente começar e terminar no mesmo dia.** Reservas entre dias diferentes não são permitidas para novos cadastros. Dados históricos (reservas antigas entre dias) são mantidos apenas em modo leitura.
- O popup do calendário exibe cada reserva com data completa: se mesmo dia → `DD/MM/YYYY · HH:MM – HH:MM`; se dias diferentes (histórico) → linhas "De: DD/MM/YYYY às HH:MM" e "Até: DD/MM/YYYY às HH:MM".

#### Campos do Formulário
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Equipamento | Select (lista disponíveis) | Não |
| Equipamento Tipo | Texto (preenchido auto) | Auto |
| Solicitante Nome | Input texto | Não |
| Solicitante Email | Input email | Não |
| Solicitante Área | Input texto | Não |
| Data Início | Input data | Não |
| Hora Início | Input hora | Não |
| Data Fim | Input data | Não |
| Hora Fim | Input hora | Não |
| Motivo | Textarea | Não |
| Status | Select | Não | Pendente, Confirmada, Em Andamento, Concluída, Cancelada |
| Observações | Textarea | Não |

#### Visualizações
- **Calendário** – Visão semanal/mensal das reservas
- **Lista** – Tabela com todas as reservas e filtros
- Modal de configuração de notebooks disponíveis para reserva pública

---

### 4.12 Sala de Treinamento (`/sala-treinamento`)
**Arquivo:** `pages/sala-treinamento.jsx`
**Objetivo:** Gestão administrativa da sala de reuniões/treinamento.

#### Visualizações
- **Semanal** – Calendário com slots de horário por dia da semana
- **Mensal** – Calendário mensal com indicadores por dia
- **Ativa** – Tabela de reservas confirmadas
- **Histórico** – Reservas concluídas/canceladas com busca

#### Campos do Formulário de Reserva
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Solicitante Nome | Input texto | ✅ |
| Solicitante Email | Input email | Não |
| Solicitante Área | Input texto | Não |
| Data | Input data | ✅ |
| Hora Início | Select (slots predefinidos) | ✅ |
| Hora Fim | Select (slots predefinidos) | ✅ |
| Motivo/Pauta | Textarea | Não |
| Nº Participantes | Input número | Não |
| Status | Select | Não |
| Observações | Textarea | Não |

#### Regras de Negócio
- Detecção automática de conflitos de horário
- Status evolui automaticamente: `Confirmada → Em Andamento → Concluída` baseado em data/hora atual
- Reservas no passado são marcadas como "Concluída" automaticamente na exibição

---

### 4.13 Ramais (`/Ramais`)
**Arquivo:** `pages/Ramais.jsx`
**Objetivo:** Controle de ramais telefônicos internos.

#### Campos do Formulário
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Ramal | Input texto | ✅ Sim |
| Usuário Atual | Input/Combobox | Não |
| Área | Input texto | Não |
| Data Atribuição | Input data | Não |
| Status | Select | Não | Disponível, Em uso |
| Observações | Textarea | Não |

#### Botões e Ações
| Botão | Ação |
|-------|------|
| + Novo Ramal | Exibe formulário |
| Atribuir | Abre modal de atribuição a colaborador |
| Remover Usuário | Remove usuário atual e registra em histórico |
| ✏️ Editar | Edita dados do ramal |
| 🗑️ Excluir | Remove ramal com confirmação |
| Trocar Ramal | Modal para trocar ramal entre usuários |
| Exportar CSV | Gera arquivo CSV |

---

### 4.14 Avaliações de Equipamentos (`/Avaliacoes_Equipamentos`)
**Arquivo:** `pages/Avaliacoes_Equipamentos.jsx`
**Componente:** `components/equipamentos/AvaliacaoEquipamento.jsx`
**Objetivo:** Registro e visualização de avaliações técnicas periódicas.

#### Abas
- **Avaliados** – Equipamentos que já têm avaliação registrada
- **Não Avaliados** – Equipamentos sem avaliação (alertas de ação)

#### Campos da Avaliação
| Campo | Tipo | Valores |
|-------|------|---------|
| Equipamento ID | FK | – |
| Equipamento Tipo | Texto | PCs_Internos, Notebooks_Externos |
| Equipamento Nome | Texto | – |
| Usuário do Equipamento | Texto | – |
| Nº da Avaliação | Número | Sequencial por equipamento |
| Memória RAM | Texto | Ex: "8GB – 60% uso" |
| Tipo Armazenamento | Texto | SSD, HDD |
| Espaço em Disco | Texto | Ex: "50GB livres" |
| Versão Windows | Texto | – |
| Antivírus | Texto | – |
| Desempenho | Texto | – |
| Problemas | Array de strings | – |
| Atende ao Trabalho | Texto | Sim, Parcialmente, Não |
| Recomendação do Usuário | Texto | – |
| Satisfação | Texto | Muito satisfeito, Satisfeito, Insatisfeito |
| Tempo de Uso (anos) | Número | – |
| Pontuação Total | Número | Calculada automaticamente |
| Classificação | Select | Manter, Upgrade, Substituir |
| Data Avaliação | DateTime | Auto |
| Avaliador | Texto | – |

#### Regras de Negócio
- Pontuação calculada automaticamente baseada nos critérios preenchidos
- Classificação sugerida por IA (InvokeLLM) baseada na pontuação
- Alertas visuais para equipamentos com problemas críticos detectados
- Exportação CSV de todas as avaliações

---

### 4.15 Usuários do Sistema (`/Usuarios`)
**Arquivo:** `pages/Usuarios.jsx`
**Objetivo:** Gerenciar contas de acesso ao painel administrativo.

#### Campos e Ações
| Ação | Detalhe |
|------|---------|
| Convidar Usuário | Modal com campo de email e seleção de role (admin/user) |
| Editar Nome | Modal inline para alterar `nome_exibicao` |
| Filtrar por role | Tabs: Todos, Admins, Usuários |
| Busca | Por nome ou email |

#### Regras de Negócio
- Apenas usuários com `role = 'admin'` visualizam a lista completa
- `base44.users.inviteUser(email, role)` é o método de convite
- Não é possível criar usuários diretamente – apenas convidar por email
- O campo `nome_exibicao` é usado como identidade do admin nos chamados (responsável, histórico, chat). O sistema busca `nome_exibicao` na lista de usuários filtrando por email, verificando também `user.data.nome_exibicao` (campo aninhado). Se não encontrado, faz fallback para `full_name`.

---

### 4.16 Importar Dados (`/Importar`)
**Arquivo:** `pages/Importar.jsx`
**Objetivo:** Importação em massa via CSV, Excel ou JSON.
- Seleção de entidade de destino
- Upload de arquivo
- Preview dos dados antes da importação
- Botão "Importar" executa a carga

---

### 4.17 Resumo (`/Resumo`)
**Arquivo:** `pages/Resumo.jsx`
**Objetivo:** Relatório consolidado de todo o patrimônio tecnológico.
- Exportação para PDF (jsPDF) e CSV
- Totalizadores por categoria de equipamento
- Visão de custo (valor total dos smartphones)

---

### 4.17b Projetos / Terceiros (`/ProjetosTerceiros`)
**Arquivo:** `pages/ProjetosTerceiros.jsx`
**Objetivo:** Dashboard analítico de chamados envolvendo empresas terceiras.

#### Métricas exibidas
- Total de projetos terceiros
- Custo total estimado (R$)
- Horas totais realizadas
- Tempo médio de resolução pelo terceiro

#### Filtros
- Por período (7d / 30d / 90d / Todos)
- Por empresa terceira
- Por status do chamado

#### Dados exibidos por projeto
- Nº do chamado, título, empresa terceira, nº chamado externo
- Datas de abertura e resolução com terceiro
- Tempo do terceiro (em horas úteis)
- Horas contratadas vs realizadas, valor/hora, custo total
- Marcos do projeto e envolvidos
- Link direto para abrir o chamado correspondente

#### Exportação
- Botão "Exportar CSV" gera arquivo com todos os projetos terceiros do período

---

### 4.18 PORTAL DO COLABORADOR

#### Layout do Portal (`components/portal/PortalLayout.jsx`)
**Sidebar com navegação:**
| Item | Rota | Ícone |
|------|------|-------|
| Início | `/portal` | LayoutDashboard |
| Meus Chamados | `/portal-chamados` | Headset |
| Reservar Notebook | `/portal-reservas` | Calendar |
| Sala de Treinamento | `/portal-sala` | Users |
| Meus Equipamentos | `/portal-equipamentos` | Activity |
| Lista de Ramais | `/portal-ramais` | Phone |

**Rodapé do sidebar:**
- Avatar com inicial do nome + nome completo + área
- Botão "Sair" → logout (limpa sessionStorage + redirect para `/portal-login`)
- Botão 🔑 → Modal de troca de senha
- Botão ☀️/🌙 → Toggle dark/light mode (persiste em localStorage)

**Modal Trocar Senha:**
| Campo | Tipo | Validação |
|-------|------|-----------|
| Senha Atual | Input password | Deve coincidir com `senha_portal` no banco |
| Nova Senha | Input password | Mínimo 6 caracteres |
| Confirmar Nova Senha | Input password | Deve ser igual à nova senha |

Botões: Cancelar | Alterar Senha
Após sucesso: `senha_precisa_trocar` é definido como `false`

---

#### Portal – Login (`/portal-login`)
**Arquivo:** `pages/portal-login.jsx`

**Fluxo normal:**
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Email | Input email | ✅ |
| Senha | Input password | ✅ |

Botão "Entrar" → busca colaborador por email → valida `acesso_portal_bloqueado` → compara `senha_portal` → salva em sessionStorage → redireciona para `/portal`

**Fluxo de primeiro acesso (`senha_precisa_trocar = true`):**
Após login bem-sucedido, exibe formulário de definição de nova senha antes de entrar no portal.

| Campo | Tipo |
|-------|------|
| Nova Senha | Input password |
| Confirmar Senha | Input password |

Botão "Definir Senha e Entrar" → atualiza senha no banco → `senha_precisa_trocar = false` → entra no portal

**Mensagens de erro exibidas:**
- "Colaborador não encontrado"
- "Acesso ao portal bloqueado. Entre em contato com o TI."
- "Senha incorreta"
- "Ocorreu um erro. Tente novamente."

---

#### Portal – Dashboard (`/portal`)
**Arquivo:** `pages/portal.jsx`

Cards de resumo:
- Total de chamados do colaborador (abertos + em andamento)
- Reservas ativas de equipamentos
- Reservas de sala

Shortcuts rápidos para todos os módulos do portal.

---

#### Portal – Chamados (`/portal-chamados`)
**Arquivo:** `pages/portal-chamados.jsx`

**Resumo por 4 categorias:**
| Aba | Statuses incluídos |
|-----|--------------------|
| Em Aberto | Aberto, Em Análise |
| Em Andamento | Em Andamento, Aguardando Peça |
| Aguardando Avaliação | Aguardando Avaliação |
| Fechados | Resolvido, Cancelado |

**Cards de métricas:** Em Aberto | Em Andamento | Aguard. Avaliação | Fechados

**Formulário de Abertura de Chamado:**
| Campo | Tipo | Obrigatório | Condicional |
|-------|------|-------------|-------------|
| Tipo de Solicitação | Select | ✅ | – |
| Sistema | Select | Condicional | Apenas se Tipo = "Sistema" |
| Tipo de Problema Sistema | Select | Condicional | Após selecionar sistema |
| Tipo Impressora | Select | Condicional | Apenas se Tipo = "Impressora" |
| Tipo Equipamento | Select | Condicional | Apenas se Tipo = "Equipamento" |
| Outros Detalhes Equipamento | Input | Condicional | Se subtipo = "Outros" |
| Equipamento com Problema | Select (lista do usuário) | Opcional | Se tem equipamentos vinculados |
| Tipo Servidor | Select | Condicional | Apenas se Tipo = "Servidor" |
| Título do Chamado | Input texto | ✅ | Após selecionar tipo |
| Urgência | Select | ✅ | – | Baixa, Média, Alta, Urgente |
| Descrição do Problema | Textarea (4 linhas) | ✅ | – |
| Anexos | File input (múltiplos) | Opcional | – |

**Exibição de equipamentos vinculados:**
Painel azul mostra todos os equipamentos cadastrados para o colaborador (buscados em todas as entidades de equipamento por `usuario_atual = nome_completo`)

**Botões:**
| Botão | Ação |
|-------|------|
| Abrir Chamado (header) | Muda view para formulário |
| Abrir Chamado (submit) | Cria chamado + dispara e-mail via automação |
| Ver Meus Chamados | Retorna para lista |
| Abrir Outro Chamado | Volta para formulário em branco |
| Voltar | Retorna para lista |
| Avaliar (aba Aguard. Avaliação) | Abre modal do chamado |

**Modal de Detalhes do Chamado (Portal):**
- Status, urgência, tipo, data abertura, responsável, data conclusão
- Descrição, solução
- Chat em tempo real (polling a cada 3s)
- Componente `AvaliacaoChamado` para avaliação por estrelas

**Avaliação de Chamado (Portal):**
4 critérios estrelas (1-5): Tempo de Resolução, Qualidade do Atendimento, Qualidade da Solução, Comunicação + comentário opcional
Ao enviar: muda status para "Resolvido"

**Upload de Anexos:**
- Aceita: imagens, vídeos, PDF, DOC, DOCX, XLS, XLSX
- Upload via `base44.integrations.Core.UploadFile`
- Exibe lista de arquivos com botão para remover antes de enviar
- Indicador de loading durante upload

---

#### Portal – Reservas (`/portal-reservas`)
**Arquivo:** `pages/portal-reservas.jsx`

**Equipamentos disponíveis:** Une notebooks externos (`disponivel_para_reserva = true`) e PCs internos (`disponivel_para_reserva = true`)

**Formulário de Reserva:**
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Equipamento | Select (cards clicáveis) | ✅ |
| Data | Input data (única — início e fim iguais) | ✅ |
| Hora Início | Input hora | ✅ |
| Data Devolução | Preenchida automaticamente = Data de início (readonly) | Auto |
| Hora Fim | Input hora | ✅ |
| Motivo | Textarea | Não |

**Botões:**
- "Confirmar Reserva" → verifica conflito → cria reserva
- "Cancelar" (reserva ativa) → muda status para "Cancelada"
- Slots livres no Calendário → pré-preenche data e hora no formulário

**Abas:**
- **Minhas Reservas** – Reservas ativas do colaborador (Pendente, Confirmada, Em Andamento)
- **Histórico** – Reservas concluídas/canceladas
- **Calendário** – Visão semanal de todas as reservas de todos os equipamentos disponíveis (seg–sex). Slots livres em verde (clicáveis), ocupados em vermelho com etiqueta + modelo + horário.

**Regras de Negócio:**
- **Reservas devem obrigatoriamente começar e terminar no mesmo dia.** Ao selecionar a data de início, a data de devolução é preenchida automaticamente com o mesmo valor (readonly). Se houver divergência, o submit é bloqueado com mensagem: *"As reservas devem ser feitas dentro do mesmo dia. Se você precisar do equipamento por mais de um dia, crie uma reserva separada para cada dia."*
- Verificação de conflito: não permite sobreposição de horários para o mesmo equipamento no mesmo dia
- Não são permitidas reservas em finais de semana
- Horário deve estar dentro do expediente: 07:42 às 17:30
- **Card de notebook exibe todos os períodos ocupados na data selecionada**, não apenas a próxima disponibilidade. Se não houver reservas na data, exibe "Disponível o dia todo" em verde.
- **Aba Calendário:** Calendário semanal com faixas contínuas proporcionais à duração de cada reserva (modelo estilo Google Calendar). Cada reserva aparece uma única vez ocupando sua faixa de horário. Clicar em área livre pré-preenche data e hora no formulário e destaca automaticamente quais notebooks estão disponíveis naquele horário.

---

#### Portal – Sala de Treinamento (`/portal-sala`)
**Arquivo:** `pages/portal-sala.jsx`

**Visualização semanal:** Grade de horários por dia (ex: 08:00, 09:00 ... 18:00)
- Slots disponíveis (clicáveis), ocupados (bloqueados), passados (bloqueados)
- Clique em slot disponível → abre formulário de reserva

**Abas:**
- **Agenda Geral** – Todos as reservas da semana
- **Minhas Reservas** – Reservas do colaborador logado

**Navegação:** Semana anterior / Semana atual / Próxima semana

---

#### Portal – Equipamentos (`/portal-equipamentos`)
**Arquivo:** `pages/portal-equipamentos.jsx`

- Lista equipamentos vinculados ao colaborador (busca em todas as entidades por `usuario_atual`)
- Para cada equipamento: botão "Avaliar" → abre formulário de avaliação técnica
- Histórico de avaliações anteriores do equipamento

---

#### Portal – Ramais (`/portal-ramais`)
**Arquivo:** `pages/portal-ramais.jsx`
**Somente leitura**

- Busca por ramal, usuário ou área
- Métricas: Total | Em uso | Disponíveis
- Tabela: Ramal | Usuário | Área | Status

---

## 5. FLUXOS E JORNADAS

### 5.1 Fluxo Completo de Chamado

```
[PORTAL] Colaborador faz login
    → Clica "Abrir Chamado"
    → Preenche formulário (tipo, subtipo condicional, título, urgência, descrição, anexos)
    → Submete → Número gerado: CH{timestamp 8 dígitos}
    → Chamado criado com status "Aberto"
    → Automação entity dispara "notificarNovoChamado"
    → Função sendEmailTicketCreated → e-mail para solicitante e admin

[ADMIN] Equipe de TI vê chamado na aba "Em Aberto"
    → Abre modal de detalhes
    → Atribui responsável (select de usuários)
    → Clica "Iniciar Atendimento"
        → Status: "Em Andamento"
        → data_inicio_atendimento = agora
        → responsavel = nome do admin logado
        → Histórico atualizado
        → sendEmailTicketStarted → e-mail para solicitante

[ADMIN + PORTAL] Chat ao vivo
    → Admin envia mensagem → ChamadosChat criado → email via sendEmailChatMessage
    → Portal polling a 3s | Admin polling a 2s

[ADMIN] Clica "Finalizar Atendimento"
    → Status: "Aguardando Avaliação"
    → data_conclusao = agora
    → tempo_resolucao_minutos calculado
    → sendEmailTicketClosed → e-mail para solicitante com link de avaliação

[PORTAL] Colaborador vê chamado na aba "Aguardando Avaliação"
    → Clica "Avaliar"
    → Preenche 4 critérios estrelas + comentário
    → Envia → nota_geral calculada (média dos 4)
    → Status: "Resolvido"
    → Chamado aparece na aba "Fechados"
```

### 5.2 Diagrama de Status do Chamado

```
                ┌──────────┐
    Criado  →   │  Aberto  │
                └────┬─────┘
                     │ (admin vê / analisa)
                     ▼
               ┌────────────┐
               │ Em Análise │  (status manual pelo admin)
               └────┬───────┘
                    │ handleIniciarAtendimento()
                    ▼
             ┌─────────────────┐
             │  Em Andamento   │
             └────┬────────────┘
                  │ (pode mudar manualmente)
                  ▼
         ┌──────────────────────┐
         │  Aguardando Peça     │  (status manual)
         └────┬─────────────────┘
              │ handleFinalizarAtendimento()
              ▼
    ┌─────────────────────────┐
    │  Aguardando Avaliação   │
    └────────┬────────────────┘
             │ colaborador avalia no portal
             ▼
          ┌──────────┐     ┌───────────┐
          │ Resolvido│     │ Cancelado │  (qualquer momento)
          └──────────┘     └───────────┘
```

### 5.3 Fluxo de Login do Portal

```
Acessa /portal-login
    → Digita email + senha
    → busca Colaboradores.filter({email})
    → verifica acesso_portal_bloqueado → se true: erro bloqueado
    → compara senha_portal
    → verifica senha_precisa_trocar
        → se true: exibe formulário de nova senha
            → atualiza banco → senha_precisa_trocar = false
            → entra no portal
        → se false: entra diretamente
    → salva colaborador em sessionStorage('portal_colaborador')
    → redireciona para /portal
```

### 5.4 Fluxo de Transferência de Equipamento

```
Admin acessa módulo de equipamento
    → Seleciona equipamento → clica "Transferir"
    → Modal: seleciona novo usuário OU "Disponível"
    → Confirma:
        → usuarios_anteriores.push({nome: usuario_atual, data_inicio: usuario_desde, data_fim: hoje})
        → usuario_atual = novo usuário (ou null)
        → usuario_desde = hoje (ou null)
        → status = "Em uso" (ou "Disponível")
```

### 5.5 Fluxo de Reserva de Equipamento (Portal)

```
Colaborador acessa /portal-reservas
    → [OPCIONAL] Acessa aba "Calendário"
        → Vê grade semanal com todos os equipamentos
        → Identifica slot livre (verde) no dia/hora desejado
        → Clica no slot → formulário pré-preenchido com data e hora
    → [OU] Clica "Nova Reserva" diretamente
    → Seleciona equipamento (card)
        → Card exibe períodos ocupados na data selecionada
        → Se data não selecionada: exibe status geral do equipamento
    → Seleciona a DATA (única — início e fim iguais automaticamente)
    → Define Hora Início e Hora Fim (mesmo dia, dentro do expediente 07:42–17:30)
    → Sistema valida:
        → data_inicio === data_fim (mesmo dia — obrigatório)
        → hora_inicio < hora_fim
        → dentro do horário de expediente
        → não é fim de semana
        → sem conflito com outras reservas no mesmo horário
        → se qualquer falha: exibe mensagem de erro, bloqueia submit
    → Reserva criada com status "Confirmada"
    → Colaborador pode cancelar na aba "Minhas Reservas"
```

### 5.6 Fluxo de Avaliação de Equipamento

```
Colaborador acessa /portal-equipamentos
    → Vê seus equipamentos vinculados
    → Clica "Avaliar" em um equipamento
    → Preenche formulário técnico
    → Sistema calcula pontuação total
    → Salva em Avaliacoes
    → numero_avaliacao = contagem anterior + 1

Admin acessa /Avaliacoes_Equipamentos
    → Vê equipamentos avaliados e não avaliados
    → Exporta relatório CSV
```

---

## 6. BANCO DE DADOS

### Lista Completa de Coleções (16 total)

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
| 15 | `FilaEmails` | Fila de e-mails a enviar | `entities/FilaEmails.json` |
| 16 | `User` | Usuários admin (built-in Base44) | – |

### Campos Built-in (todos os registros automaticamente)
```
id           – string (UUID, chave primária)
created_date – ISO datetime
updated_date – ISO datetime
created_by   – string (email do criador)
```

### Detalhamento por Entidade

#### Colaboradores
| Campo | Tipo | Obs |
|-------|------|-----|
| nome_completo | string | Obrigatório. Usado como FK em equipamentos |
| email | string | Usado como FK em chamados e login portal |
| area | string | Obrigatório |
| tipo_funcionario | enum: Interno, Externo | |
| telefone | string | |
| data_admissao | date | |
| status | enum: Ativo, Férias, Afastado, Desligado | default: Ativo |
| senha_portal | string | Texto plano ⚠️ |
| senha_precisa_trocar | boolean | default: false |
| acesso_portal_bloqueado | boolean | default: false |
| senha_microsoft | string | |
| senha_login_maquina | string | |
| senhas_sistemas | array[{sistema, usuario, senha, observacoes}] | |
| foto_url | string | |
| observacoes | string | |

#### Chamados
| Campo | Tipo | Obs |
|-------|------|-----|
| numero_chamado | string | Gerado pelo portal: CH{8 dígitos} |
| terceiro_envolvido | boolean | Se há empresa terceira |
| terceiro_empresa | string | Nome da empresa terceira |
| terceiro_numero_chamado | string | Nº do chamado na empresa terceira |
| terceiro_data_abertura | datetime | Auto-preenchido ao iniciar atendimento com terceiro |
| terceiro_data_resolucao | datetime | Auto-preenchido ao finalizar chamado terceiro |
| tipo_resolucao | enum: Interno, Terceiro | Definido ao iniciar atendimento |
| tempo_util_minutos | number | Minutos úteis (seg–sex 07:42–17:30) |
| tempo_total_minutos | number | Minutos corridos totais |
| projeto_horas_contratadas | number | Horas acordadas com terceiro |
| projeto_horas_realizadas | number | Horas efetivamente realizadas |
| projeto_valor_hora | number | Valor/hora em R$ |
| projeto_envolvidos | array[string] | Nomes dos envolvidos |
| projeto_marcos | array[{data, descricao, status}] | Marcos do projeto |
| projeto_aprovacoes | array[{file_url, file_name}] | Anexos de aprovação |
| ultimo_lembrete_enviado | datetime | Timestamp do último lembrete (anti-spam) |
| tipo_solicitacao | enum: Sistema, Impressora, Equipamento, Melhorias, Desenvolvimento, Servidor, Outros | |
| titulo_chamado | string | |
| sistema_tipo | enum: WMS, Portal de Vendas, SAP | condicional |
| sistema_subtipo | enum: Problema no Sistema, Nova Implementação | condicional |
| impressora_subtipo | enum: Troca de Cartucho/Toner, Problema na Impressora | condicional |
| equipamento_subtipo | enum: 6 opções | condicional |
| equipamento_selecionado | string | |
| equipamento_outros_detalhes | string | |
| melhorias_detalhes | string | |
| desenvolvimento_detalhes | string | |
| servidor_subtipo | enum: Rede, Internet | condicional |
| solicitante_nome | string | |
| solicitante_email | string | |
| solicitante_area | string | |
| solicitante_telefone | string | |
| equipamento_atual | string | |
| equipamentos_usuario | array[{tipo, marca, modelo, etiqueta}] | snapshot dos equip. do usuário |
| descricao_problema | string | |
| anexos | array[{file_url, file_name, file_type, mime_type}] | |
| urgencia | enum: Baixa, Média, Alta, Urgente | default: Média |
| status | enum: Aberto, Em Análise, Em Andamento, Aguardando Peça, Aguardando Avaliação, Resolvido, Cancelado | default: Aberto |
| data_abertura | date | |
| data_inicio_atendimento | datetime | |
| data_conclusao | datetime | |
| responsavel | string | Nome do admin |
| solucao | string | |
| observacoes | string | |
| tempo_resolucao_minutos | number | Calculado automaticamente |
| avaliacao_tempo_resolucao | number (1-5) | |
| avaliacao_qualidade_atendimento | number (1-5) | |
| avaliacao_qualidade_solucao | number (1-5) | |
| avaliacao_comunicacao | number (1-5) | |
| avaliacao_nota_geral | number | Média dos 4 critérios |
| avaliacao_comentario | string | |
| avaliacao_data | datetime | |
| historico | array[{data_hora, tipo, descricao, usuario}] | |
| email_abertura_enviado | boolean | Controle de e-mail |
| email_inicio_enviado | boolean | Controle de e-mail |
| email_conclusao_enviado | boolean | Controle de e-mail |
| ultimo_email_admin_chat | datetime | Rate limiting de e-mails no chat |

#### ChamadosChat
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| chamado_id | string (FK → Chamados.id) | ✅ |
| tipo_remetente | enum: admin, solicitante | ✅ |
| remetente_nome | string | ✅ |
| remetente_email | string | |
| mensagem | string | ✅ |
| anexo_url | string | |
| anexo_nome | string | |
| data_hora | datetime | |

#### Reservas
| Campo | Tipo |
|-------|------|
| equipamento_id | string (FK → equipamento.id) |
| equipamento_tipo | string (nome da entidade) |
| equipamento_nome | string (display) |
| solicitante_nome | string |
| solicitante_email | string |
| solicitante_area | string |
| data_inicio | date |
| hora_inicio | string HH:mm |
| data_fim | date |
| hora_fim | string HH:mm |
| motivo | string |
| status | enum: Pendente, Confirmada, Em Andamento, Concluída, Cancelada |
| observacoes | string |

#### FilaEmails
| Campo | Tipo |
|-------|------|
| destinatario | string ✅ |
| assunto | string ✅ |
| corpo_html | string ✅ |
| tipo_evento | enum: chamado_aberto, atendimento_iniciado, observacao_adicionada, chamado_concluido, notificacao_geral |
| referencia_id | string |
| status | enum: pendente, enviado, erro |
| tentativas | number |
| mensagem_erro | string |
| data_criacao | datetime |
| data_envio | datetime |

### Relacionamentos

| Relação | Tipo | Campo de ligação |
|---------|------|-----------------|
| Chamados → ChamadosChat | 1:N | `ChamadosChat.chamado_id = Chamados.id` |
| Colaboradores → PCs_Internos | 1:N | `PCs_Internos.usuario_atual = Colaboradores.nome_completo` |
| Colaboradores → Notebooks_Externos | 1:N | `Notebooks_Externos.usuario_atual = Colaboradores.nome_completo` |
| Colaboradores → Smartphones | 1:N | `Smartphones.usuario_atual = Colaboradores.nome_completo` |
| Colaboradores → Cameras | 1:N | `Cameras.usuario_atual = Colaboradores.nome_completo` |
| Colaboradores → Coletores | 1:N | `Coletores.usuario_atual = Colaboradores.nome_completo` |
| Colaboradores → Canetas_Vibracao | 1:N | `Canetas_Vibracao.usuario_atual = Colaboradores.nome_completo` |
| Colaboradores → Ramais | 1:N | `Ramais.usuario_atual = Colaboradores.nome_completo` (string) |
| Colaboradores → Chamados | 1:N | `Chamados.solicitante_email = Colaboradores.email` |
| PCs_Internos → Reservas | 1:N | `Reservas.equipamento_id = PCs_Internos.id` |
| Notebooks_Externos → Reservas | 1:N | `Reservas.equipamento_id = Notebooks_Externos.id` |
| PCs_Internos → Avaliacoes | 1:N | `Avaliacoes.equipamento_id = PCs_Internos.id` |
| Notebooks_Externos → Avaliacoes | 1:N | `Avaliacoes.equipamento_id = Notebooks_Externos.id` |
| Chamados → FilaEmails | 1:N | `FilaEmails.referencia_id = Chamados.id` |

> ⚠️ **Atenção:** Por ser NoSQL sem FK formal, não há integridade referencial automática. Se um colaborador tiver o nome alterado, os vínculos com equipamentos são quebrados.

---

## 7. APIS E ENDPOINTS

### Backend Functions (Deno Deploy via Base44)

| Arquivo | Nome da Função | Trigger | Descrição |
|---------|---------------|---------|-----------|
| `functions/sendEmailTicketCreated.js` | `sendEmailTicketCreated` | Entity automation (create Chamados) | Envia e-mail de abertura para solicitante e admin. Controle via `email_abertura_enviado` |
| `functions/sendEmailTicketStarted.js` | `sendEmailTicketStarted` | Chamada manual pelo admin | E-mail de início de atendimento. Controle via `email_inicio_enviado` |
| `functions/sendEmailTicketClosed.js` | `sendEmailTicketClosed` | Chamada manual pelo admin | E-mail de conclusão com link para avaliação. Controle via `email_conclusao_enviado` |
| `functions/sendEmailChatMessage.js` | `sendEmailChatMessage` | Chamada ao enviar mensagem no chat | Notifica o destinatário correto (admin ou solicitante) de nova mensagem |
| `functions/sendEmail.js` | `sendEmail` | Utilitário | Wrapper genérico para envio via Resend |
| `functions/adicionarFilaEmail.js` | `adicionarFilaEmail` | Utilitário | Adiciona registro na coleção FilaEmails |
| `functions/processarFilaEmails.js` | `processarFilaEmails` | Automação agendada | Processa e envia e-mails pendentes da fila |
| `functions/sendEmailAsync.js` | `sendEmailAsync` | Utilitário | Envio assíncrono desacoplado |
| `functions/lembreteAvaliacao.js` | `lembreteAvaliacao` | Automação agendada | Envia lembretes de avaliação a cada 6h para chamados em "Aguardando Avaliação" |
| `functions/listarUsuarios.js` | `listarUsuarios` | Chamada do frontend | Lista usuários do sistema (necessário service role) |

### Chamadas SDK do Frontend

```javascript
// Listagem
base44.entities.{Entidade}.list(ordenacao, limite)
base44.entities.{Entidade}.filter({campo: valor}, ordenacao, limite)

// CRUD
base44.entities.{Entidade}.create({dados})
base44.entities.{Entidade}.update(id, {dados})
base44.entities.{Entidade}.delete(id)

// Schema
base44.entities.{Entidade}.schema()

// Funções backend
base44.functions.invoke('nomeFuncao', payload)

// Integrações
base44.integrations.Core.UploadFile({file})
base44.integrations.Core.SendEmail({to, subject, body, from_name})
base44.integrations.Core.InvokeLLM({prompt, response_json_schema})

// Auth
base44.auth.me()
base44.auth.logout(redirectUrl)
base44.auth.redirectToLogin(nextUrl)
base44.auth.isAuthenticated()
base44.auth.updateMe(data)

// Usuários
base44.users.inviteUser(email, role)

// Assinatura em tempo real
base44.entities.{Entidade}.subscribe(callback)
```

### Parâmetros das Funções Backend (payload)

#### sendEmailTicketCreated
```json
{ "chamado_id": "string" }
```

#### sendEmailTicketStarted
```json
{ "chamado_id": "string", "responsavel": "string" }
```

#### sendEmailTicketClosed
```json
{ "chamado_id": "string", "responsavel": "string" }
```

#### sendEmailChatMessage
```json
{
  "chamado_id": "string",
  "tipo_remetente": "admin | solicitante",
  "remetente_nome": "string",
  "mensagem": "string"
}
```

#### listarUsuarios
```json
{}
```

---

## 8. PERMISSÕES E USUÁRIOS

### Perfis do Sistema Administrativo

| Perfil | Role | Capacidades |
|--------|------|-------------|
| Administrador | `admin` | Acesso total a todos os módulos. Pode convidar usuários. Pode ver dados de todos os colaboradores. Pode gerenciar roles. |
| Usuário | `user` | Acesso a módulos operacionais. Não pode gerenciar usuários do sistema. |

### Segurança Base44 (RLS automático)
- A plataforma Base44 aplica segurança por role automaticamente
- `User` entity: apenas admins podem listar, atualizar ou deletar outros usuários
- Usuários regulares só podem ver e atualizar seu próprio registro

### Portal do Colaborador
| Aspecto | Detalhe |
|---------|---------|
| Sistema de auth | Independente do admin – credenciais em `Colaboradores` |
| Sessão | `sessionStorage['portal_colaborador']` – limpa ao fechar aba |
| Escopo de dados | Colaborador vê apenas seus próprios chamados (filtro por nome) e reservas |
| Bloqueio | `acesso_portal_bloqueado = true` impede qualquer login |
| Troca de senha forçada | `senha_precisa_trocar = true` → tela de nova senha antes de entrar |
| Senhas | Armazenadas em texto plano ⚠️ (vulnerabilidade conhecida) |

### Páginas Públicas (sem qualquer autenticação)
`/portal-login`, `/chamado-publico`, `/acompanhar-chamado`, `/reserva-publica`, `/reserva-sala-publica`

---

## 9. AUTOMAÇÕES

| Nome | Tipo | Trigger | Função | Descrição |
|------|------|---------|--------|-----------|
| Notificar Novo Chamado | Entity | Create em `Chamados` | `sendEmailTicketCreated` | Dispara e-mail imediatamente ao criar chamado |
| Processar Fila de E-mails | Scheduled | Agendado (intervalo) | `processarFilaEmails` | Processa e-mails pendentes na FilaEmails |
| Lembrete de Avaliação | Scheduled | A cada 6h | `lembreteAvaliacao` | Envia lembrete para chamados em "Aguardando Avaliação" |

---

## 10. TEMPLATES DE E-MAIL

Todos os e-mails usam um template HTML centralizado (`buildEmailHtml` em `pages/Chamados.jsx`) com:
- Header azul com logo "⚙ TechControl"
- Banner de status colorido (cor varia por evento)
- Card branco com número do chamado em destaque (fonte mono)
- Botão CTA "Acompanhar Chamado"
- Footer com copyright

| Evento | Cor Banner | Ícone | CTA |
|--------|------------|-------|-----|
| Chamado Aberto | Azul `#2563eb` | 📋 | Acompanhar Chamado |
| Atendimento Iniciado | Azul `#2563eb` | 🔧 | Acompanhar Chamado |
| Chamado Concluído | Verde `#16a34a` | ✅ | Ir para o Portal (avaliar) |
| Nova Mensagem Chat | Azul `#2563eb` | 💬 | Acompanhar Chamado |

O e-mail de conclusão possui bloco especial de avaliação em amarelo com botão âmbar.
Rodapé dos e-mails: "© 2026 TechControl · Todos os direitos reservados"

---

## 11. PROBLEMAS CONHECIDOS

| # | Problema | Módulo | Severidade | Impacto |
|---|---------|--------|------------|---------|
| 1 | **Senhas em texto plano** – `senha_portal`, `senha_microsoft`, `senha_login_maquina` são armazenadas sem criptografia | Colaboradores / Portal | 🔴 Alta | Exposição de dados sensíveis |
| 2 | **Vínculo frágil por nome** – Equipamentos vinculados por `usuario_atual = nome_completo`. Nomes com grafia diferente (acento, espaço) quebram vínculos | Todos os módulos de equip. | 🟡 Média | Inconsistência de dados |
| 3 | **Sessão em sessionStorage** – Portal do colaborador perde sessão ao fechar aba | Portal | 🟡 Média | UX – precisa logar sempre |
| 4 | **Sem validação MIME no servidor** – Upload de arquivos só valida por `accept` no input HTML, não no backend | Chamados | 🟡 Média | Segurança de upload |
| 5 | **FilaEmails sem limpeza** – Registros com status "enviado" nunca são removidos automaticamente | E-mails | 🟢 Baixa | Performance futura |
| 6 | **Chamado travado em "Aguardando Avaliação"** – Se colaborador não avaliar, o chamado fica nesse status indefinidamente | Chamados | 🟢 Baixa | Métricas incorretas |
| 7 | **Cálculo de valor total** – "Valor Total Investido" no Dashboard soma apenas o valor dos Smartphones, não de todos os equipamentos | Dashboard | 🟢 Baixa | Métrica incompleta |
| 8 | **Polling agressivo** – Chat admin usa `refetchInterval: 2000` e portal usa `3000` ms. Em uso simultâneo intenso pode gerar muitas requests | Chamados / Portal | 🟢 Baixa | Performance |

---

## 12. GUIA DE MIGRAÇÃO

### 12a. Migração para GitHub

**Estrutura de repositório sugerida:**
```
techcontrol/
├── src/
│   ├── pages/              # Todas as páginas React
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── portal/         # Componentes do portal
│   │   ├── colaboradores/  # Componentes de colaboradores
│   │   └── equipamentos/   # Componentes de equipamentos
│   ├── entities/           # JSON schemas das entidades
│   ├── functions/          # Backend functions (Deno)
│   ├── api/                # base44Client, entities, integrations
│   ├── lib/                # Utilitários, AuthContext, etc.
│   ├── hooks/              # Custom hooks (use-mobile, etc.)
│   ├── utils/              # Funções utilitárias
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
├── index.html
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

**`.env.example`:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
BASE44_APP_ID=your_app_id
```

**`.gitignore`:**
```
node_modules/
dist/
.env
.env.local
*.local
```

---

### 12b. Migração para Vercel

**`vercel.json`:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Variáveis de ambiente no painel Vercel:**
```
RESEND_API_KEY  →  re_xxxxxxxxxxxx
```

**⚠️ Atenção crítica:** As backend functions em Deno precisariam ser migradas para **Vercel Edge Functions** (sintaxe diferente). O SDK `@base44/sdk` e toda a camada `base44.entities.*`, `base44.auth` precisaria ser substituída. Estimar **3-4 semanas** de refatoração.

---

### 12c. Migração para Supabase

**Passos:**
1. Criar projeto no Supabase
2. Criar tabelas SQL para cada uma das 16 entidades
3. Habilitar RLS em todas as tabelas
4. Exportar dados do Base44 via SDK (script de migração)
5. Importar dados via Supabase `insert`
6. Substituir `base44.entities.*` por `supabase.from('tabela').*`
7. Substituir `base44.auth` por `supabase.auth`
8. Migrar backend functions para **Supabase Edge Functions**
9. Configurar Supabase Storage para substituir `UploadFile`
10. Manter integração com Resend (continua funcionando)

**Exemplo de schema SQL (Chamados):**
```sql
CREATE TABLE chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  numero_chamado TEXT,
  tipo_solicitacao TEXT,
  titulo_chamado TEXT,
  sistema_tipo TEXT,
  sistema_subtipo TEXT,
  impressora_subtipo TEXT,
  equipamento_subtipo TEXT,
  equipamento_selecionado TEXT,
  solicitante_nome TEXT,
  solicitante_email TEXT,
  solicitante_area TEXT,
  solicitante_telefone TEXT,
  equipamentos_usuario JSONB DEFAULT '[]',
  descricao_problema TEXT,
  anexos JSONB DEFAULT '[]',
  urgencia TEXT DEFAULT 'Média',
  status TEXT DEFAULT 'Aberto',
  data_abertura DATE,
  data_inicio_atendimento TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  responsavel TEXT,
  solucao TEXT,
  historico JSONB DEFAULT '[]',
  tempo_resolucao_minutos NUMERIC,
  avaliacao_tempo_resolucao NUMERIC,
  avaliacao_qualidade_atendimento NUMERIC,
  avaliacao_qualidade_solucao NUMERIC,
  avaliacao_comunicacao NUMERIC,
  avaliacao_nota_geral NUMERIC,
  avaliacao_comentario TEXT,
  avaliacao_data TIMESTAMPTZ,
  email_abertura_enviado BOOLEAN DEFAULT FALSE,
  email_inicio_enviado BOOLEAN DEFAULT FALSE,
  email_conclusao_enviado BOOLEAN DEFAULT FALSE
);

ALTER TABLE chamados ENABLE ROW LEVEL SECURITY;

-- Admins veem tudo
CREATE POLICY "admins_all" ON chamados
  USING (auth.jwt() ->> 'role' = 'admin');

-- Solicitante vê apenas seus chamados
CREATE POLICY "solicitante_own" ON chamados
  USING (solicitante_email = auth.email());
```

**Estimativa de esforço de migração completa:** 4-6 semanas (frontend + backend + dados + testes)

---

## CHANGELOG

| Data | Versão | Módulo/Arquivo | Descrição |
|------|--------|----------------|-----------|
| 09/04/2026 | 1.0.0 | Sistema completo | Documentação técnica inicial gerada via auditoria completa de código |
| 09/04/2026 | 1.0.1 | Sistema completo | Documentação expandida com auditoria detalhada: todos os botões, campos, fluxos, status, automações, templates de e-mail e relacionamentos mapeados |
| 09/04/2026 | 1.1.0 | Chamados | Implementação de chamados para empresas terceiras: modal de iniciar atendimento com seleção Interno/Terceiro, campos `terceiro_empresa`, `terceiro_numero_chamado`, `terceiro_data_abertura`, `terceiro_data_resolucao`, `tipo_resolucao` |
| 09/04/2026 | 1.1.1 | Chamados | Separação do tempo médio de resolução em "Interno" e "Terceiros" nos cards de métricas |
| 09/04/2026 | 1.1.2 | Chamados | Implementação de cálculo de tempo útil (`calcularMinutosUteis`) — seg–sex, 07:42–17:30 — nos campos `tempo_util_minutos` e `tempo_total_minutos` |
| 09/04/2026 | 1.1.3 | Chamados | Adicionada aba "📋 Projeto / Terceiro" no modal de detalhes: resumo financeiro, marcos, envolvidos, anexos de aprovação |
| 09/04/2026 | 1.1.4 | Chamados | Adicionado filtro de período (7d / 30d / 90d / Personalizado) afetando cards e tabelas |
| 09/04/2026 | 1.1.5 | Chamados | Adicionados gráficos de "Top Solicitantes por Colaborador" e "Top Setores" |
| 09/04/2026 | 1.1.6 | Chamados | Adicionada coluna "Data Abertura" na tabela de chamados |
| 09/04/2026 | 1.1.7 | Chamados | Botão "Testar Lembrete de Avaliação" no header para disparar `lembreteAvaliacao` manualmente |
| 09/04/2026 | 1.1.8 | Chamados | Adicionada lógica para exibir `nome_exibicao` do admin no histórico/responsável; verifica `user.nome_exibicao` e `user.data.nome_exibicao` |
| 09/04/2026 | 1.2.0 | ProjetosTerceiros | Nova página `/ProjetosTerceiros` — dashboard analítico de chamados de terceiros com métricas financeiras, filtros e exportação CSV |
| 09/04/2026 | 1.2.0 | Chamados/DB | Migração em massa: 75 chamados com `responsavel = "Kauan"` transferidos para `"adm.sp1"` |
| 15/04/2026 | 1.2.0 | Chamados | Correção de exibição: `terceiro_numero_chamado` agora aparece no bloco azul "Atendimento Iniciado" dentro do modal de detalhes |
| 15/04/2026 | 1.2.0 | Documentação | Atualização completa da documentação técnica refletindo todas as implementações e correções desde a v1.0.1 |
| 15/04/2026 | 1.3.0 | Reservas + Portal | Módulo de Reservas: bloqueio de reservas entre dias (data_inicio deve ser igual a data_fim), exibição completa de períodos ocupados no card do notebook (todos os slots do dia selecionado), adição de aba "Calendário" com visão semanal geral no portal do colaborador, correção do popup do calendário admin para exibir datas completas (De/Até ou formato simplificado quando mesmo dia) |
| 15/04/2026 | 1.4.0 | Portal Reservas | Redesenho do calendário semanal para modelo de faixas contínuas proporcionais (estilo Google Calendar); correção da exibição de períodos ocupados que ignorava reservas históricas com datas cruzadas (agora filtra apenas reservas onde data_inicio = data selecionada e hora_inicio < hora_fim); seleção de notebook após clique no calendário agora ordena disponíveis primeiro e exibe badge "Livre neste horário" / "Ocupado"; sugestão de hora_fim automática (+1:30h) ao clicar em slot livre |

---

*Documento gerado e mantido automaticamente. Toda alteração no sistema deve ser refletida aqui com nova entrada no CHANGELOG.*