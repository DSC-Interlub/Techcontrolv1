const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = (match[2] || '').trim().replace(/(^"|"$)/g, '');
  }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('colaboradores').select('nome_completo');
  console.log("Colaboradores que contêm Tomiati, Espessote ou Edson:");
  data.forEach(c => {
    if (c.nome_completo.includes("Tomiati") || c.nome_completo.includes("Espessote") || c.nome_completo.includes("Edson") || c.nome_completo.includes("Esdon")) {
      console.log(` - "${c.nome_completo}"`);
    }
  });
}
run();
