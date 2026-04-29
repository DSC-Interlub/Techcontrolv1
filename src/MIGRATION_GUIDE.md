# GUIA COMPLETO DE MIGRAÇÃO — TechControl
> Base44 → Supabase + Vercel + GitHub
> Gerado em: 29/04/2026

---

## VISÃO GERAL DA STACK ATUAL (Base44)

| Camada | Base44 | Destino |
|--------|--------|---------|
| Frontend | React 18 + Vite + Tailwind + shadcn/ui | Manter (Vite → Vercel) |
| Banco de dados | Base44 NoSQL (documentos) | Supabase (PostgreSQL) |
| Auth | Base44 Auth (JWT + roles) | Supabase Auth + tabela profiles |
| Backend Functions | Deno Deploy | Vercel API Routes (Node.js) |
| Automações (cron) | Base44 Automations | Vercel Cron Jobs |
| Entity triggers | Base44 Entity Automations | Supabase Database Webhooks |
| Upload de arquivos | Base44 Core.UploadFile | Supabase Storage |
| InvokeLLM | Base44 Core.InvokeLLM | OpenAI API direta |
| SendEmail (comunicados) | Base44 Core.SendEmail | Gmail via Nodemailer (já migrado) |
| SendEmail (chamados) | Resend API | Resend API (manter) |
| SDK cliente | @base44/sdk | @supabase/supabase-js |
| Domínio | Ionos (via Base44) | Ionos DNS → Vercel |

---

## PARTE 1 — BANCO DE DADOS (Supabase)

### 1.1 — Criar projeto Supabase
- Acesse: https://supabase.com → New Project
- Guardar: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### 1.2 — SQL completo para criar as 19 tabelas

Cole no **Supabase SQL Editor** e execute:

