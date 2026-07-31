CREATE TABLE IF NOT EXISTS tarefas_manutencao_equipamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipamento_id UUID NOT NULL,
  equipamento_tipo TEXT NOT NULL,
  avaliacao_id UUID REFERENCES avaliacoes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  origem TEXT CHECK (origem IN ('Regra automática', 'Problema relatado pelo usuário')),
  status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Concluída')),
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE tarefas_manutencao_equipamento ENABLE ROW LEVEL SECURITY;

-- Criar Policy para acesso total via service role e anon/authenticated
CREATE POLICY "service_role_all" ON tarefas_manutencao_equipamento FOR ALL USING (true);
