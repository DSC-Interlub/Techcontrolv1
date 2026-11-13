-- ==============================================================================
-- Migration: Controle pós-aprovação de requisições de compras (SAP e Entrega)
-- ==============================================================================

ALTER TABLE requisicao_compras
  ADD COLUMN IF NOT EXISTS etapa_compra text CHECK (etapa_compra IN ('Lançar no SAP', 'Aguardando entrega', 'Entregue', 'Cancelada')),
  ADD COLUMN IF NOT EXISTS aprovada_em timestamptz,
  ADD COLUMN IF NOT EXISTS sap_pedido_numero text,
  ADD COLUMN IF NOT EXISTS sap_lancado_em timestamptz,
  ADD COLUMN IF NOT EXISTS sap_lancado_por_id uuid,
  ADD COLUMN IF NOT EXISTS sap_lancado_por_nome text,
  ADD COLUMN IF NOT EXISTS previsao_entrega date,
  ADD COLUMN IF NOT EXISTS entrega_data date,
  ADD COLUMN IF NOT EXISTS entrega_nf text,
  ADD COLUMN IF NOT EXISTS entrega_registrada_por_nome text,
  ADD COLUMN IF NOT EXISTS entrega_observacao text,
  ADD COLUMN IF NOT EXISTS compra_cancelada_motivo text;

-- Backfill para requisições já aprovadas no banco
UPDATE requisicao_compras
SET etapa_compra = 'Lançar no SAP',
    aprovada_em = COALESCE(diretor_data, cotacao_data, updated_date, created_date)
WHERE status = 'Aprovada' AND etapa_compra IS NULL;

-- Índice para consultas rápidas na listagem de pedidos pós-aprovação
CREATE INDEX IF NOT EXISTS idx_requisicao_compras_status_etapa
  ON requisicao_compras (status, etapa_compra);

-- Recarregar cache de schema do PostgREST conforme MANIFESTO.md
NOTIFY pgrst, 'reload schema';
