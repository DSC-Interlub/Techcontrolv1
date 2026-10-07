-- Migration: 20261006000000_ciclo_vida_salas_antivirus_conformidade.sql
-- Descrição: Ciclo de vida de colaboradores (desligamento/reativação), status 'Aguardando Devolução',
--            antivirus_nome, salas de reunião, view de conformidade e reload de schema.

-- ==============================================================================
-- 1. TAREFA 1: Ciclo de Vida do Colaborador (Desligamento e Reativação)
-- ==============================================================================

-- 1a. Colunas de desligamento / reativação e histórico
ALTER TABLE public.colaboradores 
  ADD COLUMN IF NOT EXISTS data_desligamento DATE,
  ADD COLUMN IF NOT EXISTS motivo_desligamento TEXT,
  ADD COLUMN IF NOT EXISTS data_reativacao DATE,
  ADD COLUMN IF NOT EXISTS historico_status JSONB DEFAULT '[]'::jsonb;

-- 1b. Atualização do CHECK constraint de status para incluir 'Aguardando Devolução'
-- pcs_internos:
ALTER TABLE public.pcs_internos DROP CONSTRAINT IF EXISTS pcs_internos_status_check;
ALTER TABLE public.pcs_internos ADD CONSTRAINT pcs_internos_status_check 
  CHECK (status = ANY (ARRAY['Disponível'::text, 'Em uso'::text, 'Manutenção'::text, 'Formatação'::text, 'Danificado'::text, 'Aguardando Devolução'::text]));

-- notebooks_externos:
ALTER TABLE public.notebooks_externos DROP CONSTRAINT IF EXISTS notebooks_externos_status_check;
ALTER TABLE public.notebooks_externos ADD CONSTRAINT notebooks_externos_status_check 
  CHECK (status = ANY (ARRAY['Disponível'::text, 'Em uso'::text, 'Reservado'::text, 'Manutenção'::text, 'Formatação'::text, 'Danificado'::text, 'Aguardando Devolução'::text]));

-- ==============================================================================
-- 2. TAREFA 2: Campo de Antivírus com Nome do Produto
-- ==============================================================================

ALTER TABLE public.pcs_internos 
  ADD COLUMN IF NOT EXISTS antivirus_nome TEXT;

ALTER TABLE public.notebooks_externos 
  ADD COLUMN IF NOT EXISTS antivirus_nome TEXT;

-- ==============================================================================
-- 3. TAREFA 3: Segunda Sala de Reunião (Salas e Vínculo em Reservas)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.salas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL,
  ativo BOOLEAN DEFAULT true,
  capacidade INTEGER DEFAULT 10,
  created_date TIMESTAMPTZ DEFAULT now()
);

-- Seed das salas oficiais
INSERT INTO public.salas (nome, capacidade) 
VALUES ('Sala de Treinamento', 25) 
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.salas (nome, capacidade) 
VALUES ('Sala de Reunião Recepção', 10) 
ON CONFLICT (nome) DO NOTHING;

-- Adicionar sala_id a reservas_sala
ALTER TABLE public.reservas_sala 
  ADD COLUMN IF NOT EXISTS sala_id UUID REFERENCES public.salas(id) ON DELETE RESTRICT;

-- Preencher reservas existentes com a 'Sala de Treinamento'
UPDATE public.reservas_sala 
SET sala_id = (SELECT id FROM public.salas WHERE nome = 'Sala de Treinamento' LIMIT 1)
WHERE sala_id IS NULL;

-- RLS para tabela salas
ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_salas" ON public.salas;
DROP POLICY IF EXISTS "auth_all_salas" ON public.salas;
DROP POLICY IF EXISTS "service_role_salas" ON public.salas;

CREATE POLICY "anon_select_salas" ON public.salas FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all_salas" ON public.salas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_salas" ON public.salas FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 4. TAREFA 5: Política de Equipamentos (Conformidade TI) & Anydesk
-- ==============================================================================

