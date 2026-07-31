const projectId = 'oskuejukhcnuhvcivcsr';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';

const ddl = `
  ALTER TABLE public.pcs_internos ADD COLUMN IF NOT EXISTS anydesk_id TEXT;
  ALTER TABLE public.notebooks_externos ADD COLUMN IF NOT EXISTS anydesk_id TEXT;
`;

async function runDDL() {
  console.log("Adicionando coluna anydesk_id em pcs_internos e notebooks_externos...");

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: ddl })
  });

  const body = await res.text();
  console.log("Status:", res.status, "Response:", body);

  if (res.status === 200 || res.status === 201) {
    console.log("✅ Colunas anydesk_id criadas no banco de dados com sucesso!");
  } else {
    console.log("Tentando endpoint pg secundário...");
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
