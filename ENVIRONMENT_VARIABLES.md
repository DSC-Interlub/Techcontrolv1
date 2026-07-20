# Guia de Variáveis de Ambiente — TechControl

Este documento descreve detalhadamente todas as variáveis de ambiente necessárias para o correto funcionamento do ecossistema do **TechControl**, divididas entre o frontend (React/Vite) e o backend (Vercel Serverless/Node.js).

---

## 1. Visão Geral

As variáveis de ambiente são cruciais para desacoplar as chaves de API e URLs de conexão do código-fonte. O sistema utiliza chaves públicas no frontend e credenciais de alto privilégio no backend para proteção de dados contra engenharia reversa.

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                       │
│  - VITE_SUPABASE_URL (Pública)                                  │
│  - VITE_SUPABASE_ANON_KEY (Pública, respeita RLS)               │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Vercel API)                     │
│  - SUPABASE_URL (Conexão do Servidor)                           │
│  - SUPABASE_SERVICE_ROLE_KEY (Bypassa RLS — Privada)            │
│  - RESEND_API_KEY (Envio de E-mails — Privada)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Variáveis do Frontend (Vite)

Essas variáveis são injetadas no bundle cliente durante o build de produção. No Vite, elas devem obrigatoriamente começar com o prefixo `VITE_` para que sejam expostas via `import.meta.env`.

### `VITE_SUPABASE_URL`
*   **Descrição:** URL da API Rest do seu projeto Supabase. Usada pelo cliente web para realizar queries diretas nas tabelas.
*   **Obrigatoriedade:** Obrigatório para o funcionamento de qualquer tela.
*   **Formato:** `https://[PROJECT-REFERENCE].supabase.co`
*   **Sensibilidade:** **Pública**. Pode ser exposta no navegador com segurança, pois a integridade dos dados é controlada via políticas RLS (Row Level Security).

### `VITE_SUPABASE_ANON_KEY`
*   **Descrição:** Chave anônima pública de API do Supabase. Utilizada no cabeçalho das chamadas HTTP para identificar a requisição como vinda do cliente anônimo.
*   **Obrigatoriedade:** Obrigatório.
*   **Formato:** String longa contendo JWT encriptado, iniciada por `eyJ...`.
*   **Sensibilidade:** **Pública**. Pode ser exposta com segurança no frontend, desde que as políticas RLS estejam ativas no banco de dados.

---

## 3. Variáveis do Backend (Vercel Serverless)

Essas chaves contêm privilégios de administrador ou segredos de serviços de terceiros. **Nunca as exponha no frontend e nunca comite arquivos que as contenham.** Elas são lidas no Node.js via `process.env.NOME_DA_VARIAVEL`.

### `SUPABASE_URL`
*   **Descrição:** URL da API Rest do projeto Supabase (a mesma utilizada no frontend).
*   **Obrigatoriedade:** Obrigatório para todas as APIs da pasta `/api`.
*   **Formato:** `https://[PROJECT-REFERENCE].supabase.co`
*   **Sensibilidade:** **Privada** (Configurada apenas nas configurações da Vercel).

### `SUPABASE_SERVICE_ROLE_KEY`
*   **Descrição:** Chave de privilégio de serviço (Service Role) do Supabase. Utilizada no backend para realizar operações administrativas (ex: criar usuários diretamente no Supabase Auth, ler dados sensíveis sem restrição, sincronizar perfis).
*   **Obrigatoriedade:** Obrigatório.
*   **Formato:** String longa contendo JWT encriptado de alto privilégio, iniciada por `eyJ...`.
*   **Sensibilidade:** **Altamente Crítica**. Caso exposta, terceiros terão controle total sobre seu banco de dados, ignorando todas as regras de segurança RLS.

### `RESEND_API_KEY`
*   **Descrição:** Token de autorização para disparo de e-mails transacionais via API do Resend (SMTP Serverless).
*   **Obrigatoriedade:** Obrigatório para o funcionamento do chat, notificações de chamados e aprovações de compras.
*   **Formato:** Começa com o prefixo `re_`, ex: `re_123456789abcde...`.
*   **Sensibilidade:** **Crítica**. Permite o disparo de e-mails em nome de seu domínio configurado.

---

## 4. Configuração Local (Desenvolvimento)

Para rodar o projeto localmente com as conexões reais, crie um arquivo na raiz do projeto chamado `.env.local` (este arquivo já está ignorado pelo `.gitignore`):

```bash
# Inicie copiando o exemplo
cp .env.example .env.local
```

Preencha as variáveis com os valores reais obtidos nos painéis do Supabase e do Resend:

```env
# ── CONFIGURAÇÕES DO CLIENTE (FRONTEND)
VITE_SUPABASE_URL=https://abcde12345.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── CONFIGURAÇÕES DO SERVIDOR (BACKEND)
SUPABASE_URL=https://abcde12345.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
RESEND_API_KEY=re_A1b2C3d4_E5f6G7h8I9j0
```
