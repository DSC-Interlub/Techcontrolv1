// Função para calcular o score e recomendação do equipamento com base em critérios fixos
export const calcularAvaliacaoEquipamento = async (equipamento, base44) => {
  try {
    let scoreTotal = 0;

    // 1. Idade do equipamento — até 20 pontos
    if (equipamento.data_aquisicao) {
      const hoje = new Date();
      const dataAquisicao = new Date(equipamento.data_aquisicao);
      const diffAnos = (hoje - dataAquisicao) / (1000 * 60 * 60 * 24 * 365);
      
      if (diffAnos < 2) scoreTotal += 0;
      else if (diffAnos < 3) scoreTotal += 5;
      else if (diffAnos < 4) scoreTotal += 10;
      else if (diffAnos < 5) scoreTotal += 15;
      else scoreTotal += 20;
    }

    // 2. Hardware e capacidade — até 20 pontos
    let hardwareScore = 0;
    
    // Tipo de armazenamento
    if (equipamento.avaliacao_tipo_armazenamento === "SSD") hardwareScore += 0;
    else if (equipamento.avaliacao_tipo_armazenamento === "HD") hardwareScore += 10;
    
    // Espaço livre em disco
    if (equipamento.avaliacao_espaco_disco === "Mais de 100 GB") hardwareScore += 0;
    else if (equipamento.avaliacao_espaco_disco === "50-100 GB") hardwareScore += 3;
    else if (equipamento.avaliacao_espaco_disco === "20-50 GB") hardwareScore += 6;
    else if (equipamento.avaliacao_espaco_disco === "Menos de 20 GB") hardwareScore += 10;
    
    scoreTotal += Math.min(hardwareScore, 20);

    // 3. Performance operacional — até 20 pontos
    let performanceScore = 0;
    
    // Uso de RAM
    if (equipamento.avaliacao_uso_memoria === "Menos de 50%") performanceScore += 0;
    else if (equipamento.avaliacao_uso_memoria === "50-70%") performanceScore += 3;
    else if (equipamento.avaliacao_uso_memoria === "70-90%") performanceScore += 6;
    else if (equipamento.avaliacao_uso_memoria === "Acima de 90%") performanceScore += 10;
    
    // Desempenho percebido
    if (equipamento.avaliacao_desempenho === "Muito rápido") performanceScore += 0;
    else if (equipamento.avaliacao_desempenho === "Bom") performanceScore += 3;
    else if (equipamento.avaliacao_desempenho === "Normal") performanceScore += 6;
    else if (equipamento.avaliacao_desempenho === "Lento") performanceScore += 8;
    else if (equipamento.avaliacao_desempenho === "Muito lento") performanceScore += 10;
    
    scoreTotal += Math.min(performanceScore, 20);

    // 4. Segurança e sistema — até 15 pontos
    let segurancaScore = 0;
    
    // Versão do Windows
    if (equipamento.avaliacao_versao_windows === "Windows 11") segurancaScore += 0;
    else if (equipamento.avaliacao_versao_windows === "Windows 10") segurancaScore += 5;
    else if (equipamento.avaliacao_versao_windows === "Outra") segurancaScore += 10;
    
    // Antivírus
    if (equipamento.avaliacao_status_antivirus === "Ativo") segurancaScore += 0;
    else if (equipamento.avaliacao_status_antivirus === "Desativado") segurancaScore += 5;
    else if (equipamento.avaliacao_status_antivirus === "Não possui") segurancaScore += 10;
    
    scoreTotal += Math.min(segurancaScore, 15);

    // 5. Experiência do usuário — até 15 pontos
    let experienciaScore = 0;
    
    // Atende necessidade
    if (equipamento.avaliacao_atende_necessidades === "Sim") experienciaScore += 0;
    else if (equipamento.avaliacao_atende_necessidades === "Parcialmente") experienciaScore += 5;
    else if (equipamento.avaliacao_atende_necessidades === "Não") experienciaScore += 10;
    
    // Satisfação
    if (equipamento.avaliacao_nota_satisfacao !== null && equipamento.avaliacao_nota_satisfacao !== undefined) {
      if (equipamento.avaliacao_nota_satisfacao >= 8) experienciaScore += 0;
      else if (equipamento.avaliacao_nota_satisfacao >= 5) experienciaScore += 3;
      else experienciaScore += 5;
    }
    
    scoreTotal += Math.min(experienciaScore, 15);

    // 6. Problemas percebidos — até 10 pontos
    if (equipamento.avaliacao_problemas && equipamento.avaliacao_problemas.length > 0) {
      const problemasReais = equipamento.avaliacao_problemas.filter(p => p !== "Sem problemas");
      const pontosProblemas = Math.min(problemasReais.length * 2, 10);
      scoreTotal += pontosProblemas;
    }

    // 11. Classificação automática final
    let recomendacao = "Manter";
    if (scoreTotal >= 70) {
      recomendacao = "Substituir";
    } else if (scoreTotal >= 40) {
      recomendacao = "Upgrade";
    }

    return {
      score: Math.min(scoreTotal, 100), // Limitar a 100
      recomendacao
    };
  } catch (error) {
    console.error("Erro ao calcular avaliação:", error);
    return { score: 0, recomendacao: "Manter" };
  }
};