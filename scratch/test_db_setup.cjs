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

async function run() {
  console.log("Testing connection to Supabase...");
  console.log("Supabase URL:", env.SUPABASE_URL);

  // Try creating a test query or running SQL via rpc if available
  const { data, error } = await supabase.from('projetos_internos').select('*').limit(1);
  if (error) {
    console.log("projetos_internos does not exist yet or error:", error.message);
  } else {
    console.log("projetos_internos exists! Data:", data);
  }
}

run();
