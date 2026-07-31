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

const listagem = [
  {"colaborador": "Lucas Gabriel Evaristo José", "gestor": "Clóvis Palácio Junior", "gestor_email": "operacoes.1@interlub.com", "compras": "Clóvis Palácio Junior"},
  {"colaborador": "Alisson Alves da Silva", "gestor": "Elder de Almeida Amorim", "gestor_email": "operacoes@interlub.com", "compras": "Clóvis Palácio Junior"},
  {"colaborador": "Jorge Willian Lourenço", "gestor": "Elder de Almeida Amorim", "gestor_email": "operacoes@interlub.com", "compras": "Clóvis Palácio Junior"},
  {"colaborador": "Rodrigo Vieira de Oliveira", "gestor": "Elder de Almeida Amorim", "gestor_email": "operacoes@interlub.com", "compras": "Clóvis Palácio Junior"},
  {"colaborador": "Victor Neves Santos", "gestor": "Elder de Almeida Amorim", "gestor_email": "operacoes@interlub.com", "compras": "Clóvis Palácio Junior"},
  {"colaborador": "Wilber Dias Barbosa", "gestor": "Elder de Almeida Amorim", "gestor_email": "operacoes@interlub.com", "compras": "Clóvis Palácio Junior"},
  {"colaborador": "Elder de Almeida Amorim", "gestor": "Clóvis Palácio Junior", "gestor_email": "operacoes.1@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Nayara Moura de Souza", "gestor": "Kauana Victoria Macias de Lima", "gestor_email": "sac.sp.4@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Tatally Nunes de Almeida", "gestor": "Kauana Victoria Macias de Lima", "gestor_email": "sac.sp.4@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Tiago Graciano Rodrigues Dos Santos", "gestor": "Kauana Victoria Macias de Lima", "gestor_email": "sac.sp.4@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Yara dos Santos Oliveira", "gestor": "Kauana Victoria Macias de Lima", "gestor_email": "sac.sp.4@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Esdon Espessote Tomiati", "gestor": "Marcelo Cervantes Del Rio Baptista", "gestor_email": "mcervantes@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Jennifer Inês Silva Sousa", "gestor": "Marcelo Cervantes Del Rio Baptista", "gestor_email": "mcervantes@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Clóvis Palácio Junior", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Henrique Barthmann Tudela", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Jorge Lucas Holanda Alencar Clarentino", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Kauana Victoria Macias de Lima", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Marcelo Miranda Silva", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Renato Alves Carvalho", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Grazieli Grenia Santos Monteiro", "gestor": "Clóvis Palácio Junior", "gestor_email": "operacoes.1@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Kauan Gomes Kubia Pereira", "gestor": "Jorge Lucas Holanda Alencar Clarentino", "gestor_email": "itm@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Ana Paula Gonçalves Caetano Silva Rocha", "gestor": "Marcelo Miranda Silva", "gestor_email": "gaf@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Ariana Mara da Silva", "gestor": "Marcelo Miranda Silva", "gestor_email": "gaf@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Evandro Luis Leite", "gestor": "Marcelo Miranda Silva", "gestor_email": "gaf@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Neide Oliveira Nascimento", "gestor": "Marcelo Miranda Silva", "gestor_email": "gaf@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Ricardo Francisco dos Santos", "gestor": "Marcelo Miranda Silva", "gestor_email": "gaf@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Cristina Vilas Boas Pinto", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Emily Vitória Orsolan Sofiati", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Evelin Maira Aiolfi Oliveira", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Evelin Vanessa Silva Santos", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Fernanda Hernandes Silva", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Jaqueline Maria Barros Hernandes", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Leonardo Barbosa Gomes", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Doriedson Silva Nunes", "gestor": "Clóvis Palácio Junior", "gestor_email": "operacoes.1@interlub.com", "compras": "Clóvis Palácio Junior"},
  {"colaborador": "Roberto Aparecido Lima", "gestor": "Clóvis Palácio Junior", "gestor_email": "operacoes.1@interlub.com", "compras": "Clóvis Palácio Junior"},
  {"colaborador": "Maria do Carmo Custodio", "gestor": "Cristina Vilas Boas Pinto", "gestor_email": "dp@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Matheus Henrique Pavanello", "gestor": "Elder de Almeida Amorim", "gestor_email": "operacoes@interlub.com", "compras": "Clóvis Palácio Junior"},
  {"colaborador": "Márcio Roberto da Silva", "gestor": "Elder de Almeida Amorim", "gestor_email": "operacoes@interlub.com", "compras": "Clóvis Palácio Junior"},
  {"colaborador": "Mike Bezerra dos Santos", "gestor": "Elder de Almeida Amorim", "gestor_email": "operacoes@interlub.com", "compras": "Clóvis Palácio Junior"},
  {"colaborador": "Barbara Souza Santos", "gestor": "Evelin Maira Aiolfi Oliveira", "gestor_email": "dho@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Bruna Angelina Vieira Baptista", "gestor": "Evelin Maira Aiolfi Oliveira", "gestor_email": "dho@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Lohany Souza Amorim", "gestor": "Evelin Maira Aiolfi Oliveira", "gestor_email": "dho@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Renato Bragheto Júnior", "gestor": "Kauana Victoria Macias de Lima", "gestor_email": "sac.sp.4@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"},
  {"colaborador": "Glaucio Rogério Bonaldo da Silva", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Marcelo Miranda Silva"},
  {"colaborador": "Valter Alves Torres", "gestor": "Valter Alves Torres", "gestor_email": "vtorres@interlub.com", "compras": "Glaucio Rogério Bonaldo da Silva"}
];

function normalizarNome(nome) {
  if (!nome) return '';
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, ' ') // normaliza espacos
    .trim();
}

async function run() {
  console.log("=== PREVIEW DE ATUALIZAÇÃO EM LOTE ===");
  
  // Buscar colaboradores do banco
  const { data: dbColabs, error } = await supabase
    .from('colaboradores')
    .select('id, nome_completo, email');

  if (error) {
    console.error("Erro ao buscar colaboradores:", error.message);
    return;
  }

  console.log(`Colaboradores cadastrados no banco: ${dbColabs.length}`);

  // Mapear colaboradores do banco por nome normalizado
  const colabMap = {};
  dbColabs.forEach(c => {
    colabMap[normalizarNome(c.nome_completo)] = c;
  });

  let encontrados = 0;
  let naoEncontrados = [];
  let compradoresMapeados = 0;
  let compradoresNaoEncontrados = [];

  const atualizacoes = [];

  for (const item of listagem) {
    const nomeColabNorm = normalizarNome(item.colaborador);
    const dbColab = colabMap[nomeColabNorm];

    if (!dbColab) {
      naoEncontrados.push(item.colaborador);
      continue;
    }
    encontrados++;

    // Achar o comprador (Compras) no banco
    const nomeCompradorNorm = normalizarNome(item.compras);
    const dbComprador = colabMap[nomeCompradorNorm];

    let responsavel_id = null;
    let responsavel_nome = null;
    let responsavel_email = null;

    if (dbComprador) {
      responsavel_id = dbComprador.id;
      responsavel_nome = dbComprador.nome_completo;
      responsavel_email = dbComprador.email || '';
      compradoresMapeados++;
    } else {
      compradoresNaoEncontrados.push({ colaborador: item.colaborador, compras: item.compras });
    }

    atualizacoes.push({
      id: dbColab.id,
      nome_completo: dbColab.nome_completo,
      contato_responsavel_nome: item.gestor,
      contato_responsavel_email: item.gestor_email,
      responsavel_id,
      responsavel_nome,
      responsavel_email
    });
  }

  console.log(`\nResultados do mapeamento:`);
  console.log(`- Colaboradores encontrados no banco: ${encontrados} de ${listagem.length}`);
  console.log(`- Compradores correspondidos no banco: ${compradoresMapeados} de ${listagem.length}`);

  if (naoEncontrados.length > 0) {
    console.log(`\n⚠️ Colaboradores NÃO encontrados no banco (verifique a grafia):`);
    naoEncontrados.forEach(nome => console.log(` - "${nome}"`));
  }

  if (compradoresNaoEncontrados.length > 0) {
    console.log(`\n⚠️ Compradores NÃO encontrados no banco (verifique a grafia):`);
    compradoresNaoEncontrados.forEach(c => console.log(` - "${c.compras}" (para o colaborador: ${c.colaborador})`));
  }

  console.log(`\nPreview das primeiras 5 atualizações planejadas:`);
  atualizacoes.slice(0, 5).forEach(a => {
    console.log(`\nColaborador: ${a.nome_completo} (ID: ${a.id})`);
    console.log(`  -> Gestor: ${a.contato_responsavel_nome} | E-mail Gestor: ${a.contato_responsavel_email}`);
    console.log(`  -> Compras (Aprovador): ${a.responsavel_nome || 'NÃO ENCONTRADO'} (ID: ${a.responsavel_id || 'N/A'}) | E-mail Compras: ${a.responsavel_email || 'N/A'}`);
  });
}

run();
