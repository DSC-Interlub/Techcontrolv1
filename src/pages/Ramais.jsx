import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Plus, Pencil, Trash2, Search, UserPlus, UserMinus, ArrowRightLeft, X, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/AuthContext";

export default function Ramais() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingRamal, setEditingRamal] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({});
  const [showAtribuirModal, setShowAtribuirModal] = useState(false);
  const [showTrocarModal, setShowTrocarModal] = useState(false);
  const [selectedRamal, setSelectedRamal] = useState(null);
  const [novoUsuario, setNovoUsuario] = useState("");
  const [novaArea, setNovaArea] = useState("");
  const [ramalDestino, setRamalDestino] = useState("");

  const queryClient = useQueryClient();

  const { data: ramais = [], isLoading } = useQuery({
    queryKey: ['ramais'],
    queryFn: () => base44.entities.Ramais.list(),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Ramais.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramais'] });
      setShowForm(false);
      setFormData({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ramais.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramais'] });
      setShowForm(false);
      setShowAtribuirModal(false);
      setShowTrocarModal(false);
      setEditingRamal(null);
      setSelectedRamal(null);
      setFormData({});
      setNovoUsuario("");
      setNovaArea("");
      setRamalDestino("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Ramais.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramais'] });
    },
  });

  const handleExportarExcel = () => {
    // Criar cabeçalho
    const header = "USUÁRIO\tRAMAL\tÁREA\tSTATUS\tDATA_ATRIBUIÇÃO\tOBSERVAÇÕES\n";
    
    // Criar linhas
    const rows = ramais.map(ramal => {
      return [
        ramal.usuario_atual || "",
        ramal.ramal || "",
        ramal.area || "",
        ramal.status || "",
        ramal.data_atribuicao || "",
        ramal.observacoes || ""
      ].join("\t");
    }).join("\n");

    // Combinar tudo
    const csvContent = header + rows;

    // Criar arquivo e baixar
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ramais_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRamal) {
      updateMutation.mutate({ id: editingRamal.id, data: formData });
    } else {
      const novoRamal = {
        ...formData,
        status: formData.usuario_atual ? "Em uso" : "Disponível",
        data_atribuicao: formData.usuario_atual ? new Date().toISOString().split('T')[0] : null,
      };
      createMutation.mutate(novoRamal);
    }
  };

  const handleAtribuir = (ramal) => {
    setSelectedRamal(ramal);
    setNovoUsuario("");
    setNovaArea("");
    setShowAtribuirModal(true);
  };

  const handleRemover = (ramal) => {
    if (confirm(`Remover ${ramal.usuario_atual} do ramal ${ramal.ramal}?`)) {
      const usuariosAnteriores = ramal.usuarios_anteriores || [];
      usuariosAnteriores.push({
        nome: ramal.usuario_atual,
        area: ramal.area,
        data_inicio: ramal.data_atribuicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });

      updateMutation.mutate({
        id: ramal.id,
        data: {
          usuario_atual: "",
          area: "",
          status: "Disponível",
          data_atribuicao: null,
          usuarios_anteriores: usuariosAnteriores
        }
      });
    }
  };

  const handleTrocar = (ramal) => {
    setSelectedRamal(ramal);
    setRamalDestino("");
    setShowTrocarModal(true);
  };

  const executeAtribuir = () => {
    if (!novoUsuario || !novaArea) return;

    const usuariosAnteriores = selectedRamal.usuarios_anteriores || [];
    
    if (selectedRamal.usuario_atual) {
      usuariosAnteriores.push({
        nome: selectedRamal.usuario_atual,
        area: selectedRamal.area,
        data_inicio: selectedRamal.data_atribuicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });
    }

    updateMutation.mutate({
      id: selectedRamal.id,
      data: {
        usuario_atual: novoUsuario,
        area: novaArea,
        status: "Em uso",
        data_atribuicao: new Date().toISOString().split('T')[0],
        usuarios_anteriores: usuariosAnteriores
      }
    });
  };

  const executeTrocar = async () => {
    if (!ramalDestino) return;

    const ramal1 = selectedRamal;
    const ramal2 = ramais.find(r => r.id === ramalDestino);

    if (!ramal2) return;

    const estadoOriginal1 = {
      usuario_atual: ramal1.usuario_atual,
      area: ramal1.area,
      status: ramal1.status,
      data_atribuicao: ramal1.data_atribuicao
    };

    const historico1 = [...(ramal1.usuarios_anteriores || [])];
    if (ramal1.usuario_atual) {
      historico1.push({
        nome: ramal1.usuario_atual,
        area: ramal1.area,
        data_inicio: ramal1.data_atribuicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });
    }

    const historico2 = [...(ramal2.usuarios_anteriores || [])];
    if (ramal2.usuario_atual) {
      historico2.push({
        nome: ramal2.usuario_atual,
        area: ramal2.area,
        data_inicio: ramal2.data_atribuicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });
    }

    const dataAtual = new Date().toISOString().split('T')[0];

    try {
      // Atualiza ramal 1
      await base44.entities.Ramais.update(ramal1.id, {
        usuario_atual: ramal2.usuario_atual || "",
        area: ramal2.area || "",
        status: ramal2.usuario_atual ? "Em uso" : "Disponível",
        data_atribuicao: ramal2.usuario_atual ? dataAtual : null,
        usuarios_anteriores: historico1
      });

      try {
        // Atualiza ramal 2 com usuário original do ramal 1
        await base44.entities.Ramais.update(ramal2.id, {
          usuario_atual: ramal1.usuario_atual || "",
          area: ramal1.area || "",
          status: ramal1.usuario_atual ? "Em uso" : "Disponível",
          data_atribuicao: ramal1.usuario_atual ? dataAtual : null,
          usuarios_anteriores: historico2
        });
      } catch (err2) {
        // Rollback do ramal 1 em caso de erro no ramal 2
        await base44.entities.Ramais.update(ramal1.id, estadoOriginal1);
        throw err2;
      }

      queryClient.invalidateQueries({ queryKey: ['ramais'] });
      setShowTrocarModal(false);
      setSelectedRamal(null);
      setRamalDestino("");
    } catch (err) {
      console.error("Erro na troca de ramais:", err);
      alert(`Falha ao trocar ramais: ${err.message || "Erro desconhecido"}`);
    }
  };

  const filteredRamais = ramais.filter(r =>
    r.ramal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.usuario_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.area?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: ramais.length,
    emUso: ramais.filter(r => r.status === "Em uso").length,
    disponiveis: ramais.filter(r => r.status === "Disponível").length,
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Controle de Ramais</h1>
              <p className="text-gray-500 mt-1">Gerenciar ramais telefônicos da empresa</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExportarExcel}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </Button>
            <Button
              onClick={() => {
                setEditingRamal(null);
                setFormData({});
                setShowForm(true);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Ramal
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total de Ramais</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
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
                <p className="text-sm text-gray-600">Disponíveis</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.disponiveis}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>{editingRamal ? "Editar Ramal" : "Novo Ramal"}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setFormData({}); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Número do Ramal *</Label>
                    <Input
                      required
                      placeholder="Ex: 1009"
                      value={formData.ramal || ""}
                      onChange={(e) => setFormData({ ...formData, ramal: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={formData.status || "Disponível"}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Disponível">Disponível</SelectItem>
                        <SelectItem value="Em uso">Em uso</SelectItem>
                      </SelectContent>
                    </Select>
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
                          area: colaborador ? colaborador.area : formData.area
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
                    <Label>Área/Departamento</Label>
                    <Input
                      placeholder="Ex: Financeiro, TI"
                      value={formData.area || ""}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Observações sobre o ramal..."
                    value={formData.observacoes || ""}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={2}
                  />
                </div>
              </CardContent>
              <div className="border-t p-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormData({}); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  {editingRamal ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Lista de Ramais ({filteredRamais.length})</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar ramal, usuário ou área..."
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
                    <TableHead>Ramal</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Atribuição</TableHead>
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
                  ) : filteredRamais.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum ramal encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRamais.map((ramal) => (
                      <TableRow key={ramal.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono font-medium text-lg">{ramal.ramal}</TableCell>
                        <TableCell>
                          {ramal.usuario_atual || <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell>
                          {ramal.area || <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            ramal.status === "Em uso"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }>
                            {ramal.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ramal.data_atribuicao || <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {ramal.status === "Disponível" || !ramal.usuario_atual ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAtribuir(ramal)}
                                className="gap-1"
                              >
                                <UserPlus className="w-3 h-3" />
                                Atribuir
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTrocar(ramal)}
                                  className="gap-1"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  Trocar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRemover(ramal)}
                                  className="gap-1 text-orange-600 border-orange-600"
                                >
                                  <UserMinus className="w-3 h-3" />
                                  Remover
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingRamal(ramal);
                                setFormData(ramal);
                                setShowForm(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir o ramal ${ramal.ramal}?`)) {
                                  deleteMutation.mutate(ramal.id);
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

        {/* Modal Atribuir */}
        <Dialog open={showAtribuirModal} onOpenChange={setShowAtribuirModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir Ramal {selectedRamal?.ramal}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800 text-sm">
                  Informe o nome do usuário e a área para atribuir este ramal.
                </AlertDescription>
              </Alert>

              <div>
                <Label>Nome do Usuário *</Label>
                <Combobox
                  value={novoUsuario}
                  onValueChange={(value) => {
                    setNovoUsuario(value);
                    const colaborador = colaboradores.find(c => c.nome_completo === value);
                    if (colaborador) {
                      setNovaArea(colaborador.area);
                    }
                  }}
                  options={colaboradores
                    .filter(c => c.status === "Ativo")
                    .map(c => ({
                      value: c.nome_completo,
                      label: `${c.nome_completo} - ${c.area}`
                    }))}
                  placeholder="Selecione o colaborador"
                  searchPlaceholder="Buscar colaborador..."
                  emptyText="Nenhum colaborador encontrado"
                />
              </div>

              <div>
                <Label>Área/Departamento *</Label>
                <Input
                  required
                  placeholder="Ex: Financeiro, TI, Vendas"
                  value={novaArea}
                  onChange={(e) => setNovaArea(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAtribuirModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={executeAtribuir}
                disabled={!novoUsuario || !novaArea}
                className="bg-green-600 hover:bg-green-700"
              >
                Atribuir Ramal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Trocar */}
        <Dialog open={showTrocarModal} onOpenChange={setShowTrocarModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Trocar Usuários de Ramal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-800 text-sm">
                  <strong>Atenção:</strong> Esta ação irá trocar os usuários entre os dois ramais selecionados.
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-semibold mb-2">Ramal Atual:</p>
                <p className="text-blue-800">
                  <strong>Ramal {selectedRamal?.ramal}:</strong> {selectedRamal?.usuario_atual}
                  {selectedRamal?.area && ` (${selectedRamal.area})`}
                </p>
              </div>

              <div>
                <Label>Trocar com o Ramal:</Label>
                <Select value={ramalDestino} onValueChange={setRamalDestino}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ramal" />
                  </SelectTrigger>
                  <SelectContent>
                    {ramais
                      .filter(r => r.id !== selectedRamal?.id)
                      .map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          Ramal {r.ramal} - {r.usuario_atual || "Disponível"}
                          {r.area && ` (${r.area})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTrocarModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={executeTrocar}
                disabled={!ramalDestino}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Confirmar Troca
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}