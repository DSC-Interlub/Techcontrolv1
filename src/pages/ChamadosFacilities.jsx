import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2, Search, Filter, Plus, Loader2, CheckCircle2, Clock,
  AlertTriangle, Wrench, ShieldAlert, Star, Paperclip, X, Download,
  ExternalLink, UserCheck, RefreshCw, Calendar, MapPin, DollarSign,
  Briefcase, Send, Eye, ShieldCheck, FileText, CheckCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPOS_SERVICO = [
  "Limpeza e Conservação",
  "Manutenção Predial",
  "Ar-Condicionado e Climatização",
  "Instalações Elétricas",
  "Instalações Hidráulicas",
  "Gestão de Resíduos",
  "Controle de Fornecedores de Serviços",
  "Jardinagem e Áreas Externas",
  "Controle de Pragas",
  "Segurança Patrimonial",
  "Gestão de Utilidades",
  "Outros"
];

const statusColors = {
  "Aberto": "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300",
  "Em Análise": "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300",
  "Em Execução": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  "Aguardando Orçamento": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300",
  "Concluído": "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300",
  "Cancelado": "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300",
};

const prioridadeColors = {
  "Crítica": "bg-red-600 text-white font-bold",
  "Alta": "bg-orange-500 text-white font-medium",
  "Média": "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  "Baixa": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300",
};

