import React, { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Search,
  Filter,
  AlertTriangle,
  RotateCcw,
  Calendar,
  FileText,
  Loader2,
  ExternalLink
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import FichaRequisicao from "../diretoria/FichaRequisicao";
import VisualizadorAnexo from "../diretoria/VisualizadorAnexo";
import { formatarBRL, formatarDataHora } from "../diretoria/utils";

// Helper para calcular dias úteis entre duas datas
function calcularDiasUteis(dataInicio, dataFim = new Date()) {
  if (!dataInicio) return 0;
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return 0;
  if (inicio > fim) return 0;

  let count = 0;
  const cur = new Date(inicio);
  while (cur < fim) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
  }
  return count;
}

// Helper para calcular atraso em dias
function calcularDiasAtraso(dataPrevisao) {
  if (!dataPrevisao) return 0;
  const prev = new Date(dataPrevisao + "T23:59:59");
  const agora = new Date();
  if (isNaN(prev.getTime())) return 0;
  const diffTime = agora.getTime() - prev.getTime();
  if (diffTime <= 0) return 0;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function PainelPedidosComprador({ requisicoes = [], isLoading, colaboradorFull }) {
  const queryClient = useQueryClient();

  // Estados locais para filtros e busca
  const [busca, setBusca] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("todos"); // "todos" | "Lançar no SAP" | "Aguardando entrega" | "Entregue" | "Cancelada"

  // Estado de atualização otimista local
  const [etapasLocais, setEtapasLocais] = useState({});

  // Modais de ações
  const [modalSapReq, setModalSapReq] = useState(null);
  const [modalPrevisaoReq, setModalPrevisaoReq] = useState(null);
  const [modalEntregaReq, setModalEntregaReq] = useState(null);
  const [modalCancelarReq, setModalCancelarReq] = useState(null);
  const [modalDesfazerReq, setModalDesfazerReq] = useState(null);

  // Ficha lateral e anexo
  const [fichaReq, setFichaReq] = useState(null);
  const [modalAnexo, setModalAnexo] = useState(null);

  // Campos de formulários
  const [formSapNumero, setFormSapNumero] = useState("");
  const [formSapPrevisao, setFormSapPrevisao] = useState("");
  const [formSapObs, setFormSapObs] = useState("");

  const [formPrevisaoData, setFormPrevisaoData] = useState("");
  const [formPrevisaoObs, setFormPrevisaoObs] = useState("");

  const [formEntregaData, setFormEntregaData] = useState(new Date().toISOString().split("T")[0]);
  const [formEntregaNf, setFormEntregaNf] = useState("");
  const [formEntregaObs, setFormEntregaObs] = useState("");

  const [formCancelMotivo, setFormCancelMotivo] = useState("");

  // Aplica as decisões otimistas locais sobre as requisições do servidor
  const pedidosCompletos = useMemo(() => {
    // Filtra apenas as aprovadas
    const aprovadas = requisicoes.filter((r) => r.status === "Aprovada");

    return aprovadas.map((r) => {
      const etapaLocal = etapasLocais[r.id];
      const numeroSap = etapaLocal?.sap_pedido_numero || r.pedido_sap || r.sap_pedido_numero || null;
      if (!etapaLocal) {
        return {
          ...r,
          pedido_sap: numeroSap,
          sap_pedido_numero: numeroSap,
          etapa_compra: r.etapa_compra || "Lançar no SAP"
        };
      }
      return {
        ...r,
        pedido_sap: numeroSap,
        sap_pedido_numero: numeroSap,
        ...etapaLocal
      };
    });
  }, [requisicoes, etapasLocais]);

  // Limpa etapasLocais quando o servidor refletir as atualizações
  useEffect(() => {
    if (!requisicoes?.length || Object.keys(etapasLocais).length === 0) return;
    setEtapasLocais((prev) => {
      let mudou = false;
      const novo = { ...prev };
      for (const [id, localData] of Object.entries(prev)) {
        const reqBanco = requisicoes.find((r) => r.id === id);
        if (reqBanco && reqBanco.etapa_compra === localData.etapa_compra) {
          delete novo[id];
          mudou = true;
        }
      }
      return mudou ? novo : prev;
    });
  }, [requisicoes, etapasLocais]);

  // Contadores do topo
  const contadores = useMemo(() => {
    let lancar = 0;
    let aguardando = 0;
    let entreguesMes = 0;

    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    pedidosCompletos.forEach((r) => {
      const etapa = r.etapa_compra || "Lançar no SAP";
      if (etapa === "Lançar no SAP") lancar++;
      else if (etapa === "Aguardando entrega") aguardando++;
      else if (etapa === "Entregue") {
        if (r.entrega_data) {
          const d = new Date(r.entrega_data + "T00:00:00");
          if (!isNaN(d.getTime()) && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
            entreguesMes++;
          }
        } else {
          entreguesMes++;
        }
      }
    });

    return { lancar, aguardando, entreguesMes };
  }, [pedidosCompletos]);

  // Filtragem e Ordenação
  const pedidosFiltrados = useMemo(() => {
    return pedidosCompletos
      .filter((r) => {
        // Filtro por etapa clicável
        if (filtroEtapa !== "todos") {
          const etapa = r.etapa_compra || "Lançar no SAP";
          if (etapa !== filtroEtapa) return false;
        }

        // Filtro de texto
        if (!busca.trim()) return true;
        const q = busca.toLowerCase();
        return (
          r.item?.toLowerCase().includes(q) ||
          r.numero_requisicao?.toLowerCase().includes(q) ||
          r.sap_pedido_numero?.toLowerCase().includes(q) ||
          r.cotacao_fornecedor?.toLowerCase().includes(q) ||
          r.colaborador_nome?.toLowerCase().includes(q) ||
          r.colaborador_area?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Ordenação padrão: atrasados primeiro, depois os mais antigos
        const atrasoA = a.etapa_compra === "Aguardando entrega" ? calcularDiasAtraso(a.previsao_entrega) : 0;
        const atrasoB = b.etapa_compra === "Aguardando entrega" ? calcularDiasAtraso(b.previsao_entrega) : 0;

        if (atrasoA > 0 && atrasoB <= 0) return -1;
        if (atrasoB > 0 && atrasoA <= 0) return 1;
        if (atrasoA > 0 && atrasoB > 0) return atrasoB - atrasoA;

        // Mais antigos primeiro (aprovada_em ou created_date)
        const dateA = new Date(a.aprovada_em || a.created_date || 0).getTime();
        const dateB = new Date(b.aprovada_em || b.created_date || 0).getTime();
        return dateA - dateB;
      });
  }, [pedidosCompletos, filtroEtapa, busca]);

  // ── MUTATIONS PÓS-APROVAÇÃO (COM ATUALIZAÇÃO OTIMISTA) ──

  // 1. Lançar no SAP
  const lancarSapMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    onMutate: async ({ reqId, sap_pedido_numero, previsao_entrega }) => {
      await queryClient.cancelQueries({ queryKey: ["portal_requisicoes"] });
      setEtapasLocais((prev) => ({
        ...prev,
        [reqId]: {
          etapa_compra: "Aguardando entrega",
          sap_pedido_numero,
          previsao_entrega: previsao_entrega || null,
          sap_lancado_em: new Date().toISOString()
        }
      }));
    },
    mutationFn: async ({ reqId, sap_pedido_numero, previsao_entrega, observacao }) => {
      const res = await base44.functions.invoke("requisicaoComprasAction", {
        action: "comprador_lancar_sap",
        requisicao_id: reqId,
        comprador_id: colaboradorFull?.id,
        comprador_nome: colaboradorFull?.nome_completo,
        sap_pedido_numero,
        previsao_entrega,
        observacao
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Pedido SAP registrado",
        description: data?.aviso_duplicado || "Requisição movida para Aguardando entrega com sucesso."
      });
      setModalSapReq(null);
    },
    onError: (err, { reqId }) => {
      setEtapasLocais((prev) => {
        const copy = { ...prev };
        delete copy[reqId];
        return copy;
      });
      toast({
        variant: "destructive",
        title: "Erro ao registrar pedido SAP",
        description: err.message || "Não foi possível registrar o pedido no SAP."
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portal_requisicoes"] });
    }
  });

  // 2. Atualizar Previsão
  const atualizarPrevisaoMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    onMutate: async ({ reqId, previsao_entrega }) => {
      await queryClient.cancelQueries({ queryKey: ["portal_requisicoes"] });
      setEtapasLocais((prev) => ({
        ...prev,
        [reqId]: {
          ...(prev[reqId] || {}),
          previsao_entrega: previsao_entrega || null
        }
      }));
    },
    mutationFn: async ({ reqId, previsao_entrega, observacao }) => {
      const res = await base44.functions.invoke("requisicaoComprasAction", {
        action: "comprador_atualizar_previsao",
        requisicao_id: reqId,
        comprador_id: colaboradorFull?.id,
        previsao_entrega,
        observacao
      });
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Previsão atualizada",
        description: "Nova data de previsão gravada com sucesso."
      });
      setModalPrevisaoReq(null);
    },
    onError: (err, { reqId }) => {
      setEtapasLocais((prev) => {
        const copy = { ...prev };
        delete copy[reqId];
        return copy;
      });
      toast({
        variant: "destructive",
        title: "Erro ao atualizar previsão",
        description: err.message || "Não foi possível alterar a previsão de entrega."
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portal_requisicoes"] });
    }
  });

  // 3. Registrar Entrega
  const registrarEntregaMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    onMutate: async ({ reqId, entrega_data, entrega_nf }) => {
      await queryClient.cancelQueries({ queryKey: ["portal_requisicoes"] });
      setEtapasLocais((prev) => ({
        ...prev,
        [reqId]: {
          ...(prev[reqId] || {}),
          etapa_compra: "Entregue",
          entrega_data,
          entrega_nf: entrega_nf || null
        }
      }));
    },
    mutationFn: async ({ reqId, entrega_data, entrega_nf, entrega_observacao }) => {
      const res = await base44.functions.invoke("requisicaoComprasAction", {
        action: "comprador_registrar_entrega",
        requisicao_id: reqId,
        comprador_id: colaboradorFull?.id,
        entrega_data,
        entrega_nf,
        entrega_observacao
      });
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Entrega registrada",
        description: "Recebimento confirmado e notificação enviada ao solicitante."
      });
      setModalEntregaReq(null);
    },
    onError: (err, { reqId }) => {
      setEtapasLocais((prev) => {
        const copy = { ...prev };
        delete copy[reqId];
        return copy;
      });
      toast({
        variant: "destructive",
        title: "Erro ao registrar entrega",
        description: err.message || "Não foi possível confirmar a entrega."
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portal_requisicoes"] });
    }
  });

  // 4. Cancelar Compra
  const cancelarCompraMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    onMutate: async ({ reqId }) => {
      await queryClient.cancelQueries({ queryKey: ["portal_requisicoes"] });
      setEtapasLocais((prev) => ({
        ...prev,
        [reqId]: {
          ...(prev[reqId] || {}),
          etapa_compra: "Cancelada"
        }
      }));
    },
    mutationFn: async ({ reqId, motivo }) => {
      const res = await base44.functions.invoke("requisicaoComprasAction", {
        action: "comprador_cancelar_compra",
        requisicao_id: reqId,
        comprador_id: colaboradorFull?.id,
        motivo
      });
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Compra cancelada",
        description: "A requisição foi marcada como Cancelada."
      });
      setModalCancelarReq(null);
    },
    onError: (err, { reqId }) => {
      setEtapasLocais((prev) => {
        const copy = { ...prev };
        delete copy[reqId];
        return copy;
      });
      toast({
        variant: "destructive",
        title: "Erro ao cancelar compra",
        description: err.message || "Não foi possível cancelar a compra."
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portal_requisicoes"] });
    }
  });

  // 5. Desfazer Etapa
  const desfazerEtapaMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    onMutate: async ({ reqId, etapaDestino }) => {
      await queryClient.cancelQueries({ queryKey: ["portal_requisicoes"] });
      setEtapasLocais((prev) => ({
        ...prev,
        [reqId]: {
          ...(prev[reqId] || {}),
          etapa_compra: etapaDestino
        }
      }));
    },
    mutationFn: async ({ reqId }) => {
      const res = await base44.functions.invoke("requisicaoComprasAction", {
        action: "comprador_desfazer_etapa",
        requisicao_id: reqId,
        comprador_id: colaboradorFull?.id
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Etapa desfeita",
        description: `Requisição retornada para "${data.etapa_destino || 'etapa anterior'}".`
      });
      setModalDesfazerReq(null);
    },
    onError: (err, { reqId }) => {
      setEtapasLocais((prev) => {
        const copy = { ...prev };
        delete copy[reqId];
        return copy;
      });
      toast({
        variant: "destructive",
        title: "Erro ao desfazer etapa",
        description: err.message || "Não foi possível reverter a etapa."
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portal_requisicoes"] });
    }
  });

  // Handlers para abrir modais
  const handleAbrirSap = (req) => {
    setModalSapReq(req);
    setFormSapNumero(req.sap_pedido_numero || "");
    setFormSapPrevisao(req.previsao_entrega || "");
    setFormSapObs("");
  };

  const handleAbrirPrevisao = (req) => {
    setModalPrevisaoReq(req);
    setFormPrevisaoData(req.previsao_entrega || "");
    setFormPrevisaoObs("");
  };

  const handleAbrirEntrega = (req) => {
    setModalEntregaReq(req);
    setFormEntregaData(req.entrega_data || new Date().toISOString().split("T")[0]);
    setFormEntregaNf(req.entrega_nf || "");
    setFormEntregaObs("");
  };

  const handleAbrirCancelar = (req) => {
    setModalCancelarReq(req);
    setFormCancelMotivo("");
  };

  const handleAbrirDesfazer = (req) => {
    setModalDesfazerReq(req);
  };

  return (
    <div id="painel-pedidos-comprador" className="space-y-6">
      {/* ── RESUMO NO TOPO (3 CARDS CLICÁVEIS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setFiltroEtapa(filtroEtapa === "Lançar no SAP" ? "todos" : "Lançar no SAP")}
          className={`p-4 rounded-xl border text-left transition shadow-xs flex items-center justify-between ${
            filtroEtapa === "Lançar no SAP"
              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20 dark:bg-amber-950/20 dark:border-amber-700"
              : "bg-card border-border hover:border-muted-foreground/30"
          }`}
        >
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Lançar no SAP
            </div>
            <div className="text-2xl font-bold text-foreground mt-1 tabular-nums">
              {contadores.lancar}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center font-bold">
            <Package className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFiltroEtapa(filtroEtapa === "Aguardando entrega" ? "todos" : "Aguardando entrega")}
          className={`p-4 rounded-xl border text-left transition shadow-xs flex items-center justify-between ${
            filtroEtapa === "Aguardando entrega"
              ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/20 dark:bg-blue-950/20 dark:border-blue-700"
              : "bg-card border-border hover:border-muted-foreground/30"
          }`}
        >
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Aguardando entrega
            </div>
            <div className="text-2xl font-bold text-foreground mt-1 tabular-nums">
              {contadores.aguardando}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5 text-blue-700 dark:text-blue-400" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFiltroEtapa(filtroEtapa === "Entregue" ? "todos" : "Entregue")}
          className={`p-4 rounded-xl border text-left transition shadow-xs flex items-center justify-between ${
            filtroEtapa === "Entregue"
              ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/20 dark:bg-emerald-950/20 dark:border-emerald-700"
              : "bg-card border-border hover:border-muted-foreground/30"
          }`}
        >
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Entregues no mês
            </div>
            <div className="text-2xl font-bold text-foreground mt-1 tabular-nums">
              {contadores.entreguesMes}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          </div>
        </button>
      </div>

      {/* ── BARRA DE BUSCA E FILTROS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Buscar por item, nº requisição, pedido SAP, fornecedor, solicitante..."
            className="pl-9 h-10 text-sm bg-transparent border-muted"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {busca && (
            <Button variant="ghost" size="sm" onClick={() => setBusca("")} className="text-xs h-9">
              Limpar busca
            </Button>
          )}

          {filtroEtapa !== "todos" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltroEtapa("todos")}
              className="text-xs h-9 gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Ver todos ({pedidosCompletos.length})
            </Button>
          )}
        </div>
      </div>

      {/* ── TABELA DE PEDIDOS ── */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs">Carregando pedidos aprovados...</span>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="text-center py-16 px-4 border rounded-xl bg-card">
          <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-foreground">Nenhum pedido encontrado</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {busca || filtroEtapa !== "todos"
              ? "Tente alterar os filtros ou o termo de busca pesquisado."
              : "Não há pedidos de compra aprovados para acompanhamento no momento."}
          </p>
        </div>
      ) : (
        <div className="border rounded-xl bg-card overflow-x-auto shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[30%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Requisição
                </TableHead>
                <TableHead className="w-[18%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Solicitante / Área
                </TableHead>
                <TableHead className="w-[18%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fornecedor
                </TableHead>
                <TableHead className="w-[12%] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valor
                </TableHead>
                <TableHead className="w-[12%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status SAP
                </TableHead>
                <TableHead className="w-[10%] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosFiltrados.map((r) => {
                const etapa = r.etapa_compra || "Lançar no SAP";
                const valorCotado = Number(r.cotacao_valor) || 0;
                const diasAprovada = calcularDiasUteis(r.aprovada_em || r.created_date);
                const diasAtraso = etapa === "Aguardando entrega" ? calcularDiasAtraso(r.previsao_entrega) : 0;
                const semPrevisao = etapa === "Aguardando entrega" && !r.previsao_entrega;

                return (
                  <TableRow
                    key={r.id}
                    className="hover:bg-muted/40 transition cursor-pointer"
                    onClick={() => setFichaReq(r)}
                  >
                    {/* 1. Requisição */}
                    <TableCell className="py-3.5">
                      <div className="font-semibold text-foreground text-sm leading-snug line-clamp-1" title={r.item}>
                        {r.item}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs text-muted-foreground font-semibold">
                          {r.numero_requisicao}
                        </span>
                        <span>·</span>
                        <span className="text-xs text-muted-foreground">
                          {r.quantidade} {r.unidade_medida || "un"}
                        </span>
                      </div>
                    </TableCell>

                    {/* 2. Solicitante */}
                    <TableCell className="py-3.5 text-sm">
                      <div className="text-foreground font-medium truncate" title={r.colaborador_nome}>
                        {r.colaborador_nome}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.colaborador_area || "Geral"}
                      </div>
                    </TableCell>

                    {/* 3. Fornecedor */}
                    <TableCell className="py-3.5 text-sm">
                      <div className="text-foreground font-medium truncate" title={r.cotacao_fornecedor || "—"}>
                        {r.cotacao_fornecedor || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        Aprovada {formatarDataHora(r.aprovada_em || r.created_date, true)}
                      </div>
                    </TableCell>

                    {/* 4. Valor */}
                    <TableCell className="py-3.5 text-right font-semibold text-foreground text-sm tabular-nums">
                      {formatarBRL(valorCotado)}
                    </TableCell>

                    {/* 5. Status SAP / Destaques de Atenção */}
                    <TableCell className="py-3.5">
                      <div className="space-y-1">
                        {/* Badge da Etapa */}
                        {etapa === "Lançar no SAP" && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-xs font-semibold">
                            Lançar no SAP
                          </Badge>
                        )}
                        {etapa === "Aguardando entrega" && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 text-xs font-semibold">
                            Aguardando entrega
                          </Badge>
                        )}
                        {etapa === "Entregue" && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold">
                            Entregue
                          </Badge>
                        )}
                        {etapa === "Cancelada" && (
                          <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 text-xs font-semibold">
                            Cancelada
                          </Badge>
                        )}

                        {/* Destaque 1: Aprovada há mais de 2 dias úteis sem lançamento no SAP */}
                        {etapa === "Lançar no SAP" && diasAprovada > 2 && (
                          <div>
                            <span className="inline-block text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                              Aprovada há {diasAprovada} dias
                            </span>
                          </div>
                        )}

                        {/* Pedido SAP e Previsão */}
                        {r.sap_pedido_numero && (
                          <div className="text-xs font-mono text-foreground font-semibold">
                            SAP: {r.sap_pedido_numero}
                          </div>
                        )}

                        {/* Destaque 2: Previsão vencida (Atrasada) */}
                        {diasAtraso > 0 && (
                          <div>
                            <span className="inline-block text-[11px] font-semibold text-red-800 dark:text-red-300 bg-red-100/80 dark:bg-red-950/60 px-1.5 py-0.5 rounded">
                              Atrasada {diasAtraso} dia(s)
                            </span>
                          </div>
                        )}

                        {/* Destaque 3: Sem previsão informada */}
                        {semPrevisao && (
                          <div>
                            <span className="inline-block text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                              Sem previsão
                            </span>
                          </div>
                        )}

                        {r.previsao_entrega && diasAtraso === 0 && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            Prev: {formatarDataHora(r.previsao_entrega, true)}
                          </div>
                        )}

                        {r.entrega_data && (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                            Entregue {formatarDataHora(r.entrega_data, true)}
                            {r.entrega_nf ? ` (NF: ${r.entrega_nf})` : ""}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* 6. Ações */}
                    <TableCell className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {etapa === "Lançar no SAP" && (
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground text-xs font-semibold h-8 px-3"
                            onClick={() => handleAbrirSap(r)}
                          >
                            Registrar pedido SAP
                          </Button>
                        )}

                        {etapa === "Aguardando entrega" && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 px-3"
                            onClick={() => handleAbrirEntrega(r)}
                          >
                            Registrar entrega
                          </Button>
                        )}

                        {/* Menu de contexto */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {etapa === "Aguardando entrega" && (
                              <DropdownMenuItem onClick={() => handleAbrirPrevisao(r)}>
                                Alterar previsão
                              </DropdownMenuItem>
                            )}

                            {etapa !== "Cancelada" && etapa !== "Entregue" && (
                              <DropdownMenuItem
                                onClick={() => handleAbrirCancelar(r)}
                                className="text-red-600 focus:text-red-600"
                              >
                                Cancelar compra
                              </DropdownMenuItem>
                            )}

                            {etapa !== "Lançar no SAP" && (
                              <DropdownMenuItem onClick={() => handleAbrirDesfazer(r)}>
                                Desfazer última etapa
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={() => setFichaReq(r)}>
                              Ver histórico completo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── DIALOG 1: REGISTRAR PEDIDO SAP ── */}
      <Dialog open={!!modalSapReq} onOpenChange={(open) => !open && setModalSapReq(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pedido SAP</DialogTitle>
            <DialogDescription>
              Informe o número do pedido lançado no SAP para a requisição{" "}
              <strong>{modalSapReq?.numero_requisicao}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!formSapNumero.trim() || lancarSapMutation.isPending) return;
              lancarSapMutation.mutate({
                reqId: modalSapReq.id,
                sap_pedido_numero: formSapNumero.trim(),
                previsao_entrega: formSapPrevisao || null,
                observacao: formSapObs.trim() || null
              });
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Número do Pedido SAP <span className="text-red-500">*</span>
              </label>
              <Input
                autoFocus
                placeholder="Ex: 4500012345"
                value={formSapNumero}
                onChange={(e) => setFormSapNumero(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Previsão de Entrega (opcional)
              </label>
              <Input
                type="date"
                value={formSapPrevisao}
                onChange={(e) => setFormSapPrevisao(e.target.value)}
                className="text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Observações (opcional)
              </label>
              <Textarea
                rows={2}
                placeholder="Ex: Pedido com frete CIF, entrega na portaria 2..."
                value={formSapObs}
                onChange={(e) => setFormSapObs(e.target.value)}
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalSapReq(null)}
                disabled={lancarSapMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!formSapNumero.trim() || lancarSapMutation.isPending}
                className="font-semibold"
              >
                {lancarSapMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Salvar no SAP"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 2: ALTERAR PREVISÃO ── */}
      <Dialog open={!!modalPrevisaoReq} onOpenChange={(open) => !open && setModalPrevisaoReq(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Previsão de Entrega</DialogTitle>
            <DialogDescription>
              Atualize a previsão para o pedido <strong>{modalPrevisaoReq?.sap_pedido_numero || modalPrevisaoReq?.numero_requisicao}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (atualizarPrevisaoMutation.isPending) return;
              atualizarPrevisaoMutation.mutate({
                reqId: modalPrevisaoReq.id,
                previsao_entrega: formPrevisaoData || null,
                observacao: formPrevisaoObs.trim() || null
              });
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Nova Data de Previsão
              </label>
              <Input
                type="date"
                autoFocus
                value={formPrevisaoData}
                onChange={(e) => setFormPrevisaoData(e.target.value)}
                className="text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Motivo / Observação
              </label>
              <Textarea
                rows={2}
                placeholder="Ex: Fornecedor solicitou prazo adicional de fabricação..."
                value={formPrevisaoObs}
                onChange={(e) => setFormPrevisaoObs(e.target.value)}
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalPrevisaoReq(null)}
                disabled={atualizarPrevisaoMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={atualizarPrevisaoMutation.isPending}
                className="font-semibold"
              >
                {atualizarPrevisaoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Previsão"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 3: REGISTRAR ENTREGA ── */}
      <Dialog open={!!modalEntregaReq} onOpenChange={(open) => !open && setModalEntregaReq(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Entrega</DialogTitle>
            <DialogDescription>
              Confirme a entrega do pedido SAP{" "}
              <strong>{modalEntregaReq?.sap_pedido_numero || modalEntregaReq?.numero_requisicao}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!formEntregaData || registrarEntregaMutation.isPending) return;
              registrarEntregaMutation.mutate({
                reqId: modalEntregaReq.id,
                entrega_data: formEntregaData,
                entrega_nf: formEntregaNf.trim() || null,
                entrega_observacao: formEntregaObs.trim() || null
              });
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Data Efetiva da Entrega <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                autoFocus
                value={formEntregaData}
                onChange={(e) => setFormEntregaData(e.target.value)}
                className="text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Nota Fiscal (NF)
              </label>
              <Input
                placeholder="Ex: NF-e 12345"
                value={formEntregaNf}
                onChange={(e) => setFormEntregaNf(e.target.value)}
                className="text-sm font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Observações do Recebimento (opcional)
              </label>
              <Textarea
                rows={2}
                placeholder="Ex: Entregue na portaria para o solicitante..."
                value={formEntregaObs}
                onChange={(e) => setFormEntregaObs(e.target.value)}
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalEntregaReq(null)}
                disabled={registrarEntregaMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!formEntregaData || registrarEntregaMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {registrarEntregaMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  "Confirmar Entrega"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 4: CANCELAR COMPRA ── */}
      <Dialog open={!!modalCancelarReq} onOpenChange={(open) => !open && setModalCancelarReq(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Cancelar Compra</DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento pós-aprovação da requisição{" "}
              <strong>{modalCancelarReq?.numero_requisicao}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!formCancelMotivo.trim() || cancelarCompraMutation.isPending) return;
              cancelarCompraMutation.mutate({
                reqId: modalCancelarReq.id,
                motivo: formCancelMotivo.trim()
              });
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Motivo do Cancelamento <span className="text-red-500">*</span>
              </label>
              <Textarea
                rows={3}
                autoFocus
                placeholder="Ex: Fornecedor sem estoque e solicitação suspensa pela diretoria..."
                value={formCancelMotivo}
                onChange={(e) => setFormCancelMotivo(e.target.value)}
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalCancelarReq(null)}
                disabled={cancelarCompraMutation.isPending}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!formCancelMotivo.trim() || cancelarCompraMutation.isPending}
                className="font-semibold"
              >
                {cancelarCompraMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  "Confirmar Cancelamento"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 5: DESFAZER ETAPA ── */}
      <Dialog open={!!modalDesfazerReq} onOpenChange={(open) => !open && setModalDesfazerReq(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Desfazer Última Etapa</DialogTitle>
            <DialogDescription>
              Deseja reverter a etapa atual (
              <strong className="text-foreground">{modalDesfazerReq?.etapa_compra}</strong>) da requisição{" "}
              <strong>{modalDesfazerReq?.numero_requisicao}</strong> para a etapa anterior?
            </DialogDescription>
          </DialogHeader>

          <div className="text-xs text-muted-foreground p-3 bg-muted/40 rounded-lg border">
            Esta ação permite corrigir cliques acidentais e manter os dados consistentes no TechControl.
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalDesfazerReq(null)}
              disabled={desfazerEtapaMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                const etapaAtual = modalDesfazerReq.etapa_compra || "Lançar no SAP";
                const destino =
                  etapaAtual === "Entregue"
                    ? "Aguardando entrega"
                    : etapaAtual === "Aguardando entrega"
                    ? "Lançar no SAP"
                    : "Lançar no SAP";

                desfazerEtapaMutation.mutate({
                  reqId: modalDesfazerReq.id,
                  etapaDestino: destino
                });
              }}
              disabled={desfazerEtapaMutation.isPending}
              className="font-semibold"
            >
              {desfazerEtapaMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Revertendo...
                </>
              ) : (
                "Sim, Desfazer Etapa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── FICHA COMPLETA DA REQUISIÇÃO (SIDE SHEET) ── */}
      <FichaRequisicao
        requisicao={fichaReq}
        open={!!fichaReq}
        onClose={() => setFichaReq(null)}
        onSelectAnexo={(anexo) => setModalAnexo(anexo)}
      />

      {/* ── VISUALIZADOR DE ANEXOS ── */}
      <VisualizadorAnexo
        anexo={modalAnexo}
        open={!!modalAnexo}
        onClose={() => setModalAnexo(null)}
      />
    </div>
  );
}
