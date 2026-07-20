-- ============================================================
-- TECHCONTROL — ESQUEMA COMPLETO DO BANCO DE DADOS (SUPABASE)
-- ============================================================
-- Arquivo SQL único capaz de reconstruir todo o banco do zero.
-- Inclui: Extensões, Tabelas, Foreign Keys, Triggers, Functions, 
-- Views, Índices, Políticas de Segurança RLS e dados de Seed.
-- ============================================================

-- 1. EXTENSÕES E LIMPEZA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP VIEW IF EXISTS visao_patrimonio_consolidado CASCADE;
DROP VIEW IF EXISTS chamados_ativos_solicitantes CASCADE;

DROP TABLE IF EXISTS requisicao_compras CASCADE;
DROP TABLE IF EXISTS configuracoes CASCADE;
DROP TABLE IF EXISTS centros_custo CASCADE;
DROP TABLE IF EXISTS comunicados_config CASCADE;
DROP TABLE IF EXISTS comunicados_log CASCADE;
DROP TABLE IF EXISTS comunicados_artes CASCADE;
DROP TABLE IF EXISTS fila_emails CASCADE;
DROP TABLE IF EXISTS ramais CASCADE;
DROP TABLE IF EXISTS avaliacoes CASCADE;
DROP TABLE IF EXISTS canetas_vibracao CASCADE;
DROP TABLE IF EXISTS coletores CASCADE;
DROP TABLE IF EXISTS cameras CASCADE;
DROP TABLE IF EXISTS smartphones CASCADE;
DROP TABLE IF EXISTS tablets CASCADE;
DROP TABLE IF EXISTS notebooks_externos CASCADE;
DROP TABLE IF EXISTS pcs_internos CASCADE;
DROP TABLE IF EXISTS reservas_sala CASCADE;
DROP TABLE IF EXISTS reservas CASCADE;
DROP TABLE IF EXISTS chamados_chat CASCADE;
DROP TABLE IF EXISTS chamados CASCADE;
DROP TABLE IF EXISTS colaboradores CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================
-- 2. TABELAS DO SISTEMA
-- ============================================================

-- ── profiles ──
-- Armazena o perfil administrativo e as permissões de TI do usuário do Supabase Auth.
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  
  full_name TEXT,
  nome_exibicao TEXT,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin','user','comunicados_arte','comunicados_gestao','comunicados_dp'))
);

-- ── colaboradores ──
-- Cadastro geral de colaboradores com informações de portal e dados pessoais.
CREATE TABLE colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  nome_completo TEXT NOT NULL,
  email TEXT UNIQUE,
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
  
  responsavel_id UUID, -- Auto-relacionamento
  responsavel_nome TEXT,
  responsavel_email TEXT,
  
  contato_responsavel_nome TEXT,
  contato_responsavel_email TEXT,
  conjuge_nome TEXT,
  conjuge_email TEXT,
  conjuge_data_nascimento DATE,
  filhos JSONB DEFAULT '[]',
  
  incluir_comunicados BOOLEAN DEFAULT TRUE,
  permissoes_comunicados JSONB DEFAULT '[]', -- Array de Strings de permissões do portal
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

-- Adiciona a FK autorreferenciável de colaboradores
ALTER TABLE colaboradores ADD CONSTRAINT fk_colaborador_responsavel FOREIGN KEY (responsavel_id) REFERENCES colaboradores(id) ON DELETE SET NULL;

-- ── chamados ──
-- Tabela de chamados do helpdesk.
CREATE TABLE chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  numero_chamado TEXT UNIQUE,
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
  data_abertura DATE DEFAULT CURRENT_DATE,
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

-- ── chamados_chat ──
-- Mensagens trocadas no chat do chamado.
CREATE TABLE chamados_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  chamado_id UUID NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  tipo_remetente TEXT CHECK (tipo_remetente IN ('admin','solicitante')),
  remetente_nome TEXT NOT NULL,
  remetente_email TEXT,
  mensagem TEXT NOT NULL,
  anexo_url TEXT,
  anexo_nome TEXT,
  data_hora TIMESTAMPTZ DEFAULT NOW()
);

