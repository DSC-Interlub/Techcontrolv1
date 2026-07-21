-- ============================================================
-- MIGRATION: Tabela estacoes_trabalho e vínculo com pcs_internos
-- ============================================================

CREATE TABLE IF NOT EXISTS estacoes_trabalho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  andar TEXT,
  sala TEXT,
  imagem_planta TEXT,
  codigo TEXT NOT NULL,
  pos_x NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  pos_y NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  observacoes TEXT
);

CREATE INDEX IF NOT EXISTS idx_estacoes_andar_sala ON estacoes_trabalho(andar, sala);

-- Permissões RLS e Grants para anon, authenticated e service_role
ALTER TABLE estacoes_trabalho DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE estacoes_trabalho TO anon, authenticated, service_role;

-- Adiciona estacao_id em pcs_internos sem apagar a coluna 'area'
ALTER TABLE pcs_internos ADD COLUMN IF NOT EXISTS estacao_id UUID REFERENCES estacoes_trabalho(id) ON DELETE SET NULL;
