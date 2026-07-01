import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";

export default function CentrosCusto() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState("todos");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: centros = [], isLoading } = useQuery({
    queryKey: ["centros_custo"],
    queryFn: () => base44.entities.CentrosCusto.list(),
  });

  const sortedCentros = [...centros].sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));

  const filtered = sortedCentros.filter(c => {
    const matchSearch = !search ||
      String(c.codigo).includes(search) ||
      c.nome?.toLowerCase().includes(search.toLowerCase());
    const matchAtivo = filtroAtivo === "todos" || (filtroAtivo === "ativo" ? c.ativo : !c.ativo);
    return matchSearch && matchAtivo;
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        return base44.entities.CentrosCusto.update(data.id, { codigo: data.codigo, nome: data.nome, ativo: data.ativo });
      }
      return base44.entities.CentrosCusto.create({ codigo: data.codigo, nome: data.nome, ativo: data.ativo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros_custo"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CentrosCusto.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["centros_custo"] }),
  });

  const toggleAtivo = async (centro) => {
    await base44.entities.CentrosCusto.update(centro.id, { ativo: !centro.ativo });
    queryClient.invalidateQueries({ queryKey: ["centros_custo"] });
  };

  const handleEdit = (centro) => {
    setEditing(centro);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Building2 className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Centros de Custo</h1>
          <p className="text-muted-foreground text-sm">Gerencie os centros de custo disponíveis para requisições de compra</p>
        </div>
        <Button onClick={handleNew} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="w-4 h-4" />Novo Centro
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por código ou nome..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["todos", "ativo", "inativo"].map(f => (
            <Button key={f} size="sm" variant={filtroAtivo === f ? "default" : "outline"} onClick={() => setFiltroAtivo(f)}>
              {f === "todos" ? "Todos" : f === "ativo" ? "Ativos" : "Inativos"}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-10 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">Nenhum centro de custo encontrado.</p>
          ) : (
            <div className="divide-y">
              {filtered.map(c => (
                <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <span className="font-mono text-sm font-medium text-muted-foreground w-24 shrink-0">{c.codigo}</span>
                  <span className="flex-1 font-medium text-foreground truncate">{c.nome}</span>
                  <Badge className={c.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
                    {c.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  <Switch checked={!!c.ativo} onCheckedChange={() => toggleAtivo(c)} />
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (window.confirm(`Excluir "${c.nome}"?`)) deleteMutation.mutate(c.id); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-3">
        {filtered.length} de {centros.length} centro(s) de custo · Centros inativos não aparecem ao criar novas requisições.
      </p>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Centro de Custo" : "Novo Centro de Custo"}</DialogTitle>
          </DialogHeader>
          <CentroCustoForm
            initial={editing}
            onSave={(data) => saveMutation.mutate(data)}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            isSaving={saveMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CentroCustoForm({ initial, onSave, onCancel, isSaving }) {
  const [codigo, setCodigo] = useState(initial?.codigo || "");
  const [nome, setNome] = useState(initial?.nome || "");
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);

  return (
    <div className="space-y-4">
      <div>
        <Label>Código <span className="text-red-500">*</span></Label>
        <Input className="mt-1" placeholder="Ex: 100101" value={codigo} onChange={e => setCodigo(e.target.value)} disabled={!!initial} />
      </div>
      <div>
        <Label>Nome <span className="text-red-500">*</span></Label>
        <Input className="mt-1" placeholder="Ex: Tecnologia da Informação - TI" value={nome} onChange={e => setNome(e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={ativo} onCheckedChange={setAtivo} />
        <Label className="cursor-pointer" onClick={() => setAtivo(!ativo)}>{ativo ? "Ativo" : "Inativo"}</Label>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={!codigo.trim() || !nome.trim() || isSaving} onClick={() => onSave({ id: initial?.id, codigo: codigo.trim(), nome: nome.trim(), ativo })}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </div>
  );
}