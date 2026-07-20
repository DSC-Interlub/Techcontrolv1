# Guia de Configuração da Vercel — TechControl

Este guia descreve detalhadamente o passo a passo para importar o repositório do **TechControl** do GitHub para a Vercel, configurar o ambiente de build, configurar as variáveis de ambiente secretas e gerenciar o deploy de produção.

---

## 1. Importando o Projeto do GitHub

1.  Acesse o painel oficial da [Vercel](https://vercel.com) e faça login com sua conta.
2.  Clique no botão **Add New...** no canto superior direito e selecione a opção **Project**.
3.  Na lista de repositórios do Git, localize `DSC-Interlub/Techcontrolv1` (se não encontrar, clique em *Configure GitHub App* para dar permissão de acesso ao repositório).
4.  Clique no botão **Import** ao lado do repositório.

---

## 2. Configurações de Projeto e Build

Na tela **Configure Project**, preencha os parâmetros exatamente como descritos abaixo para garantir que o Vite e as Serverless Functions compilem de forma correta:

*   **Project Name:** `techcontrol`
*   **Framework Preset:** Selecione **Vite** (a Vercel preencherá os comandos padrão automaticamente).
*   **Root Directory:** Deixe vazio `./` (o arquivo `package.json` está na raiz do repositório).
*   **Build and Output Settings:**
    *   **Build Command:** `npm run build` (ou `vite build`)
    *   **Output Directory:** `dist` (diretório padrão gerado pelo build do Vite)
    *   **Install Command:** `npm install` (instalador de pacotes padrão)

---

## 3. Configuração de Variáveis de Ambiente

Abaixo da seção de build, abra a sanfona **Environment Variables** (Variáveis de Ambiente). Adicione cada uma das chaves a seguir (copie os valores reais gerados nos painéis correspondentes):

| Key (Nome da Variável) | Value (Exemplo de Valor) | Target Environments |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://abcde12345.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |
| `SUPABASE_URL` | `https://abcde12345.supabase.co` | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview |
| `RESEND_API_KEY` | `re_A1b2C3d4_E5f6G7h8I9j0` | Production, Preview |

*Nota: Marque a opção "Encrypt" para as chaves `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` para que fiquem protegidas no painel da Vercel.*

---

## 4. Efetuando o Primeiro Deploy

1.  Após preencher as variáveis de ambiente, clique no botão **Deploy**.
2.  A Vercel executará as seguintes etapas em segundo plano:
    *   **Cloning:** Clona o código de produção do GitHub.
    *   **Building:** Executa o comando `npm run build` para empacotar o frontend e otimizar os assets estáticos.
    *   **Routing:** Configura o roteamento para as APIs da pasta `/api` e reescreve as rotas do frontend para o `index.html` (controlado pelo arquivo `vercel.json` na raiz do projeto).
3.  Quando finalizado, o painel exibirá uma tela de comemoração com uma prévia visual do painel administrativo do TechControl rodando sob um domínio gratuito `.vercel.app`.

---

## 5. Configuração de Domínio Personalizado e SSL

Para alterar o domínio do sistema para o domínio oficial da empresa (ex: `patrimonio.interlub.com`):

1.  No painel do projeto na Vercel, acesse a aba **Settings** ➡️ **Domains**.
2.  No campo de texto, digite o domínio desejado e clique em **Add**.
3.  O painel exibirá as regras de apontamento DNS necessárias:
    *   **Para subdomínios (ex: `patrimonio.interlub.com`):** Crie um registro tipo **CNAME** no seu gerenciador de DNS (ex: Cloudflare, GoDaddy, Registro.br) apontando o subdomínio para `cname.vercel-dns.com`.
    *   **Para domínios raiz (ex: `techcontrol.site`):** Crie um registro tipo **A** apontando para o IP `76.76.21.21`.
4.  Após propagar o DNS (geralmente leva menos de 10 minutos), a Vercel emitirá automaticamente um certificado de segurança **SSL (HTTPS)** gratuito de forma vitalícia.

---

## 6. Monitoramento, Logs e Troubleshooting

*   **Logs em Tempo Real (Serverless Functions):**
    Para monitorar disparos de e-mail ou logins de colaboradores, acesse a aba **Logs** no painel do seu projeto. É possível filtrar por status HTTP (ex: erros 500) e ler as saídas geradas por `console.log()` ou `console.error()` direto do backend Node.js.
*   **Analytics e Speed Insights:**
    Ative as abas **Analytics** e **Speed Insights** na Vercel para mensurar métricas de Web Vitals, tempo de carregamento inicial do aplicativo por localização geográfica dos usuários e performance geral.
*   **Redeploys e Rollbacks:**
    Cada alteração ou commit enviado para a branch principal (`main`) no GitHub engatilha automaticamente um build e deploy de produção na Vercel. Caso ocorra algum erro crítico em produção, acesse a aba **Deployments**, localize a versão anterior que estava funcional, clique nos três pontos e selecione **Rollback** para restaurar a versão de forma instantânea em menos de 5 segundos.
