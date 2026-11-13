export function formatarBRL(valor) {
  if (valor === null || valor === undefined || isNaN(Number(valor))) return "—";
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function calcularTeto(req) {
  if (!req) return 0;
  const maximo = Number(req.valor_maximo) || 0;
  if (maximo > 0) return maximo;
  const unitMax = Number(req.valor_unitario_maximo) || 0;
  const qtd = Number(req.quantidade) || 1;
  if (unitMax > 0) return unitMax * qtd;
  return 0;
}

export function detectarTipoArquivo(nomeOuUrl) {
  if (!nomeOuUrl || typeof nomeOuUrl !== "string") return "doc";
  const str = nomeOuUrl.toLowerCase().split("?")[0];
  if (str.endsWith(".pdf")) return "pdf";
  if (str.endsWith(".png") || str.endsWith(".jpg") || str.endsWith(".jpeg") || str.endsWith(".webp") || str.endsWith(".gif")) return "img";
  if (str.endsWith(".xls") || str.endsWith(".xlsx") || str.endsWith(".csv")) return "sheet";
  return "doc";
}

export function normalizarAnexos(req) {
  if (!req) return [];
  const items = [];
  const seenUrls = new Set();

  const addItem = (nome, url, origem = "Solicitante", tipo) => {
    if (!url || typeof url !== "string") return;
    const cleanUrl = url.trim();
    if (!cleanUrl || cleanUrl === "#" || seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);

    let cleanNome = nome;
    if (!cleanNome || typeof cleanNome !== "string") {
      try {
        const decoded = decodeURIComponent(cleanUrl.split("/").pop()?.split("?")[0] || "");
        cleanNome = decoded || "Documento";
      } catch {
        cleanNome = "Documento";
      }
    }

    const t = tipo || detectarTipoArquivo(cleanNome || cleanUrl);
    items.push({
      nome: cleanNome,
      url: cleanUrl,
      origem,
      tipo: t
    });
  };

  // 1. Anexos da cotação do Compras
  if (Array.isArray(req.cotacao_anexos)) {
    req.cotacao_anexos.forEach((a, idx) => {
      if (typeof a === "string") {
        addItem(`Orçamento ${idx + 1}`, a, "Compras");
      } else if (a && typeof a === "object") {
        addItem(a.file_name || a.nome || a.name || `Orçamento ${idx + 1}`, a.file_url || a.url, "Compras");
      }
    });
  }

  // 2. Link de cotação online cadastrado pelo Compras
  if (req.cotacao_link && typeof req.cotacao_link === "string" && req.cotacao_link.trim()) {
    addItem("Cotação / Loja Online", req.cotacao_link.trim(), "Compras", "link");
  }

  // 3. Anexos iniciais do solicitante
  if (Array.isArray(req.anexos)) {
    req.anexos.forEach((a, idx) => {
      if (typeof a === "string") {
        addItem(`Anexo ${idx + 1}`, a, "Solicitante");
      } else if (a && typeof a === "object") {
        addItem(a.file_name || a.nome || a.name || `Anexo ${idx + 1}`, a.file_url || a.url, "Solicitante");
      }
    });
  }

  // 4. Anexos registrados em etapas do histórico
  if (Array.isArray(req.historico)) {
    req.historico.forEach((h) => {
      if (Array.isArray(h.anexos)) {
        const origemHist = h.usuario?.toLowerCase().includes("compras") ? "Compras" : "Solicitante";
        h.anexos.forEach((a) => {
          if (typeof a === "string") {
            addItem(null, a, origemHist);
          } else if (a && typeof a === "object") {
            addItem(a.file_name || a.nome || a.name, a.file_url || a.url, origemHist);
          }
        });
      }
    });
  }

  return items;
}

export function eventoMaisRecente(req, tipos = []) {
  if (!req?.historico || !Array.isArray(req.historico)) return null;
  const list = req.historico.slice().reverse();
  if (!tipos.length) return list[0] || null;
  return list.find((h) => tipos.includes(h.tipo) || tipos.includes(h.k)) || null;
}

export function formatarDataHora(val, apenasData = false) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      // Se for string no formato YYYY-MM-DD
      if (typeof val === "string" && val.includes("-")) {
        const parts = val.split("T")[0].split("-");
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return String(val);
    }
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");

    if (apenasData) return `${dia}/${mes}/${ano}`;
    return `${dia}/${mes} · ${hora}:${min}`;
  } catch {
    return String(val);
  }
}

export const mapaEventos = {
  abertura: { titulo: "Requisição aberta", cor: "neutral" },
  aprovacao_diretor_1: { titulo: "Cotação autorizada", cor: "ok" },
  aprov1: { titulo: "Cotação autorizada", cor: "ok" },
  cotacao_enviada: { titulo: "Cotação cadastrada", cor: "warn" },
  cotacao: { titulo: "Cotação cadastrada", cor: "warn" },
  aprovacao_automatica_teto: { titulo: "Aprovada automaticamente", cor: "ok" },
  auto: { titulo: "Aprovada automaticamente", cor: "ok" },
  aprovacao_diretor_final: { titulo: "Compra autorizada", cor: "ok" },
  aprovF: { titulo: "Compra autorizada", cor: "ok" },
  reprovacao_diretor_1: { titulo: "Recusada pelo Diretor", cor: "bad" },
  reprovacao_diretor_final: { titulo: "Recusada pelo Diretor", cor: "bad" },
  recusa: { titulo: "Recusada", cor: "bad" },
  reenvio_apos_ajuste: { titulo: "Corrigida e reenviada", cor: "info" },
  reenvio: { titulo: "Corrigida e reenviada", cor: "info" },
  pedido_sap_lancado: { titulo: "Pedido lançado no SAP", cor: "info" },
  previsao_entrega_atualizada: { titulo: "Previsão de entrega alterada", cor: "warn" },
  entrega_registrada: { titulo: "Entregue", cor: "ok" },
  compra_cancelada: { titulo: "Compra cancelada", cor: "bad" },
  etapa_desfeita: { titulo: "Etapa corrigida", cor: "neutral" },
  falha_notificacao: { titulo: "Falha de notificação", cor: "bad" }
};

export function rotuloEvento(tipo) {
  return mapaEventos[tipo]?.titulo || tipo || "Evento registrado";
}
