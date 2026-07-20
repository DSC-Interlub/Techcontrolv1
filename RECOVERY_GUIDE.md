# Guia de Recuperação de Desastres (Disaster Recovery) — TechControl

Este documento descreve os procedimentos de contingência e recuperação em cenários extremos, como corrupção de banco de dados, perda de chaves de API, vazamento de credenciais ou exclusão acidental de arquivos de Storage.

---

## 1. Backup e Restauração do Banco de Dados (PostgreSQL)

O Supabase realiza backups diários automatizados nos planos pagos. Porém, para maior segurança ou antes de realizar alterações estruturais severas, execute backups manuais.

### Passo 1.1: Efetuando Backup Manual dos Dados e Estrutura
Utilize a ferramenta padrão do PostgreSQL `pg_dump`. Certifique-se de possuir a ferramenta instalada em sua máquina (inclusa no pacote do PostgreSQL Client).

*   **Para fazer backup completo (esquema + dados):**
    ```bash
    pg_dump -h db.seu-project-ref.supabase.co -U postgres -d postgres -F c -b -v -f techcontrol_backup_complet.dump
    ```
    *Digite a senha do banco de dados quando solicitada.*

*   **Para fazer backup apenas dos dados das tabelas públicas (Seed de segurança):**
    ```bash
    pg_dump -h db.seu-project-ref.supabase.co -U postgres -d postgres --data-only --schema=public -f techcontrol_somente_dados.sql
    ```

### Passo 1.2: Restaurando o Banco de Dados
Caso precise subir o backup em um banco limpo ou após exclusão acidental de linhas:

*   **Restaurar arquivo .dump (Backup Binário Compilado):**
    ```bash
    pg_restore -h db.seu-project-ref.supabase.co -U postgres -d postgres -v techcontrol_backup_complet.dump
    ```
*   **Restaurar script .sql direto (Backup de texto plano):**
    ```bash
    psql -h db.seu-project-ref.supabase.co -U postgres -d postgres -f techcontrol_somente_dados.sql
    ```

---

## 2. Backup e Recuperação de Arquivos do Storage (Uploads)

Os arquivos enviados pelo portal (anexos de chamados) não são copiados no backup do PostgreSQL (`pg_dump` copia apenas as referências de texto/URLs).

### Passo 2.1: Sincronização e Download dos Arquivos de Storage
Caso necessite fazer backup físico de todos os arquivos salvos no bucket `uploads`:

1.  No painel do Supabase, vá na aba **Storage** ➡️ selecione o bucket `uploads`.
2.  Infelizmente, o painel do Supabase não possui botão "Download All" nativo para buckets grandes.
3.  **Solução automatizada via CLI:**
    Utilize um script Node.js ou a API do Supabase para varrer a tabela `storage.objects` e baixar as mídias via fetch para uma pasta local de backup.

### Passo 2.2: Restaurando Storage em Outro Projeto
Caso precise migrar os arquivos para outro bucket:

1.  Crie o bucket com o nome `uploads` no novo projeto e defina-o como público.
2.  Suba as mídias salvas no backup via painel do Supabase ou execute chamadas em lote utilizando o SDK de storage:
    ```javascript
    await supabase.storage.from('uploads').upload('caminho_do_arquivo.jpg', fileBody);
    ```

---

## 3. Recuperação de Acesso e Contas Administrativas

Se o administrador de TI perder o acesso à sua conta de email ou esquecer a senha mestra de acesso ao Dashboard:

### Método 3.1: Criação de um Novo Administrador Manualmente (SQL)
Caso perca o acesso e precise registrar um novo e-mail com a permissão de administrador (`admin`) sem passar pelo fluxo web:

1.  Crie a conta normalmente com o e-mail no painel do Supabase Auth (Users ➡️ Add User) ou via tela de Login utilizando o convite.
2.  Copie o ID do usuário (UUID) gerado na lista de usuários.
3.  Acesse o **SQL Editor** do Supabase e execute a query para forçar o nível administrativo:
    ```sql
    UPDATE public.profiles
    SET role = 'admin', nome_exibicao = 'Administrador de Recuperação'
    WHERE id = 'COLE_O_UUID_AQUI';
    ```
4.  *O acesso administrativo será liberado na próxima sessão do usuário.*

---

## 4. Vazamento de Credenciais e Rotação de Chaves de API

Caso as chaves privadas do sistema sejam expostas em repositórios públicos ou vazadas para terceiros, execute imediatamente o protocolo de rotação de credenciais:

### Passo 4.1: Rotacionar Chaves do Supabase
1.  Acesse o painel do Supabase ➡️ **Project Settings** ➡️ **API**.
2.  Role até a seção **JWT Settings** e localize o campo **JWT Secret**.
3.  Clique em **Change JWT Secret** ➡️ selecione a opção de geração automática de uma nova secret.
4.  **Atenção:** Isso invalidará todas as chaves anônimas (`anon`) e chaves de serviço (`service_role`) geradas anteriormente.
5.  Copie as novas chaves geradas em **Project API Keys** (`anon` e `service_role`).
6.  Atualize **imediatamente** as variáveis de ambiente na Vercel (`VITE_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`) e execute um novo deploy.
7.  Atualize o arquivo `.env.local` dos desenvolvedores locais.

### Passo 4.2: Rotacionar Chave do Resend
1.  Acesse o painel do Resend ➡️ **API Keys**.
2.  Delete a chave vazada clicando no ícone de lixeira.
3.  Clique em **Create API Key**, configure a nova chave com permissão de envio e copie o valor.
4.  Atualize o valor de `RESEND_API_KEY` na Vercel e salve as configurações.
