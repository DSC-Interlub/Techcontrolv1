function calcularPontuacaoEquipamento(dados, dataAquisicao) {
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
          pontos += 5;
        } else {
          pontos += 10;
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

const dadosTeste = {
  memoria_ram: "87.5% em uso (Total: 16 GB | Utilizada: 14 GB | Livre: 2 GB)",
  tipo_armazenamento: "SSD",
  espaco_disco: "191.6 GB livres (Capacidade: 473.7 GB | Tipo: SSD)",
  versao_windows: "Microsoft Windows 11 Pro (10.0.26200)",
  antivirus: "Inativo (Não detectado)",
  desempenho: "Muito rápido",
  problemas: [],
  atende_trabalho: "Sim",
  recomendacao_usuario: "Continuar como está",
  satisfacao: "Nota 8 a 10"
};

const dataAquisicao = new Date().toISOString().split('T')[0]; 
const resultado = calcularPontuacaoEquipamento(dadosTeste, dataAquisicao);

console.log("=== RESULTADO DA AVALIAÇÃO DE TESTE ===");
console.log(JSON.stringify(resultado, null, 2));