```sql
-- =============================================
-- EXTENSÕES
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: colaboradores
-- =============================================
CREATE TABLE colaboradores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  nome_completo TEXT NOT NULL,
  email TEXT,
  area TEXT NOT NULL,
  tipo_funcionario TEXT CHECK (tipo_funcionario IN ('Interno', 'Externo')),
  telefone TEXT,
  data_admissao DATE,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Férias', 'Afastado', 'Desligado')),
  cargo TEXT,
  local_trabalho TEXT,
  data_nascimento DATE,
  graduacao TEXT,
  resumo_experiencia TEXT,
  contato_responsavel_nome TEXT,
  contato_responsavel_email TEXT,
  conjuge_nome TEXT,
  conjuge_email TEXT,
  conjuge_data_nascimento DATE,
  filhos JSONB DEFAULT '[]',
  incluir_comunicados BOOLEAN DEFAULT TRUE,
  permissoes_comunicados JSONB DEFAULT '[]',
  comunicado_boas_vindas_enviado BOOLEAN DEFAULT FALSE,
  comunicado_despedida_enviado BOOLEAN DEFAULT FALSE,
  comunicados_historico JSONB DEFAULT '[]',
  senha_portal TEXT,
  senha_precisa_trocar BOOLEAN DEFAULT FALSE,
  acesso_portal_bloqueado BOOLEAN DEFAULT FALSE,
  senha_microsoft TEXT,
  senha_login_maquina TEXT,
  senhas_sistemas JSONB DEFAULT '[]',
  foto_url TEXT,
  observacoes TEXT
);

-- =============================================
-- TABELA: chamados
-- =============================================
CREATE TABLE chamados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  numero_chamado TEXT,
  tipo_solicitacao TEXT CHECK (tipo_solicitacao IN ('Sistema','Impressora','Equipamento','Melhorias','Desenvolvimento','Servidor','Outros')),
  titulo_chamado TEXT,
  sistema_tipo TEXT,
  sistema_subtipo TEXT,
  impressora_subtipo TEXT,
  equipamento_subtipo TEXT,
  equipamento_selecionado TEXT,
  equipamento_outros_detalhes TEXT,
  melhorias_detalhes TEXT,
  desenvolvimento_detalhes TEXT,
  servidor_subtipo TEXT,
  solicitante_nome TEXT,
  solicitante_email TEXT,
  solicitante_area TEXT,
  solicitante_telefone TEXT,
  equipamento_atual TEXT,
  equipamentos_usuario JSONB DEFAULT '[]',
  descricao_problema TEXT,
  anexos JSONB DEFAULT '[]',
  urgencia TEXT DEFAULT 'Média' CHECK (urgencia IN ('Baixa','Média','Alta','Urgente')),
  status TEXT DEFAULT 'Aberto' CHECK (status IN ('Aberto','Em Análise','Em Andamento','Aguardando Peça','Aguardando Avaliação','Resolvido','Cancelado')),
  data_abertura DATE,
  data_inicio_atendimento TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  responsavel TEXT,
  solucao TEXT,
  observacoes TEXT,
  tempo_resolucao_minutos NUMERIC,
  tempo_util_minutos NUMERIC,
  tempo_total_minutos NUMERIC,
  tipo_resolucao TEXT CHECK (tipo_resolucao IN ('Interno','Terceiro')),
  terceiro_envolvido BOOLEAN DEFAULT FALSE,
  terceiro_empresa TEXT,
  terceiro_numero_chamado TEXT,
  terceiro_data_abertura TIMESTAMPTZ,
  terceiro_data_resolucao TIMESTAMPTZ,
  projeto_horas_contratadas NUMERIC,
  projeto_horas_realizadas NUMERIC,
  projeto_valor_hora NUMERIC,
  projeto_envolvidos JSONB DEFAULT '[]',
  projeto_marcos JSONB DEFAULT '[]',
  projeto_aprovacoes JSONB DEFAULT '[]',
  avaliacao_tempo_resolucao NUMERIC,
  avaliacao_qualidade_atendimento NUMERIC,
  avaliacao_qualidade_solucao NUMERIC,
  avaliacao_comunicacao NUMERIC,
  avaliacao_nota_geral NUMERIC,
  avaliacao_comentario TEXT,
  avaliacao_data TIMESTAMPTZ,
  historico JSONB DEFAULT '[]',
  email_abertura_enviado BOOLEAN DEFAULT FALSE,
  email_inicio_enviado BOOLEAN DEFAULT FALSE,
  email_conclusao_enviado BOOLEAN DEFAULT FALSE,
  ultimo_email_admin_chat TIMESTAMPTZ,
  ultimo_lembrete_enviado TIMESTAMPTZ
);

-- =============================================
-- TABELA: chamados_chat
-- =============================================
CREATE TABLE chamados_chat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  chamado_id UUID REFERENCES chamados(id) ON DELETE CASCADE,
  tipo_remetente TEXT CHECK (tipo_remetente IN ('admin','solicitante')),
  remetente_nome TEXT NOT NULL,
  remetente_email TEXT,
  mensagem TEXT NOT NULL,
  anexo_url TEXT,
  anexo_nome TEXT,
  data_hora TIMESTAMPTZ
);

-- =============================================
-- TABELA: reservas_sala
-- =============================================
CREATE TABLE reservas_sala (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  solicitante_nome TEXT NOT NULL,
  solicitante_email TEXT,
  solicitante_area TEXT,
  data DATE NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fim TEXT NOT NULL,
  motivo TEXT,
  num_participantes NUMERIC,
  status TEXT DEFAULT 'Confirmada' CHECK (status IN ('Confirmada','Cancelada','Concluída')),
  observacoes TEXT
);

-- =============================================
-- TABELA: reservas
-- =============================================
CREATE TABLE reservas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  equipamento_id UUID,
  equipamento_tipo TEXT,
  equipamento_nome TEXT,
  solicitante_nome TEXT,
  solicitante_email TEXT,
  solicitante_area TEXT,
  data_inicio DATE,
  hora_inicio TEXT,
  data_fim DATE,
  hora_fim TEXT,
  motivo TEXT,
  status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente','Confirmada','Em Andamento','Concluída','Cancelada')),
  observacoes TEXT
);

-- =============================================
-- TABELA: pcs_internos
-- =============================================
CREATE TABLE pcs_internos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  data_aquisicao DATE,
  tempo_uso TEXT,
  tipo TEXT CHECK (tipo IN ('Monitor','Desktop','Notebook')),
  marca TEXT,
  nota_fiscal TEXT,
  valor NUMERIC,
  modelo TEXT,
  processador TEXT,
  etiqueta_interna TEXT,
  service_tag TEXT,
  usuario_atual TEXT,
  colaborador_id UUID,
  usuario_desde DATE,
  usuarios_anteriores JSONB DEFAULT '[]',
  historico_formatacoes JSONB DEFAULT '[]',
  area TEXT,
  office TEXT,
  antivirus TEXT DEFAULT 'Não' CHECK (antivirus IN ('Sim','Não','Não se aplica')),
  status TEXT DEFAULT 'Disponível' CHECK (status IN ('Disponível','Em uso','Manutenção','Formatação','Danificado')),
  condicao TEXT CHECK (condicao IN ('Rápido','Normal','Lento','Com Problema')),
  data_formatacao DATE,
  disponivel_para_reserva BOOLEAN DEFAULT FALSE,
  observacoes TEXT
);

-- =============================================
-- TABELA: notebooks_externos
-- =============================================
CREATE TABLE notebooks_externos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  data_aquisicao DATE,
  tempo_uso TEXT,
  tipo TEXT CHECK (tipo IN ('Notebook','Tablet')),
  marca TEXT,
  nota_fiscal TEXT,
  valor NUMERIC,
  modelo TEXT,
  processador TEXT,
  etiqueta_interna TEXT,
  service_tag TEXT,
  usuario_atual TEXT,
  colaborador_id UUID,
  usuario_desde DATE,
  usuarios_anteriores JSONB DEFAULT '[]',
  historico_formatacoes JSONB DEFAULT '[]',
  uf TEXT,
  office TEXT,
  antivirus TEXT DEFAULT 'Não' CHECK (antivirus IN ('Sim','Não','Não se aplica')),
  status TEXT DEFAULT 'Disponível' CHECK (status IN ('Disponível','Em uso','Reservado','Manutenção','Formatação','Danificado')),
  condicao TEXT CHECK (condicao IN ('Rápido','Normal','Lento','Com Problema')),
  data_formatacao DATE,
  disponivel_para_reserva BOOLEAN DEFAULT FALSE,
  observacoes TEXT
);

-- =============================================
-- TABELA: tablets
-- =============================================
CREATE TABLE tablets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  data_aquisicao DATE,
  tempo_uso TEXT,
  marca TEXT,
  nota_fiscal TEXT,
  valor NUMERIC,
  modelo TEXT,
  processador TEXT,
  etiqueta_interna TEXT,
  service_tag TEXT,
  usuario_atual TEXT,
  colaborador_id UUID,
  usuario_desde DATE,
  usuarios_anteriores JSONB DEFAULT '[]',
  historico_formatacoes JSONB DEFAULT '[]',
  uf TEXT,
  office TEXT,
  antivirus TEXT DEFAULT 'Não',
  status TEXT DEFAULT 'Disponível',
  condicao TEXT,
  data_formatacao DATE,
  disponivel_para_reserva BOOLEAN DEFAULT FALSE,
  observacoes TEXT
);

-- =============================================
-- TABELA: smartphones
-- =============================================
CREATE TABLE smartphones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  data_aquisicao DATE,
  uso_anos NUMERIC,
  operadora TEXT,
  linha_celular TEXT,
  quantidade NUMERIC,
  marca TEXT,
  nota_fiscal TEXT,
  fornecedor TEXT,
  valor NUMERIC,
  modelo TEXT,
  cor TEXT,
  imei TEXT,
  usuario_atual TEXT,
  colaborador_id UUID,
  usuario_desde DATE,
  area TEXT,
  usuarios_anteriores JSONB DEFAULT '[]',
  status TEXT DEFAULT 'Disponível',
  condicao TEXT,
  observacoes TEXT
);

-- =============================================
-- TABELA: cameras
-- =============================================
CREATE TABLE cameras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  numero_sequencial TEXT,
  data_aquisicao DATE,
  marca TEXT,
  nota_fiscal TEXT,
  fornecedor TEXT,
  valor NUMERIC,
  modelo TEXT,
  etiqueta_interna TEXT,
  service_tag TEXT,
  usuario_atual TEXT,
  colaborador_id UUID,
  usuario_desde DATE,
  usuarios_anteriores JSONB DEFAULT '[]',
  area TEXT,
  status TEXT DEFAULT 'Disponível',
  condicao TEXT,
  observacoes TEXT
);

-- =============================================
-- TABELA: coletores
-- =============================================
CREATE TABLE coletores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  numero_sequencial TEXT,
  data_aquisicao DATE,
  tipo TEXT,
  marca TEXT,
  nota_fiscal TEXT,
  fornecedor TEXT,
  valor NUMERIC,
  modelo TEXT,
  etiqueta_interna TEXT,
  service_tag TEXT,
  usuario_atual TEXT,
  colaborador_id UUID,
  usuario_desde DATE,
  usuarios_anteriores JSONB DEFAULT '[]',
  area TEXT,
  status TEXT DEFAULT 'Disponível',
  condicao TEXT,
  observacoes TEXT
);

-- =============================================
-- TABELA: canetas_vibracao
-- =============================================
CREATE TABLE canetas_vibracao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  numero_sequencial TEXT,
  data_aquisicao DATE,
  tipo TEXT,
  marca TEXT,
  nota_fiscal TEXT,
  fornecedor TEXT,
  modelo TEXT,
  etiqueta_interna TEXT,
  service_tag TEXT,
  usuario_atual TEXT,
  usuario_desde DATE,
  usuarios_anteriores JSONB DEFAULT '[]',
  area TEXT,
  status TEXT DEFAULT 'Disponível',
  condicao TEXT,
  observacoes TEXT
);

-- =============================================
-- TABELA: avaliacoes
-- =============================================
CREATE TABLE avaliacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  equipamento_id UUID NOT NULL,
  equipamento_tipo TEXT NOT NULL,
  equipamento_nome TEXT,
  usuario_equipamento TEXT,
  numero_avaliacao NUMERIC,
  memoria_ram TEXT,
  tipo_armazenamento TEXT,
  espaco_disco TEXT,
  versao_windows TEXT,
  antivirus TEXT,
  desempenho TEXT,
  problemas JSONB DEFAULT '[]',
  atende_trabalho TEXT,
  recomendacao_usuario TEXT,
  satisfacao TEXT,
  tempo_uso_anos NUMERIC,
  pontuacao_total NUMERIC,
  classificacao TEXT CHECK (classificacao IN ('Manter','Upgrade','Substituir')),
  data_avaliacao TIMESTAMPTZ,
  avaliador TEXT
);

-- =============================================
-- TABELA: ramais
-- =============================================
CREATE TABLE ramais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  ramal TEXT NOT NULL,
  usuario_atual TEXT,
  area TEXT,
  data_atribuicao DATE,
  usuarios_anteriores JSONB DEFAULT '[]',
  status TEXT DEFAULT 'Disponível' CHECK (status IN ('Disponível','Em uso')),
  observacoes TEXT
);

-- =============================================
-- TABELA: fila_emails
-- =============================================
CREATE TABLE fila_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  destinatario TEXT NOT NULL,
  assunto TEXT NOT NULL,
  corpo_html TEXT NOT NULL,
  tipo_evento TEXT CHECK (tipo_evento IN ('chamado_aberto','atendimento_iniciado','observacao_adicionada','chamado_concluido','notificacao_geral')),
  referencia_id UUID,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','erro')),
  tentativas NUMERIC DEFAULT 0,
  mensagem_erro TEXT,
  data_criacao TIMESTAMPTZ,
  data_envio TIMESTAMPTZ
);

-- =============================================
-- TABELA: comunicados_artes
-- =============================================
CREATE TABLE comunicados_artes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  colaborador_id UUID,
  colaborador_nome TEXT,
  tipo_comunicado TEXT CHECK (tipo_comunicado IN ('aniversario_colaborador','aniversario_conjuge','aniversario_filho_1ano','tempo_empresa','despedida')),
  data_evento DATE,
  descricao_evento TEXT,
  imagem_url TEXT,
  status_arte TEXT DEFAULT 'sem_arte' CHECK (status_arte IN ('sem_arte','arte_carregada','enviado','erro_envio')),
  criado_por TEXT,
  observacoes TEXT,
  ano_referencia NUMERIC,
  anos_empresa NUMERIC,
  filho_nome TEXT,
  data_envio TIMESTAMPTZ
);

-- =============================================
-- TABELA: comunicados_log
-- =============================================
CREATE TABLE comunicados_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  tipo_comunicado TEXT NOT NULL,
  colaborador_nome TEXT,
  colaborador_id UUID,
  destinatarios JSONB DEFAULT '[]',
  assunto_enviado TEXT,
  data_envio TIMESTAMPTZ,
  status TEXT CHECK (status IN ('enviado','erro','sem_arte','sem_destinatario')),
  detalhe_erro TEXT,
  demanda_id UUID
);

-- =============================================
-- TABELA: comunicados_config
-- =============================================
CREATE TABLE comunicados_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  tipo_comunicado TEXT NOT NULL UNIQUE,
  label TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  horario_envio TEXT,
  assunto_template TEXT,
  destinatarios_tipo TEXT CHECK (destinatarios_tipo IN ('todos_colaboradores','colaborador_conjuge_gestor','colaborador_e_gestor','manual')),
  destinatarios_adicionais JSONB DEFAULT '[]',
  cc_emails JSONB DEFAULT '[]'
);

-- =============================================
-- TABELA: profiles (substitui User da Base44)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),

  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin','user','comunicados_arte','comunicados_gestao','comunicados_dp'))
);

-- =============================================
-- TRIGGER: updated_date automático
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'colaboradores','chamados','chamados_chat','reservas_sala','reservas',
    'pcs_internos','notebooks_externos','tablets','smartphones','cameras',
    'coletores','canetas_vibracao','avaliacoes','ramais','fila_emails',
    'comunicados_artes','comunicados_log','comunicados_config','profiles'
  ] LOOP
    EXECUTE format('
      CREATE TRIGGER trg_%s_updated
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_date();
    ', t, t);
  END LOOP;
END $$;

-- =============================================
-- TRIGGER: criar profile automaticamente ao registrar usuário
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- RLS (Row Level Security)
-- =============================================
-- Habilitar RLS em todas as tabelas
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamados_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas_sala ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcs_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks_externos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tablets ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartphones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE coletores ENABLE ROW LEVEL SECURITY;
ALTER TABLE canetas_vibracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ramais ENABLE ROW LEVEL SECURITY;
ALTER TABLE fila_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicados_artes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicados_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicados_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies: admin e user têm acesso total via service_role (API Routes)
-- Frontend usa anon key apenas para leitura pública quando necessário
-- Para simplificar: deixar tudo acessível via service_role (usado nas API Routes)
CREATE POLICY "service_role_all" ON colaboradores FOR ALL USING (true);
CREATE POLICY "service_role_all" ON chamados FOR ALL USING (true);
CREATE POLICY "service_role_all" ON chamados_chat FOR ALL USING (true);
CREATE POLICY "service_role_all" ON reservas_sala FOR ALL USING (true);
CREATE POLICY "service_role_all" ON reservas FOR ALL USING (true);
CREATE POLICY "service_role_all" ON pcs_internos FOR ALL USING (true);
CREATE POLICY "service_role_all" ON notebooks_externos FOR ALL USING (true);
CREATE POLICY "service_role_all" ON tablets FOR ALL USING (true);
CREATE POLICY "service_role_all" ON smartphones FOR ALL USING (true);
CREATE POLICY "service_role_all" ON cameras FOR ALL USING (true);
CREATE POLICY "service_role_all" ON coletores FOR ALL USING (true);
CREATE POLICY "service_role_all" ON canetas_vibracao FOR ALL USING (true);
CREATE POLICY "service_role_all" ON avaliacoes FOR ALL USING (true);
CREATE POLICY "service_role_all" ON ramais FOR ALL USING (true);
CREATE POLICY "service_role_all" ON fila_emails FOR ALL USING (true);
CREATE POLICY "service_role_all" ON comunicados_artes FOR ALL USING (true);
CREATE POLICY "service_role_all" ON comunicados_log FOR ALL USING (true);
CREATE POLICY "service_role_all" ON comunicados_config FOR ALL USING (true);
CREATE POLICY "service_role_all" ON profiles FOR ALL USING (true);
```

