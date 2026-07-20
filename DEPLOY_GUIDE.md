# Guia de Implantação Geral (Deploy) — TechControl

Este documento consolida o roteiro definitivo para colocar o sistema **TechControl** em produção. Ele amarra todas as etapas de banco de dados (Supabase), servidor de disparo de e-mails (Resend) e hospedagem frontend/backend (Vercel).

---

## 🚀 Roteiro de Implantação (Passo a Passo)

```
┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
│   1. CONFIG SUPABASE   │ ──> │    2. CONFIG RESEND    │ ──> │    3. DEPLOY VERCEL    │
│  - Criar Projeto       │     │  - Registrar Domínio   │     │  - Importar Repositório│
│  - Executar Migrations │     │  - Gerar API Key       │     │  - Configurar Env Vars │
│  - Ativar Storage      │     │  - Validar Remetente   │     │  - Apontar DNS & SSL   │
└────────────────────────┘     └────────────────────────┘     └────────────────────────┘
```

---

## 1. Etapa 1: Banco de Dados & Infraestrutura (Supabase)

Antes de rodar o aplicativo, precisamos garantir que o PostgreSQL esteja modelado com as tabelas e regras de segurança corretas.

1.  Crie um novo projeto no [Supabase](https://supabase.com).
2.  Instale a CLI localmente, vincule ao seu projeto remoto e aplique as migrations:
    ```bash
    npm install -g supabase
    supabase login
    supabase link --project-ref seu-project-ref
    supabase db push
    ```
3.  Acesse o painel do Supabase ➡️ **SQL Editor** ➡️ certifique-se de que todas as 22 tabelas, as views e as migrations foram aplicadas com sucesso.
4.  Execute o script **`create_admin.sql`** no SQL Editor para criar o primeiro usuário administrador com a senha `Juf64161` (veja [ADMIN_SETUP.md](file:///c:/techcontrol/Techcontrolv1-main/ADMIN_SETUP.md)).
5.  Ative a extensão **`pg_cron`** nas configurações de banco e agende a stored procedure `gerar_demandas_comunicados()` conforme o manual **[SUPABASE_BACKEND_ARCHITECTURE.md](file:///c:/techcontrol/Techcontrolv1-main/SUPABASE_BACKEND_ARCHITECTURE.md)**.
6.  Certifique-se de que a extensão `pgcrypto` esteja ativa e que o bucket `uploads` esteja configurado como público na aba **Storage**.

---

## 2. Etapa 2: Provedor de E-mails (Resend)

O TechControl dispara e-mails transacionais para notificar gestores sobre chamados e requisições de compras pendentes.

1.  Acesse o painel do [Resend](https://resend.com) e crie uma conta.
2.  Acesse a aba **Domains** e clique em **Add Domain**. Registre o domínio definitivo **`techcontrol.site`**.
3.  Insira os registros DNS tipo **MX**, **TXT** e **CNAME** gerados pelo Resend no seu gerenciador de DNS (Ionos) para validar e autenticar o remetente de e-mails (isso evita que seus e-mails caiam na caixa de SPAM). Consulte **[DOMAIN_CONFIGURATION.md](file:///c:/techcontrol/Techcontrolv1-main/DOMAIN_CONFIGURATION.md)**.
4.  Após a validação do domínio estar ativa (`Verified`), vá para a aba **API Keys**, crie uma chave de API com permissão de escrita e salve-a para configurar na Vercel (`RESEND_API_KEY`).

---

## 3. Etapa 3: Hospedagem & Compilação (Vercel)

Com o banco e os e-mails prontos, publicamos o código compilado da aplicação.

1.  Faça login no painel da [Vercel](https://vercel.com) e importe o repositório `DSC-Interlub/Techcontrolv1`.
2.  Configure o projeto como preset **Vite**, apontando o diretório de build para `dist`.
3.  Preencha as variáveis de ambiente necessárias (descritas no arquivo [ENVIRONMENT_VARIABLES.md](file:///c:/techcontrol/Techcontrolv1-main/ENVIRONMENT_VARIABLES.md)).
4.  Execute o deploy. A Vercel gerará o link da aplicação pública.
5.  Nas configurações do projeto na Vercel, aba **Domains**, adicione o domínio definitivo **`techcontrol.site`** e configure os apontamentos DNS descritos no manual de domínios.

---

## 4. Diagnóstico de Funcionamento & Homologação

Consulte o manual de homologação **[TEST_REPORT.md](file:///c:/techcontrol/Techcontrolv1-main/TEST_REPORT.md)** para o roteiro completo com os 18 cenários de validação e verificação de integridade operacional do sistema.
