const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
  const p = l.split('=');
  if (p.length >= 2) env[p[0].trim()] = p.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: cols } = await supabase.from('colaboradores').select('*').limit(1);
  if (cols && cols[0]) {
    console.log('Todas as colunas de colaboradores:', Object.keys(cols[0]));
  }

  const { data: valter } = await supabase
    .from('colaboradores')
    .select('*')
    .or('email.ilike.%vtorres%,nome_completo.ilike.%Valter%');

  console.log('Valter encontrado:', valter);
}

check();
