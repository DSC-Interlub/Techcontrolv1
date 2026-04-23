import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, UserX, Search, Loader2, AlertTriangle, Pencil, Trash2, Upload, User } from "lucide-react";

const STATUS_COR = {
  Ativo: "bg-green-100 text-green-800",
  Férias: "bg-blue-100 text-blue-800",
  Afastado: "bg-yellow-100 text-yellow-800",
  Desligado: "bg-red-100 text-red-800",
};

const hoje = new Date().toISOString().split("T")[0];

// ── Formulário completo (abas 1-3, sem senhas) ────────────────────────────────
function FormColaboradorPortal({ colaborador, onClose, onSuccess }) {
  const defaultForm = colaborador ? {
    nome_completo: colaborador.nome_completo || "",
    email: colaborador.email || "",
    area: colaborador.area || "",
    cargo: colaborador.cargo || "",
    telefone: colaborador.telefone || "",
    tipo_funcionario: colaborador.tipo_funcionario || "Interno",
    local_trabalho: colaborador.local_trabalho || "",
    data_admissao: colaborador.data_admissao || "",
    status: colaborador.status || "Ativo",
    incluir_comunicados: colaborador.incluir_comunicados !== false,
    foto_url: colaborador.foto_url || "",
    data_nascimento: colaborador.data_nascimento || "",
    graduacao: colaborador.graduacao || "",
    resumo_experiencia: colaborador.resumo_experiencia || "",
    contato_responsavel_nome: colaborador.contato_responsavel_nome || "",
    contato_responsavel_email: colaborador.contato_responsavel_email || "",
    conjuge_nome: colaborador.conjuge_nome || "",
    conjuge_email: colaborador.conjuge_email || "",
    conjuge_data_nascimento: colaborador.conjuge_data_nascimento || "",
    filhos: colaborador.filhos || [],
    observacoes: colaborador.observacoes || "",
  } : {
    nome_completo: "", email: "", area: "", cargo: "", telefone: "",
    tipo_funcionario: "Interno", local_trabalho: "", status: "Ativo",
    data_admissao: hoje, incluir_comunicados: true, foto_url: "",
    data_nascimento: "", graduacao: "", resumo_experiencia: "",
    contato_responsavel_nome: "", contato_responsavel_email: "",
    conjuge_nome: "", conjuge_email: "", conjuge_data_nascimento: "",
    filhos: [], observacoes: "",
  };

  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const fotoRef = useRef();
  const queryClient = useQueryClient();

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const addFilho = () => set('filhos', [...(form.filhos || []), { filho_nome: "", filho_data_nascimento: "" }]);
  const removeFilho = (i) => { const a = [...form.filhos]; a.splice(i, 1); set('filhos', a); };
  const updateFilho = (i, k, v) => { const a = [...form.filhos]; a[i] = { ...a[i], [k]: v }; set('filhos', a); };

  const handleFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('foto_url', file_url);
    setUploadingFoto(false);
  };

  const validate = () => {
    const e = {};
    if (!form.nome_completo?.trim() || form.nome_completo.trim().length < 3) e.nome_completo = "Nome obrigatório (mín. 3 caracteres)";
    if (!form.area?.trim()) e.area = "Área/Departamento é obrigatório";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    if (form.data_nascimento && form.data_nascimento > hoje) e.data_nascimento = "Não pode ser futura";
    if (form.conjuge_data_nascimento && form.conjuge_data_nascimento > hoje) e.conjuge_data_nascimento = "Não pode ser futura";
    return e;
  };

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.Colaboradores.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal_gestao_colabs"] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      setSuccessMsg("Colaborador cadastrado! Os dados de acesso ao portal precisam ser configurados pela equipe de TI.");
    },
  });

  const updateMut = useMutation({
    mutationFn: (d) => base44.entities.Colaboradores.update(colaborador.id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal_gestao_colabs"] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    if (colaborador) {
      updateMut.mutate(form);
    } else {
      createMut.mutate({ ...form, comunicado_boas_vindas_enviado: false });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const canSubmit = form.nome_completo?.trim()?.length >= 3 && form.area?.trim();

  const ErrMsg = ({ field }) => errors[field] ? <p className="text-xs text-red-500 mt-1">{errors[field]}</p> : null;

  if (successMsg) {
    return (
      <div className="space-y-4 py-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-800 font-medium">✅ {successMsg}</p>
        </div>
        <div className="flex justify-center">
          <Button onClick={onSuccess || onClose} className="bg-indigo-600 hover:bg-indigo-700">Fechar</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="profissional" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="profissional">Profissional</TabsTrigger>
          <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
          <TabsTrigger value="familia">Família</TabsTrigger>
        </TabsList>

        {/* ABA 1 — Profissional */}
        <TabsContent value="profissional" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Nome Completo <span className="text-red-500">*</span></Label>
              <Input value={form.nome_completo} onChange={e => set("nome_completo", e.target.value)} placeholder="Nome completo" className="mt-1" />
              <ErrMsg field="nome_completo" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@empresa.com" className="mt-1" />
              <ErrMsg field="email" />
            </div>
            <div>
              <Label>Área / Departamento <span className="text-red-500">*</span></Label>
              <Input value={form.area} onChange={e => set("area", e.target.value)} placeholder="Ex: Logística" className="mt-1" />
              <ErrMsg field="area" />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input value={form.cargo} onChange={e => set("cargo", e.target.value)} placeholder="Ex: Analista" className="mt-1" />
            </div>
            <div>
              <Label>Telefone / Ramal</Label>
              <Input value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(00) 00000-0000" className="mt-1" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo_funcionario} onValueChange={v => set("tipo_funcionario", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interno">Interno</SelectItem>
                  <SelectItem value="Externo">Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Local / Unidade</Label>
              <Input value={form.local_trabalho} onChange={e => set("local_trabalho", e.target.value)} placeholder="Ex: Matriz SP" className="mt-1" />
            </div>
            <div>
              <Label>Data de Admissão</Label>
              <Input type="date" value={form.data_admissao} onChange={e => set("data_admissao", e.target.value)} className="mt-1" />
            </div>
            {colaborador && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Férias">Férias</SelectItem>
                    <SelectItem value="Afastado">Afastado</SelectItem>
                    <SelectItem value="Desligado">Desligado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
            <Switch id="incluir_com" checked={form.incluir_comunicados !== false} onCheckedChange={v => set("incluir_comunicados", v)} />
            <label htmlFor="incluir_com" className="text-sm text-blue-900 cursor-pointer">
              <span className="font-medium">Incluir nos Comunicados Automáticos</span>
            </label>
          </div>
        </TabsContent>

        {/* ABA 2 — Pessoal */}
        <TabsContent value="pessoal" className="space-y-4">
          {/* Foto */}
          <div>
            <Label>Foto</Label>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                {form.foto_url
                  ? <img src={form.foto_url} alt="Foto" className="w-full h-full object-cover" />
                  : <User className="w-6 h-6 text-gray-300" />}
              </div>
              <div className="flex flex-col gap-1.5">
                <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
                <Button type="button" size="sm" variant="outline" onClick={() => fotoRef.current?.click()} disabled={uploadingFoto}>
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  {uploadingFoto ? "Enviando..." : (form.foto_url ? "Trocar" : "Carregar Foto")}
                </Button>
                {form.foto_url && (
                  <button type="button" className="text-xs text-red-500 hover:underline text-left" onClick={() => set('foto_url', '')}>Remover</button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-3">
            <div>
              <Label>Data de Nascimento</Label>
              <Input type="date" max={hoje} value={form.data_nascimento} onChange={e => set("data_nascimento", e.target.value)} className="mt-1" />
              <ErrMsg field="data_nascimento" />
            </div>
            <div>
              <Label>Graduação / Formação</Label>
              <Input value={form.graduacao} onChange={e => set("graduacao", e.target.value)} placeholder="Ex: Administração" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Resumo de Experiência</Label>
              <Textarea value={form.resumo_experiencia} onChange={e => set("resumo_experiencia", e.target.value)} rows={3} placeholder="Descreva brevemente..." className="mt-1" maxLength={500} />
              <p className="text-xs text-gray-400 mt-1 text-right">{(form.resumo_experiencia || "").length}/500</p>
            </div>
            <div>
              <Label>Nome do Responsável / Gestor</Label>
              <Input value={form.contato_responsavel_nome} onChange={e => set("contato_responsavel_nome", e.target.value)} placeholder="Nome do gestor" className="mt-1" />
            </div>
            <div>
              <Label>E-mail do Responsável</Label>
              <Input type="email" value={form.contato_responsavel_email} onChange={e => set("contato_responsavel_email", e.target.value)} placeholder="gestor@empresa.com" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)} rows={2} className="mt-1" />
            </div>
          </div>
        </TabsContent>

        {/* ABA 3 — Família */}
        <TabsContent value="familia" className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Cônjuge</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Nome do Cônjuge</Label>
                <Input value={form.conjuge_nome} onChange={e => set("conjuge_nome", e.target.value)} placeholder="Nome completo" className="mt-1" />
              </div>
              <div>
                <Label>E-mail do Cônjuge</Label>
                <Input type="email" value={form.conjuge_email} onChange={e => set("conjuge_email", e.target.value)} placeholder="conjuge@email.com" className="mt-1" />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input type="date" max={hoje} value={form.conjuge_data_nascimento} onChange={e => set("conjuge_data_nascimento", e.target.value)} className="mt-1" />
                <ErrMsg field="conjuge_data_nascimento" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-600">Filhos</h4>
              <Button type="button" size="sm" variant="outline" onClick={addFilho}>
                <Plus className="w-3.5 h-3.5 mr-1" />Adicionar Filho
              </Button>
            </div>
            {form.filhos.length === 0 && <p className="text-sm text-gray-400">Nenhum filho cadastrado.</p>}
            <div className="space-y-2">
              {form.filhos.map((filho, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 border rounded-lg p-3">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input placeholder="Nome do filho(a)" value={filho.filho_nome || ""} onChange={e => updateFilho(i, 'filho_nome', e.target.value)} />
                    <Input type="date" max={hoje} value={filho.filho_data_nascimento || ""} onChange={e => updateFilho(i, 'filho_data_nascimento', e.target.value)} />
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeFilho(i)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isPending || !canSubmit}>
          {isPending ? "Salvando..." : (colaborador ? "Salvar Alterações" : "Cadastrar Colaborador")}
        </Button>
      </div>
    </form>
  );
}

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
        <Label>Para confirmar, digite o nome completo do colaborador:</Label>
        <Input className="mt-1" placeholder={colaborador.nome_completo} value={confirmNome} onChange={e => setConfirmNome(e.target.value)} />
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

export default function GestaoColaboradoresPortal() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Ativo");
  const [showNovo, setShowNovo] = useState(false);
  const [desligando, setDesligando] = useState(null);
  const [editando, setEditando] = useState(null);

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ["portal_gestao_colabs"],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

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
    <div className="space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-indigo-600">{total}</p><p className="text-xs text-gray-500">Total</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-green-600">{ativos}</p><p className="text-xs text-gray-500">Ativos</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-red-600">{desligados}</p><p className="text-xs text-gray-500">Desligados</p></CardContent></Card>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-7 h-8 text-xs w-48" />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Férias">Férias</SelectItem>
              <SelectItem value="Afastado">Afastado</SelectItem>
              <SelectItem value="Desligado">Desligado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs" onClick={() => setShowNovo(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />Novo Colaborador
        </Button>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
      ) : (
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Área</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cargo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Admissão</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum colaborador encontrado.</td></tr>
              ) : filtrados.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.foto_url
                        ? <img src={c.foto_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">{c.nome_completo?.charAt(0)}</div>}
                      <div>
                        <p className="font-medium text-gray-800">{c.nome_completo}</p>
                        <p className="text-xs text-gray-400">{c.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.area}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.cargo || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${STATUS_COR[c.status] || "bg-gray-100 text-gray-700"}`}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.data_admissao || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs h-7" onClick={() => setEditando(c)}>
                        <Pencil className="w-3 h-3 mr-1" />Editar
                      </Button>
                      {c.status !== "Desligado" && (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7" onClick={() => setDesligando(c)}>
                          <UserX className="w-3 h-3 mr-1" />Desligar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Novo Colaborador */}
      <Dialog open={showNovo} onOpenChange={v => !v && setShowNovo(false)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Cadastrar Novo Colaborador</DialogTitle></DialogHeader>
          <FormColaboradorPortal onClose={() => setShowNovo(false)} onSuccess={() => setShowNovo(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal Editar Colaborador */}
      <Dialog open={!!editando} onOpenChange={v => !v && setEditando(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Colaborador</DialogTitle></DialogHeader>
          {editando && <FormColaboradorPortal colaborador={editando} onClose={() => setEditando(null)} />}
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Desligamento */}
      <Dialog open={!!desligando} onOpenChange={v => !v && setDesligando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirmar Desligamento</DialogTitle></DialogHeader>
          {desligando && <ConfirmarDesligamento colaborador={desligando} onClose={() => setDesligando(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}