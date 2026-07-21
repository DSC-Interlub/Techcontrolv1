/**
 * floorplanRooms.js — Desenhos Vetoriais SVG Padronizados em Formato Deitado (Landscape 16:9 Widescreen)
 * Todas as 5 salas possuem EXATAMENTE a mesma dimensão (1200 x 675 pixels) em formato horizontal/deitado.
 */

export const SVG_ROOMS = {
  // 1. SALA FINANCEIRO (Formatada em deitado 1200x675)
  sala_financeiro: {
    id: "sala_financeiro",
    name: "Sala Financeiro",
    width: 1200,
    height: 675,
    outline: { x: 30, y: 30, w: 1140, h: 615, rx: 8 },
    furniture: [
      { kind: "tv", x: 60, y: 60, w: 140, h: 50, label: "TV / Monitor" },
      { kind: "cabinet", x: 230, y: 60, w: 320, h: 50, label: "Armário de Documentos" },
      { kind: "cabinet", x: 60, y: 140, w: 70, h: 480, label: "Arquivo Morto" },

      // Bloco de Mesas 1 (Esquerda)
      { kind: "desk", x: 200, y: 200, w: 220, h: 140 },
      { kind: "desk", x: 200, y: 360, w: 220, h: 140 },

      // Bloco de Mesas 2 (Direita)
      { kind: "desk", x: 650, y: 200, w: 220, h: 140 },
      { kind: "desk", x: 650, y: 360, w: 220, h: 140 },

      // Mesa de Apoio / Reunião Pequena
      { kind: "round", x: 990, y: 260, w: 110, h: 110 }
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 310, y: 155, rotate: 180, posX: 26, posY: 23 },
      { id: "M-02", codigo: "M-02", x: 310, y: 535, rotate: 0, posX: 26, posY: 79 },
      { id: "M-03", codigo: "M-03", x: 760, y: 155, rotate: 180, posX: 63, posY: 23 },
      { id: "M-04", codigo: "M-04", x: 760, y: 535, rotate: 0, posX: 63, posY: 79 },
    ],
    textLabels: [
      { text: "SALA FINANCEIRO", x: 600, y: 120, size: 24 }
    ]
  },

  // 2. ADM 1º ANDAR (Área Aberta 1200x675)
  adm_1andar: {
    id: "adm_1andar",
    name: "ADM — 1º Andar (Área Aberta)",
    width: 1200,
    height: 675,
    outline: { x: 30, y: 30, w: 1140, h: 615, rx: 8 },
    furniture: [
      { kind: "round", x: 80, y: 240, w: 100, h: 100 },
      { kind: "cabinet", x: 40, y: 380, w: 50, h: 120 },

      // Bloco Central 1 (Mesas Duplas)
      { kind: "desk", x: 260, y: 180, w: 160, h: 120 },
      { kind: "desk", x: 260, y: 320, w: 160, h: 120 },
      { kind: "desk", x: 260, y: 460, w: 160, h: 120 },

      // Bloco Central 2 (Mesas Duplas)
      { kind: "desk", x: 500, y: 180, w: 160, h: 120 },
      { kind: "desk", x: 500, y: 320, w: 160, h: 120 },
      { kind: "desk", x: 500, y: 460, w: 160, h: 120 },

      // Cluster L Direita
      { kind: "block", x: 760, y: 180, w: 180, h: 120 },
      { kind: "block", x: 760, y: 320, w: 180, h: 120 },
      { kind: "block", x: 760, y: 460, w: 180, h: 120 },

      // Estação Isolada
      { kind: "desk", x: 1000, y: 460, w: 130, h: 120 }
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 130, y: 190, rotate: 180, posX: 11, posY: 28 },
      { id: "M-02", codigo: "M-02", x: 130, y: 380, rotate: 0, posX: 11, posY: 56 },
      { id: "M-03", codigo: "M-03", x: 210, y: 240, rotate: 90, posX: 17, posY: 35 },
      { id: "M-04", codigo: "M-04", x: 440, y: 240, rotate: -90, posX: 37, posY: 35 },
      { id: "M-05", codigo: "M-05", x: 210, y: 380, rotate: 90, posX: 17, posY: 56 },
      { id: "M-06", codigo: "M-06", x: 440, y: 380, rotate: -90, posX: 37, posY: 56 },
      { id: "M-07", codigo: "M-07", x: 210, y: 520, rotate: 90, posX: 17, posY: 77 },
      { id: "M-08", codigo: "M-08", x: 440, y: 520, rotate: -90, posX: 37, posY: 77 },
      { id: "M-09", codigo: "M-09", x: 470, y: 240, rotate: 90, posX: 39, posY: 35 },
      { id: "M-10", codigo: "M-10", x: 680, y: 240, rotate: -90, posX: 57, posY: 35 },
      { id: "M-11", codigo: "M-11", x: 470, y: 380, rotate: 90, posX: 39, posY: 56 },
      { id: "M-12", codigo: "M-12", x: 680, y: 380, rotate: -90, posX: 57, posY: 56 },
      { id: "M-13", codigo: "M-13", x: 470, y: 520, rotate: 90, posX: 39, posY: 77 },
      { id: "M-14", codigo: "M-14", x: 680, y: 520, rotate: -90, posX: 57, posY: 77 },
      { id: "M-15", codigo: "M-15", x: 850, y: 240, rotate: 0, posX: 71, posY: 35 },
      { id: "M-16", codigo: "M-16", x: 850, y: 380, rotate: 0, posX: 71, posY: 56 },
      { id: "M-17", codigo: "M-17", x: 850, y: 520, rotate: 0, posX: 71, posY: 77 },
      { id: "M-18", codigo: "M-18", x: 1065, y: 520, rotate: 0, posX: 89, posY: 77 }
    ],
    textLabels: [
      { text: "ADM 1º ANDAR — ÁREA ABERTA", x: 600, y: 110, size: 24 }
    ]
  },

  // 3. MEZANINO (BSM & DRC 1200x675)
  mezanino_bsm_drc: {
    id: "mezanino_bsm_drc",
    name: "Mezanino — BSM & DRC",
    width: 1200,
    height: 675,
    outline: { x: 30, y: 30, w: 1140, h: 615, rx: 8 },
    walls: [
      { x1: 340, y1: 30, x2: 340, y2: 645 }
    ],
    furniture: [
      // BSM (Esquerda)
      { kind: "desk", x: 80, y: 160, w: 180, h: 120 },
      { kind: "desk", x: 80, y: 320, w: 180, h: 120 },
      { kind: "desk", x: 80, y: 480, w: 180, h: 120 },

      // DRC (Direita)
      { kind: "desk", x: 400, y: 160, w: 200, h: 120 },
      { kind: "desk", x: 650, y: 160, w: 180, h: 120 },
      { kind: "desk", x: 850, y: 160, w: 180, h: 120 },

      // Bloco Central DRC
      { kind: "desk", x: 450, y: 340, w: 160, h: 110 },
      { kind: "desk", x: 450, y: 470, w: 160, h: 110 },
      { kind: "desk", x: 630, y: 340, w: 160, h: 110 },
      { kind: "desk", x: 630, y: 470, w: 160, h: 110 },
      { kind: "cabinet", x: 840, y: 340, w: 180, h: 240 }
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 170, y: 110, rotate: 180, posX: 14, posY: 16 },
      { id: "M-02", codigo: "M-02", x: 170, y: 270, rotate: 180, posX: 14, posY: 40 },
      { id: "M-03", codigo: "M-03", x: 170, y: 430, rotate: 180, posX: 14, posY: 64 },
      { id: "M-04", codigo: "M-04", x: 500, y: 110, rotate: 180, posX: 42, posY: 16 },
      { id: "M-05", codigo: "M-05", x: 740, y: 110, rotate: 180, posX: 62, posY: 16 },
      { id: "M-06", codigo: "M-06", x: 940, y: 110, rotate: 180, posX: 78, posY: 16 },
      { id: "M-07", codigo: "M-07", x: 400, y: 395, rotate: 90, posX: 33, posY: 58 },
      { id: "M-08", codigo: "M-08", x: 400, y: 525, rotate: 90, posX: 33, posY: 78 },
      { id: "M-09", codigo: "M-09", x: 810, y: 395, rotate: -90, posX: 67, posY: 58 },
      { id: "M-10", codigo: "M-10", x: 810, y: 525, rotate: -90, posX: 67, posY: 78 }
    ],
    textLabels: [
      { text: "SALA BSM", x: 180, y: 100, size: 22 },
      { text: "SALA DRC", x: 740, y: 100, size: 26 }
    ]
  },

  // 4. GALPÃO — BIO / REENVASE / CHECK OUT (1200x675)
  galpao_bio_reenvase_checkout: {
    id: "galpao_bio_reenvase_checkout",
    name: "Galpão — BIO / Reenvase / Check-out",
    width: 1200,
    height: 675,
    outline: { x: 30, y: 30, w: 1140, h: 615, rx: 8 },
    walls: [
      { x1: 400, y1: 30, x2: 400, y2: 645 },
      { x1: 780, y1: 30, x2: 780, y2: 645 }
    ],
    furniture: [
      // BIO
      { kind: "block", x: 80, y: 180, w: 240, h: 140 },
      { kind: "cabinet", x: 80, y: 360, w: 240, h: 140 },

      // REENVASE
      { kind: "cabinet", x: 440, y: 180, w: 280, h: 140 },
      { kind: "block", x: 440, y: 360, w: 280, h: 140 },

      // CHECK OUT
      { kind: "block", x: 820, y: 180, w: 300, h: 140 },
      { kind: "cabinet", x: 820, y: 360, w: 300, h: 140 }
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 200, y: 540, rotate: 0, posX: 17, posY: 80 },
      { id: "M-02", codigo: "M-02", x: 580, y: 540, rotate: 0, posX: 48, posY: 80 },
      { id: "M-03", codigo: "M-03", x: 970, y: 130, rotate: 180, posX: 81, posY: 19 },
      { id: "M-04", codigo: "M-04", x: 970, y: 540, rotate: 0, posX: 81, posY: 80 }
    ],
    textLabels: [
      { text: "SALA BIO", x: 200, y: 110, size: 22 },
      { text: "SALA DE REENVASE", x: 580, y: 110, size: 22 },
      { text: "CHECK OUT", x: 970, y: 110, size: 22 }
    ]
  },

  // 5. CENTRO DE CONTROLE OPERACIONAL - CCO (Deitada 1200x675)
  galpao_centro_controle_operacional: {
    id: "galpao_centro_controle_operacional",
    name: "Centro de Controle Operacional (CCO)",
    width: 1200,
    height: 675,
    outline: { x: 30, y: 30, w: 1140, h: 615, rx: 8 },
    furniture: [
      // Paredão de Vídeo / Monitores CCO no topo
      { kind: "tv", x: 300, y: 60, w: 600, h: 70, label: "Painel de Monitores CCO em Tempo Real" },

      // Mesas de Controle Operacional (Layout deitado)
      { kind: "desk", x: 180, y: 220, w: 380, h: 160 },
      { kind: "desk", x: 640, y: 220, w: 380, h: 160 },

      // Armários de Suporte e Racks de Servidor
      { kind: "cabinet", x: 180, y: 440, w: 380, h: 140, label: "Racks de Servidor / TI" },
      { kind: "cabinet", x: 640, y: 440, w: 380, h: 140, label: "Armários de Controle" }
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 370, y: 400, rotate: 0, posX: 31, posY: 59 },
      { id: "M-02", codigo: "M-02", x: 830, y: 400, rotate: 0, posX: 69, posY: 59 }
    ],
    textLabels: [
      { text: "CENTRO DE CONTROLE OPERACIONAL (CCO)", x: 600, y: 170, size: 24 }
    ]
  }
};
