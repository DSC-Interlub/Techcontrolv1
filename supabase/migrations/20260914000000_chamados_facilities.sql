-- Migration: 20260914000000_chamados_facilities.sql
-- Description: Módulo de Chamados de Facilities isolado de TI

-- 1. Sequence e função para numeração atômica (FAC-YYYY-0001)
CREATE SEQUENCE IF NOT EXISTS chamados_facilities_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.proximo_numero_facilities()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
  v_numero TEXT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_seq := nextval('chamados_facilities_seq');
  v_numero := 'FAC-' || v_year || '-' || lpad(v_seq::text, 4, '0');
  RETURN v_numero;
END;
$$;

-- 2. Tabela chamados_facilities
CREATE TABLE IF NOT EXISTS public.chamados_facilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  numero_solicitacao TEXT UNIQUE,
  
  -- Identificação do Solicitante
  solicitante_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  solicitante_nome TEXT NOT NULL,
  area_departamento TEXT,
  telefone_ramal TEXT,
  email TEXT,
  
  -- Dados da Solicitação
  local_ocorrencia TEXT NOT NULL,
  tipo_servico TEXT NOT NULL,
  tipo_servico_outro TEXT,
  descricao TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'Média',
  necessita_parada_area BOOLEAN NOT NULL DEFAULT false,
  periodo_parada TEXT,
  anexos JSONB DEFAULT '[]'::jsonb,
  
  -- Fluxo de Status
  status TEXT NOT NULL DEFAULT 'Aberto',
  
  -- Uso Exclusivo Facilities (Análise & Execução)
  data_recebimento TIMESTAMPTZ,
  responsavel_analise_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  responsavel_analise_nome TEXT,
  categoria_confirmada TEXT,
  prioridade_definida TEXT,
  prazo_atendimento TEXT,
  tratamento TEXT,
  responsavel_execucao_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  responsavel_execucao_nome TEXT,
  fornecedor_nome TEXT,
  data_execucao TIMESTAMPTZ,
  descricao_servico_executado TEXT,
  data_conclusao TIMESTAMPTZ,
  
  -- Pesquisa de Satisfação
  satisfacao_respondida BOOLEAN DEFAULT false,
  avaliacao_tempo_resolucao INTEGER,
  avaliacao_qualidade_atendimento INTEGER,
  avaliacao_qualidade_solucao INTEGER,
  avaliacao_comunicacao INTEGER,
  avaliacao_nota_geral NUMERIC(3,1),
  avaliacao_comentario TEXT,
  avaliacao_data TIMESTAMPTZ,
  
  -- Histórico de Eventos / Auditoria
  historico JSONB DEFAULT '[]'::jsonb
);

-- Trigger para garantir numero_solicitacao automático se não informado no INSERT
CREATE OR REPLACE FUNCTION public.trg_fn_chamados_facilities_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.numero_solicitacao IS NULL OR trim(NEW.numero_solicitacao) = '' THEN
    NEW.numero_solicitacao := public.proximo_numero_facilities();
  END IF;
  NEW.updated_date := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chamados_facilities_numero ON public.chamados_facilities;
CREATE TRIGGER trg_chamados_facilities_numero
BEFORE INSERT ON public.chamados_facilities
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_chamados_facilities_numero();

-- 3. Configurações de RLS
ALTER TABLE public.chamados_facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chamados_facilities" ON public.chamados_facilities;
CREATE POLICY "anon_select_chamados_facilities" ON public.chamados_facilities FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_chamados_facilities" ON public.chamados_facilities;
CREATE POLICY "anon_insert_chamados_facilities" ON public.chamados_facilities FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chamados_facilities" ON public.chamados_facilities;
CREATE POLICY "anon_update_chamados_facilities" ON public.chamados_facilities FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_chamados_facilities" ON public.chamados_facilities;
CREATE POLICY "auth_all_chamados_facilities" ON public.chamados_facilities FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_chamados_facilities" ON public.chamados_facilities;
CREATE POLICY "service_role_all_chamados_facilities" ON public.chamados_facilities FOR ALL TO service_role USING (true);
