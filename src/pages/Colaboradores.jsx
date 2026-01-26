import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Search, Eye, Pencil, Trash2, X, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import ColaboradorDetalhes from "../components/colaboradores/ColaboradorDetalhes";
import ColaboradorForm from "../components/colaboradores/ColaboradorForm";

export default function Colaboradores() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState(null);
  const [selectedColaborador, setSelectedColaborador] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const queryClient = useQueryClient();

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Colaboradores.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
    },
  });

  const handleExportar = () => {
    const header = "NOME_COMPLETO\tEMAIL\tAREA\tCARGO\tTELEFONE\tDATA_ADMISSAO\tSTATUS\n";
    const rows = colaboradores.map(c => [
      c.nome_completo || "",
      c.email || "",
      c.area || "",
      c.cargo || "",
      c.telefone || "",
      c.data_admissao || "",
      c.status || ""
    ].join("\t")).join("\n");

    const blob = new Blob(["\ufeff" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `colaboradores_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredColaboradores = colaboradores.filter(c => {
    const matchSearch = c.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       c.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       c.cargo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: colaboradores.length,
    ativos: colaboradores.filter(c => c.status === "Ativo").length,
    ferias: colaboradores.filter(c => c.status === "Férias").length,
    afastados: colaboradores.filter(c => c.status === "Afastado").length,
  };

  if (selectedColaborador) {
    return (
      <ColaboradorDetalhes
        colaborador={selectedColaborador}
        onClose={() => setSelectedColaborador(null)}
        onEdit={(colaborador) => {
          setEditingColaborador(colaborador);
          setSelectedColaborador(null);
          setShowForm(true);
        }}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Colaboradores</h1>
              <p className="text-gray-500 mt-1">Gerenciar colaboradores e suas credenciais</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportar} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button onClick={() => { setEditingColaborador(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Ativos</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.ativos}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Férias</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.ferias}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Afastados</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.afastados}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <ColaboradorForm
            colaborador={editingColaborador}
            onClose={() => { setShowForm(false); setEditingColaborador(null); }}
          />
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Lista de Colaboradores ({filteredColaboradores.length})</CardTitle>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredColaboradores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum colaborador encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredColaboradores.map((colaborador) => (
                      <TableRow key={colaborador.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedColaborador(colaborador)}>
                        <TableCell className="font-medium">{colaborador.nome_completo}</TableCell>
                        <TableCell className="text-sm text-gray-600">{colaborador.email || "-"}</TableCell>
                        <TableCell>{colaborador.area}</TableCell>
                        <TableCell>{colaborador.cargo || "-"}</TableCell>
                        <TableCell>
                          <Badge className={
                            colaborador.status === "Ativo" ? "bg-green-100 text-green-800" :
                            colaborador.status === "Férias" ? "bg-blue-100 text-blue-800" :
                            colaborador.status === "Afastado" ? "bg-orange-100 text-orange-800" :
                            "bg-gray-100 text-gray-800"
                          }>
                            {colaborador.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedColaborador(colaborador)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingColaborador(colaborador); setShowForm(true); }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir ${colaborador.nome_completo}?`)) {
                                  deleteMutation.mutate(colaborador.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}