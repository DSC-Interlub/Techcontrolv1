/**
 * PainelComunicados.jsx — Central Simplificada de Comunicados Internos
 * Foco exclusivo nos 4 tipos automáticos:
 * 1. Aniversário do Colaborador
 * 2. Aniversário do Cônjuge
 * 3. 1 Aninho do Filho(a)
 * 4. Tempo de Empresa
 */
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Megaphone, Upload, Eye, RefreshCw, Trash2, AlertTriangle, Loader2,
  CheckCircle, XCircle, Clock, Settings, Play, Search, Calendar, Sparkles,
  UserCheck, Users, ShieldAlert, ArrowRight, X, ExternalLink, Heart, Gift, Award, Baby
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── 4 TIPOS EXCLUSIVOS DO MÓDULO ─────────────────────────────────────────────
export const TIPO_LABELS = {
  aniversario_colaborador: "🎂 Aniversário Colaborador",
  aniversario_conjuge: "💑 Aniversário Cônjuge",
  aniversario_filho_1ano: "🎈 1 Aninho",
  tempo_empresa: "🏆 Tempo de Empresa",
};

export const TIPO_COR = {
  aniversario_colaborador: "bg-pink-100 text-pink-800 border-pink-200",
  aniversario_conjuge: "bg-rose-100 text-rose-800 border-rose-200",
  aniversario_filho_1ano: "bg-purple-100 text-purple-800 border-purple-200",
  tempo_empresa: "bg-amber-100 text-amber-800 border-amber-200",
};

// ── INDICADOR DE URGÊNCIA (TAREFA 3) ─────────────────────────────────────────
function BadgeUrgencia({ dataEvento }) {
  if (!dataEvento) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dt = parseISO(dataEvento);
  const diff = differenceInDays(dt, hoje);

  if (diff < 0) {
    return (
      <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
        Passou há {Math.abs(diff)}d
      </span>
    );
  }
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-300 animate-pulse">
        🚨 🎉 Hoje! (URGENTE)
      </span>
    );
  }
  if (diff <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-300 shadow-sm">
        🔴 em {diff} dia{diff !== 1 ? "s" : ""}! (Urgente)
      </span>
    );
  }
  if (diff <= 10) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
        🟡 em {diff} dias (Atenção)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
      📅 em {diff} dias
    </span>
  );
}

