const { Client } = require('pg');

// Supabase transaction pooler (port 6543)  
// User format for pooler: postgres.PROJECT_REF
// Connection string format: postgresql://postgres.PROJECT_REF:PASSWORD@HOST:6543/postgres
const connectionString = 'postgresql://postgres.oskuejukhcnuhvcivcsr:Interlub2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres';

console.log("Tentando via Transaction Pooler (porta 6543)...");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runDDL() {
  try {
    await client.connect();
    console.log("✅ Conectado com sucesso!");

    const stmts = [
      "ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS parecer_conclusao TEXT",
      "ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS concluido_por TEXT",
      "ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ"
    ];

    for (const sql of stmts) {
      console.log(`Executando: ${sql}`);
      await client.query(sql);
      console.log("✅ OK");
    }

    console.log("\n✅ Todas as colunas adicionadas com sucesso!");
  } catch (err) {
    console.error("❌ Erro:", err.message);
    console.error("Code:", err.code);
  } finally {
    await client.end();
  }
}

runDDL();
