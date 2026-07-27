/**
 * Formata uma string de data pura "YYYY-MM-DD" para "DD/MM/YYYY" sem qualquer conversão de fuso horário.
 * Se a string contiver timestamp ("YYYY-MM-DDTHH:mm:ss..."), extrai apenas a parte da data.
 */
export function formatarDataSemFuso(dataStr) {
  if (!dataStr) return "-";
  const apenasData = dataStr.includes("T") ? dataStr.split("T")[0] : dataStr.split(" ")[0];
  const partes = apenasData.split("-");
  if (partes.length !== 3) return dataStr;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/**
 * Formata uma data completa com hora sem aplicar conversão UTC.
 */
export function formatarDataHoraSemFuso(dataStr) {
  if (!dataStr) return "-";
  try {
    const apenasData = dataStr.includes("T") ? dataStr.split("T")[0] : dataStr.split(" ")[0];
    const partesData = apenasData.split("-");
    if (partesData.length !== 3) return dataStr;
    const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;
    
    const apenasHora = dataStr.includes("T") ? dataStr.split("T")[1] : dataStr.split(" ")[1];
    if (!apenasHora) return dataFormatada;
    const partesHora = apenasHora.split(":");
    if (partesHora.length < 2) return dataFormatada;
    return `${dataFormatada} às ${partesHora[0]}:${partesHora[1]}`;
  } catch (e) {
    return dataStr;
  }
}
