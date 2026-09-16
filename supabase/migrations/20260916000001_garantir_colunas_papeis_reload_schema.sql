-- 1. Garantir todas as colunas de papéis operacionais no portal
ALTER TABLE public.colaboradores 
  ADD COLUMN IF NOT EXISTS eh_comunicacao_branding BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS eh_conexao_humana BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS eh_comprador BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS eh_facilities BOOLEAN DEFAULT false;

-- 2. Garantir RLS para anon e authenticated
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "anon_update_colaboradores_table" ON public.colaboradores;
DROP POLICY IF EXISTS "anon_insert_colaboradores_table" ON public.colaboradores;

CREATE POLICY "anon_select_colaboradores" ON public.colaboradores FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_colaboradores_table" ON public.colaboradores FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_insert_colaboradores_table" ON public.colaboradores FOR INSERT TO anon WITH CHECK (true);

-- 3. Notificar o PostgREST para recarregar o cache de schema imediatamente
NOTIFY pgrst, 'reload schema';
