import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Headset, Copy, Check, Eye, Laptop, Star, Clock, Send, Zap, Info, Plus, Trash2, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, parseISO, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

// ────────────────────────────────────────────────
// Calcula minutos úteis entre dois Date (seg-sex, 07:42-17:30)
// ────────────────────────────────────────────────
function calcularMinutosUteis(inicio, fim) {
  if (!inicio || !fim || fim <= inicio) return 0;
  const INICIO_MIN = 7 * 60 + 42; // 07:42
  const FIM_MIN = 17 * 60 + 30;   // 17:30
  let total = 0;
  const cur = new Date(inicio);
  cur.setSeconds(0, 0);

  while (cur < fim) {
    const dow = cur.getDay();
    if (dow >= 1 && dow <= 5) {
      const diaInicio = new Date(cur);
      diaInicio.setHours(0, 0, 0, 0);
      const expInicio = new Date(diaInicio.getTime() + INICIO_MIN * 60000);
      const expFim = new Date(diaInicio.getTime() + FIM_MIN * 60000);
      const segInicio = cur < expInicio ? expInicio : cur;
      const nextDay = new Date(diaInicio.getTime() + 24 * 60 * 60000);
      const segFim = fim < expFim ? fim : (nextDay < expFim ? nextDay : expFim);
      if (segFim > segInicio) {
        total += Math.round((segFim - segInicio) / 60000);
      }
    }
    // Avança para início do próximo dia
    const nextDay = new Date(cur);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    cur.setTime(nextDay.getTime());
  }
  return total;
}

function formatMinutos(m) {
  if (!m || m <= 0) return "-";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min > 0 ? `${h}h ${min}min` : `${h}h`;
}