---

## PARTE 2 — VARIÁVEIS DE AMBIENTE

### 2.1 — Arquivo `.env.local` (desenvolvimento local)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...sua_anon_key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...sua_service_role_key...

# Email — Chamados (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Email — Comunicados (Gmail/Nodemailer)
GMAIL_USER=comunicados@suaempresa.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# OpenAI (substitui Base44 InvokeLLM)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=https://seudominio.com.br
```

### 2.2 — Variáveis na Vercel (Dashboard → Settings → Environment Variables)
Adicionar as mesmas variáveis acima na Vercel em:
`https://vercel.com/seu-usuario/seu-projeto/settings/environment-variables`

---

## PARTE 3 — ESTRUTURA DO PROJETO (Vite → Next.js ou Vite puro)

### Opção A: Manter Vite (mais simples, menos refatoração)
- Deploy na Vercel funciona com Vite diretamente
- API Routes viram funções em `/api` via Vercel Serverless Functions
- Recomendado para minimizar refatoração

### Opção B: Migrar para Next.js (mais recursos, mais trabalho)
- App Router com Server Components
- API Routes nativas
- Maior esforço de migração

**Recomendação: Opção A (Vite + Vercel)**

### 3.1 — Estrutura de pastas com Vite + Vercel
```
techcontrol/
├── src/
│   ├── pages/           ← suas páginas React (já existem)
│   ├── components/      ← seus componentes (já existem)
│   ├── entities/        ← schemas JSON (manter para referência)
│   ├── lib/
│   │   ├── supabase.js  ← NOVO: cliente Supabase
│   │   └── ...
│   ├── api/
│   │   └── base44Client.js  ← será substituído
├── api/                 ← NOVO: Vercel Serverless Functions (substitui functions/)
│   ├── sendEmailTicketCreated.js
│   ├── sendEmailTicketStarted.js
│   ├── sendEmailTicketClosed.js
│   ├── sendEmailChatMessage.js
│   ├── lembreteAvaliacao.js
│   ├── enviarAniversariosColaboradores.js
│   ├── enviarAniversarioConjuge.js
│   ├── enviarAniversarioFilho1Ano.js
│   ├── enviarAniversarioTempoEmpresa.js
│   ├── enviarBoasVindas.js
│   ├── enviarDespedida.js
│   ├── gerarDemandasComunicados.js
│   └── listarUsuarios.js
├── vercel.json          ← NOVO: crons + configurações
├── .env.local
└── package.json
```

