/**
 * ListaDemandas — componente compartilhado entre /Comunicados (admin) e /portal-comunicados.
 * Exibe demandas geradas pelo sistema com upload de arte, filtros e alertas.
 * Props:
 *   podeCriarArte: boolean — pode fazer upload
 *   nomeUsuario: string — nome do usuário logado (para criado_por)
 */
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Eye, RefreshCw, Trash2, AlertTriangle, ChevronLeft, ChevronRight, Loader2, Zap } from "lucide-react";
import { format, differenceInDays, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const TIPO_LABELS = {
  aniversario_colaborador: "🎂 Aniversário Colaborador",
  aniversario_conjuge: "💑 Aniversário Cônjuge",
  aniversario_filho_1ano: "🎈 1 Aninho",
  tempo_empresa: "🏆 Tempo de Empresa",
  despedida: "💼 Despedida",
};

const TIPO_COR = {
  aniversario_colaborador: "bg-pink-100 text-pink-800",
  aniversario_conjuge: "bg-red-100 text-red-800",
  aniversario_filho_1ano: "bg-purple-100 text-purple-800",
  tempo_empresa: "bg-yellow-100 text-yellow-800",
  despedida: "bg-gray-100 text-gray-700",
};

function StatusBadge({ status }) {
  if (status === "arte_carregada") return <Badge className="bg-green-100 text-green-800 text-xs">✅ Arte pronta</Badge>;
  if (status === "enviado") return <Badge className="bg-gray-100 text-gray-600 text-xs">📤 Enviado</Badge>;
  if (status === "erro_envio") return <Badge className="bg-red-100 text-red-700 text-xs">❌ Erro envio</Badge>;
  return <Badge className="bg-orange-100 text-orange-700 border border-orange-300 text-xs">⚠️ Sem arte</Badge>;
}

function DiasParaEvento({ dataEvento }) {
  if (!dataEvento) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dt = parseISO(dataEvento);
  const diff = differenceInDays(dt, hoje);
  if (diff < 0) return <span className="text-xs text-gray-400">há {Math.abs(diff)} dia{Math.abs(diff) !== 1 ? "s" : ""}</span>;
  if (diff === 0) return <span className="text-xs font-semibold text-green-600">🎉 Hoje!</span>;
  if (diff <= 3) return <span className="text-xs font-semibold text-red-600">em {diff} dia{diff !== 1 ? "s" : ""}!</span>;
  if (diff <= 7) return <span className="text-xs font-semibold text-orange-600">em {diff} dias</span>;
  return <span className="text-xs text-gray-500">em {diff} dias</span>;
}

// ─── Modal de Observação ────────────────────────────────────────────────────
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
        <Label>Observações</Label>
        <Textarea rows={3} value={obs} onChange={e => setObs(e.target.value)} className="mt-1" placeholder="Anotações sobre esta arte..." />
      </div>
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => mut.mutate({ observacoes: obs })} disabled={mut.isPending}>
          {mut.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

// ─── Item de Demanda ─────────────────────────────────────────────────────────
function ItemDemanda({ demanda, podeCriarArte, nomeUsuario, colaboradores }) {
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

  const deleteMut = useMutation({
    mutationFn: () => base44.entities.Comunicados_Artes.delete(demanda.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] }),
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateMut.mutate({
      imagem_url: file_url,
      status_arte: "arte_carregada",
      criado_por: nomeUsuario || "Portal",
    });
    setUploading(false);
    e.target.value = "";
  };

  const handleRemoverArte = () => {
    if (!confirm("Remover a arte desta demanda?")) return;
    updateMut.mutate({ imagem_url: "", status_arte: "sem_arte" });
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataEvento = demanda.data_evento ? parseISO(demanda.data_evento) : null;
  const diasRestantes = dataEvento ? differenceInDays(dataEvento, hoje) : null;
  const isUrgente = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 7;

  return (
    <div className={`border rounded-lg p-4 ${isUrgente && demanda.status_arte === "sem_arte" ? "border-red-300 bg-red-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {colab?.foto_url
          ? <img src={colab.foto_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5" />
          : <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0 mt-0.5">
              {(demanda.colaborador_nome || "?").charAt(0)}
            </div>
        }

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 text-sm">{demanda.colaborador_nome || "—"}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COR[demanda.tipo_comunicado] || "bg-gray-100 text-gray-700"}`}>
              {TIPO_LABELS[demanda.tipo_comunicado] || demanda.tipo_comunicado}
            </span>
            {demanda.anos_empresa && (
              <span className="text-xs text-yellow-700 font-medium">{demanda.anos_empresa} anos</span>
            )}
            {demanda.filho_nome && (
              <span className="text-xs text-purple-700">({demanda.filho_nome})</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-1">{demanda.descricao_evento || "—"}</p>
          <div className="flex items-center gap-3 flex-wrap">
            {demanda.data_evento && (
              <span className="text-xs text-gray-500">
                📅 {format(parseISO(demanda.data_evento), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            )}
            <DiasParaEvento dataEvento={demanda.data_evento} />
            <StatusBadge status={demanda.status_arte} />
          </div>
          {demanda.observacoes && (
            <p className="text-xs text-gray-400 mt-1 italic">"{demanda.observacoes}"</p>
          )}
        </div>

        {/* Arte e Ações */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Thumbnail */}
          {demanda.imagem_url && (
            <a href={demanda.imagem_url} target="_blank" rel="noreferrer">
              <img src={demanda.imagem_url} alt="arte" className="w-12 h-12 object-cover rounded border" />
            </a>
          )}

          {/* Ações de upload */}
          {podeCriarArte && demanda.status_arte !== "enviado" && (
            <div className="flex gap-1">
              {demanda.status_arte === "sem_arte" ? (
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50 cursor-pointer ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}>
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {uploading ? "..." : "Carregar"}
                  </span>
                </label>
              ) : (
                <>
                  <label className="cursor-pointer" title="Substituir arte">
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer">
                      <RefreshCw className="w-3 h-3" />
                    </span>
                  </label>
                  <button onClick={handleRemoverArte} title="Remover arte" className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
              <button onClick={() => setShowObs(true)} title="Observações" className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-100">
                💬
              </button>
            </div>
          )}

          {/* Ver imagem (somente leitura) */}
          {!podeCriarArte && demanda.imagem_url && (
            <a href={demanda.imagem_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-100">
              <Eye className="w-3 h-3" />Ver
            </a>
          )}
        </div>
      </div>

      <Dialog open={showObs} onOpenChange={v => !v && setShowObs(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Observações</DialogTitle></DialogHeader>
          {showObs && <ModalObservacoes demanda={demanda} onClose={() => setShowObs(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function ListaDemandas({ podeCriarArte = false, nomeUsuario = "" }) {
  const hoje = new Date();
  const [mesRef, setMesRef] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [gerandoMsg, setGerandoMsg] = useState(null);
  const [gerando, setGerando] = useState(false);
  const queryClient = useQueryClient();

  const mesNum = mesRef.getMonth() + 1;
  const anoNum = mesRef.getFullYear();
  const labelMes = format(mesRef, "MMMM yyyy", { locale: ptBR });

  const { data: demandas = [], isLoading } = useQuery({
    queryKey: ["comunicados_artes"],
    queryFn: () => base44.entities.Comunicados_Artes.list(),
    staleTime: 30_000,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: () => base44.entities.Colaboradores.list(),
    staleTime: 60_000,
  });

  // Filtrar demandas do mês selecionado
  const demandasDoMes = useMemo(() => {
    return demandas.filter(d => {
      if (!d.data_evento) return false;
      const dt = parseISO(d.data_evento);
      return dt.getMonth() + 1 === mesNum && dt.getFullYear() === anoNum;
    });
  }, [demandas, mesNum, anoNum]);

  // Alerta: demandas sem arte nos próximos 7 dias
  const urgentes = useMemo(() => {
    const limite = new Date();
    limite.setHours(0, 0, 0, 0);
    const fim = new Date(limite);
    fim.setDate(fim.getDate() + 7);
    return demandas.filter(d => {
      if (d.status_arte !== "sem_arte" || !d.data_evento) return false;
      const dt = parseISO(d.data_evento);
      return dt >= limite && dt <= fim;
    });
  }, [demandas]);

  const filtradas = useMemo(() => {
    let r = demandasDoMes;
    if (filtroStatus !== "todos") r = r.filter(d => d.status_arte === filtroStatus);
    if (filtroTipo !== "todos") r = r.filter(d => d.tipo_comunicado === filtroTipo);
    return r.sort((a, b) => (a.data_evento || "").localeCompare(b.data_evento || ""));
  }, [demandasDoMes, filtroStatus, filtroTipo]);

  const handleGerarDemandas = async () => {
    setGerando(true);
    setGerandoMsg(null);
    // Gerar para o mês visualizado (se é o mês atual, usa mes_atual=1; senão gera próximo mês padrão)
    const ehMesAtual = mesRef.getMonth() === hoje.getMonth() && mesRef.getFullYear() === hoje.getFullYear();
    const res = await base44.functions.invoke("gerarDemandasComunicados", ehMesAtual ? { mes_atual: true } : {});
    queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] });
    setGerandoMsg(res?.data?.msg || "Demandas geradas!");
    setGerando(false);
    setTimeout(() => setGerandoMsg(null), 5000);
  };

  const statsCounts = useMemo(() => ({
    total: demandasDoMes.length,
    sem_arte: demandasDoMes.filter(d => d.status_arte === "sem_arte").length,
    arte_carregada: demandasDoMes.filter(d => d.status_arte === "arte_carregada").length,
    enviado: demandasDoMes.filter(d => d.status_arte === "enviado").length,
  }), [demandasDoMes]);

  return (
    <div className="space-y-4">
      {/* Banner alerta urgente */}
      {urgentes.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-300 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              ⚠️ {urgentes.length} demanda{urgentes.length !== 1 ? "s" : ""} nos próximos 7 dias ainda sem arte.
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Carregue as artes para garantir o envio automático:{" "}
              {urgentes.map(d => d.colaborador_nome).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Navegação de mês + gerar demandas */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setMesRef(subMonths(mesRef, 1))}
            className="p-1.5 rounded border border-gray-200 hover:bg-gray-100">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="font-semibold text-gray-800 capitalize min-w-[140px] text-center">{labelMes}</span>
          <button onClick={() => setMesRef(addMonths(mesRef, 1))}
            className="p-1.5 rounded border border-gray-200 hover:bg-gray-100">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {gerandoMsg && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
              ✅ {gerandoMsg}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGerarDemandas}
            disabled={gerando}
            className="text-xs gap-1"
          >
            {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {gerando ? "Gerando..." : "Gerar Demandas do Mês"}
          </Button>
        </div>
      </div>

      {/* Stats do mês */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", val: statsCounts.total, cor: "text-indigo-600" },
          { label: "Sem arte", val: statsCounts.sem_arte, cor: "text-orange-600" },
          { label: "Arte pronta", val: statsCounts.arte_carregada, cor: "text-green-600" },
          { label: "Enviado", val: statsCounts.enviado, cor: "text-gray-500" },
        ].map(s => (
          <div key={s.label} className="bg-white border rounded-lg p-3 text-center">
            <p className={`text-xl font-bold ${s.cor}`}>{s.val}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="sem_arte">Sem arte</SelectItem>
            <SelectItem value="arte_carregada">Arte pronta</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="erro_envio">Erro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="h-8 text-xs w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="font-medium">Nenhuma demanda encontrada para {labelMes}.</p>
          <p className="text-xs mt-1">Clique em "Gerar Demandas do Mês" para criar as demandas automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(d => (
            <ItemDemanda
              key={d.id}
              demanda={d}
              podeCriarArte={podeCriarArte}
              nomeUsuario={nomeUsuario}
              colaboradores={colaboradores}
            />
          ))}
        </div>
      )}
    </div>
  );
}