import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FolderKanban,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Paperclip,
  X,
  FileCheck,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Loader2,
  Pencil,
  Trash2,
  Search,
  XCircle,
  Ban,
  FileText,
  Upload,
  PauseCircle,
  Printer,
  ClipboardCheck,
  BookOpen,
  UserCheck,
  BadgeCheck
} from "lucide-react";
import { format, isBefore, startOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarDataSemFuso } from "@/utils/date";

const PROGRAMAS_DISPONIVEIS = [
  "Plano Estratégico de TI 2026"
];

const STATUS_PROJETO = [
  "Em Planejamento",
  "Aguardando Aprovação",
  "Em Execução",
  "Congelado",
  "Em Homologação",
  "Concluído",
  "Cancelado"
];

const PRIORIDADES = [
  "Baixa",
  "Média",
  "Alta",
  "Estratégica"
];

const statusColors = {
  "Em Planejamento": "bg-slate-100 text-slate-800 border-slate-300",
  "Aguardando Aprovação": "bg-amber-100 text-amber-900 border-amber-300",
  "Em Execução": "bg-blue-100 text-blue-900 border-blue-300",
  "Congelado": "bg-slate-200 text-slate-700 border-slate-300",
  "Em Homologação": "bg-purple-100 text-purple-900 border-purple-300",
  "Concluído": "bg-emerald-100 text-emerald-900 border-emerald-300",
  "Cancelado": "bg-rose-100 text-rose-800 border-rose-300",
};

const prioridadeColors = {
  "Baixa": "bg-gray-100 text-gray-700",
  "Média": "bg-sky-100 text-sky-800",
  "Alta": "bg-orange-100 text-orange-800",
  "Estratégica": "bg-indigo-100 text-indigo-800 font-semibold",
};

