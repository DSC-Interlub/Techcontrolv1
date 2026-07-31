import { base44 } from '@/api/base44Client';

/**
 * Calcula a pontuação e classificação de saúde de um equipamento com base nas respostas da avaliação
 * e na data de aquisição do equipamento.
 */
export function calcularPontuacaoEquipamento(dados, dataAquisicao) {
  let pontos = 0;

  // 1. Memória RAM
  let ramVal = dados.memoria_ram;
  let ramPct = null;
  if (typeof ramVal === 'number') {
    ramPct = ramVal;
  } else if (typeof ramVal === 'string') {
    const match = ramVal.match(/^([\d.,]+)%/);
    if (match) {
      ramPct = parseFloat(match[1].replace(',', '.'));
    }
  }

  if (ramPct !== null) {
    if (ramPct < 50) pontos += 0;
    else if (ramPct < 70) pontos += 3;
    else if (ramPct < 90) pontos += 6;
    else pontos += 10;
  } else {
    if (dados.memoria_ram === "Menos de 50%") pontos += 0;
    else if (dados.memoria_ram === "Entre 50% e 70%") pontos += 3;
    else if (dados.memoria_ram === "Entre 70% e 90%") pontos += 6;
    else if (dados.memoria_ram === "Acima de 90%") pontos += 10;
  }

  // 2. Tipo de Armazenamento
  let tipoArm = dados.tipo_armazenamento;
  if (tipoArm === "HD" || tipoArm === "HDD") pontos += 5;
  else if (tipoArm === "SSD") pontos += 0;

  // 3. Espaço em Disco
  let espacoVal = dados.espaco_disco;
  let espacoGB = null;
  if (typeof espacoVal === 'number') {
    espacoGB = espacoVal;
  } else if (typeof espacoVal === 'string') {
    const match = espacoVal.match(/^([\d.,]+)\s*GB/i);
    if (match) {
      espacoGB = parseFloat(match[1].replace(',', '.'));
    } else if (!isNaN(parseFloat(espacoVal))) {
      espacoGB = parseFloat(espacoVal);
    }
  }

  if (espacoGB !== null) {
    if (espacoGB >= 100) pontos += 0;
    else if (espacoGB >= 50) pontos += 3;
    else if (espacoGB >= 20) pontos += 6;
    else pontos += 10;
  } else {
    if (dados.espaco_disco === "Mais de 100 GB livres") pontos += 0;
    else if (dados.espaco_disco === "Entre 50 e 100 GB livres") pontos += 3;
    else if (dados.espaco_disco === "Entre 20 e 50 GB livres") pontos += 6;
    else if (dados.espaco_disco === "Menos de 20 GB livres") pontos += 10;
  }

  // 4. Versão do Windows
  let winVal = dados.versao_windows;
  if (typeof winVal === 'string') {
    if (winVal.toLowerCase().includes("windows 10")) pontos += 5;
    else if (winVal.toLowerCase().includes("windows 11")) pontos += 0;
  } else {
    if (dados.versao_windows === "Windows 10") pontos += 5;
    else if (dados.versao_windows === "Windows 11") pontos += 0;
  }

  // 5. Antivírus
  let avVal = dados.antivirus;
  if (typeof avVal === 'string') {
    const match = avVal.match(/^(Ativo|Inativo)\s*\(([^)]+)\)/i);
    if (match) {
      const status = match[1];
      const nome = match[2];
      
      if (status === "Ativo") {
        pontos += 0;
      } else if (status === "Inativo") {
        if (nome !== "Não detectado") {
          pontos += 5; // Existe antivírus mas está desativado (Aparece aviso de desativado)
        } else {
          pontos += 10; // Nenhum antivírus instalado (Não tem antivírus)
        }
      }
    } else {
      if (avVal === "Sim, está ativo" || avVal === "Sim") pontos += 0;
      else if (avVal === "Aparece aviso de desativado" || avVal === "Aviso de desativado") pontos += 5;
      else if (avVal.startsWith("Inativo") || avVal === "Não tem antivírus" || avVal === "Não") pontos += 10;
    }
  } else {
    if (dados.antivirus === "Sim, está ativo" || dados.antivirus === "Sim") pontos += 0;
    else if (dados.antivirus === "Aparece aviso de desativado" || dados.antivirus === "Aviso de desativado") pontos += 5;
    else if (dados.antivirus === "Não tem antivírus" || dados.antivirus === "Não") pontos += 10;
  }

  // 6. Desempenho
  if (dados.desempenho === "Muito rápido" || dados.desempenho === "Rápido") pontos += 0;
  else if (dados.desempenho === "Bom" || dados.desempenho === "Normal") pontos += 3;
  else if (dados.desempenho === "Lento") pontos += 8;
  else if (dados.desempenho === "Muito lento" || dados.desempenho === "Com Problema") pontos += 10;

  // 7. Problemas
  const numProblemas = dados.problemas?.length || 0;
  pontos += numProblemas * 1.25;

  // 8. Atende ao Trabalho
  if (dados.atende_trabalho === "Sim") pontos += 0;
  else if (dados.atende_trabalho === "Parcialmente") pontos += 5;
  else if (dados.atende_trabalho === "Não") pontos += 10;

  // 9. Recomendação do Usuário
  if (dados.recomendacao_usuario === "Continuar como está") pontos += 0;
  else if (dados.recomendacao_usuario === "Receber melhorias (upgrade)") pontos += 3;
  else if (dados.recomendacao_usuario === "Ser substituído") pontos += 5;

  // 10. Satisfação
  if (dados.satisfacao === "Nota 8 a 10") pontos += 0;
  else if (dados.satisfacao === "Nota 5 a 7") pontos += 3;
  else if (dados.satisfacao === "Nota 0 a 4") pontos += 5;

  // 11. Tempo de Uso
  let tempoUsoAnos = 0;
  if (dataAquisicao) {
    const hoje = new Date();
    const aquisicao = new Date(dataAquisicao);
    tempoUsoAnos = (hoje.getTime() - aquisicao.getTime()) / (1000 * 60 * 60 * 24 * 365);
  }

  let pontosTempoUso = 0;
  if (tempoUsoAnos < 2) pontosTempoUso = 0;
  else if (tempoUsoAnos < 3) pontosTempoUso = 5;
  else if (tempoUsoAnos < 4) pontosTempoUso = 10;
  else if (tempoUsoAnos < 5) pontosTempoUso = 15;
  else pontosTempoUso = 20;

  pontos += pontosTempoUso;
  pontos = Math.min(100, Math.round(pontos * 10) / 10);

  let classificacao;
  if (pontos <= 39) classificacao = "Manter";
  else if (pontos <= 69) classificacao = "Upgrade";
  else classificacao = "Substituir";

  return { pontuacao_total: pontos, classificacao, tempo_uso_anos: tempoUsoAnos, pontosTempoUso };
}

