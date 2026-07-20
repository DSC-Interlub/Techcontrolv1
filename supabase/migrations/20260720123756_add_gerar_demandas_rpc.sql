-- ============================================================
-- STORED PROCEDURES (RPC)
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
