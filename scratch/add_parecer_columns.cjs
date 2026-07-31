// Execute DDL via Supabase REST API using service role key
const SUPABASE_URL = 'https://oskuejukhcnuhvcivcsr.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9za3VlanVraGNudWh2Y2l2Y3NyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU0ODM1OSwiZXhwIjoyMTAwMTI0MzU5fQ.bXGcU5D4OVOqK-bmYWOGK14xlzu0c_MY52Noyf1rvr8';

async function runQuery(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql })
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

// Alternatively use Supabase's pg endpoint
async function runDDL() {
  // Try via the Postgres REST endpoint
  const ddlStatements = [
    "ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS parecer_conclusao TEXT",
    "ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS concluido_por TEXT",
    "ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ"
  ];

  for (const sql of ddlStatements) {
    console.log(`Executando: ${sql}`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    });
    console.log("Status:", res.status);
  }
}

// Best approach: use Supabase client's rpc with pg function
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log("Verificando se colunas já existem...");
  const { data, error } = await supabase
    .from('projetos_internos')
    .select('id, parecer_conclusao, concluido_por, concluido_em')
    .limit(1);
  
  if (!error) {
    console.log("✅ Colunas já existem!");
    return;
  }
  
  console.log("Colunas não existem ainda:", error.message);
  console.log("Tentando adicionar via RPC exec_sql...");
  
  const ddl = `
    ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS parecer_conclusao TEXT;
    ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS concluido_por TEXT;
    ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ;
  `;
  
  // Try different RPC functions
  const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', { sql: ddl });
  if (rpcError) {
    console.log("exec_sql RPC failed:", rpcError.message);
    
    // Try query_execute
    const { data: qData, error: qError } = await supabase.rpc('query_execute', { query: ddl });
    if (qError) {
      console.log("query_execute RPC failed:", qError.message);
    } else {
      console.log("✅ query_execute succeeded:", qData);
    }
  } else {
    console.log("✅ exec_sql RPC succeeded:", rpcData);
  }
}

main();
