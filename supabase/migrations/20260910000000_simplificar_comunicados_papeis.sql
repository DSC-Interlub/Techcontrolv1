-- ============================================================
-- Migração: Simplificação de Papéis de Comunicados e RLS
-- Data: 2026-09-10
-- ============================================================

-- 1. Adicionar novas colunas booleanas em colaboradores
ALTER TABLE public.colaboradores 
  ADD COLUMN IF NOT EXISTS eh_comunicacao_branding BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS eh_conexao_humana BOOLEAN DEFAULT false;

-- 2. Garantir seed inicial em comunicados_config para os 4 tipos de comunicado
INSERT INTO public.comunicados_config (tipo_comunicado, label, ativo, horario_envio, assunto_template, destinatarios_tipo, destinatarios_adicionais, cc_emails)
VALUES
  ('aniversario_colaborador', 'Aniversário de Colaborador', true, '08:00', '🎂 Feliz Aniversário, {nome}! 🎉', 'todos_colaboradores', '[]', '[]'),
  ('aniversario_conjuge', 'Aniversário de Cônjuge', true, '08:00', 'Parabéns para {nome_conjuge}! 🎂', 'colaborador_conjuge_gestor', '[]', '[]'),
  ('aniversario_filho_1ano', 'Filhos (1 ano)', true, '08:00', 'Feliz 1 Aninho de {nome_filho}! 🎈', 'colaborador_conjuge_gestor', '[]', '[]'),
  ('tempo_empresa', 'Tempo de Empresa', true, '08:00', 'Parabéns pelos {anos} anos de empresa, {nome}! 🎖', 'todos_colaboradores', '[]', '[]')
ON CONFLICT (tipo_comunicado) DO NOTHING;

-- 3. Políticas RLS para comunicados_config (SELECT e UPDATE para anon/portal)
ALTER TABLE public.comunicados_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_comunicados_config" ON public.comunicados_config;
DROP POLICY IF EXISTS "anon_update_comunicados_config" ON public.comunicados_config;
DROP POLICY IF EXISTS "auth_all_comunicados_config" ON public.comunicados_config;
DROP POLICY IF EXISTS "service_role_all_comunicados_config" ON public.comunicados_config;

CREATE POLICY "anon_select_comunicados_config" ON public.comunicados_config FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_comunicados_config" ON public.comunicados_config FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_comunicados_config" ON public.comunicados_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_comunicados_config" ON public.comunicados_config FOR ALL TO service_role USING (true);

-- 4. Garantir políticas RLS em colaboradores (SELECT, INSERT e UPDATE para anon/portal)
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "anon_update_colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "anon_insert_colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "anon_update_colaboradores_table" ON public.colaboradores;
DROP POLICY IF EXISTS "anon_insert_colaboradores_table" ON public.colaboradores;

CREATE POLICY "anon_select_colaboradores" ON public.colaboradores FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_colaboradores_table" ON public.colaboradores FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_insert_colaboradores_table" ON public.colaboradores FOR INSERT TO anon WITH CHECK (true);

-- Notificar PostgREST para recarregar o cache de schema imediatamente
NOTIFY pgrst, 'reload schema';

