-- Migration: 20260916000000_adicionar_eh_facilities_colaboradores.sql
-- Adiciona a coluna eh_facilities na tabela colaboradores para permitir gestores de facilities no portal

ALTER TABLE public.colaboradores 
ADD COLUMN IF NOT EXISTS eh_facilities BOOLEAN DEFAULT false;

-- Comentário da coluna para documentação
COMMENT ON COLUMN public.colaboradores.eh_facilities IS 'Indica se o colaborador faz parte da equipe de Facilities com poderes de gestão no Portal';

-- Garantir que a tabela empresas_terceiras possua RLS adequado para anon e authenticated
CREATE TABLE IF NOT EXISTS public.empresas_terceiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT,
  telefone TEXT,
  email TEXT,
  contato TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.empresas_terceiras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_empresas_terceiras" ON public.empresas_terceiras;
CREATE POLICY "anon_select_empresas_terceiras" ON public.empresas_terceiras FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_all_empresas_terceiras" ON public.empresas_terceiras;
CREATE POLICY "anon_all_empresas_terceiras" ON public.empresas_terceiras FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_empresas_terceiras" ON public.empresas_terceiras;
CREATE POLICY "auth_all_empresas_terceiras" ON public.empresas_terceiras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notificar PostgREST para recarregar o cache de schema imediatamente
NOTIFY pgrst, 'reload schema';