export default function ChamadosFacilities() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const nomeAdmin = user?.name || user?.email?.split('@')[0] || 'Administrador Facilities';

  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroAtendimento, setFiltroAtendimento] = useState("todos");
  const [abaAtiva, setAbaAtiva] = useState("todos");

  const [selectedChamado, setSelectedChamado] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [novosAnexosEtapa, setNovosAnexosEtapa] = useState([]);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [novoComentarioHistorico, setNovoComentarioHistorico] = useState("");

  // Queries
  const { data: chamados = [], isLoading, refetch } = useQuery({
    queryKey: ['admin_chamados_facilities'],
    queryFn: () => base44.entities.ChamadosFacilities.list('-created_date'),
    staleTime: 30000,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores_list_facilities'],
    queryFn: () => base44.entities.Colaboradores.list('nome_completo'),
    staleTime: 60000,
  });

  const { data: empresasTerceiras = [] } = useQuery({
    queryKey: ['empresas_terceiras_facilities'],
    queryFn: () => base44.entities.EmpresasTerceiras.list('nome'),
    staleTime: 60000,
  });

  // Abrir modal de edição/triagem
  const handleOpenDetalhes = (chamado) => {
    setSelectedChamado(chamado);
    setEditFormData({
      status: chamado.status || "Aberto",
      prioridade_definida: chamado.prioridade_definida || chamado.prioridade || "Média",
      categoria_confirmada: chamado.categoria_confirmada || chamado.tipo_servico || "",
      prazo_atendimento: chamado.prazo_atendimento || "",
      responsavel_analise_nome: chamado.responsavel_analise_nome || nomeAdmin,
      tratamento: chamado.tratamento || (chamado.terceiro_envolvido ? "Encaminhado para fornecedor" : "Executado internamente"),
      responsavel_execucao_nome: chamado.responsavel_execucao_nome || "",
      terceiro_envolvido: !!chamado.terceiro_envolvido,
      terceiro_empresa: chamado.terceiro_empresa || "",
      terceiro_numero_chamado: chamado.terceiro_numero_chamado || "",
      orcamento_valor: chamado.orcamento_valor || "",
      descricao_servico_executado: chamado.descricao_servico_executado || "",
    });
    setNovosAnexosEtapa([]);
    setNovoComentarioHistorico("");
  };

  // Mutation para atualizar a solicitação
  const updateMutation = useMutation({
    mutationFn: async ({ id, dataToUpdate, novoStatus, acaoDescricao }) => {
      const agora = new Date().toISOString();
      const statusAnterior = selectedChamado.status;
      const statusFinal = novoStatus || dataToUpdate.status || statusAnterior;

      const novoHistorico = [...(selectedChamado.historico || [])];
      
      let descricaoEvento = acaoDescricao;
      if (!descricaoEvento) {
        if (statusAnterior !== statusFinal) {
          descricaoEvento = `Status alterado de "${statusAnterior}" para "${statusFinal}" por ${nomeAdmin}`;
        } else {
          descricaoEvento = `Atualização cadastral e triagem registrada por ${nomeAdmin}`;
        }
      }
      if (novoComentarioHistorico.trim()) {
        descricaoEvento += ` — Observação: "${novoComentarioHistorico.trim()}"`;
      }

      novoHistorico.push({
        data_hora: agora,
        tipo: statusFinal === "Concluído" ? "conclusao" : "atualizacao",
        descricao: descricaoEvento,
        usuario_nome: nomeAdmin,
        usuario: nomeAdmin,
        usuario_id: user?.id || null,
        status_anterior: statusAnterior,
        status_novo: statusFinal,
        anexos: novosAnexosEtapa || []
      });

      const payload = {
        ...dataToUpdate,
        orcamento_valor: dataToUpdate.orcamento_valor !== undefined && dataToUpdate.orcamento_valor !== "" && dataToUpdate.orcamento_valor !== null
          ? parseFloat(String(dataToUpdate.orcamento_valor).replace(',', '.')) || null
          : null,
        status: statusFinal,
        updated_date: agora,
        historico: novoHistorico
      };

      if (statusFinal === "Em Execução" && !selectedChamado.data_inicio_atendimento) {
        payload.data_inicio_atendimento = agora;
      }

      if (statusFinal === "Concluído") {
        payload.data_conclusao = agora;
        if (payload.terceiro_envolvido) {
          payload.terceiro_data_resolucao = agora;
        }
      }

      const res = await base44.entities.ChamadosFacilities.update(id, payload);

      // Disparos automáticos de e-mail com numeração FAC-YYYY-0001
      if (statusFinal === "Em Execução" && statusAnterior !== "Em Execução") {
        base44.functions.invoke('sendEmailFacilitiesStarted', {
          chamado_id: id,
          responsavel: payload.responsavel_execucao_nome || payload.terceiro_empresa || nomeAdmin
        }).catch(err => console.warn("Erro ao disparar email started:", err));
      }

      if (statusFinal === "Concluído" && statusAnterior !== "Concluído") {
        base44.functions.invoke('sendEmailFacilitiesClosed', {
          chamado_id: id,
          responsavel: payload.responsavel_execucao_nome || payload.terceiro_empresa || nomeAdmin
        }).catch(err => console.warn("Erro ao disparar email closed:", err));
      }

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_chamados_facilities'] });
      setSelectedChamado(null);
      setNovosAnexosEtapa([]);
      setNovoComentarioHistorico("");
    },
    onError: (err) => {
      console.error("Erro ao atualizar solicitação:", err);
      alert("Erro ao salvar alterações: " + (err.message || "Tente novamente."));
    }
  });

  // Salvar alterações gerais do modal
  const handleSalvarAlteracoes = (e) => {
    e.preventDefault();
    if (!selectedChamado) return;

    updateMutation.mutate({
      id: selectedChamado.id,
      dataToUpdate: editFormData,
      novoStatus: editFormData.status
    });
  };

  // Concluir direto
  const handleConcluirSolicitacao = () => {
    if (!selectedChamado) return;
    if (!editFormData.descricao_servico_executado?.trim()) {
      alert("Por favor, preencha a descrição do serviço executado antes de concluir.");
      return;
    }

    updateMutation.mutate({
      id: selectedChamado.id,
      dataToUpdate: {
        ...editFormData,
        status: "Concluído",
      },
      novoStatus: "Concluído",
      acaoDescricao: `Solicitação concluída por ${nomeAdmin}. Pesquisa de satisfação disparada para ${selectedChamado.solicitante_nome}.`
    });
  };

  // Filtragem e Métricas
  const chamadosFiltrados = useMemo(() => {
    return chamados.filter(c => {
      // Busca texto
      if (busca.trim()) {
        const term = busca.toLowerCase().trim();
        const num = (c.numero_solicitacao || "").toLowerCase();
        const sol = (c.solicitante_nome || "").toLowerCase();
        const loc = (c.local_ocorrencia || "").toLowerCase();
        const desc = (c.descricao || "").toLowerCase();
        const terc = (c.terceiro_empresa || "").toLowerCase();
        if (!num.includes(term) && !sol.includes(term) && !loc.includes(term) && !desc.includes(term) && !terc.includes(term)) {
          return false;
        }
      }

      // Filtro Tipo
      if (filtroTipo !== "todos" && c.tipo_servico !== filtroTipo && c.categoria_confirmada !== filtroTipo) {
        return false;
      }

      // Filtro Prioridade
      if (filtroPrioridade !== "todos" && c.prioridade !== filtroPrioridade && c.prioridade_definida !== filtroPrioridade) {
        return false;
      }

      // Filtro Status Select
      if (filtroStatus !== "todos" && c.status !== filtroStatus) {
        return false;
      }

      // Filtro Atendimento
      if (filtroAtendimento === "interno" && c.terceiro_envolvido) return false;
      if (filtroAtendimento === "terceiro" && !c.terceiro_envolvido) return false;

      // Abas de Status
      if (abaAtiva === "abertos" && !["Aberto", "Em Análise"].includes(c.status)) return false;
      if (abaAtiva === "execucao" && !["Em Execução", "Aguardando Orçamento"].includes(c.status)) return false;
      if (abaAtiva === "avaliacao" && (c.status !== "Concluído" || c.satisfacao_respondida || c.avaliacao_data)) return false;
      if (abaAtiva === "concluidos" && c.status !== "Concluído" && c.status !== "Cancelado") return false;

      return true;
    });
  }, [chamados, busca, filtroTipo, filtroPrioridade, filtroStatus, filtroAtendimento, abaAtiva]);

  // Estatísticas do Topo
  const stats = useMemo(() => {
    const total = chamados.length;
    const abertos = chamados.filter(c => ["Aberto", "Em Análise"].includes(c.status)).length;
    const execucao = chamados.filter(c => ["Em Execução", "Aguardando Orçamento"].includes(c.status)).length;
    const concluidos = chamados.filter(c => c.status === "Concluído").length;
    const comParada = chamados.filter(c => c.necessita_parada_area && c.status !== "Concluído").length;

    const avaliados = chamados.filter(c => c.satisfacao_respondida && c.avaliacao_nota_geral);
    const mediaGeral = avaliados.length > 0
      ? (avaliados.reduce((acc, curr) => acc + Number(curr.avaliacao_nota_geral || 0), 0) / avaliados.length).toFixed(1)
      : "5.0";

    return { total, abertos, execucao, concluidos, comParada, mediaGeral, totalAvaliados: avaliados.length };
  }, [chamados]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shadow-sm">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Chamados de Facilities</h1>
            <p className="text-sm text-muted-foreground">Triagem, atendimento predial, fornecedores terceiros e controle de SLA</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Total Geral</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-red-50/40 dark:bg-red-950/10">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-red-700 dark:text-red-400 font-semibold uppercase">Em Aberto / Triagem</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">{stats.abertos}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-blue-50/40 dark:bg-blue-950/10">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold uppercase">Em Execução</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">{stats.execucao}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-green-50/40 dark:bg-green-950/10">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase">Concluídos</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">{stats.concluidos}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-amber-50/40 dark:bg-amber-950/10">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Satisfação Média
            </p>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">
              {stats.mediaGeral} <span className="text-xs text-muted-foreground font-normal">({stats.totalAvaliados} aval.)</span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-orange-50/40 dark:bg-orange-950/10">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-orange-700 dark:text-orange-400 font-semibold uppercase flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-600" /> Paradas de Área
            </p>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-1">{stats.comParada}</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número FAC-..., solicitante, local, terceiro ou descrição..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de Serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Serviços</SelectItem>
                  {TIPOS_SERVICO.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas Prioridades</SelectItem>
                  <SelectItem value="Crítica">Crítica</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroAtendimento} onValueChange={setFiltroAtendimento}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Atendimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Atendimentos</SelectItem>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="terceiro">Fornecedor Terceiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas e Tabela */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="todos">Todos ({chamados.length})</TabsTrigger>
          <TabsTrigger value="abertos">Abertos / Triagem ({stats.abertos})</TabsTrigger>
          <TabsTrigger value="execucao">Em Execução ({stats.execucao})</TabsTrigger>
          <TabsTrigger value="avaliacao">Aguard. Avaliação ({chamados.filter(c => c.status === "Concluído" && !c.satisfacao_respondida).length})</TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos ({stats.concluidos})</TabsTrigger>
        </TabsList>

        <TabsContent value={abaAtiva} className="mt-0">
          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[140px]">Nº Solicitação</TableHead>
                    <TableHead>Solicitante & Área</TableHead>
                    <TableHead>Serviço & Local</TableHead>
                    <TableHead className="w-[100px]">Prioridade</TableHead>
                    <TableHead className="w-[130px]">Status</TableHead>
                    <TableHead>Responsável / Terceiro</TableHead>
                    <TableHead className="w-[110px]">Abertura</TableHead>
                    <TableHead className="w-[90px] text-center">Satisfação</TableHead>
                    <TableHead className="w-[110px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Carregando solicitações...</p>
                      </TableCell>
                    </TableRow>
                  ) : chamadosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        Nenhuma solicitação encontrada para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    chamadosFiltrados.map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-mono font-bold text-amber-700 dark:text-amber-400 text-xs">
                          {c.numero_solicitacao}
                          {c.necessita_parada_area && (
                            <span title="Requer parada de área/máquinas" className="inline-block ml-1 text-orange-600">⚠️</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-foreground text-xs">{c.solicitante_nome}</p>
                          <p className="text-[11px] text-muted-foreground">{c.area_departamento || "Área não informada"}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground text-xs">{c.tipo_servico}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate max-w-[220px]">
                            <MapPin className="w-3 h-3 shrink-0 text-amber-600" />
                            {c.local_ocorrencia}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${prioridadeColors[c.prioridade_definida || c.prioridade] || "bg-gray-100"}`}>
                            {c.prioridade_definida || c.prioridade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] border ${statusColors[c.status] || "bg-gray-100 text-gray-800"}`}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.terceiro_envolvido ? (
                            <div className="text-xs">
                              <span className="font-semibold text-blue-700 dark:text-blue-300">🏢 {c.terceiro_empresa || "Fornecedor Terceiro"}</span>
                              {c.terceiro_numero_chamado && <p className="text-[10px] text-muted-foreground font-mono">OS: {c.terceiro_numero_chamado}</p>}
                            </div>
                          ) : (
                            <span className="text-xs text-foreground">
                              {c.responsavel_execucao_nome || c.responsavel_analise_nome || "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {c.created_date ? format(parseISO(c.created_date), "dd/MM/yy HH:mm") : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {c.satisfacao_respondida ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[11px] font-bold">
                              {Number(c.avaliacao_nota_geral || 5).toFixed(1)} ⭐
                            </Badge>
                          ) : c.status === "Concluído" ? (
                            <span className="text-[10px] text-muted-foreground italic">Pendente</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-semibold gap-1 hover:bg-amber-50 hover:text-amber-800 dark:hover:bg-amber-950"
                            onClick={() => handleOpenDetalhes(c)}
                          >
                            <Eye className="w-3.5 h-3.5" /> Atender
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Triagem & Atendimento de Facilities */}
      <Dialog open={!!selectedChamado} onOpenChange={(open) => { if (!open) setSelectedChamado(null); }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          {selectedChamado && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-sm font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                    {selectedChamado.numero_solicitacao}
                  </span>
                  <Badge className={statusColors[editFormData.status] || "bg-gray-100"}>
                    {editFormData.status}
                  </Badge>
                  <Badge className={prioridadeColors[editFormData.prioridade_definida] || "bg-gray-100"}>
                    Prioridade: {editFormData.prioridade_definida}
                  </Badge>
                  {selectedChamado.necessita_parada_area && (
                    <Badge variant="destructive" className="bg-orange-600 text-white font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Requer Parada de Área
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl font-bold">
                  {selectedChamado.tipo_servico} · {selectedChamado.local_ocorrencia}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Solicitado por <strong>{selectedChamado.solicitante_nome}</strong> ({selectedChamado.area_departamento}) em {selectedChamado.created_date ? format(parseISO(selectedChamado.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSalvarAlteracoes} className="space-y-6 pt-2">
                
                {/* Detalhes do Pedido do Colaborador */}
                <div className="bg-muted/40 rounded-xl p-4 space-y-3 border border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Solicitante:</span>
                      <p className="font-semibold text-foreground">{selectedChamado.solicitante_nome}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">E-mail:</span>
                      <p className="font-semibold text-foreground">{selectedChamado.email || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Telefone / Ramal:</span>
                      <p className="font-semibold text-foreground">{selectedChamado.telefone_ramal || "—"}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Descrição da Solicitação:</span>
                    <p className="text-sm text-foreground whitespace-pre-wrap mt-1 bg-card p-3 rounded-lg border border-border">
                      {selectedChamado.descricao}
                    </p>
                  </div>

                  {selectedChamado.tipo_servico_outro && (
                    <p className="text-xs text-amber-800 bg-amber-50 dark:bg-amber-950/40 p-2 rounded">
                      <strong>Especificação Outros:</strong> {selectedChamado.tipo_servico_outro}
                    </p>
                  )}

                  {selectedChamado.necessita_parada_area && (
                    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 rounded-lg p-3 text-xs text-orange-900 dark:text-orange-200">
                      <strong>⚠️ Parada de Área Solicitada:</strong> {selectedChamado.periodo_parada || "Sem período informado"}
                    </div>
                  )}

                  {/* Anexos originais */}
                  {Array.isArray(selectedChamado.anexos) && selectedChamado.anexos.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Anexos / Fotos do Solicitante ({selectedChamado.anexos.length}):</span>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {selectedChamado.anexos.map((anx, i) => (
                          <a
                            key={i}
                            href={anx.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-card hover:bg-muted p-2 rounded-lg border border-border text-xs text-blue-600 dark:text-blue-400 font-medium transition-colors"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[200px]">{anx.file_name || `Anexo ${i + 1}`}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bloco de Triagem & Atribuição de Facilities */}
                <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 rounded-xl p-5 space-y-4">
                  <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-700" /> Triagem & Planejamento Operacional
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Categoria Confirmada</Label>
                      <Select
                        value={editFormData.categoria_confirmada}
                        onValueChange={(val) => setEditFormData(p => ({ ...p, categoria_confirmada: val }))}
                      >
                        <SelectTrigger className="mt-1 bg-white dark:bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_SERVICO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Prioridade Operacional</Label>
                      <Select
                        value={editFormData.prioridade_definida}
                        onValueChange={(val) => setEditFormData(p => ({ ...p, prioridade_definida: val }))}
                      >
                        <SelectTrigger className="mt-1 bg-white dark:bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Baixa">Baixa</SelectItem>
                          <SelectItem value="Média">Média</SelectItem>
                          <SelectItem value="Alta">Alta</SelectItem>
                          <SelectItem value="Crítica">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Prazo de Atendimento / Previsão</Label>
                      <Input
                        placeholder="Ex: 24h / Até 18/09 às 17h"
                        value={editFormData.prazo_atendimento}
                        onChange={(e) => setEditFormData(p => ({ ...p, prazo_atendimento: e.target.value }))}
                        className="mt-1 bg-white dark:bg-background"
                      />
                    </div>
                  </div>

                  {/* Atribuição: Interno vs Terceiro */}
                  <div className="pt-3 border-t border-amber-200/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase text-amber-900 dark:text-amber-200">Tipo de Execução</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={!editFormData.terceiro_envolvido ? "default" : "outline"}
                          className={!editFormData.terceiro_envolvido ? "bg-amber-700 text-white font-semibold" : ""}
                          onClick={() => setEditFormData(p => ({ ...p, terceiro_envolvido: false, tratamento: "Executado internamente" }))}
                        >
                          Execução Interna
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={editFormData.terceiro_envolvido ? "default" : "outline"}
                          className={editFormData.terceiro_envolvido ? "bg-blue-600 text-white font-semibold" : ""}
                          onClick={() => setEditFormData(p => ({ ...p, terceiro_envolvido: true, tratamento: "Encaminhado para fornecedor" }))}
                        >
                          Fornecedor Terceiro
                        </Button>
                      </div>
                    </div>

                    {!editFormData.terceiro_envolvido ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Responsável pela Execução (Colaborador)</Label>
                          <Select
                            value={editFormData.responsavel_execucao_nome}
                            onValueChange={(val) => setEditFormData(p => ({ ...p, responsavel_execucao_nome: val }))}
                          >
                            <SelectTrigger className="mt-1 bg-white dark:bg-background">
                              <SelectValue placeholder="Selecione o colaborador" />
                            </SelectTrigger>
                            <SelectContent>
                              {colaboradores.map(col => (
                                <SelectItem key={col.id} value={col.nome_completo}>{col.nome_completo} ({col.area || 'Geral'})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Responsável pela Triagem</Label>
                          <Input
                            value={editFormData.responsavel_analise_nome}
                            onChange={(e) => setEditFormData(p => ({ ...p, responsavel_analise_nome: e.target.value }))}
                            className="mt-1 bg-white dark:bg-background"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 rounded-xl p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs font-semibold text-blue-900 dark:text-blue-300">Empresa Terceira / Prestador</Label>
                            <Input
                              placeholder="Nome da empresa ou prestador"
                              value={editFormData.terceiro_empresa}
                              onChange={(e) => setEditFormData(p => ({ ...p, terceiro_empresa: e.target.value }))}
                              className="mt-1 bg-white dark:bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold text-blue-900 dark:text-blue-300">Nº Chamado / OS no Terceiro</Label>
                            <Input
                              placeholder="Ex: OS-9842"
                              value={editFormData.terceiro_numero_chamado}
                              onChange={(e) => setEditFormData(p => ({ ...p, terceiro_numero_chamado: e.target.value }))}
                              className="mt-1 bg-white dark:bg-background font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold text-blue-900 dark:text-blue-300">Valor do Orçamento (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={editFormData.orcamento_valor}
                              onChange={(e) => setEditFormData(p => ({ ...p, orcamento_valor: e.target.value }))}
                              className="mt-1 bg-white dark:bg-background"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status do Chamado */}
                  <div className="pt-3 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Alterar Status</Label>
                      <Select
                        value={editFormData.status}
                        onValueChange={(val) => setEditFormData(p => ({ ...p, status: val }))}
                      >
                        <SelectTrigger className="mt-1 bg-white dark:bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aberto">Aberto</SelectItem>
                          <SelectItem value="Em Análise">Em Análise</SelectItem>
                          <SelectItem value="Em Execução">Em Execução</SelectItem>
                          <SelectItem value="Aguardando Orçamento">Aguardando Orçamento</SelectItem>
                          <SelectItem value="Concluído">Concluído</SelectItem>
                          <SelectItem value="Cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Observação para o Histórico (opcional)</Label>
                      <Input
                        placeholder="Ex: Agendado técnico para amanhã às 09h..."
                        value={novoComentarioHistorico}
                        onChange={(e) => setNovoComentarioHistorico(e.target.value)}
                        className="mt-1 bg-white dark:bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Parecer de Conclusão / Serviço Executado */}
                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" /> Parecer de Execução & Conclusão
                  </h3>
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Descrição do Serviço Executado *</Label>
                    <Textarea
                      placeholder="Descreva detalhadamente o serviço realizado (peças trocadas, limpeza concluída, reparo de vazamento efetuado, teste operacional realizado com sucesso...)"
                      rows={3}
                      value={editFormData.descricao_servico_executado}
                      onChange={(e) => setEditFormData(p => ({ ...p, descricao_servico_executado: e.target.value }))}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Este texto será enviado por e-mail ao solicitante junto ao link da pesquisa de satisfação.</p>
                  </div>

                  {/* Upload de Anexos da Etapa (OS, Fotos pós-serviço) */}
                  <div className="pt-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                      <Paperclip className="w-3.5 h-3.5 text-amber-600" /> Anexar Documentos desta Etapa (OS assinada, foto pós-serviço, NF, laudo)
                    </Label>
                    <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-muted/40 transition-colors mt-1.5">
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        disabled={uploadingAnexo}
                        onChange={async (e) => {
                          const files = Array.from(e.target.files);
                          if (!files.length) return;
                          setUploadingAnexo(true);
                          const novos = [...novosAnexosEtapa];
                          for (const file of files) {
                            try {
                              const { file_url } = await base44.integrations.Core.UploadFile({ file });
                              novos.push({
                                file_url,
                                file_name: file.name,
                                file_type: file.type.startsWith('image') ? 'imagem' : 'arquivo',
                                mime_type: file.type
                              });
                            } catch (err) {
                              console.error("Erro upload:", err);
                            }
                          }
                          setNovosAnexosEtapa(novos);
                          setUploadingAnexo(false);
                          e.target.value = "";
                        }}
                      />
                      {uploadingAnexo ? (
                        <><Loader2 className="w-4 h-4 animate-spin text-amber-600" /><span className="text-xs text-amber-600">Enviando...</span></>
                      ) : (
                        <><Paperclip className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Clique para adicionar anexos a esta etapa</span></>
                      )}
                    </label>

                    {novosAnexosEtapa.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {novosAnexosEtapa.map((a, i) => (
                          <div key={i} className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs px-2 py-1 rounded border border-amber-200">
                            <span>📎 {a.file_name}</span>
                            <button type="button" onClick={() => setNovosAnexosEtapa(p => p.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pesquisa de Satisfação Respondida (se houver) */}
                {selectedChamado.satisfacao_respondida && (
                  <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> Resultado da Pesquisa de Satisfação
                      </h4>
                      <Badge className="bg-amber-600 text-white font-bold text-xs">
                        Nota Geral: {Number(selectedChamado.avaliacao_nota_geral || 5).toFixed(1)} ⭐
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                      <div className="bg-white dark:bg-background p-2 rounded border">
                        <span className="text-muted-foreground">Tempo Resolução:</span>
                        <p className="font-bold text-amber-700">{selectedChamado.avaliacao_tempo_resolucao || 5} ⭐</p>
                      </div>
                      <div className="bg-white dark:bg-background p-2 rounded border">
                        <span className="text-muted-foreground">Atendimento:</span>
                        <p className="font-bold text-amber-700">{selectedChamado.avaliacao_qualidade_atendimento || 5} ⭐</p>
                      </div>
                      <div className="bg-white dark:bg-background p-2 rounded border">
                        <span className="text-muted-foreground">Qualidade Solução:</span>
                        <p className="font-bold text-amber-700">{selectedChamado.avaliacao_qualidade_solucao || 5} ⭐</p>
                      </div>
                      <div className="bg-white dark:bg-background p-2 rounded border">
                        <span className="text-muted-foreground">Comunicação:</span>
                        <p className="font-bold text-amber-700">{selectedChamado.avaliacao_comunicacao || 5} ⭐</p>
                      </div>
                    </div>
                    {selectedChamado.avaliacao_comentario && (
                      <p className="text-xs text-amber-900 dark:text-amber-200 bg-white dark:bg-background p-2.5 rounded border italic mt-1">
                        "{selectedChamado.avaliacao_comentario}"
                      </p>
                    )}
                  </div>
                )}

                {/* Linha do Tempo / Histórico de Eventos */}
                <div className="border border-border rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Linha do Tempo e Histórico de Etapas
                  </h4>

                  {(!Array.isArray(selectedChamado.historico) || selectedChamado.historico.length === 0) ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum evento registrado ainda.</p>
                  ) : (
                    <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-amber-200 dark:before:bg-amber-900">
                      {selectedChamado.historico.map((h, i) => (
                        <div key={i} className="relative bg-card border border-border rounded-lg p-3 text-xs shadow-sm space-y-1">
                          <div className="absolute -left-[21px] top-3.5 w-2.5 h-2.5 rounded-full bg-amber-600 border-2 border-background ring-2 ring-amber-100 dark:ring-amber-950" />
                          <div className="flex items-center justify-between flex-wrap gap-1 border-b border-border pb-1.5 mb-1.5">
                            <span className="font-semibold text-foreground">{h.usuario_nome || h.usuario || 'Sistema'}</span>
                            <span className="text-muted-foreground font-mono text-[11px]">
                              {h.data_hora ? format(parseISO(h.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                            </span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">{h.descricao}</p>

                          {Array.isArray(h.anexos) && h.anexos.length > 0 && (
                            <div className="pt-2 border-t border-border mt-2">
                              <p className="font-semibold text-[11px] text-foreground mb-1 flex items-center gap-1">
                                <Paperclip className="w-3 h-3 text-amber-600" /> Anexos desta etapa:
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {h.anexos.map((anx, idx) => (
                                  <a
                                    key={idx}
                                    href={anx.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 px-2.5 py-1 rounded border border-amber-200 text-[11px] font-medium transition-colors"
                                  >
                                    <span>📎</span>
                                    <span>{anx.file_name || `Anexo ${idx + 1}`}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t">
                  <Button type="button" variant="outline" onClick={() => setSelectedChamado(null)}>
                    Fechar
                  </Button>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {selectedChamado.status !== "Concluído" && (
                      <Button
                        type="button"
                        onClick={handleConcluirSolicitacao}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold gap-1.5"
                        disabled={updateMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4" /> Concluir & Disparar Pesquisa
                      </Button>
                    )}
                    <Button
                      type="submit"
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
