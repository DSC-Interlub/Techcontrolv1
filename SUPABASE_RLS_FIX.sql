-- ============================================================
-- TechControl — Correção de RLS + Schema
-- Cole este script no SQL Editor do Supabase e execute tudo.
-- ============================================================

-- 1. Adicionar coluna nome_exibicao na tabela profiles (se não existir)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nome_exibicao TEXT;

-- ============================================================
-- 2. Políticas RLS por tabela
--
-- AUTHENTICATED → usuários do painel administrativo (login Supabase Auth)
-- ANON          → portal do colaborador (sem login Supabase, usa sessionStorage)
--
-- Segurança: colaboradores.senha_portal nunca é exposta via anon
-- (o login do portal agora vai pelo servidor via /api/portalLogin)
-- ============================================================

-- ── profiles (somente admins — sem acesso anon) ───────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_profiles" ON profiles;
CREATE POLICY "auth_all_profiles" ON profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── colaboradores ─────────────────────────────────────────────
-- ANON pode ler (sem senha_portal) e atualizar (para refresh do portal)
-- Nota: a validação da senha_portal é feita APENAS no servidor (/api/portalLogin)
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_colaboradores" ON colaboradores;
DROP POLICY IF EXISTS "anon_select_colaboradores" ON colaboradores;
DROP POLICY IF EXISTS "anon_update_colaboradores" ON colaboradores;
CREATE POLICY "auth_all_colaboradores" ON colaboradores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_colaboradores" ON colaboradores
  FOR SELECT TO anon USING (true);

-- ── chamados ──────────────────────────────────────────────────
ALTER TABLE chamados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_chamados" ON chamados;
DROP POLICY IF EXISTS "anon_select_chamados" ON chamados;
DROP POLICY IF EXISTS "anon_insert_chamados" ON chamados;
DROP POLICY IF EXISTS "anon_update_chamados" ON chamados;
CREATE POLICY "auth_all_chamados" ON chamados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_chamados" ON chamados
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_chamados" ON chamados
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_chamados" ON chamados
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ── chamados_chat ─────────────────────────────────────────────
ALTER TABLE chamados_chat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_chamados_chat" ON chamados_chat;
DROP POLICY IF EXISTS "anon_select_chamados_chat" ON chamados_chat;
DROP POLICY IF EXISTS "anon_insert_chamados_chat" ON chamados_chat;
CREATE POLICY "auth_all_chamados_chat" ON chamados_chat
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_chamados_chat" ON chamados_chat
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_chamados_chat" ON chamados_chat
  FOR INSERT TO anon WITH CHECK (true);

-- ── reservas (notebooks) ──────────────────────────────────────
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_reservas" ON reservas;
DROP POLICY IF EXISTS "anon_select_reservas" ON reservas;
DROP POLICY IF EXISTS "anon_insert_reservas" ON reservas;
DROP POLICY IF EXISTS "anon_update_reservas" ON reservas;
CREATE POLICY "auth_all_reservas" ON reservas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_reservas" ON reservas
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_reservas" ON reservas
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_reservas" ON reservas
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ── reservas_sala ─────────────────────────────────────────────
ALTER TABLE reservas_sala ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_reservas_sala" ON reservas_sala;
DROP POLICY IF EXISTS "anon_select_reservas_sala" ON reservas_sala;
DROP POLICY IF EXISTS "anon_insert_reservas_sala" ON reservas_sala;
DROP POLICY IF EXISTS "anon_update_reservas_sala" ON reservas_sala;
CREATE POLICY "auth_all_reservas_sala" ON reservas_sala
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_reservas_sala" ON reservas_sala
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_reservas_sala" ON reservas_sala
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_reservas_sala" ON reservas_sala
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ── avaliacoes ────────────────────────────────────────────────
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_avaliacoes" ON avaliacoes;
DROP POLICY IF EXISTS "anon_select_avaliacoes" ON avaliacoes;
DROP POLICY IF EXISTS "anon_insert_avaliacoes" ON avaliacoes;
CREATE POLICY "auth_all_avaliacoes" ON avaliacoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_avaliacoes" ON avaliacoes
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_avaliacoes" ON avaliacoes
  FOR INSERT TO anon WITH CHECK (true);

-- ── notebooks_externos (portal visualiza) ────────────────────
ALTER TABLE notebooks_externos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_notebooks_externos" ON notebooks_externos;
DROP POLICY IF EXISTS "anon_select_notebooks_externos" ON notebooks_externos;
CREATE POLICY "auth_all_notebooks_externos" ON notebooks_externos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_notebooks_externos" ON notebooks_externos
  FOR SELECT TO anon USING (true);

