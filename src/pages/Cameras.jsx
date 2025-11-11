
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Camera, Search, Users, List, UserPlus, UserMinus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import UsuariosAnteriores from "../components/equipamentos/UsuariosAnteriores";

export default function Cameras() {
  const [showForm, setShowForm] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({});
  const [viewMode, setViewMode] = useState("grouped");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [equipmentToTransfer, setEquipmentToTransfer] = useState(null);
  const [newUserName, setNewUserName] = useState("");
  const [selectedAvailableEquipment, setSelectedAvailableEquipment] = useState("");

  const queryClient = useQueryClient();

  const { data: equipamentos = [], isLoading } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => base44.entities.Cameras.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cameras.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      setShowForm(false);
      setFormData({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cameras.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      setShowForm(false);
      setEditingEquipamento(null);
      setFormData({});
      setShowTransferModal(false);
      setShowAssignModal(false);
      setEquipmentToTransfer(null);
      setSelectedUser(null);
      setNewUserName("");
      setSelectedAvailableEquipment("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cameras.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingEquipamento) {
      updateMutation.mutate({ id: editingEquipamento.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleTransferEquipment = (equipment, currentUser) => {
    setEquipmentToTransfer(equipment);
    setSelectedUser(currentUser);
    setNewUserName(""); // Reset new user name when opening
    setShowTransferModal(true);
  };

  const handleAssignEquipment = (userName) => {
    setSelectedUser(userName);
    setSelectedAvailableEquipment(""); // Reset selected equipment when opening
    setShowAssignModal(true);
  };

  const handleRemoveFromUser = (equipment) => {
    if (confirm(`Remover ${equipment.modelo} de ${equipment.usuario_atual}?`)) {
      const usuariosAnteriores = equipment.usuarios_anteriores ? [...equipment.usuarios_anteriores] : [];
      if (equipment.usuario_atual) {
        usuariosAnteriores.push({
          nome: equipment.usuario_atual,
          data_inicio: equipment.usuario_desde || equipment.data_aquisicao || "", // Use usuario_desde if available
          data_fim: new Date().toISOString().split('T')[0]
        });
      }
      
      updateMutation.mutate({
        id: equipment.id,
        data: {
          usuario_atual: null, // Set to null instead of empty string for clarity in DB
          usuario_desde: null, // Also set usuario_desde to null
          status: "Disponível",
          usuarios_anteriores: usuariosAnteriores
        }
      });
    }
  };

  const executeTransfer = () => {
    if (!equipmentToTransfer) return;

    const usuariosAnteriores = equipmentToTransfer.usuarios_anteriores ? [...equipmentToTransfer.usuarios_anteriores] : [];
    if (equipmentToTransfer.usuario_atual) {
      usuariosAnteriores.push({
        nome: equipmentToTransfer.usuario_atual,
        data_inicio: equipmentToTransfer.usuario_desde || equipmentToTransfer.data_aquisicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });
    }

    updateMutation.mutate({
      id: equipmentToTransfer.id,
      data: {
        usuario_atual: newUserName,
        usuario_desde: new Date().toISOString().split('T')[0], // Set current date as usuario_desde
        status: "Em uso",
        usuarios_anteriores: usuariosAnteriores
      }
    });
  };

  const executeAssign = () => {
    if (!selectedAvailableEquipment || !selectedUser) return;

    const equipment = equipamentos.find(e => e.id === selectedAvailableEquipment);
    if (!equipment) return;

    const usuariosAnteriores = equipment.usuarios_anteriores ? [...equipment.usuarios_anteriores] : [];
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
        usuario_desde: new Date().toISOString().split('T')[0], // Set current date as usuario_desde
        status: "Em uso",
        usuarios_anteriores: usuariosAnteriores
      }
    });
  };

  const getUserGroups = () => {
    const groups = new Map();
    
    equipamentos.forEach(eq => {
      // Group by usuario_atual only if it's not null, undefined, or an empty string after trimming
      if (eq.usuario_atual && eq.usuario_atual.trim() !== "") {
        const userKey = eq.usuario_atual.trim().toLowerCase(); // Use a normalized key for grouping
        if (!groups.has(userKey)) {
          groups.set(userKey, {
            usuario: eq.usuario_atual,
            area: eq.area || "-",
            cameras: []
          });
        }
        const group = groups.get(userKey);
        group.cameras.push(eq);
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
    eq.numero_sequencial?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUserGroups = userGroups.filter(group =>
    group.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.cameras.some(camera => 
        camera.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        camera.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        camera.numero_sequencial?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const stats = {
    total: equipamentos.length,
    disponiveis: equipamentos.filter(e => !e.usuario_atual || e.usuario_atual.trim() === "" || e.status === "Disponível").length,
    emUso: equipamentos.filter(e => e.usuario_atual && e.usuario_atual.trim() !== "" && e.status === "Em uso").length,
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Camera className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Câmeras</h1>
              <p className="text-gray-500 mt-1">Gerenciar câmeras e equipamentos de imagem</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingEquipamento(null);
              setFormData({});
              setShowForm(true);
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Câmera
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>{editingEquipamento ? "Editar Câmera" : "Nova Câmera"}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setFormData({}); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Número Sequencial</Label>
                    <Input placeholder="Ex: CAM001" value={formData.numero_sequencial || ""} onChange={(e) => setFormData({ ...formData, numero_sequencial: e.target.value })} />
                  </div>
                  <div>
                    <Label>Data de Aquisição</Label>
                    <Input type="date" value={formData.data_aquisicao || ""} onChange={(e) => setFormData({ ...formData, data_aquisicao: e.target.value })} />
                  </div>
                  <div>
                    <Label>Marca</Label>
                    <Input placeholder="Ex: Canon, Sony" value={formData.marca || ""} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Modelo</Label>
                    <Input placeholder="Modelo da câmera" value={formData.modelo || ""} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} />
                  </div>
                  <div>
                    <Label>Fornecedor</Label>
                    <Input placeholder="Nome do fornecedor" value={formData.fornecedor || ""} onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Nota Fiscal</Label>
                    <Input placeholder="Número da NF" value={formData.nota_fiscal || ""} onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })} />
                  </div>
                  <div>
                    <Label>Etiqueta Interna</Label>
                    <Input placeholder="Código de identificação" value={formData.etiqueta_interna || ""} onChange={(e) => setFormData({ ...formData, etiqueta_interna: e.target.value })} />
                  </div>
                  <div>
                    <Label>Service Tag / Serial</Label>
                    <Input placeholder="Serial number" value={formData.service_tag || ""} onChange={(e) => setFormData({ ...formData, service_tag: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Usuário Atual</Label>
                    <Input placeholder="Nome do usuário" value={formData.usuario_atual || ""} onChange={(e) => setFormData({ ...formData, usuario_atual: e.target.value })} />
                  </div>
                  <div>
                    <Label>Usuário Desde</Label>
                    <Input type="date" value={formData.usuario_desde || ""} onChange={(e) => setFormData({ ...formData, usuario_desde: e.target.value })} />
                  </div>
                  <div>
                    <Label>Área</Label>
                    <Input placeholder="Departamento" value={formData.area || ""} onChange={(e) => setFormData({ ...formData, area: e.target.value })} />
                  </div>
                </div>

                <UsuariosAnteriores
                  usuarios={formData.usuarios_anteriores || []}
                  onChange={(usuarios) => setFormData({ ...formData, usuarios_anteriores: usuarios })}
                />

                <div>
                  <Label>Status</Label>
                  <Select value={formData.status || "Disponível"} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Disponível">Disponível</SelectItem>
                      <SelectItem value="Em uso">Em uso</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea placeholder="Observações gerais" value={formData.observacoes || ""} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={2} />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormData({}); }}>Cancelar</Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700">{editingEquipamento ? "Atualizar" : "Criar"}</Button>
              </CardFooter>
            </form>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <CardTitle>Câmeras</CardTitle>
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
                    placeholder={viewMode === "grouped" ? "Buscar usuário ou câmera..." : "Buscar câmera..."}
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
                      <TableHead>Câmeras</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">Carregando...</TableCell>
                      </TableRow>
                    ) : filteredUserGroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">Nenhum usuário encontrado</TableCell>
                      </TableRow>
                    ) : (
                      filteredUserGroups.map((group, index) => (
                        <TableRow key={group.usuario} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{group.usuario}</div>
                          </TableCell>
                          <TableCell>{group.area}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {group.cameras.map((camera) => (
                                <div key={camera.id} className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {camera.marca} {camera.modelo} ({camera.numero_sequencial})
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleTransferEquipment(camera, group.usuario)}
                                  >
                                    <UserMinus className="w-3 h-3 text-orange-600" />
                                  </Button>
                                </div>
                              ))}
                              {group.cameras.length > 1 && (
                                <span className="text-xs text-gray-500 font-medium mt-1">
                                  ({group.cameras.length} câmeras)
                                </span>
                              )}
                            </div>
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
                      <TableHead>Nº Seq.</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Etiqueta</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">Carregando...</TableCell>
                      </TableRow>
                    ) : filteredEquipamentos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">Nenhuma câmera encontrada</TableCell>
                      </TableRow>
                    ) : (
                      filteredEquipamentos.map((equipamento) => (
                        <TableRow key={equipamento.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm">{equipamento.numero_sequencial || "-"}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{equipamento.marca}</p>
                              <p className="text-sm text-gray-500">{equipamento.modelo}</p>
                            </div>
                          </TableCell>
                          <TableCell>{equipamento.etiqueta_interna || "-"}</TableCell>
                          <TableCell>{equipamento.usuario_atual || "-"}</TableCell>
                          <TableCell>{equipamento.area || "-"}</TableCell>
                          <TableCell>
                            <Badge className={
                              equipamento.status === "Disponível" ? "bg-green-100 text-green-800" :
                              equipamento.status === "Em uso" ? "bg-blue-100 text-blue-800" :
                              "bg-orange-100 text-orange-800"
                            }>
                              {equipamento.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingEquipamento(equipamento); setFormData(equipamento); setShowForm(true); }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm("Tem certeza?")) deleteMutation.mutate(equipamento.id); }}>
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

        {/* Modal de Transferência */}
        <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transferir ou Remover Câmera</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Câmera:</strong> {equipmentToTransfer?.marca} {equipmentToTransfer?.modelo} ({equipmentToTransfer?.numero_sequencial})
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Usuário atual:</strong> {selectedUser}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUserName">Transferir para:</Label>
                <Input
                  id="newUserName"
                  placeholder="Digite o nome do novo usuário"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Deixe este campo vazio para remover a câmera do usuário atual e torná-la disponível.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransferModal(false)}>
                Cancelar
              </Button>
              {newUserName ? (
                <Button onClick={executeTransfer} className="bg-blue-600">
                  Transferir
                </Button>
              ) : (
                <Button onClick={() => {
                  handleRemoveFromUser(equipmentToTransfer);
                  setShowTransferModal(false);
                }} className="bg-orange-600">
                  Remover do Usuário
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Atribuição */}
        <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir Câmera Disponível</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Atribuir para:</strong> {selectedUser}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="availableEquipment">Selecione a câmera disponível:</Label>
                <Select value={selectedAvailableEquipment} onValueChange={setSelectedAvailableEquipment}>
                  <SelectTrigger id="availableEquipment">
                    <SelectValue placeholder="Selecione uma câmera" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEquipments.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhuma câmera disponível</SelectItem>
                    ) : (
                      availableEquipments.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.marca} {eq.modelo} ({eq.numero_sequencial || "Nº Seq. Não Informado"})
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
