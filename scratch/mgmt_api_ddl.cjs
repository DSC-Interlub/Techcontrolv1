// Execute DDL via Supabase Management API with new token
const projectId = 'oskuejukhcnuhvcivcsr';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';

const ddl = `ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS parecer_conclusao TEXT;
ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS concluido_por TEXT;
ALTER TABLE public.projetos_internos ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ;`;

async function runDDL() {
  console.log("Executando DDL via Supabase Management API com novo token...");

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: ddl })
  });

  const body = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", body);

  if (res.status === 200 || res.status === 201) {
    console.log("✅ DDL executado com sucesso!");
  } else {
    console.log("❌ Falhou, tentando endpoint alternativo...");
    
    // Try the pg endpoint
    const res2 = await fetch(`https://api.supabase.com/v1/projects/${projectId}/pg/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: ddl })
    });
    const body2 = await res2.text();
    console.log("Status2:", res2.status, "Response2:", body2);
  }
}

runDDL();
