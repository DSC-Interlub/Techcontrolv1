/**
 * floorplanRooms.js — Definição das 5 Salas com Imagens Realistas
 * 
 * As imagens de alta definição recriadas pelo usuário foram aplicadas como fundo base.
 * Os assentos interativos para atribuição de colaboradores ficam posicionados sobre cada cadeira.
 */

export const SVG_ROOMS = {
  // 1. SALA FINANCEIRO (Imagem Realista 688 x 1024)
  sala_financeiro: {
    id: "financeiro",
    name: "Sala Financeiro",
    image: "/plantas/sala_financeiro.png",
    width: 688,
    height: 1024,
    seats: [
      { id: "M-01", codigo: "M-01", x: 215, y: 550, rotate: 90 },
      { id: "M-02", codigo: "M-02", x: 475, y: 550, rotate: -90 },
      { id: "M-03", codigo: "M-03", x: 215, y: 820, rotate: 90 },
      { id: "M-04", codigo: "M-04", x: 475, y: 820, rotate: -90 },
    ],
  },

  // 2. ADM 1º ANDAR (Imagem Realista 1024 x 381)
  adm_1andar: {
    id: "adm-1andar",
    name: "ADM — 1º Andar",
    image: "/plantas/adm_1andar.png",
    width: 1024,
    height: 381,
    seats: [
      { id: "M-01", codigo: "M-01", x: 95, y: 295, rotate: -90 },

      { id: "M-02", codigo: "M-02", x: 228, y: 205, rotate: 90 },
      { id: "M-03", codigo: "M-03", x: 228, y: 275, rotate: 90 },
      { id: "M-04", codigo: "M-04", x: 228, y: 345, rotate: 90 },
      { id: "M-05", codigo: "M-05", x: 358, y: 205, rotate: -90 },
      { id: "M-06", codigo: "M-06", x: 358, y: 275, rotate: -90 },
      { id: "M-07", codigo: "M-07", x: 358, y: 345, rotate: -90 },

      { id: "M-08", codigo: "M-08", x: 428, y: 205, rotate: 90 },
      { id: "M-09", codigo: "M-09", x: 428, y: 275, rotate: 90 },
      { id: "M-10", codigo: "M-10", x: 428, y: 345, rotate: 90 },
      { id: "M-11", codigo: "M-11", x: 558, y: 205, rotate: -90 },
      { id: "M-12", codigo: "M-12", x: 558, y: 275, rotate: -90 },
      { id: "M-13", codigo: "M-13", x: 558, y: 345, rotate: -90 },

      { id: "M-14", codigo: "M-14", x: 648, y: 260, rotate: 0 },
      { id: "M-15", codigo: "M-15", x: 808, y: 260, rotate: 0 },
      { id: "M-16", codigo: "M-16", x: 648, y: 310, rotate: 0 },
      { id: "M-17", codigo: "M-17", x: 808, y: 310, rotate: 0 },
      { id: "M-18", codigo: "M-18", x: 648, y: 360, rotate: 0 },
      { id: "M-19", codigo: "M-19", x: 808, y: 360, rotate: 0 },

      { id: "M-20", codigo: "M-20", x: 960, y: 310, rotate: 0 },
    ],
  },

  // 3. MEZANINO: SALA BSM / SALA DRC (Imagem Realista 1024 x 456)
  mezanino_bsm_drc: {
    id: "bsm-drc",
    name: "Mezanino — Sala BSM / Sala DRC",
    image: "/plantas/mezanino_bsm_drc.png",
    width: 1024,
    height: 456,
    seats: [
      { id: "M-01", codigo: "M-01", x: 100, y: 110, rotate: 45 },
      { id: "M-02", codigo: "M-02", x: 100, y: 240, rotate: -45 },
      { id: "M-03", codigo: "M-03", x: 100, y: 380, rotate: -45 },

      { id: "M-04", codigo: "M-04", x: 410, y: 155, rotate: 0 },
      { id: "M-05", codigo: "M-05", x: 625, y: 175, rotate: 90 },
      { id: "M-06", codigo: "M-06", x: 805, y: 175, rotate: -90 },
      { id: "M-07", codigo: "M-07", x: 370, y: 300, rotate: 90 },
      { id: "M-08", codigo: "M-08", x: 550, y: 300, rotate: -90 },
      { id: "M-09", codigo: "M-09", x: 370, y: 410, rotate: 90 },
      { id: "M-10", codigo: "M-10", x: 550, y: 410, rotate: -90 },
      { id: "M-11", codigo: "M-11", x: 725, y: 380, rotate: 90 },
      { id: "M-12", codigo: "M-12", x: 905, y: 380, rotate: -90 },
    ],
  },

  // 4. GALPÃO: BIO / REENVASE / CHECK OUT (Imagem Realista 1024 x 252)
  galpao_bio_reenvase_checkout: {
    id: "bio-reenvase-checkout",
    name: "Galpão — Bio / Reenvase / Check Out",
    image: "/plantas/galpao_bio_reenvase_checkout.png",
    width: 1024,
    height: 252,
    seats: [
      { id: "M-01", codigo: "M-01", x: 195, y: 40, rotate: 0 },
      { id: "M-02", codigo: "M-02", x: 415, y: 55, rotate: -90 },
      { id: "M-03", codigo: "M-03", x: 760, y: 185, rotate: 180 },
      { id: "M-04", codigo: "M-04", x: 900, y: 185, rotate: 180 },
    ],
  },

  // 5. CENTRO DE CONTROLE OPERACIONAL - CCO (Imagem Realista 1024 x 935)
  galpao_centro_controle_operacional: {
    id: "centro-controle",
    name: "Centro de Controle Operacional",
    image: "/plantas/galpao_centro_controle_operacional.png",
    width: 1024,
    height: 935,
    seats: [
      { id: "M-01", codigo: "M-01", x: 260, y: 300, rotate: 45 },
      { id: "M-02", codigo: "M-02", x: 260, y: 670, rotate: -45 },
      { id: "M-03", codigo: "M-03", x: 815, y: 350, rotate: 0 },
    ],
  }
};
