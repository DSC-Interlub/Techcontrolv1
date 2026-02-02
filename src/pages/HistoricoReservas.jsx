import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Eye, Laptop, User, Mail, Briefcase, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function HistoricoReservas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['historico_reservas'],
    queryFn: async () => {
      const data = await base44.entities.Reservas.list('-created_date');
      return data;
    },
  });

  const statusColors = {
    "Pendente": "bg-yellow-100 text-yellow-800",
    "Confirmada": "bg-blue-100 text-blue-800",
    "Em Andamento": "bg-green-100 text-green-800",
    "Concluída": "bg-gray-100 text-gray-800",
    "Cancelada": "bg-red-100 text-red-800"
  };

  const filteredReservas = reservas.filter(reserva => {
    const matchesSearch = 
      reserva.equipamento_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reserva.solicitante_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reserva.solicitante_area?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "todos" || reserva.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: reservas.length,
    pendentes: reservas.filter(r => r.status === "Pendente").length,
    confirmadas: reservas.filter(r => r.status === "Confirmada").length,
    emAndamento: reservas.filter(r => r.status === "Em Andamento").length,
    concluidas: reservas.filter(r => r.status === "Concluída").length,
    canceladas: reservas.filter(r => r.status === "Cancelada").length
  };

  const handleViewDetails = (reserva) => {
    setSelectedReserva(reserva);
    setShowDetails(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Histórico de Reservas</h1>
            <p className="text-gray-600 mt-1">Visualize e pesquise todas as reservas de notebooks</p>
          </div>
          <Calendar className="w-12 h-12 text-blue-600" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
                <p className="text-sm text-gray-600">Pendentes</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.confirmadas}</p>
                <p className="text-sm text-gray-600">Confirmadas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.emAndamento}</p>
                <p className="text-sm text-gray-600">Em Andamento</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{stats.concluidas}</p>
                <p className="text-sm text-gray-600">Concluídas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.canceladas}</p>
                <p className="text-sm text-gray-600">Canceladas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Pesquisar por nome, equipamento ou área..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Confirmada">Confirmada</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Carregando reservas...</p>
              </div>
            ) : filteredReservas.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Nenhuma reserva encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReservas.map((reserva) => (
                  <Card key={reserva.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Laptop className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold text-gray-900">{reserva.equipamento_nome}</span>
                            <Badge className={statusColors[reserva.status]}>
                              {reserva.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="w-4 h-4" />
                              {reserva.solicitante_nome}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Briefcase className="w-4 h-4" />
                              {reserva.solicitante_area}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="w-4 h-4" />
                              {format(new Date(reserva.data_inicio), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(reserva.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(reserva)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Reserva</DialogTitle>
          </DialogHeader>
          
          {selectedReserva && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Laptop className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedReserva.equipamento_nome}</h3>
                    <p className="text-sm text-gray-600">Tipo: {selectedReserva.equipamento_tipo}</p>
                  </div>
                </div>
                <Badge className={statusColors[selectedReserva.status]}>
                  {selectedReserva.status}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Solicitante</p>
                    <div className="flex items-center gap-2 text-gray-900">
                      <User className="w-4 h-4 text-gray-400" />
                      {selectedReserva.solicitante_nome}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Email</p>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {selectedReserva.solicitante_email}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Área</p>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      {selectedReserva.solicitante_area}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Data e Hora de Início</p>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {format(new Date(selectedReserva.data_inicio), "dd/MM/yyyy", { locale: ptBR })} às {selectedReserva.hora_inicio}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Data e Hora de Término</p>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {format(new Date(selectedReserva.data_fim), "dd/MM/yyyy", { locale: ptBR })} às {selectedReserva.hora_fim}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Criado em</p>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {format(new Date(selectedReserva.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </div>

              {selectedReserva.motivo && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Motivo da Reserva</p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex gap-2">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-900 text-sm">{selectedReserva.motivo}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedReserva.observacoes && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Observações</p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-900 text-sm">{selectedReserva.observacoes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}