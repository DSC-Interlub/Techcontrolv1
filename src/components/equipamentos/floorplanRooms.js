/**
 * floorplanRooms.js — Definição Vetorial SVG das 5 Salas
 * 
 * Atualização Centro de Controle Operacional (CCO):
 * - 1000% Fiel à imagem real de referência com círculos azuis.
 * - Mantidas EXCLUSIVAMENTE as 3 mesas circuladas em azul.
 * - Removidos todos os armários e gaveteiros do rodapé e da divisória lateral não circulados.
 */

export const SVG_ROOMS = {
  // 1. SALA FINANCEIRO (Vertical 520 x 760)
  sala_financeiro: {
    id: "financeiro",
    name: "Sala Financeiro",
    width: 520,
    height: 760,
    outline: { x: 24, y: 24, w: 472, h: 712, rx: 6 },
    furniture: [
      { kind: "desk", x: 185, y: 220, w: 110, h: 195 },
      { kind: "desk", x: 297, y: 220, w: 110, h: 195 },
      { kind: "desk", x: 185, y: 417, w: 110, h: 195 },
      { kind: "desk", x: 297, y: 417, w: 110, h: 195 },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 145, y: 317, rotate: 90 },
      { id: "M-02", codigo: "M-02", x: 447, y: 317, rotate: -90 },
      { id: "M-03", codigo: "M-03", x: 145, y: 514, rotate: 90 },
      { id: "M-04", codigo: "M-04", x: 447, y: 514, rotate: -90 },
    ],
    textLabels: [{ text: "SALA FINANCEIRO", x: 50, y: 560, rotate: -90, size: 24 }],
  },

  // 2. ADM 1º ANDAR (1400 x 720)
  adm_1andar: {
    id: "adm-1andar",
    name: "ADM — 1º Andar",
    width: 1400,
    height: 720,
    outline: { x: 8, y: 30, w: 1384, h: 660, rx: 4 },
    furniture: [
      { kind: "desk", x: 24, y: 470, w: 150, h: 120 },

      { kind: "desk", x: 330, y: 214, w: 78, h: 130 },
      { kind: "desk", x: 410, y: 214, w: 78, h: 130 },
      { kind: "desk", x: 330, y: 360, w: 78, h: 130 },
      { kind: "desk", x: 410, y: 360, w: 78, h: 130 },
      { kind: "desk", x: 330, y: 506, w: 78, h: 130 },
      { kind: "desk", x: 410, y: 506, w: 78, h: 130 },

      { kind: "desk", x: 610, y: 214, w: 78, h: 130 },
      { kind: "desk", x: 690, y: 214, w: 78, h: 130 },
      { kind: "desk", x: 610, y: 360, w: 78, h: 130 },
      { kind: "desk", x: 690, y: 360, w: 78, h: 130 },
      { kind: "desk", x: 610, y: 506, w: 78, h: 130 },
      { kind: "desk", x: 690, y: 506, w: 78, h: 130 },

      { kind: "block", x: 850, y: 214, w: 150, h: 120 },
      { kind: "block", x: 1015, y: 214, w: 150, h: 120 },
      { kind: "block", x: 850, y: 360, w: 150, h: 120 },
      { kind: "block", x: 1015, y: 360, w: 150, h: 120 },
      { kind: "block", x: 850, y: 506, w: 150, h: 120 },
      { kind: "block", x: 1015, y: 506, w: 150, h: 120 },

      { kind: "desk", x: 1220, y: 500, w: 150, h: 120 },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 130, y: 560, rotate: -90 },

      { id: "M-02", codigo: "M-02", x: 300, y: 270, rotate: 90 },
      { id: "M-03", codigo: "M-03", x: 300, y: 415, rotate: 90 },
      { id: "M-04", codigo: "M-04", x: 300, y: 560, rotate: 90 },
      { id: "M-05", codigo: "M-05", x: 518, y: 270, rotate: -90 },
      { id: "M-06", codigo: "M-06", x: 518, y: 415, rotate: -90 },
      { id: "M-07", codigo: "M-07", x: 518, y: 560, rotate: -90 },

      { id: "M-08", codigo: "M-08", x: 580, y: 270, rotate: 90 },
      { id: "M-09", codigo: "M-09", x: 580, y: 415, rotate: 90 },
      { id: "M-10", codigo: "M-10", x: 580, y: 560, rotate: 90 },
      { id: "M-11", codigo: "M-11", x: 798, y: 270, rotate: -90 },
      { id: "M-12", codigo: "M-12", x: 798, y: 415, rotate: -90 },
      { id: "M-13", codigo: "M-13", x: 798, y: 560, rotate: -90 },

      { id: "M-14", codigo: "M-14", x: 875, y: 320, rotate: 0 },
      { id: "M-15", codigo: "M-15", x: 1120, y: 320, rotate: 0 },
      { id: "M-16", codigo: "M-16", x: 875, y: 425, rotate: 0 },
      { id: "M-17", codigo: "M-17", x: 1120, y: 425, rotate: 0 },
      { id: "M-18", codigo: "M-18", x: 875, y: 570, rotate: 0 },
      { id: "M-19", codigo: "M-19", x: 1120, y: 570, rotate: 0 },

      { id: "M-20", codigo: "M-20", x: 1330, y: 560, rotate: 0 },
    ],
    textLabels: [],
  },

  // 3. MEZANINO: SALA BSM / SALA DRC (1240 x 560)
  mezanino_bsm_drc: {
    id: "bsm-drc",
    name: "Mezanino — Sala BSM / Sala DRC",
    width: 1240,
    height: 560,
    outline: { x: 12, y: 20, w: 1216, h: 520, rx: 4 },
    walls: [{ x1: 290, y1: 20, x2: 290, y2: 540 }],
    furniture: [
      { kind: "desk", x: 35, y: 40, w: 140, h: 55 },
      { kind: "desk", x: 35, y: 40, w: 55, h: 125 },

      { kind: "desk", x: 35, y: 210, w: 140, h: 55 },
      { kind: "desk", x: 35, y: 210, w: 55, h: 125 },

      { kind: "desk", x: 35, y: 370, w: 140, h: 55 },
      { kind: "desk", x: 35, y: 370, w: 55, h: 125 },

      { kind: "desk", x: 480, y: 40, w: 140, h: 55 },
      { kind: "desk", x: 565, y: 40, w: 55, h: 140 },

      { kind: "desk", x: 740, y: 40, w: 90, h: 140 },
      { kind: "desk", x: 834, y: 40, w: 90, h: 140 },

      { kind: "desk", x: 480, y: 250, w: 90, h: 120 },
      { kind: "desk", x: 574, y: 250, w: 90, h: 120 },
      { kind: "desk", x: 480, y: 374, w: 90, h: 120 },
      { kind: "desk", x: 574, y: 374, w: 90, h: 120 },

      { kind: "desk", x: 880, y: 350, w: 90, h: 140 },
      { kind: "desk", x: 974, y: 350, w: 90, h: 140 },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 125, y: 110, rotate: 45 },
      { id: "M-02", codigo: "M-02", x: 125, y: 275, rotate: -45 },
      { id: "M-03", codigo: "M-03", x: 125, y: 435, rotate: -45 },

      { id: "M-04", codigo: "M-04", x: 435, y: 95, rotate: 0 },
      { id: "M-05", codigo: "M-05", x: 690, y: 110, rotate: 90 },
      { id: "M-06", codigo: "M-06", x: 978, y: 110, rotate: -90 },
      { id: "M-07", codigo: "M-07", x: 430, y: 310, rotate: 90 },
      { id: "M-08", codigo: "M-08", x: 718, y: 310, rotate: -90 },
      { id: "M-09", codigo: "M-09", x: 430, y: 434, rotate: 90 },
      { id: "M-10", codigo: "M-10", x: 718, y: 434, rotate: -90 },
      { id: "M-11", codigo: "M-11", x: 832, y: 420, rotate: 90 },
      { id: "M-12", codigo: "M-12", x: 1024, y: 420, rotate: -90 },
    ],
    textLabels: [
      { text: "SALA BSM", x: 180, y: 200, size: 22 },
      { text: "SALA DRC", x: 880, y: 260, size: 26 },
    ],
  },

  // 4. GALPÃO: BIO / REENVASE / CHECK OUT (1000 x 240)
  galpao_bio_reenvase_checkout: {
    id: "bio-reenvase-checkout",
    name: "Galpão — Bio / Reenvase / Check Out",
    width: 1000,
    height: 240,
    outline: { x: 12, y: 12, w: 976, h: 216, rx: 4 },
    walls: [
      { x1: 372, y1: 12, x2: 372, y2: 228 },
      { x1: 664, y1: 12, x2: 664, y2: 228 },
    ],
    furniture: [
      { kind: "desk", x: 220, y: 25, w: 90, h: 48, label: "Mesa BIO" },
      { kind: "desk", x: 385, y: 25, w: 55, h: 55, label: "Reenvase 1" },
      { kind: "desk", x: 735, y: 175, w: 80, h: 42 },
      { kind: "desk", x: 835, y: 175, w: 90, h: 42 },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 265, y: 95, rotate: 0 },
      { id: "M-02", codigo: "M-02", x: 460, y: 52, rotate: -90 },
      { id: "M-03", codigo: "M-03", x: 775, y: 132, rotate: 180 },
      { id: "M-04", codigo: "M-04", x: 880, y: 132, rotate: 180 },
    ],
    textLabels: [
      { text: "SALA BIO", x: 40, y: 35, size: 16 },
      { text: "SALA DE REENVASE", x: 480, y: 35, size: 16 },
      { text: "CHECK OUT", x: 710, y: 35, size: 16 },
    ],
  },

  // 5. CENTRO DE CONTROLE OPERACIONAL - CCO (Apenas as 3 mesas circuladas em azul)
  galpao_centro_controle_operacional: {
    id: "centro-controle",
    name: "Centro de Controle Operacional",
    width: 1000,
    height: 500,
    outline: { x: 20, y: 20, w: 960, h: 460, rx: 6 },
    furniture: [
      // 1. Mesa em L topo esquerda (Circulada em Azul)
      { kind: "desk", x: 45, y: 45, w: 250, h: 80 },
      { kind: "desk", x: 45, y: 45, w: 80, h: 200 },

      // 2. Mesa em L base esquerda (Circulada em Azul)
      { kind: "desk", x: 45, y: 375, w: 250, h: 80 },
      { kind: "desk", x: 45, y: 255, w: 80, h: 200 },

      // 3. Bancada superior direita (Circulada em Azul)
      { kind: "desk", x: 350, y: 45, w: 580, h: 85, label: "Bancada CCO" },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 215, y: 175, rotate: 45 },
      { id: "M-02", codigo: "M-02", x: 215, y: 325, rotate: -45 },
      { id: "M-03", codigo: "M-03", x: 750, y: 175, rotate: 0 },
    ],
    textLabels: [
      { text: "CENTRO DE CONTROLE OPERACIONAL", x: 640, y: 320, size: 24 }
    ],
  }
};
