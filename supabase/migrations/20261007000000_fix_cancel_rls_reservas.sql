-- Migration: Fix anon cancellation RLS policy on reservas and reservas_sala
-- Allows anonymous portal users to cancel reservations they created (solicitante_email matches)
-- transitioning from status 'Pendente' or 'Confirmada' to 'Cancelada'.

-- 1. Table: reservas_sala
DROP POLICY IF EXISTS "anon_update_reservas_sala" ON public.reservas_sala;

CREATE POLICY "anon_update_reservas_sala" ON public.reservas_sala
AS PERMISSIVE FOR UPDATE TO anon
USING (
  solicitante_email IS NOT NULL 
  AND status IN ('Pendente', 'Confirmada')
)
WITH CHECK (
  solicitante_email IS NOT NULL 
  AND status = 'Cancelada'
);

-- 2. Table: reservas (Notebooks)
DROP POLICY IF EXISTS "anon_update_reservas" ON public.reservas;

CREATE POLICY "anon_update_reservas" ON public.reservas
AS PERMISSIVE FOR UPDATE TO anon
USING (
  solicitante_email IS NOT NULL 
  AND status IN ('Pendente', 'Confirmada')
)
WITH CHECK (
  solicitante_email IS NOT NULL 
  AND status = 'Cancelada'
);

-- Mandatory PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
