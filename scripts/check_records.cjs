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

async function check() {
  const { data: sample, error: errSample } = await sb.from('pcs_internos').select('*').limit(1);
  if (errSample) {
    console.error('Error fetching sample:', errSample);
    return;
  }
  console.log('Columns in pcs_internos:', Object.keys(sample[0] || {}));

  const { data: pcs, error } = await sb.from('pcs_internos').select('*');
  if (error) {
    console.error('Error fetching pcs:', error);
    return;
  }
  console.log('Total PCs:', pcs.length);

  const aprendizes = pcs.filter(p => 
    (p.usuario_atual || '').toLowerCase().includes('barbara') || 
    (p.usuario_atual || '').toLowerCase().includes('aprendiz')
  );
  console.log('Barbara / Aprendiz PCs in pcs_internos:', JSON.stringify(aprendizes.map(p => ({
    id: p.id,
    tag: p.tag_service || p.tag_antiga || p.patrimonio || p.numero_serie,
    nome: p.nome_computador || p.nome,
    usuario_atual: p.usuario_atual,
    colaborador_id: p.colaborador_id,
    antivirus: p.antivirus,
    antivirus_nome: p.antivirus_nome,
    antivirus_status: p.antivirus_status,
    status: p.status
  })), null, 2));

  // Check notebooks
  const { data: nbs } = await sb.from('notebooks_externos').select('*');
  console.log('Total Notebooks:', nbs?.length);
  const aprendizesNbs = nbs?.filter(p => 
    (p.usuario_atual || '').toLowerCase().includes('barbara') || 
    (p.usuario_atual || '').toLowerCase().includes('aprendiz')
  );
  console.log('Barbara / Aprendiz Notebooks:', JSON.stringify(aprendizesNbs?.map(p => ({
    id: p.id,
    tag: p.tag_service || p.tag_antiga || p.patrimonio || p.numero_serie,
    nome: p.nome_computador || p.nome,
    usuario_atual: p.usuario_atual,
    colaborador_id: p.colaborador_id,
    antivirus: p.antivirus,
    antivirus_nome: p.antivirus_nome,
    antivirus_status: p.antivirus_status,
    status: p.status
  })), null, 2));

  // Check all distinct usuario_atual with Aprendiz or divergent
  const allUsersPcs = [...new Set(pcs.map(p => p.usuario_atual).filter(Boolean))];
  const allUsersNbs = [...new Set((nbs || []).map(p => p.usuario_atual).filter(Boolean))];
  console.log('All users in PCs containing Aprendiz:', allUsersPcs.filter(u => u.toLowerCase().includes('aprendiz')));
  console.log('All users in Nbs containing Aprendiz:', allUsersNbs.filter(u => u.toLowerCase().includes('aprendiz')));

  // Check any PC where antivirus is ESET but somehow marked or showing inativo
  const esetPcs = pcs.filter(p => {
    const nome = (p.antivirus_nome || '').toLowerCase();
    const av = (p.antivirus || '').toLowerCase();
    const st = (p.antivirus_status || '').toLowerCase();
    return nome.includes('eset') || av.includes('eset') || st.includes('eset');
  });
  console.log('ESET PCs count:', esetPcs.length);
  console.log('Sample ESET PCs antivirus fields:', esetPcs.slice(0, 5).map(p => ({
    nome_computador: p.nome_computador,
    antivirus: p.antivirus,
    antivirus_nome: p.antivirus_nome,
    antivirus_status: p.antivirus_status
  })));

  // Check all unique antivirus, antivirus_nome, antivirus_status values in pcs_internos
  console.log('Distinct antivirus values in pcs:', [...new Set(pcs.map(p => p.antivirus))]);
  console.log('Distinct antivirus_nome values in pcs:', [...new Set(pcs.map(p => p.antivirus_nome))]);
  console.log('Distinct antivirus_status values in pcs:', [...new Set(pcs.map(p => p.antivirus_status))]);

  // Check avaliacoes for pcs
  const { data: avals } = await sb.from('avaliacoes').select('*');
  console.log('Total avaliacoes:', avals?.length);
  if (avals?.length) {
    const pcMap = new Map(pcs.map(p => [p.id, p]));
    const joined = avals.map(a => {
      const pc = pcMap.get(a.equipamento_id);
      return {
        id: a.id,
        tag: pc?.etiqueta_interna || pc?.service_tag,
        usuario_atual: pc?.usuario_atual,
        pc_antivirus: pc?.antivirus,
        pc_antivirus_nome: pc?.antivirus_nome,
        aval_antivirus: a.antivirus,
        created_at: a.created_at
      };
    });
    console.log('Joined Avaliacoes vs PC (sample 10):', JSON.stringify(joined.slice(0, 10), null, 2));
    
    // Check how many have pc_antivirus === 'Sim' or pc_antivirus_nome === 'ESET' but aval_antivirus has Inativo
    const conflicting = joined.filter(j => 
      (j.pc_antivirus === 'Sim' || (j.pc_antivirus_nome || '').toLowerCase().includes('eset')) &&
      (j.aval_antivirus || '').toLowerCase().includes('inativo')
    );
    console.log('Conflicting avaliacoes count (PC is ESET/Sim, but avaliacao is Inativo):', conflicting.length);
    console.log('Conflicting samples:', JSON.stringify(conflicting.slice(0, 5), null, 2));
  }
}
check();

