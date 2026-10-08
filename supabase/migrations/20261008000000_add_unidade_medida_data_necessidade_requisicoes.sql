-- Migration: 20261008000000_add_unidade_medida_data_necessidade_requisicoes.sql
-- Description: Adiciona campos unidade_medida e data_necessidade na tabela requisicao_compras

ALTER TABLE public.requisicao_compras 
  ADD COLUMN IF NOT EXISTS unidade_medida TEXT,
  ADD COLUMN IF NOT EXISTS data_necessidade DATE;

-- OBRIGATÓRIO (conforme regra do projeto TechControl / MANIFESTO.md):
-- Notificar PostgREST para recarregar o schema cache imediatamente
NOTIFY pgrst, 'reload schema';
