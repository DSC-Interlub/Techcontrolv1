# Configuração de Domínio Oficial (Domain Configuration) — TechControl

Este guia descreve as configurações e apontamentos de DNS necessários para ativar o domínio oficial e definitivo do sistema: **`techcontrol.site`**.

---

## 1. Configurações Prontas no Código

Toda a lógica e URLs absolutas do sistema já foram configuradas no código para apontar para `https://techcontrol.site`:

*   **Redirecionamentos de E-mail / Token de Recuperação:** Configurado para retornar ao domínio definitivo em `/api/notificar`, `/api/cronDiario` e `/api/requisicaoComprasAction`.
*   **Links de Acesso no Corpo dos E-mails:** Apontados diretamente para `https://techcontrol.site/portal-login`, `https://techcontrol.site/portal-requisicoes` e `https://techcontrol.site/portal-chamados`.
*   **Remetente Padrão Resend:** Atualizado para `TechControl <suporte@techcontrol.site>`.

---

## 2. Configurações Necessárias no Painel do Vercel

Para que o site React carregue ao digitar `techcontrol.site`, você deve vincular o domínio ao seu projeto na Vercel:

1.  Acesse o painel da **[Vercel](https://vercel.com)**.
2.  Selecione o projeto **TechControl**.
3.  Vá em **Settings** ➡️ **Domains**.
4.  No campo de texto, insira `techcontrol.site` e clique em **Add**.
5.  Adicione também o domínio alternativo `www.techcontrol.site` (marcando para redirecionar para `techcontrol.site`).
6.  O painel do Vercel fornecerá as instruções de apontamento DNS (mostradas na seção 4).

---

## 3. Configurações Necessárias no Painel do Supabase

Para que o Supabase Auth permita e redirecione os tokens de login/recuperação de senha para o domínio definitivo:

1.  Acesse o painel do **[Supabase](https://supabase.com)**.
2.  Vá em **Project Settings** ➡️ **API**.
3.  Vá na seção **Authentication** (ou clique em **Auth** no menu lateral, depois em **URL Configuration**).
4.  Configure os seguintes campos:
    *   **Site URL:** `https://techcontrol.site`
    *   **Redirect URLs (Adicione as seguintes linhas):**
        *   `https://techcontrol.site/`
        *   `https://techcontrol.site/Dashboard`
        *   `https://techcontrol.site/reset-password`
5.  Clique em **Save**.

---

## 4. Tabela de Registros DNS (Provedor Ionos / DNS Manager)

Abaixo estão os apontamentos DNS exatos que você deve adicionar na zona de DNS do domínio `techcontrol.site` para o perfeito funcionamento do site, SSL da Vercel e disparos do Resend:

### A. Para Hospedagem (Vercel)

| Tipo | Nome (Host) | Valor (Destino) | TTL | Notas |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | Padrão | Aponta o domínio raiz para a Vercel |
| **CNAME** | `www` | `cname.vercel-dns.com.` | Padrão | Aponta o subdomínio `www` |

### B. Para Disparo de E-mails (Resend)

No painel do Resend, crie o domínio `techcontrol.site` para gerar as chaves DKIM e SPF. Adicione os seguintes registros gerados na sua zona de DNS:

| Tipo | Nome (Host) | Valor (Destino) | Notas |
| :--- | :--- | :--- | :--- |
| **TXT** | `resend-otp._domainkey` | `k=rsa; p=...` *(gerado pelo Resend)* | Assinatura DKIM para autenticação de e-mail |
| **TXT** | `@` | `v=spf1 include:amazonses.com ~all` | Registro SPF para autorizar envios |
| **MX** | `feedback` | `10 feedback-smtp.us-east-1.amazonses.com` | Rota de e-mail de retorno do Resend |