export default function ProjetosInternos() {
  const queryClient = useQueryClient();
  const [selectedPrograma, setSelectedPrograma] = useState("Plano Estratégico de TI 2026");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState(null);
  const [activeTab, setActiveTab] = useState("geral");

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    programa_nome: "Plano Estratégico de TI 2026",
    status: "Em Planejamento",
    prioridade: "Média",
    responsavel_id: "",
    solicitante_id: "",
    participantes_ids: [],
    custo_estimado: 0,
    custo_real: 0,
    data_inicio_prevista: "",
    data_fim_prevista: "",
    marcos: [],
  });

  // Aux Busca Participante
  const [searchParticipante, setSearchParticipante] = useState("");

  // Aux Marcos
  const [novoMarco, setNovoMarco] = useState({ titulo: "", data_prevista: "", responsavel: "" });

  // Aux Aprovação Diretoria
  const [novaAprovacao, setNovaAprovacao] = useState({ aprovado: true, aprovador_nome: "", observacoes: "" });

  // Aux Chat
  const [novaMsgChat, setNovaMsgChat] = useState("");
  const [anexoChat, setAnexoChat] = useState(null);
  const [uploadingChatAnexo, setUploadingChatAnexo] = useState(false);

  // Status Filter State
  const [statusFilter, setStatusFilter] = useState("all");

  // Aux Documentos Gerais
  const [uploadingDocGeral, setUploadingDocGeral] = useState(false);

  // Aux Modais de Ciclo de Vida (Concluir / Cancelar)
  const [confirmConcluirModal, setConfirmConcluirModal] = useState(false);
  const [confirmCancelarModal, setConfirmCancelarModal] = useState(false);
  const [dataConclusaoInput, setDataConclusaoInput] = useState("");
  const [parecerInput, setParecerInput] = useState("");
  const [custoRealFinalInput, setCustoRealFinalInput] = useState("");
  const [concluidoPorInput, setConcluidoPorInput] = useState("");

  // Aux Documentos
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Queries
  const { data: projetos = [], isLoading: loadingProjetos } = useQuery({
    queryKey: ['projetos_internos_list'],
    queryFn: () => base44.entities.ProjetosInternos.list('-created_at'),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores_list_proj'],
    queryFn: () => base44.entities.Colaboradores.list('nome_completo'),
  });

  const { data: usuariosSistema = [] } = useQuery({
    queryKey: ['usuarios_sistema_proj'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('listarUsuarios', {});
        const list = res.data?.usuarios || res.data || [];
        if (list && list.length > 0) return list;
      } catch (e) {
        console.warn("Fallback para User.list()", e);
      }
      return await base44.entities.User.list();
    }
  });

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['projetos_chat', selectedProjeto?.id],
    queryFn: () => base44.entities.ProjetosChat.filter({ projeto_id: selectedProjeto?.id }, 'data_hora'),
    enabled: !!selectedProjeto?.id,
  });

  // Realtime subscription para o chat
  useEffect(() => {
    if (!selectedProjeto?.id) return;
    const unsubscribe = base44.entities.ProjetosChat.subscribe((newRecord) => {
      if (newRecord?.projeto_id === selectedProjeto.id) {
        queryClient.invalidateQueries({ queryKey: ['projetos_chat', selectedProjeto.id] });
      }
    });
    return () => unsubscribe();
  }, [selectedProjeto?.id, queryClient]);

  // Mutations
  const createOrUpdateMutation = useMutation({
    mutationFn: async (data) => {
      const respUser = usuariosSistema.find(u => String(u.id) === String(data.responsavel_id));
      const solColab = colaboradores.find(c => String(c.id) === String(data.solicitante_id));

      const payload = {
        ...data,
        responsavel_nome: respUser ? (respUser.nome_exibicao || respUser.full_name || respUser.email) : "",
        solicitante_nome: solColab ? solColab.nome_completo : "",
        custo_estimado: Number(data.custo_estimado) || 0,
        custo_real: Number(data.custo_real) || 0,
        data_inicio_prevista: (data.data_inicio_prevista && String(data.data_inicio_prevista).trim() !== "") ? String(data.data_inicio_prevista).trim() : null,
        data_fim_prevista: (data.data_fim_prevista && String(data.data_fim_prevista).trim() !== "") ? String(data.data_fim_prevista).trim() : null,
        data_conclusao: (data.data_conclusao && String(data.data_conclusao).trim() !== "") ? String(data.data_conclusao).trim() : null,
      };

      if (!editingId) {
        // Gerar código único
        const count = projetos.length + 1;
        payload.codigo_projeto = `PRJ-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
        return await base44.entities.ProjetosInternos.create(payload);
      } else {
        return await base44.entities.ProjetosInternos.update(editingId, payload);
      }
    },
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: ['projetos_internos_list'] });
      setModalOpen(false);
      resetForm();
      if (selectedProjeto && selectedProjeto.id === updatedItem.id) {
        setSelectedProjeto(updatedItem);
      }
    },
  });

  const deleteProjetoMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjetosInternos.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projetos_internos_list'] });
      setDetailsModalOpen(false);
      setSelectedProjeto(null);
    }
  });

  const enviarChatMutation = useMutation({
    mutationFn: async (msg) => {
      return await base44.entities.ProjetosChat.create({
        projeto_id: selectedProjeto.id,
        remetente_id: "admin_ti",
        remetente_nome: "Equipe de TI (Admin)",
        remetente_email: "ti@interlub.com.br",
        tipo_remetente: "admin_ti",
        mensagem: msg.texto || "",
        anexo_url: msg.anexo_url || null,
        anexo_nome: msg.anexo_nome || null,
        data_hora: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projetos_chat', selectedProjeto?.id] });
      setNovaMsgChat("");
      setAnexoChat(null);
    }
  });

  const salvarAprovacaoMutation = useMutation({
    mutationFn: async (aprovObj) => {
      const historicoAtual = Array.isArray(selectedProjeto.aprovacao_diretoria)
        ? selectedProjeto.aprovacao_diretoria
        : [];
      
      const novoHistorico = [
        ...historicoAtual,
        {
          aprovado: aprovObj.aprovado,
          aprovador_nome: aprovObj.aprovador_nome || "Diretoria / Gestão",
          observacoes: aprovObj.observacoes || "",
          data: new Date().toISOString()
        }
      ];

      const updated = await base44.entities.ProjetosInternos.update(selectedProjeto.id, {
        aprovacao_diretoria: novoHistorico
      });
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['projetos_internos_list'] });
      setSelectedProjeto(updated);
      setNovaAprovacao({ aprovado: true, aprovador_nome: "", observacoes: "" });
    }
  });

  const resetForm = () => {
    setEditingId(null);
    setSearchParticipante("");
    setFormData({
      titulo: "",
      descricao: "",
      programa_nome: "Plano Estratégico de TI 2026",
      status: "Em Planejamento",
      prioridade: "Média",
      responsavel_id: "",
      solicitante_id: "",
      participantes_ids: [],
      custo_estimado: 0,
      custo_real: 0,
      data_inicio_prevista: "",
      data_fim_prevista: "",
      data_conclusao: "",
      marcos: [],
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (proj) => {
    setEditingId(proj.id);
    setFormData({
      titulo: proj.titulo || "",
      descricao: proj.descricao || "",
      programa_nome: proj.programa_nome || "Plano Estratégico de TI 2026",
      status: proj.status || "Em Planejamento",
      prioridade: proj.prioridade || "Média",
      responsavel_id: proj.responsavel_id || "",
      solicitante_id: proj.solicitante_id || "",
      participantes_ids: proj.participantes_ids || [],
      custo_estimado: proj.custo_estimado || 0,
      custo_real: proj.custo_real || 0,
      data_inicio_prevista: proj.data_inicio_prevista || "",
      data_fim_prevista: proj.data_fim_prevista || "",
      data_conclusao: proj.data_conclusao || "",
      marcos: proj.marcos || [],
    });
    setModalOpen(true);
  };

  // Cálculos do Programa
  const projetosDoPrograma = projetos.filter(p => p.programa_nome === selectedPrograma);
  const totalCustoEstimado = projetosDoPrograma.reduce((acc, p) => acc + (Number(p.custo_estimado) || 0), 0);
  const totalCustoReal = projetosDoPrograma.reduce((acc, p) => acc + (Number(p.custo_real) || 0), 0);
  const desvioOrcamentario = totalCustoReal - totalCustoEstimado;

  // Filtros de Status
  const statusCounts = {
    all: projetosDoPrograma.length,
    execucao: projetosDoPrograma.filter(p => p.status === "Em Execução").length,
    planejamento: projetosDoPrograma.filter(p => p.status === "Em Planejamento").length,
    aprovacao: projetosDoPrograma.filter(p => p.status === "Aguardando Aprovação").length,
    homologacao: projetosDoPrograma.filter(p => p.status === "Em Homologação").length,
    congelado: projetosDoPrograma.filter(p => p.status === "Congelado").length,
    concluido: projetosDoPrograma.filter(p => p.status === "Concluído").length,
    cancelado: projetosDoPrograma.filter(p => p.status === "Cancelado").length,
  };

  const projetosExibidos = projetosDoPrograma.filter(p => {
    if (statusFilter === "all") return true;
    if (statusFilter === "execucao") return p.status === "Em Execução";
    if (statusFilter === "planejamento") return p.status === "Em Planejamento";
    if (statusFilter === "aprovacao") return p.status === "Aguardando Aprovação";
    if (statusFilter === "homologacao") return p.status === "Em Homologação";
    if (statusFilter === "congelado") return p.status === "Congelado";
    if (statusFilter === "concluido") return p.status === "Concluído";
    if (statusFilter === "cancelado") return p.status === "Cancelado";
    return true;
  });

  // % de marcos concluídos no programa
  let totalMarcosPrograma = 0;
  let marcosConcluidosPrograma = 0;
  let temMarcoAtrasadoPrograma = false;

  const hoje = startOfDay(new Date());

  projetosDoPrograma.forEach(p => {
    const listMarcos = Array.isArray(p.marcos) ? p.marcos : [];
    totalMarcosPrograma += listMarcos.length;
    listMarcos.forEach(m => {
      if (m.status === "Concluído") marcosConcluidosPrograma++;
      if (m.status === "Pendente" && m.data_prevista) {
        const d = startOfDay(parseISO(m.data_prevista));
        if (isBefore(d, hoje)) temMarcoAtrasadoPrograma = true;
      }
    });
  });

  const pctMarcosPrograma = totalMarcosPrograma > 0
    ? Math.round((marcosConcluidosPrograma / totalMarcosPrograma) * 100)
    : 0;

  // Verificador de desvio e atraso por projeto individual
  const getProjetoStats = (proj) => {
    const listMarcos = Array.isArray(proj.marcos) ? proj.marcos : [];
    const totalM = listMarcos.length;
    const concM = listMarcos.filter(m => m.status === "Concluído").length;
    const pctM = totalM > 0 ? Math.round((concM / totalM) * 100) : 0;

    let possuiAtraso = false;
    listMarcos.forEach(m => {
      if (m.status === "Pendente" && m.data_prevista) {
        const d = startOfDay(parseISO(m.data_prevista));
        if (isBefore(d, hoje)) possuiAtraso = true;
      }
    });

    const cEst = Number(proj.custo_estimado) || 0;
    const cReal = Number(proj.custo_real) || 0;
    const desvio = cReal - cEst;

    return { totalM, concM, pctM, possuiAtraso, cEst, cReal, desvio };
  };

  if (loadingProjetos) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                Projetos Internos & Iniciativas de TI
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Acompanhamento executivo de investimentos, marcos e programas estruturais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedPrograma} onValueChange={setSelectedPrograma}>
              <SelectTrigger className="w-64 bg-white border-slate-200 font-semibold text-slate-800 shadow-sm">
                <Layers className="w-4 h-4 mr-2 text-indigo-600" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROGRAMAS_DISPONIVEIS.map(prog => (
                  <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-200 gap-2">
              <Plus className="w-4 h-4" />
              Novo Projeto Interno
            </Button>
          </div>
        </div>

        {/* Visão Executiva do Programa (Dashboard) */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Programa Guarda-Chuva
                </div>
                <h2 className="text-2xl font-bold">{selectedPrograma}</h2>
                <p className="text-indigo-200 text-sm mt-1">
                  {projetosDoPrograma.length} {projetosDoPrograma.length === 1 ? 'iniciativa cadastrada' : 'iniciativas cadastradas'} sob este programa
                </p>
              </div>

              {temMarcoAtrasadoPrograma && (
                <Badge variant="destructive" className="bg-rose-500 text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-4 h-4" /> Alertas de Atraso no Programa
                </Badge>
              )}
            </div>
          </div>

          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white">
            {/* Projetos Ativos */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase">Total de Projetos</span>
                <FolderKanban className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-slate-800">{projetosDoPrograma.length}</p>
              <p className="text-xs text-slate-500 mt-1">Iniciativas mapeadas</p>
            </div>

            {/* Custo Estimado vs Real */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase">Custo Orçado (Estimado)</span>
                <DollarSign className="w-4 h-4 text-sky-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                R$ {totalCustoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">CAPEX / OPEX Previsto</p>
            </div>

            {/* Custo Real Efetivado */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase">Custo Real (Executado)</span>
                {desvioOrcamentario > 0 ? (
                  <TrendingUp className="w-4 h-4 text-rose-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <p className={`text-2xl font-bold ${desvioOrcamentario > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                R$ {totalCustoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Desvio: <strong className={desvioOrcamentario > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {desvioOrcamentario > 0 ? `+R$ ${desvioOrcamentario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `R$ ${desvioOrcamentario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </strong>
              </p>
            </div>

            {/* Progresso de Marcos */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase">Progresso de Marcos</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-emerald-700">{pctMarcosPrograma}%</p>
              <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${pctMarcosPrograma}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1">{marcosConcluidosPrograma} de {totalMarcosPrograma} marcos entregues</p>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Projetos do Programa com Abas de Status */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Iniciativas ({projetosExibidos.length} de {projetosDoPrograma.length})
            </h3>

            {/* Abas / Filtro por Status */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {[
                { id: "all", label: "Todos", count: statusCounts.all },
                { id: "execucao", label: "Em Execução", count: statusCounts.execucao },
                { id: "planejamento", label: "Em Planejamento", count: statusCounts.planejamento },
                { id: "aprovacao", label: "Aguard. Aprovação", count: statusCounts.aprovacao },
                { id: "homologacao", label: "Em Homologação", count: statusCounts.homologacao },
                { id: "congelado", label: "Congelados", count: statusCounts.congelado },
                { id: "concluido", label: "Concluídos", count: statusCounts.concluido },
                { id: "cancelado", label: "Cancelados", count: statusCounts.cancelado },
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    statusFilter === st.id
                      ? "bg-indigo-600 text-white shadow-sm border-transparent"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span>{st.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === st.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {st.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {projetosExibidos.length === 0 ? (
            <Card className="border-dashed border-slate-300 py-12 text-center text-slate-400">
              <FolderKanban className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-600">Nenhum projeto interno encontrado nesta categoria.</p>
              <p className="text-xs text-slate-400 mt-1">Alterne a aba de status ou clique em "Novo Projeto Interno" para adicionar.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projetosExibidos.map(proj => {
                const stats = getProjetoStats(proj);
                const listParticipantes = Array.isArray(proj.participantes_ids) ? proj.participantes_ids : [];
                const temAprovacaoDiretoria = Array.isArray(proj.aprovacao_diretoria) && proj.aprovacao_diretoria.some(a => a.aprovado);

                return (
                  <Card
                    key={proj.id}
                    className="border-slate-200 bg-white hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                    onClick={() => {
                      setSelectedProjeto(proj);
                      setActiveTab("geral");
                      setDetailsModalOpen(true);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {proj.codigo_projeto}
                          </span>
                          <Badge className={`${statusColors[proj.status] || 'bg-slate-100'} border text-xs`}>
                            {proj.status}
                          </Badge>
                          <Badge variant="outline" className={`${prioridadeColors[proj.prioridade]}`}>
                            {proj.prioridade}
                          </Badge>
                        </div>

                        {stats.possuiAtraso && (
                          <Badge variant="destructive" className="bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Marco Atrasado
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {proj.titulo}
                      </CardTitle>
                      {proj.descricao && (
                        <p className="text-slate-500 text-xs line-clamp-2 mt-1">{proj.descricao}</p>
                      )}

                      {/* TAREFA 1: Exibir data/hora de abertura no card */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Aberto em {proj.created_at ? format(parseISO(proj.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—"}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      {/* Marcos Progress */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1 font-medium">
                          <span className="text-slate-600">Marcos Concluídos</span>
                          <span className="text-indigo-700 font-bold">{stats.concM}/{stats.totalM} ({stats.pctM}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full transition-all" style={{ width: `${stats.pctM}%` }} />
                        </div>
                      </div>

                      {/* Custos */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg text-xs">
                        <div>
                          <p className="text-slate-500 font-medium">Custo Estimado</p>
                          <p className="font-bold text-slate-800 mt-0.5">R$ {stats.cEst.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-medium">Custo Real</p>
                          <p className={`font-bold mt-0.5 ${stats.desvio > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            R$ {stats.cReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Envolvidos */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{listParticipantes.length + (proj.responsavel_nome ? 1 : 0)} Envolvidos</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">Resp: {proj.responsavel_nome || '—'}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Projeto Interno" : "Novo Projeto Interno de TI"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            createOrUpdateMutation.mutate(formData);
          }} className="space-y-4 pt-2 text-sm">

            <div>
              <Label>Título do Projeto / Iniciativa *</Label>
              <Input
                required
                placeholder="Ex: Transição DEA para Notebooks"
                value={formData.titulo}
                onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))}
              />
            </div>

            <div>
              <Label>Descrição / Objetivos *</Label>
              <Textarea
                required
                rows={3}
                placeholder="Descreva a finalidade, impacto esperado e escopo técnico..."
                value={formData.descricao}
                onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Programa Guarda-Chuva *</Label>
                <Select value={formData.programa_nome} onValueChange={v => setFormData(p => ({ ...p, programa_nome: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROGRAMAS_DISPONIVEIS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade *</Label>
                <Select value={formData.prioridade} onValueChange={v => setFormData(p => ({ ...p, prioridade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status Atual *</Label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_PROJETO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Responsável Técnico TI (Usuário do Sistema) *</Label>
                <Select value={formData.responsavel_id} onValueChange={v => setFormData(p => ({ ...p, responsavel_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione um usuário do sistema" /></SelectTrigger>
                  <SelectContent>
                    {usuariosSistema.map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.nome_exibicao || u.full_name || u.email} ({u.role || 'Usuário'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Solicitante / Demandante</Label>
              <Select value={formData.solicitante_id} onValueChange={v => setFormData(p => ({ ...p, solicitante_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a área/pessoa solicitante" /></SelectTrigger>
                <SelectContent>
                  {colaboradores.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome_completo} ({c.area})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Participantes Envolvidos */}
            <div>
              <Label className="flex items-center justify-between mb-1">
                <span>Participantes Envolvidos (Colaboradores Reais)</span>
                <span className="text-xs text-slate-500 font-normal">Estes colaboradores enxergarão o projeto no Portal</span>
              </Label>
              
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Filtrar participante por nome ou área..."
                  className="pl-8 text-xs h-8 bg-white border-slate-300"
                  value={searchParticipante}
                  onChange={e => setSearchParticipante(e.target.value)}
                />
              </div>

              <div className="border rounded-lg p-3 max-h-36 overflow-y-auto space-y-1.5 bg-slate-50">
                {colaboradores
                  .filter(colab => 
                    !searchParticipante || 
                    (colab.nome_completo && colab.nome_completo.toLowerCase().includes(searchParticipante.toLowerCase())) ||
                    (colab.area && colab.area.toLowerCase().includes(searchParticipante.toLowerCase()))
                  )
                  .map(colab => {
                    const idStr = String(colab.id);
                    const isChecked = (formData.participantes_ids || []).includes(idStr);
                    return (
                      <label key={colab.id} className="flex items-center gap-2 text-xs hover:bg-slate-100 p-1 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(p => ({ ...p, participantes_ids: [...(p.participantes_ids || []), idStr] }));
                            } else {
                              setFormData(p => ({ ...p, participantes_ids: (p.participantes_ids || []).filter(i => i !== idStr) }));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-800">{colab.nome_completo}</span>
                        <span className="text-slate-400">({colab.area})</span>
                      </label>
                    );
                  })}
                {colaboradores.filter(colab => !searchParticipante || (colab.nome_completo && colab.nome_completo.toLowerCase().includes(searchParticipante.toLowerCase())) || (colab.area && colab.area.toLowerCase().includes(searchParticipante.toLowerCase()))).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">Nenhum colaborador encontrado com este nome.</p>
                )}
              </div>
            </div>

            {/* Custos CAPEX / OPEX */}
            <div className="grid grid-cols-2 gap-3 bg-slate-100/70 p-3 rounded-lg border border-slate-200">
              <div>
                <Label>Custo Estimado / Orçado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.custo_estimado}
                  onChange={e => setFormData(p => ({ ...p, custo_estimado: e.target.value }))}
                />
              </div>
              <div>
                <Label>Custo Real Executado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.custo_real}
                  onChange={e => setFormData(p => ({ ...p, custo_real: e.target.value }))}
                />
              </div>
            </div>

            {/* Prazos */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de Início Prevista <span className="text-slate-400 font-normal">(Opcional)</span></Label>
                <Input
                  type="date"
                  value={formData.data_inicio_prevista}
                  onChange={e => setFormData(p => ({ ...p, data_inicio_prevista: e.target.value }))}
                />
              </div>
              <div>
                <Label>Data de Conclusão Prevista <span className="text-slate-400 font-normal">(Opcional)</span></Label>
                <Input
                  type="date"
                  value={formData.data_fim_prevista}
                  onChange={e => setFormData(p => ({ ...p, data_fim_prevista: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={createOrUpdateMutation.isPending}>
                {createOrUpdateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? "Salvar Alterações" : "Criar Projeto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE DETALHES COMPLETO (Geral, Marcos, Chat, Aprovações) */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProjeto && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between pr-6 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {selectedProjeto.codigo_projeto}
                    </span>
                    <Badge className={`${statusColors[selectedProjeto.status]} border`}>
                      {selectedProjeto.status}
                    </Badge>
                  </div>

                  {/* Ações de Ciclo de Vida: Concluir / Cancelar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedProjeto.status !== "Concluído" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={() => {
                          setDataConclusaoInput(selectedProjeto.data_conclusao || new Date().toISOString().split('T')[0]);
                          setConfirmConcluirModal(true);
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Concluir Projeto
                      </Button>
                    )}

                    {selectedProjeto.status !== "Cancelado" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                        onClick={() => setConfirmCancelarModal(true)}
                      >
                        <Ban className="w-3.5 h-3.5" /> Cancelar Projeto
                      </Button>
                    )}

                    {selectedProjeto.status !== "Congelado" && selectedProjeto.status !== "Concluído" && selectedProjeto.status !== "Cancelado" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-slate-700 border-slate-300 hover:bg-slate-100 gap-1"
                        onClick={async () => {
                          if (confirm(`Deseja congelar o projeto "${selectedProjeto.titulo}"?`)) {
                            const updated = await base44.entities.ProjetosInternos.update(selectedProjeto.id, {
                              status: "Congelado"
                            });
                            setSelectedProjeto(updated);
                            queryClient.invalidateQueries({ queryKey: ['projetos_internos_list'] });
                          }
                        }}
                      >
                        <PauseCircle className="w-3.5 h-3.5 text-slate-500" /> Congelar Projeto
                      </Button>
                    )}

                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(selectedProjeto)} className="gap-1">
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                      if (confirm("Tem certeza que deseja excluir este projeto?")) {
                        deleteProjetoMutation.mutate(selectedProjeto.id);
                      }
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900 mt-2">
                  {selectedProjeto.titulo}
                </DialogTitle>
                <p className="text-xs text-slate-500">Programa: {selectedProjeto.programa_nome}</p>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="geral" className="text-xs">Visão Geral & Custos</TabsTrigger>
                  <TabsTrigger value="marcos" className="text-xs">Marcos & Etapas ({selectedProjeto.marcos?.length || 0})</TabsTrigger>
                  <TabsTrigger value="chat" className="text-xs">Ideias & Chat ({chatMessages.length})</TabsTrigger>
                  <TabsTrigger value="aprovacoes" className="text-xs">
                    Documentos ({selectedProjeto.documentos_projeto?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="encerramento" className="text-xs flex items-center gap-1">
                    {selectedProjeto.parecer_conclusao ? (
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5" />
                    )}
                    Encerramento
                  </TabsTrigger>
                </TabsList>

                {/* ABA 1: GERAL & CUSTOS */}
                <TabsContent value="geral" className="space-y-4 pt-4 text-sm">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-1">Descrição e Justificativa</h4>
                    <p className="text-slate-600 whitespace-pre-wrap">{selectedProjeto.descricao || "Sem descrição cadastrada."}</p>
                  </div>

                  {/* TAREFA 1: Data de Abertura created_at em destaque */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                      <span className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Data de Abertura
                      </span>
                      <p className="font-bold text-indigo-950 text-xs mt-0.5">
                        {selectedProjeto.created_at ? format(parseISO(selectedProjeto.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—"}
                      </p>
                    </div>
                    <div className="p-3 bg-white border rounded-lg">
                      <span className="text-xs text-slate-400">Responsável TI</span>
                      <p className="font-semibold text-slate-800">{selectedProjeto.responsavel_nome || "—"}</p>
                    </div>
                    <div className="p-3 bg-white border rounded-lg">
                      <span className="text-xs text-slate-400">Solicitante</span>
                      <p className="font-semibold text-slate-800">{selectedProjeto.solicitante_nome || "—"}</p>
                    </div>
                    <div className="p-3 bg-white border rounded-lg">
                      <span className="text-xs text-slate-400">Início Previsto</span>
                      <p className="font-semibold text-slate-800">{formatarDataSemFuso(selectedProjeto.data_inicio_prevista)}</p>
                    </div>
                    <div className="p-3 bg-white border rounded-lg">
                      <span className="text-xs text-slate-400">Fim / Conclusão</span>
                      <p className="font-semibold text-slate-800">
                        {selectedProjeto.data_conclusao ? `Concluído em ${formatarDataSemFuso(selectedProjeto.data_conclusao)}` : formatarDataSemFuso(selectedProjeto.data_fim_prevista)}
                      </p>
                    </div>
                  </div>

                  {/* Detalhamento de Custos */}
                  <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                    <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-indigo-600" /> Balanço Financeiro de Aquisições
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs text-slate-500 font-medium">Orçado (Estimado)</span>
                        <p className="text-lg font-bold text-slate-800">
                          R$ {(Number(selectedProjeto.custo_estimado) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 font-medium">Executado (Real)</span>
                        <p className="text-lg font-bold text-slate-900">
                          R$ {(Number(selectedProjeto.custo_real) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 font-medium">Desvio Orçamentário</span>
                        {(() => {
                          const desv = (Number(selectedProjeto.custo_real) || 0) - (Number(selectedProjeto.custo_estimado) || 0);
                          return (
                            <p className={`text-lg font-bold ${desv > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {desv > 0 ? `+R$ ${desv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `R$ ${desv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Participantes */}
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Colaboradores Participantes ({selectedProjeto.participantes_ids?.length || 0})</h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedProjeto.participantes_ids || []).map(id => {
                        const colab = colaboradores.find(c => String(c.id) === String(id));
                        return (
                          <Badge key={id} variant="secondary" className="bg-slate-100 text-slate-800 border px-3 py-1">
                            <Users className="w-3 h-3 mr-1 text-slate-500" />
                            {colab ? `${colab.nome_completo} (${colab.area})` : `ID ${id}`}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                {/* ABA 2: MARCOS & ETAPAS */}
                <TabsContent value="marcos" className="space-y-4 pt-4 text-sm">
                  {/* Adicionar Novo Marco */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                    <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Adicionar Marco / Entregável</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input
                        placeholder="Título do marco (ex: Licenças Compradas)"
                        value={novoMarco.titulo}
                        onChange={e => setNovoMarco(p => ({ ...p, titulo: e.target.value }))}
                      />
                      <Input
                        type="date"
                        value={novoMarco.data_prevista}
                        onChange={e => setNovoMarco(p => ({ ...p, data_prevista: e.target.value }))}
                      />
                      <Button
                        type="button"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={async () => {
                          if (!novoMarco.titulo.trim()) return;
                          const list = Array.isArray(selectedProjeto.marcos) ? selectedProjeto.marcos : [];
                          const item = {
                            id: Date.now().toString(),
                            titulo: novoMarco.titulo,
                            data_prevista: novoMarco.data_prevista,
                            status: "Pendente"
                          };
                          const updatedMarcos = [...list, item];
                          const updated = await base44.entities.ProjetosInternos.update(selectedProjeto.id, { marcos: updatedMarcos });
                          queryClient.invalidateQueries({ queryKey: ['projetos_internos_list'] });
                          setSelectedProjeto(updated);
                          setNovoMarco({ titulo: "", data_prevista: "", responsavel: "" });
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Adicionar Marco
                      </Button>
                    </div>
                  </div>

                  {/* Lista de Marcos */}
                  <div className="space-y-2">
                    {(selectedProjeto.marcos || []).length === 0 ? (
                      <p className="text-center py-6 text-slate-400 text-xs">Nenhum marco cadastrado ainda.</p>
                    ) : (
                      (selectedProjeto.marcos || []).map((m, idx) => {
                        const isAtrasado = m.status === "Pendente" && m.data_prevista && isBefore(startOfDay(parseISO(m.data_prevista)), hoje);

                        return (
                          <div
                            key={m.id || idx}
                            className={`flex items-center justify-between p-3 rounded-lg border ${m.status === "Concluído" ? 'bg-emerald-50/50 border-emerald-200' : isAtrasado ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={async () => {
                                  const list = [...selectedProjeto.marcos];
                                  list[idx].status = list[idx].status === "Concluído" ? "Pendente" : "Concluído";
                                  const updated = await base44.entities.ProjetosInternos.update(selectedProjeto.id, { marcos: list });
                                  queryClient.invalidateQueries({ queryKey: ['projetos_internos_list'] });
                                  setSelectedProjeto(updated);
                                }}
                                className="focus:outline-none"
                              >
                                {m.status === "Concluído" ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-indigo-600" />
                                )}
                              </button>

                              <div>
                                <p className={`font-semibold ${m.status === "Concluído" ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                  {m.titulo}
                                </p>
                                {m.data_prevista && (
                                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3 h-3 text-slate-400" /> Previsto para {formatarDataSemFuso(m.data_prevista)}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isAtrasado && (
                                <Badge variant="destructive" className="bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-3 h-3" /> Atrasado
                                </Badge>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  const list = selectedProjeto.marcos.filter((_, i) => i !== idx);
                                  const updated = await base44.entities.ProjetosInternos.update(selectedProjeto.id, { marcos: list });
                                  queryClient.invalidateQueries({ queryKey: ['projetos_internos_list'] });
                                  setSelectedProjeto(updated);
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>

                {/* ABA 3: CHAT / IDEIAS */}
                <TabsContent value="chat" className="space-y-4 pt-4 text-sm">
                  <div className="bg-slate-100/70 border rounded-lg p-3 h-72 overflow-y-auto space-y-2">
                    {chatMessages.length === 0 ? (
                      <p className="text-center text-slate-400 text-xs py-12">Nenhuma ideia ou comentário registrado ainda.</p>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.tipo_remetente === 'admin_ti' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-xl text-xs break-words shadow-sm ${msg.tipo_remetente === 'admin_ti' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-800'}`}>
                            <p className={`font-bold mb-0.5 ${msg.tipo_remetente === 'admin_ti' ? 'text-indigo-100' : 'text-indigo-900'}`}>
                              {msg.remetente_nome}
                            </p>
                            {msg.mensagem && <p className="whitespace-pre-wrap">{msg.mensagem}</p>}
                            {msg.anexo_url && (
                              <a href={msg.anexo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1 underline opacity-90">
                                📎 {msg.anexo_nome || "Arquivo Anexo"}
                              </a>
                            )}
                            <p className={`text-[10px] mt-1 text-right ${msg.tipo_remetente === 'admin_ti' ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {new Date(msg.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Escreva um comentário ou ideia para este projeto..."
                      rows={2}
                      value={novaMsgChat}
                      onChange={e => setNovaMsgChat(e.target.value)}
                    />
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 text-white h-auto"
                      disabled={!novaMsgChat.trim() || enviarChatMutation.isPending}
                      onClick={() => enviarChatMutation.mutate({ texto: novaMsgChat })}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* ABA 4: DOCUMENTOS GERAIS & HOMOLOGAÇÃO */}
                <TabsContent value="aprovacoes" className="space-y-6 pt-4 text-sm">
                  {/* SEÇÃO A: DOCUMENTOS GERAIS DO PROJETO */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" /> Documentação Geral do Projeto
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Arquivos de apoio geral: cotações, planilhas, manuais técnicos, plantas, fotos do ambiente e especificações.
                        </p>
                      </div>

                      <label className="cursor-pointer shrink-0">
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          disabled={uploadingDocGeral}
                          onChange={async (e) => {
                            const files = Array.from(e.target.files);
                            if (!files.length) return;
                            setUploadingDocGeral(true);
                            try {
                              const docsAtuais = Array.isArray(selectedProjeto.documentos_projeto) ? selectedProjeto.documentos_projeto : [];
                              const novosDocs = [...docsAtuais];
                              for (const file of files) {
                                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                novosDocs.push({
                                  file_url,
                                  file_name: file.name,
                                  data_upload: new Date().toISOString(),
                                  enviado_por: "Equipe de TI"
                                });
                              }
                              const updated = await base44.entities.ProjetosInternos.update(selectedProjeto.id, {
                                documentos_projeto: novosDocs
                              });
                              setSelectedProjeto(updated);
                              queryClient.invalidateQueries({ queryKey: ['projetos_internos_list'] });
                            } catch (err) {
                              console.error("Erro no upload do documento:", err);
                              alert("Erro ao enviar documento. Tente novamente.");
                            } finally {
                              setUploadingDocGeral(false);
                              e.target.value = "";
                            }
                          }}
                        />
                        <Button type="button" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 pointer-events-none" disabled={uploadingDocGeral}>
                          {uploadingDocGeral ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          Anexar Documento
                        </Button>
                      </label>
                    </div>

                    {/* Lista de Documentos Anexados */}
                    {Array.isArray(selectedProjeto.documentos_projeto) && selectedProjeto.documentos_projeto.length > 0 ? (
                      <div className="space-y-2">
                        {selectedProjeto.documentos_projeto.map((doc, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-800 hover:text-indigo-600 underline">
                                  {doc.file_name}
                                </a>
                                <p className="text-[11px] text-slate-400">
                                  Enviado em {new Date(doc.data_upload).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} por {doc.enviado_por || 'TI'}
                                </p>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-400 hover:text-rose-600"
                              onClick={async () => {
                                if (confirm(`Deseja remover o documento "${doc.file_name}"?`)) {
                                  const filtrados = selectedProjeto.documentos_projeto.filter((_, i) => i !== idx);
                                  const updated = await base44.entities.ProjetosInternos.update(selectedProjeto.id, {
                                    documentos_projeto: filtrados
                                  });
                                  setSelectedProjeto(updated);
                                  queryClient.invalidateQueries({ queryKey: ['projetos_internos_list'] });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2">Nenhum documento geral anexado ainda a este projeto.</p>
                    )}
                  </div>
                </TabsContent>

                {/* ABA 5: ENCERRAMENTO & DOCUMENTAÇÃO CONSOLIDADA */}
                <TabsContent value="encerramento" className="space-y-0 pt-4 text-sm">
                  {selectedProjeto.status === "Concluído" && selectedProjeto.parecer_conclusao ? (
                    <div className="space-y-0">
                      {/* Botão Imprimir */}
                      <div className="flex justify-end mb-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            const proj = selectedProjeto;
                            const marcosHtml = (proj.marcos || []).map((m, i) => `
                              <tr style="border-bottom:1px solid #e2e8f0">
                                <td style="padding:8px 12px;">${i+1}</td>
                                <td style="padding:8px 12px;font-weight:600">${m.titulo}</td>
                                <td style="padding:8px 12px;">${m.data_prevista ? formatarDataSemFuso(m.data_prevista) : '—'}</td>
                                <td style="padding:8px 12px;">
                                  <span style="background:${m.status === 'Concluído' ? '#d1fae5' : '#fee2e2'};color:${m.status === 'Concluído' ? '#065f46' : '#991b1b'};padding:2px 8px;border-radius:999px;font-size:11px;font-weight:bold">${m.status}</span>
                                </td>
                              </tr>`).join('');
                            const docHtml = (proj.documentos_projeto || []).map(d => `<li style="margin-bottom:4px"><a href="${d.file_url}" style="color:#4f46e5">${d.file_name}</a> — ${d.enviado_por || 'TI'} (${new Date(d.data_upload).toLocaleDateString('pt-BR')})</li>`).join('');
                            const custoEst = (Number(proj.custo_estimado)||0).toLocaleString('pt-BR',{minimumFractionDigits:2});
                            const custoReal = (Number(proj.custo_real)||0).toLocaleString('pt-BR',{minimumFractionDigits:2});
                            const desv = (Number(proj.custo_real)||0) - (Number(proj.custo_estimado)||0);
                            const dAberto = proj.created_at ? new Date(proj.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}) : '—';
                            const dConc = proj.data_conclusao ? formatarDataSemFuso(proj.data_conclusao) : (proj.concluido_em ? formatarDataSemFuso(proj.concluido_em) : '—');
                            printWindow.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Termo de Encerramento — ${proj.titulo}</title><style>body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#1e293b;font-size:13px}h1{font-size:20px;color:#312e81;margin-bottom:4px}h2{font-size:14px;color:#4338ca;border-bottom:2px solid #c7d2fe;padding-bottom:4px;margin-top:24px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f1f5f9;text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.05em}td{vertical-align:top}.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:bold}.header-block{background:#1e1b4b;color:white;padding:24px 32px;margin:-32px -32px 24px -32px}.meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:16px 0}.meta-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}.meta-label{font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:4px}.meta-value{font-weight:700;color:#1e293b;font-size:14px}.parecer-box{background:#f0fdf4;border:2px solid #86efac;border-radius:8px;padding:16px;white-space:pre-wrap;line-height:1.6}@media print{body{margin:0;padding:24px}}</style></head><body>
                              <div class="header-block">
                                <div style="font-size:10px;color:#a5b4fc;font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">TERMO DE ENCERRAMENTO — ${proj.programa_nome}</div>
                                <h1 style="color:white;margin:0 0 4px">${proj.titulo}</h1>
                                <div style="color:#c7d2fe;font-size:12px">${proj.codigo_projeto} &nbsp;•&nbsp; Encerrado por: ${proj.concluido_por || proj.responsavel_nome || '—'} &nbsp;•&nbsp; ${dConc}</div>
                              </div>
                              <h2>Informações Gerais</h2>
                              <div class="meta-grid">
                                <div class="meta-item"><div class="meta-label">Data de Abertura</div><div class="meta-value">${dAberto}</div></div>
                                <div class="meta-item"><div class="meta-label">Data de Conclusão</div><div class="meta-value">${dConc}</div></div>
                                <div class="meta-item"><div class="meta-label">Responsável TI</div><div class="meta-value">${proj.responsavel_nome || '—'}</div></div>
                                <div class="meta-item"><div class="meta-label">Solicitante</div><div class="meta-value">${proj.solicitante_nome || '—'}</div></div>
                                <div class="meta-item"><div class="meta-label">Prioridade</div><div class="meta-value">${proj.prioridade}</div></div>
                                <div class="meta-item"><div class="meta-label">Status Final</div><div class="meta-value" style="color:#065f46">Concluído</div></div>
                              </div>
                              <h2>Sumário Financeiro (CAPEX / OPEX)</h2>
                              <div class="meta-grid">
                                <div class="meta-item"><div class="meta-label">Custo Estimado (Orçado)</div><div class="meta-value">R$ ${custoEst}</div></div>
                                <div class="meta-item"><div class="meta-label">Custo Real (Executado)</div><div class="meta-value">R$ ${custoReal}</div></div>
                                <div class="meta-item"><div class="meta-label">Desvio Orçamentário</div><div class="meta-value" style="color:${desv>0?'#dc2626':'#16a34a'}">${desv>0?'+':''}R$ ${Math.abs(desv).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
                              </div>
                              <h2>Parecer Técnico de Conclusão</h2>
                              <div class="parecer-box">${proj.parecer_conclusao}</div>
                              ${marcosHtml ? `<h2>Cronograma de Marcos & Etapas</h2><table><thead><tr><th>#</th><th>Marco / Entregável</th><th>Data Prevista</th><th>Status</th></tr></thead><tbody>${marcosHtml}</tbody></table>` : ''}
                              ${docHtml ? `<h2>Documentos do Projeto</h2><ul>${docHtml}</ul>` : ''}
                              <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">Gerado automaticamente pelo TechControl — ${new Date().toLocaleString('pt-BR')} — Interlub</div>
                            </body></html>`);
                            printWindow.document.close();
                            printWindow.focus();
                            setTimeout(() => printWindow.print(), 400);
                          }}
                        >
                          <Printer className="w-4 h-4" />
                          Imprimir / Exportar PDF
                        </Button>
                      </div>

                      {/* Cabeçalho do Termo */}
                      <div className="bg-gradient-to-r from-indigo-900 to-slate-800 rounded-xl p-5 text-white mb-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-1">Termo de Encerramento de Projeto</div>
                        <div className="text-xl font-bold">{selectedProjeto.titulo}</div>
                        <div className="text-indigo-200 text-xs mt-1">
                          {selectedProjeto.codigo_projeto} &nbsp;•&nbsp; {selectedProjeto.programa_nome} &nbsp;•&nbsp;
                          Concluído por: <strong className="text-white">{selectedProjeto.concluido_por || selectedProjeto.responsavel_nome || "—"}</strong>
                          {(selectedProjeto.data_conclusao || selectedProjeto.concluido_em) && <> &nbsp;em&nbsp; <strong className="text-white">{formatarDataSemFuso(selectedProjeto.data_conclusao || selectedProjeto.concluido_em)}</strong></>}
                        </div>
                      </div>

                      {/* Grid de Informações Gerais */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: "Abertura", value: selectedProjeto.created_at ? new Date(selectedProjeto.created_at).toLocaleString('pt-BR', {dateStyle:'short',timeStyle:'short'}) : '—' },
                          { label: "Conclusão Efetiva", value: formatarDataSemFuso(selectedProjeto.data_conclusao || selectedProjeto.concluido_em) },
                          { label: "Responsável TI", value: selectedProjeto.responsavel_nome || '—' },
                          { label: "Solicitante", value: selectedProjeto.solicitante_nome || '—' },
                          { label: "Prioridade", value: selectedProjeto.prioridade },
                          { label: "Status Final", value: "Concluído ✓", highlight: true },
                        ].map((item, i) => (
                          <div key={i} className={`p-3 rounded-lg border text-xs ${item.highlight ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                            <span className={`font-semibold uppercase text-[10px] tracking-wider ${item.highlight ? 'text-emerald-700' : 'text-slate-500'}`}>{item.label}</span>
                            <p className={`font-bold mt-0.5 ${item.highlight ? 'text-emerald-800' : 'text-slate-800'}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Sumário Financeiro */}
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
                        <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-3 text-sm">
                          <DollarSign className="w-4 h-4 text-indigo-600" /> Sumário Financeiro (CAPEX / OPEX)
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="text-xs text-slate-500">Custo Estimado (Orçado)</span>
                            <p className="font-bold text-slate-800 text-base">
                              R$ {(Number(selectedProjeto.custo_estimado)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">Custo Real (Executado)</span>
                            <p className="font-bold text-slate-900 text-base">
                              R$ {(Number(selectedProjeto.custo_real)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">Desvio Orçamentário</span>
                            {(() => {
                              const desv = (Number(selectedProjeto.custo_real)||0) - (Number(selectedProjeto.custo_estimado)||0);
                              return (
                                <p className={`font-bold text-base ${desv > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                  {desv > 0 ? '+' : ''}R$ {Math.abs(desv).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Parecer Técnico */}
                      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-4">
                        <h4 className="font-bold text-emerald-900 flex items-center gap-2 mb-3 text-sm">
                          <ClipboardCheck className="w-4 h-4 text-emerald-700" /> Parecer Técnico de Conclusão
                        </h4>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">
                          {selectedProjeto.parecer_conclusao}
                        </p>
                        {selectedProjeto.concluido_por && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-emerald-200">
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs text-emerald-700 font-semibold">Responsável pelo encerramento: {selectedProjeto.concluido_por}</span>
                            {selectedProjeto.concluido_em && (
                              <span className="text-xs text-emerald-600">
                                — {new Date(selectedProjeto.concluido_em).toLocaleString('pt-BR', {dateStyle:'short',timeStyle:'short'})}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Marcos / Etapas */}
                      {(selectedProjeto.marcos || []).length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                            Cronograma de Marcos & Etapas ({(selectedProjeto.marcos||[]).length})
                          </h4>
                          <div className="space-y-1.5">
                            {(selectedProjeto.marcos||[]).map((m, i) => (
                              <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${m.status === 'Concluído' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                  {m.status === 'Concluído' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                                  )}
                                  <span className={`font-semibold ${m.status === 'Concluído' ? 'line-through text-slate-500' : 'text-slate-800'}`}>{m.titulo}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {m.data_prevista && <span className="text-slate-400">{formatarDataSemFuso(m.data_prevista)}</span>}
                                  <Badge className={`text-[10px] ${m.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'} border`}>
                                    {m.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}



                      {/* Documentos */}
                      {(selectedProjeto.documentos_projeto || []).length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" /> Documentos Anexados ({selectedProjeto.documentos_projeto.length})
                          </h4>
                          <div className="space-y-1.5">
                            {selectedProjeto.documentos_projeto.map((doc, i) => (
                              <a key={i} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-xs">
                                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span className="font-semibold text-slate-800 underline">{doc.file_name}</span>
                                <span className="text-slate-400 ml-auto">{doc.enviado_por || 'TI'} — {new Date(doc.data_upload).toLocaleDateString('pt-BR')}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : selectedProjeto.status === "Concluído" ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <ClipboardCheck className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="font-semibold text-slate-600">Projeto concluído sem parecer técnico registrado.</p>
                      <p className="text-xs text-slate-400 mt-1">Edite o projeto ou reabra-o para inserir o parecer de encerramento.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="font-semibold text-slate-600">Documentação de encerramento ainda não disponível.</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Esta aba exibirá o <strong>Termo de Encerramento completo</strong> com parecer técnico, marcos, homologações e documentos — assim que o projeto for <strong>Concluído</strong>.
                      </p>
                      {selectedProjeto.status !== "Cancelado" && (
                        <Button
                          size="sm"
                          className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                          onClick={() => {
                            setDataConclusaoInput(selectedProjeto.data_conclusao || new Date().toISOString().split('T')[0]);
                            setParecerInput("");
                            setCustoRealFinalInput(String(selectedProjeto.custo_real || ""));
                            setConcluidoPorInput(selectedProjeto.responsavel_nome || "");
                            setConfirmConcluirModal(true);
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Concluir e Gerar Documentação
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO: CONCLUIR PROJETO — COM PARECER TÉCNICO */}
      <Dialog open={confirmConcluirModal} onOpenChange={setConfirmConcluirModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" /> Concluir Projeto — Parecer Técnico de Encerramento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-emerald-800 font-semibold text-sm">
                📋 Projeto: <span className="text-emerald-900">"{selectedProjeto?.titulo}"</span>
              </p>
              <p className="text-emerald-700 text-xs mt-0.5">
                Preencha o parecer técnico completo antes de finalizar. Ele ficará registrado permanentemente como documentação de encerramento.
              </p>
            </div>

            {/* Campos de Encerramento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-semibold">Data de Conclusão Efetiva *</Label>
                <Input
                  type="date"
                  value={dataConclusaoInput}
                  onChange={e => setDataConclusaoInput(e.target.value)}
                />
              </div>
              <div>
                <Label className="font-semibold">Custo Real Final (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={custoRealFinalInput}
                  onChange={e => setCustoRealFinalInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="font-semibold">Responsável pelo Encerramento (Colaborador / ADM) *</Label>
              <Select
                value={concluidoPorInput}
                onValueChange={v => setConcluidoPorInput(v)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione o responsável pelo encerramento" />
                </SelectTrigger>
                <SelectContent>
                  {usuariosSistema.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50">Usuários ADM / TI</div>
                      {usuariosSistema.map(u => {
                        const val = u.nome_exibicao || u.full_name || u.email;
                        return (
                          <SelectItem key={'usr-' + u.id} value={val}>
                            {val} ({u.role || 'ADM'})
                          </SelectItem>
                        );
                      })}
                    </>
                  )}
                  {colaboradores.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100">Colaboradores</div>
                      {colaboradores.map(c => (
                        <SelectItem key={'colab-' + c.id} value={c.nome_completo}>
                          {c.nome_completo} ({c.area || 'Colaborador'})
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-semibold flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                Parecer Técnico de Conclusão *
              </Label>
              <p className="text-xs text-slate-500 mb-1.5">
                Descreva tudo o que foi analisado, verificado, corrigido, aprovado e entregue. Este parecer será parte da documentação permanente do projeto.
              </p>
              <Textarea
                required
                rows={10}
                placeholder={`Exemplo de estrutura:\n\n1. ANÁLISE REALIZADA:\n   - Levantamento do ambiente existente\n   - Identificação de pontos críticos\n\n2. VERIFICAÇÕES EXECUTADAS:\n   - Testes de conectividade e segurança\n   - Validação de licenças\n\n3. CORREÇÕES / IMPLEMENTAÇÕES:\n   - Substituição de equipamentos\n   - Configuração de políticas de acesso\n\n4. APROVAÇÕES OBTIDAS:\n   - Diretoria de Operações (data)\n   - Homologado em ambiente de produção\n\n5. CONSIDERAÇÕES FINAIS:\n   - Objetivos atingidos conforme escopo\n   - Recomendações para manutenção`}
                value={parecerInput}
                onChange={e => setParecerInput(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t gap-2">
            <Button variant="outline" onClick={() => setConfirmConcluirModal(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              disabled={!parecerInput.trim()}
              onClick={async () => {
                const dConc = dataConclusaoInput || new Date().toISOString().split('T')[0];
                const payload = {
                  status: "Concluído",
                  data_conclusao: dConc,
                  parecer_conclusao: parecerInput.trim(),
                  concluido_por: concluidoPorInput.trim() || selectedProjeto?.responsavel_nome || "",
                  concluido_em: new Date().toISOString(),
                };
                if (custoRealFinalInput && custoRealFinalInput.trim() !== "") {
                  payload.custo_real = Number(custoRealFinalInput);
                }
                const updated = await base44.entities.ProjetosInternos.update(selectedProjeto.id, payload);
                setSelectedProjeto(updated);
                queryClient.invalidateQueries({ queryKey: ['projetos_internos_list'] });
                setConfirmConcluirModal(false);
                setParecerInput("");
                setCustoRealFinalInput("");
                setConcluidoPorInput("");
                setActiveTab("encerramento");
              }}
            >
              <BadgeCheck className="w-4 h-4" />
              Concluir e Gerar Documentação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO: CANCELAR PROJETO */}
      <Dialog open={confirmCancelarModal} onOpenChange={setConfirmCancelarModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Ban className="w-5 h-5" /> Cancelar Projeto Interno
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p className="text-slate-700">
              Tem certeza que deseja marcar o projeto <strong>"{selectedProjeto?.titulo}"</strong> como <strong>Cancelado</strong>?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancelarModal(false)}>Voltar</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={async () => {
                const updated = await base44.entities.ProjetosInternos.update(selectedProjeto.id, {
                  status: "Cancelado"
                });
                setSelectedProjeto(updated);
                queryClient.invalidateQueries({ queryKey: ['projetos_internos_list'] });
                setConfirmCancelarModal(false);
              }}
            >
              Sim, Cancelar Projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
