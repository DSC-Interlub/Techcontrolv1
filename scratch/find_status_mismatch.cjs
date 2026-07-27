const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manual
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
  console.log("=== ANÁLISE DE INCONSISTÊNCIA DE STATUS ===");
  
  for (const tabela of tabelas) {
    const { data: itens, error } = await supabase
      .from(tabela)
      .select('*');

    if (error) {
      console.error(`Erro ao ler ${tabela}:`, error.message);
      continue;
    }

    // Filtra no JS para maior precisão (colaborador_id preenchido ou usuario_atual preenchido e status = 'Disponível')
    const afetados = itens.filter(item => {
      const temColabId = item.colaborador_id !== null && item.colaborador_id !== undefined;
      const temUsuario = item.usuario_atual && item.usuario_atual.trim() !== "" && !item.usuario_atual.toLowerCase().includes("devolução");
      const estaDisponivel = item.status === 'Disponível';
      return (temColabId || temUsuario) && estaDisponivel;
    });

    console.log(`\nTabela: ${tabela}`);
    console.log(`Total de registros afetados: ${afetados.length}`);
    
    if (afetados.length > 0) {
      console.log("Exemplos:");
      afetados.slice(0, 5).forEach(item => {
        console.log(` - ID: ${item.id} | Marca: ${item.marca} | Modelo: ${item.modelo} | Etiqueta: ${item.etiqueta_interna || 'N/A'} | Usuário Atual: ${item.usuario_atual || 'N/A'} | Colab ID: ${item.colaborador_id || 'N/A'}`);
      });
    }
  }
}

run();