// ── MODAL: GESTÃO DE COLABORADORES FORA DOS COMUNICADOS (TAREFA 2) ───────────
function ModalColaboradoresFora({ open, onOpenChange, colaboradores, onUpdateSuccess }) {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const foraDosComunicados = useMemo(() => {
    return (colaboradores || [])
      .filter(c => c.status !== "Desligado" && c.incluir_comunicados === false)
      .sort((a, b) => (a.nome_completo || "").localeCompare(b.nome_completo || ""));
  }, [colaboradores]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return foraDosComunicados;
    const q = busca.toLowerCase().trim();
    return foraDosComunicados.filter(c =>
      (c.nome_completo || "").toLowerCase().includes(q) ||
      (c.area || "").toLowerCase().includes(q) ||
      (c.cargo || "").toLowerCase().includes(q)
    );
  }, [foraDosComunicados, busca]);

  const toggleSelecionado = (id) => {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleTodosVisiveis = () => {
    const idsVisiveis = filtrados.map(c => c.id);
    const todosMarcados = idsVisiveis.every(id => selecionados.includes(id));
    if (todosMarcados) {
      setSelecionados(prev => prev.filter(id => !idsVisiveis.includes(id)));
    } else {
      setSelecionados(prev => [...new Set([...prev, ...idsVisiveis])]);
    }
  };

  const handleHabilitarIndividuo = async (colab) => {
    setSalvando(true);
    try {
      await base44.entities.Colaboradores.update(colab.id, { incluir_comunicados: true });
      await base44.functions.invoke("gerarDemandasComunicados", { dias_busca: 30 });
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] });
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      alert("Erro ao habilitar colaborador: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleHabilitarSelecionados = async () => {
    if (!selecionados.length) return;
    setSalvando(true);
    try {
      for (const id of selecionados) {
        await base44.entities.Colaboradores.update(id, { incluir_comunicados: true });
      }
      await base44.functions.invoke("gerarDemandasComunicados", { dias_busca: 30 });
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] });
      setSelecionados([]);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      alert("Erro ao habilitar colaboradores: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-amber-900">
            <Users className="w-5 h-5 text-amber-600" />
            Colaboradores Fora dos Comunicados Automáticos ({foraDosComunicados.length})
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            A equipe de <strong>Conexão Humana (DP/RH/DHO)</strong> pode revisar quem deve receber comunicados de aniversário e tempo de empresa. A ativação é feita sob demanda.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, área ou cargo..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTodosVisiveis}
              className="text-xs h-9"
            >
              {filtrados.every(c => selecionados.includes(c.id)) && filtrados.length > 0 ? "Desmarcar Todos" : "Selecionar Todos"}
            </Button>
            <Button
              size="sm"
              disabled={salvando || selecionados.length === 0}
              onClick={handleHabilitarSelecionados}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-medium"
            >
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <UserCheck className="w-3.5 h-3.5 mr-1" />}
              Habilitar Selecionados ({selecionados.length})
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y pr-1 py-1">
          {filtrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-foreground">Nenhum colaborador pendente nesta lista!</p>
              <p className="mt-1">Todos os colaboradores ativos estão habilitados para os comunicados automáticos.</p>
            </div>
          ) : (
            filtrados.map(c => (
              <div key={c.id} className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Checkbox
                    checked={selecionados.includes(c.id)}
                    onCheckedChange={() => toggleSelecionado(c.id)}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{c.nome_completo}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {c.area || "Sem Área"} · {c.cargo || c.tipo_funcionario || "Colaborador"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-slate-500">
                      {c.data_nascimento && <span>🎂 Nasc: {format(parseISO(c.data_nascimento), "dd/MM/yyyy")}</span>}
                      {c.data_admissao && <span>🏢 Adm: {format(parseISO(c.data_admissao), "dd/MM/yyyy")}</span>}
                      {c.conjuge_nome && <span>💑 Cônjuge: {c.conjuge_nome}</span>}
                      {Array.isArray(c.filhos) && c.filhos.length > 0 && <span>👶 {c.filhos.length} filho(s)</span>}
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={salvando}
                  onClick={() => handleHabilitarIndividuo(c)}
                  className="text-xs shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Habilitar
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── MODAL: AJUSTES & DISPARO DE EMERGÊNCIA (TI / ADMIN - TAREFA 4) ────────────
function ModalConfiguracoesAdmin({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [disparando, setDisparando] = useState(false);
  const [resultadoDisparo, setResultadoDisparo] = useState(null);

  const { data: configs = [], isLoading: loadConfigs } = useQuery({
    queryKey: ["comunicados_config"],
    queryFn: () => base44.entities.Comunicados_Config.list(),
  });

  const updateConfigMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comunicados_Config.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comunicados_config"] }),
  });

  const handleExecutarRotinaEmergencia = async () => {
    setDisparando(true);
    setResultadoDisparo(null);
    try {
      const res = await base44.functions.invoke("dispararComunicados", {});
      queryClient.invalidateQueries({ queryKey: ["comunicados_log"] });
      queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] });

      const counts = res.data?.results?.comunicados || {};
      const total = Object.values(counts).reduce((a, b) => a + b, 0);

      setResultadoDisparo({
        ok: true,
        msg: `Rotina executada com sucesso! Sincronizou demandas e processou ${total} e-mail(s) agendados.`,
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

  // Filtra apenas os 4 tipos permitidos
  const configsValidas = useMemo(() => {
    const tiposPermitidos = ["aniversario_colaborador", "aniversario_conjuge", "aniversario_filho_1ano", "tempo_empresa"];
    return configs.filter(c => tiposPermitidos.includes(c.tipo_comunicado));
  }, [configs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
            <Settings className="w-5 h-5 text-indigo-600" />
            Ajustes do Sistema & Disparo de Emergência (TI / Admin)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Esta área é de acesso restrito à Administração e TI para manutenção técnica dos 4 comunicados automáticos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-3">
          {/* Card de Disparo Manual de Emergência */}
          <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Válvula de Escape / Disparo de Emergência
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Se o cron diário falhar por instabilidade externa, clique no botão abaixo para forçar a geração de demandas e o envio imediato dos e-mails do dia.
                </p>
              </div>
              <Button
                size="sm"
                disabled={disparando}
                onClick={handleExecutarRotinaEmergencia}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0"
              >
                {disparando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                Executar Agora
              </Button>
            </div>

            {resultadoDisparo && (
              <div className={`mt-3 p-3 rounded-lg text-xs flex items-center justify-between gap-2 border ${
                resultadoDisparo.ok ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-red-50 border-red-300 text-red-900"
              }`}>
                <span>{resultadoDisparo.msg}</span>
                <button onClick={() => setResultadoDisparo(null)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── MODAL: CONFIGURAÇÃO DE MODELOS & DESTINATÁRIOS (BRANDING / ADMIN) ─────────
function ModalConfiguracaoModelos({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [salvoMsg, setSalvoMsg] = useState("");

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["comunicados_config"],
    queryFn: () => base44.entities.Comunicados_Config.list(),
  });

  const updateConfigMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comunicados_Config.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comunicados_config"] });
      setSalvoMsg("Alterações salvas! Os próximos envios diários utilizarão estes modelos.");
      setTimeout(() => setSalvoMsg(""), 4000);
    },
  });

  const tiposPermitidos = ["aniversario_colaborador", "aniversario_conjuge", "aniversario_filho_1ano", "tempo_empresa"];
  const configsValidas = configs.filter(c => tiposPermitidos.includes(c.tipo_comunicado));

  const tagsPorTipo = {
    aniversario_colaborador: ["{nome}", "{area}"],
    aniversario_conjuge: ["{nome}", "{nome_conjuge}", "{area}"],
    aniversario_filho_1ano: ["{nome}", "{nome_filho}", "{area}"],
    tempo_empresa: ["{nome}", "{anos}", "{area}"],
  };

  const handleInsertTag = (cfg, tag) => {
    const atual = cfg.assunto_template || "";
    const novo = atual ? `${atual} ${tag}` : tag;
    updateConfigMut.mutate({ id: cfg.id, data: { assunto_template: novo } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Configurar Modelos de Assunto & Destinatários
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Personalize o título dos e-mails e quem deve receber cada um dos 4 comunicados automáticos.
          </DialogDescription>
        </DialogHeader>

        {salvoMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs px-3 py-2 rounded-lg mt-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{salvoMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
          ) : configsValidas.length === 0 ? (
            <p className="text-xs text-center text-gray-500 py-6">Nenhuma configuração encontrada.</p>
          ) : (
            configsValidas.map(cfg => {
              const tags = tagsPorTipo[cfg.tipo_comunicado] || ["{nome}"];
              return (
                <div key={cfg.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      {TIPO_LABELS[cfg.tipo_comunicado] || cfg.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-500">{cfg.ativo ? "Ativo" : "Pausado"}</span>
                      <Switch
                        checked={cfg.ativo}
                        onCheckedChange={v => updateConfigMut.mutate({ id: cfg.id, data: { ativo: v } })}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-[11px] font-bold text-slate-700">Assunto do E-mail</Label>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Variáveis:</span>
                          {tags.map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleInsertTag(cfg, t)}
                              className="text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded px-1.5 py-0.5 cursor-pointer transition-colors"
                              title={`Clique para inserir ${t}`}
                            >
                              +{t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Input
                        defaultValue={cfg.assunto_template}
                        key={cfg.assunto_template}
                        onBlur={e => {
                          if (e.target.value !== cfg.assunto_template) {
                            updateConfigMut.mutate({ id: cfg.id, data: { assunto_template: e.target.value } });
                          }
                        }}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Quem recebe este comunicado?</Label>
                      <Select
                        value={cfg.destinatarios_tipo || "todos_colaboradores"}
                        onValueChange={v => updateConfigMut.mutate({ id: cfg.id, data: { destinatarios_tipo: v } })}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos_colaboradores" className="text-xs">
                            📢 Toda a empresa (Todos os colaboradores ativos)
                          </SelectItem>
                          <SelectItem value="colaborador_conjuge_gestor" className="text-xs">
                            💑 Colaborador + Cônjuge + Gestor direto
                          </SelectItem>
                          <SelectItem value="colaborador_e_gestor" className="text-xs">
                            👤 Apenas Colaborador + Gestor direto
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── COMPONENTE PRINCIPAL REFORMULADO ─────────────────────────────────────────
export default function PainelComunicados({
  podeCriarArte = true,
  podeGerenciarConfig = false,
  nomeUsuario = "",
  colaboradorAtual = null
}) {
  const queryClient = useQueryClient();
  const [abaAtiva, setAbaAtiva] = useState("precisa_arte"); // "precisa_arte" | "prontos" | "enviados"
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [mesAno, setMesAno] = useState(() => new Date());
  const [openAdminModal, setOpenAdminModal] = useState(false);
  const [openModelosModal, setOpenModelosModal] = useState(false);
  const [openModalFora, setOpenModalFora] = useState(false);
  const [previewImagem, setPreviewImagem] = useState(null);
  const [uploadingChave, setUploadingChave] = useState(null);

  // Identificação das Áreas Relevantes
  const userArea = colaboradorAtual?.area || "";
  const isComunicacao = 
    colaboradorAtual?.eh_comunicacao_branding ||
    userArea === "Comunicação e Branding" ||
    (Array.isArray(colaboradorAtual?.permissoes_comunicados) && colaboradorAtual.permissoes_comunicados.includes("comunicacao_branding")) ||
    podeCriarArte;

  const isConexaoHumana = 
    colaboradorAtual?.eh_conexao_humana ||
    userArea === "Conexão Humana" ||
    (Array.isArray(colaboradorAtual?.permissoes_comunicados) && colaboradorAtual.permissoes_comunicados.includes("conexao_humana")) ||
    podeGerenciarConfig;

  const isAdmin = podeGerenciarConfig;

  // 1. Busca Colaboradores Ativos (Fonte Única da Verdade)
  const { data: colaboradores = [], isLoading: loadColabs } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: () => base44.entities.Colaboradores.list(),
    staleTime: 30_000,
  });

  // 2. Busca Estado de Artes Salvas no Banco
  const { data: artes = [], isLoading: loadArtes } = useQuery({
    queryKey: ["comunicados_artes"],
    queryFn: () => base44.entities.Comunicados_Artes.list("-data_evento", 600),
    staleTime: 10_000,
  });

  // 3. Busca Histórico de Envios (Resend / Logs)
  const { data: logs = [], isLoading: loadLogs } = useQuery({
    queryKey: ["comunicados_log"],
    queryFn: () => base44.entities.Comunicados_Log.list("-data_envio", 100),
    staleTime: 15_000,
  });

  // Colaboradores fora dos comunicados (para badge de alerta)
  const totalForaDosComunicados = useMemo(() => {
    return colaboradores.filter(c => c.status !== "Desligado" && c.incluir_comunicados === false).length;
  }, [colaboradores]);

  // ── CÁLCULO AO VIVO DOS EVENTOS DO MÊS SELECIONADO ─────────────────────────
  const anoAtual = mesAno.getFullYear();
  const mesAtualNum = mesAno.getMonth() + 1;
  const mesFmt = String(mesAtualNum).padStart(2, "0");

  const eventosDoMes = useMemo(() => {
    const artesMap = {};
    (artes || []).forEach(a => {
      if (a.colaborador_id && a.tipo_comunicado && a.data_evento) {
        artesMap[`${a.colaborador_id}_${a.tipo_comunicado}_${a.data_evento}`] = a;
      }
    });

    const lista = [];

    for (const c of colaboradores) {
      if (c.status === "Desligado" || c.incluir_comunicados === false) continue;

      // 1. Aniversário do Colaborador
      if (c.data_nascimento) {
        const parts = c.data_nascimento.split("-");
        if (parts.length === 3 && parts[1] === mesFmt) {
          const dia = parts[2];
          const anoNasc = parseInt(parts[0], 10);
          const dataEvento = `${anoAtual}-${mesFmt}-${dia}`;
          const chave = `${c.id}_aniversario_colaborador_${dataEvento}`;
          const arte = artesMap[chave];
          lista.push({
            chave,
            tipo_comunicado: "aniversario_colaborador",
            colaborador_id: c.id,
            colaborador_nome: c.nome_completo,
            area: c.area,
            data_evento: dataEvento,
            descricao_evento: `Aniversário de ${anoAtual - anoNasc} anos`,
            demanda_id: arte?.id || null,
            imagem_url: arte?.imagem_url || null,
            status_arte: arte?.status_arte || (arte?.imagem_url ? "arte_carregada" : "sem_arte"),
          });
        }
      }

      // 2. Aniversário do Cônjuge
      if (c.conjuge_data_nascimento && c.conjuge_nome) {
        const parts = c.conjuge_data_nascimento.split("-");
        if (parts.length === 3 && parts[1] === mesFmt) {
          const dia = parts[2];
          const dataEvento = `${anoAtual}-${mesFmt}-${dia}`;
          const chave = `${c.id}_aniversario_conjuge_${dataEvento}`;
          const arte = artesMap[chave];
          lista.push({
            chave,
            tipo_comunicado: "aniversario_conjuge",
            colaborador_id: c.id,
            colaborador_nome: c.nome_completo,
            conjuge_nome: c.conjuge_nome,
            area: c.area,
            data_evento: dataEvento,
            descricao_evento: `Aniversário do cônjuge (${c.conjuge_nome})`,
            demanda_id: arte?.id || null,
            imagem_url: arte?.imagem_url || null,
            status_arte: arte?.status_arte || (arte?.imagem_url ? "arte_carregada" : "sem_arte"),
          });
        }
      }

      // 3. 1 Aninho do Filho(a)
      if (Array.isArray(c.filhos)) {
        for (const f of c.filhos) {
          const dNasc = f.data_nascimento || f.filho_data_nascimento;
          const nomeF = f.nome || f.filho_nome;
          if (dNasc && nomeF) {
            const parts = dNasc.split("-");
            if (parts.length === 3 && anoAtual - parseInt(parts[0], 10) === 1 && parts[1] === mesFmt) {
              const dia = parts[2];
              const dataEvento = `${anoAtual}-${mesFmt}-${dia}`;
              const chave = `${c.id}_aniversario_filho_1ano_${dataEvento}`;
              const arte = artesMap[chave];
              lista.push({
                chave,
                tipo_comunicado: "aniversario_filho_1ano",
                colaborador_id: c.id,
                colaborador_nome: c.nome_completo,
                filho_nome: nomeF,
                area: c.area,
                data_evento: dataEvento,
                descricao_evento: `1 Aninho de ${nomeF}`,
                demanda_id: arte?.id || null,
                imagem_url: arte?.imagem_url || null,
                status_arte: arte?.status_arte || (arte?.imagem_url ? "arte_carregada" : "sem_arte"),
              });
            }
          }
        }
      }

      // 4. Tempo de Empresa
      if (c.data_admissao) {
        const parts = c.data_admissao.split("-");
        if (parts.length === 3) {
          const anoAdm = parseInt(parts[0], 10);
          const anos = anoAtual - anoAdm;
          if (anos >= 1 && parts[1] === mesFmt) {
            const dia = parts[2];
            const dataEvento = `${anoAtual}-${mesFmt}-${dia}`;
            const chave = `${c.id}_tempo_empresa_${dataEvento}`;
            const arte = artesMap[chave];
            lista.push({
              chave,
              tipo_comunicado: "tempo_empresa",
              colaborador_id: c.id,
              colaborador_nome: c.nome_completo,
              anos_empresa: anos,
              area: c.area,
              data_evento: dataEvento,
              descricao_evento: `${anos} ano${anos > 1 ? "s" : ""} de empresa`,
              demanda_id: arte?.id || null,
              imagem_url: arte?.imagem_url || null,
              status_arte: arte?.status_arte || (arte?.imagem_url ? "arte_carregada" : "sem_arte"),
            });
          }
        }
      }
    }

    return lista.sort((a, b) => (a.data_evento || "").localeCompare(b.data_evento || ""));
  }, [colaboradores, artes, anoAtual, mesFmt]);

  // ── 3 CATEGORIAS OPERACIONAIS (AS 3 ABAS) ──────────────────────────────────
  // 1. Precisa de Arte: Sem arte cadastrada
  const listaPrecisaArte = useMemo(() => {
    return eventosDoMes.filter(e => e.status_arte === "sem_arte" || !e.imagem_url);
  }, [eventosDoMes]);

  // 2. Este Mês / Prontos: Arte carregada
  const listaProntos = useMemo(() => {
    return eventosDoMes.filter(e => e.status_arte === "arte_carregada" && e.imagem_url);
  }, [eventosDoMes]);

  // 3. Enviados: Disparados com sucesso
  const listaEnviados = useMemo(() => {
    return logs.filter(l => ["aniversario_colaborador", "aniversario_conjuge", "aniversario_filho_1ano", "tempo_empresa"].includes(l.tipo_comunicado));
  }, [logs]);

  // Filtragem da aba ativa
  const itensExibidos = useMemo(() => {
    let lista = [];
    if (abaAtiva === "precisa_arte") lista = listaPrecisaArte;
    else if (abaAtiva === "prontos") lista = listaProntos;
    else if (abaAtiva === "enviados") lista = listaEnviados;

    if (busca.trim()) {
      const q = busca.toLowerCase().trim();
      lista = lista.filter(item =>
        (item.colaborador_nome || "").toLowerCase().includes(q) ||
        (item.descricao_evento || "").toLowerCase().includes(q)
      );
    }
    if (filtroTipo !== "todos") {
      lista = lista.filter(item => item.tipo_comunicado === filtroTipo);
    }
    return lista;
  }, [abaAtiva, listaPrecisaArte, listaProntos, listaEnviados, busca, filtroTipo]);

  // Handlers de Upload e Remoção de Arte
  const handleUploadArte = async (item, file) => {
    if (!file) return;
    setUploadingChave(item.chave);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (item.demanda_id) {
        await base44.entities.Comunicados_Artes.update(item.demanda_id, {
          imagem_url: file_url,
          status_arte: "arte_carregada",
          criado_por: nomeUsuario || "Portal",
        });
      } else {
        await base44.entities.Comunicados_Artes.create({
          colaborador_id: item.colaborador_id,
          colaborador_nome: item.colaborador_nome,
          tipo_comunicado: item.tipo_comunicado,
          data_evento: item.data_evento,
          descricao_evento: item.descricao_evento,
          imagem_url: file_url,
          status_arte: "arte_carregada",
          ano_referencia: anoAtual,
          anos_empresa: item.anos_empresa || null,
          filho_nome: item.filho_nome || null,
          criado_por: nomeUsuario || "Portal",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] });
    } catch (err) {
      alert("Erro ao fazer upload da arte: " + err.message);
    } finally {
      setUploadingChave(null);
    }
  };

  const handleRemoverArte = async (item) => {
    if (!confirm(`Remover a arte do comunicado de ${item.colaborador_nome}?`)) return;
    try {
      if (item.demanda_id) {
        await base44.entities.Comunicados_Artes.update(item.demanda_id, {
          imagem_url: "",
          status_arte: "sem_arte",
        });
        queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] });
      }
    } catch (err) {
      alert("Erro ao remover arte: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── CABEÇALHO & RESUMO PRINCIPAL ──────────────────────────────────── */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Central de Comunicados</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gestão dos 4 eventos automáticos: <strong>Colaborador, Cônjuge, 1 Aninho e Tempo de Empresa</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão de Gestão de Colaboradores para Conexão Humana / Admin */}
            {(isConexaoHumana || isAdmin) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenModalFora(true)}
                className="text-xs font-semibold border-amber-300 bg-amber-50/50 hover:bg-amber-100 text-amber-900"
              >
                <Users className="w-4 h-4 mr-1.5 text-amber-600" />
                Colaboradores Habilitados
                {totalForaDosComunicados > 0 && (
                  <Badge className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4">
                    {totalForaDosComunicados} fora
                  </Badge>
                )}
              </Button>
            )}

            {/* Botão de Modelos & Assuntos para Comunicação e Branding / Admin */}
            {(isComunicacao || isAdmin) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenModelosModal(true)}
                className="text-xs font-semibold border-purple-300 bg-purple-50/50 hover:bg-purple-100 text-purple-900"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-purple-600" />
                Modelos & Destinatários
              </Button>
            )}

            {/* Botão de Ajustes e Emergência exclusivo para TI / Admin (TAREFA 4) */}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenAdminModal(true)}
                className="text-xs font-semibold border-slate-300 hover:bg-slate-50 text-slate-800"
              >
                <Settings className="w-4 h-4 mr-1.5 text-indigo-600" />
                Ajustes TI / Emergência
              </Button>
            )}
          </div>
        </div>

        {/* ALERTA DESTACADO: Colaboradores Fora dos Comunicados (TAREFA 2) */}
        {(isConexaoHumana || isAdmin) && totalForaDosComunicados > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950">
                  {totalForaDosComunicados} colaborador(es) ativo(s) ainda não estão habilitados para os Comunicados Automáticos
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Equipe de Conexão Humana: revise e habilite individualmente os colaboradores para que suas datas gerem comunicados.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setOpenModalFora(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-sm"
            >
              Revisar e Habilitar <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}

        {/* 3 CONTADORES CHAVE (AS 3 ABAS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setAbaAtiva("precisa_arte")}
            className={`text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              abaAtiva === "precisa_arte"
                ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-300/50 shadow-sm"
                : "bg-card hover:border-amber-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                🟡 1. Precisa de Arte
              </span>
              {listaPrecisaArte.length > 0 && (
                <Badge className="bg-amber-500 text-white text-xs font-bold animate-pulse">Ação necessária</Badge>
              )}
            </div>
            <p className="text-3xl font-black text-amber-950 mt-2">{listaPrecisaArte.length}</p>
            <p className="text-xs text-amber-700 mt-1">Eventos sem imagem cadastrada</p>
          </button>

          <button
            onClick={() => setAbaAtiva("prontos")}
            className={`text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              abaAtiva === "prontos"
                ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-300/50 shadow-sm"
                : "bg-card hover:border-emerald-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                🟢 2. Este Mês / Prontos
              </span>
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 text-[10px]">Automação OK</Badge>
            </div>
            <p className="text-3xl font-black text-emerald-950 mt-2">{listaProntos.length}</p>
            <p className="text-xs text-emerald-700 mt-1">Artes prontas para disparo no dia</p>
          </button>

          <button
            onClick={() => setAbaAtiva("enviados")}
            className={`text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              abaAtiva === "enviados"
                ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-300/50 shadow-sm"
                : "bg-card hover:border-blue-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                📤 3. Já Enviados
              </span>
              <Badge variant="outline" className="text-blue-700 border-blue-300 text-[10px]">Histórico</Badge>
            </div>
            <p className="text-3xl font-black text-blue-950 mt-2">{listaEnviados.length}</p>
            <p className="text-xs text-blue-700 mt-1">E-mails entregues com sucesso</p>
          </button>
        </div>
      </div>

      {/* ── BARRA DE SELEÇÃO DE MÊS & FILTROS ────────────────────────────── */}
      <div className="bg-card border rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMesAno(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="h-9 px-2.5 text-xs font-bold"
            title="Mês Anterior"
          >
            ‹ Anterior
          </Button>

          <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-950 text-xs font-extrabold capitalize flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            {format(mesAno, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMesAno(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="h-9 px-2.5 text-xs font-bold"
            title="Próximo Mês"
          >
            Próximo ›
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMesAno(new Date())}
            className="h-9 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Hoje
          </Button>
        </div>

        <div className="flex flex-1 items-center gap-2 justify-end">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por colaborador..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-9 text-xs w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos os 4 tipos</SelectItem>
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
              queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] });
              queryClient.invalidateQueries({ queryKey: ["comunicados_log"] });
            }}
            className="h-9 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      {/* ── CONTEÚDO DA ABA ATIVA ─────────────────────────────────────────── */}
      <div>
        {loadColabs || loadArtes || loadLogs ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : itensExibidos.length === 0 ? (
          <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground">
            {abaAtiva === "precisa_arte" && (
              <>
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-foreground">Tudo pronto! Nenhuma arte pendente para este mês.</h3>
                <p className="text-xs text-muted-foreground mt-1">Todos os eventos de {format(mesAno, "MMMM 'de' yyyy", { locale: ptBR })} já possuem arte cadastrada.</p>
              </>
            )}
            {abaAtiva === "prontos" && (
              <>
                <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-foreground">Nenhum comunicado pronto no momento para este mês.</h3>
                <p className="text-xs text-muted-foreground mt-1">Carregue as artes na aba "Precisa de Arte" para agendar os envios.</p>
              </>
            )}
            {abaAtiva === "enviados" && (
              <>
                <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-foreground">Nenhum envio registrado recentemente.</h3>
                <p className="text-xs text-muted-foreground mt-1">Os comunicados disparados automaticamente aparecerão aqui.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {itensExibidos.map(item => {
              // ── CARD DA ABA: ENVIADOS (LOGS) ──
              if (abaAtiva === "enviados") {
                return (
                  <Card key={item.id || item.chave} className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${TIPO_COR[item.tipo_comunicado] || "bg-gray-100"}`}>
                          {TIPO_LABELS[item.tipo_comunicado] || item.tipo_comunicado}
                        </span>
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">
                          ✓ Enviado
                        </Badge>
                      </div>

                      <div>
                        <p className="font-bold text-sm text-foreground truncate">{item.colaborador_nome || "Colaborador"}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.assunto_enviado}</p>
                      </div>

                      <div className="border-t pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{item.data_envio ? format(parseISO(item.data_envio), "dd/MM/yyyy HH:mm") : "—"}</span>
                        <span>{Array.isArray(item.destinatarios) ? `${item.destinatarios.length} destinatários` : ""}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // ── CARD DAS ABAS: PRECISA DE ARTE & PRONTOS ──
              const dataEvento = item.data_evento ? parseISO(item.data_evento) : null;
              const diffHoje = dataEvento ? differenceInDays(dataEvento, new Date()) : null;
              const isUrgente = diffHoje !== null && diffHoje <= 3 && item.status_arte === "sem_arte";
              const isAtencao = diffHoje !== null && diffHoje > 3 && diffHoje <= 10 && item.status_arte === "sem_arte";

              return (
                <Card
                  key={item.chave || item.id}
                  className={`border shadow-sm hover:shadow-md transition-all ${
                    isUrgente
                      ? "border-red-400 bg-red-50/40 ring-1 ring-red-300"
                      : isAtencao
                      ? "border-amber-300 bg-amber-50/20"
                      : "bg-card"
                  }`}
                >
                  <CardContent className="p-4 space-y-3.5">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${TIPO_COR[item.tipo_comunicado] || "bg-gray-100"}`}>
                        {TIPO_LABELS[item.tipo_comunicado] || item.tipo_comunicado}
                      </span>
                      <BadgeUrgencia dataEvento={item.data_evento} />
                    </div>

                    {/* Dados do Colaborador e Evento */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                        {(item.colaborador_nome || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-foreground truncate">{item.colaborador_nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.descricao_evento || "Evento Corporativo"}
                        </p>
                        {item.data_evento && (
                          <p className="text-[11px] text-indigo-700 font-medium mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(parseISO(item.data_evento), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bloco de Arte & Ações de Upload */}
                    <div className="border-t pt-3 flex items-center justify-between gap-2">
                      {item.imagem_url ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button
                            onClick={() => setPreviewImagem(item.imagem_url)}
                            className="group relative shrink-0 cursor-pointer"
                            title="Clique para ampliar a arte"
                          >
                            <img
                              src={item.imagem_url}
                              alt="Arte"
                              className="w-11 h-11 object-cover rounded-lg border border-slate-300 group-hover:opacity-80 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Arte vinculada
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Disparo no dia às 08:00
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Sem arte cadastrada
                          </p>
                        </div>
                      )}

                      {/* Botões de Ação (Comunicação e Branding / Admin) */}
                      {isComunicacao && (
                        <div className="flex items-center gap-1 shrink-0">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingChave === item.chave}
                              onChange={e => handleUploadArte(item, e.target.files?.[0])}
                            />
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                              item.imagem_url
                                ? "border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
                                : "border-indigo-300 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                            } ${uploadingChave === item.chave ? "opacity-50 cursor-not-allowed" : ""}`}>
                              {uploadingChave === item.chave ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                              ) : item.imagem_url ? (
                                <><RefreshCw className="w-3 h-3" /> Trocar</>
                              ) : (
                                <><Upload className="w-3.5 h-3.5" /> Subir Arte</>
                              )}
                            </span>
                          </label>

                          {item.imagem_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoverArte(item)}
                              title="Remover Arte"
                              className="h-7 w-7 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAIS AUXILIARES ─────────────────────────────────────────────── */}
      {/* 1. Modal de Zoom da Imagem */}
      <Dialog open={!!previewImagem} onOpenChange={() => setPreviewImagem(null)}>
        <DialogContent className="max-w-2xl p-4 flex flex-col items-center">
          <DialogHeader className="w-full pb-2 border-b flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-bold">Pré-visualização da Arte</DialogTitle>
          </DialogHeader>
          {previewImagem && (
            <div className="p-2 w-full flex justify-center bg-slate-900/5 rounded-lg my-2">
              <img src={previewImagem} alt="Arte em alta resolução" className="max-h-[75vh] object-contain rounded-md" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Modal de Modelos & Destinatários (Branding / Admin) */}
      <ModalConfiguracaoModelos
        open={openModelosModal}
        onOpenChange={setOpenModelosModal}
      />

      {/* 3. Modal de Colaboradores Fora dos Comunicados */}
      <ModalColaboradoresFora
        open={openModalFora}
        onOpenChange={setOpenModalFora}
        colaboradores={colaboradores}
      />

      {/* 4. Modal de Ajustes TI / Admin & Disparo de Emergência */}
      <ModalConfiguracoesAdmin
        open={openAdminModal}
        onOpenChange={setOpenAdminModal}
      />
    </div>
  );
}
