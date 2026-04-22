import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus, Pencil, Trash2, Upload, CheckCircle, Clock, Users, Heart, Baby,
  Star, UserCheck, UserX, Megaphone, Search, AlertTriangle, Filter,
} from "lucide-react";
import { format, getMonth, getDate, getYear, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_LABELS = {
  aniversario_colaborador: "Aniversário Colaborador",
  aniversario_conjuge: "Aniversário Cônjuge",
  aniversario_filho_1ano: "Aniversário Filho 1 Ano",
  tempo_empresa_1ano: "1 Ano de Empresa",
  tempo_empresa_5anos: "5 Anos de Empresa",
  tempo_empresa_10anos: "10 Anos de Empresa",
  boas_vindas: "Boas-Vindas",
  despedida: "Despedida",
};

const TIPOS_GENERICOS = ["boas_vindas", "despedida"];

const hoje = new Date();
const mesAtual = getMonth(hoje);
const anoAtual = getYear(hoje);
const diaAtual = getDate(hoje);

function mesNasce(dateStr) {
  if (!dateStr) return -1;
  return getMonth(new Date(dateStr + "T00:00:00"));
}
function diaNasce(dateStr) {
  if (!dateStr) return -1;
  return getDate(new Date(dateStr + "T00:00:00"));
}
function isHoje(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  return getMonth(d) === mesAtual && getDate(d) === diaAtual;
}

// ─── Hook: buscar arte para colaborador ──────────────────────────────────────
function useArteStatus(artes, colaboradorId, tipo) {
  return useMemo(() => {
    if (!artes || !colaboradorId || !tipo) return null;
    const pendente = artes.find(a =>
      a.colaborador_id === colaboradorId &&
      a.tipo_comunicado === tipo &&
      a.ano_referencia === anoAtual &&
      a.status_envio === "pendente"
    );
    if (pendente) return { status: "pronta", arte: pendente };

    const enviada = artes.find(a =>
      a.colaborador_id === colaboradorId &&
      a.tipo_comunicado === tipo &&
      a.ano_referencia === anoAtual &&
      a.status_envio === "enviado"
    );
    if (enviada) return { status: "enviada", arte: enviada };

    return { status: "sem_arte", arte: null };
  }, [artes, colaboradorId, tipo]);
}

// ─── Badge de Status de Arte ──────────────────────────────────────────────────
function ArteStatusBadge({ artes, colaboradorId, tipo, onNovaArte }) {
  const result = useArteStatus(artes, colaboradorId, tipo);
  if (!result) return null;

  if (result.status === "pronta") {
    return <Badge className="bg-green-100 text-green-800 text-xs shrink-0">✅ Arte pronta</Badge>;
  }
  if (result.status === "enviada") {
    return <Badge className="bg-gray-100 text-gray-500 text-xs shrink-0">Enviado</Badge>;
  }
  return (
    <button
      onClick={() => onNovaArte && onNovaArte({ colaboradorId, tipo })}
      className="shrink-0"
    >
      <Badge className="bg-orange-100 text-orange-700 border border-orange-300 text-xs cursor-pointer hover:bg-orange-200">
        ⚠️ Sem arte
      </Badge>
    </button>
  );
}

// ─── Formulário de Arte ───────────────────────────────────────────────────────
function ArteForm({ arte, preSelColaboradorId, preSelTipo, colaboradores, currentUser, onClose }) {
  const [tipo, setTipo] = useState(arte?.tipo_comunicado || preSelTipo || "");
  const [colaboradorId, setColaboradorId] = useState(arte?.colaborador_id || preSelColaboradorId || "");
  const [titulo, setTitulo] = useState(arte?.titulo || "");
  const [imagemUrl, setImagemUrl] = useState(arte?.imagem_url || "");
  const [observacoes, setObservacoes] = useState(arte?.observacoes || "");
  const [uploading, setUploading] = useState(false);
  const [busca, setBusca] = useState("");
  const queryClient = useQueryClient();

  const colabAtivos = useMemo(() =>
    colaboradores.filter(c => c.status !== "Desligado"),
    [colaboradores]
  );

  const colabFiltrados = useMemo(() =>
    colabAtivos.filter(c =>
      c.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
      c.area?.toLowerCase().includes(busca.toLowerCase())
    ),
    [colabAtivos, busca]
  );

  const colabSelecionado = useMemo(() =>
    colabAtivos.find(c => c.id === colaboradorId),
    [colabAtivos, colaboradorId]
  );

  const isGenerico = TIPOS_GENERICOS.includes(tipo);

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.Comunicados_Artes.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] }); onClose(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.Comunicados_Artes.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] }); onClose(); },
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImagemUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tipo) return alert("Selecione o tipo de comunicado");
    if (!isGenerico && !colaboradorId) return alert("Selecione um colaborador");
    if (!imagemUrl) return alert("Faça o upload da imagem");

    const nomeColab = colabSelecionado?.nome_completo || "";
    const tituloFinal = titulo || (nomeColab
      ? `${TIPO_LABELS[tipo]} — ${nomeColab} ${anoAtual}`
      : `${TIPO_LABELS[tipo]} ${anoAtual}`);

    const payload = {
      tipo_comunicado: tipo,
      colaborador_id: colaboradorId || "",
      colaborador_nome: nomeColab,
      titulo: tituloFinal,
      imagem_url: imagemUrl,
      ano_referencia: anoAtual,
      status_envio: arte?.status_envio || "pendente",
      criado_por: currentUser?.full_name || currentUser?.email || "Desconhecido",
      observacoes,
    };

    if (arte) {
      updateMut.mutate({ id: arte.id, d: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo */}
      <div>
        <Label>Tipo de Comunicado *</Label>
        <Select value={tipo} onValueChange={v => { setTipo(v); setColaboradorId(""); }}>
          <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
          <SelectContent>
            {Object.entries(TIPO_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Colaborador */}
      {tipo && (
        <div>
          <Label>
            Colaborador {isGenerico ? "(opcional — deixe vazio para arte genérica)" : "*"}
          </Label>
          {colabSelecionado ? (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg p-2 mt-1">
              <div className="flex-1">
                <p className="text-sm font-medium text-indigo-800">{colabSelecionado.nome_completo}</p>
                <p className="text-xs text-indigo-600">{colabSelecionado.area}</p>
              </div>
              <button type="button" onClick={() => setColaboradorId("")}
                className="text-xs text-indigo-500 hover:text-indigo-700 underline">
                Trocar
              </button>
            </div>
          ) : (
            <div className="mt-1 border rounded-lg overflow-hidden">
              <div className="p-2 border-b bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar colaborador..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-sm outline-none bg-transparent"
                  />
                </div>
              </div>
              {isGenerico && (
                <button
                  type="button"
                  onClick={() => { setColaboradorId(""); setBusca(""); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-500 italic border-b"
                >
                  — Arte genérica (sem colaborador específico)
                </button>
              )}
              <div className="max-h-40 overflow-y-auto">
                {colabFiltrados.slice(0, 30).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setColaboradorId(c.id); setBusca(""); }}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b last:border-b-0"
                  >
                    <p className="text-sm font-medium text-gray-800">{c.nome_completo}</p>
                    <p className="text-xs text-gray-500">{c.area}</p>
                  </button>
                ))}
                {colabFiltrados.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">Nenhum encontrado</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Imagem */}
      <div>
        <Label>Imagem / Arte *</Label>
        {imagemUrl && (
          <img src={imagemUrl} alt="preview" className="w-full max-h-40 object-contain rounded-lg border mb-2 mt-1" />
        )}
        <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-indigo-400 mt-1">
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Upload className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{uploading ? "Enviando..." : (imagemUrl ? "Trocar imagem" : "Selecionar imagem")}</span>
        </label>
      </div>

      {/* Observações */}
      <div>
        <Label>Observações</Label>
        <Textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Opcional..." />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isPending}>
          {isPending ? "Salvando..." : (arte ? "Atualizar" : "Cadastrar Arte")}
        </Button>
      </div>
    </form>
  );
}

// ─── Aba Artes ────────────────────────────────────────────────────────────────
function AbaArtes({ colaboradores, currentUser }) {
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroAno, setFiltroAno] = useState(String(anoAtual));
  const [buscaColab, setBuscaColab] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [preSelColaboradorId, setPreSelColaboradorId] = useState(null);
  const [preSelTipo, setPreSelTipo] = useState(null);
  const queryClient = useQueryClient();

  const { data: artes = [], isLoading } = useQuery({
    queryKey: ["comunicados_artes"],
    queryFn: () => base44.entities.Comunicados_Artes.list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Comunicados_Artes.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] }),
  });

  const filtradas = useMemo(() => {
    let result = artes;
    if (filtroTipo !== "todos") result = result.filter(a => a.tipo_comunicado === filtroTipo);
    if (filtroStatus !== "todos") result = result.filter(a => a.status_envio === filtroStatus);
    if (filtroAno) result = result.filter(a => String(a.ano_referencia) === filtroAno);
    if (buscaColab) result = result.filter(a =>
      a.colaborador_nome?.toLowerCase().includes(buscaColab.toLowerCase())
    );
    return result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [artes, filtroTipo, filtroStatus, filtroAno, buscaColab]);

  const abrirNovaArte = (opts = {}) => {
    setEditando(null);
    setPreSelColaboradorId(opts.colaboradorId || null);
    setPreSelTipo(opts.tipo || null);
    setShowForm(true);
  };

  const getRowClass = (status) => {
    if (status === "erro") return "border-b bg-red-50 hover:bg-red-100";
    if (status === "enviado") return "border-b bg-gray-50 opacity-70 hover:opacity-100";
    return "border-b hover:bg-gray-50";
  };

  const getStatusBadge = (status) => {
    if (status === "pendente") return <Badge className="bg-blue-100 text-blue-800 text-xs">⏳ Pendente</Badge>;
    if (status === "enviado") return <Badge className="bg-gray-100 text-gray-600 text-xs">✅ Enviado</Badge>;
    if (status === "erro") return <Badge className="bg-red-100 text-red-700 text-xs">❌ Erro</Badge>;
    return null;
  };

  const anos = [...new Set(artes.map(a => String(a.ano_referencia)).filter(Boolean))].sort().reverse();
  if (!anos.includes(String(anoAtual))) anos.unshift(String(anoAtual));

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos os anos</SelectItem>
              {anos.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Buscar colaborador..."
              value={buscaColab}
              onChange={e => setBuscaColab(e.target.value)}
              className="pl-7 h-8 text-xs w-48"
            />
          </div>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs" onClick={() => abrirNovaArte()}>
          <Plus className="w-3.5 h-3.5 mr-1" />Nova Arte
        </Button>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Nenhuma arte encontrada.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Colaborador</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ano</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Imagem</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status Envio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cadastrado por</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data Cadastro</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(arte => (
                <tr key={arte.id} className={getRowClass(arte.status_envio)}>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-medium">
                      {TIPO_LABELS[arte.tipo_comunicado] || arte.tipo_comunicado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {arte.colaborador_nome
                      ? <span className="font-medium text-gray-800">{arte.colaborador_nome}</span>
                      : <span className="text-gray-400 italic text-xs">Arte genérica</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{arte.ano_referencia || "—"}</td>
                  <td className="px-4 py-3">
                    {arte.imagem_url
                      ? <img src={arte.imagem_url} alt="arte" className="w-14 h-10 object-cover rounded border" />
                      : <span className="text-gray-400 text-xs">Sem imagem</span>}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(arte.status_envio)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{arte.criado_por || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {arte.created_date ? format(new Date(arte.created_date), "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {arte.status_envio !== "enviado" && (
                        <Button size="icon" variant="ghost" onClick={() => { setEditando(arte); setShowForm(true); }}>
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir esta arte?")) deleteMut.mutate(arte.id); }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditando(null); setPreSelColaboradorId(null); setPreSelTipo(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Arte" : "Cadastrar Nova Arte"}</DialogTitle>
          </DialogHeader>
          {showForm && (
            <ArteForm
              arte={editando}
              preSelColaboradorId={preSelColaboradorId}
              preSelTipo={preSelTipo}
              colaboradores={colaboradores}
              currentUser={currentUser}
              onClose={() => { setShowForm(false); setEditando(null); setPreSelColaboradorId(null); setPreSelTipo(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── SecaoCard ────────────────────────────────────────────────────────────────
function SecaoCard({ icon: Icon, titulo, cor, children }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 text-base ${cor}`}>
          <Icon className="w-5 h-5" />{titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Aba Visão Geral ──────────────────────────────────────────────────────────
function AbaVisaoGeral({ podeEnviarMensagens, onNovaArte }) {
  const queryClient = useQueryClient();

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  const { data: artes = [] } = useQuery({
    queryKey: ["comunicados_artes"],
    queryFn: () => base44.entities.Comunicados_Artes.list(),
  });

  const [enviandoId, setEnviandoId] = useState(null);

  const enviarBoasVindas = async (c) => {
    setEnviandoId(c.id + "_bv");
    await base44.functions.invoke('enviarBoasVindas', { colaborador_id: c.id });
    queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
    setEnviandoId(null);
  };

  const enviarDespedida = async (c) => {
    setEnviandoId(c.id + "_dep");
    await base44.functions.invoke('enviarDespedida', { colaborador_id: c.id });
    queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
    setEnviandoId(null);
  };

  const aniversariantesMes = useMemo(() =>
    colaboradores.filter(c => c.status !== "Desligado" && mesNasce(c.data_nascimento) === mesAtual),
    [colaboradores]
  );

  const tempoEmpresa = useMemo(() =>
    colaboradores.filter(c => {
      if (!c.data_admissao || c.status === "Desligado") return false;
      if (mesNasce(c.data_admissao) !== mesAtual) return false;
      const anos = differenceInYears(hoje, new Date(c.data_admissao + "T00:00:00"));
      return [1, 2, 3, 5, 10, 15, 20].includes(anos);
    }).map(c => ({
      ...c,
      anos: differenceInYears(hoje, new Date(c.data_admissao + "T00:00:00")),
    })),
    [colaboradores]
  );

  const conjugesMes = useMemo(() =>
    colaboradores.filter(c => c.status !== "Desligado" && mesNasce(c.conjuge_data_nascimento) === mesAtual),
    [colaboradores]
  );

  const filhos1Ano = useMemo(() =>
    colaboradores.filter(c => {
      if (c.status === "Desligado") return false;
      return (c.filhos || []).some(f => {
        if (!f.filho_data_nascimento) return false;
        const anos = differenceInYears(hoje, new Date(f.filho_data_nascimento + "T00:00:00"));
        return anos === 1 && mesNasce(f.filho_data_nascimento) === mesAtual;
      });
    }),
    [colaboradores]
  );

  const boasVindasPendentes = useMemo(() =>
    colaboradores.filter(c => c.status === "Ativo" && !c.comunicado_boas_vindas_enviado),
    [colaboradores]
  );

  const desligados = useMemo(() =>
    colaboradores.filter(c => c.status === "Desligado" && !c.comunicado_despedida_enviado),
    [colaboradores]
  );

  const tipoTempoLabel = (anos) => {
    if (anos >= 20) return "🌟 20 Anos";
    if (anos >= 15) return "🌟 15 Anos";
    if (anos >= 10) return "🌟 10 Anos";
    if (anos >= 5) return "🏆 5 Anos";
    if (anos >= 3) return "🥈 3 Anos";
    if (anos >= 2) return "🥈 2 Anos";
    return "🥇 1 Ano";
  };

  const tipoTempoKey = (anos) => {
    const map = { 1: "tempo_empresa_1ano", 2: "tempo_empresa_1ano", 3: "tempo_empresa_1ano", 5: "tempo_empresa_5anos", 10: "tempo_empresa_10anos", 15: "tempo_empresa_10anos", 20: "tempo_empresa_10anos" };
    return map[anos] || "tempo_empresa_1ano";
  };

  return (
    <div className="space-y-5">
      {/* Aniversariantes */}
      <SecaoCard icon={Users} titulo={`Aniversariantes do Mês (${format(hoje, "MMMM", { locale: ptBR })})`} cor="text-pink-700">
        {aniversariantesMes.length === 0
          ? <p className="text-sm text-gray-400">Nenhum aniversariante este mês.</p>
          : <div className="space-y-2">
            {aniversariantesMes.map(c => (
              <div key={c.id} className="flex items-center gap-3 bg-pink-50 border border-pink-100 rounded-lg p-3">
                {c.foto_url
                  ? <img src={c.foto_url} alt={c.nome_completo} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  : <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-bold text-sm shrink-0">{c.nome_completo?.charAt(0)}</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800">{c.nome_completo}</p>
                  <p className="text-xs text-gray-500">{c.area}{c.cargo && ` · ${c.cargo}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">{diaNasce(c.data_nascimento)}/{mesAtual + 1}</p>
                  {isHoje(c.data_nascimento) && <Badge className="bg-pink-500 text-white text-xs">🎂 Hoje!</Badge>}
                  <ArteStatusBadge artes={artes} colaboradorId={c.id} tipo="aniversario_colaborador" onNovaArte={onNovaArte} />
                </div>
              </div>
            ))}
          </div>}
      </SecaoCard>

      {/* Tempo de Empresa */}
      <SecaoCard icon={Star} titulo="Aniversários de Tempo de Empresa" cor="text-yellow-700">
        {tempoEmpresa.length === 0
          ? <p className="text-sm text-gray-400">Nenhum aniversário de empresa este mês.</p>
          : <div className="space-y-2">
            {tempoEmpresa.map(c => (
              <div key={c.id} className="flex items-center gap-3 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">{c.nome_completo}</p>
                  <p className="text-xs text-gray-500">Admissão: {c.data_admissao}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-400 text-yellow-900 text-xs">{tipoTempoLabel(c.anos)}</Badge>
                  <ArteStatusBadge artes={artes} colaboradorId={c.id} tipo={tipoTempoKey(c.anos)} onNovaArte={onNovaArte} />
                </div>
              </div>
            ))}
          </div>}
      </SecaoCard>

      {/* Cônjuges */}
      <SecaoCard icon={Heart} titulo="Aniversários de Cônjuges" cor="text-red-600">
        {conjugesMes.length === 0
          ? <p className="text-sm text-gray-400">Nenhum cônjuge aniversariante este mês.</p>
          : <div className="space-y-2">
            {conjugesMes.map(c => (
              <div key={c.id} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg p-3">
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">{c.nome_completo}</p>
                  <p className="text-xs text-gray-500">Cônjuge: <strong>{c.conjuge_nome || "—"}</strong></p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">{diaNasce(c.conjuge_data_nascimento)}/{mesAtual + 1}</p>
                  {isHoje(c.conjuge_data_nascimento) && <Badge className="bg-red-500 text-white text-xs">🎂 Hoje!</Badge>}
                  <ArteStatusBadge artes={artes} colaboradorId={c.id} tipo="aniversario_conjuge" onNovaArte={onNovaArte} />
                </div>
              </div>
            ))}
          </div>}
      </SecaoCard>

      {/* Filhos 1 ano */}
      <SecaoCard icon={Baby} titulo="Filhos que Completam 1 Ano este Mês" cor="text-purple-700">
        {filhos1Ano.length === 0
          ? <p className="text-sm text-gray-400">Nenhum filho completando 1 ano este mês.</p>
          : <div className="space-y-2">
            {filhos1Ano.map(c => {
              const filhosAniv = (c.filhos || []).filter(f => {
                if (!f.filho_data_nascimento) return false;
                const anos = differenceInYears(hoje, new Date(f.filho_data_nascimento + "T00:00:00"));
                return anos === 1 && mesNasce(f.filho_data_nascimento) === mesAtual;
              });
              return filhosAniv.map((f, i) => (
                <div key={`${c.id}-${i}`} className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800">{c.nome_completo}</p>
                    <p className="text-xs text-gray-500">Filho(a): <strong>{f.filho_nome || "—"}</strong></p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isHoje(f.filho_data_nascimento) && <Badge className="bg-purple-500 text-white text-xs">🎈 Hoje!</Badge>}
                    <ArteStatusBadge artes={artes} colaboradorId={c.id} tipo="aniversario_filho_1ano" onNovaArte={onNovaArte} />
                  </div>
                </div>
              ));
            })}
          </div>}
      </SecaoCard>

      {/* Boas-Vindas Pendentes */}
      <SecaoCard icon={UserCheck} titulo="Boas-Vindas Pendentes" cor="text-green-700">
        {boasVindasPendentes.length === 0
          ? <p className="text-sm text-gray-400">Nenhuma boas-vindas pendente. ✅</p>
          : <div className="space-y-2">
            {boasVindasPendentes.map(c => (
              <div key={c.id} className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-lg p-3">
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">{c.nome_completo}</p>
                  <p className="text-xs text-gray-500">{c.area} · Admissão: {c.data_admissao || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ArteStatusBadge artes={artes} colaboradorId={c.id} tipo="boas_vindas" onNovaArte={onNovaArte} />
                  {podeEnviarMensagens && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => enviarBoasVindas(c)} disabled={enviandoId === c.id + "_bv"}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {enviandoId === c.id + "_bv" ? "Enviando..." : "Enviar"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>}
      </SecaoCard>

      {/* Desligamentos */}
      <SecaoCard icon={UserX} titulo="Desligamentos Recentes (Despedida Pendente)" cor="text-gray-700">
        {desligados.length === 0
          ? <p className="text-sm text-gray-400">Nenhuma despedida pendente. ✅</p>
          : <div className="space-y-2">
            {desligados.map(c => (
              <div key={c.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">{c.nome_completo}</p>
                  <p className="text-xs text-gray-500">{c.area}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ArteStatusBadge artes={artes} colaboradorId={c.id} tipo="despedida" onNovaArte={onNovaArte} />
                  {podeEnviarMensagens && (
                    <Button size="sm" variant="outline" className="text-gray-700"
                      onClick={() => enviarDespedida(c)} disabled={enviandoId === c.id + "_dep"}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {enviandoId === c.id + "_dep" ? "Enviando..." : "Enviar"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>}
      </SecaoCard>
    </div>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────
export default function Comunicados() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  // Para pré-selecionar ao clicar "Sem arte" na visão geral
  const [preSelNovaArte, setPreSelNovaArte] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      const role = u?.role;
      setActiveTab(role === "comunicados_gestao" ? "visao" : "artes");
    }).catch(() => {});
  }, []);

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  const role = currentUser?.role;
  const podeVerArtes = !role || ["admin", "comunicados_arte", "comunicados_gestao", "comunicados_dp"].includes(role);
  const podeEnviarMensagens = !role || ["admin", "comunicados_dp"].includes(role);

  const handleNovaArteFromVisao = ({ colaboradorId, tipo }) => {
    setPreSelNovaArte({ colaboradorId, tipo });
    setActiveTab("artes");
  };

  if (!activeTab) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Megaphone className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comunicados</h1>
          <p className="text-sm text-gray-500">Artes individuais por colaborador e painel de datas importantes</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          {podeVerArtes && <TabsTrigger value="artes">🎨 Artes e Programação</TabsTrigger>}
          <TabsTrigger value="visao">📅 Visão Geral</TabsTrigger>
        </TabsList>
        {podeVerArtes && (
          <TabsContent value="artes">
            <AbaArtes
              colaboradores={colaboradores}
              currentUser={currentUser}
              initialPreSel={preSelNovaArte}
            />
          </TabsContent>
        )}
        <TabsContent value="visao">
          <AbaVisaoGeral
            podeEnviarMensagens={podeEnviarMensagens}
            onNovaArte={podeVerArtes ? handleNovaArteFromVisao : null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}