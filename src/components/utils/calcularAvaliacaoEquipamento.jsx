// Função para calcular o score e recomendação do equipamento com base em critérios fixos
export const calcularAvaliacaoEquipamento = async (equipamento, base44) => {
  try {
    let scoreTotal = 0;

    // 1. Fator Idade do Equipamento
    if (equipamento.data_aquisicao) {
      const hoje = new Date();
      const dataAquisicao = new Date(equipamento.data_aquisicao);
      const diffAnos = (hoje - dataAquisicao) / (1000 * 60 * 60 * 24 * 365);
      
      if (diffAnos < 2) scoreTotal += 0;
      else if (diffAnos < 3) scoreTotal += 5;
      else if (diffAnos < 4) scoreTotal += 10;
      else if (diffAnos < 5) scoreTotal += 20;
      else scoreTotal += 30;
    }

    // 2. Tipo de armazenamento
    if (equipamento.avaliacao_tipo_armazenamento === "SSD") scoreTotal += 0;
    else if (equipamento.avaliacao_tipo_armazenamento === "HD") scoreTotal += 20;

    // 3. Uso de memória (RAM)
    if (equipamento.avaliacao_uso_memoria === "Menos de 50%") scoreTotal += 0;
    else if (equipamento.avaliacao_uso_memoria === "50-70%") scoreTotal += 5;
    else if (equipamento.avaliacao_uso_memoria === "70-90%") scoreTotal += 10;
    else if (equipamento.avaliacao_uso_memoria === "Acima de 90%") scoreTotal += 20;

    // 4. Espaço livre em disco
    if (equipamento.avaliacao_espaco_disco === "Mais de 100 GB") scoreTotal += 0;
    else if (equipamento.avaliacao_espaco_disco === "50-100 GB") scoreTotal += 5;
    else if (equipamento.avaliacao_espaco_disco === "20-50 GB") scoreTotal += 10;
    else if (equipamento.avaliacao_espaco_disco === "Menos de 20 GB") scoreTotal += 20;

    // 5. Versão do Windows
    if (equipamento.avaliacao_versao_windows === "Windows 11") scoreTotal += 0;
    else if (equipamento.avaliacao_versao_windows === "Windows 10") scoreTotal += 5;
    else if (equipamento.avaliacao_versao_windows === "Outra") scoreTotal += 20;

    // 6. Antivírus
    if (equipamento.avaliacao_status_antivirus === "Ativo") scoreTotal += 0;
    else if (equipamento.avaliacao_status_antivirus === "Desativado") scoreTotal += 15;
    else if (equipamento.avaliacao_status_antivirus === "Não possui") scoreTotal += 25;

    // 7. Desempenho percebido
    if (equipamento.avaliacao_desempenho === "Muito rápido") scoreTotal += 0;
    else if (equipamento.avaliacao_desempenho === "Bom") scoreTotal += 5;
    else if (equipamento.avaliacao_desempenho === "Normal") scoreTotal += 10;
    else if (equipamento.avaliacao_desempenho === "Lento") scoreTotal += 20;
    else if (equipamento.avaliacao_desempenho === "Muito lento") scoreTotal += 30;

    // 8. Equipamento atende necessidades
    if (equipamento.avaliacao_atende_necessidades === "Sim") scoreTotal += 0;
    else if (equipamento.avaliacao_atende_necessidades === "Parcialmente") scoreTotal += 10;
    else if (equipamento.avaliacao_atende_necessidades === "Não") scoreTotal += 25;

    // 9. Satisfação do usuário
    if (equipamento.avaliacao_nota_satisfacao !== null && equipamento.avaliacao_nota_satisfacao !== undefined) {
      if (equipamento.avaliacao_nota_satisfacao >= 8) scoreTotal += 0;
      else if (equipamento.avaliacao_nota_satisfacao >= 5) scoreTotal += 10;
      else scoreTotal += 20;
    }

    // 10. Problemas percebidos (máximo 25 pontos)
    if (equipamento.avaliacao_problemas && equipamento.avaliacao_problemas.length > 0) {
      const problemasReais = equipamento.avaliacao_problemas.filter(p => p !== "Sem problemas");
      const pontosProblemas = Math.min(problemasReais.length * 5, 25);
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