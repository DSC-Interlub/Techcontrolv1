import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, ExternalLink, CheckCircle, XCircle, Clock, Settings, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export default function Reservas() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("reservas");
  const queryClient = useQueryClient();

  const { data: reservas = [], isLoading: loadingReservas } = useQuery({
    queryKey: ['reservas'],
    queryFn: () => base44.entities.Reservas.list('-created_date'),
  });

  const { data: notebooks = [], isLoading: loadingNotebooks } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list('-created_date'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Reservas.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
    },
  });

  const updateNotebookMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Notebooks_Externos.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
    },
  });

  const handleStatusChange = (reserva, newStatus) => {
    updateStatusMutation.mutate({ id: reserva.id, status: newStatus });
  };

  const handleToggleReserva = (notebook) => {
    updateNotebookMutation.mutate({
      id: notebook.id,
      data: {
        disponivel_para_reserva: !notebook.disponivel_para_reserva
      }
    });
  };

  const filteredReservas = filterStatus === "all" 
    ? reservas 
    : reservas.filter(r => r.status === filterStatus);

  const filteredNotebooks = notebooks.filter(nb =>
    nb.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nb.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nb.etiqueta_interna?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const notebooksDisponiveis = notebooks.filter(n => n.disponivel_para_reserva);

  const stats = {
    total: reservas.length,
    pendentes: reservas.filter(r => r.status === "Pendente").length,
    confirmadas: reservas.filter(r => r.status === "Confirmada").length,
    emAndamento: reservas.filter(r => r.status === "Em Andamento").length,
    notebooksReserva: notebooksDisponiveis.length,
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reservas de Notebooks</h1>
              <p className="text-gray-500 mt-1">Gerenciar solicitações de reserva</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowConfigModal(true)}
              variant="outline"
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Configurar Notebooks
            </Button>
            <a href="/reserva-publica" target="_blank" rel="noopener noreferrer">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                Link Público
              </Button>
            </a>
          </div>
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
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pendentes}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Confirmadas</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.confirmadas}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Em Andamento</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.emAndamento}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Notebooks p/ Reserva</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.notebooksReserva}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Lista de Reservas ({filteredReservas.length})</CardTitle>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Confirmada">Confirmada</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingReservas ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredReservas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhuma reserva encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReservas.map((reserva) => (
                      <TableRow key={reserva.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{reserva.solicitante_nome}</p>
                            <p className="text-sm text-gray-500">{reserva.solicitante_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{reserva.equipamento_nome}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(reserva.data_inicio), "dd/MM/yyyy")} - {reserva.hora_inicio}</p>
                            <p className="text-gray-500">até {format(new Date(reserva.data_fim), "dd/MM/yyyy")} - {reserva.hora_fim}</p>
                          </div>
                        </TableCell>
                        <TableCell>{reserva.solicitante_area}</TableCell>
                        <TableCell>
                          <Badge className={
                            reserva.status === "Pendente" ? "bg-yellow-100 text-yellow-800" :
                            reserva.status === "Confirmada" ? "bg-green-100 text-green-800" :
                            reserva.status === "Em Andamento" ? "bg-blue-100 text-blue-800" :
                            reserva.status === "Cancelada" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }>
                            {reserva.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {reserva.status === "Pendente" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStatusChange(reserva, "Confirmada")}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Confirmar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStatusChange(reserva, "Cancelada")}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Cancelar
                                </Button>
                              </>
                            )}
                            {reserva.status === "Confirmada" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStatusChange(reserva, "Em Andamento")}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Clock className="w-4 h-4 mr-1" />
                                Iniciar
                              </Button>
                            )}
                            {reserva.status === "Em Andamento" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStatusChange(reserva, "Concluída")}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Concluir
                              </Button>
                            )}
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

        {/* Modal de Configuração */}
        <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurar Notebooks para Reserva</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Instruções:</strong> Ative os notebooks que deseja disponibilizar para reserva pública. 
                  Os notebooks marcados aparecerão no formulário de reserva externa.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar notebook..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Etiqueta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Disponível p/ Reserva</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingNotebooks ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredNotebooks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          Nenhum notebook encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNotebooks.map((notebook) => (
                        <TableRow key={notebook.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{notebook.marca}</p>
                              <p className="text-sm text-gray-500">{notebook.modelo}</p>
                            </div>
                          </TableCell>
                          <TableCell>{notebook.etiqueta_interna || "-"}</TableCell>
                          <TableCell>
                            <Badge className={
                              notebook.status === "Disponível" ? "bg-green-100 text-green-800" :
                              notebook.status === "Reservado" ? "bg-purple-100 text-purple-800" :
                              notebook.status === "Em uso" ? "bg-blue-100 text-blue-800" :
                              "bg-orange-100 text-orange-800"
                            }>
                              {notebook.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Switch
                                checked={notebook.disponivel_para_reserva || false}
                                onCheckedChange={() => handleToggleReserva(notebook)}
                              />
                              <span className="text-sm text-gray-600">
                                {notebook.disponivel_para_reserva ? "Sim" : "Não"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>{stats.notebooksReserva} notebooks</strong> estão atualmente disponíveis para reserva.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowConfigModal(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}