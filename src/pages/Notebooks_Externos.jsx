import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Laptop, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EquipamentoForm from "../components/equipamentos/EquipamentoForm";
import EquipamentoDetalhes from "../components/equipamentos/EquipamentoDetalhes";
import { useAuth } from "@/lib/AuthContext";

export default function Notebooks_Externos() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState(null);
  const [selectedEquipamento, setSelectedEquipamento] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const queryClient = useQueryClient();

  const { data: equipamentos = [], isLoading } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list('-created_date'),
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Notebooks_Externos.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
      setShowForm(false);
      setEditingEquipamento(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Notebooks_Externos.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
      setShowForm(false);
      setEditingEquipamento(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notebooks_Externos.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
    },
  });

  const handleSubmit = (data) => {
    if (editingEquipamento) {
      updateMutation.mutate({ id: editingEquipamento.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (equipamento) => {
    setEditingEquipamento(equipamento);
    setShowForm(true);
  };

  // Verificar se há um ID na URL para abrir automaticamente
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const equipamentoId = urlParams.get('id');
    if (equipamentoId && equipamentos.length > 0) {
      const equip = equipamentos.find(e => e.id === equipamentoId);
      if (equip) {
        handleEdit(equip);
      }
    }
  }, [equipamentos]);

  const filteredEquipamentos = equipamentos.filter(eq =>
    eq.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.usuario_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.etiqueta_interna?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.condicao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: equipamentos.length,
    disponiveis: equipamentos.filter(e => e.status === "Disponível").length,
    emUso: equipamentos.filter(e => e.status === "Em uso").length,
    reservados: equipamentos.filter(e => e.status === "Reservado").length,
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Laptop className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Notebooks Externos</h1>
              <p className="text-gray-500 mt-1">Gerenciar notebooks e tablets externos</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingEquipamento(null);
              setShowForm(true);
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Notebook
          </Button>
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
                <p className="text-sm text-gray-600">Disponíveis</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.disponiveis}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Em Uso</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.emUso}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Reservados</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.reservados}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <EquipamentoForm
            equipamento={editingEquipamento}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingEquipamento(null);
            }}
            entityType="Notebooks_Externos"
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Lista de Equipamentos ({filteredEquipamentos.length})</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar equipamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead>Etiqueta</TableHead>
                    <TableHead>Usuário Atual</TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredEquipamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Nenhum equipamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEquipamentos.map((equipamento) => (
                      <TableRow 
                        key={equipamento.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedEquipamento(equipamento)}
                      >
                        <TableCell>
                          <Badge variant="outline">{equipamento.tipo}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{equipamento.marca}</p>
                            <p className="text-sm text-gray-500">{equipamento.modelo}</p>
                          </div>
                        </TableCell>
                        <TableCell>{equipamento.etiqueta_interna || "-"}</TableCell>
                        <TableCell>{equipamento.usuario_atual || "-"}</TableCell>
                        <TableCell>{equipamento.uf || "-"}</TableCell>
                        <TableCell>
                          <Badge className={
                            equipamento.status === "Disponível" ? "bg-green-100 text-green-800" :
                            equipamento.status === "Reservado" ? "bg-purple-100 text-purple-800" :
                            equipamento.status === "Em uso" ? "bg-blue-100 text-blue-800" :
                            equipamento.status === "Danificado" ? "bg-red-100 text-red-800" :
                            "bg-orange-100 text-orange-800"
                          }>
                            {equipamento.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {equipamento.condicao && (
                            <Badge variant="outline" className={
                              equipamento.condicao === "Rápido" ? "border-green-300 text-green-700" :
                              equipamento.condicao === "Normal" ? "border-blue-300 text-blue-700" :
                              equipamento.condicao === "Lento" ? "border-yellow-300 text-yellow-700" :
                              "border-red-300 text-red-700"
                            }>
                              {equipamento.condicao}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(equipamento);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Tem certeza que deseja excluir?")) {
                                  deleteMutation.mutate(equipamento.id);
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

        {selectedEquipamento && (
          <EquipamentoDetalhes
            equipamento={selectedEquipamento}
            onClose={() => setSelectedEquipamento(null)}
          />
        )}
      </div>
    </div>
  );
}