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

async function checkNullAntivirusNome() {
  const { data: pcs } = await sb.from('pcs_internos')
    .select('id, etiqueta_interna, usuario_atual, antivirus, antivirus_nome')
    .eq('antivirus', 'Sim')
    .is('antivirus_nome', null);
  console.log('PCs com antivirus=Sim e antivirus_nome=null:', pcs?.length, pcs);

  const { data: nbs } = await sb.from('notebooks_externos')
    .select('id, etiqueta_interna, usuario_atual, antivirus, antivirus_nome')
    .eq('antivirus', 'Sim')
    .is('antivirus_nome', null);
  console.log('Notebooks com antivirus=Sim e antivirus_nome=null:', nbs?.length, nbs);
}
checkNullAntivirusNome();
