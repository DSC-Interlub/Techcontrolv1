-- Criar tabela de tarefas de manutenção de equipamentos
CREATE TABLE IF NOT EXISTS public.tarefas_manutencao_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL,
  equipamento_tipo TEXT NOT NULL,
  avaliacao_id UUID REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  origem TEXT CHECK (origem IN ('Regra automática', 'Problema relatado pelo usuário')),
  status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Concluída')),
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.tarefas_manutencao_equipamento ENABLE ROW LEVEL SECURITY;

-- Criar Policy para service role e anon/authenticated
DROP POLICY IF EXISTS "service_role_all" ON public.tarefas_manutencao_equipamento;
CREATE POLICY "service_role_all" ON public.tarefas_manutencao_equipamento FOR ALL USING (true);
