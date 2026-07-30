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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Headset, Plus, Loader2, CheckCircle, Star, ChevronLeft, Laptop, Send, Paperclip, X, FolderKanban, Calendar, DollarSign, Users, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { format, isBefore, startOfDay, parseISO } from "date-fns";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";

const statusColors = {
  "Aberto": "bg-red-100 text-red-800",
  "Em Análise": "bg-yellow-100 text-yellow-800",
  "Em Andamento": "bg-blue-100 text-blue-800",
  "Aguardando Peça": "bg-orange-100 text-orange-800",
  "Aguardando Avaliação": "bg-purple-100 text-purple-800",
  "Resolvido": "bg-green-100 text-green-800",
  "Cancelado": "bg-gray-100 text-gray-800",
};

const statusColorsProjetoPortal = {
  "Em Planejamento": "bg-slate-100 text-slate-800 border-slate-300",
  "Aprovado": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Em Execução": "bg-blue-100 text-blue-900 border-blue-300",
  "Congelado": "bg-slate-200 text-slate-700 border-slate-300 shadow-sm font-medium",
  "Em Homologação": "bg-purple-100 text-purple-900 border-purple-300",
  "Concluído": "bg-emerald-600 text-white border-emerald-700",
  "Cancelado": "bg-rose-100 text-rose-800 border-rose-200",
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

function AvaliacaoChamado({ chamado, onAvaliar, loading, autoShow = false }) {
  const [show, setShow] = useState(autoShow);
  const [avaliacao, setAvaliacao] = useState({ tempo_resolucao: 5, qualidade_atendimento: 5, qualidade_solucao: 5, comunicacao: 5, comentario: "" });

  useEffect(() => {
    if (autoShow) setShow(true);
  }, [autoShow]);

  const StarRow = ({ label, campo }) => (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-yellow-900 font-semibold text-sm">{label}</Label>
        <span className="text-xs font-bold text-yellow-700">{avaliacao[campo]} ⭐</span>
      </div>
      <div className="flex gap-2 mt-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setAvaliacao(prev => ({ ...prev, [campo]: n }))} className="transition-all hover:scale-125 focus:outline-none">
            <Star className={`w-7 h-7 ${n <= avaliacao[campo] ? 'fill-yellow-500 text-yellow-500' : 'fill-none text-gray-300'}`} />
          </button>
        ))}
      </div>
    </div>
  );

  const handleEnviar = () => {
    onAvaliar(avaliacao);
  };

  if (chamado.avaliacao_data) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
        <p className="text-green-800 font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4" />Avaliação enviada · Nota: {chamado.avaliacao_nota_geral?.toFixed(1)} ⭐</p>
        {chamado.avaliacao_comentario && <p className="text-sm text-green-700 mt-1">"{chamado.avaliacao_comentario}"</p>}
      </div>
    );
  }

  if (chamado.status !== "Aguardando Avaliação" && chamado.status !== "Resolvido") return null;

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mt-4 shadow-sm" id="bloco-avaliacao">
      <p className="font-bold text-yellow-900 mb-3 flex items-center gap-2 text-base"><Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />Avalie nosso atendimento</p>
      {!show ? (
        <Button onClick={() => setShow(true)} className="bg-yellow-600 hover:bg-yellow-700 w-full text-white font-semibold">Avaliar Atendimento Agora</Button>
      ) : (
        <div className="space-y-4">
          <StarRow label="Tempo de Resolução" campo="tempo_resolucao" />
          <StarRow label="Qualidade do Atendimento" campo="qualidade_atendimento" />
          <StarRow label="Qualidade da Solução" campo="qualidade_solucao" />
          <StarRow label="Comunicação" campo="comunicacao" />
          <div>
            <Label className="text-yellow-900 font-semibold">Comentários (opcional)</Label>
            <Textarea placeholder="Escreva aqui seu comentário sobre o atendimento..." rows={2} value={avaliacao.comentario} onChange={e => setAvaliacao(prev => ({ ...prev, comentario: e.target.value }))} className="mt-1 bg-white" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShow(false)}>Cancelar</Button>
            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white flex-1 font-semibold" onClick={handleEnviar} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : "Enviar Avaliação"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortalChamados() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState("lista"); // "lista" | "novo"
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [autoShowAvaliacao, setAutoShowAvaliacao] = useState(false);
  const [formData, setFormData] = useState({
    tipo_solicitacao: "", sistema_tipo: "", sistema_subtipo: "", impressora_subtipo: "",
    equipamento_subtipo: "", equipamento_selecionado: "", equipamento_outros_detalhes: "",
    melhorias_detalhes: "", desenvolvimento_detalhes: "", servidor_subtipo: "",
    titulo_chamado: "", descricao_problema: "", urgencia: "Média",
  });
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [equipamentosUsuario, setEquipamentosUsuario] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);

  useEffect(() => {
    if (!loading) requireAuth();
  }, [loading]);

  const { data: chamados = [], isLoading } = useQuery({
    queryKey: ['portal_chamados_list'],
    queryFn: () => base44.entities.Chamados.list('-created_date'),
    enabled: !!colaborador,
  });

  const [selectedProjetoPortal, setSelectedProjetoPortal] = useState(null);
  const [novaMsgChatPortal, setNovaMsgChatPortal] = useState("");
  const [tabDetalhesProjeto, setTabDetalhesProjeto] = useState("geral");

  const { data: todosProjetos = [], isLoading: loadingProjetos } = useQuery({
    queryKey: ['portal_projetos_internos_list'],
    queryFn: () => base44.entities.ProjetosInternos.list('-created_at'),
    enabled: !!colaborador,
  });

  const { data: chatMessagesProjeto = [] } = useQuery({
    queryKey: ['portal_projetos_chat', selectedProjetoPortal?.id],
    queryFn: () => base44.entities.ProjetosChat.filter({ projeto_id: selectedProjetoPortal?.id }, 'data_hora'),
    enabled: !!selectedProjetoPortal?.id,
  });

  useEffect(() => {
    if (!selectedProjetoPortal?.id) return;
    const unsubscribe = base44.entities.ProjetosChat.subscribe((newRecord) => {
      if (newRecord?.projeto_id === selectedProjetoPortal.id) {
        queryClient.invalidateQueries({ queryKey: ['portal_projetos_chat', selectedProjetoPortal.id] });
      }
    });
    return () => unsubscribe();
  }, [selectedProjetoPortal?.id, queryClient]);

  const enviarChatPortalMutation = useMutation({
    mutationFn: async (texto) => {
      return await base44.entities.ProjetosChat.create({
        projeto_id: selectedProjetoPortal.id,
        remetente_id: String(colaborador.id || ""),
        remetente_nome: colaborador.nome_completo,
        remetente_email: colaborador.email || "",
        tipo_remetente: "colaborador",
        mensagem: texto,
        data_hora: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_projetos_chat', selectedProjetoPortal?.id] });
      setNovaMsgChatPortal("");
    }
  });

  // Buscar equipamentos SEMPRE (não só quando view === "novo")
  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['portal_pcs_cham'],
    queryFn: () => base44.entities.PCs_Internos.list(),
    enabled: !!colaborador,
  });
  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['portal_nbs_cham'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
    enabled: !!colaborador,
  });
  const { data: smartphones = [] } = useQuery({
    queryKey: ['portal_smartphones_cham'],
    queryFn: () => base44.entities.Smartphones.list(),
    enabled: !!colaborador,
  });
  const { data: cameras = [] } = useQuery({
    queryKey: ['portal_cameras_cham'],
    queryFn: () => base44.entities.Cameras.list(),
    enabled: !!colaborador,
  });
  const { data: coletores = [] } = useQuery({
    queryKey: ['portal_coletores_cham'],
    queryFn: () => base44.entities.Coletores.list(),
    enabled: !!colaborador,
  });
  const { data: canetas = [] } = useQuery({
    queryKey: ['portal_canetas_cham'],
    queryFn: () => base44.entities.Canetas_Vibracao.list(),
    enabled: !!colaborador,
  });

  // Atualiza equipamentos do usuário quando dados chegam
  useEffect(() => {
    if (!colaborador) return;
    const nomeNorm = normalizeUserName(colaborador.nome_completo);
    const lista = [];
    const add = (arr, tipo) => arr.forEach(e => {
      if (normalizeUserName(e.usuario_atual) === nomeNorm) {
        lista.push({ id: e.id, tipo: tipo || e.tipo || "Equipamento", marca: e.marca || "", modelo: e.modelo || "", etiqueta: e.etiqueta_interna || e.numero_sequencial || "", displayName: `${tipo || e.tipo || "Equipamento"} - ${e.marca || ""} ${e.modelo || ""}${e.etiqueta_interna ? ` (${e.etiqueta_interna})` : ""}` });
      }
    });
    add(pcsInternos, null);
    add(notebooksExternos, "Notebook Externo");
    add(smartphones, "Smartphone");
    add(cameras, "Câmera");
    add(coletores, "Coletor");
    add(canetas, "Caneta Vibração");
    setEquipamentosUsuario(lista);
  }, [colaborador, pcsInternos, notebooksExternos, smartphones, cameras, coletores, canetas]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const gerarNumeroChamado = () => {
        const now = Date.now();
        const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `CHM-${now}-${rand}`;
      };
      const numeroChamado = gerarNumeroChamado();
      const equipamentosParaChamado = equipamentosUsuario.map(e => ({ tipo: e.tipo, marca: e.marca, modelo: e.modelo, etiqueta: e.etiqueta }));

      const chamado = await base44.entities.Chamados.create({
        ...data,
        numero_chamado: numeroChamado,
        solicitante_nome: colaborador.nome_completo,
        solicitante_email: colaborador.email,
        solicitante_area: colaborador.area,
        solicitante_telefone: colaborador.telefone || "",
        status: "Aberto",
        data_abertura: new Date().toISOString().split('T')[0],
        equipamentos_usuario: equipamentosParaChamado,
        anexos: anexos,
      });

      // Dispara email de confirmação para o solicitante e para o admin
      base44.functions.invoke('sendEmailTicketCreated', { chamado_id: chamado.id }).catch(() => {});

      return { chamado, numeroChamado };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal_chamados_list'] });
      setSubmitSuccess(data.numeroChamado);
      setFormData({ tipo_solicitacao: "", sistema_tipo: "", sistema_subtipo: "", impressora_subtipo: "", equipamento_subtipo: "", equipamento_selecionado: "", equipamento_outros_detalhes: "", melhorias_detalhes: "", desenvolvimento_detalhes: "", servidor_subtipo: "", titulo_chamado: "", descricao_problema: "", urgencia: "Média" });
      setAnexos([]);
    },
  });

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['chamados_chat', selectedChamado?.id],
    queryFn: () => base44.entities.ChamadosChat.filter({ chamado_id: selectedChamado?.id }, 'data_hora'),
    enabled: !!selectedChamado?.id,
  });

  useEffect(() => {
    if (!selectedChamado?.id) return;

    const unsubscribe = base44.entities.ChamadosChat.subscribe((newRecord) => {
      if (newRecord.chamado_id === selectedChamado.id) {
        queryClient.invalidateQueries({ queryKey: ['chamados_chat', selectedChamado.id] });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedChamado?.id, queryClient]);

  const [novaMsg, setNovaMsg] = useState("");

  const enviarMsgMutation = useMutation({
    mutationFn: async ({ msg }) => {
      const chatMsg = await base44.entities.ChamadosChat.create({
        chamado_id: selectedChamado.id,
        tipo_remetente: "solicitante",
        remetente_nome: colaborador.nome_completo,
        remetente_email: colaborador.email,
        mensagem: msg || "",
        data_hora: new Date().toISOString(),
      });

      base44.functions.invoke('sendEmailChatMessage', {
        chamado_id: selectedChamado.id,
        tipo_remetente: 'solicitante',
        remetente_nome: colaborador.nome_completo,
        mensagem: msg,
      }).catch(err => console.error("Erro ao enviar email:", err));

      return chatMsg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados_chat', selectedChamado?.id] });
      setNovaMsg("");
    },
  });



  const avaliacaoMutation = useMutation({
    mutationFn: async ({ id, av }) => {
      const t = Number(av.tempo_resolucao) || 5;
      const q = Number(av.qualidade_atendimento) || 5;
      const s = Number(av.qualidade_solucao) || 5;
      const c = Number(av.comunicacao) || 5;
      const nota = (t + q + s + c) / 4;

      return await base44.entities.Chamados.update(id, {
        avaliacao_tempo_resolucao: t,
        avaliacao_qualidade_atendimento: q,
        avaliacao_qualidade_solucao: s,
        avaliacao_comunicacao: c,
        avaliacao_nota_geral: Math.round(nota * 10) / 10,
        avaliacao_comentario: av.comentario || "",
        avaliacao_data: new Date().toISOString(),
        status: "Resolvido",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_chamados_list'] });
      setSelectedChamado(null);
      setAutoShowAvaliacao(false);
    },
    onError: (err) => {
      console.error("Erro ao enviar avaliação:", err);
      alert("Não foi possível salvar a avaliação. Tente novamente.");
    }
  });

  if (loading || !colaborador) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const nomeNorm = normalizeUserName(colaborador.nome_completo);
  const emailNorm = (colaborador.email || "").toLowerCase().trim();

  const meusChamados = chamados.filter(c => {
    if (!c) return false;
    const matchEmail = emailNorm && c.solicitante_email && (c.solicitante_email.toLowerCase().trim() === emailNorm);
    const solicitanteNorm = normalizeUserName(c.solicitante_nome);
    const matchNomeExact = solicitanteNorm === nomeNorm;
    const matchNomePartial = (
      solicitanteNorm.length > 3 && nomeNorm.length > 3 && (
        solicitanteNorm.includes(nomeNorm) || nomeNorm.includes(solicitanteNorm)
      )
    );
    return matchEmail || matchNomeExact || matchNomePartial;
  });

  const colabIdStr = colaborador?.id ? String(colaborador.id) : "";
  const meusProjetos = todosProjetos.filter(p => {
    if (!p) return false;
    const isSolicitante = (p.solicitante_id && String(p.solicitante_id) === colabIdStr) ||
      (p.solicitante_nome && normalizeUserName(p.solicitante_nome) === nomeNorm);
    const isResponsavel = (p.responsavel_id && String(p.responsavel_id) === colabIdStr) ||
      (p.responsavel_nome && normalizeUserName(p.responsavel_nome) === nomeNorm);
    const isParticipante = Array.isArray(p.participantes_ids) && p.participantes_ids.some(id => String(id) === colabIdStr);
    return isSolicitante || isResponsavel || isParticipante;
  });

  const ehChamadoSemNota = (c) => {
    if (!c) return false;
    const semNota = !c.avaliacao_data && (c.avaliacao_nota_geral === null || c.avaliacao_nota_geral === undefined || c.avaliacao_nota_geral === 0);
    const statusValido = !c.status ||
      c.status === "Aguardando Avaliação" ||
      c.status === "Resolvido" ||
      c.status.toLowerCase().includes("aguard") ||
      c.status.toLowerCase().includes("resolv");
    return semNota && statusValido;
  };

  // 4 categorias conforme solicitado
  const naoIniciados = meusChamados.filter(c => c.status === "Aberto" || c.status === "Em Análise");
  const emAndamento = meusChamados.filter(c => c.status === "Em Andamento" || c.status === "Aguardando Peça");
  const aguardandoAvaliacao = meusChamados.filter(c => ehChamadoSemNota(c) || c.status === "Aguardando Avaliação");
  const fechados = meusChamados.filter(c => (!ehChamadoSemNota(c) && (c.status === "Resolvido" || c.status === "Cancelado")));

  const handleTipoChange = (v) => setFormData(prev => ({ ...prev, tipo_solicitacao: v, sistema_tipo: "", sistema_subtipo: "", impressora_subtipo: "", equipamento_subtipo: "", equipamento_selecionado: "", equipamento_outros_detalhes: "", servidor_subtipo: "" }));

  // Tela de sucesso após abrir chamado
  if (view === "novo" && submitSuccess) {
    return (
      <PortalLayout colaborador={colaborador} onLogout={logout} permissoesComunicados={colaborador.permissoes_comunicados || []}>
        <div className="p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Chamado Aberto!</h2>
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 my-4">
            <p className="text-sm text-yellow-800 mb-1 font-semibold">Número do Chamado:</p>
            <p className="text-3xl font-bold font-mono">{submitSuccess}</p>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => { setSubmitSuccess(null); setView("lista"); }} className="bg-blue-600 hover:bg-blue-700 w-full">Ver Meus Chamados</Button>
            <Button variant="outline" onClick={() => setSubmitSuccess(null)} className="w-full">Abrir Outro Chamado</Button>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // Tela de abertura de chamado
  if (view === "novo") {
    return (
      <PortalLayout colaborador={colaborador} onLogout={logout} permissoesComunicados={colaborador.permissoes_comunicados || []}>
        <div className="p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            <Button variant="outline" className="mb-6 gap-2" onClick={() => setView("lista")}>
              <ChevronLeft className="w-4 h-4" />Voltar
            </Button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Headset className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Abrir Chamado de Suporte</h1>
                <p className="text-muted-foreground text-sm">Solicitante: {colaborador.nome_completo}</p>
              </div>
            </div>

            {/* Equipamentos vinculados */}
            {equipamentosUsuario.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Laptop className="w-4 h-4" />
                  Seus Equipamentos Cadastrados
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {equipamentosUsuario.map((eq, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-blue-100">
                      <Badge variant="outline" className="text-xs mb-1">{eq.tipo}</Badge>
                      <p className="text-sm font-medium text-gray-900">{eq.marca} {eq.modelo}</p>
                      {eq.etiqueta && <p className="text-xs text-gray-500 mt-0.5">Etiqueta: {eq.etiqueta}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Card className="shadow-xl">
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
                <CardContent className="pt-6 space-y-5">
                  <div>
                    <Label>Tipo de Solicitação *</Label>
                    <Select required value={formData.tipo_solicitacao} onValueChange={handleTipoChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      <SelectContent>
                        {["Sistema","Impressora","Equipamento","Melhorias","Desenvolvimento","Servidor","Outros"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.tipo_solicitacao === "Sistema" && (
                    <>
                      <div>
                        <Label>Sistema *</Label>
                        <Select required value={formData.sistema_tipo} onValueChange={v => setFormData(p => ({ ...p, sistema_tipo: v, sistema_subtipo: "" }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione o sistema" /></SelectTrigger>
                          <SelectContent>
                            {["WMS","Portal de Vendas","SAP"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.sistema_tipo && (
                        <div>
                          <Label>Tipo de Problema *</Label>
                          <Select required value={formData.sistema_subtipo} onValueChange={v => setFormData(p => ({ ...p, sistema_subtipo: v }))}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Problema no Sistema">Problema no Sistema</SelectItem>
                              <SelectItem value="Nova Implementação no Sistema">Nova Implementação no Sistema</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}

                  {formData.tipo_solicitacao === "Impressora" && (
                    <div>
                      <Label>Tipo de Problema *</Label>
                      <Select required value={formData.impressora_subtipo} onValueChange={v => setFormData(p => ({ ...p, impressora_subtipo: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Troca de Cartucho ou Toner">Troca de Cartucho ou Toner</SelectItem>
                          <SelectItem value="Problema na Impressora">Problema na Impressora</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.tipo_solicitacao === "Equipamento" && (
                    <div>
                      <Label>Tipo de Problema *</Label>
                      <Select required value={formData.equipamento_subtipo} onValueChange={v => setFormData(p => ({ ...p, equipamento_subtipo: v, equipamento_outros_detalhes: "" }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {["Lentidão no Computador","Problema no Monitor, Mouse ou Teclado","Problema na Máquina","Formatação","Solicitar Troca de Equipamento","Outros"].map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.equipamento_subtipo === "Outros" && (
                        <Input className="mt-2" placeholder="Descreva o problema" value={formData.equipamento_outros_detalhes} onChange={e => setFormData(p => ({ ...p, equipamento_outros_detalhes: e.target.value }))} />
                      )}
                      {equipamentosUsuario.length > 0 && (
                        <div className="mt-3">
                          <Label>Selecione o Equipamento com Problema</Label>
                          <Select value={formData.equipamento_selecionado} onValueChange={v => setFormData(p => ({ ...p, equipamento_selecionado: v }))}>
                            <SelectTrigger><SelectValue placeholder="Qual equipamento está com problema?" /></SelectTrigger>
                            <SelectContent>
                              {equipamentosUsuario.map(eq => <SelectItem key={eq.id} value={eq.displayName}>{eq.displayName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  {formData.tipo_solicitacao === "Servidor" && (
                    <div>
                      <Label>Tipo de Problema *</Label>
                      <Select required value={formData.servidor_subtipo} onValueChange={v => setFormData(p => ({ ...p, servidor_subtipo: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rede">Rede</SelectItem>
                          <SelectItem value="Internet">Internet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.tipo_solicitacao && (
                    <div>
                      <Label>Título do Chamado *</Label>
                      <Input required placeholder="Resumo curto do problema" value={formData.titulo_chamado} onChange={e => setFormData(p => ({ ...p, titulo_chamado: e.target.value }))} />
                    </div>
                  )}

                  <div>
                    <Label>Urgência *</Label>
                    <Select required value={formData.urgencia} onValueChange={v => setFormData(p => ({ ...p, urgencia: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Baixa","Média","Alta","Urgente"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Descrição do Problema *</Label>
                    <Textarea required placeholder="Descreva com detalhes: o que aconteceu, quando começou, mensagens de erro, etc." rows={4} value={formData.descricao_problema} onChange={e => setFormData(p => ({ ...p, descricao_problema: e.target.value }))} />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2"><Paperclip className="w-4 h-4" />Anexos (opcional)</Label>
                    <p className="text-xs text-muted-foreground mb-2">Adicione fotos ou imagens que ajudem a descrever o problema</p>
                    <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-lg p-4 hover:border-orange-400 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        disabled={uploadingAnexo}
                        onChange={async (e) => {
                          const files = Array.from(e.target.files);
                          if (!files.length) return;
                          setUploadingAnexo(true);
                          const novosAnexos = [...anexos];
                          for (const file of files) {
                            const { file_url } = await base44.integrations.Core.UploadFile({ file });
                            novosAnexos.push({ file_url, file_name: file.name, file_type: file.type.startsWith('image') ? 'imagem' : 'arquivo', mime_type: file.type });
                          }
                          setAnexos(novosAnexos);
                          setUploadingAnexo(false);
                          e.target.value = "";
                        }}
                      />
                      {uploadingAnexo ? (
                        <><Loader2 className="w-4 h-4 animate-spin text-orange-600" /><span className="text-sm text-orange-600">Enviando arquivo...</span></>
                      ) : (
                        <><Paperclip className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Clique para selecionar arquivos</span></>
                      )}
                    </label>
                    {anexos.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {anexos.map((a, i) => (
                          <div key={i} className="flex items-center justify-between bg-muted/50 rounded px-3 py-1.5 text-sm">
                            <span className="truncate">📎 {a.file_name}</span>
                            <button type="button" onClick={() => setAnexos(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive ml-2 shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </CardContent>
                <div className="border-t p-5 flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setView("lista")}>Cancelar</Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : "Abrir Chamado"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </PortalLayout>
    );
  }


  // Lista principal com 4 categorias
  const ChamadoCard = ({ chamado, showAvaliarBtn = false }) => (
    <div
      className="flex items-center justify-between p-4 bg-card border rounded-lg hover:shadow-sm cursor-pointer transition-all"
      onClick={() => setSelectedChamado(chamado)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground font-semibold">{chamado.numero_chamado}</span>
          <Badge className={statusColors[chamado.status] || "bg-gray-100 text-gray-800"}>{chamado.status}</Badge>
          {chamado.urgencia && (
            <Badge className={chamado.urgencia === "Urgente" ? "bg-red-100 text-red-800" : chamado.urgencia === "Alta" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-700"}>{chamado.urgencia}</Badge>
          )}
        </div>
        <p className="font-medium text-foreground truncate">{chamado.titulo_chamado || chamado.descricao_problema?.slice(0, 60)}</p>
        <p className="text-xs text-muted-foreground">{chamado.tipo_solicitacao} · {chamado.data_abertura}</p>
      </div>
      {showAvaliarBtn && (
        <Button
          size="sm"
          className="ml-3 bg-purple-600 hover:bg-purple-700 shrink-0"
          onClick={(e) => { e.stopPropagation(); setSelectedChamado(chamado); setAutoShowAvaliacao(true); }}
        >
          <Star className="w-3 h-3 mr-1" />
          Avaliar
        </Button>
      )}
    </div>
  );

  const TabContent = ({ lista, empty, showAvaliarBtn = false }) => (
    <div className="space-y-2">
      {isLoading ? <p className="text-center py-8 text-gray-500">Carregando...</p>
      : lista.length === 0 ? <p className="text-center py-8 text-gray-500">{empty}</p>
      : lista.map(c => <ChamadoCard key={c.id} chamado={c} showAvaliarBtn={showAvaliarBtn} />)}
    </div>
  );

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout} permissoesComunicados={colaborador.permissoes_comunicados || []}>
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Headset className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Meus Chamados</h1>
                <p className="text-muted-foreground mt-1">Acompanhe e abra chamados de suporte</p>
              </div>
            </div>
            <Button onClick={() => setView("novo")} className="bg-orange-600 hover:bg-orange-700 gap-2">
              <Plus className="w-4 h-4" />
              Abrir Chamado
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-red-600">{naoIniciados.length}</p><p className="text-xs text-gray-600">Em Aberto</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-blue-600">{emAndamento.length}</p><p className="text-xs text-gray-600">Em Andamento</p></CardContent></Card>
            <Card className={aguardandoAvaliacao.length > 0 ? "border-purple-300 bg-purple-50" : ""}><CardContent className="pt-4 pb-4 text-center"><p className={`text-2xl font-bold ${aguardandoAvaliacao.length > 0 ? "text-purple-700" : "text-gray-600"}`}>{aguardandoAvaliacao.length}</p><p className="text-xs text-gray-600">Aguard. Avaliação</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-green-600">{fechados.length}</p><p className="text-xs text-gray-600">Fechados</p></CardContent></Card>
          </div>

          <Tabs defaultValue="abertos">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="abertos" className="text-xs">Em Aberto ({naoIniciados.length})</TabsTrigger>
              <TabsTrigger value="andamento" className="text-xs">Em Andamento ({emAndamento.length})</TabsTrigger>
              <TabsTrigger value="avaliacao" className="text-xs">Aguard. Avaliação ({aguardandoAvaliacao.length})</TabsTrigger>
              <TabsTrigger value="fechados" className="text-xs">Fechados ({fechados.length})</TabsTrigger>
              <TabsTrigger value="projetos" className="text-xs font-semibold text-indigo-700 bg-indigo-50/50">
                Meus Projetos ({meusProjetos.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="abertos">
              <TabContent lista={naoIniciados} empty="Nenhum chamado em aberto" />
            </TabsContent>
            <TabsContent value="andamento">
              <TabContent lista={emAndamento} empty="Nenhum chamado em andamento" />
            </TabsContent>
            <TabsContent value="avaliacao">
              {aguardandoAvaliacao.length > 0 && (
                <Alert className="mb-4 bg-purple-50 border-purple-200">
                  <Star className="w-4 h-4 text-purple-600" />
                  <AlertDescription className="text-purple-800">Você tem chamados aguardando sua avaliação. Clique em "Avaliar" para finalizar.</AlertDescription>
                </Alert>
              )}
              <TabContent lista={aguardandoAvaliacao} empty="Nenhum chamado aguardando avaliação" showAvaliarBtn />
            </TabsContent>
            <TabsContent value="fechados">
              <TabContent lista={fechados} empty="Nenhum chamado fechado" />
            </TabsContent>
            <TabsContent value="projetos">
              {loadingProjetos ? (
                <p className="text-center py-8 text-slate-500">Carregando seus projetos...</p>
              ) : meusProjetos.length === 0 ? (
                <p className="text-center py-8 text-slate-500">Você não está vinculado a nenhum projeto interno no momento.</p>
              ) : (
                <div className="space-y-3">
                  {meusProjetos.map(proj => {
                    const listMarcos = Array.isArray(proj.marcos) ? proj.marcos : [];
                    const totalM = listMarcos.length;
                    const concM = listMarcos.filter(m => m.status === "Concluído").length;
                    const pctM = totalM > 0 ? Math.round((concM / totalM) * 100) : 0;
                    const hoje = startOfDay(new Date());
                    
                    let possuiAtraso = false;
                    listMarcos.forEach(m => {
                      if (m.status === "Pendente" && m.data_prevista) {
                        const d = startOfDay(parseISO(m.data_prevista));
                        if (isBefore(d, hoje)) possuiAtraso = true;
                      }
                    });

                    const temAprovacao = Array.isArray(proj.aprovacao_diretoria) && proj.aprovacao_diretoria.some(a => a.aprovado);

                    return (
                      <Card
                        key={proj.id}
                        className="border-slate-200 bg-card hover:shadow-md cursor-pointer transition-all"
                        onClick={() => {
                          setSelectedProjetoPortal(proj);
                          setTabDetalhesProjeto("geral");
                        }}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-mono text-xs text-slate-500 font-semibold">{proj.codigo_projeto}</span>
                                <Badge className={`${statusColorsProjetoPortal[proj.status] || 'bg-indigo-100 text-indigo-800'} border`}>{proj.status}</Badge>
                                <Badge variant="outline" className="text-xs">{proj.prioridade}</Badge>
                              </div>
                              <h4 className="font-bold text-slate-900 text-base">{proj.titulo}</h4>
                              <p className="text-xs text-slate-500">{proj.programa_nome}</p>
                            </div>

                            {possuiAtraso && (
                              <Badge variant="destructive" className="bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> Marco Atrasado
                              </Badge>
                            )}
                          </div>

                          {/* Barra de Progresso de Marcos */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-500 font-medium">Entregáveis Concluídos</span>
                              <span className="font-bold text-indigo-700">{concM}/{totalM} ({pctM}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-indigo-600 h-full transition-all" style={{ width: `${pctM}%` }} />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                            <span>Responsável TI: <strong className="text-slate-700">{proj.responsavel_nome || "—"}</strong></span>
                            {temAprovacao && (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                                <ShieldCheck className="w-3 h-3" /> Homologado
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal detalhes */}
      <Dialog open={!!selectedChamado} onOpenChange={() => setSelectedChamado(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chamado {selectedChamado?.numero_chamado}</DialogTitle>
          </DialogHeader>
          {selectedChamado && (
            <div className="space-y-4 text-sm">

              <div className="flex items-center justify-between flex-wrap gap-2">
                <Badge className={statusColors[selectedChamado.status]}>{selectedChamado.status}</Badge>
                <Badge className={selectedChamado.urgencia === "Urgente" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>{selectedChamado.urgencia}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground">Tipo</p><p className="font-medium text-foreground">{selectedChamado.tipo_solicitacao}</p></div>
                <div><p className="text-muted-foreground">Data Abertura</p><p className="font-medium text-foreground">{selectedChamado.data_abertura || "—"}</p></div>
                <div><p className="text-muted-foreground">Responsável</p><p className="font-medium text-foreground">{selectedChamado.responsavel || "Não atribuído"}</p></div>
                {selectedChamado.data_conclusao && <div><p className="text-muted-foreground">Data Conclusão</p><p className="font-medium text-foreground">{new Date(selectedChamado.data_conclusao).toLocaleDateString('pt-BR')}</p></div>}
              </div>
              {selectedChamado.descricao_problema && (
                <div><p className="text-muted-foreground font-semibold mb-1">Descrição</p><p className="bg-muted/50 rounded p-3 text-foreground">{selectedChamado.descricao_problema}</p></div>
              )}
              {selectedChamado.solucao && (
                <div><p className="text-muted-foreground font-semibold mb-1">Solução</p><p className="bg-green-50 dark:bg-green-950 rounded p-3 text-green-800 dark:text-green-200">{selectedChamado.solucao}</p></div>
              )}
              {/* Chat */}
              <div className="mt-6 pt-4 border-t">
                <p className="text-muted-foreground font-semibold mb-3">💬 Conversa</p>
                <div className="bg-muted/30 rounded-lg p-3 h-64 overflow-y-auto space-y-2 mb-3 border">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">Nenhuma mensagem ainda</p>
                  ) : (
                    chatMessages.map((msg, i) => {
                      const isMeuaMensagem = msg.tipo_remetente === "solicitante" && msg.remetente_email === colaborador.email;
                      return (
                      <div key={i} className={`flex ${isMeuaMensagem ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm break-words ${isMeuaMensagem ? "bg-blue-100 text-blue-900" : "bg-gray-200 text-gray-900"}`}>
                          <p className="font-semibold text-xs mb-1">{msg.remetente_nome}</p>
                          {msg.mensagem && <p className="whitespace-pre-wrap break-words">{msg.mensagem}</p>}
                          {msg.anexo_url && (
                            <a href={msg.anexo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1 text-xs underline opacity-80 hover:opacity-100 break-all">
                              📎 {msg.anexo_nome}
                            </a>
                          )}
                          <p className="text-xs opacity-60 mt-1">{new Date(msg.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    );
                    })
                  )}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Digite sua mensagem... (Shift+Enter para quebra de linha)"
                    rows={2}
                    value={novaMsg}
                    onChange={(e) => setNovaMsg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (novaMsg.trim()) {
                          enviarMsgMutation.mutate({ msg: novaMsg });
                        }
                      }
                    }}
                    disabled={enviarMsgMutation.isPending}
                  />
                  <Button
                    size="icon"
                    className="bg-blue-600 hover:bg-blue-700 h-fit"
                    disabled={!novaMsg.trim() || enviarMsgMutation.isPending}
                    onClick={() => enviarMsgMutation.mutate({ msg: novaMsg })}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <AvaliacaoChamado
                chamado={selectedChamado}
                autoShow={autoShowAvaliacao}
                loading={avaliacaoMutation.isPending}
                onAvaliar={(av) => avaliacaoMutation.mutate({ id: selectedChamado.id, av })}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal detalhes do projeto no portal */}
      <Dialog open={!!selectedProjetoPortal} onOpenChange={() => setSelectedProjetoPortal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {selectedProjetoPortal?.codigo_projeto}
              </span>
              <Badge className={`${statusColorsProjetoPortal[selectedProjetoPortal?.status] || 'bg-indigo-100 text-indigo-800'} border`}>{selectedProjetoPortal?.status}</Badge>
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">{selectedProjetoPortal?.titulo}</DialogTitle>
          </DialogHeader>

          {selectedProjetoPortal && (
            <Tabs value={tabDetalhesProjeto} onValueChange={setTabDetalhesProjeto} className="mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="geral" className="text-xs">Visão Geral & Marcos</TabsTrigger>
                <TabsTrigger value="chat" className="text-xs">Ideias & Comentários ({chatMessagesProjeto.length})</TabsTrigger>
                <TabsTrigger value="homologacao" className="text-xs">Homologações</TabsTrigger>
              </TabsList>

              <TabsContent value="geral" className="space-y-4 pt-3 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg border text-slate-700">
                  <p className="font-semibold text-slate-900 mb-1">Descrição</p>
                  <p className="whitespace-pre-wrap text-xs">{selectedProjetoPortal.descricao || "Sem descrição."}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded border">
                    <span className="text-slate-400">Responsável Técnico</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedProjetoPortal.responsavel_nome || "—"}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded border">
                    <span className="text-slate-400">Previsão de Término</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedProjetoPortal.data_fim_prevista || "—"}</p>
                  </div>
                </div>

                {/* Marcos (Somente Leitura no Portal) */}
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                    <FolderKanban className="w-4 h-4 text-indigo-600" /> Cronograma de Marcos ({selectedProjetoPortal.marcos?.length || 0})
                  </h4>
                  <div className="space-y-1.5">
                    {(selectedProjetoPortal.marcos || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhum marco cadastrado.</p>
                    ) : (
                      (selectedProjetoPortal.marcos || []).map((m, i) => {
                        const isAtrasado = m.status === "Pendente" && m.data_prevista && isBefore(startOfDay(parseISO(m.data_prevista)), startOfDay(new Date()));
                        return (
                          <div key={i} className={`p-2.5 rounded border flex items-center justify-between text-xs ${m.status === 'Concluído' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : isAtrasado ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-2">
                              <CheckCircle className={`w-4 h-4 ${m.status === 'Concluído' ? 'text-emerald-600' : 'text-slate-300'}`} />
                              <span className={m.status === 'Concluído' ? 'line-through opacity-75 font-medium' : 'font-semibold'}>{m.titulo}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAtrasado && (
                                <Badge variant="destructive" className="bg-rose-600 text-white text-[9px] uppercase font-bold">
                                  Atrasado
                                </Badge>
                              )}
                              <span className="text-slate-500">{m.data_prevista ? format(parseISO(m.data_prevista), 'dd/MM/yyyy') : '—'}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chat" className="space-y-3 pt-3 text-sm">
                <div className="bg-slate-50 border rounded-lg p-3 h-64 overflow-y-auto space-y-2">
                  {chatMessagesProjeto.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-10">Nenhum comentário enviado ainda. Seja o primeiro a opinar!</p>
                  ) : (
                    chatMessagesProjeto.map((msg, i) => {
                      const eMinha = msg.remetente_id === String(colaborador.id) || msg.remetente_email === colaborador.email;
                      return (
                        <div key={i} className={`flex ${eMinha ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-2.5 rounded-lg text-xs break-words ${eMinha ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-800'}`}>
                            <p className="font-bold mb-0.5 opacity-90">{msg.remetente_nome}</p>
                            <p className="whitespace-pre-wrap">{msg.mensagem}</p>
                            <p className="text-[10px] opacity-75 mt-1 text-right">{new Date(msg.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Escreva sua ideia ou dúvida para este projeto..."
                    rows={2}
                    value={novaMsgChatPortal}
                    onChange={e => setNovaMsgChatPortal(e.target.value)}
                  />
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-auto"
                    disabled={!novaMsgChatPortal.trim() || enviarChatPortalMutation.isPending}
                    onClick={() => enviarChatPortalMutation.mutate(novaMsgChatPortal)}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="homologacao" className="space-y-3 pt-3 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">Histórico de Validação da Diretoria</h4>
                  {Array.isArray(selectedProjetoPortal.aprovacao_diretoria) && selectedProjetoPortal.aprovacao_diretoria.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProjetoPortal.aprovacao_diretoria.map((ap, i) => (
                        <div key={i} className="p-2.5 bg-white rounded border text-xs flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-slate-800">
                              {ap.aprovado ? <span className="text-emerald-700 font-bold">✓ Homologado</span> : <span className="text-rose-700 font-bold">✗ Em Ajustes</span>} por {ap.aprovador_nome}
                            </p>
                            {ap.observacoes && <p className="text-slate-600 mt-0.5">"{ap.observacoes}"</p>}
                          </div>
                          <span className="text-slate-400 text-[10px]">{new Date(ap.data).toLocaleDateString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Nenhum registro de homologação formal cadastrado.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

    </PortalLayout>
  );
}