/**
 * floorplanRooms.js — Definição Vetorial SVG Padronizada das 5 Salas
 * 
 * PADRONIZAÇÃO TOTAL & ESTÉTICA CAD:
 * 1. TODAS as 5 salas possuem EXATAMENTE as mesmas dimensões (1000 x 520).
 * 2. TODAS as salas estão em formato HORIZONTAL DEITADO (Widescreen 16:9).
 * 3. Clicabilidade direta sobre as cadeiras CAD limpas (sem necessidade do botão azul "+").
 * 4. Inclusão de detalhes arquitetônicos CAD fiéis às plantas oficiais.
 */

export const SVG_ROOMS = {
  // 1. SALA FINANCEIRO (Padronizada 1000 x 520 — Deitada)
  sala_financeiro: {
    id: "financeiro",
    name: "Sala Financeiro",
    width: 1000,
    height: 520,
    outline: { x: 16, y: 16, w: 968, h: 488, rx: 6 },
    furniture: [
      { kind: "desk", x: 280, y: 120, w: 190, h: 125, hasGadgets: true },
      { kind: "desk", x: 490, y: 120, w: 190, h: 125, hasGadgets: true },
      { kind: "desk", x: 280, y: 260, w: 190, h: 125, hasGadgets: true },
      { kind: "desk", x: 490, y: 260, w: 190, h: 125, hasGadgets: true },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 210, y: 182, rotate: 90 },
      { id: "M-02", codigo: "M-02", x: 750, y: 182, rotate: -90 },
      { id: "M-03", codigo: "M-03", x: 210, y: 322, rotate: 90 },
      { id: "M-04", codigo: "M-04", x: 750, y: 322, rotate: -90 },
    ],
    textLabels: [{ text: "SALA FINANCEIRO", x: 480, y: 450, size: 24 }],
  },

  // 2. ADM 1º ANDAR (Padronizada 1000 x 520 — Deitada)
  adm_1andar: {
    id: "adm-1andar",
    name: "ADM — 1º Andar",
    width: 1000,
    height: 520,
    outline: { x: 16, y: 16, w: 968, h: 488, rx: 6 },
    furniture: [
      { kind: "desk", x: 30, y: 340, w: 110, h: 90, hasGadgets: true },

      { kind: "desk", x: 230, y: 130, w: 60, h: 95, hasGadgets: true },
      { kind: "desk", x: 292, y: 130, w: 60, h: 95, hasGadgets: true },
      { kind: "desk", x: 230, y: 235, w: 60, h: 95, hasGadgets: true },
      { kind: "desk", x: 292, y: 235, w: 60, h: 95, hasGadgets: true },
      { kind: "desk", x: 230, y: 340, w: 60, h: 95, hasGadgets: true },
      { kind: "desk", x: 292, y: 340, w: 60, h: 95, hasGadgets: true },

      { kind: "desk", x: 440, y: 130, w: 60, h: 95, hasGadgets: true },
      { kind: "desk", x: 502, y: 130, w: 60, h: 95, hasGadgets: true },
      { kind: "desk", x: 440, y: 235, w: 60, h: 95, hasGadgets: true },
      { kind: "desk", x: 502, y: 235, w: 60, h: 95, hasGadgets: true },
      { kind: "desk", x: 440, y: 340, w: 60, h: 95, hasGadgets: true },
      { kind: "desk", x: 502, y: 340, w: 60, h: 95, hasGadgets: true },

      { kind: "block", x: 640, y: 130, w: 110, h: 95, hasGadgets: true },
      { kind: "block", x: 760, y: 130, w: 110, h: 95, hasGadgets: true },
      { kind: "block", x: 640, y: 235, w: 110, h: 95, hasGadgets: true },
      { kind: "block", x: 760, y: 235, w: 110, h: 95, hasGadgets: true },
      { kind: "block", x: 640, y: 340, w: 110, h: 95, hasGadgets: true },
      { kind: "block", x: 760, y: 340, w: 110, h: 95, hasGadgets: true },

      { kind: "desk", x: 890, y: 340, w: 90, h: 90, hasGadgets: true },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 95, y: 400, rotate: -90 },

      { id: "M-02", codigo: "M-02", x: 175, y: 175, rotate: 90 },
      { id: "M-03", codigo: "M-03", x: 175, y: 280, rotate: 90 },
      { id: "M-04", codigo: "M-04", x: 175, y: 385, rotate: 90 },
      { id: "M-05", codigo: "M-05", x: 347, y: 175, rotate: -90 },
      { id: "M-06", codigo: "M-06", x: 347, y: 280, rotate: -90 },
      { id: "M-07", codigo: "M-07", x: 347, y: 385, rotate: -90 },

      { id: "M-08", codigo: "M-08", x: 385, y: 175, rotate: 90 },
      { id: "M-09", codigo: "M-09", x: 385, y: 280, rotate: 90 },
      { id: "M-10", codigo: "M-10", x: 385, y: 385, rotate: 90 },
      { id: "M-11", codigo: "M-11", x: 557, y: 175, rotate: -90 },
      { id: "M-12", codigo: "M-12", x: 557, y: 280, rotate: -90 },
      { id: "M-13", codigo: "M-13", x: 557, y: 385, rotate: -90 },

      { id: "M-14", codigo: "M-14", x: 660, y: 205, rotate: 0 },
      { id: "M-15", codigo: "M-15", x: 825, y: 205, rotate: 0 },
      { id: "M-16", codigo: "M-16", x: 660, y: 310, rotate: 0 },
      { id: "M-17", codigo: "M-17", x: 825, y: 310, rotate: 0 },
      { id: "M-18", codigo: "M-18", x: 660, y: 415, rotate: 0 },
      { id: "M-19", codigo: "M-19", x: 825, y: 415, rotate: 0 },

      { id: "M-20", codigo: "M-20", x: 945, y: 400, rotate: 0 },
    ],
    textLabels: [],
  },

  // 3. MEZANINO: SALA BSM / SALA DRC (100% Idêntico à imagem de referência CAD enviada)
  mezanino_bsm_drc: {
    id: "bsm-drc",
    name: "Mezanino — Sala BSM / Sala DRC",
    width: 1000,
    height: 520,
    outline: { x: 16, y: 16, w: 968, h: 488, rx: 6 },
    walls: [{ x1: 230, y1: 16, x2: 230, y2: 504 }],
    doors: [
      { x: 230, y: 16, dx: 0, dy: 50, arcPath: "M 230 66 A 50 50 0 0 0 280 16" }
    ],
    furniture: [
      // Armários decorativos das paredes da imagem CAD
      { kind: "cabinet", x: 185, y: 240, w: 40, h: 90 }, // Armário divisória BSM
      { kind: "cabinet", x: 940, y: 130, w: 40, h: 120 }, // Armário parede direita DRC

      // SALA BSM (3 Mesas em L)
      { kind: "desk", x: 30, y: 35, w: 115, h: 45, hasGadgets: true },
      { kind: "desk", x: 30, y: 35, w: 45, h: 105, hasGadgets: true },

      { kind: "desk", x: 30, y: 180, w: 115, h: 45, hasGadgets: true },
      { kind: "desk", x: 30, y: 180, w: 45, h: 105, hasGadgets: true },

      { kind: "desk", x: 30, y: 325, w: 115, h: 45, hasGadgets: true },
      { kind: "desk", x: 30, y: 325, w: 45, h: 105, hasGadgets: true },

      // SALA DRC
      { kind: "desk", x: 380, y: 35, w: 115, h: 45, hasGadgets: true },
      { kind: "desk", x: 450, y: 35, w: 45, h: 115, hasGadgets: true },

      { kind: "desk", x: 590, y: 35, w: 75, h: 115, hasGadgets: true },
      { kind: "desk", x: 667, y: 35, w: 75, h: 115, hasGadgets: true },

      { kind: "desk", x: 380, y: 210, w: 75, h: 100, hasGadgets: true },
      { kind: "desk", x: 457, y: 210, w: 75, h: 100, hasGadgets: true },
      { kind: "desk", x: 380, y: 312, w: 75, h: 100, hasGadgets: true },
      { kind: "desk", x: 457, y: 312, w: 75, h: 100, hasGadgets: true },

      { kind: "desk", x: 690, y: 290, w: 75, h: 115, hasGadgets: true },
      { kind: "desk", x: 767, y: 290, w: 75, h: 115, hasGadgets: true },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 105, y: 95, rotate: 45 },
      { id: "M-02", codigo: "M-02", x: 105, y: 240, rotate: -45 },
      { id: "M-03", codigo: "M-03", x: 105, y: 385, rotate: -45 },

      { id: "M-04", codigo: "M-04", x: 345, y: 80, rotate: 0 },
      { id: "M-05", codigo: "M-05", x: 545, y: 92, rotate: 90 },
      { id: "M-06", codigo: "M-06", x: 787, y: 92, rotate: -90 },
      { id: "M-07", codigo: "M-07", x: 335, y: 260, rotate: 90 },
      { id: "M-08", codigo: "M-08", x: 577, y: 260, rotate: -90 },
      { id: "M-09", codigo: "M-09", x: 335, y: 362, rotate: 90 },
      { id: "M-10", codigo: "M-10", x: 577, y: 362, rotate: -90 },
      { id: "M-11", codigo: "M-11", x: 645, y: 347, rotate: 90 },
      { id: "M-12", codigo: "M-12", x: 887, y: 347, rotate: -90 },
    ],
    textLabels: [
      { text: "SALA BSM", x: 140, y: 170, size: 18 },
      { text: "SALA DRC", x: 700, y: 210, size: 24 },
    ],
  },

  // 4. GALPÃO: BIO / REENVASE / CHECK OUT (Padronizada 1000 x 520 — Deitada)
  galpao_bio_reenvase_checkout: {
    id: "bio-reenvase-checkout",
    name: "Galpão — Bio / Reenvase / Check Out",
    width: 1000,
    height: 520,
    outline: { x: 16, y: 16, w: 968, h: 488, rx: 6 },
    walls: [
      { x1: 330, y1: 16, x2: 330, y2: 504 },
      { x1: 620, y1: 16, x2: 620, y2: 504 },
    ],
    furniture: [
      { kind: "desk", x: 110, y: 150, w: 140, h: 80, label: "Mesa BIO", hasGadgets: true },
      { kind: "desk", x: 370, y: 150, w: 100, h: 100, label: "Reenvase 1", hasGadgets: true },
      { kind: "desk", x: 670, y: 320, w: 120, h: 70, hasGadgets: true },
      { kind: "desk", x: 810, y: 320, w: 130, h: 70, hasGadgets: true },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 180, y: 260, rotate: 0 },
      { id: "M-02", codigo: "M-02", x: 500, y: 200, rotate: -90 },
      { id: "M-03", codigo: "M-03", x: 730, y: 250, rotate: 180 },
      { id: "M-04", codigo: "M-04", x: 875, y: 250, rotate: 180 },
    ],
    textLabels: [
      { text: "SALA BIO", x: 40, y: 55, size: 20 },
      { text: "SALA DE REENVASE", x: 430, y: 55, size: 20 },
      { text: "CHECK OUT", x: 720, y: 55, size: 20 },
    ],
  },

  // 5. CENTRO DE CONTROLE OPERACIONAL - CCO (Padronizada 1000 x 520 — Deitada)
  galpao_centro_controle_operacional: {
    id: "centro-controle",
    name: "Centro de Controle Operacional",
    width: 1000,
    height: 520,
    outline: { x: 16, y: 16, w: 968, h: 488, rx: 6 },
    furniture: [
      { kind: "desk", x: 45, y: 45, w: 250, h: 85, hasGadgets: true },
      { kind: "desk", x: 45, y: 45, w: 85, h: 210, hasGadgets: true },

      { kind: "desk", x: 45, y: 390, w: 250, h: 85, hasGadgets: true },
      { kind: "desk", x: 45, y: 265, w: 85, h: 210, hasGadgets: true },

      { kind: "desk", x: 350, y: 45, w: 580, h: 90, label: "Bancada CCO", hasGadgets: true },
    ],
    seats: [
      { id: "M-01", codigo: "M-01", x: 215, y: 180, rotate: 45 },
      { id: "M-02", codigo: "M-02", x: 215, y: 340, rotate: -45 },
      { id: "M-03", codigo: "M-03", x: 750, y: 180, rotate: 0 },
    ],
    textLabels: [
      { text: "CENTRO DE CONTROLE OPERACIONAL", x: 640, y: 330, size: 24 }
    ],
  }
};
