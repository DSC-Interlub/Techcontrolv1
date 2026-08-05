-- Migration: 20260730000001_requisicao_compras_v2.sql
-- Description: Reformulação do fluxo de Requisição de Compras e adição de comprador em colaboradores

-- 1. Alter CHECK constraint on requisicao_compras.status
ALTER TABLE public.requisicao_compras DROP CONSTRAINT IF EXISTS requisicao_compras_status_check;

ALTER TABLE public.requisicao_compras ADD CONSTRAINT requisicao_compras_status_check CHECK (
  status IN (
    'Aguardando Aprovador',
    'Aguardando Diretor',
    'Aguardando Cotação',
    'Aguardando Aprovação Final',
    'Aprovada',
    'Reprovada pelo Aprovador',
    'Reprovada pelo Diretor'
  )
);

-- 2. Add new quotation, material, and color columns to requisicao_compras
ALTER TABLE public.requisicao_compras ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE public.requisicao_compras ADD COLUMN IF NOT EXISTS cor TEXT;
ALTER TABLE public.requisicao_compras ADD COLUMN IF NOT EXISTS cotacao_valor NUMERIC;
ALTER TABLE public.requisicao_compras ADD COLUMN IF NOT EXISTS cotacao_fornecedor TEXT;
ALTER TABLE public.requisicao_compras ADD COLUMN IF NOT EXISTS cotacao_anexos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.requisicao_compras ADD COLUMN IF NOT EXISTS cotacao_comentario TEXT;
ALTER TABLE public.requisicao_compras ADD COLUMN IF NOT EXISTS cotacao_data TIMESTAMPTZ;
ALTER TABLE public.requisicao_compras ADD COLUMN IF NOT EXISTS cotacao_comprador_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL;
ALTER TABLE public.requisicao_compras ADD COLUMN IF NOT EXISTS cotacao_comprador_nome TEXT;

-- 3. Add eh_comprador column to colaboradores
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS eh_comprador BOOLEAN DEFAULT false;

-- 4. Create sequence and helper function for atomic request numbering
CREATE SEQUENCE IF NOT EXISTS req_compras_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.proximo_numero_requisicao()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
  v_numero TEXT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_seq := nextval('req_compras_seq');
  v_numero := 'REQ-' || v_year || '-' || lpad(v_seq::text, 4, '0');
  RETURN v_numero;
END;
$$;
