import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2, Plus, Loader2, CheckCircle, Star, ChevronLeft, Send,
  Paperclip, X, Clock, AlertTriangle, CheckCircle2, Wrench, ShieldAlert,
  Sparkles, FileText, MapPin, User, Phone, Mail, Calendar, Eye
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
  "Crítica": "bg-red-600 text-white",
  "Alta": "bg-orange-500 text-white",
  "Média": "bg-amber-100 text-amber-800 border-amber-200",
  "Baixa": "bg-slate-100 text-slate-700 border-slate-200",
};

const normalizeUserName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

function AvaliacaoFacilities({ chamado, onAvaliar, loading, autoShow = false }) {
  const [show, setShow] = useState(autoShow);
  const [avaliacao, setAvaliacao] = useState({
    tempo_resolucao: 5,
    qualidade_atendimento: 5,
    qualidade_solucao: 5,
    comunicacao: 5,
    comentario: ""
  });

  useEffect(() => {
    if (autoShow) setShow(true);
  }, [autoShow]);

  const StarRow = ({ label, campo }) => (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-amber-900 font-semibold text-sm">{label}</Label>
        <span className="text-xs font-bold text-amber-700">{avaliacao[campo]} ⭐</span>
      </div>
      <div className="flex gap-2 mt-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setAvaliacao(prev => ({ ...prev, [campo]: n }))}
            className="transition-all hover:scale-125 focus:outline-none"
          >
            <Star className={`w-7 h-7 ${n <= avaliacao[campo] ? 'fill-amber-500 text-amber-500' : 'fill-none text-gray-300'}`} />
          </button>
        ))}
      </div>
    </div>
  );

  const handleEnviar = () => {
    onAvaliar(avaliacao);
  };

  if (chamado.satisfacao_respondida || chamado.avaliacao_data) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
        <p className="text-green-800 font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Avaliação de Satisfação registrada · Média: {chamado.avaliacao_nota_geral ? Number(chamado.avaliacao_nota_geral).toFixed(1) : "5.0"} ⭐
        </p>
        {chamado.avaliacao_comentario && (
          <p className="text-sm text-green-700 mt-1">"{chamado.avaliacao_comentario}"</p>
        )}
      </div>
    );
  }

  if (chamado.status !== "Concluído") return null;

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mt-4 shadow-sm" id="bloco-avaliacao-facilities">
      <p className="font-bold text-amber-900 mb-3 flex items-center gap-2 text-base">
        <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
        Pesquisa de Satisfação do Serviço
      </p>
      {!show ? (
        <Button onClick={() => setShow(true)} className="bg-amber-600 hover:bg-amber-700 w-full text-white font-semibold">
          Avaliar Atendimento de Facilities
        </Button>
      ) : (
        <div className="space-y-4">
          <StarRow label="Tempo de Atendimento e Resolução" campo="tempo_resolucao" />
          <StarRow label="Qualidade e Postura da Equipe" campo="qualidade_atendimento" />
          <StarRow label="Qualidade do Serviço Executado" campo="qualidade_solucao" />
          <StarRow label="Comunicação e Clareza" campo="comunicacao" />
          <div>
            <Label className="text-amber-900 font-semibold">Comentários e Sugestões (opcional)</Label>
            <Textarea
              placeholder="Conte como foi o atendimento da equipe de Facilities..."
              rows={2}
              value={avaliacao.comentario}
              onChange={e => setAvaliacao(prev => ({ ...prev, comentario: e.target.value }))}
              className="mt-1 bg-white"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShow(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white flex-1 font-semibold" onClick={handleEnviar} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : "Enviar Avaliação"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortalFacilities() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState("lista"); // "lista" | "novo"
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [autoShowAvaliacao, setAutoShowAvaliacao] = useState(false);
  
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

  const { data: chamadosFacilities = [], isLoading } = useQuery({
    queryKey: ['portal_facilities_list'],
    queryFn: () => base44.entities.ChamadosFacilities.list('-created_date'),
    enabled: !!colaborador,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        solicitante_id: colaborador.id || null,
        solicitante_nome: colaborador.nome_completo,
        area_departamento: colaborador.area || "",
        telefone_ramal: colaborador.telefone || "",
        email: colaborador.email || "",
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
            descricao: `Solicitação aberta por ${colaborador.nome_completo}`,
            usuario_nome: colaborador.nome_completo,
            usuario: colaborador.nome_completo,
            usuario_id: colaborador.id || null,
            status_anterior: null,
            status_novo: "Aberto",
            anexos: anexos || []
          }
        ]
      };

      const res = await base44.entities.ChamadosFacilities.create(payload);
      if (res?.id) {
        base44.functions.invoke('sendEmailFacilitiesCreated', { chamado_id: res.id }).catch(e => console.warn('Erro envio email abertura facilities:', e));
      }
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal_facilities_list'] });
      setSubmitSuccess(data?.numero_solicitacao || "FAC-Registrado");
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
      alert("Erro ao enviar solicitação: " + (err.message || "Tente novamente"));
    }
  });

  const avaliacaoMutation = useMutation({
    mutationFn: async ({ id, av }) => {
      const t = Number(av.tempo_resolucao) || 5;
      const q = Number(av.qualidade_atendimento) || 5;
      const s = Number(av.qualidade_solucao) || 5;
      const c = Number(av.comunicacao) || 5;
      const nota = (t + q + s + c) / 4;
      const notaFinal = Math.round(nota * 10) / 10;

      const novoHistorico = [...(selectedChamado?.historico || [])];
      novoHistorico.push({
        data_hora: new Date().toISOString(),
        tipo: "avaliacao",
        descricao: `Pesquisa de satisfação respondida com nota geral ${notaFinal.toFixed(1)}/5 ⭐${av.comentario ? ` — Comentário: "${av.comentario}"` : ""}`,
        usuario_nome: colaborador.nome_completo,
        usuario: colaborador.nome_completo,
        usuario_id: colaborador.id || null,
        status_anterior: selectedChamado?.status,
        status_novo: selectedChamado?.status,
        anexos: []
      });

      return await base44.entities.ChamadosFacilities.update(id, {
        satisfacao_respondida: true,
        avaliacao_tempo_resolucao: t,
        avaliacao_qualidade_atendimento: q,
        avaliacao_qualidade_solucao: s,
        avaliacao_comunicacao: c,
        avaliacao_nota_geral: notaFinal,
        avaliacao_comentario: av.comentario || "",
        avaliacao_data: new Date().toISOString(),
        historico: novoHistorico
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_facilities_list'] });
      setSelectedChamado(null);
      setAutoShowAvaliacao(false);
    },
    onError: (err) => {
      console.error("Erro ao enviar avaliação:", err);
      alert("Não foi possível registrar sua avaliação. Tente novamente.");
    }
  });

  if (loading || !colaborador) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const nomeNorm = normalizeUserName(colaborador.nome_completo);
  const emailNorm = (colaborador.email || "").toLowerCase().trim();
  const colabIdStr = colaborador?.id ? String(colaborador.id) : "";

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

  // Tela de sucesso após abertura
  if (view === "novo" && submitSuccess) {
    return (
      <PortalLayout colaborador={colaborador} onLogout={logout} permissoesComunicados={colaborador.permissoes_comunicados || []}>
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
              Ver Minhas Solicitações
            </Button>
            <Button variant="outline" onClick={() => setSubmitSuccess(null)} className="w-full">
              Abrir Outra Solicitação
            </Button>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // Formulário de Nova Solicitação
  if (view === "novo") {
    return (
      <PortalLayout colaborador={colaborador} onLogout={logout} permissoesComunicados={colaborador.permissoes_comunicados || []}>
        <div className="p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <Button variant="outline" className="mb-6 gap-2" onClick={() => setView("lista")}>
              <ChevronLeft className="w-4 h-4" /> Voltar para Solicitações
            </Button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Solicitação de Facilities</h1>
                <p className="text-muted-foreground text-sm">Serviços prediais, infraestrutura, manutenção e conservação</p>
              </div>
            </div>

            <Card className="shadow-lg border-border">
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
                <CardContent className="pt-6 space-y-6">
                  
                  {/* Bloco 1: Identificação do Solicitante (Fixa/Automática) */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-border rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-600" /> Identificação do Solicitante
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">Nome:</span>
                        <p className="font-semibold text-foreground">{colaborador.nome_completo}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Área / Departamento:</span>
                        <p className="font-semibold text-foreground">{colaborador.area || "Não informada"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">E-mail:</span>
                        <p className="font-semibold text-foreground">{colaborador.email || "Não informado"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Telefone / Ramal:</span>
                        <p className="font-semibold text-foreground">{colaborador.telefone || "Não informado"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Local da Ocorrência */}
                  <div>
                    <Label className="flex items-center gap-1.5 font-semibold text-foreground">
                      <MapPin className="w-4 h-4 text-amber-600" /> Local da Ocorrência *
                    </Label>
                    <Input
                      required
                      placeholder="Ex: Prédio Administrativo - 2º Andar - Sala de Reunião 01 / Galpão 3 - Linha de Envase"
                      value={formData.local_ocorrencia}
                      onChange={(e) => setFormData(p => ({ ...p, local_ocorrencia: e.target.value }))}
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Especifique o prédio, andar, setor ou ambiente exato onde o serviço é necessário.</p>
                  </div>

                  {/* Bloco 3: Tipo de Serviço */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold text-foreground">Tipo de Serviço *</Label>
                      <Select
                        required
                        value={formData.tipo_servico}
                        onValueChange={(val) => setFormData(p => ({ ...p, tipo_servico: val, tipo_servico_outro: val === "Outros" ? p.tipo_servico_outro : "" }))}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Selecione o tipo de serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_SERVICO.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="font-semibold text-foreground">Prioridade Sugerida *</Label>
                      <Select
                        required
                        value={formData.prioridade}
                        onValueChange={(val) => setFormData(p => ({ ...p, prioridade: val }))}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Baixa">Baixa (Pode aguardar planejamento)</SelectItem>
                          <SelectItem value="Média">Média (Atendimento padrão)</SelectItem>
                          <SelectItem value="Alta">Alta (Impacta rotina do setor)</SelectItem>
                          <SelectItem value="Crítica">Crítica (Risco imediato à segurança/operação)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Campo condicional para Outros */}
                  {formData.tipo_servico === "Outros" && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3">
                      <Label className="font-semibold text-amber-900 dark:text-amber-200">Especifique o Tipo de Serviço *</Label>
                      <Input
                        required
                        placeholder="Descreva a categoria ou tipo de serviço específico"
                        value={formData.tipo_servico_outro}
                        onChange={(e) => setFormData(p => ({ ...p, tipo_servico_outro: e.target.value }))}
                        className="mt-1 bg-white dark:bg-background"
                      />
                    </div>
                  )}

                  {/* Bloco 4: Descrição Detalhada */}
                  <div>
                    <Label className="font-semibold text-foreground">Descrição Detalhada do Problema / Solicitação *</Label>
                    <Textarea
                      required
                      placeholder="Descreva claramente o que precisa ser feito, sintomas observados, dimensões, quantidade, se há vazamento, ruído anormal, lâmpada queimada, etc."
                      rows={4}
                      value={formData.descricao}
                      onChange={(e) => setFormData(p => ({ ...p, descricao: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>

                  {/* Bloco 5: Necessidade de Parada da Área */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          Necessita de Parada da Área ou Equipamento?
                        </p>
                        <p className="text-xs text-muted-foreground">Indique se a execução do serviço exigirá isolar o local ou pausar máquinas.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={formData.necessita_parada_area ? "default" : "outline"}
                          className={formData.necessita_parada_area ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                          onClick={() => setFormData(p => ({ ...p, necessita_parada_area: true }))}
                        >
                          Sim
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={!formData.necessita_parada_area ? "secondary" : "outline"}
                          onClick={() => setFormData(p => ({ ...p, necessita_parada_area: false, periodo_parada: "" }))}
                        >
                          Não
                        </Button>
                      </div>
                    </div>

                    {formData.necessita_parada_area && (
                      <div className="pt-2 border-t border-border">
                        <Label className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                          Qual o melhor período / horário para a parada?
                        </Label>
                        <Input
                          placeholder="Ex: Após o expediente (18h), Sábado pela manhã, Durante intervalo de almoço..."
                          value={formData.periodo_parada}
                          onChange={(e) => setFormData(p => ({ ...p, periodo_parada: e.target.value }))}
                          className="mt-1 bg-white dark:bg-background text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bloco 6: Anexos e Fotos */}
                  <div>
                    <Label className="flex items-center gap-2 font-semibold text-foreground">
                      <Paperclip className="w-4 h-4 text-amber-600" /> Fotos e Anexos (opcional)
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">Fotos do local ou do problema facilitam a triagem e o atendimento rápido.</p>
                    <label className="flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-xl p-5 hover:border-amber-500 hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        className="hidden"
                        disabled={uploadingAnexo}
                        onChange={async (e) => {
                          const files = Array.from(e.target.files);
                          if (!files.length) return;
                          setUploadingAnexo(true);
                          const novosAnexos = [...anexos];
                          for (const file of files) {
                            try {
                              const { file_url } = await base44.integrations.Core.UploadFile({ file });
                              novosAnexos.push({
                                file_url,
                                file_name: file.name,
                                file_type: file.type.startsWith('image') ? 'imagem' : 'arquivo',
                                mime_type: file.type
                              });
                            } catch (uploadErr) {
                              console.error("Erro no upload:", uploadErr);
                              alert(`Erro ao subir ${file.name}`);
                            }
                          }
                          setAnexos(novosAnexos);
                          setUploadingAnexo(false);
                          e.target.value = "";
                        }}
                      />
                      {uploadingAnexo ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                          <span className="text-sm font-medium text-amber-600">Enviando arquivos...</span>
                        </>
                      ) : (
                        <div className="text-center">
                          <Paperclip className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                          <span className="text-sm font-medium text-foreground">Clique para adicionar fotos ou documentos</span>
                          <p className="text-xs text-muted-foreground">PNG, JPG, PDF até 10MB</p>
                        </div>
                      )}
                    </label>

                    {anexos.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {anexos.map((a, i) => (
                          <div key={i} className="flex items-center justify-between bg-muted/60 rounded-lg px-3 py-2 text-sm">
                            <span className="truncate flex items-center gap-2">
                              📎 {a.file_name}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAnexos(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-muted-foreground hover:text-destructive ml-2 shrink-0 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </CardContent>

                <div className="border-t p-5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 rounded-b-xl">
                  <Button type="button" variant="outline" onClick={() => setView("lista")}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-2"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Registrar Solicitação</>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // Card da Lista de Solicitações
  const SolicitationCard = ({ chamado, showAvaliarBtn = false }) => (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border rounded-xl hover:shadow-md cursor-pointer transition-all gap-3 border-border hover:border-amber-300"
      onClick={() => setSelectedChamado(chamado)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
            {chamado.numero_solicitacao || "FAC-Pendente"}
          </span>
          <Badge className={`${statusColors[chamado.status] || "bg-gray-100 text-gray-800"} border text-xs`}>
            {chamado.status}
          </Badge>
          <Badge className={`text-xs ${prioridadeColors[chamado.prioridade] || "bg-gray-100 text-gray-700"}`}>
            {chamado.prioridade}
          </Badge>
          {chamado.necessita_parada_area && (
            <Badge variant="outline" className="text-[11px] text-amber-700 border-amber-300 bg-amber-50">
              Parada Necessária
            </Badge>
          )}
        </div>

        <h4 className="font-semibold text-foreground text-sm truncate">{chamado.tipo_servico} · {chamado.local_ocorrencia}</h4>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{chamado.descricao}</p>
        
        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {chamado.created_date ? format(parseISO(chamado.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—"}
          </span>
          {chamado.responsavel_analise_nome && (
            <span>• Responsável: {chamado.responsavel_analise_nome}</span>
          )}
          {chamado.data_conclusao && (
            <span className="text-green-700 dark:text-green-400 font-medium">
              • Concluído em {format(parseISO(chamado.data_conclusao), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {showAvaliarBtn && (
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedChamado(chamado);
              setAutoShowAvaliacao(true);
            }}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            Avaliar
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
          <Eye className="w-4 h-4 mr-1" /> Detalhes
        </Button>
      </div>
    </div>
  );

  const TabFacilitiesContent = ({ lista, empty, showAvaliarBtn = false }) => (
    <div className="space-y-3">
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Carregando solicitações...</p>
        </div>
      ) : lista.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-xl border-dashed">
          <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{empty}</p>
        </div>
      ) : (
        lista.map(c => (
          <SolicitationCard key={c.id} chamado={c} showAvaliarBtn={showAvaliarBtn} />
        ))
      )}
    </div>
  );

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout} permissoesComunicados={colaborador.permissoes_comunicados || []}>
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Solicitações de Facilities</h1>
                <p className="text-muted-foreground text-sm">Acompanhe e registre manutenções, limpeza e serviços prediais</p>
              </div>
            </div>
            <Button
              onClick={() => setView("novo")}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Solicitação
            </Button>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-red-600">{abertosAnalise.length}</p>
                <p className="text-xs text-muted-foreground font-medium">Em Aberto / Análise</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{emExecucao.length}</p>
                <p className="text-xs text-muted-foreground font-medium">Em Execução</p>
              </CardContent>
            </Card>
            <Card className={aguardandoAvaliacao.length > 0 ? "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20" : ""}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-2xl font-bold ${aguardandoAvaliacao.length > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {aguardandoAvaliacao.length}
                </p>
                <p className="text-xs text-muted-foreground font-medium">Aguard. Avaliação</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-green-600">{concluidosCancelados.length}</p>
                <p className="text-xs text-muted-foreground font-medium">Concluídos</p>
              </CardContent>
            </Card>
          </div>

          {/* Banner de Avaliação Pendente */}
          {aguardandoAvaliacao.length > 0 && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
              <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
              <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
                <span>Você tem <strong>{aguardandoAvaliacao.length} solicitação(ões)</strong> concluída(s) aguardando sua avaliação de satisfação.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Abas */}
          <Tabs defaultValue="abertos">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="abertos" className="text-xs">
                Em Aberto ({abertosAnalise.length})
              </TabsTrigger>
              <TabsTrigger value="execucao" className="text-xs">
                Em Execução ({emExecucao.length})
              </TabsTrigger>
              <TabsTrigger value="avaliacao" className="text-xs">
                Aguard. Avaliação ({aguardandoAvaliacao.length})
              </TabsTrigger>
              <TabsTrigger value="concluidos" className="text-xs">
                Concluídos ({concluidosCancelados.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="abertos">
              <TabFacilitiesContent lista={abertosAnalise} empty="Nenhuma solicitação em aberto ou em análise no momento." />
            </TabsContent>
            <TabsContent value="execucao">
              <TabFacilitiesContent lista={emExecucao} empty="Nenhuma solicitação em execução no momento." />
            </TabsContent>
            <TabsContent value="avaliacao">
              <TabFacilitiesContent
                lista={aguardandoAvaliacao}
                empty="Nenhuma solicitação aguardando avaliação no momento."
                showAvaliarBtn
              />
            </TabsContent>
            <TabsContent value="concluidos">
              <TabFacilitiesContent lista={concluidosCancelados} empty="Nenhuma solicitação concluída encontrada." />
            </TabsContent>
          </Tabs>

        </div>
      </div>

      {/* Modal de Detalhes da Solicitação */}
      <Dialog open={!!selectedChamado} onOpenChange={(open) => { if (!open) { setSelectedChamado(null); setAutoShowAvaliacao(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedChamado && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {selectedChamado.numero_solicitacao}
                  </span>
                  <Badge className={statusColors[selectedChamado.status] || "bg-gray-100"}>
                    {selectedChamado.status}
                  </Badge>
                  <Badge className={prioridadeColors[selectedChamado.prioridade] || "bg-gray-100"}>
                    Prioridade: {selectedChamado.prioridade}
                  </Badge>
                </div>
                <DialogTitle className="text-xl font-bold">
                  {selectedChamado.tipo_servico}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  {selectedChamado.local_ocorrencia}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                
                {/* Detalhes da Solicitação */}
                <div className="bg-muted/40 rounded-xl p-4 space-y-2 border border-border">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição do Pedido</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedChamado.descricao}</p>
                  
                  {selectedChamado.tipo_servico_outro && (
                    <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded">
                      <strong>Especificação Outros:</strong> {selectedChamado.tipo_servico_outro}
                    </p>
                  )}

                  {selectedChamado.necessita_parada_area && (
                    <div className="pt-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                      ⚠️ <strong>Parada de Área solicitada:</strong> {selectedChamado.periodo_parada || "Sem período especificado"}
                    </div>
                  )}
                </div>

                {/* Anexos */}
                {Array.isArray(selectedChamado.anexos) && selectedChamado.anexos.length > 0 && (
                  <div className="border border-border rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-amber-600" /> Anexos e Fotos ({selectedChamado.anexos.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedChamado.anexos.map((anexo, idx) => (
                        <a
                          key={idx}
                          href={anexo.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card hover:bg-muted text-xs truncate transition-colors"
                        >
                          <span>📎</span>
                          <span className="truncate font-medium text-blue-600 dark:text-blue-400">{anexo.file_name || `Anexo ${idx + 1}`}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bloco de Atendimento e Execução (quando preenchido pelo Facilities) */}
                {(selectedChamado.responsavel_analise_nome || selectedChamado.descricao_servico_executado || selectedChamado.fornecedor_nome || selectedChamado.prazo_atendimento) && (
                  <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 rounded-xl p-4 space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" /> Informações de Atendimento
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {selectedChamado.responsavel_analise_nome && (
                        <div>
                          <span className="text-muted-foreground">Responsável pela Análise:</span>
                          <p className="font-semibold text-foreground">{selectedChamado.responsavel_analise_nome}</p>
                        </div>
                      )}
                      {selectedChamado.prazo_atendimento && (
                        <div>
                          <span className="text-muted-foreground">Prazo Estimado:</span>
                          <p className="font-semibold text-foreground">{selectedChamado.prazo_atendimento}</p>
                        </div>
                      )}
                      {selectedChamado.tratamento && (
                        <div>
                          <span className="text-muted-foreground">Tratamento:</span>
                          <p className="font-semibold text-foreground">{selectedChamado.tratamento}</p>
                        </div>
                      )}
                      {selectedChamado.fornecedor_nome && (
                        <div>
                          <span className="text-muted-foreground">Fornecedor / Prestador:</span>
                          <p className="font-semibold text-foreground">{selectedChamado.fornecedor_nome}</p>
                        </div>
                      )}
                    </div>

                    {selectedChamado.descricao_servico_executado && (
                      <div className="pt-2 border-t border-blue-200/60">
                        <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">Serviço Executado:</span>
                        <p className="text-xs text-foreground whitespace-pre-wrap mt-0.5">{selectedChamado.descricao_servico_executado}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Histórico / Timeline de Etapas */}
                <div className="border border-border rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Linha do Tempo e Histórico
                  </h4>

                  {(!Array.isArray(selectedChamado.historico) || selectedChamado.historico.length === 0) ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum evento adicional registrado.</p>
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

                          {/* Anexos vinculados a esta etapa específica */}
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
                                    className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-900 text-[11px] font-medium transition-colors"
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

                {/* Pesquisa de Satisfação */}
                <AvaliacaoFacilities
                  chamado={selectedChamado}
                  onAvaliar={(av) => avaliacaoMutation.mutate({ id: selectedChamado.id, av })}
                  loading={avaliacaoMutation.isPending}
                  autoShow={autoShowAvaliacao}
                />

              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