---

## PARTE 4 — CLIENTE SUPABASE (substitui base44Client.js)

### 4.1 — `src/lib/supabase.js`
```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Service role para operações admin (usar apenas em API Routes/backend)
// NÃO usar no frontend
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);
```

> **ATENÇÃO:** No Vite, as variáveis públicas usam prefixo `VITE_` (não `NEXT_PUBLIC_`).
> `.env.local`:
> ```
> VITE_SUPABASE_URL=...
> VITE_SUPABASE_ANON_KEY=...
> ```
> A `SERVICE_ROLE_KEY` NÃO deve ter prefixo `VITE_` — usada apenas em API Routes.

---

## PARTE 5 — MAPEAMENTO DE CHAMADAS API (Base44 → Supabase)

### 5.1 — Tabela de equivalência completa

| Base44 | Supabase |
|--------|----------|
| `base44.entities.X.list()` | `supabase.from('x').select('*')` |
| `base44.entities.X.list('-created_date', 50)` | `supabase.from('x').select('*').order('created_date', { ascending: false }).limit(50)` |
| `base44.entities.X.filter({status: 'Ativo'})` | `supabase.from('x').select('*').eq('status', 'Ativo')` |
| `base44.entities.X.filter({a: 1, b: 2})` | `supabase.from('x').select('*').eq('a', 1).eq('b', 2)` |
| `base44.entities.X.get(id)` | `supabase.from('x').select('*').eq('id', id).single()` |
| `base44.entities.X.create(data)` | `supabase.from('x').insert(data).select().single()` |
| `base44.entities.X.update(id, data)` | `supabase.from('x').update(data).eq('id', id).select().single()` |
| `base44.entities.X.delete(id)` | `supabase.from('x').delete().eq('id', id)` |
| `base44.entities.X.bulkCreate([...])` | `supabase.from('x').insert([...]).select()` |
| `base44.auth.me()` | `supabase.auth.getUser()` → depois `supabase.from('profiles').select('*').eq('id', user.id).single()` |
| `base44.auth.logout()` | `supabase.auth.signOut()` |
| `base44.auth.redirectToLogin()` | `window.location.href = '/login'` |
| `base44.auth.updateMe(data)` | `supabase.from('profiles').update(data).eq('id', user.id)` |
| `base44.auth.isAuthenticated()` | `supabase.auth.getSession()` → verificar `session !== null` |
| `base44.integrations.Core.UploadFile({file})` | `supabase.storage.from('uploads').upload(path, file)` → depois `supabase.storage.from('uploads').getPublicUrl(path)` |
| `base44.integrations.Core.InvokeLLM({prompt})` | `fetch('https://api.openai.com/v1/chat/completions', {...})` |
| `base44.functions.invoke('fn', payload)` | `fetch('/api/fn', { method: 'POST', body: JSON.stringify(payload) })` |
| `base44.entities.X.subscribe(cb)` | `supabase.channel('x').on('postgres_changes', {event: '*', schema: 'public', table: 'x'}, cb).subscribe()` |

