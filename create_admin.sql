-- Script SQL para Criação do Primeiro Usuário Administrador no Supabase
-- E-mail: adm.sp1@interlub.com
-- Senha: Juf64161

DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  password_hash TEXT := crypt('Juf64161', gen_salt('bf'));
  user_exists BOOLEAN;
BEGIN
  -- 1. Verifica se o usuário já existe no auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'adm.sp1@interlub.com') INTO user_exists;

  IF NOT user_exists THEN
    -- 2. Insere o usuário na tabela interna do Supabase Auth
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
      updated_at
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
      NOW()
    );

    -- 3. Atualiza a role para 'admin' no public.profiles
    -- (O trigger handle_new_user já insere automaticamente o registro na tabela profiles como 'user')
    UPDATE public.profiles
    SET role = 'admin', full_name = 'Administrador Geral'
    WHERE id = new_user_id;

    RAISE NOTICE 'Usuário administrador criado com sucesso no Supabase Auth.';
  ELSE
    -- Se o usuário já existe, garante que ele tenha o privilégio 'admin' no profiles
    UPDATE public.profiles
    SET role = 'admin'
    WHERE email = 'adm.sp1@interlub.com';

    RAISE NOTICE 'Usuário já existia. Permissão de "admin" atualizada.';
  END IF;
END $$;
