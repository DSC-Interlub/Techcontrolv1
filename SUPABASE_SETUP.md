# Guia de Configuração do Supabase — TechControl

Este guia fornece um passo a passo detalhado e prático para provisionar e configurar toda a infraestrutura de banco de dados, autenticação, storage e segurança no Supabase do zero.

---

## 1. Criação do Projeto no Supabase

1.  Acesse o painel do [Supabase](https://supabase.com) e faça login.
2.  Clique em **New Project** (Novo Projeto) e selecione sua organização.
3.  Preencha as informações:
    *   **Name:** `TechControl`
    *   **Database Password:** *Defina uma senha forte e salve-a com segurança.*
    *   **Region:** Escolha uma região próxima aos seus usuários (ex: `sa-east-1` - São Paulo, ou `us-east-1` - Virgínia para melhor latência com a Vercel).
    *   **Pricing Plan:** Escolha o plano adequado (o plano Free é suficiente para testes e homologação).
4.  Clique em **Create New Project**. O processo de inicialização do banco de dados PostgreSQL leva cerca de 2 minutos.

---

## 2. Configurando a CLI e Versionando o Banco

O Supabase CLI permite gerenciar a estrutura do banco via código (Migrations), mantendo a rastreabilidade e histórico do banco de dados.

### Passo 2.1: Instalação da CLI
Abra o seu terminal (PowerShell no Windows ou Bash no macOS/Linux) e instale a CLI globalmente:

*   **Via npm (Recomendado):**
    ```bash
    npm install -g supabase
    ```
*   **Via Windows Scoop:**
    ```powershell
    scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
    scoop install supabase
    ```
*   **Via macOS Homebrew:**
    ```bash
    brew install supabase/tap/supabase
    ```

### Passo 2.2: Login na CLI
Gere um Token de Acesso pessoal no painel do Supabase (Account Settings ➡️ Access Tokens) e execute o comando:
```bash
supabase login
```
*Cole o token gerado quando solicitado.*

### Passo 2.3: Inicialização do Repositório Supabase
Na raiz do seu projeto local `Techcontrolv1-main`, inicialize a CLI:
```bash
supabase init
```
*Isso criará uma pasta chamada `/supabase` com as pastas de configurações.*

### Passo 2.4: Vinculando ao Projeto na Nuvem (Link)
Obtenha a **Project Reference** nas configurações do projeto no painel do Supabase (Project Settings ➡️ General). Vincule o projeto local ao remoto:
```bash
supabase link --project-ref seu-project-ref
```
*Digite a senha do banco de dados criada no Passo 1 quando solicitado.*

---

## 3. Aplicando as Migrations e Criando as Tabelas

As migrations do projeto já estão salvas na pasta `supabase/migrations/20260720000000_init_database.sql`.

### Passo 3.1: Enviar o Banco de Dados para a Nuvem
Para aplicar todas as definições físicas (tabelas, chaves, triggers, views, RLS e dados de seed) diretamente ao seu banco de dados remoto no Supabase:
```bash
supabase db push
```
*Esse comando lê os scripts dentro de `/supabase/migrations/` e os aplica sequencialmente, garantindo que o banco de dados remoto fique idêntico ao local.*

---

## 4. Configuração das Políticas de Segurança (RLS)

A Segurança em Nível de Linha (RLS) é ativada automaticamente pelo script de migração. O comportamento das políticas de segurança define quem pode ler e escrever no banco:

*   **Role `authenticated` (Usuários de TI com Login no Painel):**
    Permissão total (`ALL`) para interagir com qualquer tabela ou recurso, pois são usuários validados.
*   **Role `anon` (Funcionários logados no Portal do Colaborador):**
    *   Leitura (`SELECT`) irrestrita nas tabelas de infraestrutura (`pcs_internos`, `notebooks_externos`, `smartphones`, `tablets`, `ramais`, `centros_custo`, `colaboradores`).
    *   Escrita e atualização (`INSERT` / `UPDATE`) nas tabelas transacionais (`chamados`, `chamados_chat`, `reservas`, `reservas_sala`, `avaliacoes` e `requisicao_compras`) permitindo a solicitação de equipamentos, interação em chats e checklists técnicos.

Se precisar forçar a re-aplicação manual das políticas no painel SQL do Supabase, o código completo está documentado em **[init_database.sql](file:///c:/techcontrol/Techcontrolv1-main/init_database.sql#L780-L872)**.

---

## 5. Criação e Configuração dos Buckets (Storage)

O sistema necessita de uma pasta para upload de imagens de chamados e artes de comunicados.

### Criação via Script (Automatizada)
A migração já executa o comando SQL para registrar o bucket:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);
```

### Configuração de Segurança de Storage
Para garantir que as políticas RLS permitam o envio de arquivos por usuários autenticados e colaboradores anônimos (solicitando chamados), as seguintes regras foram configuradas nas tabelas de objetos do Supabase:

1.  **Inserção para Autenticados:** Permite que administradores enviem anexos.
2.  **Inserção para Anônimos:** Permite que funcionários no portal façam upload de anexos de chamados ou fotos.
3.  **Leitura Pública:** Qualquer pessoa com o link gerado pode visualizar as imagens ou PDFs salvos.

---

## 6. Sincronização de Autenticação com Triggers

Para evitar o armazenamento de senhas em texto plano, o portal do colaborador foi integrado à tabela interna `auth.users` do Supabase Auth.
*   Quando o administrador de TI cria um colaborador no painel administrativo, o banco de dados encripta a senha temporária usando `crypt()` com um salt via extensão `pgcrypto`.
*   O trigger automático `on_auth_user_created` sincroniza a inserção e espelha os metadados do usuário para a tabela `profiles` em tempo real.

---

## 7. Validação da Infraestrutura

Para verificar se a estrutura foi enviada e compilada corretamente no Supabase, execute o comando de diagnóstico da CLI:
```bash
supabase db lint
```
Se tudo estiver correto, o terminal não exibirá nenhum erro de sintaxe ou inconsistências de chaves estrangeiras.