ALTER TABLE public.pcs_internos ADD COLUMN IF NOT EXISTS anydesk_id TEXT;
ALTER TABLE public.notebooks_externos ADD COLUMN IF NOT EXISTS anydesk_id TEXT;

-- View unificada de conformidade de equipamentos
CREATE OR REPLACE VIEW public.vw_conformidade_equipamentos AS
WITH equipamentos_unificados AS (
  SELECT 
    'pcs_internos' AS origem_tabela,
    id,
    tipo,
    etiqueta_interna,
    TRIM(CONCAT(COALESCE(marca, ''), ' ', COALESCE(modelo, ''))) AS maquina,
    status,
    colaborador_id,
    usuario_atual,
    antivirus,
    antivirus_nome,
    data_formatacao,
    data_aquisicao,
    anydesk_id
  FROM public.pcs_internos
  UNION ALL
  SELECT 
    'notebooks_externos' AS origem_tabela,
    id,
    tipo,
    etiqueta_interna,
    TRIM(CONCAT(COALESCE(marca, ''), ' ', COALESCE(modelo, ''))) AS maquina,
    status,
    colaborador_id,
    usuario_atual,
    antivirus,
    antivirus_nome,
    data_formatacao,
    data_aquisicao,
    anydesk_id
  FROM public.notebooks_externos
)
SELECT 
  eq.origem_tabela,
  eq.id,
  eq.tipo,
  eq.etiqueta_interna,
  eq.maquina,
  eq.status,
  eq.colaborador_id,
  c.nome_completo AS colaborador_nome,
  c.email AS colaborador_email,
  c.area AS colaborador_area,
  c.status AS colaborador_status,
  eq.usuario_atual,
  COALESCE(eq.antivirus, 'Não') AS antivirus,
  eq.antivirus_nome,
  eq.data_formatacao,
  eq.data_aquisicao,
  eq.anydesk_id,
  -- Próxima formatação: data_formatacao + 30 meses (apenas Desktop e Notebook)
  CASE 
    WHEN eq.tipo IN ('Desktop', 'Notebook') AND eq.data_formatacao IS NOT NULL 
      THEN (eq.data_formatacao + INTERVAL '30 months')::DATE 
    ELSE NULL 
  END AS proxima_formatacao,
  -- Dias restantes para próxima formatação
  CASE 
    WHEN eq.tipo IN ('Desktop', 'Notebook') AND eq.data_formatacao IS NOT NULL 
      THEN ((eq.data_formatacao + INTERVAL '30 months')::DATE - CURRENT_DATE)
    ELSE NULL 
  END AS dias_para_proxima_formatacao,
  -- Status da formatação: atrasado (< 0), atencao (<= 60), ok (> 60), nao_se_aplica / sem_registro
  CASE 
    WHEN eq.tipo NOT IN ('Desktop', 'Notebook') THEN 'nao_se_aplica'
    WHEN eq.data_formatacao IS NULL THEN 'sem_registro'
    WHEN ((eq.data_formatacao + INTERVAL '30 months')::DATE - CURRENT_DATE) < 0 THEN 'atrasado'
    WHEN ((eq.data_formatacao + INTERVAL '30 months')::DATE - CURRENT_DATE) <= 60 THEN 'atencao'
    ELSE 'ok'
  END AS status_formatacao,
  -- Fim da vida útil: data_aquisicao + 5 anos
  CASE 
    WHEN eq.data_aquisicao IS NOT NULL 
      THEN (eq.data_aquisicao + INTERVAL '5 years')::DATE 
    ELSE NULL 
  END AS fim_vida_util,
  -- Dias restantes para fim da vida útil
  CASE 
    WHEN eq.data_aquisicao IS NOT NULL 
      THEN ((eq.data_aquisicao + INTERVAL '5 years')::DATE - CURRENT_DATE)
    ELSE NULL 
  END AS dias_para_fim_vida_util,
  -- Status da vida útil: atrasado (< 0), atencao (<= 60), ok (> 60), sem_registro
  CASE 
    WHEN eq.data_aquisicao IS NULL THEN 'sem_registro'
    WHEN ((eq.data_aquisicao + INTERVAL '5 years')::DATE - CURRENT_DATE) < 0 THEN 'atrasado'
    WHEN ((eq.data_aquisicao + INTERVAL '5 years')::DATE - CURRENT_DATE) <= 60 THEN 'atencao'
    ELSE 'ok'
  END AS status_vida_util
