import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Monitor, Search, Users, List, UserPlus, UserMinus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EquipamentoForm from "../components/equipamentos/EquipamentoForm";
import EquipamentoDetalhes from "../components/equipamentos/EquipamentoDetalhes";

export default function PCs_Internos() {
  const [showForm, setShowForm] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState(null);
  const [selectedEquipamento, setSelectedEquipamento] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grouped"); // "grouped" or "individual"
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [equipmentToTransfer, setEquipmentToTransfer] = useState(null);
  const [newUserName, setNewUserName] = useState("");
  const [selectedAvailableEquipment, setSelectedAvailableEquipment] = useState("");

  const queryClient = useQueryClient();

  const { data: equipamentos = [], isLoading } = useQuery({
    queryKey: ['pcs_internos'],
    queryFn: () => base44.entities.PCs_Internos.list('-created_date'),
  });

  // Buscar todos os usuários de todos os equipamentos
  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
  });

  const { data: smartphones = [] } = useQuery({
    queryKey: ['smartphones'],
    queryFn: () => base44.entities.Smartphones.list(),
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => base44.entities.Cameras.list(),
  });

  const { data: coletores = [] } = useQuery({
    queryKey: ['coletores'],
    queryFn: () => base44.entities.Coletores.list(),
  });

  const { data: canetasVibracao = [] } = useQuery({
    queryKey: ['canetas_vibracao'],
    queryFn: () => base44.entities.Canetas_Vibracao.list(),
  });

  // Obter lista única de todos os usuários do sistema
  const getAllUsers = () => {
    const usersSet = new Set();
    
    const addUsers = (equipments) => {
      equipments.forEach(eq => {
        if (eq.usuario_atual && eq.usuario_atual.trim() !== "") {
          usersSet.add(eq.usuario_atual.trim());
        }
      });
    };

    addUsers(equipamentos);
    addUsers(notebooksExternos);
    addUsers(smartphones);
    addUsers(cameras);
    addUsers(coletores);
    addUsers(canetasVibracao);

    return Array.from(usersSet).sort();
  };

  const allUsers = getAllUsers();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PCs_Internos.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      setShowForm(false);
      setEditingEquipamento(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PCs_Internos.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      setShowForm(false);
      setEditingEquipamento(null);
      setShowTransferModal(false);
      setShowAssignModal(false);
      setEquipmentToTransfer(null);
      setSelectedUser(null);
      setNewUserName("");
      setSelectedAvailableEquipment("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PCs_Internos.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
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

  const handleDelete = (id) => {
    if (confirm("Tem certeza que deseja excluir este equipamento?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleTransferEquipment = (equipment, currentUser) => {
    setEquipmentToTransfer(equipment);
    setSelectedUser(currentUser);
    setNewUserName(""); // Clear newUserName when opening modal
    setShowTransferModal(true);
  };

  const handleAssignEquipment = (userName) => {
    setSelectedUser(userName);
    setShowAssignModal(true);
  };

  const executeTransfer = () => {
    if (!newUserName || !equipmentToTransfer) return;

    const usuariosAnteriores = equipmentToTransfer.usuarios_anteriores || [];
    
    // Adiciona usuário atual ao histórico, se houver um usuário atual
    if (equipmentToTransfer.usuario_atual) {
      usuariosAnteriores.push({
        nome: equipmentToTransfer.usuario_atual,
        data_inicio: equipmentToTransfer.usuario_desde || equipmentToTransfer.data_aquisicao || "", 
        data_fim: new Date().toISOString().split('T')[0]
      });
    }

    // Se o novo usuário for "Disponível", limpa os campos
    if (newUserName === "Disponível") {
      updateMutation.mutate({
        id: equipmentToTransfer.id,
        data: {
          usuario_atual: "",
          usuario_desde: "",
          status: "Disponível",
          usuarios_anteriores: usuariosAnteriores
        }
      });
    } else {
      // Transfere para novo usuário
      updateMutation.mutate({
        id: equipmentToTransfer.id,
        data: {
          usuario_atual: newUserName,
          usuario_desde: new Date().toISOString().split('T')[0],
          status: "Em uso",
          usuarios_anteriores: usuariosAnteriores
        }
      });
    }
  };

  const executeAssign = () => {
    if (!selectedAvailableEquipment || !selectedUser) return;

    const equipment = equipamentos.find(e => e.id === selectedAvailableEquipment);
    if (!equipment) return;

    const usuariosAnteriores = equipment.usuarios_anteriores || [];
    if (equipment.usuario_atual) {
      usuariosAnteriores.push({
        nome: equipment.usuario_atual,
        data_inicio: equipment.usuario_desde || equipment.data_aquisicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });
    }

    updateMutation.mutate({
      id: selectedAvailableEquipment,
      data: {
        usuario_atual: selectedUser,
        usuario_desde: new Date().toISOString().split('T')[0],
        status: "Em uso",
        usuarios_anteriores: usuariosAnteriores
      }
    });
  };

  // Agrupar por usuário
  const getUserGroups = () => {
    const groups = new Map();
    
    equipamentos.forEach(eq => {
      if (eq.usuario_atual && eq.usuario_atual.trim() !== "") {
        if (!groups.has(eq.usuario_atual)) {
          groups.set(eq.usuario_atual, {
            usuario: eq.usuario_atual,
            area: eq.area || "-",
            desktops: [],
            monitores: [],
            notebooks: []
          });
        }
        const group = groups.get(eq.usuario_atual);
        if (eq.tipo === "Desktop") group.desktops.push(eq);
        else if (eq.tipo === "Monitor") group.monitores.push(eq);
        else if (eq.tipo === "Notebook") group.notebooks.push(eq);
      }
    });

    return Array.from(groups.values());
  };

  const userGroups = getUserGroups();
  const availableEquipments = equipamentos.filter(e => !e.usuario_atual || e.usuario_atual.trim() === "" || e.status === "Disponível");

  const filteredEquipamentos = equipamentos.filter(eq =>
    eq.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.usuario_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.etiqueta_interna?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUserGroups = userGroups.filter(group =>
    group.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: equipamentos.length,
    disponiveis: equipamentos.filter(e => e.status === "Disponível" || !e.usuario_atual).length,
    emUso: equipamentos.filter(e => e.status === "Em uso" && e.usuario_atual).length,
    manutencao: equipamentos.filter(e => e.status === "Manutenção").length,
    comProblema: equipamentos.filter(e => e.condicao === "Com Problema").length,
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Monitor className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">PCs Internos</h1>
              <p className="text-gray-500 mt-1">Gerenciar desktops, monitores e notebooks internos</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingEquipamento(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Equipamento
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
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
                <p className="text-sm text-gray-600">Manutenção</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.manutencao}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Com Problema</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.comProblema}</p>
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
            entityType="PCs_Internos"
          />
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <CardTitle>Equipamentos</CardTitle>
                  <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
                    <TabsList>
                      <TabsTrigger value="grouped" className="gap-2">
                        <Users className="w-4 h-4" />
                        Por Usuário
                      </TabsTrigger>
                      <TabsTrigger value="individual" className="gap-2">
                        <List className="w-4 h-4" />
                        Individual
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder={viewMode === "grouped" ? "Buscar usuário..." : "Buscar equipamento..."}
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
              {viewMode === "grouped" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Desktops</TableHead>
                      <TableHead>Monitores</TableHead>
                      <TableHead>Notebooks</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredUserGroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUserGroups.map((group, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{group.usuario}</div>
                          </TableCell>
                          <TableCell>{group.area}</TableCell>
                          <TableCell>
                            {group.desktops.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {group.desktops.map((desktop, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {desktop.modelo || desktop.marca}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleTransferEquipment(desktop, group.usuario)}
                                    >
                                      <UserMinus className="w-3 h-3 text-orange-600" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {group.monitores.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {group.monitores.map((monitor, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {monitor.modelo || monitor.marca}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleTransferEquipment(monitor, group.usuario)}
                                    >
                                      <UserMinus className="w-3 h-3 text-orange-600" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {group.notebooks.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {group.notebooks.map((notebook, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {notebook.modelo || notebook.marca}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleTransferEquipment(notebook, group.usuario)}
                                    >
                                      <UserMinus className="w-3 h-3 text-orange-600" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssignEquipment(group.usuario)}
                              className="gap-2"
                            >
                              <UserPlus className="w-4 h-4" />
                              Atribuir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Etiqueta</TableHead>
                      <TableHead>Usuário Atual</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Condição</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredEquipamentos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
                          <TableCell>
                            <Badge className={
                              equipamento.status === "Disponível" ? "bg-green-100 text-green-800" :
                              equipamento.status === "Em uso" ? "bg-blue-100 text-blue-800" :
                              "bg-orange-100 text-orange-800"
                            }>
                              {equipamento.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {equipamento.condicao && (
                              <Badge className={
                                equipamento.condicao === "Com Problema" ? "bg-red-100 text-red-800" :
                                equipamento.condicao === "Lento" ? "bg-yellow-100 text-yellow-800" :
                                equipamento.condicao === "Rápido" ? "bg-green-100 text-green-800" :
                                "bg-gray-100 text-gray-800"
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
                                  handleDelete(equipamento.id);
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
              )}
            </div>
          </CardContent>
        </Card>

        {selectedEquipamento && (
          <EquipamentoDetalhes
            equipamento={selectedEquipamento}
            onClose={() => setSelectedEquipamento(null)}
          />
        )}

        {/* Modal de Transferência */}
        <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transferir ou Tornar Disponível</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Equipamento:</strong> {equipmentToTransfer?.tipo} - {equipmentToTransfer?.modelo}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Usuário atual:</strong> {selectedUser}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Transferir para:</Label>
                <Select value={newUserName} onValueChange={setNewUserName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário ou 'Disponível'" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Disponível">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Disponível</span>
                      </div>
                    </SelectItem>
                    {allUsers.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                          USUÁRIOS
                        </div>
                        {allUsers.map((user) => (
                          <SelectItem key={user} value={user}>
                            {user}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Selecione "Disponível" para liberar o equipamento ou escolha um usuário para transferir.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransferModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={executeTransfer}
                disabled={!newUserName}
                className={newUserName === "Disponível" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
              >
                {newUserName === "Disponível" ? "Tornar Disponível" : "Transferir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Atribuição */}
        <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir Equipamento Disponível</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Atribuir para:</strong> {selectedUser}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Selecione o equipamento disponível:</Label>
                <Select value={selectedAvailableEquipment} onValueChange={setSelectedAvailableEquipment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEquipments.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhum equipamento disponível</SelectItem>
                    ) : (
                      availableEquipments.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.tipo} - {eq.marca} {eq.modelo} ({eq.etiqueta_interna || "Sem etiqueta"})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={executeAssign} 
                disabled={!selectedAvailableEquipment}
                className="bg-green-600"
              >
                Atribuir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}