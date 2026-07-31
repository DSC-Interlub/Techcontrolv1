const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testColumn() {
  console.log("Testando se colunas parecer_conclusao já existem em projetos_internos...");
  const { data, error } = await supabase.from('projetos_internos').select('id, parecer_conclusao, concluido_por, concluido_em').limit(1);
  if (error) {
    console.error("Erro ao selecionar colunas:", error.message);
  } else {
    console.log("✅ Colunas existem!", data);
  }
}

testColumn();
