-- Migration for Projetos Internos de TI
CREATE TABLE IF NOT EXISTS public.projetos_internos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_projeto TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  programa_nome TEXT NOT NULL DEFAULT 'Plano Estratégico de TI 2026',
  status TEXT NOT NULL DEFAULT 'Em Planejamento',
  prioridade TEXT NOT NULL DEFAULT 'Média',
  responsavel_id TEXT,
  responsavel_nome TEXT,
  solicitante_id TEXT,
  solicitante_nome TEXT,
  participantes_ids JSONB DEFAULT '[]'::jsonb,
  custo_estimado NUMERIC(12,2) DEFAULT 0.00,
  custo_real NUMERIC(12,2) DEFAULT 0.00,
  data_inicio_prevista DATE,
  data_fim_prevista DATE,
  data_conclusao DATE,
  marcos JSONB DEFAULT '[]'::jsonb,
  aprovacao_diretoria JSONB DEFAULT '[]'::jsonb,
  aprovacoes_documentos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projetos_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES public.projetos_internos(id) ON DELETE CASCADE,
  remetente_id TEXT,
  remetente_nome TEXT NOT NULL,
  remetente_email TEXT NOT NULL,
  tipo_remetente TEXT NOT NULL DEFAULT 'colaborador',
  mensagem TEXT,
  anexo_url TEXT,
  anexo_nome TEXT,
  data_hora TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.projetos_internos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projetos_internos" ON public.projetos_internos;
CREATE POLICY "anon_select_projetos_internos" ON public.projetos_internos FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_insert_projetos_internos" ON public.projetos_internos;
CREATE POLICY "anon_insert_projetos_internos" ON public.projetos_internos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projetos_internos" ON public.projetos_internos;
CREATE POLICY "anon_update_projetos_internos" ON public.projetos_internos FOR UPDATE USING (true);

DROP POLICY IF EXISTS "anon_delete_projetos_internos" ON public.projetos_internos;
CREATE POLICY "anon_delete_projetos_internos" ON public.projetos_internos FOR DELETE USING (true);

ALTER TABLE public.projetos_chat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projetos_chat" ON public.projetos_chat;
CREATE POLICY "anon_select_projetos_chat" ON public.projetos_chat FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_insert_projetos_chat" ON public.projetos_chat;
CREATE POLICY "anon_insert_projetos_chat" ON public.projetos_chat FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projetos_chat" ON public.projetos_chat;
CREATE POLICY "anon_update_projetos_chat" ON public.projetos_chat FOR UPDATE USING (true);

DROP POLICY IF EXISTS "anon_delete_projetos_chat" ON public.projetos_chat;
CREATE POLICY "anon_delete_projetos_chat" ON public.projetos_chat FOR DELETE USING (true);
