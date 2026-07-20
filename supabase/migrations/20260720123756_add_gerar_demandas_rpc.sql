-- ============================================================
-- STORED PROCEDURES (RPC)
-- ============================================================

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
    WHERE status <> 'Desligado' AND incluir_comunicados = true
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