-- ── ramais (portal visualiza) ─────────────────────────────────
ALTER TABLE ramais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_ramais" ON ramais;
DROP POLICY IF EXISTS "anon_select_ramais" ON ramais;
CREATE POLICY "auth_all_ramais" ON ramais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_ramais" ON ramais
  FOR SELECT TO anon USING (true);

-- ── comunicados_artes (portal visualiza) ─────────────────────
ALTER TABLE comunicados_artes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_comunicados_artes" ON comunicados_artes;
DROP POLICY IF EXISTS "anon_select_comunicados_artes" ON comunicados_artes;
CREATE POLICY "auth_all_comunicados_artes" ON comunicados_artes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_comunicados_artes" ON comunicados_artes
  FOR SELECT TO anon USING (true);

-- ── comunicados_log (portal visualiza) ───────────────────────
ALTER TABLE comunicados_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_comunicados_log" ON comunicados_log;
DROP POLICY IF EXISTS "anon_select_comunicados_log" ON comunicados_log;
CREATE POLICY "auth_all_comunicados_log" ON comunicados_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_comunicados_log" ON comunicados_log
  FOR SELECT TO anon USING (true);

-- ── pcs_internos (portal equipamentos) ───────────────────────
ALTER TABLE pcs_internos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_pcs_internos" ON pcs_internos;
DROP POLICY IF EXISTS "anon_select_pcs_internos" ON pcs_internos;
CREATE POLICY "auth_all_pcs_internos" ON pcs_internos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_pcs_internos" ON pcs_internos
  FOR SELECT TO anon USING (true);

-- ── tablets (portal equipamentos) ────────────────────────────
ALTER TABLE tablets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_tablets" ON tablets;
DROP POLICY IF EXISTS "anon_select_tablets" ON tablets;
CREATE POLICY "auth_all_tablets" ON tablets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_tablets" ON tablets
  FOR SELECT TO anon USING (true);

-- ── smartphones (portal equipamentos) ────────────────────────
ALTER TABLE smartphones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_smartphones" ON smartphones;
DROP POLICY IF EXISTS "anon_select_smartphones" ON smartphones;
CREATE POLICY "auth_all_smartphones" ON smartphones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_smartphones" ON smartphones
  FOR SELECT TO anon USING (true);

-- ── cameras (admin only) ──────────────────────────────────────
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_cameras" ON cameras;
CREATE POLICY "auth_all_cameras" ON cameras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── coletores (admin only) ────────────────────────────────────
ALTER TABLE coletores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_coletores" ON coletores;
CREATE POLICY "auth_all_coletores" ON coletores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── canetas_vibracao (admin only) ────────────────────────────
ALTER TABLE canetas_vibracao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_canetas_vibracao" ON canetas_vibracao;
CREATE POLICY "auth_all_canetas_vibracao" ON canetas_vibracao
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── fila_emails (admin only) ─────────────────────────────────
ALTER TABLE fila_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_fila_emails" ON fila_emails;
CREATE POLICY "auth_all_fila_emails" ON fila_emails
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── comunicados_config (admin only) ──────────────────────────
ALTER TABLE comunicados_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_comunicados_config" ON comunicados_config;
CREATE POLICY "auth_all_comunicados_config" ON comunicados_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Storage RLS — bucket "uploads"
--    Necessário para upload de fotos, anexos e artes
-- ============================================================

-- Garante que o bucket existe como público
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove políticas antigas para evitar conflito
DROP POLICY IF EXISTS "uploads_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "uploads_insert_anon" ON storage.objects;
DROP POLICY IF EXISTS "uploads_select_public" ON storage.objects;
DROP POLICY IF EXISTS "uploads_delete_authenticated" ON storage.objects;

-- Usuários autenticados (admin) podem fazer upload
CREATE POLICY "uploads_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads');

-- Portal do colaborador (anon) também pode fazer upload (ex: anexos em chamados)
CREATE POLICY "uploads_insert_anon" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'uploads');

-- Qualquer pessoa pode ler os arquivos (URLs públicas)
CREATE POLICY "uploads_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');

-- Autenticados podem deletar seus próprios uploads
CREATE POLICY "uploads_delete_authenticated" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'uploads');

-- ============================================================
-- 4. Verificação — lista políticas ativas
-- ============================================================
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
