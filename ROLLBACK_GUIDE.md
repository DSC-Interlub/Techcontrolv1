# Guia de Rollback (Reversão de Emergência) — TechControl

Este documento detalha os procedimentos operacionais para reverter o sistema para um estado estável anterior em caso de falhas críticas ou bugs inesperados após deploys em produção.

---

## 1. Reversão de Código no Frontend e APIs (Vercel)

Se uma nova atualização de código quebrar o frontend ou as APIs serverless da Vercel em produção, use um dos métodos abaixo para reverter instantaneamente.

### Método 1.1: Reversão Instantânea pelo Painel (Recomendado)
A Vercel mantém um histórico imutável de todos os builds anteriores. Não é necessário gerar novos commits para desfazer um erro.

1.  Acesse o painel do seu projeto na [Vercel](https://vercel.com).
2.  Navegue até a aba **Deployments**.
3.  Localize a última versão que estava **estável e operacional** (identifique pela data e pelo hash do commit).
4.  Clique nos três pontos verticais `...` à direita do build estável e selecione a opção **Rollback**.
5.  Confirme a ação. A Vercel alterará os apontamentos de DNS internos em menos de 5 segundos, direcionando todo o tráfego de produção de volta para a versão anterior segura.

### Método 1.2: Reversão via Git Revert (Rollback Permanente no Repositório)
Caso precise reverter a branch `main` do GitHub para que futuros commits não arrastem o bug:

1.  No seu terminal local, encontre o hash do commit problemático:
    ```bash
    git log -n 5 --oneline
    ```
2.  Crie um commit de reversão (isso cria um novo commit que desfaz exatamente as linhas de código do commit que quebrou o sistema):
    ```bash
    git revert HASH_DO_COMMIT_QUEBRADO
    ```
3.  Envie o commit para o repositório remoto:
    ```bash
    git push origin main
    ```
    *A Vercel receberá o commit de reversão e gerará um novo build corrigido automaticamente.*

---

## 2. Reversão de Banco de Dados (Supabase)

Caso uma migration de banco de dados (`supabase db push`) insira tabelas inconsistentes ou quebre chaves estrangeiras ativas.

### Método 2.1: Reversão Manual de Tabelas e Constraints (SQL)
O PostgreSQL não possui rollback de DDL automático nativo fora de transações. Caso aplique uma migration e precise reverter a estrutura, execute os seguintes passos no **SQL Editor** do Supabase:

*   **Para remover uma constraint (FK/Key) criada por engano:**
    ```sql
    ALTER TABLE nome_da_tabela DROP CONSTRAINT nome_da_constraint;
    ```
*   **Para deletar uma tabela nova que não deveria existir:**
    ```sql
    DROP TABLE public.nome_da_tabela CASCADE;
    ```
*   **Para recriar uma View anterior:**
    ```sql
    CREATE OR REPLACE VIEW nome_da_view AS SELECT ...;
    ```

### Método 2.2: Reversão de Migrations Locais
Caso tenha criado um arquivo de migration local e queira descartá-lo antes que ele seja empurrado para produção:

1.  Delete o arquivo SQL problemático dentro da pasta `/supabase/migrations/`.
2.  Restaure o banco local de testes para sincronizar com o estado anterior:
    ```bash
    supabase db reset
    ```
    *Atenção: O comando `reset` apagará os dados locais de teste e rodará todas as migrations limpas novamente. Nunca o execute diretamente no banco remoto de produção.*
