-- Migration: 20261013000000_add_coffee_break_reservas_sala.sql
-- Description: Adiciona campos de solicitação de coffee break na tabela reservas_sala

ALTER TABLE public.reservas_sala 
  ADD COLUMN IF NOT EXISTS precisa_coffee_break BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS qtd_pessoas_coffee INTEGER,
  ADD COLUMN IF NOT EXISTS coffee_break_observacoes TEXT;

-- OBRIGATÓRIO (conforme regra do projeto TechControl / MANIFESTO.md):
-- Notificar PostgREST para recarregar o schema cache imediatamente
NOTIFY pgrst, 'reload schema';
