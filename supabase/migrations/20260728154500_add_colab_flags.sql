-- Adicionar flags de Ramal e Equipamento no cadastro de colaboradores
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS necessita_ramal BOOLEAN DEFAULT true;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS necessita_equipamento BOOLEAN DEFAULT true;
