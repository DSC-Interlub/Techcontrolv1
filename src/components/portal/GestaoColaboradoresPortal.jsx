import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, UserX, Search, Loader2, AlertTriangle, Pencil, 
  Sparkles, CheckCircle2, ChevronDown, ChevronUp, Send, MoreVertical, HeartHandshake, AlertCircle
} from "lucide-react";
import ColaboradorForm from "@/components/colaboradores/ColaboradorForm";

const STATUS_COR = {
  Ativo: "bg-green-100 text-green-800",
  Férias: "bg-blue-100 text-blue-800",
  Afastado: "bg-yellow-100 text-yellow-800",
  Desligado: "bg-red-100 text-red-800",
};

// ── Modal Confirmar Desligamento ──────────────────────────────────────────────
function ConfirmarDesligamento({ colaborador, onClose }) {
  const [confirmNome, setConfirmNome] = useState("");
  const queryClient = useQueryClient();

  const desligarMut = useMutation({
    mutationFn: () => base44.entities.Colaboradores.update(colaborador.id, {
      status: "Desligado",
      acesso_portal_bloqueado: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal_gestao_colabs"] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      onClose();
    },
  });

  const nomeCorreto = confirmNome.trim().toLowerCase() === colaborador.nome_completo.trim().toLowerCase();

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800">Esta ação é irreversível pelo portal.</p>
          <p className="text-sm text-red-700 mt-1">
            O colaborador <strong>{colaborador.nome_completo}</strong> terá o status alterado para <strong>Desligado</strong> e o acesso ao portal será bloqueado.
          </p>
        </div>
      </div>
      <div>
        <Label className="text-xs">Para confirmar, digite o nome completo do colaborador:</Label>
        <Input className="mt-1 text-sm" placeholder={colaborador.nome_completo} value={confirmNome} onChange={e => setConfirmNome(e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button className="bg-red-600 hover:bg-red-700" disabled={!nomeCorreto || desligarMut.isPending} onClick={() => desligarMut.mutate()}>
          {desligarMut.isPending ? "Desligando..." : "Confirmar Desligamento"}
        </Button>
      </div>
    </div>
  );
}

// ── Modal Disparos Manuais (Contingência) ──────────────────────────────────────
function ModalContingencia({ colaboradores, onClose }) {
  const [colabId, setColabId] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const ativos = colaboradores.filter(c => c.status === "Ativo");

  const disparar = async (type) => {
    if (!colabId) {
      alert("Selecione um colaborador");
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/notificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data: { colaborador_id: colabId } })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.msg || "Erro ao processar disparo");
      setFeedback({ ok: true, msg: data.msg || "Disparo processado com sucesso!" });
    } catch (e) {
      setFeedback({ ok: false, msg: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 leading-relaxed">
        <strong>Atenção:</strong> Os comunicados de admissão e desligamento acontecem de forma automática pelo sistema. Utilize este painel apenas como contingência caso algum e-mail não tenha sido entregue.
      </div>

      <div>
        <Label className="text-xs">Selecione o Colaborador:</Label>
        <Select value={colabId} onValueChange={setColabId}>
          <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {ativos.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.nome_completo} ({c.cargo || c.area})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {feedback && (
        <div className={`p-3 rounded-lg text-xs font-medium ${feedback.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {feedback.ok ? "✅ " : "❌ "}{feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button 
          variant="outline" 
          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs flex items-center justify-center gap-1.5"
          disabled={loading || !colabId}
          onClick={() => disparar("enviarBoasVindas")}
        >
          <Send className="w-3.5 h-3.5" />
          Disparar Boas-Vindas
        </Button>
        <Button 
          variant="outline" 
          className="border-red-200 text-red-700 hover:bg-red-50 text-xs flex items-center justify-center gap-1.5"
          disabled={loading || !colabId}
          onClick={() => disparar("enviarDespedida")}
        >
          <Send className="w-3.5 h-3.5" />
          Disparar Despedida
        </Button>
      </div>

      <div className="flex justify-end pt-3 border-t">
        <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL: GestaoColaboradoresPortal ───────────────────────────
export default function GestaoColaboradoresPortal() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Ativo");
  const [showNovo, setShowNovo] = useState(false);
  const [desligando, setDesligando] = useState(null);
  const [editando, setEditando] = useState(null);
  const [showContingencia, setShowContingencia] = useState(false);
  const [expandirAuditoria, setExpandirAuditoria] = useState(true);

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ["portal_gestao_colabs"],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  const [filtroNivelAuditoria, setFiltroNivelAuditoria] = useState("todos"); // "todos" | "critico" | "gestao" | "cadastral"

  // Auditoria completa e hierárquica de cadastros incompletos
  const auditoriaIncompletos = useMemo(() => {
    return colaboradores
      .filter(c => c.status !== "Desligado")
      .map(c => {
        const pendencias = [];

        // 🔴 Nível 1 — Crítico / Bloqueante (Acesso & Comunicados)
        if (!c.email) {
          pendencias.push({ nivel: "critico", categoria: "Acesso", desc: "Sem e-mail corporativo (impede login e comunicados)" });
        }
        if (!c.data_nascimento) {
          pendencias.push({ nivel: "critico", categoria: "Comunicados", desc: "Sem data de nascimento (impede aniversário de colaborador)" });
        }
        if (!c.data_admissao) {
          pendencias.push({ nivel: "critico", categoria: "Comunicados", desc: "Sem data de admissão (impede tempo de empresa)" });
        }
        if (c.conjuge_nome && !c.conjuge_data_nascimento) {
          pendencias.push({ nivel: "critico", categoria: "Comunicados", desc: "Cônjuge cadastrado sem data de nascimento" });
        }
        if (!c.conjuge_nome && (c.conjuge_data_nascimento || c.conjuge_email)) {
          pendencias.push({ nivel: "critico", categoria: "Comunicados", desc: "Dados de cônjuge informados sem o nome completo do cônjuge" });
        }
        if (Array.isArray(c.filhos)) {
          c.filhos.forEach((f, idx) => {
            const nomeF = f.nome || f.filho_nome;
            const dataF = f.data_nascimento || f.filho_data_nascimento;
            if (nomeF && !dataF) {
              pendencias.push({ nivel: "critico", categoria: "Comunicados", desc: `Filho(a) "${nomeF}" sem data de nascimento (impede 1 aninho)` });
            }
            if (!nomeF && dataF) {
              pendencias.push({ nivel: "critico", categoria: "Comunicados", desc: `Filho #${idx + 1} com data de nascimento mas sem nome` });
            }
          });
        }

        // 🟡 Nível 2 — Alto / Gestão & Contato
        if (!c.responsavel_nome && !c.contato_responsavel_nome) {
          pendencias.push({ nivel: "gestao", categoria: "Gestão", desc: "Gestor direto: nome não informado" });
        }
        if (!c.responsavel_email && !c.contato_responsavel_email) {
          pendencias.push({ nivel: "gestao", categoria: "Gestão", desc: "Gestor direto: e-mail não informado (impede cópia ao gestor)" });
        }
        if (!c.telefone) {
          pendencias.push({ nivel: "gestao", categoria: "Contato", desc: "Telefone / WhatsApp não informado" });
        }
        if (c.conjuge_nome && !c.conjuge_email) {
          pendencias.push({ nivel: "gestao", categoria: "Família", desc: "Cônjuge cadastrado sem e-mail" });
        }

        // 🔵 Nível 3 — Médio / Estrutura & Cadastro Geral
        if (!c.foto_url) {
          pendencias.push({ nivel: "cadastral", categoria: "Perfil", desc: "Foto do perfil não cadastrada" });
        }
        if (!c.graduacao) {
          pendencias.push({ nivel: "cadastral", categoria: "Formação", desc: "Formação / Graduação não informada" });
        }
        if (!c.resumo_experiencia) {
          pendencias.push({ nivel: "cadastral", categoria: "Currículo", desc: "Resumo de experiência / biografia não informado" });
        }
        if (!c.cpf) {
          pendencias.push({ nivel: "cadastral", categoria: "Documento", desc: "CPF não cadastrado" });
        }
        if (!c.cargo) {
          pendencias.push({ nivel: "cadastral", categoria: "Cadastro", desc: "Cargo / Função não informado" });
        }
        if (!c.area || c.area === "Sem Área") {
          pendencias.push({ nivel: "cadastral", categoria: "Cadastro", desc: "Área / Departamento não informado" });
        }
        if (!c.local_trabalho) {
          pendencias.push({ nivel: "cadastral", categoria: "Cadastro", desc: "Unidade / Local de trabalho não informado" });
        }
        if (!c.tipo_funcionario) {
          pendencias.push({ nivel: "cadastral", categoria: "Cadastro", desc: "Tipo de colaborador (Interno/Externo) não informado" });
        }
        if (c.tipo_funcionario === "Interno" && !c.ramal) {
          pendencias.push({ nivel: "cadastral", categoria: "Contato", desc: "Ramal interno não informado" });
        }

        return {
          colaborador: c,
          pendencias,
          temCritico: pendencias.some(p => p.nivel === "critico"),
          temGestao: pendencias.some(p => p.nivel === "gestao"),
          temCadastral: pendencias.some(p => p.nivel === "cadastral"),
        };
      })
      .filter(item => item.pendencias.length > 0);
  }, [colaboradores]);

  // Contadores por prioridade de auditoria
  const totalCriticos = useMemo(() => auditoriaIncompletos.filter(a => a.temCritico).length, [auditoriaIncompletos]);
  const totalGestao = useMemo(() => auditoriaIncompletos.filter(a => a.temGestao).length, [auditoriaIncompletos]);
  const totalCadastrais = useMemo(() => auditoriaIncompletos.filter(a => a.temCadastral).length, [auditoriaIncompletos]);

  // Auditoria filtrada pelo nível selecionado
  const auditoriaFiltrada = useMemo(() => {
    if (filtroNivelAuditoria === "critico") {
      return auditoriaIncompletos
        .map(a => ({ ...a, pendencias: a.pendencias.filter(p => p.nivel === "critico") }))
        .filter(a => a.pendencias.length > 0);
    }
    if (filtroNivelAuditoria === "gestao") {
      return auditoriaIncompletos
        .map(a => ({ ...a, pendencias: a.pendencias.filter(p => p.nivel === "gestao") }))
        .filter(a => a.pendencias.length > 0);
    }
    if (filtroNivelAuditoria === "cadastral") {
      return auditoriaIncompletos
        .map(a => ({ ...a, pendencias: a.pendencias.filter(p => p.nivel === "cadastral") }))
        .filter(a => a.pendencias.length > 0);
    }
    return auditoriaIncompletos;
  }, [auditoriaIncompletos, filtroNivelAuditoria]);

  const filtrados = useMemo(() => {
    let r = colaboradores;
    if (filtroStatus !== "todos") r = r.filter(c => c.status === filtroStatus);
    if (busca) r = r.filter(c =>
      c.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
      c.area?.toLowerCase().includes(busca.toLowerCase()) ||
      c.cargo?.toLowerCase().includes(busca.toLowerCase())
    );
    return r.sort((a, b) => a.nome_completo?.localeCompare(b.nome_completo));
  }, [colaboradores, busca, filtroStatus]);

  const ativos = colaboradores.filter(c => c.status === "Ativo").length;
  const desligados = colaboradores.filter(c => c.status === "Desligado").length;
  const total = colaboradores.length;

  return (
    <div className="space-y-5">
      {/* Seção de Auditoria de Cadastros Incompletos */}
      {auditoriaIncompletos.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/40 shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 bg-amber-100/60 border-b border-amber-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <CardTitle className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    Auditoria de Qualidade do Cadastro Geral
                    <Badge className="bg-amber-600 text-white hover:bg-amber-700 text-xs px-2 py-0.5">
                      {auditoriaIncompletos.length} com pendências
                    </Badge>
                  </CardTitle>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Organizado por hierarquia: priorize campos críticos (bloqueiam e-mails e acesso) antes dos informativos.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-amber-900 hover:bg-amber-200/60 text-xs h-7"
                  onClick={() => setExpandirAuditoria(!expandirAuditoria)}
                >
                  {expandirAuditoria ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                  {expandirAuditoria ? "Ocultar" : "Ver Detalhes"}
                </Button>
              </div>
            </div>
          </CardHeader>

          {expandirAuditoria && (
            <CardContent className="p-4 space-y-3">
              {/* Filtros por Nível de Severidade */}
              <div className="flex items-center gap-1.5 flex-wrap border-b pb-3">
                <Button
                  size="sm"
                  variant={filtroNivelAuditoria === "todos" ? "default" : "outline"}
                  onClick={() => setFiltroNivelAuditoria("todos")}
                  className={`h-7 text-xs ${filtroNivelAuditoria === "todos" ? "bg-amber-700 hover:bg-amber-800 text-white" : "border-amber-300 text-amber-900"}`}
                >
                  Todos ({auditoriaIncompletos.length})
                </Button>
                <Button
                  size="sm"
                  variant={filtroNivelAuditoria === "critico" ? "default" : "outline"}
                  onClick={() => setFiltroNivelAuditoria("critico")}
                  className={`h-7 text-xs ${filtroNivelAuditoria === "critico" ? "bg-red-600 hover:bg-red-700 text-white" : "border-red-300 text-red-700 hover:bg-red-50"}`}
                >
                  🔴 Críticos / Bloqueantes ({totalCriticos})
                </Button>
                <Button
                  size="sm"
                  variant={filtroNivelAuditoria === "gestao" ? "default" : "outline"}
                  onClick={() => setFiltroNivelAuditoria("gestao")}
                  className={`h-7 text-xs ${filtroNivelAuditoria === "gestao" ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-amber-300 text-amber-800 hover:bg-amber-50"}`}
                >
                  🟡 Gestão & Contato ({totalGestao})
                </Button>
                <Button
                  size="sm"
                  variant={filtroNivelAuditoria === "cadastral" ? "default" : "outline"}
                  onClick={() => setFiltroNivelAuditoria("cadastral")}
                  className={`h-7 text-xs ${filtroNivelAuditoria === "cadastral" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-300 text-blue-800 hover:bg-blue-50"}`}
                >
                  🔵 Estrutura & Cadastro ({totalCadastrais})
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {auditoriaFiltrada.map(({ colaborador, pendencias }) => (
                  <div key={colaborador.id} className="flex items-start justify-between gap-3 bg-white border border-amber-200/80 rounded-lg p-3 shadow-xs">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-900">{colaborador.nome_completo}</span>
                        <span className="text-[10px] text-gray-500">({colaborador.area || "Sem Área"})</span>
                      </div>
                      <ul className="space-y-1">
                        {pendencias.map((p, idx) => (
                          <li key={idx} className={`text-[11px] flex items-start gap-1.5 ${
                            p.nivel === "critico"
                              ? "text-red-700 font-medium"
                              : p.nivel === "gestao"
                              ? "text-amber-800"
                              : "text-blue-800"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                              p.nivel === "critico"
                                ? "bg-red-600"
                                : p.nivel === "gestao"
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`} />
                            <span>
                              <strong className="font-semibold text-[10px] uppercase mr-1">[{p.categoria}]:</strong>
                              {p.desc}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-7 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0 font-medium cursor-pointer"
                      onClick={() => setEditando(colaborador)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Completar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-green-900">Base 100% Qualificada e Completa</p>
            <p className="text-[11px] text-green-700">Todos os colaboradores ativos possuem todos os dados profissionais, pessoais, familiares e de gestão preenchidos.</p>
          </div>
        </div>
      )}

      {/* Métricas e Cabeçalho de Controles */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-indigo-600">{total}</p><p className="text-xs text-gray-500">Total Cadastrados</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-green-600">{ativos}</p><p className="text-xs text-gray-500">Ativos</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-red-600">{desligados}</p><p className="text-xs text-gray-500">Desligados</p></CardContent></Card>
      </div>

      {/* Barra de Ações */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input placeholder="Buscar por nome, cargo ou área..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-8 h-9 text-xs w-64" />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-9 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="Ativo">Ativos</SelectItem>
              <SelectItem value="Férias">Férias</SelectItem>
              <SelectItem value="Afastado">Afastados</SelectItem>
              <SelectItem value="Desligado">Desligados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 text-xs text-gray-700 border-gray-300 hover:bg-gray-100 flex items-center gap-1.5"
            onClick={() => setShowContingencia(true)}
          >
            <Send className="w-3.5 h-3.5 text-gray-500" />
            Contingência de Envios
          </Button>

          <Button className="bg-indigo-600 hover:bg-indigo-700 h-9 text-xs flex items-center gap-1.5" onClick={() => setShowNovo(true)}>
            <Plus className="w-4 h-4" />
            Novo Colaborador
          </Button>
        </div>
      </div>

      {/* Formulário Unificado Direto (Modo Criação ou Edição) */}
      {showNovo && (
        <ColaboradorForm 
          colaborador={null} 
          modoPortal={true}
          currentUserRole="conexao_humana"
          onClose={() => setShowNovo(false)} 
        />
      )}

      {editando && (
        <ColaboradorForm 
          colaborador={editando} 
          modoPortal={true}
          currentUserRole="conexao_humana"
          onClose={() => setEditando(null)} 
        />
      )}

      {/* Tabela de Colaboradores */}
      {!showNovo && !editando && (
        isLoading ? (
          <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" /></div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 uppercase tracking-wider">Colaborador</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 uppercase tracking-wider">Área / Cargo</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 uppercase tracking-wider">Aniversários</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 font-bold text-gray-600 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtrados.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-400">Nenhum colaborador encontrado com os filtros aplicados.</td></tr>
                  ) : filtrados.map(c => {
                    const temNasc = !!c.data_nascimento;
                    const temConjuge = !!c.conjuge_nome;
                    const qtdFilhos = (c.filhos || []).length;

                    return (
                      <tr key={c.id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {c.foto_url
                              ? <img src={c.foto_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border" />
                              : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">{c.nome_completo?.charAt(0)}</div>}
                            <div>
                              <p className="font-bold text-gray-900">{c.nome_completo}</p>
                              <p className="text-[11px] text-gray-500">{c.email || "Sem e-mail"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{c.area}</p>
                          <p className="text-[11px] text-gray-500">{c.cargo || "Não informado"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${temNasc ? "border-green-300 text-green-700 bg-green-50" : "border-red-300 text-red-700 bg-red-50"}`}>
                              🎂 {temNasc ? "Niver OK" : "Sem Niver"}
                            </Badge>
                            {temConjuge && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.conjuge_data_nascimento ? "border-purple-300 text-purple-700 bg-purple-50" : "border-amber-300 text-amber-700 bg-amber-50"}`}>
                                💍 Cônjuge
                              </Badge>
                            )}
                            {qtdFilhos > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-700 bg-blue-50">
                                👶 {qtdFilhos} {qtdFilhos === 1 ? "filho" : "filhos"}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[11px] ${STATUS_COR[c.status] || "bg-gray-100 text-gray-700"}`}>{c.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="outline" className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 text-xs h-7" onClick={() => setEditando(c)}>
                              <Pencil className="w-3 h-3 mr-1" />Editar
                            </Button>
                            {c.status !== "Desligado" && (
                              <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 text-xs h-7" onClick={() => setDesligando(c)}>
                                <UserX className="w-3 h-3 mr-1" />Desligar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Modal Desligamento */}
      <Dialog open={!!desligando} onOpenChange={v => !v && setDesligando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base font-bold text-red-900">Registrar Desligamento</DialogTitle></DialogHeader>
          {desligando && <ConfirmarDesligamento colaborador={desligando} onClose={() => setDesligando(null)} />}
        </DialogContent>
      </Dialog>

      {/* Modal Contingência de Envios */}
      <Dialog open={showContingencia} onOpenChange={setShowContingencia}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base font-bold text-gray-900">Contingência de Envios (Boas-Vindas / Despedida)</DialogTitle></DialogHeader>
          <ModalContingencia colaboradores={colaboradores} onClose={() => setShowContingencia(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}