export async function gerarTarefasManutencao(avaliacao) {
  if (!avaliacao || !avaliacao.id || !avaliacao.equipamento_id) return [];

  const equipamentoId = avaliacao.equipamento_id;
  const equipamentoTipo = avaliacao.equipamento_tipo || 'PCs_Internos';
  const avaliacaoId = avaliacao.id;

  const tarefasASeremCriadas = [];

  // --- REGRAS AUTOMÁTICAS ---

  // 1. RAM (uso > 90%)
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
      descricao: "Diagnosticar processos consumindo alta memória RAM e encerrar tarefas em segundo plano",
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
      descricao: "Liberar espaço em disco (limpeza de %temp%, downloads e lixeira)",
      origem: "Regra automática"
    });
  }

  // 3. Disco HDD ("HDD" ou "HD")
  const tipoArm = avaliacao.tipo_armazenamento;
  if (tipoArm === "HD" || tipoArm === "HDD") {
    tarefasASeremCriadas.push({
      descricao: "Avaliar e agendar upgrade de armazenamento de HDD para SSD",
      origem: "Regra automática"
    });
  }

  // 4. Windows 10
  const winVal = avaliacao.versao_windows;
  if (typeof winVal === 'string' && winVal.toLowerCase().includes("windows 10")) {
    tarefasASeremCriadas.push({
      descricao: "Verificar compatibilidade e agendar atualização para o Windows 11",
      origem: "Regra automática"
    });
  }

  // 5. Antivírus Inativo ou Faltando
  const avVal = avaliacao.antivirus;
  if (typeof avVal === 'string' && (avVal.toLowerCase().includes("inativo") || avVal.toLowerCase().includes("não") || avVal.toLowerCase().includes("aviso"))) {
    tarefasASeremCriadas.push({
      descricao: "Verificar e solicitar instalação/ativação do antivírus corporativo via filial do México",
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
          descricao: "Reiniciar o sistema para liberar cache de memória e aplicar atualizações",
          origem: "Regra automática"
        });
      }
    }
  }

  // 7. Reparo e Integridade de Arquivos do Sistema
  tarefasASeremCriadas.push({
    descricao: "Executar reparo de arquivos do sistema e integridade do Windows (sfc /scannow & DISM)",
    origem: "Regra automática"
  });

  // --- PROBLEMAS RELATADOS PELO USUÁRIO ---
  const problemas = avaliacao.problemas || [];
  if (Array.isArray(problemas)) {
    problemas.forEach(prob => {
      let descTarefa = null;
      if (prob === "Demora para ligar") {
        descTarefa = "Otimizar programas de inicialização automática no boot do Windows";
      } else if (prob === "Programas travam") {
        descTarefa = "Diagnosticar processos consumindo alta memória RAM e encerrar tarefas em segundo plano";
      } else if (prob === "Internet lenta (somente neste computador)") {
        descTarefa = "Testar conexão de rede, redefinir pilha TCP/IP e atualizar driver da placa de rede";
      } else if (prob === "Tela piscando ou apagando") {
        descTarefa = "Verificar cabos de vídeo, conexões e driver de vídeo do monitor";
      } else if (prob === "Teclado ou mouse com defeito") {
        descTarefa = "Testar ou substituir periféricos com defeito (teclado / mouse)";
      } else if (prob === "Barulho excessivo" || prob === "Aquecimento") {
        // Removido a pedido do usuário
        descTarefa = null;
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

  // --- DEDUPLICAÇÃO INTERNA DE TAREFAS NA MESMA AVALIAÇÃO ---
  const tarefasUnicas = [];
  const descricoesNaAvaliacao = new Set();
  tarefasASeremCriadas.forEach(t => {
    if (!descricoesNaAvaliacao.has(t.descricao)) {
      descricoesNaAvaliacao.add(t.descricao);
      tarefasUnicas.push(t);
    }
  });

  if (tarefasUnicas.length === 0) return [];

  // --- FILTRAR TAREFAS QUE JÁ EXISTEM COMO PENDENTES NO BANCO ---
  try {
    const pendentesExistentes = await base44.entities.TarefasManutencao.filter({
      equipamento_id: equipamentoId,
      status: 'Pendente'
    });

    const descricoesPendentes = new Set(pendentesExistentes.map(t => t.descricao));
    const novasTarefas = tarefasUnicas.filter(t => !descricoesPendentes.has(t.descricao));

    if (novasTarefas.length === 0) return [];

    // Formatar e gravar
    const payloads = novasTarefas.map(t => ({
      equipamento_id: equipamentoId,
      equipamento_tipo: equipamentoTipo,
      avaliacao_id: avaliacaoId,
      descricao: t.descricao,
      origem: t.origem,
      status: 'Pendente'
    }));

    return await base44.entities.TarefasManutencao.create(payloads);
  } catch (err) {
    console.error("Erro ao gerar tarefas de manutenção:", err);
    return [];
  }
}

/**
 * Extrai o ID do AnyDesk de um objeto de equipamento ou avaliação (da propriedade ou das observações)
 */
export function extrairAnyDesk(item) {
  if (!item) return "";
  if (typeof item === 'string') {
    const match = item.match(/AnyDesk:\s*([^|;\n\r]+)/i);
    return match ? match[1].trim() : "";
  }
  if (item.anydesk_id && typeof item.anydesk_id === 'string' && item.anydesk_id.trim() && !item.anydesk_id.includes('undefined')) {
    return item.anydesk_id.trim();
  }
  const obs = item.observacoes || "";
  const match = obs.match(/AnyDesk:\s*([^|;\n\r]+)/i);
  if (match) return match[1].trim();

  for (const val of Object.values(item)) {
    if (typeof val === 'string' && val.includes('AnyDesk:')) {
      const m = val.match(/AnyDesk:\s*([^|;\n\r]+)/i);
      if (m) return m[1].trim();
    }
  }
  return "";
}

/**
 * Formata ou atualiza o campo de observações anexando/substituindo as tags de AnyDesk, RAM e SO mais recentes da avaliação
 */
export function formatarObservacoesComAnyDesk(obsAtual, anydeskId, memoriaRam, versaoWindows) {
  let limpo = (obsAtual || "").replace(/AnyDesk:\s*[^|;\n\r]+/gi, "")
                           .replace(/RAM:\s*[^|;\n\r]+/gi, "")
                           .replace(/SO:\s*[^|;\n\r]+/gi, "")
                           .replace(/\|{2,}/g, "|")
                           .trim();
  if (limpo.startsWith("|")) limpo = limpo.substring(1).trim();
  if (limpo.endsWith("|")) limpo = limpo.substring(0, limpo.length - 1).trim();

  const partes = [];
  if (anydeskId && anydeskId.trim()) partes.push(`AnyDesk: ${anydeskId.trim()}`);
  if (memoriaRam && memoriaRam.trim()) partes.push(`RAM: ${memoriaRam.trim()}`);
  if (versaoWindows && versaoWindows.trim()) partes.push(`SO: ${versaoWindows.trim().split('|')[0].trim()}`);
  if (limpo) partes.push(limpo);

  return partes.join(" | ");
}

