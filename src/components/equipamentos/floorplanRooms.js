/**
 * floorplanRooms.js — Definição da Planta Espacial Única Padronizada
 * 
 * Seção CCO (Centro de Controle Operacional) atualizada conforme o layout de referência real.
 */

export const UNIFIED_FLOORPLAN = {
  id: "planta_padronizada",
  name: "Layout Geral de Salas Padronizado",
  image: "/plantas/planta_padronizada.png",
  width: 688,
  height: 1024,

  // Atalhos de Zoom & Navegação Espacial por Setor
  sections: [
    { id: "all", label: "🗺️ Planta Geral", viewBox: "0 0 688 1024" },
    { id: "adm", label: "🏢 ADM — 1º Andar", viewBox: "0 0 688 290" },
    { id: "cco", label: "🖥️ CCO", viewBox: "370 295 310 160" },
    { id: "bsm_drc", label: "📊 Sala BSM / DRC", viewBox: "230 425 458 230" },
    { id: "galpao", label: "📦 Galpão (Bio/Reenv/Check)", viewBox: "0 310 240 714" },
    { id: "bsm_terreo", label: "📋 Sala BSM (Térreo)", viewBox: "230 670 235 354" },
    { id: "financeiro", label: "💰 Sala Financeiro", viewBox: "460 670 228 354" },
  ],

  // Assentos Predefinidos mapeados sobre a planta unificada (incluindo o novo CCO)
  seats: [
    // ADM 1º Andar - Mesa Reunião Redonda (Top Left)
    { id: "ADM-01", codigo: "ADM-01", sala: "ADM — 1º Andar", x: 86, y: 45 },
    { id: "ADM-02", codigo: "ADM-02", sala: "ADM — 1º Andar", x: 86, y: 92 },
    { id: "ADM-03", codigo: "ADM-03", sala: "ADM — 1º Andar", x: 62, y: 68 },
    { id: "ADM-04", codigo: "ADM-04", sala: "ADM — 1º Andar", x: 110, y: 68 },

    // ADM 1º Andar - Mesa L Canto Superior Esquerdo
    { id: "ADM-05", codigo: "ADM-05", sala: "ADM — 1º Andar", x: 75, y: 210 },

    // ADM 1º Andar - Baias Duplas Bloco 1 (6 lugares)
    { id: "ADM-06", codigo: "ADM-06", sala: "ADM — 1º Andar", x: 153, y: 80 },
    { id: "ADM-07", codigo: "ADM-07", sala: "ADM — 1º Andar", x: 208, y: 80 },
    { id: "ADM-08", codigo: "ADM-08", sala: "ADM — 1º Andar", x: 153, y: 138 },
    { id: "ADM-09", codigo: "ADM-09", sala: "ADM — 1º Andar", x: 208, y: 138 },
    { id: "ADM-10", codigo: "ADM-10", sala: "ADM — 1º Andar", x: 153, y: 196 },
    { id: "ADM-11", codigo: "ADM-11", sala: "ADM — 1º Andar", x: 208, y: 196 },

    // ADM 1º Andar - Baias Duplas Bloco 2 (6 lugares)
    { id: "ADM-12", codigo: "ADM-12", sala: "ADM — 1º Andar", x: 265, y: 80 },
    { id: "ADM-13", codigo: "ADM-13", sala: "ADM — 1º Andar", x: 320, y: 80 },
    { id: "ADM-14", codigo: "ADM-14", sala: "ADM — 1º Andar", x: 265, y: 138 },
    { id: "ADM-15", codigo: "ADM-15", sala: "ADM — 1º Andar", x: 320, y: 138 },
    { id: "ADM-16", codigo: "ADM-16", sala: "ADM — 1º Andar", x: 265, y: 196 },
    { id: "ADM-17", codigo: "ADM-17", sala: "ADM — 1º Andar", x: 320, y: 196 },

    // ADM 1º Andar - Baias L Direita (6 lugares)
    { id: "ADM-18", codigo: "ADM-18", sala: "ADM — 1º Andar", x: 390, y: 90 },
    { id: "ADM-19", codigo: "ADM-19", sala: "ADM — 1º Andar", x: 440, y: 90 },
    { id: "ADM-20", codigo: "ADM-20", sala: "ADM — 1º Andar", x: 390, y: 145 },
    { id: "ADM-21", codigo: "ADM-21", sala: "ADM — 1º Andar", x: 440, y: 145 },
    { id: "ADM-22", codigo: "ADM-22", sala: "ADM — 1º Andar", x: 390, y: 202 },
    { id: "ADM-23", codigo: "ADM-23", sala: "ADM — 1º Andar", x: 440, y: 202 },

    // ADM 1º Andar - Mesas Canto Direito
    { id: "ADM-24", codigo: "ADM-24", sala: "ADM — 1º Andar", x: 638, y: 80 },
    { id: "ADM-25", codigo: "ADM-25", sala: "ADM — 1º Andar", x: 605, y: 210 },

    // CCO - Centro de Controle Operacional (Novo Layout Real: 4 lugares fiéis)
    { id: "CCO-01", codigo: "CCO-01", sala: "Centro de Controle Operacional", x: 425, y: 345 }, // Bancada L Top-Left
    { id: "CCO-02", codigo: "CCO-02", sala: "Centro de Controle Operacional", x: 615, y: 348 }, // Cadeira Avulsa Top-Right
    { id: "CCO-03", codigo: "CCO-03", sala: "Centro de Controle Operacional", x: 425, y: 412 }, // Bancada L Bot-Left
    { id: "CCO-04", codigo: "CCO-04", sala: "Centro de Controle Operacional", x: 585, y: 412 }, // Cadeira Bot-Right (próximo aos móveis)

    // Galpão (3 lugares)
    { id: "CHK-01", codigo: "CHK-01", sala: "Check Out", x: 115, y: 475 },
    { id: "REE-01", codigo: "REE-01", sala: "Sala de Reenvase", x: 115, y: 665 },
    { id: "BIO-01", codigo: "BIO-01", sala: "Sala BIO", x: 115, y: 865 },

    // Sala DRC / Sala BSM Mezanino (7 lugares)
    { id: "BSM-01", codigo: "BSM-01", sala: "Sala BSM", x: 285, y: 505 },
    { id: "BSM-02", codigo: "BSM-02", sala: "Sala BSM", x: 285, y: 575 },
    { id: "DRC-01", codigo: "DRC-01", sala: "Sala DRC", x: 432, y: 490 },
    { id: "DRC-02", codigo: "DRC-02", sala: "Sala DRC", x: 412, y: 570 },
    { id: "DRC-03", codigo: "DRC-03", sala: "Sala DRC", x: 452, y: 570 },
    { id: "DRC-04", codigo: "DRC-04", sala: "Sala DRC", x: 555, y: 490 },
    { id: "DRC-05", codigo: "DRC-05", sala: "Sala DRC", x: 595, y: 608 },

    // Sala BSM Térreo (3 lugares)
    { id: "BSM-T1", codigo: "BSM-T1", sala: "Sala BSM (Térreo)", x: 308, y: 755 },
    { id: "BSM-T2", codigo: "BSM-T2", sala: "Sala BSM (Térreo)", x: 308, y: 845 },
    { id: "BSM-T3", codigo: "BSM-T3", sala: "Sala BSM (Térreo)", x: 308, y: 935 },

    // Sala Financeiro (4 lugares)
    { id: "FIN-01", codigo: "FIN-01", sala: "Sala Financeiro", x: 518, y: 855 },
    { id: "FIN-02", codigo: "FIN-02", sala: "Sala Financeiro", x: 630, y: 855 },
    { id: "FIN-03", codigo: "FIN-03", sala: "Sala Financeiro", x: 518, y: 930 },
    { id: "FIN-04", codigo: "FIN-04", sala: "Sala Financeiro", x: 630, y: 930 },
  ]
};

export const SVG_ROOMS = {
  planta_padronizada: UNIFIED_FLOORPLAN,
  sala_financeiro: UNIFIED_FLOORPLAN,
  adm_1andar: UNIFIED_FLOORPLAN,
  mezanino_bsm_drc: UNIFIED_FLOORPLAN,
  galpao_bio_reenvase_checkout: UNIFIED_FLOORPLAN,
  galpao_centro_controle_operacional: UNIFIED_FLOORPLAN
};