export default function Chamados() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriodo, setFilterPeriodo] = useState("todos");
  const [filterPeriodoInicio, setFilterPeriodoInicio] = useState("");
  const [filterPeriodoFim, setFilterPeriodoFim] = useState("");
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [originalChamado, setOriginalChamado] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAvaliacao, setShowAvaliacao] = useState(false);
  const [activeTab, setActiveTab] = useState("abertos");
  const [modalTab, setModalTab] = useState("detalhes");
  const [avaliacao, setAvaliacao] = useState({ tempo_resolucao: 5, qualidade_atendimento: 5, qualidade_solucao: 5, comunicacao: 5, comentario: "" });
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [novaMsg, setNovaMsg] = useState("");
  const [testeLembreteLoading, setTesteLembreteLoading] = useState(false);
  const [testeLembreteResult, setTesteLembreteResult] = useState(null);

  // Iniciar Atendimento — formulário terceiro
  const [showIniciarForm, setShowIniciarForm] = useState(false);
  const [iniciarChamado, setIniciarChamado] = useState(null);
  const [terceiroDados, setTerceiroDados] = useState({ terceiro_envolvido: null, terceiro_empresa: "", terceiro_numero_chamado: "", terceiro_data_abertura: "" });

  // Projeto / Terceiro
  const [novoMarco, setNovoMarco] = useState({ data: "", descricao: "", status: "Pendente" });
  const [novoEnvolvido, setNovoEnvolvido] = useState("");
  const [uploadingAprovacao, setUploadingAprovacao] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await base44.auth.me();
        setCurrentUser(u);
        setUser(u);
      } catch {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const publicUrl = `${window.location.origin}${createPageUrl("chamado-publico")}`;

  const { data: chamados = [], isLoading } = useQuery({
    queryKey: ['chamados'],
    queryFn: () => base44.entities.Chamados.list('-created_date'),
    enabled: !!user,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['chamados_chat', selectedChamado?.id],
    queryFn: () => base44.entities.ChamadosChat.filter({ chamado_id: selectedChamado?.id }, 'data_hora'),
    enabled: !!selectedChamado?.id,
    refetchInterval: 2000,
  });

  const enviarMsgMutation = useMutation({
    mutationFn: async ({ msg }) => {
      const chatMsg = await base44.entities.ChamadosChat.create({
        chamado_id: selectedChamado.id,
        tipo_remetente: "admin",
        remetente_nome: currentUser.full_name,
        remetente_email: currentUser.email,
        mensagem: msg,
        data_hora: new Date().toISOString(),
      });
      base44.functions.invoke('sendEmailChatMessage', { chamado_id: selectedChamado.id, tipo_remetente: 'admin', remetente_nome: currentUser.full_name, mensagem: msg }).catch(() => {});
      return chatMsg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados_chat', selectedChamado?.id] });
      setNovaMsg("");
    },
  });

  const updateChamadoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Chamados.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chamados'] }),
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDetails = (chamado) => {
    setSelectedChamado(chamado);
    setOriginalChamado(JSON.parse(JSON.stringify(chamado)));
    setShowDetails(true);
    setModalTab("detalhes");
    setShowAvaliacao(false);
  };

  const handleSaveChanges = async () => {
    if (!selectedChamado || !originalChamado || !currentUser) return;
    const historico = selectedChamado.historico || [];
    const nomeExibicao = currentUser.full_name;
    if (selectedChamado.solucao !== originalChamado.solucao && selectedChamado.solucao) {
      historico.push({ data_hora: new Date().toISOString(), tipo: "solucao", descricao: `Solução registrada por ${nomeExibicao}: ${selectedChamado.solucao}`, usuario: nomeExibicao });
    }
    if (selectedChamado.responsavel !== originalChamado.responsavel && selectedChamado.responsavel) {
      historico.push({ data_hora: new Date().toISOString(), tipo: "responsavel", descricao: `Responsável alterado para: ${selectedChamado.responsavel}`, usuario: nomeExibicao });
    }
    await base44.entities.Chamados.update(selectedChamado.id, { ...selectedChamado, historico });
    queryClient.invalidateQueries({ queryKey: ['chamados'] });
    setShowDetails(false);
  };

  // ── Iniciar Atendimento: abre formulário ──
  const handleClickIniciarAtendimento = (chamado) => {
    setIniciarChamado(chamado);
    setTerceiroDados({ terceiro_envolvido: null, terceiro_empresa: "", terceiro_numero_chamado: "", terceiro_data_abertura: "" });
    setShowIniciarForm(true);
  };

  const handleConfirmarIniciar = async () => {
    if (terceiroDados.terceiro_envolvido === null) return;
    const chamado = iniciarChamado;
    const agora = new Date().toISOString();
    const nomeExibicao = currentUser.full_name;
    const historico = [...(chamado.historico || [])];
    historico.push({ data_hora: agora, tipo: "inicio_atendimento", descricao: `Atendimento iniciado por ${nomeExibicao}`, usuario: nomeExibicao });

    const dataAtualizada = {
      ...chamado,
      data_inicio_atendimento: agora,
      status: "Em Andamento",
      responsavel: nomeExibicao,
      historico,
      terceiro_envolvido: terceiroDados.terceiro_envolvido,
      tipo_resolucao: terceiroDados.terceiro_envolvido ? "Terceiro" : "Interno",
      ...(terceiroDados.terceiro_envolvido ? {
        terceiro_empresa: terceiroDados.terceiro_empresa,
        terceiro_numero_chamado: terceiroDados.terceiro_numero_chamado,
        terceiro_data_abertura: terceiroDados.terceiro_data_abertura ? new Date(terceiroDados.terceiro_data_abertura).toISOString() : null,
      } : {}),
    };

    setSelectedChamado(dataAtualizada);
    setShowIniciarForm(false);
    await base44.entities.Chamados.update(chamado.id, dataAtualizada);
    base44.functions.invoke('sendEmailTicketStarted', { chamado_id: chamado.id, responsavel: nomeExibicao }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['chamados'] });
  };

  const handleFinalizarAtendimento = async (chamado) => {
    if (!currentUser) return;
    const agora = new Date().toISOString();
    const historico = [...(chamado.historico || [])];
    const nomeExibicao = currentUser.full_name;

    // Tempo corrido
    let tempo_total_minutos = null;
    let tempo_util_minutos = null;
    let tempo_resolucao_minutos = null;

    if (chamado.data_inicio_atendimento) {
      const inicio = new Date(chamado.data_inicio_atendimento);
      const fim = new Date(agora);
      tempo_total_minutos = Math.round((fim - inicio) / 60000);

      if (chamado.tipo_resolucao === "Terceiro" && chamado.terceiro_data_abertura) {
        // TI responsável apenas até repasse
        const repasse = new Date(chamado.terceiro_data_abertura);
        tempo_util_minutos = calcularMinutosUteis(inicio, repasse < fim ? repasse : fim);
      } else {
        tempo_util_minutos = calcularMinutosUteis(inicio, fim);
      }
      tempo_resolucao_minutos = tempo_util_minutos;
    }

    historico.push({ data_hora: agora, tipo: "conclusao", descricao: `Atendimento finalizado por ${nomeExibicao}. Aguardando avaliação.`, usuario: nomeExibicao });

    await base44.entities.Chamados.update(chamado.id, {
      ...chamado,
      data_conclusao: agora,
      status: "Aguardando Avaliação",
      tempo_resolucao_minutos,
      tempo_util_minutos,
      tempo_total_minutos,
      historico
    });

    if (chamado.solicitante_email) {
      base44.functions.invoke('sendEmailTicketClosed', { chamado_id: chamado.id, responsavel: nomeExibicao }).catch(() => {});
    }

    queryClient.invalidateQueries({ queryKey: ['chamados'] });
    setShowDetails(false);
  };

  const handleSalvarAvaliacao = () => {
    if (!selectedChamado) return;
    const nota_geral = (avaliacao.tempo_resolucao + avaliacao.qualidade_atendimento + avaliacao.qualidade_solucao + avaliacao.comunicacao) / 4;
    const historico = [...(selectedChamado.historico || [])];
    historico.push({ data_hora: new Date().toISOString(), tipo: "avaliacao", descricao: `Avaliado com nota ${nota_geral.toFixed(1)}/5`, usuario: selectedChamado.solicitante_nome });
    updateChamadoMutation.mutate({
      id: selectedChamado.id,
      data: { ...selectedChamado, avaliacao_tempo_resolucao: avaliacao.tempo_resolucao, avaliacao_qualidade_atendimento: avaliacao.qualidade_atendimento, avaliacao_qualidade_solucao: avaliacao.qualidade_solucao, avaliacao_comunicacao: avaliacao.comunicacao, avaliacao_nota_geral: nota_geral, avaliacao_comentario: avaliacao.comentario, avaliacao_data: new Date().toISOString(), status: "Resolvido", historico }
    });
    setShowAvaliacao(false);
  };

  const handleTestarLembrete = async () => {
    setTesteLembreteLoading(true);
    setTesteLembreteResult(null);
    try {
      const res = await base44.functions.invoke('lembreteAvaliacao', {});
      setTesteLembreteResult(res.data);
    } catch (e) {
      setTesteLembreteResult({ error: e.message });
    } finally {
      setTesteLembreteLoading(false);
    }
  };

  // ── Projeto/Terceiro helpers ──
  const handleAdicionarMarco = () => {
    if (!novoMarco.descricao) return;
    const marcos = [...(selectedChamado.projeto_marcos || []), { ...novoMarco, data: novoMarco.data || new Date().toISOString().split('T')[0] }];
    setSelectedChamado({ ...selectedChamado, projeto_marcos: marcos });
    setNovoMarco({ data: "", descricao: "", status: "Pendente" });
  };

  const handleAdicionarEnvolvido = () => {
    if (!novoEnvolvido.trim()) return;
    const envolvidos = [...(selectedChamado.projeto_envolvidos || []), novoEnvolvido.trim()];
    setSelectedChamado({ ...selectedChamado, projeto_envolvidos: envolvidos });
    setNovoEnvolvido("");
  };

  const handleUploadAprovacao = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAprovacao(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const aprovacoes = [...(selectedChamado.projeto_aprovacoes || []), { file_url, file_name: file.name }];
    setSelectedChamado({ ...selectedChamado, projeto_aprovacoes: aprovacoes });
    setUploadingAprovacao(false);
    e.target.value = "";
  };

  // ── Filtros de período ──
  const getChamadosFiltradosPeriodo = (lista) => {
    if (filterPeriodo === "todos") return lista;
    const agora = new Date();
    if (filterPeriodo === "7d") return lista.filter(c => c.data_abertura && isAfter(parseISO(c.data_abertura), subDays(agora, 7)));
    if (filterPeriodo === "30d") return lista.filter(c => c.data_abertura && isAfter(parseISO(c.data_abertura), subDays(agora, 30)));
    if (filterPeriodo === "90d") return lista.filter(c => c.data_abertura && isAfter(parseISO(c.data_abertura), subDays(agora, 90)));
    if (filterPeriodo === "custom" && filterPeriodoInicio && filterPeriodoFim) {
      const ini = parseISO(filterPeriodoInicio);
      const fim = parseISO(filterPeriodoFim);
      return lista.filter(c => c.data_abertura && isAfter(parseISO(c.data_abertura), ini) && !isAfter(parseISO(c.data_abertura), fim));
    }
    return lista;
  };

  const chamadosAbertos = chamados.filter(c => c.status === "Aberto" || c.status === "Em Análise" || !c.responsavel);
  const chamadosGeral = chamados.filter(c => c.status === "Resolvido");
  const responsaveis = [...new Set(chamados.filter(c => c.responsavel && c.status !== "Aberto").map(c => c.responsavel))].sort();
  const getChamadosPorResponsavel = (r) => chamados.filter(c => c.responsavel === r);
  const getChamadosAbaAtiva = () => {
    if (activeTab === "abertos") return chamadosAbertos;
    if (activeTab === "geral") return chamadosGeral;
    return getChamadosPorResponsavel(activeTab);
  };

  const chamadosAbaAtiva = getChamadosFiltradosPeriodo(getChamadosAbaAtiva());
  const chamadosAvaliadosAba = chamadosAbaAtiva.filter(c => c.avaliacao_data);

  const mediaAvaliacoes = {
    geral: chamadosAvaliadosAba.length > 0 ? chamadosAvaliadosAba.reduce((a, c) => a + (c.avaliacao_nota_geral || 0), 0) / chamadosAvaliadosAba.length : 0,
  };

  // Tempo Médio INTERNO (exclui terceiros)
  const chamadosResolvidos = chamadosAbaAtiva.filter(c => c.status === "Resolvido" && (c.tempo_util_minutos || c.tempo_resolucao_minutos) && c.tipo_resolucao !== "Terceiro");
  const tempoMedioUtil = chamadosResolvidos.length > 0
    ? chamadosResolvidos.reduce((a, c) => a + (c.tempo_util_minutos || c.tempo_resolucao_minutos || 0), 0) / chamadosResolvidos.length
    : 0;

  // Tempo Médio TERCEIROS
  const chamadosTerceirosResolvidos = chamadosAbaAtiva.filter(c => c.status === "Resolvido" && (c.tempo_util_minutos || c.tempo_resolucao_minutos) && c.tipo_resolucao === "Terceiro");
  const tempoMedioTerceiros = chamadosTerceirosResolvidos.length > 0
    ? chamadosTerceirosResolvidos.reduce((a, c) => a + (c.tempo_util_minutos || c.tempo_resolucao_minutos || 0), 0) / chamadosTerceirosResolvidos.length
    : 0;

  const resolvidosSemAvaliacao = chamadosAbaAtiva.filter(c => c.status === "Resolvido" && !c.avaliacao_data);

  const stats = {
    total: chamadosAbaAtiva.length,
    abertos: chamadosAbaAtiva.filter(c => c.status === "Aberto").length,
    emAndamento: chamadosAbaAtiva.filter(c => c.status === "Em Andamento").length,
    aguardandoAvaliacao: chamadosAbaAtiva.filter(c => c.status === "Aguardando Avaliação").length,
    resolvidos: chamadosAbaAtiva.filter(c => c.status === "Resolvido").length,
    avaliados: chamadosAvaliadosAba.length,
    tempoMedioUtil,
    tempoMedioTerceiros,
    resolvidosSemAvaliacao: resolvidosSemAvaliacao.length,
    totalTerceiros: chamadosTerceirosResolvidos.length,
  };

  // Top Solicitantes
  const countBy = (arr, key) => arr.reduce((acc, c) => { const v = c[key] || "—"; acc[v] = (acc[v] || 0) + 1; return acc; }, {});
  const topColaboradores = Object.entries(countBy(chamadosAbaAtiva, "solicitante_nome")).sort((a,b) => b[1]-a[1]).slice(0,5);
  const topSetores = Object.entries(countBy(chamadosAbaAtiva, "solicitante_area")).sort((a,b) => b[1]-a[1]).slice(0,5);
  const maxColaborador = topColaboradores[0]?.[1] || 1;
  const maxSetor = topSetores[0]?.[1] || 1;

  const getTipoCompleto = (chamado) => {
    let d = chamado.tipo_solicitacao || "";
    if (chamado.tipo_solicitacao === "Sistema") { if (chamado.sistema_tipo) d += ` - ${chamado.sistema_tipo}`; if (chamado.sistema_subtipo) d += ` (${chamado.sistema_subtipo})`; }
    else if (chamado.tipo_solicitacao === "Impressora" && chamado.impressora_subtipo) d += ` - ${chamado.impressora_subtipo}`;
    else if (chamado.tipo_solicitacao === "Equipamento" && chamado.equipamento_subtipo) d += ` - ${chamado.equipamento_subtipo}`;
    else if (chamado.tipo_solicitacao === "Servidor" && chamado.servidor_subtipo) d += ` - ${chamado.servidor_subtipo}`;
    return d;
  };

  const calcularTempoAtendimento = (chamado) => {
    if (!chamado.data_inicio_atendimento) return null;
    const inicio = new Date(chamado.data_inicio_atendimento);
    const fim = chamado.data_conclusao ? new Date(chamado.data_conclusao) : new Date();
    const minutos = Math.round((fim - inicio) / 60000);
    return formatMinutos(minutos);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!user) return null;

  const renderChamadosTable = (lista) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº Chamado</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>Abertura</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Urgência</TableHead>
            <TableHead>Tempo Atend.</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Avaliação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500">Nenhum chamado encontrado</TableCell></TableRow>
          ) : lista.map(chamado => (
            <TableRow key={chamado.id}>
              <TableCell className="font-mono text-sm">{chamado.numero_chamado}</TableCell>
              <TableCell>
                <div><p className="font-medium">{chamado.solicitante_nome}</p><p className="text-sm text-gray-500">{chamado.solicitante_area}</p></div>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {chamado.data_abertura ? format(parseISO(chamado.data_abertura), "dd/MM/yyyy") : "—"}
              </TableCell>
              <TableCell>
                <div className="max-w-[200px]">
                  <p className="text-sm font-medium truncate">{chamado.titulo_chamado || getTipoCompleto(chamado)}</p>
                  <p className="text-xs text-gray-500 truncate">{getTipoCompleto(chamado)}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={chamado.urgencia === "Urgente" ? "bg-red-100 text-red-800" : chamado.urgencia === "Alta" ? "bg-orange-100 text-orange-800" : chamado.urgencia === "Média" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}>{chamado.urgencia}</Badge>
              </TableCell>
              <TableCell><span className="font-medium text-gray-900">{calcularTempoAtendimento(chamado) || <span className="text-gray-400 text-sm">-</span>}</span></TableCell>
              <TableCell>
                <Badge className={chamado.status === "Aberto" ? "bg-red-100 text-red-800" : chamado.status === "Em Andamento" ? "bg-blue-100 text-blue-800" : chamado.status === "Aguardando Avaliação" ? "bg-orange-100 text-orange-800" : chamado.status === "Resolvido" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{chamado.status}</Badge>
              </TableCell>
              <TableCell>
                {chamado.avaliacao_nota_geral ? <div className="flex items-center gap-1"><span className="text-yellow-600 font-medium">{chamado.avaliacao_nota_geral.toFixed(1)}</span><span className="text-yellow-500">⭐</span></div> : <span className="text-gray-400 text-sm">-</span>}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => handleOpenDetails(chamado)}><Eye className="w-4 h-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center"><Headset className="w-6 h-6 text-orange-600" /></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Chamados de Suporte</h1>
              <p className="text-muted-foreground mt-1">Gerenciar solicitações de suporte</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600 font-mono truncate max-w-xs">{publicUrl}</span>
              <Button size="sm" variant="ghost" onClick={handleCopyLink}>{copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}</Button>
            </div>
            <Button size="sm" variant="outline" onClick={handleTestarLembrete} disabled={testeLembreteLoading} className="gap-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              {testeLembreteLoading ? "Disparando..." : "Testar Lembrete de Avaliação"}
            </Button>
            {testeLembreteResult && (
              <div className="text-xs bg-gray-50 border rounded p-2">
                {testeLembreteResult.error ? <span className="text-red-600">Erro: {testeLembreteResult.error}</span>
                  : <span className="text-green-700">✅ {testeLembreteResult.enviados} enviados, {testeLembreteResult.pulados} pulados (anti-spam). Total aguardando: {testeLembreteResult.total_aguardando}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Filtro de período */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Label className="text-sm font-medium">Período:</Label>
          {["todos","7d","30d","90d","custom"].map(p => (
            <Button key={p} size="sm" variant={filterPeriodo === p ? "default" : "outline"} onClick={() => setFilterPeriodo(p)}>
              {p === "todos" ? "Todos" : p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : p === "90d" ? "90 dias" : "Personalizado"}
            </Button>
          ))}
          {filterPeriodo === "custom" && (
            <div className="flex items-center gap-2">
              <Input type="date" value={filterPeriodoInicio} onChange={e => setFilterPeriodoInicio(e.target.value)} className="w-36 h-8 text-sm" />
              <span className="text-sm">até</span>
              <Input type="date" value={filterPeriodoFim} onChange={e => setFilterPeriodoFim(e.target.value)} className="w-36 h-8 text-sm" />
            </div>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-2">
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Total</p><p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Abertos</p><p className="text-3xl font-bold text-red-600 mt-1">{stats.abertos}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Em Andamento</p><p className="text-3xl font-bold text-blue-600 mt-1">{stats.emAndamento}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Aguard. Avaliação</p><p className="text-3xl font-bold text-orange-600 mt-1">{stats.aguardandoAvaliacao}</p></div></CardContent></Card>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-4">
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Resolvidos</p><p className="text-3xl font-bold text-green-600 mt-1">{stats.resolvidos}</p></div></CardContent></Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm text-gray-600">Tempo Médio (Interno)</p>
                  <span title="Calculado apenas em horas úteis (seg–sex, 07:42–17:30). Exclui chamados de terceiros." className="cursor-help"><Info className="w-3 h-3 text-gray-400" /></span>
                </div>
                <p className="text-xl font-bold text-purple-600 mt-1">{formatMinutos(Math.round(stats.tempoMedioUtil))}</p>
                <p className="text-xs text-gray-400">{chamadosResolvidos.length} chamado(s)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm text-gray-600">Tempo Médio (3º)</p>
                  <span title="Tempo útil da TI até o repasse para a empresa terceira. Chamados com tipo_resolucao=Terceiro." className="cursor-help"><Info className="w-3 h-3 text-gray-400" /></span>
                </div>
                <p className="text-xl font-bold text-indigo-600 mt-1">{stats.totalTerceiros > 0 ? formatMinutos(Math.round(stats.tempoMedioTerceiros)) : "—"}</p>
                <p className="text-xs text-gray-400">{stats.totalTerceiros} chamado(s)</p>
              </div>
            </CardContent>
          </Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Avaliados</p><p className="text-3xl font-bold text-yellow-600 mt-1">{stats.avaliados}</p></div></CardContent></Card>
        </div>

        {/* Top Solicitantes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Top Solicitantes — Por Colaborador</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {topColaboradores.length === 0 ? <p className="text-xs text-gray-400">Sem dados</p> : topColaboradores.map(([nome, qtd]) => (
                <div key={nome} className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 w-36 truncate">{nome}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${(qtd / maxColaborador) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-6 text-right">{qtd}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Top Solicitantes — Por Setor</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {topSetores.length === 0 ? <p className="text-xs text-gray-400">Sem dados</p> : topSetores.map(([setor, qtd]) => (
                <div key={setor} className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 w-36 truncate">{setor}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${(qtd / maxSetor) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-6 text-right">{qtd}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Avaliações */}
        {chamadosAvaliadosAba.length > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
            <CardHeader><CardTitle className="flex items-center gap-2 text-yellow-900"><Star className="w-5 h-5" />Médias de Avaliação — Nota Geral: {mediaAvaliacoes.geral.toFixed(1)} ⭐</CardTitle></CardHeader>
          </Card>
        )}

        {/* Tabela */}
        <Card>
          <CardHeader className="border-b"><CardTitle>Chamados por Responsável</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? <div className="text-center py-8 text-gray-500">Carregando...</div> : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto flex-wrap">
                  <TabsTrigger value="abertos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-600 data-[state=active]:bg-transparent px-6 py-3">Em Aberto ({chamadosAbertos.length})</TabsTrigger>
                  <TabsTrigger value="geral" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent px-6 py-3">Geral ({chamadosGeral.length})</TabsTrigger>
                  {responsaveis.map(r => (
                    <TabsTrigger key={r} value={r} className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3">{r} ({getChamadosPorResponsavel(r).length})</TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="abertos" className="mt-0">{renderChamadosTable(getChamadosFiltradosPeriodo(chamadosAbertos))}</TabsContent>
                <TabsContent value="geral" className="mt-0">{renderChamadosTable(getChamadosFiltradosPeriodo(chamadosGeral))}</TabsContent>
                {responsaveis.map(r => (
                  <TabsContent key={r} value={r} className="mt-0">{renderChamadosTable(getChamadosFiltradosPeriodo(getChamadosPorResponsavel(r)))}</TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Modal Detalhes */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Detalhes do Chamado</DialogTitle></DialogHeader>
            {selectedChamado && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Número</Label><p className="font-mono font-medium">{selectedChamado.numero_chamado}</p></div>
                  <div>
                    <Label>Status</Label>
                    <Badge className={selectedChamado.status === "Aberto" ? "bg-red-100 text-red-800" : selectedChamado.status === "Em Andamento" ? "bg-blue-100 text-blue-800" : selectedChamado.status === "Resolvido" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{selectedChamado.status}</Badge>
                  </div>
                </div>

                {selectedChamado.data_inicio_atendimento && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-blue-700" /><Label className="text-blue-900">Atendimento Iniciado</Label></div>
                    <p className="font-medium text-blue-800">{format(new Date(selectedChamado.data_inicio_atendimento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    {selectedChamado.tipo_resolucao && <p className="text-xs text-blue-700 mt-1">Tipo: <strong>{selectedChamado.tipo_resolucao}</strong></p>}
                    {selectedChamado.terceiro_empresa && <p className="text-xs text-blue-700">Empresa terceira: <strong>{selectedChamado.terceiro_empresa}</strong></p>}
                  </div>
                )}

                <div className="flex gap-3">
                  {!selectedChamado.data_inicio_atendimento && selectedChamado.status !== "Aguardando Avaliação" && selectedChamado.status !== "Resolvido" && (
                    <Button onClick={() => handleClickIniciarAtendimento(selectedChamado)} className="bg-blue-600 hover:bg-blue-700 flex-1">Iniciar Atendimento</Button>
                  )}
                  {selectedChamado.data_inicio_atendimento && selectedChamado.status !== "Aguardando Avaliação" && selectedChamado.status !== "Resolvido" && (
                    <Button onClick={() => handleFinalizarAtendimento(selectedChamado)} className="bg-green-600 hover:bg-green-700 flex-1">Finalizar Atendimento</Button>
                  )}
                </div>

                {selectedChamado.status === "Aguardando Avaliação" && !selectedChamado.avaliacao_data && (
                  <div className="space-y-2">
                    <Alert className="bg-orange-50 border-orange-200"><AlertDescription className="text-orange-800 text-sm"><strong>Aguardando avaliação</strong> do solicitante.</AlertDescription></Alert>
                    <Button onClick={() => setShowAvaliacao(true)} className="w-full bg-yellow-600 hover:bg-yellow-700"><Star className="w-4 h-4 mr-2" />Avaliar Atendimento (Admin)</Button>
                  </div>
                )}

                {showAvaliacao && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-yellow-900 flex items-center gap-2"><Star className="w-4 h-4" />Avalie o Atendimento</h3>
                    {[["tempo_resolucao","Tempo"], ["qualidade_atendimento","Atendimento"], ["qualidade_solucao","Solução"], ["comunicacao","Comunicação"]].map(([campo, label]) => (
                      <div key={campo}>
                        <Label>{label}</Label>
                        <div className="flex gap-2 mt-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setAvaliacao({...avaliacao,[campo]:n})} className={`text-xl ${n <= avaliacao[campo] ? "text-yellow-500" : "text-gray-300"}`}>⭐</button>)}</div>
                      </div>
                    ))}
                    <Textarea value={avaliacao.comentario} onChange={e => setAvaliacao({...avaliacao, comentario: e.target.value})} placeholder="Comentário (opcional)" rows={2} />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowAvaliacao(false)} className="flex-1">Cancelar</Button>
                      <Button onClick={handleSalvarAvaliacao} className="flex-1 bg-yellow-600 hover:bg-yellow-700">Enviar</Button>
                    </div>
                  </div>
                )}

                {/* Tabs do modal */}
                <Tabs value={modalTab} onValueChange={setModalTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="detalhes" className="flex-1">Detalhes</TabsTrigger>
                    <TabsTrigger value="chat" className="flex-1">💬 Chat</TabsTrigger>
                    {selectedChamado.terceiro_envolvido && <TabsTrigger value="projeto" className="flex-1">📋 Projeto / Terceiro</TabsTrigger>}
                    <TabsTrigger value="historico" className="flex-1">Histórico</TabsTrigger>
                  </TabsList>

                  <TabsContent value="detalhes" className="space-y-4 mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h3 className="font-semibold text-blue-900 mb-1">Tipo de Solicitação</h3>
                      <p className="text-sm text-blue-800">{getTipoCompleto(selectedChamado)}</p>
                      {selectedChamado.titulo_chamado && <p className="text-sm font-semibold text-blue-900 mt-2">📌 {selectedChamado.titulo_chamado}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Solicitante</Label><p className="font-medium">{selectedChamado.solicitante_nome}</p><p className="text-sm text-gray-600">{selectedChamado.solicitante_email}</p></div>
                      <div><Label>Área</Label><p className="font-medium">{selectedChamado.solicitante_area}</p></div>
                    </div>
                    {selectedChamado.equipamentos_usuario?.length > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Laptop className="w-4 h-4" />Equipamentos do Usuário</h3>
                        <div className="grid md:grid-cols-2 gap-2">
                          {selectedChamado.equipamentos_usuario.map((eq, i) => <div key={i} className="bg-white rounded p-2 border border-gray-100 text-sm"><Badge variant="outline" className="text-xs mb-1">{eq.tipo}</Badge><p>{eq.marca} {eq.modelo}</p></div>)}
                        </div>
                      </div>
                    )}
                    <div><Label>Descrição</Label><p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedChamado.descricao_problema}</p></div>
                    {selectedChamado.melhorias_detalhes && <div><Label>Detalhes da Melhoria</Label><p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedChamado.melhorias_detalhes}</p></div>}
                    {selectedChamado.desenvolvimento_detalhes && <div><Label>Detalhes do Desenvolvimento</Label><p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedChamado.desenvolvimento_detalhes}</p></div>}
                    <div>
                      <Label>Responsável</Label>
                      <Select value={selectedChamado.responsavel || ""} onValueChange={v => setSelectedChamado({...selectedChamado, responsavel: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{usuarios.map(u => <SelectItem key={u.id} value={u.full_name}>{u.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Solução Aplicada</Label><Textarea value={selectedChamado.solucao || ""} onChange={e => setSelectedChamado({...selectedChamado, solucao: e.target.value})} rows={3} placeholder="Descreva a solução..." /></div>
                    {selectedChamado.tempo_util_minutos && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                        <p className="font-semibold text-purple-900 mb-1">Tempos de Resolução</p>
                        <p>Tempo útil (TI): <strong>{formatMinutos(selectedChamado.tempo_util_minutos)}</strong></p>
                        {selectedChamado.tempo_total_minutos && <p>Tempo total corrido: <strong>{formatMinutos(selectedChamado.tempo_total_minutos)}</strong></p>}
                        {selectedChamado.tipo_resolucao === "Terceiro" && selectedChamado.terceiro_data_abertura && selectedChamado.terceiro_data_resolucao && (
                          <p>Tempo da empresa terceira: <strong>{formatMinutos(Math.round((new Date(selectedChamado.terceiro_data_resolucao) - new Date(selectedChamado.terceiro_data_abertura)) / 60000))}</strong></p>
                        )}
                      </div>
                    )}
                    {selectedChamado.avaliacao_data && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2"><Star className="w-4 h-4" />Avaliação — {selectedChamado.avaliacao_nota_geral?.toFixed(1)} ⭐</h3>
                        {selectedChamado.avaliacao_comentario && <p className="text-sm text-green-800 italic">"{selectedChamado.avaliacao_comentario}"</p>}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="chat" className="mt-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-3 h-64 overflow-y-auto mb-3 space-y-2">
                      {chatMessages.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sem mensagens</p> : chatMessages.map(msg => {
                        const isAdmin = msg.tipo_remetente === "admin";
                        return (
                          <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-lg p-2 text-sm break-words ${isAdmin ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900"}`}>
                              <p className="text-xs font-semibold mb-1">{msg.remetente_nome}</p>
                              {msg.mensagem && <p className="whitespace-pre-wrap">{msg.mensagem}</p>}
                              <p className="text-xs opacity-60 mt-1">{format(new Date(msg.data_hora), "HH:mm")}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <textarea value={novaMsg} onChange={e => setNovaMsg(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (novaMsg.trim()) enviarMsgMutation.mutate({ msg: novaMsg }); } }} placeholder="Mensagem..." rows={1} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" style={{ maxHeight: "100px" }} />
                      <Button onClick={() => { if (novaMsg.trim()) enviarMsgMutation.mutate({ msg: novaMsg }); }} disabled={!novaMsg.trim()} className="bg-blue-600 hover:bg-blue-700" size="sm"><Send className="w-4 h-4" /></Button>
                    </div>
                  </TabsContent>

                  {selectedChamado.terceiro_envolvido && (
                    <TabsContent value="projeto" className="space-y-5 mt-4">
                      {/* Resumo financeiro */}
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <h4 className="font-semibold text-indigo-900 mb-3">Resumo Financeiro</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div><Label>Horas Contratadas</Label><Input type="number" value={selectedChamado.projeto_horas_contratadas || ""} onChange={e => setSelectedChamado({...selectedChamado, projeto_horas_contratadas: +e.target.value})} placeholder="0" /></div>
                          <div><Label>Horas Realizadas</Label><Input type="number" value={selectedChamado.projeto_horas_realizadas || ""} onChange={e => setSelectedChamado({...selectedChamado, projeto_horas_realizadas: +e.target.value})} placeholder="0" /></div>
                          <div><Label>Valor/Hora (R$)</Label><Input type="number" value={selectedChamado.projeto_valor_hora || ""} onChange={e => setSelectedChamado({...selectedChamado, projeto_valor_hora: +e.target.value})} placeholder="0" /></div>
                          <div><Label>Total Estimado</Label><p className="font-bold text-indigo-900 mt-2">R$ {((selectedChamado.projeto_horas_contratadas || 0) * (selectedChamado.projeto_valor_hora || 0)).toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div><Label>Data Abertura (Terceiro)</Label><Input type="datetime-local" value={selectedChamado.terceiro_data_abertura ? selectedChamado.terceiro_data_abertura.slice(0,16) : ""} onChange={e => setSelectedChamado({...selectedChamado, terceiro_data_abertura: e.target.value ? new Date(e.target.value).toISOString() : ""})} /></div>
                          <div><Label>Data Resolução (Terceiro)</Label><Input type="datetime-local" value={selectedChamado.terceiro_data_resolucao ? selectedChamado.terceiro_data_resolucao.slice(0,16) : ""} onChange={e => setSelectedChamado({...selectedChamado, terceiro_data_resolucao: e.target.value ? new Date(e.target.value).toISOString() : ""})} /></div>
                        </div>
                      </div>

                      {/* Marcos */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Marcos do Projeto</h4>
                        {(selectedChamado.projeto_marcos || []).map((m, i) => (
                          <div key={i} className="flex items-center gap-2 bg-gray-50 border rounded p-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${m.status === "Concluído" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{m.status}</span>
                            <span className="text-sm flex-1">{m.descricao}</span>
                            <span className="text-xs text-gray-400">{m.data}</span>
                            <button onClick={() => setSelectedChamado({...selectedChamado, projeto_marcos: selectedChamado.projeto_marcos.filter((_,j)=>j!==i)})} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-2">
                          <Input type="date" value={novoMarco.data} onChange={e => setNovoMarco({...novoMarco, data: e.target.value})} className="w-36" />
                          <Input value={novoMarco.descricao} onChange={e => setNovoMarco({...novoMarco, descricao: e.target.value})} placeholder="Descrição do marco" className="flex-1" />
                          <Select value={novoMarco.status} onValueChange={v => setNovoMarco({...novoMarco, status: v})}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Concluído">Concluído</SelectItem></SelectContent>
                          </Select>
                          <Button size="sm" onClick={handleAdicionarMarco}><Plus className="w-4 h-4" /></Button>
                        </div>
                      </div>

                      {/* Envolvidos */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Envolvidos</h4>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(selectedChamado.projeto_envolvidos || []).map((e, i) => (
                            <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">{e}<button onClick={() => setSelectedChamado({...selectedChamado, projeto_envolvidos: selectedChamado.projeto_envolvidos.filter((_,j)=>j!==i)})} className="text-blue-500 hover:text-red-500">×</button></span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input value={novoEnvolvido} onChange={e => setNovoEnvolvido(e.target.value)} onKeyDown={e => e.key==="Enter" && handleAdicionarEnvolvido()} placeholder="Nome do envolvido" className="flex-1" />
                          <Button size="sm" onClick={handleAdicionarEnvolvido}><Plus className="w-4 h-4" /></Button>
                        </div>
                      </div>

                      {/* Aprovações */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Anexos de Aprovação</h4>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {(selectedChamado.projeto_aprovacoes || []).map((a, i) => (
                            <a key={i} href={a.file_url} target="_blank" rel="noopener noreferrer" className="border rounded p-2 text-xs text-blue-700 hover:bg-gray-50 truncate">📎 {a.file_name}</a>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 rounded p-3 hover:border-indigo-400">
                          <input type="file" className="hidden" disabled={uploadingAprovacao} onChange={handleUploadAprovacao} />
                          {uploadingAprovacao ? <span className="text-sm text-gray-500">Enviando...</span> : <><Upload className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-500">Adicionar arquivo de aprovação</span></>}
                        </label>
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="historico" className="mt-4">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(selectedChamado.historico || []).length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Sem histórico</p>
                        : [...(selectedChamado.historico || [])].reverse().map((h, i) => (
                        <div key={i} className="flex gap-3 text-sm bg-gray-50 rounded p-2">
                          <span className="text-gray-400 whitespace-nowrap">{format(new Date(h.data_hora), "dd/MM HH:mm")}</span>
                          <span className="text-gray-700">{h.descricao}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowDetails(false)}>Cancelar</Button>
                  <Button onClick={handleSaveChanges} className="bg-orange-600 hover:bg-orange-700">Salvar Alterações</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Iniciar Atendimento */}
        <Dialog open={showIniciarForm} onOpenChange={setShowIniciarForm}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Iniciar Atendimento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Este chamado requer acionamento de empresa terceira?</p>
              <div className="flex gap-3">
                <Button variant={terceiroDados.terceiro_envolvido === false ? "default" : "outline"} className="flex-1" onClick={() => setTerceiroDados({...terceiroDados, terceiro_envolvido: false})}>Não — Interno</Button>
                <Button variant={terceiroDados.terceiro_envolvido === true ? "default" : "outline"} className="flex-1" onClick={() => setTerceiroDados({...terceiroDados, terceiro_envolvido: true})}>Sim — Terceiro</Button>
              </div>

              {terceiroDados.terceiro_envolvido === true && (
                <div className="space-y-3 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div><Label>Empresa Terceira</Label><Input value={terceiroDados.terceiro_empresa} onChange={e => setTerceiroDados({...terceiroDados, terceiro_empresa: e.target.value})} placeholder="Nome da empresa" /></div>
                  <div><Label>Número do Chamado Externo</Label><Input value={terceiroDados.terceiro_numero_chamado} onChange={e => setTerceiroDados({...terceiroDados, terceiro_numero_chamado: e.target.value})} placeholder="Ex: INC-00123" /></div>
                  <div><Label>Data de Abertura (Terceiro)</Label><Input type="datetime-local" value={terceiroDados.terceiro_data_abertura} onChange={e => setTerceiroDados({...terceiroDados, terceiro_data_abertura: e.target.value})} /></div>
                  <p className="text-xs text-orange-700">Você pode preencher os demais dados depois no modal de detalhes.</p>
                </div>
              )}

              {terceiroDados.terceiro_envolvido === false && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">✅ Chamado será tratado internamente pelo TI.</div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowIniciarForm(false)} className="flex-1">Cancelar</Button>
                <Button onClick={handleConfirmarIniciar} disabled={terceiroDados.terceiro_envolvido === null} className="flex-1 bg-blue-600 hover:bg-blue-700">Confirmar e Iniciar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}