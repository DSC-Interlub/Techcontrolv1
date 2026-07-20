# Manual de Autenticação (Authentication) — TechControl

Este documento detalha o fluxo de autenticação e controle de acesso implementados no sistema **TechControl**, integrados nativamente com o **Supabase Auth**.

---

## 1. Métodos de Autenticação Ativos

Para garantir o controle de acessos em conformidade com as regras corporativas da Interlub, o sistema foi desenhado para aceitar **apenas** credenciais explícitas de e-mail e senha:

*   ✅ **Login por E-mail e Senha:** Padrão para todos os usuários (administradores e colaboradores).
*   ✅ **Troca de Senha Obrigatória:** Para colaboradores no primeiro acesso à plataforma.
*   ✅ **Redefinição de Senha:** Fluxo completo via envio de e-mail transacional de recuperação de conta.
*   ❌ **Magic Link (Removido):** Todos os botões, dependências e fluxos associados a links de login mágico foram removidos para evitar acessos sem credenciais de segurança.

---

## 2. Portais de Acesso

O sistema possui duas interfaces de login independentes e com a mesma identidade visual:

### A. Portal do Colaborador (Employee Portal)
*   **Rota:** `/portal-login`
*   **Destinatários:** Colaboradores em geral (engenharia, produção, etc.).
*   **Lógica:**
    1.  Autentica com `supabase.auth.signInWithPassword()`.
    2.  Verifica na tabela `colaboradores` se o registro está ativo e se o acesso não está bloqueado.
    3.  Se `senha_precisa_trocar = true`, exibe o formulário de primeiro acesso exigindo a criação de uma nova senha pessoal antes de liberar a navegação.
    4.  Salva a sessão local no `sessionStorage.portal_colaborador`.

### B. Portal do Administrador (Admin Portal)
*   **Rota:** `/login`
*   **Destinatários:** Profissionais de TI e Administradores Gerais.
*   **Lógica:**
    1.  Autentica com `supabase.auth.signInWithPassword()`.
    2.  Busca o cargo do usuário na tabela `public.profiles`.
    3.  Se o cargo for diferente de `'admin'`, o login é recusado, a sessão é encerrada (`supabase.auth.signOut()`) e uma mensagem de erro é exibida.
    4.  Redireciona para o `/Dashboard` de gestão geral.

---

## 3. Fluxo de Redefinição de Senha

1.  O usuário clica em "Esqueceu a senha?" na tela de login.
2.  Informa seu e-mail corporativo.
3.  A API chama `supabase.auth.resetPasswordForEmail()`, redirecionando para a rota `${window.location.origin}/reset-password`.
4.  O usuário clica no link recebido por e-mail, acessa a rota `/reset-password` e define a nova senha.
5.  A senha é alterada no Supabase e na tabela correspondente.