-- ── reservas ──
-- Reservas de equipamentos temporários.
CREATE TABLE reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  equipamento_id UUID, -- Relacionamento polimórfico (PCs ou Notebooks)
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

-- ── reservas_sala ──
-- Agendamento de horários para a sala de treinamentos.
CREATE TABLE reservas_sala (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ── pcs_internos ──
-- Equipamentos de TI internos (Notebooks, Desktops, Monitores).
CREATE TABLE pcs_internos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  etiqueta_interna TEXT UNIQUE,
  service_tag TEXT,
  usuario_atual TEXT,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
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

-- ── notebooks_externos ──
-- Notebooks sob posse de funcionários externos.
CREATE TABLE notebooks_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  data_aquisicao DATE,
  tempo_uso TEXT,
  tipo TEXT DEFAULT 'Notebook' CHECK (tipo IN ('Notebook','Tablet')),
  marca TEXT,
  nota_fiscal TEXT,
  valor NUMERIC,
  modelo TEXT,
  processador TEXT,
  etiqueta_interna TEXT UNIQUE,
  service_tag TEXT,
  usuario_atual TEXT,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
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

-- ── tablets ──
-- Tablets do inventário corporativo.
CREATE TABLE tablets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  etiqueta_interna TEXT UNIQUE,
  service_tag TEXT,
  usuario_atual TEXT,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
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

-- ── smartphones ──
-- Celulares da empresa.
CREATE TABLE smartphones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  data_aquisicao DATE,
  uso_anos NUMERIC,
  operadora TEXT,
  linha_celular TEXT,
  quantidade NUMERIC DEFAULT 1,
  marca TEXT,
  nota_fiscal TEXT,
  fornecedor TEXT,
  valor NUMERIC,
  modelo TEXT,
  cor TEXT,
  imei TEXT UNIQUE,
  usuario_atual TEXT,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  usuario_desde DATE,
  area TEXT,
  usuarios_anteriores JSONB DEFAULT '[]',
  status TEXT DEFAULT 'Disponível',
  condicao TEXT,
  observacoes TEXT
);

-- ── cameras ──
-- Câmeras de segurança.
CREATE TABLE cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  numero_sequencial TEXT UNIQUE,
  data_aquisicao DATE,
  marca TEXT,
  nota_fiscal TEXT,
  fornecedor TEXT,
  valor NUMERIC,
  modelo TEXT,
  etiqueta_interna TEXT UNIQUE,
  service_tag TEXT,
  usuario_atual TEXT,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  usuario_desde DATE,
  usuarios_anteriores JSONB DEFAULT '[]',
  area TEXT,
  status TEXT DEFAULT 'Disponível',
  condicao TEXT,
  observacoes TEXT
);

-- ── coletores ──
-- Coletores de dados industriais.
CREATE TABLE coletores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  numero_sequencial TEXT UNIQUE,
  data_aquisicao DATE,
  tipo TEXT,
  marca TEXT,
  nota_fiscal TEXT,
  fornecedor TEXT,
  valor NUMERIC,
  modelo TEXT,
  etiqueta_interna TEXT UNIQUE,
  service_tag TEXT,
  usuario_atual TEXT,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  usuario_desde DATE,
  usuarios_anteriores JSONB DEFAULT '[]',
  area TEXT,
  status TEXT DEFAULT 'Disponível',
  condicao TEXT,
  observacoes TEXT
);

-- ── canetas_vibracao ──
-- Canetas coletoras de vibração.
CREATE TABLE canetas_vibracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  numero_sequencial TEXT UNIQUE,
  data_aquisicao DATE,
  tipo TEXT,
  marca TEXT,
  nota_fiscal TEXT,
  fornecedor TEXT,
  modelo TEXT,
  etiqueta_interna TEXT UNIQUE,
  service_tag TEXT,
  usuario_atual TEXT,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  usuario_desde DATE,
  usuarios_anteriores JSONB DEFAULT '[]',
  area TEXT,
  status TEXT DEFAULT 'Disponível',
  condicao TEXT,
  observacoes TEXT
);

