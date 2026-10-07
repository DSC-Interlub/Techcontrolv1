const fs = require('fs');
const xlsx = require('xlsx');
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

function reconciliarColaborador(nomeRaw, listaColaboradores) {
  if (!nomeRaw || typeof nomeRaw !== 'string') return null;
  const clean = nomeRaw.trim();
  if (!clean || ['não', 'nao', 'none', 'disponível', 'disponivel', 'livre', 'estoque'].includes(clean.toLowerCase())) {
    return null;
  }
  if (clean.toLowerCase().startsWith('compartilhado')) {
    const parts = clean.split(/[-—–]/);
    if (parts.length > 1) {
      return {
        tipo: 'compartilhado',
        nome_formatado: `Compartilhado — ${parts.slice(1).join(' ').trim()}`,
        colaborador: null
      };
    }
    return { tipo: 'compartilhado', nome_formatado: clean, colaborador: null };
  }

  const prefixos = [
    /^(aprendiz|jovem aprendiz)\s+/i,
    /^(estagiário|estagiario)\s+/i,
    /^(trainee)\s+/i,
    /^(assistente|analista|auxiliar|coordenador|gerente|diretor)\s+/i
  ];
  let nomeSemPrefixo = clean;
  for (const p of prefixos) {
    nomeSemPrefixo = nomeSemPrefixo.replace(p, '').trim();
  }

  const norm = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const normNome = norm(nomeSemPrefixo);
  const normOriginal = norm(clean);

  let match = listaColaboradores.find(c => norm(c.nome_completo) === normNome);
  if (!match) match = listaColaboradores.find(c => norm(c.nome_completo) === normOriginal);
  if (!match) {
    match = listaColaboradores.find(c => {
      const cNorm = norm(c.nome_completo);
      return (cNorm.length > 5 && normNome.includes(cNorm)) || (normNome.length > 5 && cNorm.includes(normNome));
    });
  }
  if (!match) {
    const tokens = normNome.split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) {
      const primeiro = tokens[0];
      const ultimo = tokens[tokens.length - 1];
      match = listaColaboradores.find(c => {
        const cTokens = norm(c.nome_completo).split(/\s+/).filter(Boolean);
        return cTokens.length >= 2 && cTokens[0] === primeiro && cTokens[cTokens.length - 1] === ultimo;
      });
    }
  }

  if (match) {
    return {
      tipo: 'colaborador',
      nome_formatado: match.nome_completo,
      colaborador: match
    };
  }

  return {
    tipo: 'avulso',
    nome_formatado: nomeSemPrefixo || clean,
    colaborador: null
  };
}

async function testReconciliation() {
  const { data: colabs } = await sb.from('colaboradores').select('*');
  const wb = xlsx.readFile('C:/Users/kauan.pereira/.gemini/antigravity/brain/f22aadd9-4f99-4be7-b477-82e7a8f04bfb/.user_uploaded/media_1791375495010.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  console.log(`Testando reconciliação em ${rows.length} linhas da planilha...`);
  rows.forEach((r, idx) => {
    const usuarioPlanilha = r['Usuário / Setor'];
    const maquina = r['Máquina'];
    const avPlanilha = r['Antivírus'];
    const rec = reconciliarColaborador(usuarioPlanilha, colabs);
    console.log(`L${idx+1}: [${maquina}] "${usuarioPlanilha}" => tipo: ${rec?.tipo}, nome: "${rec?.nome_formatado}", colab_id: ${rec?.colaborador?.id ? 'SIM' : 'NÃO'}, AV: ${avPlanilha}`);
  });
}
testReconciliation();
