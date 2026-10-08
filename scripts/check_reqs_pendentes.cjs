const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
  const p = l.split('=');
  if (p.length >= 2) env[p[0].trim()] = p.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkReqs() {
  const { data: reqs, error } = await supabase
    .from('requisicao_compras')
    .select('id, numero_requisicao, colaborador_nome, aprovador_nome, aprovador_email, status, created_date')
    .order('created_date', { ascending: false });

  if (error) {
    console.log('Erro:', error);
    return;
  }

  console.log('Total de requisições cadastradas:', reqs.length);
  const pendentes = reqs.filter(r => r.status === 'Aguardando Aprovador');
  console.log('Requisições Aguardando Aprovador atualmente:', pendentes.length);
  if (pendentes.length > 0) {
    console.log(pendentes);
  }
}

checkReqs();
