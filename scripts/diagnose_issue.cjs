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

async function diagnose() {
  const { data: pcs } = await sb.from('pcs_internos').select('*');
  const { data: colabs } = await sb.from('colaboradores').select('*');
  const { data: avals } = await sb.from('avaliacoes').select('*');

  console.log('--- USUARIOS DIVERGENTES EM PCS_INTERNOS ---');
  pcs.forEach(p => {
    if (!p.usuario_atual) return;
    const isComp = p.usuario_atual.startsWith('Compartilhado');
    if (!isComp) {
      // Find matching colab
      const exact = colabs.find(c => c.nome_completo === p.usuario_atual);
      const partial = colabs.find(c => 
        c.nome_completo.toLowerCase().includes(p.usuario_atual.toLowerCase()) ||
        p.usuario_atual.toLowerCase().includes(c.nome_completo.toLowerCase())
      );
      if (!exact && partial) {
        console.log(`Divergência: PC tag ${p.etiqueta_interna || p.service_tag} | usuario_atual: "${p.usuario_atual}" !== colab: "${partial.nome_completo}"`);
      } else if (!exact && !partial) {
        console.log(`Não encontrado: PC tag ${p.etiqueta_interna || p.service_tag} | usuario_atual: "${p.usuario_atual}"`);
      }
    }
  });

  console.log('\n--- ANTIVIRUS STATUS / ESET EM PCS E AVALIACOES ---');
  // Check PCs that have ESET or Sim but have old eval with Inativo
  let countConflicting = 0;
  pcs.forEach(p => {
    const hasEset = (p.antivirus_nome || '').toLowerCase().includes('eset') || p.antivirus === 'Sim';
    const pcAvals = avals.filter(a => a.equipamento_id === p.id);
    const lastAval = pcAvals[0];
    if (hasEset && lastAval && (lastAval.antivirus || '').toLowerCase().includes('inativo')) {
      countConflicting++;
      console.log(`PC ${p.etiqueta_interna || p.service_tag}: PC has antivirus='${p.antivirus}', antivirus_nome='${p.antivirus_nome}' | BUT avaliacao ${lastAval.id} has antivirus='${lastAval.antivirus}'`);
    }
  });
  console.log(`Total conflicting PCs: ${countConflicting}`);

  console.log('\n--- TAREFAS DE MANUTENCAO COM ANTIVIRUS ---');
  const { data: tarefas, error: errT } = await sb.from('tarefas_manutencao_equipamento').select('*').ilike('descricao', '%antiv%');
  if (errT) console.error('Erro tarefas:', errT);
  console.log(`Total tarefas com antivirus: ${tarefas?.length}`);
  if (tarefas?.length) {
    console.log('Sample tarefas:', JSON.stringify(tarefas.slice(0, 5), null, 2));
    const pendentes = tarefas.filter(t => t.status === 'Pendente');
    console.log(`Tarefas de antivírus pendentes: ${pendentes.length}`);
  }
}
diagnose();


