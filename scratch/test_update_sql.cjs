const token = 'SUPABASE_TOKEN_PLACEHOLDER';
const projectId = 'oskuejukhcnuhvcivcsr';

async function executeSql(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const data = await response.json();
  return data;
}

const query = `
UPDATE public.pcs_internos 
SET usuario_atual = '', colaborador_id = NULL, usuario_desde = NULL, area = '', status = 'Disponível'
WHERE id = '02f24456-1570-4482-a2be-b94fd2250db3'
RETURNING id, usuario_atual, colaborador_id, usuario_desde, status;
`;

executeSql(query).then(res => {
  console.log("Resultado da execução SQL no Supabase:");
  console.log(JSON.stringify(res, null, 2));
});
