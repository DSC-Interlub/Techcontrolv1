# Relatório de Infraestrutura — TechControl

Este relatório fornece uma visão detalhada da arquitetura física do projeto, estrutura de diretórios, configurações do roteador Vercel e o mapeamento de build.

---

## 1. Estrutura de Pastas e Arquivos de Configuração

*   **Vite Configuration (`vite.config.js`):**
    O projeto utiliza o Vite como empacotador de frontend. As resoluções de caminho estão mapeadas utilizando `@` apontando para a pasta `/src`. O build gera os arquivos estáticos compilados em chunks (HTML, CSS, JS minificado) dentro do diretório `/dist`.
*   **Vercel Configuration (`vercel.json`):**
    *   **Roteamento (Rewrites):**
        ```json
        { "source": "/((?!api/).*)", "destination": "/index.html" }
        ```
        Essa regra garante que qualquer URL requisitada que *não* comece com `/api/` seja redirecionada internamente para o `index.html`. Isso é crucial para que o roteamento de Single Page Application (SPA) do React Router funcione sem gerar erros HTTP 404 ao atualizar a página.
    *   **Crons (Tarefas Agendadas):**
        Existem três agendamentos ativos na Vercel mapeando chamadas diárias e mensais para endpoints dentro de `/api`.
*   **Diretório de APIs (`/api`):**
    É a única pasta onde residem as funções serverless. Não existem as pastas `app/api/`, `pages/api/`, `server/`, `netlify/` ou `edge/`.

---

## 2. Dependências e Scripts (`package.json`)

*   **Dependências de Servidor:**
    As funções da pasta `/api` dependem de `@supabase/supabase-js` (comunicar com o banco) e `resend` (disparo de e-mails).
*   **Ausência de Frameworks Pesados:**
    Não há Next.js no projeto. É um frontend puro empacotado em React + Vite. As funções Serverless são tratadas pela Vercel de forma independente usando o runtime padrão de Node.js (Vercel Serverless Functions).

---

## 3. Limitações Técnicas do Plano Hobby da Vercel

O plano **Vercel Hobby** impõe as seguintes restrições de limites de infraestrutura:
*   **Número de Serverless Functions:** Máximo de **12** por deploy.
*   **Duração da Execução (Timeout):** Máximo de **10 segundos** por chamada.
*   **Memória:** 1024 MB por execução.
*   **Região Padrão:** us-east-1 (Virgínia).

Como nosso diretório `/api` conta atualmente com 14 funções operacionais (e 1 helper iniciado em `_`), o deploy é rejeitado pela Vercel antes de iniciar a compilação, exibindo o bloqueio do plano.
