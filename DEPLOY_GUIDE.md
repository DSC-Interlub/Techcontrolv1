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
3.  Acesse o painel do Supabase ➡️ **SQL Editor** ➡️ certifique-se de que todas as 22 tabelas e as views `visao_patrimonio_consolidado` e `chamados_ativos_solicitantes` foram criadas com sucesso.
4.  Certifique-se de que a extensão `pgcrypto` e `uuid-ossp` estejam ativadas e que o bucket `uploads` esteja listado como público na aba **Storage**.

---

## 2. Etapa 2: Provedor de E-mails (Resend)

O TechControl dispara e-mails transacionais para notificar gestores sobre chamados e requisições de compras pendentes.

1.  Acesse o painel do [Resend](https://resend.com) e crie uma conta.
2.  Acesse a aba **Domains** e clique em **Add Domain**. Registre o domínio da sua empresa (ex: `techcontrol.site` ou `interlub.com`).
3.  Insira os registros DNS tipo **MX**, **TXT** e **CNAME** gerados pelo Resend no seu gerenciador de DNS (Cloudflare, GoDaddy, Registro.br) para validar e autenticar o remetente de e-mails (isso evita que seus e-mails caiam na caixa de SPAM).
4.  Após a validação do domínio estar ativa (`Verified`), vá para a aba **API Keys**, crie uma chave de API com permissão de escrita e salve-a para configurar na Vercel (`RESEND_API_KEY`).

---

## 3. Etapa 3: Hospedagem & Compilação (Vercel)

Com o banco e os e-mails prontos, publicamos o código compilado da aplicação.

1.  Faça login no painel da [Vercel](https://vercel.com) e importe o repositório `DSC-Interlub/Techcontrolv1`.
2.  Configure o projeto como preset **Vite**, apontando o diretório de build para `dist`.
3.  Preencha as variáveis de ambiente necessárias (descritas no arquivo [ENVIRONMENT_VARIABLES.md](file:///c:/techcontrol/Techcontrolv1-main/ENVIRONMENT_VARIABLES.md)).
4.  Execute o deploy. A Vercel gerará o link da aplicação pública.
5.  Configure o apontamento do subdomínio CNAME da sua empresa nas configurações de domínio da Vercel.

---

## 4. Diagnóstico de Funcionamento & Homologação

Para certificar-se de que tudo está rodando em produção sem falhas, siga este roteiro de testes práticos:

### Teste 1: Fluxo de Autenticação Administrativa
*   Entre na rota `/login`.
*   Tente logar com um e-mail não registrado. O sistema deve barrar com erro amigável de acesso.
*   Solicite recuperação de senha informando o e-mail cadastrado e valide se o e-mail contendo o link chega na caixa de entrada.
*   Acesse o link recebido, insira uma nova senha e confirme o redirecionamento.

### Teste 2: Criação de Colaboradores e Sincronia de Senha
*   Acesse a aba **Colaboradores** no painel administrativo e clique em **Novo Colaborador**.
*   Insira dados de teste (incluindo e-mail corporativo válido) e defina uma senha inicial do portal. Marque a flag "Senha Precisa Trocar".
*   Abra uma guia anônima no navegador e acesse `/portal-login`.
*   Insira as credenciais do colaborador criado. O portal deve exigir obrigatoriamente a troca da senha inicial por uma nova senha pessoal de pelo menos 6 dígitos.
*   Confirme a alteração e certifique-se de que a sessão no `sessionStorage` foi salva com sucesso redirecionando para `/portal`.

### Teste 3: Abertura de Chamado e Disparo de E-mail
*   No Portal do Colaborador, clique em **Abrir Chamado**. Preencha o formulário e faça upload de um anexo.
*   Valide se o anexo foi enviado para o Supabase Storage e se a imagem/documento carrega corretamente na tela.
*   Verifique se o e-mail de confirmação chegou no e-mail do colaborador e se o e-mail de alerta de chamado aberto chegou no e-mail do administrador do TI (`adm.sp1@interlub.com`).
*   No painel administrativo, abra o chamado e envie uma mensagem no chat. Verifique se o colaborador recebe um aviso por e-mail com a mensagem digitada.
