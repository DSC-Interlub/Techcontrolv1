const fs = require('fs');
const path = require('path');

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

const sqlPath = path.join(__dirname, 'create_tarefas_table.sql');
const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

console.log("Executando DDL no Supabase...");
executeSql(sqlQuery)
  .then(res => {
    console.log("Resposta do Supabase:");
    console.log(JSON.stringify(res, null, 2));
  })
  .catch(err => {
    console.error("Erro na migração:", err);
  });