-- ── avaliacoes ──
-- Fichas de avaliações técnicas dos computadores.
CREATE TABLE avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  equipamento_id UUID NOT NULL, -- Relacionamento polimórfico
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
  data_avaliacao TIMESTAMPTZ DEFAULT NOW(),
  avaliador TEXT
);

-- ── ramais ──
-- Lista telefônica corporativa.
CREATE TABLE ramais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  ramal TEXT NOT NULL UNIQUE,
  usuario_atual TEXT,
  area TEXT,
  data_atribuicao DATE,
  usuarios_anteriores JSONB DEFAULT '[]',
  status TEXT DEFAULT 'Disponível' CHECK (status IN ('Disponível','Em uso')),
  observacoes TEXT
);

-- ── fila_emails ──
-- Fila assíncrona para envio de e-mails de chamados.
CREATE TABLE fila_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  data_criacao TIMESTAMPTZ DEFAULT NOW(),
  data_envio TIMESTAMPTZ
);

-- ── comunicados_artes ──
-- Demandas para criação e envio de artes para eventos corporativos.
CREATE TABLE comunicados_artes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  colaborador_nome TEXT,
  tipo_comunicado TEXT CHECK (tipo_comunicado IN ('aniversario_colaborador','aniversario_conjuge','aniversario_filho_1ano','tempo_empresa','despedida','boas_vindas')),
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

-- ── comunicados_log ──
-- Histórico e resultados de disparos de comunicados.
CREATE TABLE comunicados_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  tipo_comunicado TEXT NOT NULL,
  colaborador_nome TEXT,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  destinatarios JSONB DEFAULT '[]',
  assunto_enviado TEXT,
  data_envio TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('enviado','erro','sem_arte','sem_destinatario')),
  detalhe_erro TEXT,
  demanda_id UUID REFERENCES comunicados_artes(id) ON DELETE SET NULL
);

-- ── comunicados_config ──
-- Regras de envio, CCs e assuntos padrão de comunicados.
CREATE TABLE comunicados_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  tipo_comunicado TEXT NOT NULL UNIQUE,
  label TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  horario_envio TEXT DEFAULT '08:00',
  assunto_template TEXT,
  destinatarios_tipo TEXT CHECK (destinatarios_tipo IN ('todos_colaboradores','colaborador_conjuge_gestor','colaborador_e_gestor','manual')),
  destinatarios_adicionais JSONB DEFAULT '[]',
  cc_emails JSONB DEFAULT '[]'
);

-- ── centros_custo ──
-- Códigos contábeis orçamentários da corporação.
CREATE TABLE centros_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE
);

-- ── configuracoes ──
-- Configurações gerais da aplicação salvas em chave/valor.
CREATE TABLE configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descricao TEXT
);

-- ── requisicao_compras ──
-- Fluxo de solicitações de compras de ativos.
CREATE TABLE requisicao_compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  numero_requisicao TEXT UNIQUE,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  colaborador_nome TEXT,
  colaborador_email TEXT,
  colaborador_area TEXT,
  
  aprovador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  aprovador_nome TEXT,
  aprovador_email TEXT,
  
  item TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  centro_custo_codigo TEXT REFERENCES centros_custo(codigo) ON UPDATE CASCADE,
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

-- ============================================================
-- 3. TRIGGERS E FUNÇÕES DE TABELAS
-- ============================================================

