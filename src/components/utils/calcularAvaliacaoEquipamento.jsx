// Função para calcular o score e recomendação do equipamento com base nos pesos
export const calcularAvaliacaoEquipamento = async (equipamento, base44) => {
  try {
    // Buscar todos os pesos cadastrados
    const pesos = await base44.entities.PesosAvaliacao.list();
    
    if (pesos.length === 0) {
      return { score: 0, recomendacao: "Manter" };
    }

    let scoreTotal = 0;

    // Mapear campos e suas respostas
    const camposAvaliacao = [
      { campo: 'avaliacao_uso_memoria', valor: equipamento.avaliacao_uso_memoria },
      { campo: 'avaliacao_tipo_armazenamento', valor: equipamento.avaliacao_tipo_armazenamento },
      { campo: 'avaliacao_espaco_disco', valor: equipamento.avaliacao_espaco_disco },
      { campo: 'avaliacao_versao_windows', valor: equipamento.avaliacao_versao_windows },
      { campo: 'avaliacao_status_antivirus', valor: equipamento.avaliacao_status_antivirus },
      { campo: 'avaliacao_desempenho', valor: equipamento.avaliacao_desempenho },
      { campo: 'avaliacao_atende_necessidades', valor: equipamento.avaliacao_atende_necessidades },
      { campo: 'avaliacao_recomendacao_usuario', valor: equipamento.avaliacao_recomendacao_usuario },
    ];

    // Calcular score baseado nos pesos
    camposAvaliacao.forEach(({ campo, valor }) => {
      if (valor) {
        const peso = pesos.find(p => p.campo === campo && p.opcao === valor);
        if (peso) {
          scoreTotal += peso.peso;
        }
      }
    });

    // Adicionar peso extra para problemas percebidos
    if (equipamento.avaliacao_problemas && equipamento.avaliacao_problemas.length > 0) {
      // Cada problema adiciona peso (exceto "Sem problemas")
      const problemasReais = equipamento.avaliacao_problemas.filter(p => p !== "Sem problemas");
      scoreTotal += problemasReais.length * 3; // 3 pontos por problema
    }

    // Ajustar score pela nota de satisfação (inversa)
    if (equipamento.avaliacao_nota_satisfacao !== null && equipamento.avaliacao_nota_satisfacao !== undefined) {
      // Nota 0 = +10 pontos, Nota 10 = -5 pontos
      const ajusteNota = (10 - equipamento.avaliacao_nota_satisfacao) * 1.5;
      scoreTotal += ajusteNota;
    }

    // Determinar recomendação baseada no score
    let recomendacao = "Manter";
    if (scoreTotal >= 60) {
      recomendacao = "Substituir";
    } else if (scoreTotal >= 30) {
      recomendacao = "Upgrade";
    }

    return {
      score: Math.max(0, scoreTotal),
      recomendacao
    };
  } catch (error) {
    console.error("Erro ao calcular avaliação:", error);
    return { score: 0, recomendacao: "Manter" };
  }
};