FROM equipamentos_unificados eq
LEFT JOIN public.colaboradores c ON eq.colaborador_id = c.id;

-- Permissões na view
GRANT SELECT ON public.vw_conformidade_equipamentos TO anon;
GRANT SELECT ON public.vw_conformidade_equipamentos TO authenticated;
GRANT SELECT ON public.vw_conformidade_equipamentos TO service_role;

-- ==============================================================================
-- 5. AJUSTE RPC COMUNICADOS: Filtrar estritamente status = 'Ativo'
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.gerar_demandas_comunicados(dias_busca INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  colab RECORD;
  filho_item JSONB;
  filho_data DATE;
  event_date DATE;
  ja_existe BOOLEAN;
  novas_demandas INT := 0;
  anos_empresa INT;
  ano_alvo INT;
BEGIN
  FOR colab IN 
    SELECT * FROM public.colaboradores 
    WHERE status = 'Ativo' 
      AND (acesso_portal_bloqueado IS NULL OR acesso_portal_bloqueado = false)
      AND incluir_comunicados = true
  LOOP
    -- 1. Aniversário Colaborador
    IF colab.data_nascimento IS NOT NULL THEN
      FOR ano_alvo IN EXTRACT(YEAR FROM today)::INT .. EXTRACT(YEAR FROM today)::INT + 1 LOOP
        event_date := make_date(ano_alvo, EXTRACT(MONTH FROM colab.data_nascimento)::INT, EXTRACT(DAY FROM colab.data_nascimento)::INT);
        IF event_date >= today AND event_date <= today + dias_busca THEN
          SELECT EXISTS (
            SELECT 1 FROM public.comunicados_artes 
            WHERE colaborador_id = colab.id AND tipo_comunicado = 'aniversario_colaborador' AND data_evento = event_date
          ) INTO ja_existe;
          
          IF NOT ja_existe THEN
            INSERT INTO public.comunicados_artes (
              colaborador_id, colaborador_nome, tipo_comunicado, data_evento,
              descricao_evento, imagem_url, status_arte, ano_referencia, criado_por
            ) VALUES (
              colab.id, colab.nome_completo, 'aniversario_colaborador', event_date,
              colab.nome_completo || ' — Aniversário em ' || EXTRACT(DAY FROM colab.data_nascimento)::INT || '/' || EXTRACT(MONTH FROM colab.data_nascimento)::INT || '/' || ano_alvo,
              '', 'sem_arte', ano_alvo, 'Sistema'
            );
            novas_demandas := novas_demandas + 1;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- 2. Aniversário Cônjuge
    IF colab.conjuge_data_nascimento IS NOT NULL THEN
      FOR ano_alvo IN EXTRACT(YEAR FROM today)::INT .. EXTRACT(YEAR FROM today)::INT + 1 LOOP
        event_date := make_date(ano_alvo, EXTRACT(MONTH FROM colab.conjuge_data_nascimento)::INT, EXTRACT(DAY FROM colab.conjuge_data_nascimento)::INT);
        IF event_date >= today AND event_date <= today + dias_busca THEN
          SELECT EXISTS (
            SELECT 1 FROM public.comunicados_artes 
            WHERE colaborador_id = colab.id AND tipo_comunicado = 'aniversario_conjuge' AND data_evento = event_date
          ) INTO ja_existe;
          
          IF NOT ja_existe THEN
            INSERT INTO public.comunicados_artes (
              colaborador_id, colaborador_nome, tipo_comunicado, data_evento,
              descricao_evento, imagem_url, status_arte, ano_referencia, criado_por
            ) VALUES (
              colab.id, colab.nome_completo, 'aniversario_conjuge', event_date,
              colab.nome_completo || ' — Aniversário do cônjuge ' || COALESCE(colab.conjuge_nome, '') || ' em ' || EXTRACT(DAY FROM colab.conjuge_data_nascimento)::INT || '/' || EXTRACT(MONTH FROM colab.conjuge_data_nascimento)::INT || '/' || ano_alvo,
              '', 'sem_arte', ano_alvo, 'Sistema'
            );
            novas_demandas := novas_demandas + 1;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- 3. Aniversário Filho 1 Ano
    IF colab.filhos IS NOT NULL AND jsonb_typeof(colab.filhos) = 'array' THEN
      FOR filho_item IN SELECT * FROM jsonb_array_elements(colab.filhos) LOOP
        IF filho_item->>'filho_data_nascimento' IS NOT NULL THEN
          filho_data := (filho_item->>'filho_data_nascimento')::DATE;
          ano_alvo := EXTRACT(YEAR FROM filho_data)::INT + 1;
          event_date := make_date(ano_alvo, EXTRACT(MONTH FROM filho_data)::INT, EXTRACT(DAY FROM filho_data)::INT);
          IF event_date >= today AND event_date <= today + dias_busca THEN
            SELECT EXISTS (
              SELECT 1 FROM public.comunicados_artes 
              WHERE colaborador_id = colab.id AND tipo_comunicado = 'aniversario_filho_1ano' AND data_evento = event_date
            ) INTO ja_existe;
            
            IF NOT ja_existe THEN
              INSERT INTO public.comunicados_artes (
                colaborador_id, colaborador_nome, tipo_comunicado, data_evento,
                descricao_evento, imagem_url, status_arte, ano_referencia, filho_nome, criado_por
              ) VALUES (
                colab.id, colab.nome_completo, 'aniversario_filho_1ano', event_date,
                colab.nome_completo || ' — 1 aninho de ' || COALESCE(filho_item->>'filho_nome', 'filho(a)') || ' em ' || EXTRACT(DAY FROM filho_data)::INT || '/' || EXTRACT(MONTH FROM filho_data)::INT || '/' || ano_alvo,
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
      FOR ano_alvo IN EXTRACT(YEAR FROM today)::INT .. EXTRACT(YEAR FROM today)::INT + 1 LOOP
        event_date := make_date(ano_alvo, EXTRACT(MONTH FROM colab.data_admissao)::INT, EXTRACT(DAY FROM colab.data_admissao)::INT);
        IF event_date >= today AND event_date <= today + dias_busca THEN
          anos_empresa := ano_alvo - EXTRACT(YEAR FROM colab.data_admissao)::INT;
          IF anos_empresa IN (1, 2, 3, 5, 10, 15, 20) THEN
            SELECT EXISTS (
              SELECT 1 FROM public.comunicados_artes 
              WHERE colaborador_id = colab.id AND tipo_comunicado = 'tempo_empresa' AND data_evento = event_date
            ) INTO ja_existe;
            
            IF NOT ja_existe THEN
              INSERT INTO public.comunicados_artes (
                colaborador_id, colaborador_nome, tipo_comunicado, data_evento,
                descricao_evento, imagem_url, status_arte, ano_referencia, anos_empresa, criado_por
              ) VALUES (
                colab.id, colab.nome_completo, 'tempo_empresa', event_date,
                colab.nome_completo || ' — ' || anos_empresa || ' ano(s) de empresa',
                '', 'sem_arte', ano_alvo, anos_empresa, 'Sistema'
              );
              novas_demandas := novas_demandas + 1;
            END IF;
          END IF;
        END IF;
      END LOOP;
    END IF;

  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'criadas', novas_demandas,
    'msg', novas_demandas || ' demanda(s) criada(s) para os próximos ' || dias_busca || ' dias.'
  );
END;
$$;

-- ==============================================================================
-- 6. REGRA MANDATÓRIA: Recarregar cache de schema do PostgREST
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
