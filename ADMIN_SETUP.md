# Configuração do Administrador Geral (Admin Setup) — TechControl

Este guia descreve como inicializar o primeiro usuário administrador no sistema **TechControl** para obter acesso total ao painel administrativo e de TI.

---

## 🔑 Credenciais Homologadas para Produção

O primeiro usuário do sistema deve possuir as seguintes credenciais para acesso de superadministrador:

*   **E-mail:** `adm.sp1@interlub.com`
*   **Senha:** `Juf64161`
*   **Nível de Acesso:** Administrador Geral (`role = 'admin'`)

---

## 🛠️ Método de Criação via Banco de Dados (Recomendado)

O script SQL de criação automática está salvo na raiz do projeto como **`create_admin.sql`**. Ele cria o registro do usuário com a criptografia correta na tabela de autenticação interna do Supabase e sincroniza o perfil do usuário como `'admin'`.

### Passo a Passo de Execução:
1.  Acesse o painel web do seu projeto no **[Supabase](https://supabase.com)**.
2.  No menu lateral esquerdo, clique em **SQL Editor**.
3.  Clique em **New Query** para abrir uma aba em branco.
4.  Copie e cole o conteúdo do arquivo **`create_admin.sql`** (mostrado abaixo):

```sql
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
```

5.  Clique no botão **Run** no canto inferior direito para rodar o script.
6.  O painel do SQL Editor confirmará o sucesso da transação. O usuário já pode logar no painel administrativo `/login` usando a senha fornecida.