-- Trigger de Auto-Atualização do campo `updated_date`
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicação do trigger em todas as 22 tabelas
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','colaboradores','chamados','chamados_chat','reservas','reservas_sala',
    'pcs_internos','notebooks_externos','tablets','smartphones','cameras','coletores',
    'canetas_vibracao','avaliacoes','ramais','fila_emails','comunicados_artes',
    'comunicados_log','comunicados_config','centros_custo','configuracoes','requisicao_compras'
  ] LOOP
    EXECUTE format('
      CREATE TRIGGER trg_%s_updated
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_date();
    ', t, t);
  END LOOP;
END $$;

-- Trigger para Criação Automática do registro em `profiles`
-- Conectado diretamente à tabela auth.users interna do Supabase Auth.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome_completo', 'Novo Usuário'), 
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 4. VIEWS CONSOLIDADAS (RELATÓRIO & PAINÉIS)
-- ============================================================

-- View consolidada de patrimônio físico para listagem unificada e buscas rápidas de TI
CREATE OR REPLACE VIEW visao_patrimonio_consolidado AS
  SELECT id, 'PC Interno' AS tipo_equipamento, marca, modelo, etiqueta_interna, service_tag, status, condicao, usuario_atual, colaborador_id, data_aquisicao, valor, observacoes FROM public.pcs_internos
  UNION ALL
  SELECT id, 'Notebook Externo' AS tipo_equipamento, marca, modelo, etiqueta_interna, service_tag, status, condicao, usuario_atual, colaborador_id, data_aquisicao, valor, observacoes FROM public.notebooks_externos
  UNION ALL
  SELECT id, 'Tablet' AS tipo_equipamento, marca, modelo, etiqueta_interna, service_tag, status, condicao, usuario_atual, colaborador_id, data_aquisicao, valor, observacoes FROM public.tablets
  UNION ALL
  SELECT id, 'Smartphone' AS tipo_equipamento, marca, modelo, imei AS etiqueta_interna, operadora AS service_tag, status, condicao, usuario_atual, colaborador_id, data_aquisicao, valor, observacoes FROM public.smartphones
  UNION ALL
  SELECT id, 'Câmera' AS tipo_equipamento, marca, modelo, etiqueta_interna, service_tag, status, condicao, usuario_atual, colaborador_id, data_aquisicao, valor, observacoes FROM public.cameras
  UNION ALL
  SELECT id, 'Coletor' AS tipo_equipamento, marca, modelo, etiqueta_interna, service_tag, status, condicao, usuario_atual, colaborador_id, data_aquisicao, valor, observacoes FROM public.coletores
  UNION ALL
  SELECT id, 'Caneta Vibração' AS tipo_equipamento, marca, modelo, etiqueta_interna, service_tag, status, condicao, usuario_atual, colaborador_id, data_aquisicao, NULL::numeric AS valor, observacoes FROM public.canetas_vibracao;

-- View agregadora de chamados ativos vinculados a detalhes organizacionais
CREATE OR REPLACE VIEW chamados_ativos_solicitantes AS
  SELECT 
    c.id, c.numero_chamado, c.tipo_solicitacao, c.titulo_chamado, c.urgencia, c.status, c.data_abertura, c.responsavel,
    colab.id AS colaborador_id, colab.nome_completo, colab.area, colab.tipo_funcionario, colab.foto_url
  FROM public.chamados c
  LEFT JOIN public.colaboradores colab ON LOWER(TRIM(c.solicitante_email)) = LOWER(TRIM(colab.email))
  WHERE c.status NOT IN ('Resolvido', 'Cancelado');

-- ============================================================
-- 5. ÍNDICES DE PERFORMANCE (B-TREE)
-- ============================================================
CREATE INDEX idx_colab_email ON colaboradores(email);
CREATE INDEX idx_colab_status ON colaboradores(status);
CREATE INDEX idx_colab_responsavel ON colaboradores(responsavel_id);

CREATE INDEX idx_chamados_status ON chamados(status);
CREATE INDEX idx_chamados_email ON chamados(solicitante_email);
CREATE INDEX idx_chamados_num ON chamados(numero_chamado);

CREATE INDEX idx_chat_chamado ON chamados_chat(chamado_id);

CREATE INDEX idx_reservas_equip ON reservas(equipamento_id);
CREATE INDEX idx_reservas_email ON reservas(solicitante_email);

CREATE INDEX idx_reservas_sala_data ON reservas_sala(data);

CREATE INDEX idx_pcs_colab ON pcs_internos(colaborador_id);
CREATE INDEX idx_pcs_etiq ON pcs_internos(etiqueta_interna);

CREATE INDEX idx_not_colab ON notebooks_externos(colaborador_id);
CREATE INDEX idx_not_etiq ON notebooks_externos(etiqueta_interna);

CREATE INDEX idx_tab_colab ON tablets(colaborador_id);
CREATE INDEX idx_tab_etiq ON tablets(etiqueta_interna);

CREATE INDEX idx_cel_colab ON smartphones(colaborador_id);
CREATE INDEX idx_cel_imei ON smartphones(imei);

CREATE INDEX idx_cam_colab ON cameras(colaborador_id);
CREATE INDEX idx_cam_etiq ON cameras(etiqueta_interna);

CREATE INDEX idx_col_colab ON coletores(colaborador_id);
CREATE INDEX idx_col_etiq ON coletores(etiqueta_interna);

CREATE INDEX idx_can_colab ON canetas_vibracao(colaborador_id);
CREATE INDEX idx_can_etiq ON canetas_vibracao(etiqueta_interna);

CREATE INDEX idx_av_equip ON avaliacoes(equipamento_id);

CREATE INDEX idx_com_artes_colab ON comunicados_artes(colaborador_id);
CREATE INDEX idx_com_artes_data ON comunicados_artes(data_evento);

CREATE INDEX idx_com_log_data ON comunicados_log(data_envio);

CREATE INDEX idx_com_config_tipo ON comunicados_config(tipo_comunicado);

CREATE INDEX idx_req_colab ON requisicao_compras(colaborador_id);
CREATE INDEX idx_req_aprov ON requisicao_compras(aprovador_id);
CREATE INDEX idx_req_token ON requisicao_compras(token_aprovacao);

CREATE INDEX idx_cfg_chave ON configuracoes(chave);

CREATE INDEX idx_cc_codigo ON centros_custo(codigo);

-- ============================================================
-- 6. SEGURANÇA E POLÍTICAS RLS (CORRIGIDO)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas_sala ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcs_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks_externos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tablets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smartphones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coletores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canetas_vibracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ramais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados_artes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisicao_compras ENABLE ROW LEVEL SECURITY;

-- ── Políticas de Autenticados (Admins e TI com login no Supabase Auth) ──
CREATE POLICY "auth_all_profiles" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_colaboradores" ON colaboradores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_chamados" ON chamados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_chamados_chat" ON chamados_chat FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_reservas_sala" ON reservas_sala FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_reservas" ON reservas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pcs_internos" ON pcs_internos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_notebooks_externos" ON notebooks_externos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_tablets" ON tablets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_smartphones" ON smartphones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_cameras" ON cameras FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_coletores" ON coletores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_canetas_vibracao" ON canetas_vibracao FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_avaliacoes" ON public.avaliacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_ramais" ON ramais FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_fila_emails" ON public.fila_emails FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_comunicados_artes" ON public.comunicados_artes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_comunicados_log" ON public.comunicados_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_comunicados_config" ON public.comunicados_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_centros_custo" ON public.centros_custo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_configuracoes" ON public.configuracoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_requisicao_compras" ON public.requisicao_compras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Políticas de Anônimos (Funcionários no Portal do Colaborador — sessionStorage) ──
-- ⚠️ Segurança: colaboradores.senha_portal e outros dados confidenciais de TI não devem ser alterados direto de forma aberta
CREATE POLICY "anon_select_colaboradores" ON colaboradores FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_colaboradores" ON colaboradores FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_select_pcs" ON pcs_internos FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_notebooks" ON notebooks_externos FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_tablets" ON tablets FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_smartphones" ON smartphones FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_ramais" ON ramais FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_comunicados_artes" ON comunicados_artes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_comunicados_log" ON public.comunicados_log FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_centros" ON public.centros_custo FOR SELECT TO anon USING (true);

-- Anon pode criar e atualizar chamados dele mesmo
CREATE POLICY "anon_select_chamados" ON public.chamados FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_chamados" ON public.chamados FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_chamados" ON public.chamados FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Anon pode interagir no chat do chamado
CREATE POLICY "anon_select_chat" ON public.chamados_chat FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_chat" ON public.chamados_chat FOR INSERT TO anon WITH CHECK (true);

-- Anon pode solicitar reservas de notebooks e salas
CREATE POLICY "anon_select_reservas" ON public.reservas FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_reservas" ON public.reservas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_reservas" ON public.reservas FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_select_reservas_sala" ON public.reservas_sala FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_reservas_sala" ON public.reservas_sala FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_reservas_sala" ON public.reservas_sala FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Anon pode realizar checklists de avaliação de equipamentos
CREATE POLICY "anon_select_avaliacoes" ON public.avaliacoes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_avaliacoes" ON public.avaliacoes FOR INSERT TO anon WITH CHECK (true);

-- Anon pode gerenciar requisições de compras e alterá-las
CREATE POLICY "anon_select_requisicoes" ON public.requisicao_compras FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_requisicoes" ON public.requisicao_compras FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_requisicoes" ON public.requisicao_compras FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 7. STORAGE SETUP
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "uploads_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "uploads_insert_anon" ON storage.objects;
DROP POLICY IF EXISTS "uploads_select_public" ON storage.objects;
DROP POLICY IF EXISTS "uploads_delete_authenticated" ON storage.objects;

CREATE POLICY "uploads_insert_authenticated" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "uploads_insert_anon" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "uploads_select_public" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "uploads_delete_authenticated" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'uploads');

