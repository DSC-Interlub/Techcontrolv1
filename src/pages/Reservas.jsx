import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, ExternalLink, Settings, Search, ChevronLeft, ChevronRight, Copy, Check, Eye, User, Mail, Briefcase, Clock, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPageUrl } from "@/utils";

export default function Reservas() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [copied, setCopied] = useState(false);
  const [historicoSearch, setHistoricoSearch] = useState("");
  const [historicoStatusFilter, setHistoricoStatusFilter] = useState("todos");
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const queryClient = useQueryClient();

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}${createPageUrl("reserva-publica")}` : '';

  const { data: reservas = [], isLoading: loadingReservas } = useQuery({
    queryKey: ['reservas'],
    queryFn: () => base44.entities.Reservas.list('-created_date'),
  });

  const { data: notebooksExternos = [], isLoading: loadingNotebooksExternos } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list('-created_date'),
  });

  const { data: pcsInternos = [], isLoading: loadingPcsInternos } = useQuery({
    queryKey: ['pcs_internos'],
    queryFn: () => base44.entities.PCs_Internos.list('-created_date'),
  });

  // Combinar notebooks de ambas as entidades
  const notebooks = [
    ...notebooksExternos.map(n => ({ ...n, origem: 'Notebooks_Externos' })),
    ...pcsInternos.filter(pc => pc.tipo === 'Notebook').map(n => ({ ...n, origem: 'PCs_Internos' }))
  ];

  const loadingNotebooks = loadingNotebooksExternos || loadingPcsInternos;

  const updateNotebookMutation = useMutation({
    mutationFn: ({ id, data, origem }) => {
      if (origem === 'Notebooks_Externos') {
        return base44.entities.Notebooks_Externos.update(id, data);
      } else {
        return base44.entities.PCs_Internos.update(id, data);
      }
    },
    onSuccess: (data, variables) => {
      if (variables.origem === 'Notebooks_Externos') {
        queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      }
    },
  });

  const updateReservaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Reservas.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
    },
  });

  const handleCancelarReserva = (reserva) => {
    if (!window.confirm(`Deseja cancelar a reserva de ${reserva.solicitante_nome} para ${reserva.equipamento_nome}?`)) return;
    updateReservaMutation.mutate({ id: reserva.id, data: { ...reserva, status: "Cancelada" } });
    setShowDetailsModal(false);
  };

  // Atualizar status das reservas automaticamente baseado na data/hora (otimizado)
  useEffect(() => {
    if (!reservas || reservas.length === 0) return;
    
    const updateReservasStatus = () => {
      const agora = new Date();
      
      // Coletar todas as atualizações necessárias antes de executar
      const updates = [];
      
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
          updates.push({ id: reserva.id, status: novoStatus, reserva });
        }
      });

      // Executar atualizações apenas se houver mudanças
      if (updates.length > 0) {
        updates.forEach(({ id, reserva, status }) => {
          updateReservaMutation.mutate({
            id,
            data: { ...reserva, status }
          });
        });
      }
    };

    // Executar apenas uma vez ao carregar, não em loop contínuo
    updateReservasStatus();
  }, [reservas.length]); // Dependência otimizada

  const handleToggleReserva = (notebook) => {
    updateNotebookMutation.mutate({
      id: notebook.id,
      origem: notebook.origem,
      data: {
        disponivel_para_reserva: !notebook.disponivel_para_reserva
      }
    });
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

  const parseDateLocal = (dateStr) => {
    // Parseia a data como local (sem conversão UTC) para evitar problema de fuso horário
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getReservasForDate = (date) => {
    return reservas.filter(reserva => {
      if (reserva.status === "Cancelada") return false;
      
      const dataInicio = parseDateLocal(reserva.data_inicio);
      const dataFim = parseDateLocal(reserva.data_fim);
      
      return date >= dataInicio && date <= dataFim;
    });
  };

  const stats = {
    total: reservas.length,
    confirmadas: reservas.filter(r => r.status === "Confirmada").length,
    emAndamento: reservas.filter(r => r.status === "Em Andamento").length,
    concluidas: reservas.filter(r => r.status === "Concluída").length,
    canceladas: reservas.filter(r => r.status === "Cancelada").length,
    notebooksReserva: notebooksDisponiveis.length,
  };

  const filteredHistorico = reservas.filter(reserva => {
    const matchesSearch = 
      reserva.equipamento_nome?.toLowerCase().includes(historicoSearch.toLowerCase()) ||
      reserva.solicitante_nome?.toLowerCase().includes(historicoSearch.toLowerCase()) ||
      reserva.solicitante_area?.toLowerCase().includes(historicoSearch.toLowerCase());
    
    const matchesStatus = historicoStatusFilter === "todos" || reserva.status === historicoStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    "Pendente": "bg-yellow-100 text-yellow-800",
    "Confirmada": "bg-blue-100 text-blue-800",
    "Em Andamento": "bg-green-100 text-green-800",
    "Concluída": "bg-gray-100 text-gray-800",
    "Cancelada": "bg-red-100 text-red-800"
  };

  const handleViewDetails = (reserva) => {
    setSelectedReserva(reserva);
    setShowDetailsModal(true);
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
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setShowConfigModal(true)}
              variant="outline"
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Configurar Notebooks
            </Button>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600 font-mono truncate max-w-xs">{publicUrl}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyLink}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">Link público para reservar notebooks</p>
          </div>
        </div>

        <Tabs defaultValue="ativas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="ativas">Reservas Ativas</TabsTrigger>
            <TabsTrigger value="historico">Histórico Completo</TabsTrigger>
          </TabsList>

          <TabsContent value="ativas" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                        <TableHead>Etiqueta</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
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
                        filteredReservas.map((reserva) => {
                          const notebook = notebooks.find(n => n.id === reserva.equipamento_id);
                          const etiqueta = notebook?.etiqueta_interna || "-";
                          return (
                          <TableRow key={reserva.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{reserva.solicitante_nome}</p>
                                <p className="text-sm text-gray-500">{reserva.solicitante_email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{reserva.equipamento_nome}</TableCell>
                            <TableCell>
                              <span className="font-mono text-sm font-semibold text-purple-700">{etiqueta}</span>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{format(parseDateLocal(reserva.data_inicio), "dd/MM/yyyy")} - {reserva.hora_inicio}</p>
                                <p className="text-gray-500">até {format(parseDateLocal(reserva.data_fim), "dd/MM/yyyy")} - {reserva.hora_fim}</p>
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
                            <TableCell>
                              {reserva.status !== "Cancelada" && reserva.status !== "Concluída" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancelarReserva(reserva)}
                                >
                                  Cancelar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="space-y-6">
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
                    <p className="text-2xl font-bold text-yellow-600">{reservas.filter(r => r.status === "Pendente").length}</p>
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
                      value={historicoSearch}
                      onChange={(e) => setHistoricoSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={historicoStatusFilter} onValueChange={setHistoricoStatusFilter}>
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
                {loadingReservas ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Carregando reservas...</p>
                  </div>
                ) : filteredHistorico.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nenhuma reserva encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredHistorico.map((reserva) => (
                      <Card key={reserva.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
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
          </TabsContent>
        </Tabs>

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

        {/* Modal de Detalhes */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Reserva</DialogTitle>
            </DialogHeader>
            
            {selectedReserva && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
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

                {selectedReserva.status !== "Cancelada" && selectedReserva.status !== "Concluída" && (
                  <div className="pt-2 border-t flex justify-end">
                    <Button
                      variant="destructive"
                      onClick={() => handleCancelarReserva(selectedReserva)}
                    >
                      Cancelar Reserva
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

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
                              {notebook.origem === 'PCs_Internos' && (
                                <Badge variant="outline" className="text-xs mt-1">PC Interno</Badge>
                              )}
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