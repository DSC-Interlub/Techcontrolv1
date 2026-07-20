import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Barcode, Search, Users, List, UserPlus, UserMinus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";

export default function Coletores() {
  const { user } = useAuth();
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
    queryKey: ['coletores'],
    queryFn: () => base44.entities.Coletores.list('-created_date'),
    staleTime: 30000,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list(),
    staleTime: 30000,
  });

  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['pcs_internos'],
    queryFn: () => base44.entities.PCs_Internos.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: smartphones = [] } = useQuery({
    queryKey: ['smartphones'],
    queryFn: () => base44.entities.Smartphones.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => base44.entities.Cameras.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: canetasVibracao = [] } = useQuery({
    queryKey: ['canetas_vibracao'],
    queryFn: () => base44.entities.Canetas_Vibracao.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });



  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Coletores.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coletores'] });
      setShowForm(false);
      setFormData({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coletores.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coletores'] });
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
    mutationFn: (id) => base44.entities.Coletores.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coletores'] });
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
    setNewUserName(""); // Reset new user name when opening modal
    setShowTransferModal(true);
  };

  const handleAssignEquipment = (userName) => {
    setSelectedUser(userName);
    setSelectedAvailableEquipment(""); // Reset selected equipment when opening modal
    setShowAssignModal(true);
  };

  const handleRemoveFromUser = (equipment) => {
    if (confirm(`Remover ${equipment.modelo} de ${equipment.usuario_atual}?`)) {
      const usuariosAnteriores = equipment.usuarios_anteriores || [];
      usuariosAnteriores.push({
        nome: equipment.usuario_atual,
        data_inicio: equipment.data_aquisicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });
      
      updateMutation.mutate({
        id: equipment.id,
        data: {
          usuario_atual: "",
          status: "Disponível",
          usuarios_anteriores: usuariosAnteriores
        }
      });
    }
  };

  const executeTransfer = () => {
    if (!newUserName || !equipmentToTransfer) return;

    const usuariosAnteriores = equipmentToTransfer.usuarios_anteriores || [];
    
    // Only push if there was an actual user to record
    if (equipmentToTransfer.usuario_atual && equipmentToTransfer.usuario_atual.trim() !== "") {
      usuariosAnteriores.push({
        nome: equipmentToTransfer.usuario_atual,
        data_inicio: equipmentToTransfer.data_aquisicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });
    }

    if (newUserName === "Disponível") {
      updateMutation.mutate({
        id: equipmentToTransfer.id,
        data: {
          usuario_atual: "",
          status: "Disponível",
          usuarios_anteriores: usuariosAnteriores
        }
      });
    } else {
      updateMutation.mutate({
        id: equipmentToTransfer.id,
        data: {
          usuario_atual: newUserName,
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
    if (equipment.usuario_atual && equipment.usuario_atual.trim() !== "") {
      usuariosAnteriores.push({
        nome: equipment.usuario_atual,
        data_inicio: equipment.data_aquisicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });
    }

    updateMutation.mutate({
      id: selectedAvailableEquipment,
      data: {
        usuario_atual: selectedUser,
        status: "Em uso",
        usuarios_anteriores: usuariosAnteriores
      }
    });
  };

  const getUserGroups = () => {
    const groups = new Map();
    
    equipamentos.forEach(eq => {
      if (eq.usuario_atual && eq.usuario_atual.trim() !== "") {
        if (!groups.has(eq.usuario_atual)) {
          groups.set(eq.usuario_atual, {
            usuario: eq.usuario_atual,
            area: eq.area || "-",
            coletores: []
          });
        }
        const group = groups.get(eq.usuario_atual);
        group.coletores.push(eq);
      }
    });

    return Array.from(groups.values());
  };

  const userGroups = getUserGroups();
  const availableEquipments = equipamentos.filter(e => !e.usuario_atual || e.usuario_atual.trim() === "" || e.status === "Disponível");

  // Buscar todos os usuários de todos os equipamentos
  const allUsers = Array.from(new Set([
    ...pcsInternos.filter(e => e.usuario_atual).map(e => e.usuario_atual),
    ...notebooksExternos.filter(e => e.usuario_atual).map(e => e.usuario_atual),
    ...smartphones.filter(e => e.usuario_atual).map(e => e.usuario_atual),
    ...cameras.filter(e => e.usuario_atual).map(e => e.usuario_atual),
    ...canetasVibracao.filter(e => e.usuario_atual).map(e => e.usuario_atual),
    ...equipamentos.filter(e => e.usuario_atual).map(e => e.usuario_atual)
  ])).sort();

  const filteredEquipamentos = equipamentos.filter(eq =>
    eq.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.usuario_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.numero_sequencial?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUserGroups = userGroups.filter(group =>
    group.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: equipamentos.length,
    disponiveis: equipamentos.filter(e => e.status === "Disponível" || !e.usuario_atual || e.usuario_atual.trim() === "").length,
    emUso: equipamentos.filter(e => e.status === "Em uso" && e.usuario_atual && e.usuario_atual.trim() !== "").length,
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Barcode className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Coletores</h1>
              <p className="text-gray-500 mt-1">Gerenciar coletores de dados</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingEquipamento(null);
              setFormData({});
              setShowForm(true);
            }}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Coletor
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <CardTitle>{editingEquipamento ? "Editar Coletor" : "Novo Coletor"}</CardTitle>
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
                    <Input placeholder="Ex: COL001" value={formData.numero_sequencial || ""} onChange={(e) => setFormData({ ...formData, numero_sequencial: e.target.value })} />
                  </div>
                  <div>
                    <Label>Data de Aquisição</Label>
                    <Input type="date" value={formData.data_aquisicao || ""} onChange={(e) => setFormData({ ...formData, data_aquisicao: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Input placeholder="Tipo do coletor" value={formData.tipo || ""} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Marca</Label>
                    <Input placeholder="Ex: Zebra, Honeywell" value={formData.marca || ""} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} />
                  </div>
                  <div>
                    <Label>Modelo</Label>
                    <Input placeholder="Modelo do coletor" value={formData.modelo || ""} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Nota Fiscal</Label>
                    <Input placeholder="Número da NF" value={formData.nota_fiscal || ""} onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })} />
                  </div>
                  <div>
                    <Label>Fornecedor</Label>
                    <Input placeholder="Nome do fornecedor" value={formData.fornecedor || ""} onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })} />
                  </div>
                  <div>
                    <Label>Etiqueta Interna</Label>
                    <Input placeholder="Código de identificação" value={formData.etiqueta_interna || ""} onChange={(e) => setFormData({ ...formData, etiqueta_interna: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Service Tag / Serial</Label>
                    <Input placeholder="Serial number" value={formData.service_tag || ""} onChange={(e) => setFormData({ ...formData, service_tag: e.target.value })} />
                  </div>
                  <div>
                    <Label>Usuário Atual</Label>
                    <Combobox
                      value={formData.usuario_atual || ""}
                      onValueChange={(value) => {
                        const colaborador = colaboradores.find(c => c.nome_completo === value);
                        setFormData({ 
                          ...formData, 
                          usuario_atual: value,
                          area: colaborador?.area || "",
                          usuario_desde: value ? (formData.usuario_desde || new Date().toISOString().split('T')[0]) : ""
                        });
                      }}
                      options={[
                        { value: "", label: "Nenhum (Disponível)" },
                        ...colaboradores
                          .filter(c => c.status === "Ativo")
                          .map(c => ({
                            value: c.nome_completo,
                            label: `${c.nome_completo} - ${c.area}`
                          }))
                      ]}
                      placeholder="Selecione o colaborador"
                      searchPlaceholder="Buscar colaborador..."
                      emptyText="Nenhum colaborador encontrado"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Usuário Desde</Label>
                    <Input 
                      type="date" 
                      value={formData.usuario_desde || ""} 
                      onChange={(e) => setFormData({ ...formData, usuario_desde: e.target.value })}
                      disabled={!formData.usuario_atual}
                      className={!formData.usuario_atual ? "bg-gray-50" : ""}
                    />
                  </div>
                  <div>
                    <Label>Área</Label>
                    <Input 
                      placeholder="Departamento" 
                      value={formData.area || ""} 
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="bg-gray-50"
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label>Condição</Label>
                    <Select value={formData.condicao || ""} onValueChange={(value) => setFormData({ ...formData, condicao: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a condição" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rápido">Rápido</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Lento">Lento</SelectItem>
                        <SelectItem value="Com Problema">Com Problema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea placeholder="Observações gerais" value={formData.observacoes || ""} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={2} />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormData({}); }} disabled={createMutation.isPending || updateMutation.isPending}>Cancelar</Button>
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : (editingEquipamento ? "Atualizar" : "Criar")}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <CardTitle>Coletores</CardTitle>
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
                    placeholder={viewMode === "grouped" ? "Buscar usuário..." : "Buscar coletor..."}
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
                      <TableHead>Coletores</TableHead>
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
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">Nenhum coletor encontrado</TableCell>
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
                            <div className="flex flex-col gap-1">
                              {group.coletores.map((coletor, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {coletor.marca} {coletor.modelo}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleTransferEquipment(coletor, group.usuario)}
                                  >
                                    <UserMinus className="w-3 h-3 text-orange-600" />
                                  </Button>
                                </div>
                              ))}
                              {group.coletores.length > 0 && (
                                <span className="text-xs text-cyan-600 font-medium">
                                  ({group.coletores.length} coletores)
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
                      <TableHead>Tipo</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Etiqueta</TableHead>
                      <TableHead>Usuário</TableHead>
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
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">Nenhum coletor encontrado</TableCell>
                      </TableRow>
                    ) : (
                      filteredEquipamentos.map((equipamento) => (
                        <TableRow key={equipamento.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm">{equipamento.numero_sequencial || "-"}</TableCell>
                          <TableCell>{equipamento.tipo || "-"}</TableCell>
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
              <DialogTitle>Transferir ou Tornar Disponível</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Coletor:</strong> {equipmentToTransfer?.marca} {equipmentToTransfer?.modelo}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Usuário atual:</strong> {selectedUser || "Nenhum"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Transferir para:</Label>
                <Select value={newUserName} onValueChange={setNewUserName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário ou Disponível" />
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
              <DialogTitle>Atribuir Coletor Disponível</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Atribuir para:</strong> {selectedUser}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Selecione o coletor disponível:</Label>
                <Select value={selectedAvailableEquipment} onValueChange={setSelectedAvailableEquipment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um coletor" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEquipments.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhum coletor disponível</SelectItem>
                    ) : (
                      availableEquipments.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.marca} {eq.modelo} ({eq.etiqueta_interna || "Sem etiqueta"})
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