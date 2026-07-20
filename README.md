# TechControl — Sistema de Gestão de TI e Helpdesk

O **TechControl** é um ecossistema corporativo completo para gerenciamento de patrimônios de TI (computadores, coletores, ramais, smartphones), abertura e chat de chamados técnicos de suporte, agendamento de salas de treinamento, reservas de notebooks e fluxo de aprovação de requisições de compras.

O sistema passou por uma migração arquitetural completa: toda a infraestrutura antiga da Base44 foi substituída pelo ecossistema moderno do **Supabase** (Banco relacional, Autenticação, RLS, Storage de mídias) integrado a APIs serverless rodando no ecossistema da **Vercel** com disparo de e-mails transacionais via **Resend**.

---

## 📁 Guias de Documentação Técnica

Para facilitar o provisionamento, a homologação e a manutenção do sistema do zero, consulte os guias dedicados abaixo:

1.  **[Guia de Implantação Geral (Deploy)](file:///c:/techcontrol/Techcontrolv1-main/DEPLOY_GUIDE.md):** Roteiro end-to-end integrando a nuvem e homologando fluxos.
2.  **[Guia de Configuração de Domínio](file:///c:/techcontrol/Techcontrolv1-main/DOMAIN_CONFIGURATION.md):** Apontamentos DNS e chaves do domínio `techcontrol.site`.
3.  **[Guia de Autenticação](file:///c:/techcontrol/Techcontrolv1-main/AUTHENTICATION.md):** Funcionamento de portais, controle de sessão e fluxo de senhas.
4.  **[Configuração do Administrador](file:///c:/techcontrol/Techcontrolv1-main/ADMIN_SETUP.md):** SQL script para inserção de administrador inicial em produção.
5.  **[Relatório de Testes e Homologação](file:///c:/techcontrol/Techcontrolv1-main/TEST_REPORT.md):** Status de homologação dos 18 cenários de validação.
6.  **[Reestruturação da Infraestrutura](file:///c:/techcontrol/Techcontrolv1-main/INFRASTRUCTURE_REFACTOR.md):** Plano geral de reestruturação backend de Vercel para Supabase.
7.  **[Relatório de Migração de Funções](file:///c:/techcontrol/Techcontrolv1-main/FUNCTION_MIGRATION_REPORT.md):** Destino arquitetural final de cada API.
8.  **[Arquitetura de Backend Supabase](file:///c:/techcontrol/Techcontrolv1-main/SUPABASE_BACKEND_ARCHITECTURE.md):** stored procedures e trigger de sincronização de usuários.
9.  **[Resumo de Redução de Funções](file:///c:/techcontrol/Techcontrolv1-main/FUNCTION_REDUCTION_SUMMARY.md):** Redução de 14 para 4 functions ativas.
10. **[Guia de Configuração do Supabase](file:///c:/techcontrol/Techcontrolv1-main/SUPABASE_SETUP.md):** Criação de projeto, migrations locais, policies RLS e storage.
11. **[Guia de Configuração da Vercel](file:///c:/techcontrol/Techcontrolv1-main/VERCEL_SETUP.md):** Passo a passo de conexão, build, SSL e domínios.
12. **[Guia de Variáveis de Ambiente](file:///c:/techcontrol/Techcontrolv1-main/ENVIRONMENT_VARIABLES.md):** Chaves públicas do frontend e chaves privadas de APIs.
13. **[Checklist Pré-Produção](file:///c:/techcontrol/Techcontrolv1-main/PRODUCTION_CHECKLIST.md):** Validações finais de segurança antes de liberar para os usuários.
14. **[Guia de Rollback (Reversão)](file:///c:/techcontrol/Techcontrolv1-main/ROLLBACK_GUIDE.md):** Procedimentos de emergência se um deploy apresentar bugs graves.
15. **[Guia de Recuperação de Desastres](file:///c:/techcontrol/Techcontrolv1-main/RECOVERY_GUIDE.md):** Backups de dados, storage e rotação de credenciais expostas.
16. **[Histórico de Alterações (Changelog)](file:///c:/techcontrol/Techcontrolv1-main/CHANGELOG.md):** Histórico detalhado de commits e modificações da migração.

---

## 🛠️ Como Executar o Projeto Localmente

### Pré-requisitos
Certifique-se de possuir instalado em sua máquina:
*   [Node.js](https://nodejs.org) (versão 18 ou superior).
*   [Git](https://git-scm.com).

### Passo 1: Clonar e Instalar Dependências
```bash
git clone https://github.com/DSC-Interlub/Techcontrolv1.git
cd Techcontrolv1-main
npm install
```

### Passo 2: Configurar Chaves de API
Copie o arquivo de exemplo de variáveis de ambiente:
```bash
cp .env.example .env.local
```
*Abra o arquivo `.env.local` e preencha as chaves reais conforme as instruções do [ENVIRONMENT_VARIABLES.md](file:///c:/techcontrol/Techcontrolv1-main/ENVIRONMENT_VARIABLES.md).*

### Passo 3: Rodar o Servidor de Desenvolvimento
```bash
npm run dev
```
*O sistema abrirá localmente no endereço `http://localhost:5173`.*

---

## 📦 Compilação para Produção (Build)

Para otimizar os arquivos estáticos e gerar o bundle de produção:
```bash
npm run build
```
O build dividirá as 37 páginas dinamicamente em chunks otimizados (Code Splitting/React.lazy) salvos na pasta `/dist`, prontos para servir em CDN.
