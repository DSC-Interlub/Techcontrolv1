// Execute DDL via Supabase pg endpoint using service role
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oskuejukhcnuhvcivcsr.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9za3VlanVraGNudWh2Y2l2Y3NyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU0ODM1OSwiZXhwIjoyMTAwMTI0MzU5fQ.bXGcU5D4OVOqK-bmYWOGK14xlzu0c_MY52Noyf1rvr8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' }
});

// Approach: temporarily create a function, call it, then drop it
async function main() {
  console.log("Criando função temporária de DDL...");

  // Step 1: Create a temporary function via a workaround using raw fetch to execute SQL
  // Use the Supabase pg REST interface
  const createFnSql = `
    CREATE OR REPLACE FUNCTION public._tmp_add_parecer_cols()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS parecer_conclusao TEXT;
      ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS concluido_por TEXT;
      ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ;
    END;
    $$;
  `;

  // Try using the Supabase Postgres endpoint directly via HTTP
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_tmp_add_parecer_cols`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  const text = await res.text();
  console.log("Status:", res.status, "Response:", text);

  if (res.status === 404) {
    console.log("Função não existe. Vamos verificar o estado atual das colunas...");
    const { data, error } = await supabase
      .from('projetos_internos')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log("Erro:", error.message);
    } else if (data && data.length > 0) {
      console.log("Colunas disponíveis:", Object.keys(data[0]));
      console.log("parecer_conclusao existe?", 'parecer_conclusao' in data[0]);
      console.log("concluido_por existe?", 'concluido_por' in data[0]);
      console.log("concluido_em existe?", 'concluido_em' in data[0]);
    } else {
      console.log("Tabela vazia - verificando via pg_attribute...");
      const { data: cols, error: colErr } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'projetos_internos')
        .eq('table_schema', 'public');
      if (colErr) console.log("Erro ao verificar colunas:", colErr.message);
      else console.log("Colunas da tabela:", cols?.map(c => c.column_name));
    }
  }
}

main();
