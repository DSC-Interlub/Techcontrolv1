import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Smartphone, Search, Users, List, UserPlus, UserMinus, X } from "lucide-react";
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

export default function Smartphones() {
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
    queryKey: ['smartphones'],
    queryFn: () => base44.entities.Smartphones.list('-created_date'),
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

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => base44.entities.Cameras.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: coletores = [] } = useQuery({
    queryKey: ['coletores'],
    queryFn: () => base44.entities.Coletores.list(),
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
    mutationFn: (data) => base44.entities.Smartphones.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartphones'] });
      setShowForm(false);
      setFormData({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Smartphones.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartphones'] });
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
    mutationFn: (id) => base44.entities.Smartphones.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartphones'] });
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
    setNewUserName(""); // Reset new user name
    setShowTransferModal(true);
  };

  const handleAssignEquipment = (userName) => {
    setSelectedUser(userName);
    setSelectedAvailableEquipment(""); // Reset selected equipment
    setShowAssignModal(true);
  };

  const handleRemoveFromUser = (equipment) => {
    if (confirm(`Remover ${equipment.modelo} de ${equipment.usuario_atual}?`)) {
      const usuariosAnteriores = equipment.usuarios_anteriores || [];
      usuariosAnteriores.push({
        nome: equipment.usuario_atual,
        data_inicio: equipment.usuario_desde || equipment.data_aquisicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });
      
      updateMutation.mutate({
        id: equipment.id,
        data: {
          usuario_atual: "",
          usuario_desde: "",
          status: "Disponível",
          usuarios_anteriores: usuariosAnteriores
        }
      });
    }
  };

  const executeTransfer = () => {
    if (!newUserName || !equipmentToTransfer) return;

    const usuariosAnteriores = equipmentToTransfer.usuarios_anteriores || [];
    
    if (equipmentToTransfer.usuario_atual) {
      usuariosAnteriores.push({
        nome: equipmentToTransfer.usuario_atual,
        data_inicio: equipmentToTransfer.usuario_desde || equipmentToTransfer.data_aquisicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });
    }

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

  const getUserGroups = () => {
    const groups = new Map();
    
    equipamentos.forEach(eq => {
      if (eq.usuario_atual && eq.usuario_atual.trim() !== "") {
        if (!groups.has(eq.usuario_atual)) {
          groups.set(eq.usuario_atual, {
            usuario: eq.usuario_atual,
            smartphones: [],
            totalValor: 0
          });
        }
        const group = groups.get(eq.usuario_atual);
        group.smartphones.push(eq);
        group.totalValor += eq.valor || 0;
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
    eq.imei?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUserGroups = userGroups.filter(group =>
    group.usuario.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: equipamentos.length,
    disponiveis: equipamentos.filter(e => e.status === "Disponível" || !e.usuario_atual).length,
    emUso: equipamentos.filter(e => e.status === "Em uso" && e.usuario_atual).length,
    valorTotal: equipamentos.reduce((sum, e) => sum + (e.valor || 0), 0),
    comProblema: equipamentos.filter(e => e.condicao === "Com Problema").length,
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Smartphones</h1>
              <p className="text-gray-500 mt-1">Gerenciar smartphones corporativos</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingEquipamento(null);
              setFormData({});
              setShowForm(true);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Smartphone
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
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Com Problema</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.comProblema}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>{editingEquipamento ? "Editar Smartphone" : "Novo Smartphone"}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setFormData({}); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Data de Aquisição</Label>
                    <Input
                      type="date"
                      value={formData.data_aquisicao || ""}
                      onChange={(e) => {
                        const d = e.target.value;
                        const anos = d ? parseFloat(((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)) : undefined;
                        setFormData({ ...formData, data_aquisicao: d, uso_anos: anos });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Tempo de Uso</Label>
                    <Input
                      value={formData.data_aquisicao ? (() => {
                        const days = Math.ceil((Date.now() - new Date(formData.data_aquisicao).getTime()) / 86400000);
                        if (days < 30) return `${days} dia${days !== 1 ? 's' : ''}`;
                        if (days < 365) { const m = Math.floor(days / 30); return `${m} mês${m > 1 ? 'es' : ''}`; }
                        const y = Math.floor(days / 365); const m = Math.floor((days % 365) / 30);
                        return m > 0 ? `${y} ano${y > 1 ? 's' : ''} e ${m} mês${m > 1 ? 'es' : ''}` : `${y} ano${y > 1 ? 's' : ''}`;
                      })() : "—"}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label>Operadora</Label>
                    <Input placeholder="Ex: Vivo, Claro" value={formData.operadora || ""} onChange={(e) => setFormData({ ...formData, operadora: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Linha Celular</Label>
                    <Input placeholder="(11) 99999-9999" value={formData.linha_celular || ""} onChange={(e) => setFormData({ ...formData, linha_celular: e.target.value })} />
                  </div>
                  <div>
                    <Label>Qtd. de Chips / SIMs</Label>
                    <Input type="number" min="1" placeholder="Ex: 1 ou 2" value={formData.quantidade || ""} onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Marca</Label>
                    <Input placeholder="Ex: Samsung, Apple" value={formData.marca || ""} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} />
                  </div>
                  <div>
                    <Label>Modelo</Label>
                    <Input placeholder="Ex: Galaxy S23" value={formData.modelo || ""} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} />
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
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={formData.valor || ""} onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Cor</Label>
                    <Input placeholder="Ex: Preto, Branco" value={formData.cor || ""} onChange={(e) => setFormData({ ...formData, cor: e.target.value })} />
                  </div>
                  <div>
                    <Label>IMEI</Label>
                    <Input placeholder="IMEI do aparelho" value={formData.imei || ""} onChange={(e) => setFormData({ ...formData, imei: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div></div>
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

                <div>
                  <Label>Observações</Label>
                  <Textarea placeholder="Observações gerais" value={formData.observacoes || ""} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={2} />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormData({}); }} disabled={createMutation.isPending || updateMutation.isPending}>Cancelar</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={createMutation.isPending || updateMutation.isPending}>
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
                  <CardTitle>Smartphones</CardTitle>
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
                    placeholder={viewMode === "grouped" ? "Buscar usuário..." : "Buscar smartphone..."}
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
                      <TableHead>Smartphones</TableHead>
                      <TableHead>Valor Total</TableHead>
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
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">Nenhum smartphone encontrado</TableCell>
                      </TableRow>
                    ) : (
                      filteredUserGroups.map((group, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{group.usuario}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {group.smartphones.map((smartphone, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {smartphone.marca} {smartphone.modelo}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleTransferEquipment(smartphone, group.usuario)}
                                  >
                                    <UserMinus className="w-3 h-3 text-orange-600" />
                                  </Button>
                                </div>
                              ))}
                              {group.smartphones.length > 1 && (
                                <span className="text-xs text-green-600 font-medium">
                                  ({group.smartphones.length} smartphones)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-purple-600">
                              R$ {group.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
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
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Linha</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Condição</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">Carregando...</TableCell>
                      </TableRow>
                    ) : filteredEquipamentos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">Nenhum smartphone encontrado</TableCell>
                      </TableRow>
                    ) : (
                      filteredEquipamentos.map((equipamento) => (
                        <TableRow key={equipamento.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <p className="font-medium">{equipamento.marca}</p>
                              <p className="text-sm text-gray-500">{equipamento.modelo}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{equipamento.imei || "-"}</TableCell>
                          <TableCell>{equipamento.linha_celular || "-"}</TableCell>
                          <TableCell>{equipamento.usuario_atual || "-"}</TableCell>
                          <TableCell>
                            {equipamento.valor ? (
                              <span className="font-semibold">R$ {equipamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            ) : "-"}
                          </TableCell>
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
                  <strong>Smartphone:</strong> {equipmentToTransfer?.marca} {equipmentToTransfer?.modelo}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Usuário atual:</strong> {selectedUser}
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
                    {colaboradores.filter(c => c.status === "Ativo").length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                          COLABORADORES ATIVOS
                        </div>
                        {colaboradores
                          .filter(c => c.status === "Ativo")
                          .map((colab) => (
                            <SelectItem key={colab.id} value={colab.nome_completo}>
                              {colab.nome_completo} - {colab.area}
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
              <DialogTitle>Atribuir Smartphone Disponível</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Atribuir para:</strong> {selectedUser}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Selecione o smartphone disponível:</Label>
                <Select value={selectedAvailableEquipment} onValueChange={setSelectedAvailableEquipment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um smartphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEquipments.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhum smartphone disponível</SelectItem>
                    ) : (
                      availableEquipments.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.marca} {eq.modelo} - {eq.imei || "Sem IMEI"}
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