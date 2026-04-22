import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, UserX, Search, Loader2, AlertTriangle } from "lucide-react";

const STATUS_COR = {
  Ativo: "bg-green-100 text-green-800",
  Férias: "bg-blue-100 text-blue-800",
  Afastado: "bg-yellow-100 text-yellow-800",
  Desligado: "bg-red-100 text-red-800",
};

function FormNovoColaborador({ onClose }) {
  const [form, setForm] = useState({
    nome_completo: "",
    email: "",
    area: "",
    cargo: "",
    tipo_funcionario: "Interno",
    data_admissao: new Date().toISOString().split("T")[0],
    status: "Ativo",
    incluir_comunicados: true,
    comunicado_boas_vindas_enviado: false,
  });
  const queryClient = useQueryClient();

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.Colaboradores.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal_gestao_colabs"] });
      queryClient.invalidateQueries({ queryKey: ["portal_comu_colabs"] });
      onClose();
    },
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nome_completo.trim() || !form.area.trim()) return alert("Nome e Área são obrigatórios.");
    createMut.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Nome Completo *</Label>
          <Input value={form.nome_completo} onChange={e => set("nome_completo", e.target.value)} placeholder="Nome completo" className="mt-1" required />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@empresa.com" className="mt-1" />
        </div>
        <div>
          <Label>Área / Departamento *</Label>
          <Input value={form.area} onChange={e => set("area", e.target.value)} placeholder="Ex: Logística" className="mt-1" required />
        </div>
        <div>
          <Label>Cargo</Label>
          <Input value={form.cargo} onChange={e => set("cargo", e.target.value)} placeholder="Ex: Analista" className="mt-1" />
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
          <Label>Data de Admissão</Label>
          <Input type="date" value={form.data_admissao} onChange={e => set("data_admissao", e.target.value)} className="mt-1" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={createMut.isPending}>
          {createMut.isPending ? "Cadastrando..." : "Cadastrar Colaborador"}
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
      queryClient.invalidateQueries({ queryKey: ["portal_comu_colabs"] });
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
            O colaborador <strong>{colaborador.nome_completo}</strong> terá o status alterado para <strong>Desligado</strong> e o acesso ao portal será bloqueado. O histórico e os dados serão preservados.
          </p>
        </div>
      </div>
      <div>
        <Label>Para confirmar, digite o nome completo do colaborador:</Label>
        <Input
          className="mt-1"
          placeholder={colaborador.nome_completo}
          value={confirmNome}
          onChange={e => setConfirmNome(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          className="bg-red-600 hover:bg-red-700"
          disabled={!nomeCorreto || desligarMut.isPending}
          onClick={() => desligarMut.mutate()}
        >
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
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{ativos}</p>
            <p className="text-xs text-gray-500">Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-red-600">{desligados}</p>
            <p className="text-xs text-gray-500">Desligados</p>
          </CardContent>
        </Card>
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
                    {c.status !== "Desligado" && (
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7" onClick={() => setDesligando(c)}>
                        <UserX className="w-3 h-3 mr-1" />Desligar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Novo Colaborador */}
      <Dialog open={showNovo} onOpenChange={v => !v && setShowNovo(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Cadastrar Novo Colaborador</DialogTitle></DialogHeader>
          <FormNovoColaborador onClose={() => setShowNovo(false)} />
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