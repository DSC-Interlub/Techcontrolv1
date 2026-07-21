-- ============================================================
-- MIGRATION: Tabela estacoes_trabalho e vínculo com pcs_internos
-- ============================================================

CREATE TABLE IF NOT EXISTS estacoes_trabalho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  andar TEXT NOT NULL CHECK (andar IN ('ADM Térreo', 'ADM 1º Andar', 'Galpão', 'Mezanino')),
  sala TEXT NOT NULL CHECK (sala IN (
    'Sala BSM',
    'Sala DRC',
    'Sala BIO',
    'Sala de Reenvase',
    'Check-out',
    'Centro de Controle Operacional',
    'ADM 1º Andar (Área Aberta)',
    'Sala Financeiro'
  )),
  codigo TEXT NOT NULL,
  pos_x NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  pos_y NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  observacoes TEXT
);

CREATE INDEX IF NOT EXISTS idx_estacoes_andar_sala ON estacoes_trabalho(andar, sala);

-- Adiciona estacao_id em pcs_internos sem apagar a coluna 'area'
ALTER TABLE pcs_internos ADD COLUMN IF NOT EXISTS estacao_id UUID REFERENCES estacoes_trabalho(id) ON DELETE SET NULL;
