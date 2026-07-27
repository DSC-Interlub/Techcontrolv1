const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse env keys manual
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const tabelas = [
  'pcs_internos',
  'notebooks_externos',
  'tablets',
  'smartphones',
  'cameras',
  'coletores',
  'canetas_vibracao'
];

async function run() {
  console.log("=== INICIANDO CORREÇÃO DO STATUS DOS EQUIPAMENTOS ===");
  
  for (const tabela of tabelas) {
    const { data: itens, error: readError } = await supabase
      .from(tabela)
      .select('*');

    if (readError) {
      console.error(`Erro ao ler ${tabela}:`, readError.message);
      continue;
    }

    // Filtra os itens com inconsistência
    const afetados = itens.filter(item => {
      const temColabId = item.colaborador_id !== null && item.colaborador_id !== undefined;
      const temUsuario = item.usuario_atual && item.usuario_atual.trim() !== "" && !item.usuario_atual.toLowerCase().includes("devolução");
      const estaDisponivel = item.status === 'Disponível';
      return (temColabId || temUsuario) && estaDisponivel;
    });

    if (afetados.length === 0) {
      console.log(`Tabela ${tabela}: Nenhuma inconsistência encontrada.`);
      continue;
    }

    console.log(`Tabela ${tabela}: Atualizando ${afetados.length} registros...`);

    const ids = afetados.map(a => a.id);
    const { error: updateError } = await supabase
      .from(tabela)
      .update({ status: 'Em uso' })
      .in('id', ids);

    if (updateError) {
      console.error(`Erro ao atualizar ${tabela}:`, updateError.message);
    } else {
      console.log(`Tabela ${tabela}: ${afetados.length} registros atualizados para 'Em uso' com sucesso!`);
    }
  }

  console.log("=== PROCESSO CONCLUÍDO COM SUCESSO ===");
}

run();
