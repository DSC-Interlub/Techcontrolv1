/**
 * floorplanRooms.js — Definição da Planta Espacial Única 100% Vetorial (SVG Pure Vector)
 * 
 * Substitui o PNG raster por um mapa vetorial completo em código SVG com precisão matemática.
 * Todas as 8 salas (ADM, CCO, BSM, DRC, Check-out, Reenvase, BIO, Financeiro) são renderizadas
 * como elementos SVG vetoriais nítidos (sem pixelação em nenhum nível de zoom).
 */

export const UNIFIED_FLOORPLAN = {
  id: "planta_padronizada",
  name: "Layout Geral de Salas Padronizado (Vetor SVG)",
  width: 688,
  height: 1024,

  // Atalhos de Zoom & Navegação Espacial por Setor
  sections: [
    { id: "all", label: "🗺️ Planta Geral", viewBox: "0 0 688 1024" },
    { id: "adm", label: "🏢 ADM — 1º Andar", viewBox: "0 0 688 290" },
    { id: "cco", label: "🖥️ CCO", viewBox: "370 290 310 160" },
    { id: "bsm_drc", label: "📊 Sala BSM / DRC", viewBox: "230 435 458 235" },
    { id: "galpao", label: "📦 Galpão (Bio/Reenv/Check)", viewBox: "0 290 240 734" },
    { id: "bsm_terreo", label: "📋 Sala BSM (Térreo)", viewBox: "230 665 235 359" },
    { id: "financeiro", label: "💰 Sala Financeiro", viewBox: "455 665 233 359" },
  ],

  // ── DESENHO VETORIAL DAS SALAS (Paredes, Divisórias, Rótulos e Móveis) ─────
  rooms: [
    {
      id: "adm",
      name: "ADM — 1º ANDAR",
      x: 16, y: 16, w: 656, h: 265, rx: 6,
      textX: 300, textY: 34,
    },
    {
      id: "cco",
      name: "CENTRO DE CONTROLE OPERACIONAL",
      x: 380, y: 295, w: 292, h: 145, rx: 6,
      textX: 430, textY: 375,
    },
    {
      id: "bsm_drc",
      name: "MEZANINO",
      x: 236, y: 445, w: 436, h: 215, rx: 6,
      divider: { x1: 340, y1: 445, x2: 340, y2: 660 },
      textLabels: [
        { text: "SALA BSM", x: 255, y: 462 },
        { text: "SALA DRC", x: 480, y: 462 }
      ]
    },
    {
      id: "galpao",
      name: "GALPÃO",
      x: 16, y: 295, w: 204, h: 713, rx: 6,
      dividers: [
        { x1: 16, y1: 530, x2: 220, y2: 530 },
        { x1: 16, y1: 760, x2: 220, y2: 760 }
      ],
      textLabels: [
        { text: "CHECK OUT", x: 30, y: 312 },
        { text: "SALA DE REENVASE", x: 30, y: 546 },
        { text: "SALA BIO", x: 30, y: 776 }
      ]
    },
    {
      id: "bsm_terreo",
      name: "SALA BSM",
      x: 236, y: 675, w: 210, h: 333, rx: 6,
      textX: 290, textY: 692,
    },
    {
      id: "financeiro",
      name: "SALA FINANCEIRO",
      x: 462, y: 675, w: 210, h: 333, rx: 6,
      textX: 485, textY: 692,
    }
  ],

  // ── MÓVEIS VETORIAIS (Mesas, Baias L, Armários, Prateleiras, TVs) ──────────
  furniture: [
    // ADM 1º Andar (Mesa Redonda, Baias, Mesas em L)
    { kind: "round", cx: 86, cy: 68, r: 24 }, // Mesa reunião
    { kind: "cabinet", x: 26, y: 190, w: 32, h: 70, label: "Armário" },
    { kind: "desk_l", x: 70, y: 190, w: 55, h: 65 }, // Estação L

    // Baias Centrais ADM Bloco 1 (6 tampos)
    { kind: "desk", x: 140, y: 45, w: 52, h: 65, hasGadgets: true },
    { kind: "desk", x: 194, y: 45, w: 52, h: 65, hasGadgets: true },
    { kind: "desk", x: 140, y: 112, w: 52, h: 65, hasGadgets: true },
    { kind: "desk", x: 194, y: 112, w: 52, h: 65, hasGadgets: true },
    { kind: "desk", x: 140, y: 179, w: 52, h: 65, hasGadgets: true },
    { kind: "desk", x: 194, y: 179, w: 52, h: 65, hasGadgets: true },

    // Baias Centrais ADM Bloco 2 (6 tampos)
    { kind: "desk", x: 252, y: 45, w: 52, h: 65, hasGadgets: true },
    { kind: "desk", x: 306, y: 45, w: 52, h: 65, hasGadgets: true },
    { kind: "desk", x: 252, y: 112, w: 52, h: 65, hasGadgets: true },
    { kind: "desk", x: 306, y: 112, w: 52, h: 65, hasGadgets: true },
    { kind: "desk", x: 252, y: 179, w: 52, h: 65, hasGadgets: true },
    { kind: "desk", x: 306, y: 179, w: 52, h: 65, hasGadgets: true },

    // Baias L Direita ADM (6 tampos)
    { kind: "desk_l", x: 375, y: 45, w: 60, h: 65 },
    { kind: "desk_l", x: 440, y: 45, w: 60, h: 65 },
    { kind: "desk_l", x: 375, y: 112, w: 60, h: 65 },
    { kind: "desk_l", x: 440, y: 112, w: 60, h: 65 },
    { kind: "desk_l", x: 375, y: 179, w: 60, h: 65 },
    { kind: "desk_l", x: 440, y: 179, w: 60, h: 65 },

    // Mesas Canto Direito ADM
    { kind: "desk", x: 615, y: 45, w: 48, h: 70 },
    { kind: "desk", x: 580, y: 180, w: 75, h: 65 },

    // CCO - Centro de Controle Operacional
    { kind: "cabinet_top", x: 485, y: 300, w: 178, h: 22 }, // Armários parece superior
    { kind: "desk_l", x: 388, y: 300, w: 80, h: 70 }, // L Top Left
    { kind: "desk_l", x: 388, y: 375, w: 80, h: 58 }, // L Bot Left
    { kind: "cabinet", x: 520, y: 405, w: 45, h: 28 }, // Gabinete 1
    { kind: "cabinet", x: 570, y: 405, w: 92, h: 28 }, // Gabinete 2

    // Galpão (Check Out / Reenvase / Bio)
    { kind: "shelves_grid", x: 30, y: 320, w: 176, h: 135 }, // Paletes / Prateleiras
    { kind: "desk", x: 30, y: 470, w: 120, h: 45, label: "Balcão Check-out" },
    { kind: "cabinet", x: 30, y: 545, w: 176, h: 30 },
    { kind: "sink", x: 170, y: 640, w: 35, h: 60 },
    { kind: "cabinet", x: 30, y: 715, w: 130, h: 30 },
    { kind: "cabinet", x: 30, y: 775, w: 176, h: 30 },
    { kind: "cabinet", x: 30, y: 955, w: 70, h: 35 },

    // Mezanino (Sala BSM & Sala DRC)
    { kind: "desk_l", x: 248, y: 460, w: 75, h: 75 },
    { kind: "desk_l", x: 248, y: 550, w: 75, h: 75 },
    { kind: "desk_l", x: 355, y: 460, w: 85, h: 65 },
    { kind: "cabinet", x: 355, y: 535, w: 25, h: 100 },
    { kind: "desk", x: 400, y: 540, w: 55, h: 45, hasGadgets: true },
    { kind: "desk", x: 460, y: 540, w: 55, h: 45, hasGadgets: true },
    { kind: "desk", x: 400, y: 590, w: 55, h: 45, hasGadgets: true },
    { kind: "desk", x: 460, y: 590, w: 55, h: 45, hasGadgets: true },
    { kind: "desk", x: 535, y: 460, w: 65, h: 45 },
    { kind: "desk", x: 535, y: 585, w: 65, h: 45 },

    // Sala BSM Térreo
    { kind: "desk_l", x: 250, y: 700, w: 100, h: 80 },
    { kind: "desk_l", x: 250, y: 795, w: 100, h: 80 },
    { kind: "desk_l", x: 250, y: 890, w: 100, h: 80 },
    { kind: "cabinet", x: 395, y: 890, w: 40, h: 100 },

    // Sala Financeiro
    { kind: "cabinet", x: 476, y: 690, w: 180, h: 30, label: "Armário" },
    { kind: "tv", x: 535, y: 680, w: 60, h: 8 },
    { kind: "desk", x: 500, y: 760, w: 65, h: 100, hasGadgets: true },
    { kind: "desk", x: 570, y: 760, w: 65, h: 100, hasGadgets: true },
    { kind: "desk", x: 500, y: 875, w: 65, h: 100, hasGadgets: true },
    { kind: "desk", x: 570, y: 875, w: 65, h: 100, hasGadgets: true },
  ],

  // ── ASSENTOS PREDEFINIDOS / PINS (38 Estações de Trabalho) ────────────────
  seats: [
    // ADM 1º Andar - Mesa Reunião Redonda (4 lugares)
    { id: "ADM-01", codigo: "ADM-01", sala: "ADM — 1º Andar", x: 86, y: 38 },
    { id: "ADM-02", codigo: "ADM-02", sala: "ADM — 1º Andar", x: 86, y: 98 },
    { id: "ADM-03", codigo: "ADM-03", sala: "ADM — 1º Andar", x: 56, y: 68 },
    { id: "ADM-04", codigo: "ADM-04", sala: "ADM — 1º Andar", x: 116, y: 68 },

    // ADM 1º Andar - Mesa L Canto Superior Esquerdo
    { id: "ADM-05", codigo: "ADM-05", sala: "ADM — 1º Andar", x: 75, y: 210 },

    // ADM 1º Andar - Baias Duplas Bloco 1 (6 lugares)
    { id: "ADM-06", codigo: "ADM-06", sala: "ADM — 1º Andar", x: 153, y: 77 },
    { id: "ADM-07", codigo: "ADM-07", sala: "ADM — 1º Andar", x: 208, y: 77 },
    { id: "ADM-08", codigo: "ADM-08", sala: "ADM — 1º Andar", x: 153, y: 144 },
    { id: "ADM-09", codigo: "ADM-09", sala: "ADM — 1º Andar", x: 208, y: 144 },
    { id: "ADM-10", codigo: "ADM-10", sala: "ADM — 1º Andar", x: 153, y: 211 },
    { id: "ADM-11", codigo: "ADM-11", sala: "ADM — 1º Andar", x: 208, y: 211 },

    // ADM 1º Andar - Baias Duplas Bloco 2 (6 lugares)
    { id: "ADM-12", codigo: "ADM-12", sala: "ADM — 1º Andar", x: 265, y: 77 },
    { id: "ADM-13", codigo: "ADM-13", sala: "ADM — 1º Andar", x: 320, y: 77 },
    { id: "ADM-14", codigo: "ADM-14", sala: "ADM — 1º Andar", x: 265, y: 144 },
    { id: "ADM-15", codigo: "ADM-15", sala: "ADM — 1º Andar", x: 320, y: 144 },
    { id: "ADM-16", codigo: "ADM-16", sala: "ADM — 1º Andar", x: 265, y: 211 },
    { id: "ADM-17", codigo: "ADM-17", sala: "ADM — 1º Andar", x: 320, y: 211 },

    // ADM 1º Andar - Baias L Direita (6 lugares)
    { id: "ADM-18", codigo: "ADM-18", sala: "ADM — 1º Andar", x: 390, y: 77 },
    { id: "ADM-19", codigo: "ADM-19", sala: "ADM — 1º Andar", x: 440, y: 77 },
    { id: "ADM-20", codigo: "ADM-20", sala: "ADM — 1º Andar", x: 390, y: 144 },
    { id: "ADM-21", codigo: "ADM-21", sala: "ADM — 1º Andar", x: 440, y: 144 },
    { id: "ADM-22", codigo: "ADM-22", sala: "ADM — 1º Andar", x: 390, y: 211 },
    { id: "ADM-23", codigo: "ADM-23", sala: "ADM — 1º Andar", x: 440, y: 211 },

    // ADM 1º Andar - Mesas Canto Direito
    { id: "ADM-24", codigo: "ADM-24", sala: "ADM — 1º Andar", x: 638, y: 80 },
    { id: "ADM-25", codigo: "ADM-25", sala: "ADM — 1º Andar", x: 605, y: 212 },

    // CCO - Centro de Controle Operacional (4 lugares realistas)
    { id: "CCO-01", codigo: "CCO-01", sala: "Centro de Controle Operacional", x: 425, y: 345 },
    { id: "CCO-02", codigo: "CCO-02", sala: "Centro de Controle Operacional", x: 615, y: 348 },
    { id: "CCO-03", codigo: "CCO-03", sala: "Centro de Controle Operacional", x: 425, y: 412 },
    { id: "CCO-04", codigo: "CCO-04", sala: "Centro de Controle Operacional", x: 585, y: 412 },

    // Galpão (3 lugares)
    { id: "CHK-01", codigo: "CHK-01", sala: "Check Out", x: 115, y: 475 },
    { id: "REE-01", codigo: "REE-01", sala: "Sala de Reenvase", x: 115, y: 665 },
    { id: "BIO-01", codigo: "BIO-01", sala: "Sala BIO", x: 115, y: 865 },

    // Sala DRC / Sala BSM Mezanino (7 lugares)
    { id: "BSM-01", codigo: "BSM-01", sala: "Sala BSM", x: 285, y: 500 },
    { id: "BSM-02", codigo: "BSM-02", sala: "Sala BSM", x: 285, y: 585 },
    { id: "DRC-01", codigo: "DRC-01", sala: "Sala DRC", x: 432, y: 490 },
    { id: "DRC-02", codigo: "DRC-02", sala: "Sala DRC", x: 412, y: 562 },
    { id: "DRC-03", codigo: "DRC-03", sala: "Sala DRC", x: 472, y: 562 },
    { id: "DRC-04", codigo: "DRC-04", sala: "Sala DRC", x: 555, y: 490 },
    { id: "DRC-05", codigo: "DRC-05", sala: "Sala DRC", x: 555, y: 608 },

    // Sala BSM Térreo (3 lugares)
    { id: "BSM-T1", codigo: "BSM-T1", sala: "Sala BSM (Térreo)", x: 308, y: 740 },
    { id: "BSM-T2", codigo: "BSM-T2", sala: "Sala BSM (Térreo)", x: 308, y: 835 },
    { id: "BSM-T3", codigo: "BSM-T3", sala: "Sala BSM (Térreo)", x: 308, y: 930 },

    // Sala Financeiro (4 lugares)
    { id: "FIN-01", codigo: "FIN-01", sala: "Sala Financeiro", x: 518, y: 810 },
    { id: "FIN-02", codigo: "FIN-02", sala: "Sala Financeiro", x: 600, y: 810 },
    { id: "FIN-03", codigo: "FIN-03", sala: "Sala Financeiro", x: 518, y: 925 },
    { id: "FIN-04", codigo: "FIN-04", sala: "Sala Financeiro", x: 600, y: 925 },
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
