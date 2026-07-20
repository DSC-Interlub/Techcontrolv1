import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Pencil, Trash2, Phone, Mail, User, Search, CheckCircle } from "lucide-react";

export default function GerenciadorEmpresasTerceiras({ open, onClose }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    nome_empresa: "",
    cnpj: "",
    nome_contato: "",
    telefone: "",
    email: "",
    observacoes: "",
    status: "Ativa",
  });

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas_terceiras"],
    queryFn: () => base44.entities.EmpresasTerceiras.list("-created_date"),
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmpresasTerceiras.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas_terceiras"] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmpresasTerceiras.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas_terceiras"] });
      setShowForm(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmpresasTerceiras.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas_terceiras"] });
    },
  });

  const resetForm = () => {
    setEditingEmpresa(null);
    setFormData({
      nome_empresa: "",
      cnpj: "",
      nome_contato: "",
      telefone: "",
      email: "",
      observacoes: "",
      status: "Ativa",
    });
  };

  const handleEdit = (empresa) => {
    setEditingEmpresa(empresa);
    setFormData({
      nome_empresa: empresa.nome_empresa || "",
      cnpj: empresa.cnpj || "",
      nome_contato: empresa.nome_contato || "",
      telefone: empresa.telefone || "",
      email: empresa.email || "",
      observacoes: empresa.observacoes || "",
      status: empresa.status || "Ativa",
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nome_empresa.trim()) return;
    if (editingEmpresa) {
      updateMutation.mutate({ id: editingEmpresa.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filtered = empresas.filter(e =>
    e.nome_empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nome_contato?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cnpj?.includes(searchTerm)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Empresas Terceirizadas & Fornecedores
          </DialogTitle>
          <DialogDescription>
            Gerencie o cadastro de parceiros externos utilizados no atendimento de chamados
          </DialogDescription>
        </DialogHeader>

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-2 border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-semibold text-gray-900">
                {editingEmpresa ? "Editar Empresa Terceira" : "Nova Empresa Terceira"}
              </h3>
              <Button size="sm" variant="ghost" type="button" onClick={() => setShowForm(false)}>
                Voltar à Lista
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome da Empresa / Fornecedor *</Label>
                <Input
                  required
                  placeholder="Ex: Dell Computadores, Vivo, Totvs"
                  value={formData.nome_empresa}
                  onChange={e => setFormData({ ...formData, nome_empresa: e.target.value })}
                />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  placeholder="00.000.000/0001-00"
                  value={formData.cnpj}
                  onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>
              <div>
                <Label>Pessoa de Contato / Técnico</Label>
                <Input
                  placeholder="Nome do contato ou suporte"
                  value={formData.nome_contato}
                  onChange={e => setFormData({ ...formData, nome_contato: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone / WhatsApp</Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
                  onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div>
                <Label>E-mail de Suporte</Label>
                <Input
                  type="email"
                  placeholder="suporte@empresa.com.br"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="w-full border rounded-md h-10 px-3 text-sm bg-white"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Ativa">Ativa</option>
                  <option value="Inativa">Inativa</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar Empresa"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar empresa..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova Empresa Terceira
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Telefone / E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-gray-500">Carregando empresas...</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-gray-500">Nenhuma empresa terceira cadastrada</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-semibold text-gray-900">{emp.nome_empresa}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-600">{emp.cnpj || "—"}</TableCell>
                        <TableCell className="text-sm">{emp.nome_contato || "—"}</TableCell>
                        <TableCell className="text-xs text-gray-600">
                          {emp.telefone && <div>📞 {emp.telefone}</div>}
                          {emp.email && <div>✉️ {emp.email}</div>}
                          {!emp.telefone && !emp.email && "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={emp.status === "Ativa" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"}>
                            {emp.status || "Ativa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(emp)}>
                            <Pencil className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir empresa ${emp.nome_empresa}?`)) deleteMutation.mutate(emp.id); }}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
