// Script de teste manual de geração de tarefas integrado com a nuvem do Supabase (Sem dotenv)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leitor simples de .env.local manual
function parseEnvLocal() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      env[key] = value;
    }
  });
  return env;
}

const envVars = parseEnvLocal();
const supabaseUrl = envVars.SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Erro: Credenciais do Supabase não encontradas no arquivo .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function gerarTarefasManutencaoLocal(avaliacao) {
  const equipamentoId = avaliacao.equipamento_id;
  const equipamentoTipo = avaliacao.equipamento_tipo || 'PCs_Internos';
  const avaliacaoId = avaliacao.id;

  const tarefasASeremCriadas = [];

  // 1. RAM (ram_uso_percentual > 90)
  let ramPct = null;
  const ramVal = avaliacao.memoria_ram;
  if (typeof ramVal === 'number') {
    ramPct = ramVal;
  } else if (typeof ramVal === 'string') {
    const match = ramVal.match(/^([\d.,]+)%/);
    if (match) {
      ramPct = parseFloat(match[1].replace(',', '.'));
    }
  }
  if (ramPct !== null && ramPct > 90) {
    tarefasASeremCriadas.push({
      descricao: "Verificar processos consumindo memória RAM em excesso / considerar upgrade de memória",
      origem: "Regra automática"
    });
  }

  // 2. Espaço livre (disco_livre_percentual < 15 ou disco_livre_gb < 20)
  let espacoGB = null;
  let espacoTotalGB = null;
  const espacoVal = avaliacao.espaco_disco;
  if (typeof espacoVal === 'number') {
    espacoGB = espacoVal;
  } else if (typeof espacoVal === 'string') {
    const matchLivre = espacoVal.match(/^([\d.,]+)\s*GB/i);
    if (matchLivre) {
      espacoGB = parseFloat(matchLivre[1].replace(',', '.'));
    }
    const matchTotal = espacoVal.match(/Capacidade:\s*([\d.,]+)\s*GB/i);
    if (matchTotal) {
      espacoTotalGB = parseFloat(matchTotal[1].replace(',', '.'));
    }
  }

  let discoLivrePct = null;
  if (espacoGB !== null && espacoTotalGB !== null && espacoTotalGB > 0) {
    discoLivrePct = (espacoGB / espacoTotalGB) * 100;
  }

  if (espacoGB !== null && (espacoGB < 20 || (discoLivrePct !== null && discoLivrePct < 15))) {
    tarefasASeremCriadas.push({
      descricao: "Liberar espaço em disco (arquivos temporários, downloads antigos)",
      origem: "Regra automática"
    });
  }

  // 3. Disco HDD
  const tipoArm = avaliacao.tipo_armazenamento;
  if (tipoArm === "HD" || tipoArm === "HDD") {
    tarefasASeremCriadas.push({
      descricao: "Avaliar upgrade para SSD",
      origem: "Regra automática"
    });
  }

  // 4. Windows 10
  const winVal = avaliacao.versao_windows;
  if (typeof winVal === 'string' && winVal.toLowerCase().includes("windows 10")) {
    tarefasASeremCriadas.push({
      descricao: "Atualizar para Windows 11 (ou avaliar compatibilidade de hardware)",
      origem: "Regra automática"
    });
  }

  // 5. Antivírus Inativo
  const avVal = avaliacao.antivirus;
  if (typeof avVal === 'string' && avVal.toLowerCase().includes("inativo")) {
    tarefasASeremCriadas.push({
      descricao: "Reativar ou instalar antivírus",
      origem: "Regra automática"
    });
  }

  // 6. Uptime > 15 dias
  if (typeof winVal === 'string') {
    const matchUptime = winVal.match(/Uptime:\s*(\d+)\s*dias/i);
    if (matchUptime) {
      const dias = parseInt(matchUptime[1]);
      if (dias > 15) {
        tarefasASeremCriadas.push({
          descricao: "Reiniciar a máquina regularmente (uptime muito alto detectado)",
          origem: "Regra automática"
        });
      }
    }
  }

  // Problemas do usuário
  const problemas = avaliacao.problemas || [];
  if (Array.isArray(problemas)) {
    problemas.forEach(prob => {
      let descTarefa = null;
      if (prob === "Demora para ligar") {
        descTarefa = "Investigar causa da lentidão ao ligar (inicialização pesada, muitos programas no boot)";
      } else if (prob === "Programas travam") {
        descTarefa = "Investigar processos em segundo plano / possível malware / verificar logs de erro";
      } else if (prob === "Internet lenta (somente neste computador)") {
        descTarefa = "Testar placa de rede / atualizar drivers / verificar cabo ou sinal Wi-Fi";
      } else if (prob === "Tela piscando ou apagando") {
        descTarefa = "Verificar cabo de vídeo / drivers da placa de vídeo / testar com outro monitor";
      } else if (prob === "Teclado ou mouse com defeito") {
        descTarefa = "Verificar ou trocar periféricos (teclado/mouse)";
      } else if (prob === "Barulho excessivo") {
        descTarefa = "Levar para limpeza física interna e lubrificação/troca de coolers";
      } else if (prob === "Aquecimento") {
        descTarefa = "Levar para limpeza física interna e troca de pasta térmica";
      } else {
        descTarefa = `Investigar e resolver problema relatado: ${prob}`;
      }

      if (descTarefa) {
        tarefasASeremCriadas.push({
          descricao: descTarefa,
          origem: "Problema relatado pelo usuário"
        });
      }
    });
  }

  console.log("Tarefas a serem geradas:", tarefasASeremCriadas.map(t => t.descricao));

  // Filtrar duplicadas ainda pendentes no Supabase
  const { data: pendentesExistentes } = await supabase
    .from('tarefas_manutencao_equipamento')
    .select('*')
    .eq('equipamento_id', equipamentoId)
    .eq('status', 'Pendente');

  const descricoesPendentes = new Set((pendentesExistentes || []).map(t => t.descricao));
  const novasTarefas = tarefasASeremCriadas.filter(t => !descricoesPendentes.has(t.descricao));

  if (novasTarefas.length === 0) {
    console.log("Nenhuma tarefa nova. Todas já estão ativas como Pendente.");
    return [];
  }

  const payloads = novasTarefas.map(t => ({
    equipamento_id: equipamentoId,
    equipamento_tipo: equipamentoTipo,
    avaliacao_id: avaliacaoId,
    descricao: t.descricao,
    origem: t.origem,
    status: 'Pendente'
  }));

  const { data: inserted, error } = await supabase
    .from('tarefas_manutencao_equipamento')
    .insert(payloads)
    .select();

  if (error) throw error;
  return inserted;
}