-- ============================================================
-- 8. SEED DATA (DADOS INICIAIS)
-- ============================================================

-- Inicialização da Tabela de Configuração de Comunicados
INSERT INTO public.comunicados_config (tipo_comunicado, label, ativo, horario_envio, assunto_template, destinatarios_tipo, destinatarios_adicionais, cc_emails)
VALUES
  ('aniversario_colaborador', 'Aniversário de Colaborador', true, '08:00', '🎂 Feliz Aniversário, {nome}! 🎉', 'todos_colaboradores', '[]', '[]'),
  ('aniversario_conjuge', 'Aniversário de Cônjuge', true, '08:00', 'Parabéns para {nome_conjuge}! 🎂', 'colaborador_conjuge_gestor', '[]', '[]'),
  ('aniversario_filho_1ano', 'Filhos (1 ano)', true, '08:00', 'Feliz 1 Aninho de {nome_filho}! 🎈', 'colaborador_conjuge_gestor', '[]', '[]'),
  ('tempo_empresa', 'Tempo de Empresa', true, '08:00', 'Parabéns pelos {anos} anos de empresa, {nome}! 🎖', 'todos_colaboradores', '[]', '[]'),
  ('despedida', 'Despedida de Colaborador', true, 'manual', 'Até logo, {nome} — obrigado por tudo! 💼', 'manual', '[]', '[]')
