import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Upload, CheckCircle, Clock, Users, Heart, Baby, Star, UserCheck, UserX, Megaphone } from "lucide-react";
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

const hoje = new Date();
const mesAtual = getMonth(hoje); // 0-indexed
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

// ─── Formulário de Arte ─────────────────────────────────────────────────────
function ArteForm({ arte, onClose }) {
  const [formData, setFormData] = useState(arte || { ativa: false });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: todasArtes = [] } = useQuery({
    queryKey: ["comunicados_artes"],
    queryFn: () => base44.entities.Comunicados_Artes.list(),
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.Comunicados_Artes.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] }); onClose(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.Comunicados_Artes.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] }); onClose(); },
  });

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("imagem_url", file_url);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Se ativando, desativar outras do mesmo tipo
    if (formData.ativa && formData.tipo_comunicado) {
      const outras = todasArtes.filter(a => a.tipo_comunicado === formData.tipo_comunicado && a.id !== arte?.id && a.ativa);
      for (const a of outras) {
        await base44.entities.Comunicados_Artes.update(a.id, { ativa: false });
      }
    }
    if (arte) {
      updateMut.mutate({ id: arte.id, d: formData });
    } else {
      createMut.mutate(formData);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Tipo de Comunicado *</Label>
        <Select value={formData.tipo_comunicado || ""} onValueChange={v => set("tipo_comunicado", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
          <SelectContent>
            {Object.entries(TIPO_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Título *</Label>
        <Input required placeholder="Ex: Arte Aniversário Abril 2026" value={formData.titulo || ""} onChange={e => set("titulo", e.target.value)} />
      </div>
      <div>
        <Label>Imagem / Arte</Label>
        {formData.imagem_url && (
          <img src={formData.imagem_url} alt="preview" className="w-40 h-28 object-cover rounded-lg border mb-2" />
        )}
        <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-indigo-400">
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Upload className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{uploading ? "Enviando..." : "Selecionar imagem"}</span>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Início da Vigência</Label>
          <Input type="date" value={formData.data_inicio_vigencia || ""} onChange={e => set("data_inicio_vigencia", e.target.value)} />
        </div>
        <div>
          <Label>Fim da Vigência</Label>
          <Input type="date" value={formData.data_fim_vigencia || ""} onChange={e => set("data_fim_vigencia", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Criado por</Label>
        <Input placeholder="Nome de quem cadastrou" value={formData.criado_por || ""} onChange={e => set("criado_por", e.target.value)} />
      </div>
      <div>
        <Label>Observações</Label>
        <Textarea rows={2} value={formData.observacoes || ""} onChange={e => set("observacoes", e.target.value)} />
      </div>
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
        <Switch id="ativa" checked={formData.ativa || false} onCheckedChange={v => set("ativa", v)} />
        <label htmlFor="ativa" className="text-sm text-green-900 cursor-pointer font-medium">Arte ativa para envios automáticos</label>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isPending}>
          {isPending ? "Salvando..." : (arte ? "Atualizar" : "Cadastrar")}
        </Button>
      </div>
    </form>
  );
}

// ─── Aba Artes ────────────────────────────────────────────────────────────────
function AbaArtes() {
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const queryClient = useQueryClient();

  const { data: artes = [], isLoading } = useQuery({
    queryKey: ["comunicados_artes"],
    queryFn: () => base44.entities.Comunicados_Artes.list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Comunicados_Artes.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] }),
  });

  const toggleAtivaMut = useMutation({
    mutationFn: async ({ arte, novoValor }) => {
      if (novoValor) {
        // Desativar outras do mesmo tipo
        const outras = artes.filter(a => a.tipo_comunicado === arte.tipo_comunicado && a.id !== arte.id && a.ativa);
        for (const a of outras) {
          await base44.entities.Comunicados_Artes.update(a.id, { ativa: false });
        }
      }
      return base44.entities.Comunicados_Artes.update(arte.id, { ativa: novoValor });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] }),
  });

  const filtradas = filtroTipo === "todos" ? artes : artes.filter(a => a.tipo_comunicado === filtroTipo);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setEditando(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />Cadastrar Arte
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Nenhuma arte cadastrada.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Título</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Arte</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vigência</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(arte => (
                <tr key={arte.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-medium">
                      {TIPO_LABELS[arte.tipo_comunicado] || arte.tipo_comunicado}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{arte.titulo}</td>
                  <td className="px-4 py-3">
                    {arte.imagem_url
                      ? <img src={arte.imagem_url} alt="arte" className="w-14 h-10 object-cover rounded border" />
                      : <span className="text-gray-400 text-xs">Sem imagem</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {arte.data_inicio_vigencia && <span>{arte.data_inicio_vigencia}</span>}
                    {arte.data_fim_vigencia && <span> → {arte.data_fim_vigencia}</span>}
                    {!arte.data_inicio_vigencia && !arte.data_fim_vigencia && <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={arte.ativa || false}
                        onCheckedChange={v => toggleAtivaMut.mutate({ arte, novoValor: v })}
                      />
                      <span className={arte.ativa ? "text-green-700 font-medium text-xs" : "text-gray-400 text-xs"}>
                        {arte.ativa ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditando(arte); setShowForm(true); }}>
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </Button>
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

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditando(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Arte" : "Cadastrar Arte"}</DialogTitle>
          </DialogHeader>
          <ArteForm arte={editando} onClose={() => { setShowForm(false); setEditando(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Seção genérica ──────────────────────────────────────────────────────────
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
function AbaVisaoGeral() {
  const queryClient = useQueryClient();

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  const updateColabMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Colaboradores.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["colaboradores"] }),
  });

  // Aniversariantes do mês
  const aniversariantesMes = useMemo(() =>
    colaboradores.filter(c => c.status !== "Desligado" && mesNasce(c.data_nascimento) === mesAtual),
    [colaboradores]
  );

  // Tempo de empresa
  const tempoEmpresa = useMemo(() =>
    colaboradores.filter(c => {
      if (!c.data_admissao || c.status === "Desligado") return false;
      if (mesNasce(c.data_admissao) !== mesAtual) return false;
      const anos = differenceInYears(hoje, new Date(c.data_admissao + "T00:00:00"));
      return [1, 5, 10].includes(anos);
    }).map(c => ({
      ...c,
      anos: differenceInYears(hoje, new Date(c.data_admissao + "T00:00:00")),
    })),
    [colaboradores]
  );

  // Cônjuges aniversariantes
  const conjugesMes = useMemo(() =>
    colaboradores.filter(c => c.status !== "Desligado" && mesNasce(c.conjuge_data_nascimento) === mesAtual),
    [colaboradores]
  );

  // Filhos 1 ano
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

  // Boas-vindas pendentes
  const boasVindasPendentes = useMemo(() =>
    colaboradores.filter(c => c.status === "Ativo" && !c.comunicado_boas_vindas_enviado),
    [colaboradores]
  );

  // Desligamentos recentes
  const desligados = useMemo(() =>
    colaboradores.filter(c => c.status === "Desligado" && !c.comunicado_despedida_enviado),
    [colaboradores]
  );

  const [enviandoId, setEnviandoId] = useState(null);

  const enviarBoasVindas = async (c) => {
    setEnviandoId(c.id);
    await base44.functions.invoke('enviarBoasVindas', { colaborador_id: c.id });
    queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
    setEnviandoId(null);
  };

  const enviarDespedida = async (c) => {
    setEnviandoId(c.id);
    await base44.functions.invoke('enviarDespedida', { colaborador_id: c.id });
    queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
    setEnviandoId(null);
  };

  const anoMarcoLabel = { 1: "🥇 1 Ano", 5: "🏆 5 Anos", 10: "🌟 10 Anos" };

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
                  ? <img src={c.foto_url} alt={c.nome_completo} className="w-10 h-10 rounded-full object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-bold text-sm">{c.nome_completo?.charAt(0)}</div>}
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">{c.nome_completo}</p>
                  <p className="text-xs text-gray-500">{c.area} {c.cargo && `· ${c.cargo}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{diaNasce(c.data_nascimento)}/{mesAtual + 1}</p>
                  {isHoje(c.data_nascimento) && <Badge className="bg-pink-500 text-white text-xs">🎂 Hoje!</Badge>}
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
                <Badge className="bg-yellow-400 text-yellow-900 text-xs">{anoMarcoLabel[c.anos] || `${c.anos} Anos`}</Badge>
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
                <div className="text-right">
                  <p className="text-xs text-gray-500">{diaNasce(c.conjuge_data_nascimento)}/{mesAtual + 1}</p>
                  {isHoje(c.conjuge_data_nascimento) && <Badge className="bg-red-500 text-white text-xs">🎂 Hoje!</Badge>}
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
              const filhoAniversariante = (c.filhos || []).filter(f => {
                if (!f.filho_data_nascimento) return false;
                const anos = differenceInYears(hoje, new Date(f.filho_data_nascimento + "T00:00:00"));
                return anos === 1 && mesNasce(f.filho_data_nascimento) === mesAtual;
              });
              return filhoAniversariante.map((f, i) => (
                <div key={`${c.id}-${i}`} className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800">{c.nome_completo}</p>
                    <p className="text-xs text-gray-500">Filho(a): <strong>{f.filho_nome || "—"}</strong> · Nascimento: {f.filho_data_nascimento}</p>
                  </div>
                  {isHoje(f.filho_data_nascimento) && <Badge className="bg-purple-500 text-white text-xs">🎂 Hoje!</Badge>}
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
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => enviarBoasVindas(c)} disabled={enviandoId === c.id}>
                  <CheckCircle className="w-3 h-3 mr-1" />{enviandoId === c.id ? "Enviando..." : "Enviar Boas-Vindas"}
                </Button>
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
                <Button size="sm" variant="outline" className="text-gray-700" onClick={() => enviarDespedida(c)} disabled={enviandoId === c.id}>
                  <CheckCircle className="w-3 h-3 mr-1" />{enviandoId === c.id ? "Enviando..." : "Enviar Despedida"}
                </Button>
              </div>
            ))}
          </div>}
      </SecaoCard>
    </div>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────
export default function Comunicados() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Megaphone className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comunicados</h1>
          <p className="text-sm text-gray-500">Artes de comunicação e painel de datas importantes</p>
        </div>
      </div>

      <Tabs defaultValue="artes" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="artes">🎨 Artes e Programação</TabsTrigger>
          <TabsTrigger value="visao">📅 Visão Geral</TabsTrigger>
        </TabsList>
        <TabsContent value="artes"><AbaArtes /></TabsContent>
        <TabsContent value="visao"><AbaVisaoGeral /></TabsContent>
      </Tabs>
    </div>
  );
}