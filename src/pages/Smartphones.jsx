import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Smartphone, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

export default function Smartphones() {
  const [showForm, setShowForm] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({});

  const queryClient = useQueryClient();

  const { data: equipamentos = [], isLoading } = useQuery({
    queryKey: ['smartphones'],
    queryFn: () => base44.entities.Smartphones.list('-created_date'),
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

  const handleEdit = (equipamento) => {
    setEditingEquipamento(equipamento);
    setFormData(equipamento);
    setShowForm(true);
  };

  const filteredEquipamentos = equipamentos.filter(eq =>
    eq.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.usuario_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.linha_celular?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: equipamentos.length,
    disponiveis: equipamentos.filter(e => e.status === "Disponível").length,
    emUso: equipamentos.filter(e => e.status === "Em uso").length,
    valorTotal: equipamentos.reduce((sum, e) => sum + (e.valor || 0), 0),
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
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">R$ {stats.valorTotal.toLocaleString('pt-BR')}</p>
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
                    <Input type="date" value={formData.data_aquisicao || ""} onChange={(e) => setFormData({ ...formData, data_aquisicao: e.target.value })} />
                  </div>
                  <div>
                    <Label>Uso em Anos</Label>
                    <Input type="number" step="0.1" placeholder="Ex: 2.5" value={formData.uso_anos || ""} onChange={(e) => setFormData({ ...formData, uso_anos: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Quantidade</Label>
                    <Input type="number" placeholder="1" value={formData.quantidade || ""} onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Marca</Label>
                    <Input placeholder="Ex: Samsung, Apple" value={formData.marca || ""} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} />
                  </div>
                  <div>
                    <Label>Modelo</Label>
                    <Input placeholder="Ex: Galaxy S23, iPhone 14" value={formData.modelo || ""} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Operadora</Label>
                    <Input placeholder="Ex: Vivo, Tim, Claro" value={formData.operadora || ""} onChange={(e) => setFormData({ ...formData, operadora: e.target.value })} />
                  </div>
                  <div>
                    <Label>Linha Celular</Label>
                    <Input placeholder="(00) 00000-0000" value={formData.linha_celular || ""} onChange={(e) => setFormData({ ...formData, linha_celular: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cor</Label>
                    <Input placeholder="Ex: Preto, Branco" value={formData.cor || ""} onChange={(e) => setFormData({ ...formData, cor: e.target.value })} />
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
                    <Label>Valor</Label>
                    <Input type="number" step="0.01" placeholder="R$ 0,00" value={formData.valor || ""} onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>IMEI</Label>
                    <Input placeholder="Código IMEI" value={formData.imei || ""} onChange={(e) => setFormData({ ...formData, imei: e.target.value })} />
                  </div>
                  <div>
                    <Label>Usuário Atual</Label>
                    <Input placeholder="Nome do usuário" value={formData.usuario_atual || ""} onChange={(e) => setFormData({ ...formData, usuario_atual: e.target.value })} />
                  </div>
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

                <div>
                  <Label>Observações</Label>
                  <Textarea placeholder="Observações gerais" value={formData.observacoes || ""} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={2} />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormData({}); }}>Cancelar</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">{editingEquipamento ? "Atualizar" : "Criar"}</Button>
              </CardFooter>
            </form>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Lista de Smartphones ({filteredEquipamentos.length})</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Buscar smartphone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead>Linha</TableHead>
                    <TableHead>Operadora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Valor</TableHead>
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
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">Nenhum smartphone encontrado</TableCell>
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
                        <TableCell>{equipamento.linha_celular || "-"}</TableCell>
                        <TableCell>{equipamento.operadora || "-"}</TableCell>
                        <TableCell>{equipamento.usuario_atual || "-"}</TableCell>
                        <TableCell>R$ {equipamento.valor?.toLocaleString('pt-BR') || "0"}</TableCell>
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
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(equipamento)}>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}