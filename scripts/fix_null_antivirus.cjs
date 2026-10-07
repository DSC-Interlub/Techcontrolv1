const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    val = val.replace(/^["']|["']$/g, '');
    env[match[1]] = val.trim();
  }
});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fixNullAntivirusNome() {
  const { data: updatedPcs, error: errPcs } = await sb.from('pcs_internos')
    .update({ antivirus_nome: 'ESET' })
    .eq('antivirus', 'Sim')
    .is('antivirus_nome', null)
    .select('id, etiqueta_interna, antivirus, antivirus_nome');

  if (errPcs) console.error('Erro PCs:', errPcs);
  else console.log('PCs atualizados para ESET:', updatedPcs);

  const { data: updatedNbs, error: errNbs } = await sb.from('notebooks_externos')
    .update({ antivirus_nome: 'ESET' })
    .eq('antivirus', 'Sim')
    .is('antivirus_nome', null)
    .select('id, etiqueta_interna, antivirus, antivirus_nome');

  if (errNbs) console.error('Erro Notebooks:', errNbs);
  else console.log('Notebooks atualizados para ESET:', updatedNbs);
}
fixNullAntivirusNome();
