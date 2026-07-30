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
  Trash2
} from "lucide-react";
import { format, isBefore, startOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const PROGRAMAS_DISPONIVEIS = [
  "Plano Estratégico de TI 2026"
];

const STATUS_PROJETO = [
  "Em Planejamento",
  "Aguardando Aprovação",
  "Em Execução",
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

  // Aux Marcos
  const [novoMarco, setNovoMarco] = useState({ titulo: "", data_prevista: "", responsavel: "" });

  // Aux Aprovação Diretoria
  const [novaAprovacao, setNovaAprovacao] = useState({ aprovado: true, aprovador_nome: "", observacoes: "" });

  // Aux Chat
  const [novaMsgChat, setNovaMsgChat] = useState("");
  const [anexoChat, setAnexoChat] = useState(null);
  const [uploadingChatAnexo, setUploadingChatAnexo] = useState(false);

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
      const respColab = colaboradores.find(c => String(c.id) === String(data.responsavel_id));
      const solColab = colaboradores.find(c => String(c.id) === String(data.solicitante_id));

      const payload = {
        ...data,
        responsavel_nome: respColab ? respColab.nome_completo : "",
        solicitante_nome: solColab ? solColab.nome_completo : "",
        custo_estimado: Number(data.custo_estimado) || 0,
        custo_real: Number(data.custo_real) || 0,
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
      marcos: proj.marcos || [],
    });
    setModalOpen(true);
  };

  // Cálculos do Programa
  const projetosDoPrograma = projetos.filter(p => p.programa_nome === selectedPrograma);
  const totalCustoEstimado = projetosDoPrograma.reduce((acc, p) => acc + (Number(p.custo_estimado) || 0), 0);
  const totalCustoReal = projetosDoPrograma.reduce((acc, p) => acc + (Number(p.custo_real) || 0), 0);
  const desvioOrcamentario = totalCustoReal - totalCustoEstimado;

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

        {/* Lista de Projetos do Programa */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Iniciativas em Andamento ({projetosDoPrograma.length})
          </h3>

          {projetosDoPrograma.length === 0 ? (
            <Card className="border-dashed border-slate-300 py-12 text-center text-slate-400">
              <FolderKanban className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-600">Nenhum projeto interno cadastrado para este programa.</p>
              <p className="text-xs text-slate-400 mt-1">Clique em "Novo Projeto Interno" para adicionar.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projetosDoPrograma.map(proj => {
                const stats = getProjetoStats(proj);
                const listParticipantes = colaboradores.filter(c => (proj.participantes_ids || []).includes(String(c.id)));
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

                      {/* Envolvidos e Homologação */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{listParticipantes.length + (proj.responsavel_nome ? 1 : 0)} Envolvidos</span>
                        </div>

                        {temAprovacaoDiretoria ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5" /> Homologado
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pendente Homologação</span>
                        )}
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
                <Label>Responsável Técnico TI *</Label>
                <Select value={formData.responsavel_id} onValueChange={v => setFormData(p => ({ ...p, responsavel_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                  <SelectContent>
                    {colaboradores.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome_completo} ({c.area})</SelectItem>)}
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
              <div className="border rounded-lg p-3 max-h-36 overflow-y-auto space-y-1.5 bg-slate-50">
                {colaboradores.map(colab => {
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
                <Label>Data de Início Prevista</Label>
                <Input
                  type="date"
                  value={formData.data_inicio_prevista}
                  onChange={e => setFormData(p => ({ ...p, data_inicio_prevista: e.target.value }))}
                />
              </div>
              <div>
                <Label>Data de Conclusão Prevista</Label>
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
                  <div className="flex items-center gap-2">
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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="geral" className="text-xs">Visão Geral & Custos</TabsTrigger>
                  <TabsTrigger value="marcos" className="text-xs">Marcos & Etapas ({selectedProjeto.marcos?.length || 0})</TabsTrigger>
                  <TabsTrigger value="chat" className="text-xs">Ideias & Chat ({chatMessages.length})</TabsTrigger>
                  <TabsTrigger value="aprovacoes" className="text-xs">Homologação & Documentos</TabsTrigger>
                </TabsList>

                {/* ABA 1: GERAL & CUSTOS */}
                <TabsContent value="geral" className="space-y-4 pt-4 text-sm">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-1">Descrição e Justificativa</h4>
                    <p className="text-slate-600 whitespace-pre-wrap">{selectedProjeto.descricao || "Sem descrição cadastrada."}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                      <p className="font-semibold text-slate-800">{selectedProjeto.data_inicio_prevista || "—"}</p>
                    </div>
                    <div className="p-3 bg-white border rounded-lg">
                      <span className="text-xs text-slate-400">Fim Previsto</span>
                      <p className="font-semibold text-slate-800">{selectedProjeto.data_fim_prevista || "—"}</p>
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
                                    <Calendar className="w-3 h-3 text-slate-400" /> Previsto para {format(parseISO(m.data_prevista), 'dd/MM/yyyy')}
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

                {/* ABA 4: HOMOLOGAÇÃO & DOCUMENTOS */}
                <TabsContent value="aprovacoes" className="space-y-6 pt-4 text-sm">
                  {/* Histórico de Aprovações da Diretoria */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" /> Registro de Homologação da Diretoria / Reuniões
                    </h4>

                    {Array.isArray(selectedProjeto.aprovacao_diretoria) && selectedProjeto.aprovacao_diretoria.length > 0 ? (
                      <div className="space-y-2">
                        {selectedProjeto.aprovacao_diretoria.map((ap, i) => (
                          <div key={i} className="p-3 bg-white rounded-lg border border-slate-200 flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-slate-800 flex items-center gap-2">
                                {ap.aprovado ? (
                                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-xs">Aprovado</span>
                                ) : (
                                  <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-xs">Reprovado / Rejeitado</span>
                                )}
                                <span>Por: {ap.aprovador_nome}</span>
                              </p>
                              {ap.observacoes && <p className="text-xs text-slate-600 mt-1 font-medium">"{ap.observacoes}"</p>}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {new Date(ap.data).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhum registro formal de aprovação da diretoria até o momento.</p>
                    )}

                    {/* Formulário para Registrar Aprovação */}
                    <div className="border-t border-slate-200 pt-3 space-y-2">
                      <p className="font-semibold text-xs text-slate-700 uppercase">Registrar Nova Aprovação / Homologação</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          placeholder="Nome do Aprovador (ex: Diretoria de Operações)"
                          value={novaAprovacao.aprovador_nome}
                          onChange={e => setNovaAprovacao(p => ({ ...p, aprovador_nome: e.target.value }))}
                        />
                        <Select
                          value={novaAprovacao.aprovado ? "sim" : "nao"}
                          onValueChange={v => setNovaAprovacao(p => ({ ...p, aprovado: v === "sim" }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sim">Aprovado / Homologado</SelectItem>
                            <SelectItem value="nao">Reprovado / Em Revisão</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea
                        placeholder="Observações ou deliberações da reunião..."
                        rows={2}
                        value={novaAprovacao.observacoes}
                        onChange={e => setNovaAprovacao(p => ({ ...p, observacoes: e.target.value }))}
                      />
                      <Button
                        type="button"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                        disabled={salvarAprovacaoMutation.isPending}
                        onClick={() => salvarAprovacaoMutation.mutate(novaAprovacao)}
                      >
                        Salvar Registro de Aprovação
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
