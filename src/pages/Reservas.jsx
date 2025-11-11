import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, ExternalLink, Settings, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Reservas() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const queryClient = useQueryClient();

  const { data: reservas = [], isLoading: loadingReservas } = useQuery({
    queryKey: ['reservas'],
    queryFn: () => base44.entities.Reservas.list('-created_date'),
  });

  const { data: notebooks = [], isLoading: loadingNotebooks } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list('-created_date'),
  });

  const updateNotebookMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Notebooks_Externos.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
    },
  });

  const updateReservaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Reservas.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
    },
  });

  // Atualizar status das reservas automaticamente baseado na data/hora
  useEffect(() => {
    const updateReservasStatus = () => {
      const agora = new Date();
      
      reservas.forEach(reserva => {
        const inicioReserva = new Date(`${reserva.data_inicio}T${reserva.hora_inicio}`);
        const fimReserva = new Date(`${reserva.data_fim}T${reserva.hora_fim}`);
        
        let novoStatus = reserva.status;
        
        if (reserva.status === "Confirmada" && inicioReserva <= agora && fimReserva > agora) {
          novoStatus = "Em Andamento";
        } else if ((reserva.status === "Em Andamento" || reserva.status === "Confirmada") && fimReserva <= agora) {
          novoStatus = "Concluída";
        }
        
        if (novoStatus !== reserva.status) {
          updateReservaMutation.mutate({
            id: reserva.id,
            data: { ...reserva, status: novoStatus }
          });
        }
      });
    };

    updateReservasStatus();
    const interval = setInterval(updateReservasStatus, 60000); // Verifica a cada 1 minuto
    
    return () => clearInterval(interval);
  }, [reservas]);

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

  // Calendario
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getReservasForDate = (date) => {
    return reservas.filter(reserva => {
      if (reserva.status === "Cancelada") return false;
      
      const dataInicio = parseISO(reserva.data_inicio);
      const dataFim = parseISO(reserva.data_fim);
      
      return date >= dataInicio && date <= dataFim;
    });
  };

  const stats = {
    total: reservas.length,
    confirmadas: reservas.filter(r => r.status === "Confirmada").length,
    emAndamento: reservas.filter(r => r.status === "Em Andamento").length,
    concluidas: reservas.filter(r => r.status === "Concluída").length,
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
                <p className="text-sm text-gray-600">Concluídas</p>
                <p className="text-3xl font-bold text-gray-600 mt-1">{stats.concluidas}</p>
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

        {/* Calendário */}
        <Card className="mb-6">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Calendário de Reservas</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-lg font-semibold min-w-[200px] text-center">
                  {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center font-semibold text-sm text-gray-600 p-2">
                  {day}
                </div>
              ))}
              
              {/* Dias vazios antes do início do mês */}
              {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
                <div key={`empty-${idx}`} className="p-2" />
              ))}
              
              {/* Dias do mês */}
              {daysInMonth.map(day => {
                const reservasNoDia = getReservasForDate(day);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      relative p-2 border rounded-lg cursor-pointer transition-all
                      ${isToday ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200'}
                      ${reservasNoDia.length > 0 ? 'hover:bg-purple-100' : 'hover:bg-gray-50'}
                    `}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="text-center">
                      <span className={`text-sm ${isToday ? 'font-bold text-purple-600' : 'text-gray-700'}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    {reservasNoDia.length > 0 && (
                      <div className="mt-1 flex flex-col gap-1">
                        {reservasNoDia.slice(0, 2).map((reserva, idx) => (
                          <div
                            key={idx}
                            className={`text-xs px-1 py-0.5 rounded truncate ${
                              reserva.status === "Confirmada" ? "bg-green-100 text-green-800" :
                              reserva.status === "Em Andamento" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {reserva.solicitante_nome.split(' ')[0]}
                          </div>
                        ))}
                        {reservasNoDia.length > 2 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{reservasNoDia.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Reservas */}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingReservas ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredReservas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
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
                            reserva.status === "Confirmada" ? "bg-green-100 text-green-800" :
                            reserva.status === "Em Andamento" ? "bg-blue-100 text-blue-800" :
                            reserva.status === "Cancelada" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }>
                            {reserva.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Detalhes do Dia */}
        {selectedDate && (
          <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Reservas de {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getReservasForDate(selectedDate).length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhuma reserva neste dia</p>
                ) : (
                  getReservasForDate(selectedDate).map(reserva => (
                    <Card key={reserva.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{reserva.solicitante_nome}</p>
                            <p className="text-sm text-gray-600">{reserva.equipamento_nome}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {reserva.hora_inicio} - {reserva.hora_fim}
                            </p>
                          </div>
                          <Badge className={
                            reserva.status === "Confirmada" ? "bg-green-100 text-green-800" :
                            reserva.status === "Em Andamento" ? "bg-blue-100 text-blue-800" :
                            "bg-gray-100 text-gray-800"
                          }>
                            {reserva.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

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