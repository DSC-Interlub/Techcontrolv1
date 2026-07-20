/**
 * PainelComunicados.jsx — Dashboard Único Consolidado de Comunicados (Opção A)
 * Reúne em uma única tela:
 * - Stats principais e botões de ação rápida no topo.
 * - Coluna Esquerda: Feed cronológico automático dos eventos dos próximos 30 dias com upload rápido de artes.
 * - Coluna Direita: Alertas urgentes (próximos 7 dias sem arte) + Histórico real de envios (logs Resend).
 * - Modal deslizante de Configurações de E-mail (AbaConfiguracoes).
 */
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone, Upload, Eye, RefreshCw, Trash2, AlertTriangle, Loader2,
  CheckCircle, XCircle, Clock, Settings, Play, Search, Filter, Calendar, Sparkles
} from "lucide-react";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import AbaConfiguracoes from "./AbaConfiguracoes";

export const TIPO_LABELS = {
  aniversario_colaborador: "🎂 Aniversário Colaborador",
  aniversario_conjuge: "💑 Aniversário Cônjuge",
  aniversario_filho_1ano: "🎈 1 Aninho",
  tempo_empresa: "🏆 Tempo de Empresa",
  despedida: "💼 Despedida",
  boas_vindas: "👋 Boas-vindas",
};

const TIPO_COR = {
  aniversario_colaborador: "bg-pink-100 text-pink-800 border-pink-200",
  aniversario_conjuge: "bg-rose-100 text-rose-800 border-rose-200",
  aniversario_filho_1ano: "bg-purple-100 text-purple-800 border-purple-200",
  tempo_empresa: "bg-amber-100 text-amber-800 border-amber-200",
  despedida: "bg-slate-100 text-slate-700 border-slate-200",
  boas_vindas: "bg-blue-100 text-blue-800 border-blue-200",
};

function StatusBadge({ status }) {
  if (status === "arte_carregada") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">✅ Arte pronta</Badge>;
  if (status === "enviado") return <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs"><CheckCircle className="w-3 h-3 mr-1 inline" />Enviado</Badge>;
  if (status === "erro" || status === "erro_envio") return <Badge className="bg-red-100 text-red-700 border-red-300 text-xs"><XCircle className="w-3 h-3 mr-1 inline" />Erro envio</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-xs">⚠️ Sem arte</Badge>;
}

function DiasParaEvento({ dataEvento }) {
  if (!dataEvento) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dt = parseISO(dataEvento);
  const diff = differenceInDays(dt, hoje);
  if (diff < 0) return <span className="text-xs text-gray-400">passou há {Math.abs(diff)}d</span>;
  if (diff === 0) return <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">🎉 Hoje!</span>;
  if (diff <= 3) return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">em {diff} dia{diff !== 1 ? "s" : ""}!</span>;
  if (diff <= 7) return <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">em {diff} dias</span>;
  return <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border">em {diff} dias</span>;
}

