import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2, Plus, Loader2, CheckCircle, Star, ChevronLeft, Send,
  Paperclip, X, Clock, AlertTriangle, CheckCircle2, Wrench, ShieldAlert,
  Sparkles, FileText, MapPin, User, Phone, Mail, Calendar, Eye, Download,
  ExternalLink, UserCheck, RefreshCw, DollarSign, Briefcase, ShieldCheck,
  Layers, Users, Search
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";

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
  "Aberto": "bg-red-100 text-red-800 border-red-200",
  "Em Análise": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Em Execução": "bg-blue-100 text-blue-800 border-blue-200",
  "Aguardando Orçamento": "bg-orange-100 text-orange-800 border-orange-200",
  "Concluído": "bg-green-100 text-green-800 border-green-200",
  "Cancelado": "bg-gray-100 text-gray-800 border-gray-200",
};

const prioridadeColors = {
  "Crítica": "bg-red-600 text-white font-bold",
  "Alta": "bg-orange-500 text-white font-medium",
  "Média": "bg-amber-100 text-amber-800 border-amber-200",
  "Baixa": "bg-slate-100 text-slate-700 border-slate-200",
};

const normalizeUserName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

function AvaliacaoFacilities({ chamado, onAvaliar, loading, autoShow = false }) {
  const [tempoResolucao, setTempoResolucao] = useState(5);
  const [qualidadeAtendimento, setQualidadeAtendimento] = useState(5);
  const [qualidadeSolucao, setQualidadeSolucao] = useState(5);
  const [comunicacao, setComunicacao] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [openForm, setOpenForm] = useState(autoShow);

  const mediaCalculada = useMemo(() => {
    const soma = tempoResolucao + qualidadeAtendimento + qualidadeSolucao + comunicacao;
    return (soma / 4).toFixed(1);
  }, [tempoResolucao, qualidadeAtendimento, qualidadeSolucao, comunicacao]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onAvaliar({
      chamadoId: chamado.id,
      avaliacao_tempo_resolucao: tempoResolucao,
      avaliacao_qualidade_atendimento: qualidadeAtendimento,
      avaliacao_qualidade_solucao: qualidadeSolucao,
      avaliacao_comunicacao: comunicacao,
      avaliacao_nota_geral: parseFloat(mediaCalculada),
      avaliacao_comentario: comentario.trim() || null,
      satisfacao_respondida: true,
      avaliacao_data: new Date().toISOString(),
    });
    setEnviado(true);
  };

  if (enviado || chamado.satisfacao_respondida || chamado.avaliacao_data) {
    const nota = chamado.avaliacao_nota_geral || mediaCalculada;
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
        <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
          <CheckCircle className="w-5 h-5" />
          <span>Pesquisa de Satisfação Respondida</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex text-amber-500">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${s <= Math.round(Number(nota)) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
              />
            ))}
          </div>
          <span className="text-sm font-bold text-gray-700">Média: {nota} / 5.0</span>
        </div>
        {chamado.avaliacao_comentario && (
          <p className="text-xs text-gray-600 italic mt-2 bg-white/70 p-2 rounded border border-green-100">
            "{chamado.avaliacao_comentario}"
          </p>
        )}
      </div>
    );
  }

  if (!openForm) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-amber-900">Solicitação Concluída!</p>
          <p className="text-[11px] text-amber-700">Avalie a qualidade do atendimento recebido.</p>
        </div>
        <Button size="sm" onClick={() => setOpenForm(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
          <Star className="w-3.5 h-3.5 mr-1" /> Avaliar Atendimento
        </Button>
      </div>
    );
  }

  const CritStar = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between py-1 border-b border-amber-100 last:border-0">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <Star
              className={`w-4 h-4 ${star <= value ? "fill-amber-400 text-amber-500" : "text-gray-300"}`}
            />
          </button>
        ))}
        <span className="text-xs font-bold text-amber-800 ml-1.5 w-4 text-center">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mt-4 shadow-sm" id="bloco-avaliacao-facilities">
      <div className="flex items-center justify-between mb-3 border-b border-amber-200 pb-2">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-600 fill-amber-400" />
          <h4 className="text-sm font-bold text-amber-950">
            Avaliar Atendimento de Facilities
          </h4>
        </div>
        <Badge className="bg-amber-200 text-amber-900 border-amber-300 text-xs">
          Média: {mediaCalculada} ★
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="bg-white/80 rounded-md p-3 border border-amber-200 space-y-1">
          <CritStar label="Tempo de Resolução" value={tempoResolucao} onChange={setTempoResolucao} />
          <CritStar label="Qualidade do Atendimento" value={qualidadeAtendimento} onChange={setQualidadeAtendimento} />
          <CritStar label="Qualidade da Solução" value={qualidadeSolucao} onChange={setQualidadeSolucao} />
          <CritStar label="Comunicação e Postura" value={comunicacao} onChange={setComunicacao} />
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-700">Comentário ou Sugestão (opcional)</Label>
          <Textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Conte como foi o atendimento da equipe de Facilities..."
            className="text-xs mt-1 bg-white border-amber-200"
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpenForm(false)} className="text-xs">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
            Enviar Avaliação
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function PortalFacilities() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();
  const queryClient = useQueryClient();

  // Dados frescos do colaborador para checar permissão de equipe de facilities
  const colabId = colaborador?.id || null;
  const { data: colaboradorFull } = useQuery({
    queryKey: ["portal_colaborador_facilities_fresh", colabId],
    queryFn: () => (colabId ? base44.entities.Colaboradores.get(colabId) : null),
    enabled: !!colabId,
    staleTime: 60000,
  });

  const colabAtivo = colaboradorFull || colaborador;

  const isEquipeFacilities = Boolean(
    colabAtivo?.eh_facilities ||
    colaborador?.eh_facilities ||
    colabAtivo?.area?.toLowerCase().includes("facilities") ||
    colaborador?.area?.toLowerCase().includes("facilities")
  );

  const [modoGestao, setModoGestao] = useState(false);
  const [view, setView] = useState("lista"); // "lista" | "novo"
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [autoShowAvaliacao, setAutoShowAvaliacao] = useState(false);

  // Estados da Gestão Operacional de Facilities
  const [buscaAdmin, setBuscaAdmin] = useState("");
  const [filtroTipoAdmin, setFiltroTipoAdmin] = useState("todos");
  const [filtroPrioridadeAdmin, setFiltroPrioridadeAdmin] = useState("todos");
  const [filtroAtendimentoAdmin, setFiltroAtendimentoAdmin] = useState("todos");
  const [abaGestaoAtiva, setAbaGestaoAtiva] = useState("todos");

  // Modal de Triagem / Atendimento (Gestão)
  const [triagemModalChamado, setTriagemModalChamado] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [novosAnexosEtapa, setNovosAnexosEtapa] = useState([]);
  const [uploadingAnexoEtapa, setUploadingAnexoEtapa] = useState(false);
  const [novoComentarioHistorico, setNovoComentarioHistorico] = useState("");

  // Formulário Nova Solicitação
  const [formData, setFormData] = useState({
    local_ocorrencia: "",
    tipo_servico: "",
    tipo_servico_outro: "",
    descricao: "",
    prioridade: "Média",
    necessita_parada_area: false,
    periodo_parada: "",
  });
  
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [anexos, setAnexos] = useState([]);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);

  useEffect(() => {
    if (!loading) requireAuth();
  }, [loading]);

  // Se o colaborador tem perfil de equipe de facilities, inicializa no modo gestão
  useEffect(() => {
    if (isEquipeFacilities) {
      setModoGestao(true);
    }
  }, [isEquipeFacilities]);

  // Lista geral de chamados de facilities
  const { data: chamadosFacilities = [], isLoading, refetch } = useQuery({
    queryKey: ['portal_facilities_list'],
    queryFn: () => base44.entities.ChamadosFacilities.list('-created_date'),
    enabled: !!colaborador,
    staleTime: 30000,
  });

  // Lista de colaboradores para atribuição técnica
  const { data: listaColaboradores = [] } = useQuery({
    queryKey: ['portal_colaboradores_list_fac'],
    queryFn: () => base44.entities.Colaboradores.list('nome_completo'),
    enabled: isEquipeFacilities,
    staleTime: 60000,
  });

  // Lista de empresas terceiras
  const { data: empresasTerceiras = [] } = useQuery({
    queryKey: ['portal_empresas_terceiras_fac'],
    queryFn: () => base44.entities.EmpresasTerceiras.list('nome_empresa'),
    enabled: isEquipeFacilities,
    staleTime: 60000,
  });

  // Mutation Criar Nova Solicitação
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        solicitante_id: colabAtivo.id || null,
        solicitante_nome: colabAtivo.nome_completo,
        area_departamento: colabAtivo.area || "",
        telefone_ramal: colabAtivo.telefone || "",
        email: colabAtivo.email || "",
        local_ocorrencia: data.local_ocorrencia.trim(),
        tipo_servico: data.tipo_servico,
        tipo_servico_outro: data.tipo_servico === "Outros" ? data.tipo_servico_outro?.trim() : null,
        descricao: data.descricao.trim(),
        prioridade: data.prioridade || "Média",
        necessita_parada_area: !!data.necessita_parada_area,
        periodo_parada: data.necessita_parada_area ? (data.periodo_parada?.trim() || "") : null,
        anexos: anexos,
        status: "Aberto",
        historico: [
          {
            data_hora: new Date().toISOString(),
            tipo: "criacao",
            descricao: `Solicitação registrada via Portal por ${colabAtivo.nome_completo} (${colabAtivo.area || "Geral"}). Prioridade indicada: ${data.prioridade || "Média"}.`,
            usuario_nome: colabAtivo.nome_completo,
            usuario: colabAtivo.nome_completo,
            usuario_id: colabAtivo.id || null,
            status_anterior: null,
            status_novo: "Aberto",
            anexos: anexos
          }
        ]
      };
      
      const res = await base44.entities.ChamadosFacilities.create(payload);
      if (res?.id) {
        base44.functions.invoke('sendEmailFacilitiesCreated', { chamado_id: res.id }).catch(e => console.warn('Erro envio email abertura facilities:', e));
      }
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['portal_facilities_list'] });
      setSubmitSuccess(res?.numero_solicitacao || "Registrado com sucesso");
      setFormData({
        local_ocorrencia: "",
        tipo_servico: "",
        tipo_servico_outro: "",
        descricao: "",
        prioridade: "Média",
        necessita_parada_area: false,
        periodo_parada: "",
      });
      setAnexos([]);
    },
    onError: (err) => {
      console.error("Erro ao criar chamado de facilities:", err);
      alert("Erro ao abrir solicitação: " + (err.message || "Tente novamente."));
    }
  });

  // Mutation Atualizar Chamado / Triagem (Equipe de Facilities)
  const updateChamadoMutation = useMutation({
    mutationFn: async ({ id, dataToUpdate, novoStatus, acaoDescricao }) => {
      const agora = new Date().toISOString();
      const statusAnterior = triagemModalChamado.status;
      const statusFinal = novoStatus || dataToUpdate.status || statusAnterior;
      const nomeOperador = colabAtivo.nome_completo;

      const novoHistorico = [...(triagemModalChamado.historico || [])];
      
      let descricaoEvento = acaoDescricao;
      if (!descricaoEvento) {
        if (statusAnterior !== statusFinal) {
          descricaoEvento = `Status alterado de "${statusAnterior}" para "${statusFinal}" por ${nomeOperador}`;
        } else {
          descricaoEvento = `Atualização cadastral e triagem registrada por ${nomeOperador}`;
        }
      }
      if (novoComentarioHistorico.trim()) {
        descricaoEvento += ` — Observação: "${novoComentarioHistorico.trim()}"`;
      }

      novoHistorico.push({
        data_hora: agora,
        tipo: statusFinal === "Concluído" ? "conclusao" : "atualizacao",
        descricao: descricaoEvento,
        usuario_nome: nomeOperador,
        usuario: nomeOperador,
        usuario_id: colabAtivo.id || null,
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

      if (statusFinal === "Em Execução" && !triagemModalChamado.data_inicio_atendimento) {
        payload.data_inicio_atendimento = agora;
      }

      if (statusFinal === "Concluído") {
        payload.data_conclusao = agora;
        if (payload.terceiro_envolvido) {
          payload.terceiro_data_resolucao = agora;
        }
      }

      const res = await base44.entities.ChamadosFacilities.update(id, payload);

      // Disparos de e-mail de notificação
      if (statusFinal === "Em Execução" && statusAnterior !== "Em Execução") {
        base44.functions.invoke('sendEmailFacilitiesStarted', {
          chamado_id: id,
          responsavel: payload.responsavel_execucao_nome || payload.terceiro_empresa || nomeOperador
        }).catch(err => console.warn("Erro ao disparar email started:", err));
      }

      if (statusFinal === "Concluído" && statusAnterior !== "Concluído") {
        base44.functions.invoke('sendEmailFacilitiesClosed', {
          chamado_id: id,
          responsavel: payload.responsavel_execucao_nome || payload.terceiro_empresa || nomeOperador
        }).catch(err => console.warn("Erro ao disparar email closed:", err));
      }

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_facilities_list'] });
      setTriagemModalChamado(null);
      setNovosAnexosEtapa([]);
      setNovoComentarioHistorico("");
    },
    onError: (err) => {
      alert("Erro ao atualizar solicitação: " + (err.message || "Tente novamente."));
    }
  });

  // Mutation Avaliar Satisfação (Colaborador)
  const avaliarMutation = useMutation({
    mutationFn: async ({ chamadoId, ...dadosAvaliacao }) => {
      return await base44.entities.ChamadosFacilities.update(chamadoId, {
        ...dadosAvaliacao,
        historico: [
          ...(selectedChamado?.historico || []),
          {
            data_hora: new Date().toISOString(),
            tipo: "avaliacao",
            descricao: `Pesquisa de satisfação respondida por ${colabAtivo.nome_completo}. Nota média consolidada: ${dadosAvaliacao.avaliacao_nota_geral} ★`,
            usuario_nome: colabAtivo.nome_completo,
            usuario: colabAtivo.nome_completo,
            usuario_id: colabAtivo.id || null,
          }
        ]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_facilities_list'] });
      if (selectedChamado) {
        setSelectedChamado(prev => ({
          ...prev,
          satisfacao_respondida: true,
          avaliacao_data: new Date().toISOString()
        }));
      }
    }
  });

  const handleFileUpload = async (e, isEtapa = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (isEtapa) setUploadingAnexoEtapa(true);
    else setUploadingAnexo(true);

    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const anexoItem = {
          nome: file.name,
          url: file_url,
          tamanho: file.size,
          tipo: file.type,
          data: new Date().toISOString(),
          enviado_por: colabAtivo.nome_completo
        };
        if (isEtapa) {
          setNovosAnexosEtapa(prev => [...prev, anexoItem]);
        } else {
          setAnexos(prev => [...prev, anexoItem]);
        }
      }
    } catch (err) {
      alert("Erro no upload do arquivo: " + err.message);
    } finally {
      if (isEtapa) setUploadingAnexoEtapa(false);
      else setUploadingAnexo(false);
    }
  };

  const handleAbrirTriagem = (chamado) => {
    setTriagemModalChamado(chamado);
    setEditFormData({
      status: chamado.status || "Aberto",
      prioridade_definida: chamado.prioridade_definida || chamado.prioridade || "Média",
      categoria_confirmada: chamado.categoria_confirmada || chamado.tipo_servico || "",
      prazo_atendimento: chamado.prazo_atendimento || "",
      responsavel_analise_nome: chamado.responsavel_analise_nome || colabAtivo.nome_completo,
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

  if (loading || !colaborador) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  // Filtragem das Minhas Solicitações (Visão do Solicitante)
  const nomeNorm = normalizeUserName(colabAtivo.nome_completo);
  const emailNorm = (colabAtivo.email || "").toLowerCase().trim();
  const colabIdStr = colabAtivo?.id ? String(colabAtivo.id) : "";

  const minhasSolicitacoes = chamadosFacilities.filter(c => {
    if (!c) return false;
    if (c.solicitante_id && String(c.solicitante_id) === colabIdStr) return true;
    const matchEmail = emailNorm && c.email && (c.email.toLowerCase().trim() === emailNorm);
    const solicitanteNorm = normalizeUserName(c.solicitante_nome);
    const matchNomeExact = solicitanteNorm === nomeNorm;
    const matchNomePartial = (
      solicitanteNorm.length > 3 && nomeNorm.length > 3 && (
        solicitanteNorm.includes(nomeNorm) || nomeNorm.includes(solicitanteNorm)
      )
    );
    return matchEmail || matchNomeExact || matchNomePartial;
  });

  const abertosAnalise = minhasSolicitacoes.filter(c => c.status === "Aberto" || c.status === "Em Análise");
  const emExecucao = minhasSolicitacoes.filter(c => c.status === "Em Execução" || c.status === "Aguardando Orçamento");
  const aguardandoAvaliacao = minhasSolicitacoes.filter(c => c.status === "Concluído" && !c.satisfacao_respondida && !c.avaliacao_data);
  const concluidosCancelados = minhasSolicitacoes.filter(c => (c.status === "Concluído" && (c.satisfacao_respondida || c.avaliacao_data)) || c.status === "Cancelado");

  // Filtragem da Gestão Operacional de Facilities (Todas as solicitações)
  const chamadosGestaoFiltrados = chamadosFacilities.filter(c => {
    if (abaGestaoAtiva === "abertos" && !["Aberto", "Em Análise"].includes(c.status)) return false;
    if (abaGestaoAtiva === "execucao" && !["Em Execução", "Aguardando Orçamento"].includes(c.status)) return false;
    if (abaGestaoAtiva === "aguardando_avaliacao" && !(c.status === "Concluído" && !c.satisfacao_respondida && !c.avaliacao_data)) return false;
    if (abaGestaoAtiva === "concluidos" && !["Concluído", "Cancelado"].includes(c.status)) return false;

    if (filtroTipoAdmin !== "todos" && c.tipo_servico !== filtroTipoAdmin) return false;
    if (filtroPrioridadeAdmin !== "todos" && (c.prioridade_definida || c.prioridade) !== filtroPrioridadeAdmin) return false;
    if (filtroAtendimentoAdmin === "interno" && c.terceiro_envolvido) return false;
    if (filtroAtendimentoAdmin === "terceiro" && !c.terceiro_envolvido) return false;

    if (buscaAdmin.trim()) {
      const q = buscaAdmin.toLowerCase();
      const matchNum = c.numero_solicitacao?.toLowerCase().includes(q);
      const matchSolic = c.solicitante_nome?.toLowerCase().includes(q);
      const matchLocal = c.local_ocorrencia?.toLowerCase().includes(q);
      const matchTerc = c.terceiro_empresa?.toLowerCase().includes(q);
      const matchDesc = c.descricao?.toLowerCase().includes(q);
      return matchNum || matchSolic || matchLocal || matchTerc || matchDesc;
    }
    return true;
  });

  // Métricas da Gestão
  const statsGestao = {
    total: chamadosFacilities.length,
    abertos: chamadosFacilities.filter(c => ["Aberto", "Em Análise"].includes(c.status)).length,
    emExecucao: chamadosFacilities.filter(c => ["Em Execução", "Aguardando Orçamento"].includes(c.status)).length,
    concluidos: chamadosFacilities.filter(c => c.status === "Concluído").length,
    paradaArea: chamadosFacilities.filter(c => c.necessita_parada_area && c.status !== "Concluído" && c.status !== "Cancelado").length,
    mediaSatisfacao: (() => {
      const avaliados = chamadosFacilities.filter(c => c.avaliacao_nota_geral);
      if (avaliados.length === 0) return "—";
      const soma = avaliados.reduce((acc, c) => acc + Number(c.avaliacao_nota_geral), 0);
      return (soma / avaliados.length).toFixed(1);
    })(),
    totalAvaliados: chamadosFacilities.filter(c => c.avaliacao_nota_geral).length
  };

  // Tela de sucesso após abertura
  if (view === "novo" && submitSuccess) {
    return (
      <PortalLayout colaborador={colabAtivo} onLogout={logout} permissoesComunicados={colabAtivo.permissoes_comunicados || []}>
        <div className="p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Solicitação Registrada!</h2>
          <p className="text-sm text-muted-foreground mb-4">A equipe de Facilities foi notificada e dará andamento ao chamado.</p>
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 my-4">
            <p className="text-sm text-amber-800 mb-1 font-semibold">Número da Solicitação:</p>
            <p className="text-3xl font-bold font-mono text-amber-900">{submitSuccess}</p>
          </div>
          <div className="flex flex-col gap-3 mt-6">
            <Button onClick={() => { setSubmitSuccess(null); setView("lista"); }} className="bg-amber-600 hover:bg-amber-700 w-full text-white font-semibold">
              {modoGestao ? "Voltar ao Painel da Equipe" : "Ver Minhas Solicitações"}
            </Button>
            <Button variant="outline" onClick={() => { setSubmitSuccess(null); setView("novo"); }} className="w-full">
              Abrir Outra Solicitação
            </Button>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // Componente de lista de chamados do solicitante
  const TabFacilitiesContent = ({ lista, empty, showAvaliarBtn = false }) => (
    <div className="space-y-3">
      {lista.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground bg-muted/20">
          <p className="text-sm">{empty}</p>
        </Card>
      ) : (
        lista.map((chamado) => (
          <Card
            key={chamado.id}
            className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-amber-500"
            onClick={() => { setSelectedChamado(chamado); setAutoShowAvaliacao(showAvaliarBtn); }}
          >
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                    {chamado.numero_solicitacao || "FAC-S/N"}
                  </span>
                  <Badge className={`text-xs ${statusColors[chamado.status] || "bg-gray-100 text-gray-800"}`}>
                    {chamado.status}
                  </Badge>
                  <Badge className={`text-xs ${prioridadeColors[chamado.prioridade_definida || chamado.prioridade] || "bg-slate-100"}`}>
                    {chamado.prioridade_definida || chamado.prioridade}
                  </Badge>
                  {chamado.necessita_parada_area && (
                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 bg-amber-50 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Parada Necessária
                    </Badge>
                  )}
                  {chamado.terceiro_envolvido && (
                    <Badge variant="secondary" className="text-[11px] bg-sky-50 text-sky-800 border-sky-200">
                      🏢 Terceiro: {chamado.terceiro_empresa}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {showAvaliarBtn && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChamado(chamado);
                        setAutoShowAvaliacao(true);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-7"
                    >
                      <Star className="w-3.5 h-3.5 mr-1" /> Avaliar
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Detalhes
                  </span>
                </div>
              </div>

              <h3 className="font-semibold text-foreground text-sm">
                {chamado.tipo_servico} · <span className="font-normal text-muted-foreground">{chamado.local_ocorrencia}</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {chamado.descricao}
              </p>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3 pt-2 border-t">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {chamado.created_date ? format(parseISO(chamado.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "-"}
                </span>
                {chamado.avaliacao_nota_geral && (
                  <span className="flex items-center gap-1 text-amber-600 font-bold">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {chamado.avaliacao_nota_geral} ★
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <PortalLayout colaborador={colabAtivo} onLogout={logout} permissoesComunicados={colabAtivo.permissoes_comunicados || []}>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── SELETOR DE VISÃO (QUANDO O COLABORADOR FAZ PARTE DE FACILITIES) ── */}
        {isEquipeFacilities && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-xl p-3 gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-amber-600 text-white p-1.5 rounded-lg">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-amber-950">Módulo de Facilities & Infraestrutura</p>
                  <Badge className="bg-amber-600 text-white text-[10px] font-bold">🏢 Equipe de Facilities</Badge>
                </div>
                <p className="text-xs text-amber-800">Você possui permissão de gestão operacional para triar e atender todas as solicitações da empresa.</p>
              </div>
            </div>

            <div className="flex items-center bg-white border border-amber-300 rounded-lg p-1 shadow-sm">
              <button
                type="button"
                onClick={() => { setModoGestao(true); setView("lista"); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  modoGestao && view === "lista"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Gestão da Equipe (Todas)
              </button>
              <button
                type="button"
                onClick={() => { setModoGestao(false); setView("lista"); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  !modoGestao && view === "lista"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <User className="w-3.5 h-3.5" /> Minhas Solicitações
              </button>
            </div>
          </div>
        )}

        {/* ── MODO 1: FORMULÁRIO DE NOVA SOLICITAÇÃO ── */}
        {view === "novo" ? (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setView("lista")} className="flex items-center gap-1 text-sm text-muted-foreground">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                Nova Solicitação
              </Badge>
            </div>

            <Card className="border-amber-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50/30 border-b border-amber-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-600 rounded-xl text-white shadow-sm">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Solicitação de Serviços de Facilities</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Preencha os detalhes para registrar manutenções, limpeza, reparos prediais ou serviços operacionais.
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-5">
                {/* Dados do Solicitante (Preenchidos Automaticamente) */}
                <div className="bg-gray-50 border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Solicitante:</span>
                    <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
                      <User className="w-3.5 h-3.5 text-amber-600" /> {colabAtivo.nome_completo}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Área / Departamento:</span>
                    <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" /> {colabAtivo.area || "Geral"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Ramal / Telefone:</span>
                    <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-amber-600" /> {colabAtivo.telefone || "Não informado"}
                    </span>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!formData.tipo_servico) return alert("Selecione o Tipo de Serviço.");
                    if (!formData.local_ocorrencia.trim()) return alert("Informe o Local da Ocorrência.");
                    if (!formData.descricao.trim()) return alert("Descreva a necessidade do serviço.");
                    createMutation.mutate(formData);
                  }}
                  className="space-y-5"
                >
                  {/* Local da Ocorrência */}
                  <div>
                    <Label className="text-xs font-bold text-gray-800">
                      Local da Ocorrência / Instalação <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      required
                      value={formData.local_ocorrencia}
                      onChange={(e) => setFormData({ ...formData, local_ocorrencia: e.target.value })}
                      placeholder="Ex: Prédio Administrativo - 2º Andar - Sala de Reunião 01"
                      className="text-sm mt-1"
                    />
                  </div>

                  {/* Tipo de Serviço */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-gray-800">
                        Tipo de Serviço <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.tipo_servico}
                        onValueChange={(val) => setFormData({ ...formData, tipo_servico: val })}
                      >
                        <SelectTrigger className="text-sm mt-1">
                          <SelectValue placeholder="Selecione o serviço..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_SERVICO.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.tipo_servico === "Outros" && (
                      <div>
                        <Label className="text-xs font-bold text-gray-800">
                          Especifique o Serviço <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          required
                          value={formData.tipo_servico_outro}
                          onChange={(e) => setFormData({ ...formData, tipo_servico_outro: e.target.value })}
                          placeholder="Descreva o tipo de serviço..."
                          className="text-sm mt-1"
                        />
                      </div>
                    )}
                  </div>

                  {/* Descrição Detalhada */}
                  <div>
                    <Label className="text-xs font-bold text-gray-800">
                      Descrição da Necessidade / Problema <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      required
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descreva claramente o que precisa ser feito ou o problema ocorrido..."
                      rows={4}
                      className="text-sm mt-1"
                    />
                  </div>

                  {/* Prioridade e Parada de Área */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-4 border border-amber-200 rounded-lg">
                    <div>
                      <Label className="text-xs font-bold text-gray-800">Prioridade Indicada</Label>
                      <Select
                        value={formData.prioridade}
                        onValueChange={(val) => setFormData({ ...formData, prioridade: val })}
                      >
                        <SelectTrigger className="text-sm mt-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Baixa">Baixa (Pode aguardar cronograma)</SelectItem>
                          <SelectItem value="Média">Média (Atendimento regular)</SelectItem>
                          <SelectItem value="Alta">Alta (Impacta atividade do setor)</SelectItem>
                          <SelectItem value="Crítica">Crítica (Risco iminente / Parada total)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-gray-800">Necessita Paralisação da Área?</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                          <input
                            type="radio"
                            name="parada"
                            checked={!formData.necessita_parada_area}
                            onChange={() => setFormData({ ...formData, necessita_parada_area: false, periodo_parada: "" })}
                          /> Não
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900 cursor-pointer">
                          <input
                            type="radio"
                            name="parada"
                            checked={formData.necessita_parada_area}
                            onChange={() => setFormData({ ...formData, necessita_parada_area: true })}
                          /> Sim, requer parada
                        </label>
                      </div>

                      {formData.necessita_parada_area && (
                        <div className="mt-2">
                          <Input
                            value={formData.periodo_parada}
                            onChange={(e) => setFormData({ ...formData, periodo_parada: e.target.value })}
                            placeholder="Ex: Após o expediente, final de semana, sábado 14h..."
                            className="text-xs bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Anexos */}
                  <div>
                    <Label className="text-xs font-bold text-gray-800">Fotos ou Documentos (opcional)</Label>
                    <div className="mt-1 flex items-center gap-3">
                      <label className="cursor-pointer bg-white border border-gray-300 hover:border-amber-400 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                        <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                        <span>{uploadingAnexo ? "Enviando..." : "Anexar Arquivos"}</span>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => handleFileUpload(e, false)}
                          className="hidden"
                          disabled={uploadingAnexo}
                        />
                      </label>
                      {uploadingAnexo && <Loader2 className="w-4 h-4 animate-spin text-amber-600" />}
                    </div>

                    {anexos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {anexos.map((anexo, idx) => (
                          <div key={idx} className="bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1 text-xs flex items-center gap-2">
                            <span className="truncate max-w-[200px] text-amber-950">{anexo.nome}</span>
                            <button
                              type="button"
                              onClick={() => setAnexos(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setView("lista")}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Registrando...
                        </>
                      ) : (
                        "Registrar Solicitação"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : modoGestao && isEquipeFacilities ? (
          /* ── MODO 2: GESTÃO OPERACIONAL DE FACILITIES (EQUIPE DE FACILITIES) ── */
          <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-7 h-7 text-amber-600" />
                  Gestão Operacional de Facilities
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Triagem, atendimento predial, fornecedores terceiros e controle de ordens de serviço.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center gap-1.5 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                </Button>
                <Button onClick={() => setView("novo")} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Nova Solicitação
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="border-l-4 border-l-slate-400 p-3">
                <p className="text-[11px] font-bold text-muted-foreground uppercase">Total Geral</p>
                <p className="text-2xl font-black text-foreground mt-1">{statsGestao.total}</p>
              </Card>
              <Card className="border-l-4 border-l-amber-500 p-3 bg-amber-50/40">
                <p className="text-[11px] font-bold text-amber-900 uppercase">Em Aberto / Triagem</p>
                <p className="text-2xl font-black text-amber-700 mt-1">{statsGestao.abertos}</p>
              </Card>
              <Card className="border-l-4 border-l-blue-500 p-3 bg-blue-50/40">
                <p className="text-[11px] font-bold text-blue-900 uppercase">Em Execução</p>
                <p className="text-2xl font-black text-blue-700 mt-1">{statsGestao.emExecucao}</p>
              </Card>
              <Card className="border-l-4 border-l-green-500 p-3 bg-green-50/40">
                <p className="text-[11px] font-bold text-green-900 uppercase">Concluídos</p>
                <p className="text-2xl font-black text-green-700 mt-1">{statsGestao.concluidos}</p>
              </Card>
              <Card className="border-l-4 border-l-yellow-400 p-3 bg-yellow-50/30">
                <p className="text-[11px] font-bold text-yellow-900 uppercase flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> Satisfação Média
                </p>
                <p className="text-2xl font-black text-yellow-800 mt-1">
                  {statsGestao.mediaSatisfacao} <span className="text-xs font-normal text-muted-foreground">({statsGestao.totalAvaliados} aval.)</span>
                </p>
              </Card>
              <Card className="border-l-4 border-l-red-500 p-3 bg-red-50/40">
                <p className="text-[11px] font-bold text-red-900 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-600" /> Paradas de Área
                </p>
                <p className="text-2xl font-black text-red-700 mt-1">{statsGestao.paradaArea}</p>
              </Card>
            </div>

            {/* Barra de Filtros */}
            <Card className="p-4 space-y-3 bg-card border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    value={buscaAdmin}
                    onChange={(e) => setBuscaAdmin(e.target.value)}
                    placeholder="Buscar por número FAC-, solicitante, local, terceiro..."
                    className="pl-9 text-xs"
                  />
                </div>

                <div>
                  <Select value={filtroTipoAdmin} onValueChange={setFiltroTipoAdmin}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Tipo de Serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Serviços</SelectItem>
                      {TIPOS_SERVICO.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select value={filtroPrioridadeAdmin} onValueChange={setFiltroPrioridadeAdmin}>
                    <SelectTrigger className="text-xs">
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
                </div>

                <div>
                  <Select value={filtroAtendimentoAdmin} onValueChange={setFiltroAtendimentoAdmin}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Tipo Atendimento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Atendimentos</SelectItem>
                      <SelectItem value="interno">Executado Internamente</SelectItem>
                      <SelectItem value="terceiro">Fornecedor Terceiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Abas e Tabela da Gestão */}
            <Tabs value={abaGestaoAtiva} onValueChange={setAbaGestaoAtiva} className="w-full">
              <TabsList className="bg-muted/60 p-1 flex-wrap h-auto gap-1">
                <TabsTrigger value="todos" className="text-xs font-semibold">
                  Todos ({chamadosFacilities.length})
                </TabsTrigger>
                <TabsTrigger value="abertos" className="text-xs font-semibold text-amber-700">
                  Abertos / Triagem ({statsGestao.abertos})
                </TabsTrigger>
                <TabsTrigger value="execucao" className="text-xs font-semibold text-blue-700">
                  Em Execução ({statsGestao.emExecucao})
                </TabsTrigger>
                <TabsTrigger value="aguardando_avaliacao" className="text-xs font-semibold text-yellow-700">
                  Aguard. Avaliação ({chamadosFacilities.filter(c => c.status === "Concluído" && !c.satisfacao_respondida && !c.avaliacao_data).length})
                </TabsTrigger>
                <TabsTrigger value="concluidos" className="text-xs font-semibold text-green-700">
                  Concluídos ({statsGestao.concluidos})
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[120px] text-xs">Nº Solicitação</TableHead>
                      <TableHead className="text-xs">Solicitante & Área</TableHead>
                      <TableHead className="text-xs">Serviço & Local</TableHead>
                      <TableHead className="text-xs">Prioridade</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Responsável / Terceiro</TableHead>
                      <TableHead className="text-xs">Abertura</TableHead>
                      <TableHead className="text-xs">Satisfação</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : chamadosGestaoFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                          Nenhuma solicitação encontrada para os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      chamadosGestaoFiltrados.map((c) => (
                        <TableRow key={c.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono font-bold text-xs text-amber-900">
                            {c.numero_solicitacao || "FAC-S/N"}
                            {c.necessita_parada_area && (
                              <span title="Parada de área necessária" className="ml-1 text-amber-600">⚠️</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <p className="font-semibold text-foreground">{c.solicitante_nome}</p>
                            <p className="text-[11px] text-muted-foreground">{c.area_departamento || "-"}</p>
                          </TableCell>
                          <TableCell className="text-xs">
                            <p className="font-medium text-foreground">{c.tipo_servico}</p>
                            <p className="text-[11px] text-muted-foreground truncate max-w-[180px] flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0 text-amber-600" /> {c.local_ocorrencia}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${prioridadeColors[c.prioridade_definida || c.prioridade] || "bg-slate-100"}`}>
                              {c.prioridade_definida || c.prioridade}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${statusColors[c.status] || "bg-gray-100"}`}>
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {c.terceiro_envolvido ? (
                              <div>
                                <p className="font-semibold text-sky-800 flex items-center gap-1">
                                  🏢 {c.terceiro_empresa}
                                </p>
                                {c.terceiro_numero_chamado && (
                                  <p className="text-[10px] text-muted-foreground">OS: {c.terceiro_numero_chamado}</p>
                                )}
                              </div>
                            ) : c.responsavel_execucao_nome ? (
                              <p className="font-medium text-gray-700 flex items-center gap-1">
                                🔧 {c.responsavel_execucao_nome}
                              </p>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">
                            {c.created_date ? format(parseISO(c.created_date), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {c.avaliacao_nota_geral ? (
                              <span className="font-bold text-amber-600 flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                {c.avaliacao_nota_geral} <Star className="w-3 h-3 fill-amber-400" />
                              </span>
                            ) : c.status === "Concluído" ? (
                              <span className="text-[10px] text-yellow-700 italic">Pendente</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAbrirTriagem(c)}
                              className="text-xs h-7 gap-1 border-amber-300 hover:bg-amber-50"
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
            </Tabs>
          </div>
        ) : (
          /* ── MODO 3: VISÃO PADRÃO DO COLABORADOR (MINHAS SOLICITAÇÕES) ── */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-7 h-7 text-amber-600" />
                  Solicitações de Facilities
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Acompanhe e registre manutenções, limpeza e serviços prediais.
                </p>
              </div>
              <Button onClick={() => setView("novo")} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Nova Solicitação
              </Button>
            </div>

            {/* Cards de Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-4 text-center border-l-4 border-l-amber-500">
                <p className="text-2xl font-bold text-amber-600">{abertosAnalise.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Em Aberto / Análise</p>
              </Card>
              <Card className="p-4 text-center border-l-4 border-l-blue-500">
                <p className="text-2xl font-bold text-blue-600">{emExecucao.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Em Execução</p>
              </Card>
              <Card className="p-4 text-center border-l-4 border-l-yellow-500 bg-yellow-50/30">
                <p className="text-2xl font-bold text-yellow-600">{aguardandoAvaliacao.length}</p>
                <p className="text-xs text-yellow-800 font-medium mt-1">Aguard. Avaliação</p>
              </Card>
              <Card className="p-4 text-center border-l-4 border-l-green-500">
                <p className="text-2xl font-bold text-green-600">{concluidosCancelados.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Concluídos</p>
              </Card>
            </div>

            {/* Alerta de Pesquisa Pendente */}
            {aguardandoAvaliacao.length > 0 && (
              <Alert className="bg-amber-50 border-amber-300 text-amber-900">
                <Star className="h-4 w-4 text-amber-600 fill-amber-400" />
                <AlertDescription className="text-xs font-semibold">
                  Você tem {aguardandoAvaliacao.length} solicitação(ões) concluída(s) aguardando sua avaliação de satisfação.
                </AlertDescription>
              </Alert>
            )}

            {/* Abas */}
            <Tabs defaultValue="abertos" className="w-full">
              <TabsList className="grid grid-cols-4 w-full bg-muted/60">
                <TabsTrigger value="abertos" className="text-xs">
                  Em Aberto ({abertosAnalise.length})
                </TabsTrigger>
                <TabsTrigger value="execucao" className="text-xs">
                  Em Execução ({emExecucao.length})
                </TabsTrigger>
                <TabsTrigger value="avaliacao" className="text-xs text-amber-700 font-semibold">
                  Aguard. Avaliação ({aguardandoAvaliacao.length})
                </TabsTrigger>
                <TabsTrigger value="concluidos" className="text-xs">
                  Concluídos ({concluidosCancelados.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="abertos" className="mt-4">
                <TabFacilitiesContent lista={abertosAnalise} empty="Nenhuma solicitação em aberto ou em análise no momento." />
              </TabsContent>
              <TabsContent value="execucao" className="mt-4">
                <TabFacilitiesContent lista={emExecucao} empty="Nenhuma solicitação em execução no momento." />
              </TabsContent>
              <TabsContent value="avaliacao" className="mt-4">
                <TabFacilitiesContent
                  lista={aguardandoAvaliacao}
                  empty="Nenhuma solicitação pendente de avaliação. Obrigado!"
                  showAvaliarBtn={true}
                />
              </TabsContent>
              <TabsContent value="concluidos" className="mt-4">
                <TabFacilitiesContent lista={concluidosCancelados} empty="Nenhuma solicitação concluída encontrada." />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ── MODAL DETALHES RÁPIDOS DA SOLICITAÇÃO (VISÃO DO SOLICITANTE) ── */}
        {selectedChamado && (
          <Dialog open={!!selectedChamado} onOpenChange={() => { setSelectedChamado(null); setAutoShowAvaliacao(false); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                      {selectedChamado.numero_solicitacao || "FAC-S/N"}
                    </span>
                    <Badge className={`text-xs ${statusColors[selectedChamado.status] || "bg-gray-100"}`}>
                      {selectedChamado.status}
                    </Badge>
                  </div>
                  <Badge className={`text-xs ${prioridadeColors[selectedChamado.prioridade_definida || selectedChamado.prioridade] || "bg-slate-100"}`}>
                    Prioridade: {selectedChamado.prioridade_definida || selectedChamado.prioridade}
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground mt-2">
                  {selectedChamado.tipo_servico}
                </DialogTitle>
                <DialogDescription className="text-xs flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" /> {selectedChamado.local_ocorrencia}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Informações Gerais */}
                <div className="bg-muted/30 p-3 rounded-lg space-y-2 border">
                  <div>
                    <span className="font-semibold text-foreground">Descrição do Pedido:</span>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">{selectedChamado.descricao}</p>
                  </div>

                  {selectedChamado.necessita_parada_area && (
                    <div className="bg-amber-50 border border-amber-200 p-2 rounded text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <span className="font-bold">Paralisação de Área Necessária</span>
                        {selectedChamado.periodo_parada && (
                          <p className="text-[11px] mt-0.5">Período sugerido: {selectedChamado.periodo_parada}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedChamado.terceiro_envolvido && (
                    <div className="bg-sky-50 border border-sky-200 p-2 rounded text-sky-900">
                      <span className="font-bold">Prestador / Fornecedor Terceiro:</span> {selectedChamado.terceiro_empresa}
                      {selectedChamado.terceiro_numero_chamado && (
                        <span className="block text-[11px] text-sky-700">OS/Chamado: {selectedChamado.terceiro_numero_chamado}</span>
                      )}
                    </div>
                  )}

                  {selectedChamado.descricao_servico_executado && (
                    <div className="bg-green-50 border border-green-200 p-2.5 rounded text-green-900 mt-2">
                      <span className="font-bold block text-green-950">Serviço Executado:</span>
                      <p className="text-[11px] mt-0.5 text-green-800">{selectedChamado.descricao_servico_executado}</p>
                    </div>
                  )}
                </div>

                {/* Anexos da Abertura */}
                {selectedChamado.anexos && selectedChamado.anexos.length > 0 && (
                  <div>
                    <span className="font-semibold text-foreground block mb-1.5">Anexos:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedChamado.anexos.map((anexo, idx) => (
                        <a
                          key={idx}
                          href={anexo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white border hover:border-amber-400 p-2 rounded-md text-xs flex items-center gap-2 text-amber-900 shadow-sm"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                          <span className="truncate max-w-[150px]">{anexo.nome}</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Histórico da Solicitação */}
                {selectedChamado.historico && selectedChamado.historico.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <span className="font-semibold text-foreground block">Linha do Tempo:</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedChamado.historico.map((h, i) => (
                        <div key={i} className="text-[11px] bg-muted/20 p-2 rounded border-l-2 border-l-amber-500">
                          <div className="flex items-center justify-between text-muted-foreground mb-0.5">
                            <span className="font-medium text-foreground">{h.usuario_nome || h.usuario || "Sistema"}</span>
                            <span>{h.data_hora ? format(parseISO(h.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ""}</span>
                          </div>
                          <p className="text-gray-700">{h.descricao}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pesquisa de Satisfação (se concluído) */}
                {selectedChamado.status === "Concluído" && (
                  <AvaliacaoFacilities
                    chamado={selectedChamado}
                    onAvaliar={avaliarMutation.mutateAsync}
                    loading={avaliarMutation.isPending}
                    autoShow={autoShowAvaliacao}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ── MODAL COMPLETO DE TRIAGEM & ATENDIMENTO (EQUIPE DE FACILITIES) ── */}
        {triagemModalChamado && (
          <Dialog open={!!triagemModalChamado} onOpenChange={() => setTriagemModalChamado(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded">
                      {triagemModalChamado.numero_solicitacao || "FAC-S/N"}
                    </span>
                    <Badge className={`text-xs ${statusColors[editFormData.status] || "bg-gray-100"}`}>
                      {editFormData.status}
                    </Badge>
                  </div>
                  <Badge className="bg-amber-600 text-white text-xs">
                    Triagem & Atendimento de Facilities
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground mt-2">
                  {triagemModalChamado.tipo_servico}
                </DialogTitle>
                <DialogDescription className="text-xs flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" /> {triagemModalChamado.local_ocorrencia} · Solicitante: {triagemModalChamado.solicitante_nome} ({triagemModalChamado.area_departamento || "Geral"})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-2 text-xs">
                {/* Resumo da Demanda Original */}
                <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 space-y-1.5">
                  <span className="font-bold text-amber-950 block">Necessidade / Descrição:</span>
                  <p className="text-gray-800 leading-relaxed">{triagemModalChamado.descricao}</p>
                  {triagemModalChamado.necessita_parada_area && (
                    <div className="bg-amber-100/80 border border-amber-300 p-2 rounded text-amber-900 text-[11px] flex items-center gap-2 mt-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span><strong>Parada de Área Requerida:</strong> {triagemModalChamado.periodo_parada || "Conforme necessidade"}</span>
                    </div>
                  )}
                </div>

                {/* Bloco de Triagem & Atribuição */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-card border rounded-lg p-4">
                  <div>
                    <Label className="text-xs font-bold text-gray-800">Status do Chamado</Label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(v) => setEditFormData({ ...editFormData, status: v })}
                    >
                      <SelectTrigger className="text-xs mt-1">
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
                    <Label className="text-xs font-bold text-gray-800">Prioridade Definida</Label>
                    <Select
                      value={editFormData.prioridade_definida}
                      onValueChange={(v) => setEditFormData({ ...editFormData, prioridade_definida: v })}
                    >
                      <SelectTrigger className="text-xs mt-1">
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
                    <Label className="text-xs font-bold text-gray-800">Prazo Estimado</Label>
                    <Input
                      value={editFormData.prazo_atendimento}
                      onChange={(e) => setEditFormData({ ...editFormData, prazo_atendimento: e.target.value })}
                      placeholder="Ex: 24 horas, 3 dias, 20/09..."
                      className="text-xs mt-1"
                    />
                  </div>
                </div>

                {/* Atribuição: Interno vs Terceiro */}
                <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Tipo de Atendimento / Responsável
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={!editFormData.terceiro_envolvido ? "default" : "outline"}
                        onClick={() => setEditFormData({ ...editFormData, terceiro_envolvido: false })}
                        className={`text-xs h-7 ${!editFormData.terceiro_envolvido ? "bg-amber-600 text-white" : ""}`}
                      >
                        <Wrench className="w-3.5 h-3.5 mr-1" /> Técnico Interno
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={editFormData.terceiro_envolvido ? "default" : "outline"}
                        onClick={() => setEditFormData({ ...editFormData, terceiro_envolvido: true })}
                        className={`text-xs h-7 ${editFormData.terceiro_envolvido ? "bg-sky-600 text-white" : ""}`}
                      >
                        <Building2 className="w-3.5 h-3.5 mr-1" /> Fornecedor Terceiro
                      </Button>
                    </div>
                  </div>

                  {!editFormData.terceiro_envolvido ? (
                    <div>
                      <Label className="text-xs font-medium text-gray-700">Técnico / Responsável Interno</Label>
                      <Select
                        value={editFormData.responsavel_execucao_nome || "nao_atribuido"}
                        onValueChange={(v) => setEditFormData({ ...editFormData, responsavel_execucao_nome: v === "nao_atribuido" ? "" : v })}
                      >
                        <SelectTrigger className="text-xs mt-1 bg-white">
                          <SelectValue placeholder="Selecione um técnico ou colaborador..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nao_atribuido">-- Não atribuído --</SelectItem>
                          {listaColaboradores.map((col) => (
                            <SelectItem key={col.id} value={col.nome_completo}>
                              {col.nome_completo} ({col.area || "Geral"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <Label className="text-xs font-medium text-gray-700">Empresa / Fornecedor</Label>
                        <Input
                          value={editFormData.terceiro_empresa}
                          onChange={(e) => setEditFormData({ ...editFormData, terceiro_empresa: e.target.value })}
                          placeholder="Nome da empresa ou prestador"
                          className="text-xs mt-1 bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-700">Nº da OS / Chamado Terceiro</Label>
                        <Input
                          value={editFormData.terceiro_numero_chamado}
                          onChange={(e) => setEditFormData({ ...editFormData, terceiro_numero_chamado: e.target.value })}
                          placeholder="Ex: OS-9842"
                          className="text-xs mt-1 bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-700">Valor Orçado (R$ - Informativo)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editFormData.orcamento_valor}
                          onChange={(e) => setEditFormData({ ...editFormData, orcamento_valor: e.target.value })}
                          placeholder="0,00"
                          className="text-xs mt-1 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Descrição do Serviço Executado (quando Concluído) */}
                {editFormData.status === "Concluído" && (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-3 space-y-1.5">
                    <Label className="text-xs font-bold text-green-950">
                      Descrição Detalhada do Serviço Executado <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      required
                      value={editFormData.descricao_servico_executado}
                      onChange={(e) => setEditFormData({ ...editFormData, descricao_servico_executado: e.target.value })}
                      placeholder="Descreva detalhadamente o serviço que foi realizado pela equipe ou terceiro..."
                      rows={3}
                      className="text-xs bg-white border-green-200"
                    />
                  </div>
                )}

                {/* Anexos de Ordem de Serviço / Orçamentos / Fotos */}
                <div>
                  <Label className="text-xs font-bold text-gray-800">Adicionar Anexos / OS / Relatórios da Etapa</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <label className="cursor-pointer bg-white border border-gray-300 hover:border-amber-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                      <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                      <span>{uploadingAnexoEtapa ? "Enviando..." : "Anexar Arquivos"}</span>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => handleFileUpload(e, true)}
                        className="hidden"
                        disabled={uploadingAnexoEtapa}
                      />
                    </label>
                    {uploadingAnexoEtapa && <Loader2 className="w-4 h-4 animate-spin text-amber-600" />}
                  </div>

                  {novosAnexosEtapa.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {novosAnexosEtapa.map((anexo, idx) => (
                        <div key={idx} className="bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1 text-xs flex items-center gap-2">
                          <span className="truncate max-w-[200px] text-amber-950">{anexo.nome}</span>
                          <button
                            type="button"
                            onClick={() => setNovosAnexosEtapa(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Observação para o Histórico */}
                <div>
                  <Label className="text-xs font-bold text-gray-800">Nota / Observação do Histórico</Label>
                  <Input
                    value={novoComentarioHistorico}
                    onChange={(e) => setNovoComentarioHistorico(e.target.value)}
                    placeholder="Ex: Agendado técnico terceirizado para domingo 08:00..."
                    className="text-xs mt-1"
                  />
                </div>

                {/* Histórico Atual */}
                {triagemModalChamado.historico && triagemModalChamado.historico.length > 0 && (
                  <div className="border-t pt-3 space-y-2">
                    <span className="font-bold text-gray-800 block text-xs">Histórico Completo da Solicitação:</span>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {triagemModalChamado.historico.map((h, idx) => (
                        <div key={idx} className="bg-muted/30 p-2.5 rounded border-l-2 border-l-amber-500 text-[11px]">
                          <div className="flex items-center justify-between text-muted-foreground mb-0.5">
                            <span className="font-semibold text-foreground">{h.usuario_nome || h.usuario || "Sistema"}</span>
                            <span>{h.data_hora ? format(parseISO(h.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ""}</span>
                          </div>
                          <p className="text-gray-800">{h.descricao}</p>
                          {h.anexos && h.anexos.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {h.anexos.map((a, ai) => (
                                <a
                                  key={ai}
                                  href={a.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded flex items-center gap-1 text-amber-800 hover:underline"
                                >
                                  <Paperclip className="w-3 h-3" /> {a.nome}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="border-t pt-3 gap-2">
                <Button variant="outline" size="sm" onClick={() => setTriagemModalChamado(null)} className="text-xs">
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={updateChamadoMutation.isPending}
                  onClick={() => {
                    if (editFormData.status === "Concluído" && !editFormData.descricao_servico_executado?.trim()) {
                      return alert("Por favor, descreva o serviço executado antes de concluir.");
                    }
                    updateChamadoMutation.mutate({
                      id: triagemModalChamado.id,
                      dataToUpdate: editFormData
                    });
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-5"
                >
                  {updateChamadoMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

      </div>
    </PortalLayout>
  );
}
