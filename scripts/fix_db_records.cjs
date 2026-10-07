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

async function syncAndFix() {
  console.log('=== 1. CORRIGINDO USUÁRIOS DIVERGENTES EM PCS_INTERNOS ===');
  // Corrigir Barbara Souza Santos no PC IL-DKP-013
  const { data: barbaraColab } = await sb
    .from('colaboradores')
    .select('id, nome_completo')
    .ilike('nome_completo', '%barbara souza santos%')
    .single();

  if (barbaraColab) {
    console.log(`Colaboradora oficial encontrada: ${barbaraColab.nome_completo} (${barbaraColab.id})`);
    const { data: updatePc, error: errPc } = await sb
      .from('pcs_internos')
      .update({
        usuario_atual: barbaraColab.nome_completo,
        colaborador_id: barbaraColab.id
      })
      .eq('usuario_atual', 'Aprendiz Barbara Souza Santos')
      .select('id, etiqueta_interna, usuario_atual');

    if (errPc) console.error('Erro ao atualizar PC Barbara:', errPc);
    else console.log('PC atualizado com sucesso:', updatePc);
  }

  console.log('\n=== 2. SINCRONIZANDO ESET E ATIVANDO ANTIVÍRUS NAS AVALIAÇÕES ===');
  // Buscar todos os PCs que possuem antivirus === 'Sim' ou antivirus_nome === 'ESET'
  const { data: pcsEset } = await sb
    .from('pcs_internos')
    .select('id, etiqueta_interna, antivirus, antivirus_nome')
    .or('antivirus.eq.Sim,antivirus_nome.eq.ESET');

  const { data: nbsEset } = await sb
    .from('notebooks_externos')
    .select('id, etiqueta_interna, antivirus, antivirus_nome')
    .or('antivirus.eq.Sim,antivirus_nome.eq.ESET');

  const todosEsetIds = [
    ...(pcsEset || []).map(p => p.id),
    ...(nbsEset || []).map(n => n.id)
  ];
  console.log(`Total de equipamentos com ESET ativo: ${todosEsetIds.length}`);

  // Atualizar avaliações correspondentes para 'Ativo (ESET)'
  const { data: avalsAtualizadas, error: errAvals } = await sb
    .from('avaliacoes')
    .update({ antivirus: 'Ativo (ESET)' })
    .in('equipamento_id', todosEsetIds)
    .select('id, equipamento_id, antivirus');

  if (errAvals) console.error('Erro ao atualizar avaliacoes:', errAvals);
  else console.log(`Avaliações sincronizadas para 'Ativo (ESET)': ${avalsAtualizadas?.length || 0}`);

  console.log('\n=== 3. CONCLUINDO TAREFAS DE MANUTENÇÃO PENDENTES DE ANTIVÍRUS PARA MÁQUINAS COM ESET ===');
  const { data: tarefasAtualizadas, error: errTarefas } = await sb
    .from('tarefas_manutencao_equipamento')
    .update({
      status: 'Concluída'
    })
    .in('equipamento_id', todosEsetIds)
    .ilike('descricao', '%antiv%')
    .eq('status', 'Pendente')
    .select('id, equipamento_id, descricao, status');

  if (errTarefas) console.error('Erro ao concluir tarefas:', errTarefas);
  else console.log(`Tarefas de antivírus concluídas (pois máquina já possui ESET ativo): ${tarefasAtualizadas?.length || 0}`);

  console.log('\n=== 4. VERIFICAÇÃO FINAL APÓS SCRIPT ===');
  const { data: checkBarbara } = await sb
    .from('pcs_internos')
    .select('id, etiqueta_interna, usuario_atual, colaborador_id, antivirus, antivirus_nome')
    .ilike('usuario_atual', '%barbara%');
  console.log('Equipamentos da Barbara Souza Santos:', checkBarbara);

  const { data: checkAvalsInativo } = await sb
    .from('avaliacoes')
    .select('id, equipamento_id, antivirus')
    .in('equipamento_id', todosEsetIds)
    .ilike('antivirus', '%inativo%');
  console.log('Avaliações com Inativo remanescentes para máquinas com ESET:', checkAvalsInativo?.length || 0);

  const { data: checkTarefasPendentes } = await sb
    .from('tarefas_manutencao_equipamento')
    .select('id, equipamento_id, descricao, status')
    .in('equipamento_id', todosEsetIds)
    .ilike('descricao', '%antiv%')
    .eq('status', 'Pendente');
  console.log('Tarefas de antivírus pendentes remanescentes para máquinas com ESET:', checkTarefasPendentes?.length || 0);
}

syncAndFix();