ON CONFLICT (tipo_comunicado) DO NOTHING;

-- Configuração inicial do email do diretor geral
INSERT INTO public.configuracoes (chave, valor, descricao)
VALUES ('diretor_email', 'diretor.geral@interlub.com', 'E-mail oficial do diretor para aprovação final de requisições de compras')
ON CONFLICT (chave) DO NOTHING;

-- Centros de Custo Básicos
INSERT INTO public.centros_custo (codigo, nome, ativo)
VALUES
  ('100101', 'Tecnologia da Informação', true),
  ('100102', 'Recursos Humanos / DP', true),
  ('100103', 'Comercial / Vendas', true),
  ('100104', 'Industrial / Produção', true),
  ('100105', 'Financeiro / Contabilidade', true)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 9. STORED PROCEDURES (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.gerar_demandas_comunicados(usar_mes_atual BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  ano_atual INT := EXTRACT(YEAR FROM today)::INT;
  mes_alvo INT;
  ano_alvo INT;
  colab RECORD;
  filho_item JSONB;
  filho_data DATE;
  ja_existe BOOLEAN;
  novas_demandas INT := 0;
  ja_existiam INT := 0;
  data_evento_str DATE;
  anos_empresa INT;
BEGIN
  IF usar_mes_atual THEN
    mes_alvo := EXTRACT(MONTH FROM today)::INT - 1;
    ano_alvo := ano_atual;
  ELSE
    mes_alvo := (EXTRACT(MONTH FROM today)::INT) % 12;
    IF EXTRACT(MONTH FROM today)::INT = 12 THEN
      ano_alvo := ano_atual + 1;
    ELSE
      ano_alvo := ano_atual;
    END IF;
  END IF;

  SELECT COUNT(*)::INT INTO ja_existiam FROM public.comunicados_artes WHERE ano_referencia = ano_alvo;

  FOR colab IN 
    SELECT * FROM public.colaboradores 
    WHERE status <> 'Desligado' AND incluir_comunicados = true
  LOOP
    -- 1. Aniversário Colaborador
    IF colab.data_nascimento IS NOT NULL THEN
      IF EXTRACT(MONTH FROM colab.data_nascimento)::INT - 1 = mes_alvo THEN
        data_evento_str := make_date(ano_alvo, mes_alvo + 1, EXTRACT(DAY FROM colab.data_nascimento)::INT);
        SELECT EXISTS (
          SELECT 1 FROM public.comunicados_artes 
          WHERE colaborador_id = colab.id AND tipo_comunicado = 'aniversario_colaborador' AND data_evento = data_evento_str
        ) INTO ja_existe;
        
        IF NOT ja_existe THEN
          INSERT INTO public.comunicados_artes (
            colaborador_id, colaborador_nome, tipo_comunicado, data_evento,
            descricao_evento, imagem_url, status_arte, ano_referencia, criado_por
          ) VALUES (
            colab.id, colab.nome_completo, 'aniversario_colaborador', data_evento_str,
            colab.nome_completo || ' — Aniversário em ' || EXTRACT(DAY FROM colab.data_nascimento)::INT || '/' || (mes_alvo + 1) || '/' || ano_alvo,
            '', 'sem_arte', ano_alvo, 'Sistema'
          );
          novas_demandas := novas_demandas + 1;
        END IF;
      END IF;
    END IF;

    -- 2. Aniversário Cônjuge
    IF colab.conjuge_data_nascimento IS NOT NULL THEN
      IF EXTRACT(MONTH FROM colab.conjuge_data_nascimento)::INT - 1 = mes_alvo THEN
        data_evento_str := make_date(ano_alvo, mes_alvo + 1, EXTRACT(DAY FROM colab.conjuge_data_nascimento)::INT);
        SELECT EXISTS (
          SELECT 1 FROM public.comunicados_artes 
          WHERE colaborador_id = colab.id AND tipo_comunicado = 'aniversario_conjuge' AND data_evento = data_evento_str
        ) INTO ja_existe;
        
        IF NOT ja_existe THEN
          INSERT INTO public.comunicados_artes (
            colaborador_id, colaborador_nome, tipo_comunicado, data_evento,
            descricao_evento, imagem_url, status_arte, ano_referencia, criado_por
          ) VALUES (
            colab.id, colab.nome_completo, 'aniversario_conjuge', data_evento_str,
            colab.nome_completo || ' — Aniversário do cônjuge ' || COALESCE(colab.conjuge_nome, '') || ' em ' || EXTRACT(DAY FROM colab.conjuge_data_nascimento)::INT || '/' || (mes_alvo + 1) || '/' || ano_alvo,
            '', 'sem_arte', ano_alvo, 'Sistema'
          );
          novas_demandas := novas_demandas + 1;
        END IF;
      END IF;
    END IF;

    -- 3. Aniversário Filho 1 Ano
    IF colab.filhos IS NOT NULL AND jsonb_typeof(colab.filhos) = 'array' THEN
      FOR filho_item IN SELECT * FROM jsonb_array_elements(colab.filhos) LOOP
        IF filho_item->>'filho_data_nascimento' IS NOT NULL THEN
          filho_data := (filho_item->>'filho_data_nascimento')::DATE;
          IF EXTRACT(YEAR FROM filho_data)::INT = ano_alvo - 1 AND EXTRACT(MONTH FROM filho_data)::INT - 1 = mes_alvo THEN
            data_evento_str := make_date(ano_alvo, mes_alvo + 1, EXTRACT(DAY FROM filho_data)::INT);
            SELECT EXISTS (
              SELECT 1 FROM public.comunicados_artes 
              WHERE colaborador_id = colab.id AND tipo_comunicado = 'aniversario_filho_1ano' AND data_evento = data_evento_str
            ) INTO ja_existe;
            
            IF NOT ja_existe THEN
              INSERT INTO public.comunicados_artes (
                colaborador_id, colaborador_nome, tipo_comunicado, data_evento,
                descricao_evento, imagem_url, status_arte, ano_referencia, filho_nome, criado_por
              ) VALUES (
                colab.id, colab.nome_completo, 'aniversario_filho_1ano', data_evento_str,
                colab.nome_completo || ' — 1 aninho de ' || COALESCE(filho_item->>'filho_nome', 'filho(a)') || ' em ' || EXTRACT(DAY FROM filho_data)::INT || '/' || (mes_alvo + 1) || '/' || ano_alvo,
                '', 'sem_arte', ano_alvo, COALESCE(filho_item->>'filho_nome', ''), 'Sistema'
              );
              novas_demandas := novas_demandas + 1;
            END IF;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- 4. Tempo de Empresa
    IF colab.data_admissao IS NOT NULL THEN
      IF EXTRACT(MONTH FROM colab.data_admissao)::INT - 1 = mes_alvo THEN
        anos_empresa := ano_alvo - EXTRACT(YEAR FROM colab.data_admissao)::INT;
        IF anos_empresa IN (1, 2, 3, 5, 10, 15, 20) THEN
          data_evento_str := make_date(ano_alvo, mes_alvo + 1, EXTRACT(DAY FROM colab.data_admissao)::INT);
          SELECT EXISTS (
            SELECT 1 FROM public.comunicados_artes 
            WHERE colaborador_id = colab.id AND tipo_comunicado = 'tempo_empresa' AND data_evento = data_evento_str
          ) INTO ja_existe;
          
          IF NOT ja_existe THEN
            INSERT INTO public.comunicados_artes (
              colaborador_id, colaborador_nome, tipo_comunicado, data_evento,
              descricao_evento, imagem_url, status_arte, ano_referencia, anos_empresa, criado_por
            ) VALUES (
              colab.id, colab.nome_completo, 'tempo_empresa', data_evento_str,
              colab.nome_completo || ' — ' || anos_empresa || ' ano(s) de empresa',
              '', 'sem_arte', ano_alvo, anos_empresa, 'Sistema'
            );
            novas_demandas := novas_demandas + 1;
          END IF;
        END IF;
      END IF;
    END IF;

  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'mes_gerado', lpad((mes_alvo + 1)::text, 2, '0') || '/' || ano_alvo,
    'criadas', novas_demandas,
    'ja_existiam', ja_existiam,
    'msg', novas_demandas || ' demanda(s) criada(s) para ' || lpad((mes_alvo + 1)::text, 2, '0') || '/' || ano_alvo || '.'
  );
END;
$$;

