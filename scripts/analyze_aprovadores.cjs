const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
  const p = l.split('=');
  if (p.length >= 2) env[p[0].trim()] = p.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function analyze() {
  const { data: cols, error } = await supabase
    .from('colaboradores')
    .select('id, nome_completo, email, status, responsavel_id, responsavel_nome, responsavel_email')
    .order('nome_completo');

  if (error) {
    console.error('Erro:', error);
    return;
  }

  const ativos = cols.filter(c => c.status === 'Ativo');
  const comValter = ativos.filter(c => c.responsavel_id === 'fab52683-f4e7-4fb1-adaa-83289d158e0d');
  const comOutro = ativos.filter(c => c.responsavel_id && c.responsavel_id !== 'fab52683-f4e7-4fb1-adaa-83289d158e0d');
  const semAprovador = ativos.filter(c => !c.responsavel_id);

  console.log('Total colaboradores ativos:', ativos.length);
  console.log('Já possuem Valter como aprovador:', comValter.length);
  console.log('Possuem outro aprovador:', comOutro.length);
  console.log('Sem aprovador definido:', semAprovador.length);

  console.log('\nQuem são os outros aprovadores atuais nos colaboradores ativos:');
  const agrupado = {};
  comOutro.forEach(c => {
    agrupado[c.responsavel_nome] = (agrupado[c.responsavel_nome] || 0) + 1;
  });
  console.log(agrupado);

  const valterObj = cols.find(c => c.id === 'fab52683-f4e7-4fb1-adaa-83289d158e0d');
  console.log('\nDados do próprio Valter:');
  console.log({
    nome: valterObj?.nome_completo,
    email: valterObj?.email,
    responsavel_atual: valterObj?.responsavel_nome,
    responsavel_email: valterObj?.responsavel_email
  });
}

analyze();
