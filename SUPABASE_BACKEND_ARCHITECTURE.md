# Arquitetura de Backend no Supabase — TechControl

Este documento detalha o papel do **Supabase** como backend oficial do sistema, explicando a lógica das stored procedures (PL/pgSQL), agendamentos via `pg_cron` e políticas de segurança RLS.

---

## 1. RPC / Stored Procedure (`gerar_demandas_comunicados`)

A lógica de geração mensal de demandas de artes foi migrada da Vercel para rodar diretamente dentro do PostgreSQL. Ela foi registrada sob o esquema `public` com segurança `SECURITY DEFINER` (executa com privilégios de administrador para contornar restrições RLS durante a rotina agendada).

### Código DDL Registrado:
O código completo está salvo e versionado no arquivo de migração **[20260720123756_add_gerar_demandas_rpc.sql](file:///c:/techcontrol/Techcontrolv1-main/supabase/migrations/20260720123756_add_gerar_demandas_rpc.sql)**.

---

## 2. Agendamento de Tarefas no Banco via `pg_cron`

O Supabase suporta a execução de tarefas agendadas nativas através da extensão PostgreSQL `pg_cron`. 

### Passo 2.1: Ativar a Extensão no Painel do Supabase
1.  Acesse o painel do seu projeto no Supabase.
2.  Vá em **Database** ➡️ **Extensions** ➡️ busque por `cron` e ative a extensão **`pg_cron`**.

### Passo 2.2: Configurar o Agendamento Mensal
Acesse o **SQL Editor** do Supabase e execute a query abaixo para agendar a geração automática das demandas no dia 1º de cada mês às 09:00:
```sql
SELECT cron.schedule(
  'gerar_demandas_comunicados_mensal',
  '0 9 1 * *',
  'SELECT public.gerar_demandas_comunicados(false)'
);
```

---

## 3. Segurança e Políticas RLS da Tabela de Perfis (`profiles`)

Para desativar a API `/api/listarUsuarios` com segurança, a tabela `profiles` (que espelha as credenciais administrativas e de TI) foi protegida com Row Level Security (RLS) restritiva no PostgreSQL.

### Política Aplicada:
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Permite que usuários autenticados com o cargo de 'admin' leiam todos os perfis cadastrados
CREATE POLICY "admin_select_all_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);
```

Com esta política ativada, quando o cliente realiza a query direta no frontend React:
```javascript
const { data } = await supabase.from('profiles').select('*');
```
O Supabase injeta automaticamente a checagem de UUID (`auth.uid()`) no banco de dados e retorna os dados **apenas** se o usuário logado possuir a role de administrador. Se for um colaborador de nível inferior, o banco retorna um array vazio.