// ─── Modal de Observações ──────────────────────────────────────────────────
function ModalObservacoes({ demanda, onClose }) {
  const [obs, setObs] = useState(demanda.observacoes || "");
  const queryClient = useQueryClient();
  const mut = useMutation({
    mutationFn: (d) => base44.entities.Comunicados_Artes.update(demanda.id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] }); onClose(); },
  });
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Observações da Arte</Label>
        <Textarea rows={3} value={obs} onChange={e => setObs(e.target.value)} className="mt-1 text-xs" placeholder="Anotações para a equipe de design..." />
      </div>
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => mut.mutate({ observacoes: obs })} disabled={mut.isPending}>
          {mut.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

// ─── Item do Feed de Demandas ──────────────────────────────────────────────
function ItemFeedDemanda({ demanda, podeCriarArte, nomeUsuario, colaboradores }) {
  const [uploading, setUploading] = useState(false);
  const [showObs, setShowObs] = useState(false);
  const queryClient = useQueryClient();

  const colab = useMemo(() =>
    colaboradores.find(c => c.id === demanda.colaborador_id),
    [colaboradores, demanda.colaborador_id]
  );

  const updateMut = useMutation({
    mutationFn: (d) => base44.entities.Comunicados_Artes.update(demanda.id, d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] }),
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateMut.mutate({
        imagem_url: file_url,
        status_arte: "arte_carregada",
        criado_por: nomeUsuario || "Portal",
      });
    } catch (err) {
      alert("Erro ao fazer upload da imagem: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoverArte = () => {
    if (!confirm("Remover a arte desta demanda?")) return;
    updateMut.mutate({ imagem_url: "", status_arte: "sem_arte" });
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataEvento = demanda.data_evento ? parseISO(demanda.data_evento) : null;
  const diasRestantes = dataEvento ? differenceInDays(dataEvento, hoje) : null;
  const isUrgente = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 7 && demanda.status_arte === "sem_arte";

  return (
    <div className={`border rounded-xl p-4 transition-all duration-200 ${
      isUrgente ? "border-red-300 bg-red-50/50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300 shadow-sm"
    }`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Lado Esquerdo: Info Colaborador & Evento */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {colab?.foto_url ? (
            <img src={colab.foto_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 border border-gray-200 mt-0.5" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5 shadow-sm">
              {(demanda.colaborador_nome || "?").charAt(0)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 text-sm">{demanda.colaborador_nome || "—"}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${TIPO_COR[demanda.tipo_comunicado] || "bg-gray-100 text-gray-700"}`}>
                {TIPO_LABELS[demanda.tipo_comunicado] || demanda.tipo_comunicado}
              </span>
              {demanda.anos_empresa && (
                <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {demanda.anos_empresa} ano{demanda.anos_empresa > 1 ? "s" : ""}
                </span>
              )}
              {demanda.filho_nome && (
                <span className="text-xs text-purple-700 font-medium">({demanda.filho_nome})</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
              {demanda.data_evento && (
                <span className="flex items-center gap-1 font-medium text-gray-700">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {format(parseISO(demanda.data_evento), "dd 'de' MMMM", { locale: ptBR })}
                </span>
              )}
              <DiasParaEvento dataEvento={demanda.data_evento} />
              <StatusBadge status={demanda.status_arte} />
            </div>

            {demanda.observacoes && (
              <p className="text-xs text-gray-500 mt-1.5 italic bg-gray-50 rounded px-2 py-1 border border-gray-100">
                "{demanda.observacoes}"
              </p>
            )}
          </div>
        </div>

        {/* Lado Direito: Ações & Upload Direct Box */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
          {demanda.imagem_url ? (
            <div className="flex items-center gap-2">
              <a href={demanda.imagem_url} target="_blank" rel="noreferrer" className="group relative">
                <img src={demanda.imagem_url} alt="Arte" className="w-12 h-12 object-cover rounded-lg border border-gray-300 group-hover:opacity-85 transition-opacity" />
                <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-4 h-4 text-white" />
                </div>
              </a>
              {podeCriarArte && demanda.status_arte !== "enviado" && (
                <div className="flex flex-col gap-1">
                  <label className="cursor-pointer" title="Substituir arte">
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                    <span className="p-1 rounded hover:bg-gray-100 text-gray-600 block border border-gray-200">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </span>
                  </label>
                  <button onClick={handleRemoverArte} title="Remover arte" className="p-1 rounded hover:bg-red-50 text-red-600 block border border-red-200">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            podeCriarArte && demanda.status_arte !== "enviado" && (
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors ${
                  uploading ? "opacity-50 cursor-not-allowed" : ""
                }`}>
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? "Carregando..." : "Carregar Arte"}
                </span>
              </label>
            )
          )}

          <button onClick={() => setShowObs(true)} title="Observações" className="p-2 rounded-lg text-xs border border-gray-200 text-gray-500 hover:bg-gray-50">
            💬
          </button>
        </div>
      </div>

      <Dialog open={showObs} onOpenChange={v => !v && setShowObs(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Observações da Arte</DialogTitle></DialogHeader>
          {showObs && <ModalObservacoes demanda={demanda} onClose={() => setShowObs(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente Principal Exibido ──────────────────────────────────────────
export default function PainelComunicados({ podeCriarArte = true, podeGerenciarConfig = true, nomeUsuario = "" }) {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [openConfigModal, setOpenConfigModal] = useState(false);
  const [disparando, setDisparando] = useState(false);
  const [resultadoDisparo, setResultadoDisparo] = useState(null);
  const [detalhesLog, setDetalhesLog] = useState(null);

  // Queries
  const { data: demandas = [], isLoading: loadDemandas } = useQuery({
    queryKey: ["comunicados_artes"],
    queryFn: () => base44.entities.Comunicados_Artes.list("-data_evento", 300),
    staleTime: 30_000,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: () => base44.entities.Colaboradores.list(),
    staleTime: 60_000,
  });

  const { data: logs = [], isLoading: loadLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["comunicados_log"],
    queryFn: () => base44.entities.Comunicados_Log.list("-data_envio", 50),
    staleTime: 30_000,
  });

  // Janela dos próximos 30 dias a partir de hoje
  const demandasProximos30Dias = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite30 = addDays(hoje, 30);

    return demandas.filter(d => {
      if (!d.data_evento) return false;
      const dt = parseISO(d.data_evento);
      return dt >= hoje && dt <= limite30;
    }).sort((a, b) => (a.data_evento || "").localeCompare(b.data_evento || ""));
  }, [demandas]);

  // Alerta Watchdog (Próximos 7 dias sem arte)
  const urgentesSemArte = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite7 = addDays(hoje, 7);

    return demandas.filter(d => {
      if (d.status_arte !== "sem_arte" || !d.data_evento) return false;
      const dt = parseISO(d.data_evento);
      return dt >= hoje && dt <= limite7;
    }).sort((a, b) => (a.data_evento || "").localeCompare(b.data_evento || ""));
  }, [demandas]);

  // Feed Filtrado
  const feedFiltrado = useMemo(() => {
    let list = demandasProximos30Dias;
    if (busca.trim()) {
      const q = busca.toLowerCase().trim();
      list = list.filter(d => (d.colaborador_nome || "").toLowerCase().includes(q));
    }
    if (filtroStatus !== "todos") {
      list = list.filter(d => d.status_arte === filtroStatus);
    }
    if (filtroTipo !== "todos") {
      list = list.filter(d => d.tipo_comunicado === filtroTipo);
    }
    return list;
  }, [demandasProximos30Dias, busca, filtroStatus, filtroTipo]);

  // Stats gerais dos próximos 30 dias
  const stats = useMemo(() => {
    const total = demandasProximos30Dias.length;
    const semArte = demandasProximos30Dias.filter(d => d.status_arte === "sem_arte").length;
    const artePronta = demandasProximos30Dias.filter(d => d.status_arte === "arte_carregada").length;
    const enviado = demandasProximos30Dias.filter(d => d.status_arte === "enviado").length;
    return { total, semArte, artePronta, enviado };
  }, [demandasProximos30Dias]);

  // Disparo manual consolidado
  const handleExecutarRotina = async () => {
    setDisparando(true);
    setResultadoDisparo(null);
    try {
      const res = await base44.functions.invoke("dispararComunicados", {});
      queryClient.invalidateQueries({ queryKey: ["comunicados_log"] });
      queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] });

      const counts = res.data?.results?.comunicados || {};
      const totalEnviados = Object.values(counts).reduce((a, b) => a + b, 0);

      setResultadoDisparo({
        ok: true,
        msg: `Rotina executada! Sincronizou demandas e enviou ${totalEnviados} e-mail(s) agendados.`,
      });
    } catch (err) {
      setResultadoDisparo({
        ok: false,
        msg: err.message || "Erro ao executar rotina de comunicados.",
      });
    } finally {
      setDisparando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── CABEÇALHO & STATS PRINCIPAIS ─────────────────────────────────── */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Central de Comunicados</h1>
              <p className="text-sm text-gray-500">Gestão de eventos dos próximos 30 dias e histórico de e-mails em tempo real</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {podeGerenciarConfig && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-medium border-gray-300 hover:bg-gray-50 text-gray-700"
                onClick={() => setOpenConfigModal(true)}
              >
                <Settings className="w-4 h-4 mr-1.5 text-indigo-600" />
                Configurações
              </Button>
            )}

            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm"
              disabled={disparando}
              onClick={handleExecutarRotina}
            >
              {disparando ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Processando...</>
              ) : (
                <><Play className="w-4 h-4 mr-1.5" />Executar Rotina Diária Agora</>
              )}
            </Button>
          </div>
        </div>

        {/* Card Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Próximos 30 dias</p>
            <p className="text-2xl font-black text-indigo-950 mt-1">{stats.total} <span className="text-xs font-normal text-indigo-700">eventos</span></p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">⚠️ Sem Arte</p>
            <p className="text-2xl font-black text-amber-950 mt-1">{stats.semArte} <span className="text-xs font-normal text-amber-700">pendentes</span></p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">✅ Arte Pronta</p>
            <p className="text-2xl font-black text-emerald-950 mt-1">{stats.artePronta} <span className="text-xs font-normal text-emerald-700">prontas</span></p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">📤 Enviados</p>
            <p className="text-2xl font-black text-blue-950 mt-1">{stats.enviado} <span className="text-xs font-normal text-blue-700">disparados</span></p>
          </div>
        </div>

        {/* Feedback do disparo manual */}
        {resultadoDisparo && (
          <div className={`mt-4 border rounded-xl p-4 flex items-center justify-between gap-3 text-xs font-medium ${
            resultadoDisparo.ok ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-red-50 border-red-300 text-red-900"
          }`}>
            <div className="flex items-center gap-2">
              {resultadoDisparo.ok ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
              <span>{resultadoDisparo.msg}</span>
            </div>
            <button className="text-gray-400 hover:text-gray-600" onClick={() => setResultadoDisparo(null)}>✕</button>
          </div>
        )}
      </div>

      {/* ── PAINEL PRINCIPAL (LAYOUT 2 COLUNAS) ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUNA ESQUERDA (8 Cols): Feed Cronológico dos Próximos 30 dias */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Próximos Eventos (30 dias)
                </CardTitle>
                <span className="text-xs text-gray-500 font-normal">
                  Sincronização automática contínua
                </span>
              </div>

              {/* Filtros do Feed */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3">
                <div className="relative sm:col-span-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                  <Input
                    placeholder="Buscar nome..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="h-8 text-xs pl-8"
                  />
                </div>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="sem_arte">⚠️ Sem arte</SelectItem>
                    <SelectItem value="arte_carregada">✅ Arte pronta</SelectItem>
                    <SelectItem value="enviado">📤 Enviado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {loadDemandas ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : feedFiltrado.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm font-medium">Nenhum evento encontrado nos próximos 30 dias.</p>
                  <p className="text-xs mt-1">Os eventos são gerados automaticamente pelo sistema.</p>
                </div>
              ) : (
                feedFiltrado.map(demanda => (
                  <ItemFeedDemanda
                    key={demanda.id}
                    demanda={demanda}
                    podeCriarArte={podeCriarArte}
                    nomeUsuario={nomeUsuario}
                    colaboradores={colaboradores}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA (5 Cols): Watchdog Alertas + Histórico do Resend */}
        <div className="lg:col-span-5 space-y-6">

          {/* WATCHDOG PAINEL DE ATENÇÃO (7 DIAS SEM ARTE) */}
          <Card className={`shadow-sm ${urgentesSemArte.length > 0 ? "border-amber-300 bg-amber-50/30" : "border-gray-200"}`}>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Atenção: Sem Arte (Próximos 7 dias)
                </span>
                <Badge className={urgentesSemArte.length > 0 ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-gray-100 text-gray-600"}>
                  {urgentesSemArte.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {urgentesSemArte.length === 0 ? (
                <div className="text-center py-4 text-emerald-700 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs">
                  <CheckCircle className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <p className="font-semibold">Tudo pronto para os próximos 7 dias!</p>
                  <p className="text-emerald-600 mt-0.5">Nenhum comunicado pendente de arte.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-amber-800 mb-2">
                    Carregue as artes abaixo para evitar falha no envio automático:
                  </p>
                  {urgentesSemArte.map(u => (
                    <div key={u.id} className="bg-white border border-amber-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-gray-900">{u.colaborador_nome}</p>
                        <p className="text-gray-500 text-[11px]">
                          {TIPO_LABELS[u.tipo_comunicado] || u.tipo_comunicado} • {u.data_evento ? format(parseISO(u.data_evento), "dd/MM") : ""}
                        </p>
                      </div>
                      <DiasParaEvento dataEvento={u.data_evento} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* HISTÓRICO REAL DE ENVIOS (LOGS DO RESEND) */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                <Clock className="w-4 h-4 text-indigo-600" />
                Histórico de Envios (Resend)
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500" onClick={() => refetchLogs()}>
                <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadLogs ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">Nenhum registro de envio recente.</div>
              ) : (
                <div className="divide-y max-h-[420px] overflow-y-auto">
                  {logs.slice(0, 20).map(log => (
                    <div key={log.id} className="p-3 hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 truncate">{log.colaborador_nome || "Geral"}</span>
                          <span className="text-[10px] text-gray-400">
                            {log.data_envio ? format(parseISO(log.data_envio), "dd/MM HH:mm") : "—"}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {log.assunto_enviado || (TIPO_LABELS[log.tipo_comunicado] || log.tipo_comunicado)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={log.status} />
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-indigo-600" onClick={() => setDetalhesLog(log)}>
                          Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── MODAL LATERAL DE CONFIGURAÇÕES DE E-MAIL (SHEET) ─────────────── */}
      <Dialog open={openConfigModal} onOpenChange={setOpenConfigModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              Configurações de E-mail por Tipo de Comunicado
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ajuste assuntos com variáveis customizadas, e-mails em cópia (CC) e perfil de destinatários.
            </DialogDescription>
          </DialogHeader>
          <AbaConfiguracoes />
        </DialogContent>
      </Dialog>

      {/* ── MODAL DE DETALHES DO LOG DE ENVIO ────────────────────────────── */}
      <Dialog open={!!detalhesLog} onOpenChange={v => !v && setDetalhesLog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Detalhes do Registro de Envio</DialogTitle>
          </DialogHeader>
          {detalhesLog && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border">
                <div>
                  <p className="text-gray-400">Colaborador</p>
                  <p className="font-semibold text-gray-800">{detalhesLog.colaborador_nome || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <StatusBadge status={detalhesLog.status} />
                </div>
                <div>
                  <p className="text-gray-400">Data de Envio</p>
                  <p className="text-gray-700">{detalhesLog.data_envio ? format(parseISO(detalhesLog.data_envio), "dd/MM/yyyy HH:mm:ss") : "—"}</p>
                </div>
                <div>
                  <p className="text-gray-400">Tipo Comunicado</p>
                  <p className="text-gray-700">{TIPO_LABELS[detalhesLog.tipo_comunicado] || detalhesLog.tipo_comunicado}</p>
                </div>
              </div>

              {detalhesLog.assunto_enviado && (
                <div>
                  <p className="text-gray-400 mb-1">Assunto do E-mail</p>
                  <p className="bg-gray-50 p-2.5 rounded border text-gray-800 font-medium">{detalhesLog.assunto_enviado}</p>
                </div>
              )}

              {detalhesLog.destinatarios?.length > 0 && (
                <div>
                  <p className="text-gray-400 mb-1">Destinatários ({detalhesLog.destinatarios.length})</p>
                  <div className="bg-gray-50 p-2.5 rounded border max-h-32 overflow-y-auto space-y-1 font-mono text-[11px] text-gray-700">
                    {detalhesLog.destinatarios.map((em, idx) => (
                      <p key={idx}>{em}</p>
                    ))}
                  </div>
                </div>
              )}

              {detalhesLog.detalhe_erro && (
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg text-red-800">
                  <p className="font-bold mb-0.5">Motivo da Falha:</p>
                  <p className="text-[11px] font-mono">{detalhesLog.detalhe_erro}</p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setDetalhesLog(null)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