async function runTest() {
  console.log("Iniciando simulação de gravação de avaliação...");
  
  const { data: pcs } = await supabase.from('pcs_internos').select('id, marca, modelo, usuario_atual').limit(1);
  if (!pcs || pcs.length === 0) {
    console.error("Nenhum PC cadastrado no banco de dados.");
    return;
  }
  const pc = pcs[0];
  console.log(`Equipamento de teste: ID ${pc.id} (${pc.marca} ${pc.modelo} - Usuário: ${pc.usuario_atual})`);

  // Criar avaliação simulada com os parâmetros informados pelo usuário:
  // RAM 94.1% (> 90%), Windows 10, antivírus inativo, Uptime 18 dias (> 15 dias) e "Programas travam"
  const avaliacaoData = {
    equipamento_id: pc.id,
    equipamento_tipo: "PCs_Internos",
    equipamento_nome: `${pc.marca} ${pc.modelo}`.trim(),
    usuario_equipamento: pc.usuario_atual || "Teste",
    numero_avaliacao: 999,
    memoria_ram: "94.1% em uso (Total: 16 GB | Utilizada: 15.0 GB | Livre: 1.0 GB)",
    tipo_armazenamento: "SSD",
    espaco_disco: "191.6 GB livres (Capacidade: 473.7 GB | Tipo: SSD)",
    versao_windows: "Microsoft Windows 10 Pro (10.0.19045) | Uptime: 18 dias e 5 horas",
    antivirus: "Inativo (Não detectado)",
    desempenho: "Muito rápido",
    problemas: ["Programas travam"],
    atende_trabalho: "Sim",
    recomendacao_usuario: "Continuar como está",
    satisfacao: "Nota 8 a 10",
    data_avaliacao: new Date().toISOString(),
    avaliador: "teste-integrado@techcontrol.com"
  };

  const { data: avaliacaoCriada, error: errEval } = await supabase
    .from('avaliacoes')
    .insert(avaliacaoData)
    .select()
    .single();

  if (errEval) {
    console.error("Erro ao criar avaliação:", errEval);
    return;
  }
  
  console.log("Avaliação de teste criada! ID:", avaliacaoCriada.id);

  console.log("Executando geração de tarefas...");
  const tarefasCriadas = await gerarTarefasManutencaoLocal(avaliacaoCriada);

  console.log("--- TAREFAS GRAVADAS NO BANCO DE DADOS ---");
  console.log(JSON.stringify(tarefasCriadas, null, 2));
}

runTest().catch(console.error);