### 5.2 — Hook `useCurrentUser` (substitui base44.auth.me())
```js
// src/hooks/useCurrentUser.js
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser({ ...session.user, ...profile });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser({ ...session.user, ...profile });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

---

## PARTE 6 — API ROUTES (substitui Deno Functions)

### 6.1 — Template base para cada API Route (Vercel Node.js)
```js
// api/exemplo.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar autenticação via Bearer token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Buscar perfil para verificar role
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();

  // Sua lógica aqui...
  return res.status(200).json({ ok: true });
}
```

### 6.2 — Como chamar API Routes do frontend
```js
// Substituir: await base44.functions.invoke('minhaFuncao', payload)
// Por:
const { data: session } = await supabase.auth.getSession();
const response = await fetch('/api/minhaFuncao', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.session?.access_token}`
  },
  body: JSON.stringify(payload)
});
const result = await response.json();
```

---

## PARTE 7 — AUTOMAÇÕES (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/enviarAniversariosColaboradores",
      "schedule": "0 13 * * *"
    },
    {
      "path": "/api/enviarAniversarioConjuge",
      "schedule": "0 13 * * *"
    },
    {
      "path": "/api/enviarAniversarioFilho1Ano",
      "schedule": "0 13 * * *"
    },
    {
      "path": "/api/enviarAniversarioTempoEmpresa",
      "schedule": "0 13 * * *"
    },
    {
      "path": "/api/gerarDemandasComunicados",
      "schedule": "0 9 1 * *"
    },
    {
      "path": "/api/lembreteAvaliacao",
      "schedule": "0 */12 * * *"
    }
  ]
}
```

> **Nota:** Horários em UTC. 13:00 UTC = 10:00 BRT (América/São_Paulo).

### Entity Trigger (email ao abrir chamado)
Na Base44 isso é uma "Entity Automation". No Supabase, criar um **Database Webhook**:
- Supabase Dashboard → Database → Webhooks → Create Webhook
- Tabela: `chamados` | Evento: `INSERT`
- URL: `https://seudominio.com.br/api/sendEmailTicketCreated`
- Headers: `{ "x-webhook-secret": "SEU_SECRET" }`

