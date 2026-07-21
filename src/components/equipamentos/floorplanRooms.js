/**
 * floorplanRooms.js — Definição Vetorial SVG das 5 Salas
 * 
 * Atualização ADM — 1º Andar:
 * - 1000% Fiel à imagem real de referência com círculos azuis.
 * - Mantidas EXCLUSIVAMENTE as 20 mesas circuladas em azul.
 * - Removida a mesa de reunião redonda e todos os armários/gaveteiros não circulados.
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

  // 2. ADM 1º ANDAR (1400 x 720 — Apenas as 20 mesas circuladas em azul)
  adm_1andar: {
    id: "adm-1andar",
    name: "ADM — 1º Andar",
    width: 1400,
    height: 720,
    outline: { x: 8, y: 30, w: 1384, h: 660, rx: 4 },
    furniture: [
      // 1. Estação L inferior esquerda
      { kind: "desk", x: 24, y: 470, w: 150, h: 120 },

      // 2. Bloco Central 1 (3 filas x 2 tampos)
      { kind: "desk", x: 330, y: 214, w: 78, h: 130 },
      { kind: "desk", x: 410, y: 214, w: 78, h: 130 },
      { kind: "desk", x: 330, y: 360, w: 78, h: 130 },
      { kind: "desk", x: 410, y: 360, w: 78, h: 130 },
      { kind: "desk", x: 330, y: 506, w: 78, h: 130 },
      { kind: "desk", x: 410, y: 506, w: 78, h: 130 },

      // 3. Bloco Central 2 (3 filas x 2 tampos)
      { kind: "desk", x: 610, y: 214, w: 78, h: 130 },
      { kind: "desk", x: 690, y: 214, w: 78, h: 130 },
      { kind: "desk", x: 610, y: 360, w: 78, h: 130 },
      { kind: "desk", x: 690, y: 360, w: 78, h: 130 },
      { kind: "desk", x: 610, y: 506, w: 78, h: 130 },
      { kind: "desk", x: 690, y: 506, w: 78, h: 130 },

      // 4. Cluster L direita (3 filas x 2 mesas em L)
      { kind: "block", x: 850, y: 214, w: 150, h: 120 },
      { kind: "block", x: 1015, y: 214, w: 150, h: 120 },
      { kind: "block", x: 850, y: 360, w: 150, h: 120 },
      { kind: "block", x: 1015, y: 360, w: 150, h: 120 },
      { kind: "block", x: 850, y: 506, w: 150, h: 120 },
      { kind: "block", x: 1015, y: 506, w: 150, h: 120 },

      // 5. Estação L extrema direita
      { kind: "desk", x: 1220, y: 500, w: 150, h: 120 },
    ],
    seats: [
      // 1. Estação L inferior esquerda (1 lugar)
      { id: "M-01", codigo: "M-01", x: 130, y: 560, rotate: -90 },

      // 2. Bloco Central 1 (6 lugares)
      { id: "M-02", codigo: "M-02", x: 300, y: 270, rotate: 90 },
      { id: "M-03", codigo: "M-03", x: 300, y: 415, rotate: 90 },
      { id: "M-04", codigo: "M-04", x: 300, y: 560, rotate: 90 },
      { id: "M-05", codigo: "M-05", x: 518, y: 270, rotate: -90 },
      { id: "M-06", codigo: "M-06", x: 518, y: 415, rotate: -90 },
      { id: "M-07", codigo: "M-07", x: 518, y: 560, rotate: -90 },

      // 3. Bloco Central 2 (6 lugares)
      { id: "M-08", codigo: "M-08", x: 580, y: 270, rotate: 90 },
      { id: "M-09", codigo: "M-09", x: 580, y: 415, rotate: 90 },
      { id: "M-10", codigo: "M-10", x: 580, y: 560, rotate: 90 },
      { id: "M-11", codigo: "M-11", x: 798, y: 270, rotate: -90 },
      { id: "M-12", codigo: "M-12", x: 798, y: 415, rotate: -90 },
      { id: "M-13", codigo: "M-13", x: 798, y: 560, rotate: -90 },

      // 4. Cluster L direita (6 lugares)
      { id: "M-14", codigo: "M-14", x: 875, y: 320, rotate: 0 },
      { id: "M-15", codigo: "M-15", x: 1120, y: 320, rotate: 0 },
      { id: "M-16", codigo: "M-16", x: 875, y: 425, rotate: 0 },
      { id: "M-17", codigo: "M-17", x: 1120, y: 425, rotate: 0 },
      { id: "M-18", codigo: "M-18", x: 875, y: 570, rotate: 0 },
      { id: "M-19", codigo: "M-19", x: 1120, y: 570, rotate: 0 },

      // 5. Estação extrema direita (1 lugar)
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

  // 4. GALPÃO: BIO / REENVASE / CHECK OUT
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
      { kind: "desk", x: 165, y: 25, w: 70, h: 36, label: "Mesa BIO" },
      { kind: "cabinet", x: 330, y: 110, w: 34, h: 90 },

      { kind: "desk", x: 390, y: 25, w: 45, h: 65, label: "Reenvase 1" },
      { kind: "cabinet", x: 390, y: 100, w: 45, h: 110 },
      { kind: "block", x: 520, y: 180, w: 60, h: 35 },

      { kind: "cabinet", x: 675, y: 40, w: 25, h: 160 },
      { kind: "block", x: 800, y: 100, w: 35, h: 80 },

      { kind: "block", x: 850, y: 28, w: 35, h: 30 },
      { kind: "block", x: 890, y: 28, w: 35, h: 30 },
      { kind: "block", x: 930, y: 28, w: 35, h: 30 },
      { kind: "block", x: 890, y: 65, w: 35, h: 30 },
      { kind: "block", x: 930, y: 65, w: 35, h: 30 },
      { kind: "block", x: 890, y: 102, w: 35, h: 30 },
      { kind: "block", x: 930, y: 102, w: 35, h: 30 },
      { kind: "block", x: 890, y: 139, w: 35, h: 30 },
      { kind: "block", x: 930, y: 139, w: 35, h: 30 },

      { kind: "desk", x: 740, y: 180, w: 70, h: 35 },
      { kind: "desk", x: 830, y: 180, w: 80, h: 35 },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 200, y: 80, rotate: 0 },
      { id: "M-02", codigo: "M-02", x: 460, y: 55, rotate: -90 },
      { id: "M-03", codigo: "M-03", x: 775, y: 140, rotate: 180 },
      { id: "M-04", codigo: "M-04", x: 870, y: 140, rotate: 180 },
    ],
    textLabels: [
      { text: "SALA BIO", x: 40, y: 35, size: 16 },
      { text: "SALA DE REENVASE", x: 500, y: 35, size: 16 },
      { text: "CHECK OUT", x: 710, y: 35, size: 16 },
    ],
  },

  // 5. CENTRO DE CONTROLE OPERACIONAL - CCO
  galpao_centro_controle_operacional: {
    id: "centro-controle",
    name: "Centro de Controle Operacional",
    width: 1000,
    height: 500,
    outline: { x: 20, y: 20, w: 960, h: 460, rx: 6 },
    furniture: [
      { kind: "desk", x: 50, y: 50, w: 240, h: 90 },
      { kind: "desk", x: 50, y: 50, w: 90, h: 240 },

      { kind: "desk", x: 50, y: 320, w: 240, h: 90 },
      { kind: "desk", x: 50, y: 170, w: 90, h: 240 },

      { kind: "cabinet", x: 50, y: 225, w: 90, h: 35 },

      { kind: "desk", x: 380, y: 50, w: 560, h: 100 },

      { kind: "cabinet", x: 380, y: 380, w: 180, h: 80 },
      { kind: "cabinet", x: 580, y: 370, w: 360, h: 90 },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 210, y: 190, rotate: 45 },
      { id: "M-02", codigo: "M-02", x: 210, y: 310, rotate: -45 },
      { id: "M-03", codigo: "M-03", x: 760, y: 190, rotate: 0 },
    ],
    textLabels: [
      { text: "CENTRO DE CONTROLE OPERACIONAL", x: 650, y: 280, size: 22 }
    ],
  }
};
