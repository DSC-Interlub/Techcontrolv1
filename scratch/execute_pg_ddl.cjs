const { Client } = require('pg');

const connectionString = 'postgresql://postgres.oskuejukhcnuhvcivcsr:Interlub2026@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

console.log("Conectando ao PostgreSQL do Supabase...");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runDDL() {
  try {
    await client.connect();
    console.log("Conectado com sucesso!");

    const query = `
      ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS parecer_conclusao TEXT;
      ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS concluido_por TEXT;
      ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ;
    `;

    await client.query(query);
    console.log("✅ DDL executado com sucesso nas tabelas de projetos_internos!");
  } catch (err) {
    console.error("❌ Erro ao executar DDL:", err.message);
  } finally {
    await client.end();
  }
}

runDDL();
