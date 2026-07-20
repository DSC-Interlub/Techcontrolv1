-- Script SQL Corrigido para Criação do Primeiro Usuário Administrador no Supabase
-- E-mail: adm.sp1@interlub.com
-- Senha: Juf64161

DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  password_hash TEXT := crypt('Juf64161', gen_salt('bf'));
  user_exists BOOLEAN;
BEGIN
  -- 1. Remove qualquer resquício anterior para evitar registros corrompidos/incompletos
  DELETE FROM auth.users WHERE email = 'adm.sp1@interlub.com';

  -- 2. Insere o usuário na tabela interna do Supabase Auth com todos os campos de texto inicializados
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_token_current,
    email_change,
    phone,
    phone_change,
    phone_change_token,
    reauthentication_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'adm.sp1@interlub.com',
    password_hash,
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Administrador Geral"}'::jsonb,
    NOW(),
    NOW(),
    '', -- confirmation_token
    '', -- recovery_token
    '', -- email_change_token_new
    '', -- email_change_token_current
    '', -- email_change
    '', -- phone
    '', -- phone_change
    '', -- phone_change_token
    ''  -- reauthentication_token
  );

  -- 3. Garante a criação do registro correspondente em public.profiles
  -- (O trigger handle_new_user cria automaticamente, mas fazemos o upsert para garantir a role 'admin')
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new_user_id, 'adm.sp1@interlub.com', 'Administrador Geral', 'admin')
  ON CONFLICT (id) DO UPDATE 
  SET role = 'admin', full_name = 'Administrador Geral';

  RAISE NOTICE 'Usuário administrador inicializado com sucesso e livre de NULLs.';
END $$;