---

## PARTE 8 — UPLOAD DE ARQUIVOS (Supabase Storage)

### 8.1 — Criar bucket no Supabase
- Supabase Dashboard → Storage → New Bucket
- Nome: `uploads`
- Public: **Sim** (para URLs diretas nas imagens)

### 8.2 — Código de upload
```js
// Substituir: const { file_url } = await base44.integrations.Core.UploadFile({ file })
// Por:
async function uploadFile(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  const filePath = `public/${fileName}`;

  const { error } = await supabase.storage.from('uploads').upload(filePath, file);
  if (error) throw error;

  const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
  return data.publicUrl; // equivalente ao file_url da Base44
}
```

---

## PARTE 9 — AUTENTICAÇÃO (substitui Base44 Auth)

### 9.1 — Supabase Auth
- Supabase gerencia login/logout/sessão
- Tabela `profiles` armazena `role` e dados extras
- Login via email/senha (mesmo fluxo atual)

### 9.2 — Criar usuários admin no Supabase
```sql
-- Após criar usuário via Supabase Auth Dashboard ou API, definir role:
UPDATE profiles SET role = 'admin' WHERE email = 'seu@email.com';
```

### 9.3 — Portal do Colaborador
O portal usa **sessionStorage customizado** (não Base44 Auth). Essa lógica pode permanecer igual, apenas trocando as chamadas de banco para Supabase.

