const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
  const p = l.split('=');
  if (p.length >= 2) env[p[0].trim()] = p.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const VALTER_ID = 'fab52683-f4e7-4fb1-adaa-83289d158e0d';
const VALTER_NOME = 'Valter Alves Torres';
const VALTER_EMAIL = 'vtorres@interlub.com';

async function updateAll() {
  console.log('=== ATUALIZAÇÃO EM MASSA: DEFINIR VALTER ALVES TORRES COMO APROVADOR ===');

  // 1. Buscar colaboradores ativos que não são o Valter
  const { data: cols, error: errSelect } = await supabase
    .from('colaboradores')
    .select('id, nome_completo, email, status, responsavel_nome')
    .eq('status', 'Ativo')
    .neq('id', VALTER_ID);

  if (errSelect) {
    throw new Error('Erro ao listar colaboradores: ' + errSelect.message);
  }

  console.log(`Colaboradores ativos a atualizar: ${cols.length}`);

  // 2. Executar a atualização em massa
  const { data: updated, error: errUpdate } = await supabase
    .from('colaboradores')
    .update({
      responsavel_id: VALTER_ID,
      responsavel_nome: VALTER_NOME,
      responsavel_email: VALTER_EMAIL
    })
    .eq('status', 'Ativo')
    .neq('id', VALTER_ID)
    .select('id, nome_completo, email, responsavel_nome');

  if (errUpdate) {
    throw new Error('Erro ao atualizar colaboradores: ' + errUpdate.message);
  }

  console.log(`Sucesso! Total de colaboradores atualizados: ${updated ? updated.length : 0}`);

  // 3. Auditoria pós-atualização
  const { data: todosAtivos, error: errAuditoria } = await supabase
    .from('colaboradores')
    .select('id, nome_completo, responsavel_nome, responsavel_email')
    .eq('status', 'Ativo');

  if (errAuditoria) {
    throw new Error('Erro na auditoria: ' + errAuditoria.message);
  }

  const comValter = todosAtivos.filter(c => c.responsavel_nome === VALTER_NOME);
  const valterRegistro = todosAtivos.find(c => c.id === VALTER_ID);

  console.log('\n--- RELATÓRIO PÓS-ATUALIZAÇÃO ---');
  console.log(`Total de ativos: ${todosAtivos.length}`);
  console.log(`Colaboradores com Valter como aprovador: ${comValter.length}`);
  console.log(`Aprovador do próprio Valter: ${valterRegistro?.responsavel_nome} (${valterRegistro?.responsavel_email})`);

  console.log('\nAmostra dos colaboradores atualizados:');
  comValter.slice(0, 5).forEach(c => {
    console.log(` - ${c.nome_completo} -> Aprovador: ${c.responsavel_nome}`);
  });
}

updateAll().catch(err => {
  console.error('Falha na execução:', err);
  process.exit(1);
});
