-- ============================================================
-- MIGRATION: Remover restrição UNIQUE da coluna email em colaboradores
-- ============================================================

ALTER TABLE colaboradores DROP CONSTRAINT IF EXISTS colaboradores_email_key;