---

## PARTE 10 — DOMÍNIO (Ionos → Vercel)

### 10.1 — Passos no painel Ionos
1. Acessar: https://www.ionos.com → Meus Domínios → Gerenciar DNS
2. Remover registros A e CNAME existentes que apontam para Base44
3. Adicionar novo registro:
   - Tipo: `CNAME`
   - Host: `@` (ou `www`)
   - Valor: `cname.vercel-dns.com`
   - TTL: 3600
4. Se quiser `www` e raiz:
   - `A` record: `76.76.19.19` (IP da Vercel para apex domain)
   - `CNAME` record: `www` → `cname.vercel-dns.com`

### 10.2 — Passos na Vercel
1. Vercel Dashboard → seu projeto → Settings → Domains
2. Add Domain → digitar seu domínio (ex: `techcontrol.com.br`)
3. Vercel vai detectar automaticamente e emitir SSL (Let's Encrypt)
4. Aguardar propagação DNS: 15min a 48h

---

## PARTE 11 — RESEND (manter configuração)

### 11.1 — O que muda
- A integração Resend para chamados (helpdesk) permanece igual
- Apenas trocar o import do SDK Base44 por chamada direta

### 11.2 — Código atualizado para API Routes
```js
// api/sendEmailTicketCreated.js
import { Resend } from 'resend'; // npm install resend

const resend = new Resend(process.env.RESEND_API_KEY);

// No corpo da função:
await resend.emails.send({
  from: 'TechControl <suporte@techcontrol.site>',
  to: destinatario,
  subject: assunto,
  html: htmlContent
});
```

### 11.3 — Domínio Resend
- O domínio `techcontrol.site` já está verificado no Resend
- Ao migrar DNS da Ionos, **não remover** os registros TXT/MX do Resend (são para verificação de domínio de email, diferentes dos registros de site)
- Registros a manter na Ionos:
  - `TXT` records de verificação Resend (`resend._domainkey`, SPF, DMARC)

---

## PARTE 12 — PACKAGE.JSON (dependências a adicionar)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "resend": "^3.2.0",
    "nodemailer": "^6.9.0",
    "openai": "^4.20.0"
  }
}
```

```bash
npm install @supabase/supabase-js resend nodemailer openai
```

---

## PARTE 13 — CHECKLIST DE MIGRAÇÃO

### Fase 1 — Preparação
- [ ] Exportar código via GitHub Sync (Base44 Dashboard → Settings)
- [ ] Exportar dados do banco (Base44 Dashboard → Export Data → JSON)
- [ ] Anotar todos os usuários admin e seus roles
- [ ] Copiar variáveis de ambiente atuais

### Fase 2 — Supabase
- [ ] Criar projeto Supabase
- [ ] Executar SQL das 19 tabelas (Parte 1 acima)
- [ ] Criar bucket `uploads` no Storage
- [ ] Importar dados exportados da Base44
- [ ] Criar usuários no Supabase Auth e definir roles

### Fase 3 — Código
- [ ] `npm install @supabase/supabase-js`
- [ ] Criar `src/lib/supabase.js`
- [ ] Criar `src/hooks/useCurrentUser.js`
- [ ] Substituir todas as chamadas `base44.entities.*` (usar tabela Parte 5)
- [ ] Substituir `base44.auth.*`
- [ ] Substituir `base44.integrations.Core.UploadFile`
- [ ] Substituir `base44.integrations.Core.InvokeLLM` (OpenAI)
- [ ] Substituir `base44.functions.invoke()` por `fetch('/api/...')`
- [ ] Reescrever todas as funções em `/api/*.js` (Vercel format)
- [ ] Criar `vercel.json` com crons

### Fase 4 — Deploy
- [ ] Push para GitHub
- [ ] Conectar repositório na Vercel
- [ ] Configurar variáveis de ambiente na Vercel
- [ ] Criar Supabase Database Webhook para trigger de chamados
- [ ] Deploy e testar

### Fase 5 — Domínio
- [ ] Alterar DNS na Ionos (manter registros Resend/email)
- [ ] Adicionar domínio na Vercel
- [ ] Aguardar SSL e propagação DNS
- [ ] Testar domínio final

---

## ORDEM RECOMENDADA PARA O CLAUDE NO VSCODE

1. Instalar dependências (`@supabase/supabase-js`, etc.)
2. Criar `src/lib/supabase.js` e `src/hooks/useCurrentUser.js`
3. Substituir `src/api/base44Client.js` por wrapper Supabase
4. Migrar páginas uma a uma (começar pelas mais simples: Ramais, Cameras, etc.)
5. Migrar componentes de comunicados
6. Migrar auth (Layout.jsx, portal-login.jsx)
7. Reescrever funções backend em `/api/`
8. Configurar `vercel.json`
9. Testar localmente com `vercel dev`
10. Deploy

---

*Este documento foi gerado automaticamente pelo TechControl em 29/04/2026.*
*Versão do sistema na época da migração: 2.5.0*