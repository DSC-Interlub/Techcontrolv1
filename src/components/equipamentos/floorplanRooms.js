/**
 * floorplanRooms.js — Desenhos Vetoriais SVG Atualizados
 * 
 * 1. Sala Financeiro: Formatada DEITADA (Horizontal Landscape).
 * 2. Galpão — Bio / Reenvase / Check Out: Posição dos assentos corrigidos exatamente conforme Imagem 1 em anexo.
 * 3. Centro de Controle Operacional (CCO): Layout e os 3 assentos posicionados exatamente conforme Imagem 2 em anexo.
 */

export const SVG_ROOMS = {
  // 1. SALA FINANCEIRO (Formatada DEITADA / Horizontal 1000 x 540)
  sala_financeiro: {
    id: "financeiro",
    name: "Sala Financeiro",
    width: 1000,
    height: 540,
    outline: { x: 20, y: 20, w: 960, h: 500, rx: 6 },
    furniture: [
      { kind: "tv", x: 40, y: 40, w: 66, h: 110 },
      { kind: "cabinet", x: 150, y: 40, w: 220, h: 50, label: "Armário" },
      { kind: "cabinet", x: 390, y: 40, w: 220, h: 50 },

      // Bloco de mesas esquerdo (2 postos)
      { kind: "desk", x: 150, y: 170, w: 220, h: 110 },
      { kind: "desk", x: 150, y: 285, w: 220, h: 110 },

      // Bloco de mesas direito (2 postos)
      { kind: "desk", x: 500, y: 170, w: 220, h: 110 },
      { kind: "desk", x: 500, y: 285, w: 220, h: 110 },

      // Arquivo Morto / Armário Lateral Direita
      { kind: "cabinet", x: 880, y: 40, w: 80, h: 440, label: "Arquivo" }
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 260, y: 120, rotate: 180 },
      { id: "M-02", codigo: "M-02", x: 260, y: 445, rotate: 0 },
      { id: "M-03", codigo: "M-03", x: 610, y: 120, rotate: 180 },
      { id: "M-04", codigo: "M-04", x: 610, y: 445, rotate: 0 },
    ],
    textLabels: [{ text: "SALA FINANCEIRO", x: 460, y: 480, size: 22 }],
  },

  // 2. ADM 1º ANDAR (1400 x 720)
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

  // 3. MEZANINO: SALA BSM / SALA DRC (1240 x 560)
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

  // 4. GALPÃO: BIO / REENVASE / CHECK OUT (Posições corrigidas idênticas à Imagem 1)
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
      // SALA BIO (Mesa superior circulada na Imagem 1)
      { kind: "desk", x: 165, y: 25, w: 70, h: 36, label: "Mesa BIO" },
      { kind: "cabinet", x: 330, y: 110, w: 34, h: 90 },

      // SALA DE REENVASE (Mesa superior circulada na Imagem 1)
      { kind: "desk", x: 390, y: 25, w: 45, h: 65, label: "Reenvase 1" },
      { kind: "cabinet", x: 390, y: 100, w: 45, h: 110 },
      { kind: "block", x: 520, y: 180, w: 60, h: 35 },

      // CHECK OUT (Mesas inferiores circuladas na Imagem 1)
      { kind: "cabinet", x: 675, y: 40, w: 25, h: 160 },
      { kind: "block", x: 800, y: 100, w: 35, h: 80 },

      // Paletes do Check Out (grid superior direita)
      { kind: "block", x: 850, y: 28, w: 35, h: 30 },
      { kind: "block", x: 890, y: 28, w: 35, h: 30 },
      { kind: "block", x: 930, y: 28, w: 35, h: 30 },
      { kind: "block", x: 890, y: 65, w: 35, h: 30 },
      { kind: "block", x: 930, y: 65, w: 35, h: 30 },
      { kind: "block", x: 890, y: 102, w: 35, h: 30 },
      { kind: "block", x: 930, y: 102, w: 35, h: 30 },
      { kind: "block", x: 890, y: 139, w: 35, h: 30 },
      { kind: "block", x: 930, y: 139, w: 35, h: 30 },

      // Mesas inferiores do Check Out (circuladas na Imagem 1)
      { kind: "desk", x: 740, y: 180, w: 70, h: 35 },
      { kind: "desk", x: 830, y: 180, w: 80, h: 35 },
    ],
    seats: [
      // 1. SALA BIO (Assento no topo centro da Sala Bio)
      { id: "M-01", codigo: "M-01", x: 200, y: 80, rotate: 0 },

      // 2. SALA DE REENVASE (Assento no topo esquerdo da Sala de Reenvase)
      { id: "M-02", codigo: "M-02", x: 460, y: 55, rotate: -90 },

      // 3. CHECK OUT - Mesa Inferior Esquerda (Circulada na Imagem 1)
      { id: "M-03", codigo: "M-03", x: 775, y: 140, rotate: 180 },

      // 4. CHECK OUT - Mesa Inferior Direita (Circulada na Imagem 1)
      { id: "M-04", codigo: "M-04", x: 870, y: 140, rotate: 180 },
    ],
    textLabels: [
      { text: "SALA BIO", x: 30, y: 35, size: 16 },
      { text: "SALA DE REENVASE", x: 640, y: 35, size: 16 },
      { text: "CHECK OUT", x: 700, y: 35, size: 16 },
    ],
  },

  // 5. CENTRO DE CONTROLE OPERACIONAL - CCO (100% Idêntico à Imagem 2)
  galpao_centro_controle_operacional: {
    id: "centro-controle",
    name: "Centro de Controle Operacional",
    width: 520,
    height: 480,
    outline: { x: 20, y: 20, w: 480, h: 440, rx: 4 },
    furniture: [
      // Mesa em L Superior Esquerda
      { kind: "desk", x: 35, y: 35, w: 140, h: 50 },
      { kind: "desk", x: 35, y: 35, w: 50, h: 140 },

      // Mesa em L Inferior Esquerda
      { kind: "desk", x: 35, y: 265, w: 140, h: 50 },
      { kind: "desk", x: 35, y: 175, w: 50, h: 140 },

      // Divisória / Gaveteiro Central entre as mesas em L
      { kind: "cabinet", x: 35, y: 165, w: 50, h: 20 },

      // Mesa Operacional Superior Direita
      { kind: "desk", x: 195, y: 35, w: 280, h: 65 },

      // Armários Inferiores Direitos
      { kind: "cabinet", x: 195, y: 390, w: 75, h: 50 },
      { kind: "cabinet", x: 280, y: 385, w: 195, h: 55 },
    ],
    seats: [
      // 1. Assento Superior Esquerdo (Circulado na Imagem 2)
      { id: "M-01", codigo: "M-01", x: 115, y: 110, rotate: 45 },

      // 2. Assento Inferior Esquerdo (Circulado na Imagem 2)
      { id: "M-02", codigo: "M-02", x: 115, y: 235, rotate: -45 },

      // 3. Assento Superior Direito (Circulado na Imagem 2)
      { id: "M-03", codigo: "M-03", x: 410, y: 120, rotate: 0 },
    ],
    textLabels: [
      { text: "CENTRO DE CONTROLE", x: 330, y: 230, size: 20 },
      { text: "OPERACIONAL", x: 330, y: 260, size: 20 }
    ],
  }
};
