/**
 * floorplanRooms.js — Definição das 5 Salas idêntica ao v0 original (100% Fiel às imagens de referência v0)
 * 
 * Contém as 5 salas com suas dimensões originais, contornos, paredes, móveis, rótulos e assentos girados.
 */

export const SVG_ROOMS = {
  // 1. SALA FINANCEIRO (520 x 760 - Vertical como no v0)
  sala_financeiro: {
    id: "financeiro",
    name: "Sala Financeiro",
    width: 520,
    height: 760,
    outline: { x: 24, y: 24, w: 472, h: 712, rx: 6 },
    furniture: [
      { kind: "tv", x: 56, y: 56, w: 110, h: 66 },
      { kind: "cabinet", x: 190, y: 56, w: 220, h: 56, label: "Armário" },
      { kind: "cabinet", x: 190, y: 156, w: 220, h: 56 },
      { kind: "desk", x: 190, y: 224, w: 108, h: 190 },
      { kind: "desk", x: 302, y: 224, w: 108, h: 190 },
      { kind: "desk", x: 190, y: 470, w: 108, h: 190 },
      { kind: "desk", x: 302, y: 470, w: 108, h: 190 },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 150, y: 300, rotate: 90 },
      { id: "M-02", codigo: "M-02", x: 452, y: 300, rotate: -90 },
      { id: "M-03", codigo: "M-03", x: 150, y: 560, rotate: 90 },
      { id: "M-04", codigo: "M-04", x: 452, y: 560, rotate: -90 },
    ],
    textLabels: [{ text: "SALA FINANCEIRO", x: 52, y: 560, rotate: -90, size: 26 }],
  },

  // 2. ADM 1º ANDAR (1400 x 720 - Horizontal como no v0)
  adm_1andar: {
    id: "adm-1andar",
    name: "ADM — 1º Andar",
    width: 1400,
    height: 720,
    outline: { x: 8, y: 30, w: 1384, h: 660, rx: 4 },
    furniture: [
      { kind: "round", x: 90, y: 230, w: 90, h: 90 },
      { kind: "cabinet", x: 24, y: 370, w: 44, h: 90 },
      { kind: "desk", x: 24, y: 470, w: 150, h: 120 },
      { kind: "cabinet", x: 30, y: 630, w: 44, h: 60 },

      // Bloco Central 1
      { kind: "desk", x: 330, y: 214, w: 78, h: 130 },
      { kind: "desk", x: 410, y: 214, w: 78, h: 130 },
      { kind: "desk", x: 330, y: 360, w: 78, h: 130 },
      { kind: "desk", x: 410, y: 360, w: 78, h: 130 },
      { kind: "desk", x: 330, y: 506, w: 78, h: 130 },
      { kind: "desk", x: 410, y: 506, w: 78, h: 130 },
      { kind: "cabinet", x: 330, y: 648, w: 158, h: 40 },

      // Bloco Central 2
      { kind: "desk", x: 610, y: 214, w: 78, h: 130 },
      { kind: "desk", x: 690, y: 214, w: 78, h: 130 },
      { kind: "desk", x: 610, y: 360, w: 78, h: 130 },
      { kind: "desk", x: 690, y: 360, w: 78, h: 130 },
      { kind: "desk", x: 610, y: 506, w: 78, h: 130 },
      { kind: "desk", x: 690, y: 506, w: 78, h: 130 },
      { kind: "cabinet", x: 610, y: 648, w: 158, h: 40 },

      // Cluster L direita
      { kind: "block", x: 850, y: 214, w: 150, h: 120 },
      { kind: "block", x: 1015, y: 214, w: 150, h: 120 },
      { kind: "block", x: 850, y: 360, w: 150, h: 120 },
      { kind: "block", x: 1015, y: 360, w: 150, h: 120 },
      { kind: "block", x: 850, y: 506, w: 150, h: 120 },
      { kind: "block", x: 1015, y: 506, w: 150, h: 120 },
      { kind: "desk", x: 1220, y: 500, w: 150, h: 120 },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 90, y: 175, rotate: 180 },
      { id: "M-02", codigo: "M-02", x: 40, y: 230, rotate: 90 },
      { id: "M-03", codigo: "M-03", x: 90, y: 285, rotate: 0 },
      { id: "M-04", codigo: "M-04", x: 145, y: 230, rotate: -90 },
      { id: "M-05", codigo: "M-05", x: 130, y: 560, rotate: -90 },
      { id: "M-06", codigo: "M-06", x: 300, y: 270, rotate: 90 },
      { id: "M-07", codigo: "M-07", x: 300, y: 415, rotate: 90 },
      { id: "M-08", codigo: "M-08", x: 300, y: 560, rotate: 90 },
      { id: "M-09", codigo: "M-09", x: 518, y: 270, rotate: -90 },
      { id: "M-10", codigo: "M-10", x: 518, y: 415, rotate: -90 },
      { id: "M-11", codigo: "M-11", x: 518, y: 560, rotate: -90 },
      { id: "M-12", codigo: "M-12", x: 580, y: 270, rotate: 90 },
      { id: "M-13", codigo: "M-13", x: 580, y: 415, rotate: 90 },
      { id: "M-14", codigo: "M-14", x: 580, y: 560, rotate: 90 },
      { id: "M-15", codigo: "M-15", x: 798, y: 270, rotate: -90 },
      { id: "M-16", codigo: "M-16", x: 798, y: 415, rotate: -90 },
      { id: "M-17", codigo: "M-17", x: 798, y: 560, rotate: -90 },
      { id: "M-18", codigo: "M-18", x: 875, y: 320, rotate: 0 },
      { id: "M-19", codigo: "M-19", x: 1120, y: 320, rotate: 0 },
      { id: "M-20", codigo: "M-20", x: 875, y: 425, rotate: 0 },
    ],
    textLabels: [],
  },

  // 3. MEZANINO: SALA BSM / SALA DRC (1240 x 560 - Horizontal como no v0)
  mezanino_bsm_drc: {
    id: "bsm-drc",
    name: "Mezanino — Sala BSM / Sala DRC",
    width: 1240,
    height: 560,
    outline: { x: 12, y: 20, w: 1216, h: 520, rx: 4 },
    walls: [{ x1: 300, y1: 20, x2: 300, y2: 540 }],
    furniture: [
      { kind: "desk", x: 40, y: 40, w: 120, h: 90 },
      { kind: "cabinet", x: 44, y: 170, w: 44, h: 60 },
      { kind: "desk", x: 40, y: 230, w: 120, h: 90 },
      { kind: "cabinet", x: 44, y: 300, w: 44, h: 40 },
      { kind: "desk", x: 40, y: 400, w: 120, h: 90 },
      { kind: "block", x: 360, y: 40, w: 150, h: 110 },
      { kind: "cabinet", x: 250, y: 40, w: 90, h: 40 },
      { kind: "desk", x: 620, y: 40, w: 70, h: 110 },
      { kind: "desk", x: 692, y: 40, w: 70, h: 110 },
      { kind: "desk", x: 400, y: 220, w: 72, h: 90 },
      { kind: "desk", x: 474, y: 220, w: 72, h: 90 },
      { kind: "desk", x: 400, y: 312, w: 72, h: 90 },
      { kind: "desk", x: 474, y: 312, w: 72, h: 90 },
      { kind: "cabinet", x: 260, y: 230, w: 34, h: 130 },
      { kind: "desk", x: 700, y: 320, w: 70, h: 110 },
      { kind: "desk", x: 772, y: 320, w: 70, h: 110 },
      { kind: "cabinet", x: 1160, y: 150, w: 44, h: 90 },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 130, y: 95, rotate: 0 },
      { id: "M-02", codigo: "M-02", x: 130, y: 285, rotate: 0 },
      { id: "M-03", codigo: "M-03", x: 130, y: 455, rotate: 0 },
      { id: "M-04", codigo: "M-04", x: 385, y: 95, rotate: 0 },
      { id: "M-05", codigo: "M-05", x: 590, y: 70, rotate: 90 },
      { id: "M-06", codigo: "M-06", x: 780, y: 70, rotate: -90 },
      { id: "M-07", codigo: "M-07", x: 372, y: 250, rotate: 90 },
      { id: "M-08", codigo: "M-08", x: 372, y: 355, rotate: 90 },
      { id: "M-09", codigo: "M-09", x: 574, y: 250, rotate: -90 },
      { id: "M-10", codigo: "M-10", x: 574, y: 355, rotate: -90 },
      { id: "M-11", codigo: "M-11", x: 670, y: 375, rotate: 90 },
      { id: "M-12", codigo: "M-12", x: 860, y: 375, rotate: -90 },
    ],
    textLabels: [
      { text: "SALA BSM", x: 90, y: 150, size: 22 },
      { text: "SALA DRC", x: 640, y: 210, size: 26 },
    ],
  },

  // 4. GALPÃO: BIO / REENVASE / CHECK OUT (1000 x 240 - Horizontal como no v0)
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
      { kind: "block", x: 150, y: 30, w: 60, h: 30 },
      { kind: "cabinet", x: 300, y: 120, w: 34, h: 90 },
      { kind: "cabinet", x: 420, y: 30, w: 34, h: 90 },
      { kind: "cabinet", x: 420, y: 130, w: 34, h: 60 },
      { kind: "block", x: 470, y: 190, w: 70, h: 30 },
      { kind: "cabinet", x: 610, y: 40, w: 20, h: 130 },
      { kind: "block", x: 720, y: 150, w: 70, h: 34 },
      { kind: "cabinet", x: 820, y: 28, w: 44, h: 40 },
      { kind: "cabinet", x: 878, y: 28, w: 44, h: 40 },
      { kind: "cabinet", x: 936, y: 28, w: 44, h: 40 },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 180, y: 100, rotate: 0 },
      { id: "M-02", codigo: "M-02", x: 510, y: 120, rotate: 0 },
      { id: "M-03", codigo: "M-03", x: 755, y: 100, rotate: 0 },
    ],
    textLabels: [
      { text: "SALA BIO", x: 20, y: 34, size: 16 },
      { text: "SALA DE REENVASE", x: 460, y: 34, size: 16 },
      { text: "CHECK OUT", x: 700, y: 34, size: 16 },
    ],
  },

  // 5. GALPÃO: CENTRO DE CONTROLE OPERACIONAL (520 x 480 - Quadrado como no v0)
  galpao_centro_controle_operacional: {
    id: "centro-controle",
    name: "Centro de Controle Operacional",
    width: 520,
    height: 480,
    outline: { x: 20, y: 20, w: 480, h: 440, rx: 4 },
    furniture: [
      { kind: "desk", x: 40, y: 40, w: 130, h: 110 },
      { kind: "cabinet", x: 200, y: 40, w: 44, h: 70 },
      { kind: "tv", x: 380, y: 90, w: 80, h: 46 },
      { kind: "desk", x: 40, y: 230, w: 130, h: 110 },
      { kind: "cabinet", x: 40, y: 380, w: 60, h: 60 },
      { kind: "cabinet", x: 200, y: 380, w: 120, h: 50 },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 120, y: 110, rotate: 0 },
      { id: "M-02", codigo: "M-02", x: 120, y: 300, rotate: 0 },
    ],
    textLabels: [{ text: "CENTRO DE CONTROLE OPERACIONAL", x: 260, y: 240, size: 20 }],
  }
};
