import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import {
  Users, CalendarDays, ChevronLeft, ChevronRight, ExternalLink,
  CheckCircle, AlertCircle, Loader2, Copy, Check, Eye, Search,
  User, Mail, Briefcase, Clock, FileText, Trash2, X
} from "lucide-react";
import { createPageUrl } from "@/utils";
import {
  format, addDays, startOfWeek, isSameDay, isToday,
  startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths
} from "date-fns";
import { ptBR } from "date-fns/locale";

const HORARIOS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];

const statusColors = {
  "Confirmada": "bg-blue-100 text-blue-800",
  "Concluída": "bg-gray-100 text-gray-800",
  "Cancelada": "bg-red-100 text-red-800",
};

export default function SalaTreinamento() {
  const queryClient = useQueryClient();

  // --- Calendário semanal (agenda) ---
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    solicitante_nome: "", solicitante_email: "", solicitante_area: "",
    hora_fim: "", motivo: "", num_participantes: "", observacoes: "",
  });
  const [success, setSuccess] = useState(false);
  const [conflictError, setConflictError] = useState(false);
  const [reservaDetalhes, setReservaDetalhes] = useState(null);

  // --- Calendário mensal (aba ativas) ---
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // --- Histórico ---
  const [historicoSearch, setHistoricoSearch] = useState("");
  const [historicoStatusFilter, setHistoricoStatusFilter] = useState("todos");

  // --- Link público ---
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}${createPageUrl("reserva-sala-publica")}` : '';
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hoje = new Date();
  const inicioSemana = addDays(startOfWeek(hoje, { weekStartsOn: 1 }), semanaOffset * 7);
  const diasSemana = Array.from({ length: 5 }, (_, i) => addDays(inicioSemana, i));

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores_sala'],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  const { data: reservas = [], isLoading: loadingReservas } = useQuery({
    queryKey: ['reservas_sala'],
    queryFn: () => base44.entities.ReservasSala.list('-created_date'),
  });

  const reservasAtivas = reservas.filter(r => r.status !== "Cancelada");

  // --- Auto-concluir reservas passadas ---
  useEffect(() => {
    if (!reservas.length) return;
    const agora = new Date();
    reservas.forEach(r => {
      if (r.status === "Confirmada") {
        const fim = new Date(`${r.data}T${r.hora_fim}`);
        if (fim <= agora) {
          base44.entities.ReservasSala.update(r.id, { status: "Concluída" }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['reservas_sala'] });
          });
        }
      }
    });
  }, [reservas.length]);

  // --- Mutations ---
  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.ReservasSala.update(id, { status: "Cancelada" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas_sala'] });
      setReservaDetalhes(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReservasSala.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas_sala'] });
      setSuccess(true);
      setShowForm(false);
      setSelectedSlot(null);
      setFormData({ solicitante_nome: "", solicitante_email: "", solicitante_area: "", hora_fim: "", motivo: "", num_participantes: "", observacoes: "" });
      setTimeout(() => setSuccess(false), 5000);
    },
    onError: () => setConflictError(true),
  });

  // --- Helpers agenda ---
  const getReservaNoSlot = (data, hora) => {
    const dataStr = format(data, 'yyyy-MM-dd');
    return reservasAtivas.find(r => r.data === dataStr && hora >= r.hora_inicio && hora < r.hora_fim);
  };

  const isSlotPassado = (data, hora) => new Date(`${format(data, 'yyyy-MM-dd')}T${hora}`) < new Date();

  const checkConflict = (data, horaInicio, horaFim) =>
    reservasAtivas.some(r => r.data === data && horaInicio < r.hora_fim && horaFim > r.hora_inicio);

  const handleSlotClick = (data, hora) => {
    const reserva = getReservaNoSlot(data, hora);
    if (reserva) { setReservaDetalhes(reserva); return; }
    if (isSlotPassado(data, hora)) return;
    setSelectedSlot({ data, hora_inicio: hora });
    const idx = HORARIOS.indexOf(hora);
    setFormData(prev => ({ ...prev, hora_fim: HORARIOS[idx + 2] || HORARIOS[idx + 1] || hora }));
    setShowForm(true);
    setConflictError(false);
    setReservaDetalhes(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataStr = format(selectedSlot.data, 'yyyy-MM-dd');
    if (checkConflict(dataStr, selectedSlot.hora_inicio, formData.hora_fim)) { setConflictError(true); return; }
    createMutation.mutate({
      ...formData,
      data: dataStr,
      hora_inicio: selectedSlot.hora_inicio,
      num_participantes: formData.num_participantes ? Number(formData.num_participantes) : undefined,
      status: "Confirmada",
    });
  };

  const handleCancelarReserva = (reserva) => {
    if (window.confirm(`Cancelar a reserva de ${reserva.solicitante_nome} em ${reserva.data} das ${reserva.hora_inicio} às ${reserva.hora_fim}?`)) {
      cancelMutation.mutate(reserva.id);
    }
  };

  // --- Calendário mensal ---
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getReservasForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return reservasAtivas.filter(r => r.data === dateStr);
  };

  // --- Stats ---
  const stats = {
    total: reservas.length,
    confirmadas: reservas.filter(r => r.status === "Confirmada").length,
    concluidas: reservas.filter(r => r.status === "Concluída").length,
    canceladas: reservas.filter(r => r.status === "Cancelada").length,
  };

  // --- Histórico filtrado ---
  const filteredHistorico = reservas.filter(r => {
    const matchesSearch =
      r.solicitante_nome?.toLowerCase().includes(historicoSearch.toLowerCase()) ||
      r.motivo?.toLowerCase().includes(historicoSearch.toLowerCase()) ||
      r.solicitante_area?.toLowerCase().includes(historicoSearch.toLowerCase());
    const matchesStatus = historicoStatusFilter === "todos" || r.status === historicoStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sala de Treinamento</h1>
              <p className="text-gray-500 mt-1">Gerenciar agendamentos da sala</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600 font-mono truncate max-w-xs">{publicUrl}</span>
              <Button size="sm" variant="ghost" onClick={handleCopyLink} className="flex-shrink-0">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">Link público para agendamento</p>
          </div>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">Reserva confirmada com sucesso!</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="agenda" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="agenda">Agenda Semanal</TabsTrigger>
            <TabsTrigger value="ativas">Reservas Ativas</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* ===== ABA: AGENDA SEMANAL ===== */}
          <TabsContent value="agenda" className="space-y-4">
            <Card className="shadow-xl">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-teal-600" />
                    {format(inicioSemana, "MMMM yyyy", { locale: ptBR })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSemanaOffset(o => o - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => setSemanaOffset(0)}>Hoje</Button>
                    <Button variant="outline" size="sm" onClick={() => setSemanaOffset(o => o + 1)}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-6 border-b bg-gray-50">
                    <div className="p-3 text-xs font-semibold text-gray-500 text-center">Horário</div>
                    {diasSemana.map((dia) => (
                      <div key={dia.toISOString()} className={`p-3 text-center border-l ${isToday(dia) ? 'bg-teal-50' : ''}`}>
                        <p className="text-xs font-semibold text-gray-500 uppercase">{format(dia, 'EEE', { locale: ptBR })}</p>
                        <p className={`text-lg font-bold ${isToday(dia) ? 'text-teal-600' : 'text-gray-900'}`}>{format(dia, 'd')}</p>
                      </div>
                    ))}
                  </div>
                  {HORARIOS.slice(0, -1).map((hora) => (
                    <div key={hora} className="grid grid-cols-6 border-b hover:bg-gray-50/50">
                      <div className="p-2 text-xs text-gray-500 text-center font-medium border-r bg-gray-50 flex items-center justify-center">{hora}</div>
                      {diasSemana.map((dia) => {
                        const reserva = getReservaNoSlot(dia, hora);
                        const passado = isSlotPassado(dia, hora);
                        const selecionado = selectedSlot && isSameDay(dia, selectedSlot.data) && hora === selectedSlot.hora_inicio;
                        return (
                          <div
                            key={dia.toISOString()}
                            onClick={() => handleSlotClick(dia, hora)}
                            className={`border-l min-h-[40px] p-1 transition-all ${
                              reserva ? 'bg-teal-100 cursor-pointer hover:bg-teal-200'
                              : passado ? 'bg-gray-100 cursor-not-allowed opacity-50'
                              : selecionado ? 'bg-teal-200 cursor-pointer'
                              : 'hover:bg-teal-50 cursor-pointer'
                            }`}
                          >
                            {reserva && hora === reserva.hora_inicio && (
                              <div className="bg-teal-600 text-white rounded px-1 py-0.5 text-xs font-medium truncate">
                                {reserva.solicitante_nome.split(' ')[0]}
                                <span className="text-teal-200 ml-1">até {reserva.hora_fim}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Legenda */}
            <div className="flex gap-4 justify-center flex-wrap">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-white border-2 border-gray-300" /><span className="text-sm text-gray-600">Disponível</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-teal-100 border-2 border-teal-300" /><span className="text-sm text-gray-600">Reservado (clique p/ detalhes)</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-300" /><span className="text-sm text-gray-600">Passado</span></div>
            </div>

            {/* Painel detalhes */}
            {reservaDetalhes && (
              <Card className="shadow-xl max-w-lg mx-auto border-teal-200">
                <CardHeader className="border-b bg-teal-50 flex flex-row items-center justify-between">
                  <CardTitle className="text-teal-900 text-base">Detalhes da Reserva</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setReservaDetalhes(null)}><X className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-500">Solicitante</span><p className="font-medium">{reservaDetalhes.solicitante_nome}</p></div>
                    <div><span className="text-gray-500">Área</span><p className="font-medium">{reservaDetalhes.solicitante_area || "—"}</p></div>
                    <div><span className="text-gray-500">Data</span><p className="font-medium">{reservaDetalhes.data}</p></div>
                    <div><span className="text-gray-500">Horário</span><p className="font-medium">{reservaDetalhes.hora_inicio} – {reservaDetalhes.hora_fim}</p></div>
                    {reservaDetalhes.motivo && <div className="col-span-2"><span className="text-gray-500">Pauta</span><p className="font-medium">{reservaDetalhes.motivo}</p></div>}
                    {reservaDetalhes.num_participantes && <div><span className="text-gray-500">Participantes</span><p className="font-medium">{reservaDetalhes.num_participantes}</p></div>}
                    {reservaDetalhes.observacoes && <div className="col-span-2"><span className="text-gray-500">Observações</span><p className="font-medium">{reservaDetalhes.observacoes}</p></div>}
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button variant="destructive" size="sm" onClick={() => handleCancelarReserva(reservaDetalhes)} disabled={cancelMutation.isPending}>
                      {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                      Cancelar Reserva
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Formulário */}
            {showForm && selectedSlot && (
              <Card className="shadow-xl max-w-lg mx-auto">
                <CardHeader className="border-b bg-teal-50">
                  <CardTitle className="text-teal-900">
                    Reservar — {format(selectedSlot.data, "EEEE, dd/MM/yyyy", { locale: ptBR })} às {selectedSlot.hora_inicio}
                  </CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                  <CardContent className="pt-5 space-y-4">
                    {conflictError && (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <AlertDescription className="text-red-800">Conflito de horário! Escolha outro período.</AlertDescription>
                      </Alert>
                    )}
                    <div>
                      <Label>Seu Nome *</Label>
                      {colaboradores.length > 0 ? (
                        <Combobox
                          value={formData.solicitante_nome}
                          onValueChange={(value) => {
                            const colab = colaboradores.find(c => c.nome_completo === value);
                            setFormData({ ...formData, solicitante_nome: value, solicitante_email: colab?.email || "", solicitante_area: colab?.area || "" });
                          }}
                          options={colaboradores.filter(c => c.status === "Ativo").map(c => ({ value: c.nome_completo, label: `${c.nome_completo} - ${c.area}` }))}
                          placeholder="Selecione seu nome"
                        />
                      ) : (
                        <Input required placeholder="Seu nome completo" value={formData.solicitante_nome} onChange={(e) => setFormData({ ...formData, solicitante_nome: e.target.value })} />
                      )}
                    </div>
                    {formData.solicitante_nome && (
                      <div>
                        <Label>E-mail *</Label>
                        <Input required type="email" placeholder="seu@email.com" value={formData.solicitante_email} onChange={(e) => setFormData({ ...formData, solicitante_email: e.target.value })} />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Início</Label>
                        <Input disabled value={selectedSlot.hora_inicio} className="bg-gray-50" />
                      </div>
                      <div>
                        <Label>Término *</Label>
                        <select
                          required
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={formData.hora_fim}
                          onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                        >
                          {HORARIOS.filter(h => h > selectedSlot.hora_inicio).map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label>Pauta / Motivo *</Label>
                      <Textarea required placeholder="Descreva o objetivo da reunião..." value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })} rows={2} />
                    </div>
                    <div>
                      <Label>Nº de Participantes</Label>
                      <Input type="number" min="1" placeholder="Ex: 10" value={formData.num_participantes} onChange={(e) => setFormData({ ...formData, num_participantes: e.target.value })} />
                    </div>
                    <div>
                      <Label>Observações (opcional)</Label>
                      <Input placeholder="Projetor, coffee break, etc." value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
                    </div>
                  </CardContent>
                  <div className="border-t p-5 flex justify-between">
                    <Button type="button" variant="outline" onClick={() => { setShowForm(false); setSelectedSlot(null); }}>Cancelar</Button>
                    <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={createMutation.isPending}>
                      {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reservando...</> : "Confirmar Reserva"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </TabsContent>

          {/* ===== ABA: RESERVAS ATIVAS ===== */}
          <TabsContent value="ativas" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Total</p><p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Confirmadas</p><p className="text-3xl font-bold text-blue-600 mt-1">{stats.confirmadas}</p></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Concluídas</p><p className="text-3xl font-bold text-gray-600 mt-1">{stats.concluidas}</p></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Canceladas</p><p className="text-3xl font-bold text-red-600 mt-1">{stats.canceladas}</p></div></CardContent></Card>
            </div>

            {/* Calendário mensal */}
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>Calendário de Agendamentos</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-4 h-4" /></Button>
                    <span className="text-lg font-semibold min-w-[200px] text-center">{format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}</span>
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="text-center font-semibold text-sm text-gray-600 p-2">{day}</div>
                  ))}
                  {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="p-2" />
                  ))}
                  {daysInMonth.map(day => {
                    const reservasNoDia = getReservasForDate(day);
                    const isHoje = isSameDay(day, new Date());
                    return (
                      <div
                        key={day.toISOString()}
                        className={`relative p-2 border rounded-lg cursor-pointer transition-all
                          ${isHoje ? 'bg-teal-50 border-teal-300' : 'bg-white border-gray-200'}
                          ${reservasNoDia.length > 0 ? 'hover:bg-teal-100' : 'hover:bg-gray-50'}`}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className="text-center">
                          <span className={`text-sm ${isHoje ? 'font-bold text-teal-600' : 'text-gray-700'}`}>{format(day, 'd')}</span>
                        </div>
                        {reservasNoDia.length > 0 && (
                          <div className="mt-1 flex flex-col gap-1">
                            {reservasNoDia.slice(0, 2).map((r, idx) => (
                              <div key={idx} className="text-xs px-1 py-0.5 rounded truncate bg-teal-100 text-teal-800">
                                {r.solicitante_nome.split(' ')[0]}
                              </div>
                            ))}
                            {reservasNoDia.length > 2 && (
                              <div className="text-xs text-gray-500 text-center">+{reservasNoDia.length - 2}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Tabela ativas */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Reservas Confirmadas ({reservasAtivas.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Solicitante</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Pauta</TableHead>
                        <TableHead>Participantes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingReservas ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Carregando...</TableCell></TableRow>
                      ) : reservasAtivas.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Nenhuma reserva ativa</TableCell></TableRow>
                      ) : (
                        reservasAtivas.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{r.solicitante_nome}</p>
                                <p className="text-sm text-gray-500">{r.solicitante_area}</p>
                              </div>
                            </TableCell>
                            <TableCell>{r.data}</TableCell>
                            <TableCell>{r.hora_inicio} – {r.hora_fim}</TableCell>
                            <TableCell className="max-w-[180px] truncate">{r.motivo || "—"}</TableCell>
                            <TableCell>{r.num_participantes || "—"}</TableCell>
                            <TableCell>
                              <Badge className={statusColors[r.status] || "bg-blue-100 text-blue-800"}>{r.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="destructive" onClick={() => handleCancelarReserva(r)}>
                                Cancelar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== ABA: HISTÓRICO ===== */}
          <TabsContent value="historico" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-6"><div className="text-center"><p className="text-2xl font-bold text-gray-900">{stats.total}</p><p className="text-sm text-gray-600">Total</p></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-center"><p className="text-2xl font-bold text-blue-600">{stats.confirmadas}</p><p className="text-sm text-gray-600">Confirmadas</p></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-center"><p className="text-2xl font-bold text-gray-600">{stats.concluidas}</p><p className="text-sm text-gray-600">Concluídas</p></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-center"><p className="text-2xl font-bold text-red-600">{stats.canceladas}</p><p className="text-sm text-gray-600">Canceladas</p></div></CardContent></Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Pesquisar por nome, pauta ou área..."
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
                      <SelectItem value="Confirmada">Confirmada</SelectItem>
                      <SelectItem value="Concluída">Concluída</SelectItem>
                      <SelectItem value="Cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingReservas ? (
                  <div className="text-center py-12"><p className="text-gray-600">Carregando...</p></div>
                ) : filteredHistorico.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nenhuma reserva encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredHistorico.map((r) => (
                      <Card key={r.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900">{r.motivo || "Sem pauta"}</span>
                                <Badge className={statusColors[r.status] || "bg-blue-100 text-blue-800"}>{r.status}</Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div className="flex items-center gap-2 text-gray-600"><User className="w-4 h-4" />{r.solicitante_nome}</div>
                                <div className="flex items-center gap-2 text-gray-600"><Briefcase className="w-4 h-4" />{r.solicitante_area || "—"}</div>
                                <div className="flex items-center gap-2 text-gray-600"><Clock className="w-4 h-4" />{r.data} · {r.hora_inicio} – {r.hora_fim}</div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setReservaDetalhes(r)}>
                              <Eye className="w-4 h-4 mr-2" />Ver Detalhes
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

        {/* Modal do dia (calendário mensal) */}
        {selectedDate && (
          <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Reservas de {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getReservasForDate(selectedDate).length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhuma reserva neste dia</p>
                ) : (
                  getReservasForDate(selectedDate).map(r => (
                    <Card key={r.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{r.solicitante_nome}</p>
                            <p className="text-sm text-gray-600">{r.motivo}</p>
                            <p className="text-sm text-gray-500 mt-1">{r.hora_inicio} – {r.hora_fim}</p>
                          </div>
                          <Badge className={statusColors[r.status] || "bg-blue-100 text-blue-800"}>{r.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal detalhes (histórico) */}
        <Dialog open={!!reservaDetalhes && !showForm} onOpenChange={(open) => { if (!open) setReservaDetalhes(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Reserva</DialogTitle>
            </DialogHeader>
            {reservaDetalhes && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{reservaDetalhes.motivo || "Sem pauta"}</h3>
                      <p className="text-sm text-gray-600">{reservaDetalhes.data} · {reservaDetalhes.hora_inicio} – {reservaDetalhes.hora_fim}</p>
                    </div>
                  </div>
                  <Badge className={statusColors[reservaDetalhes.status] || "bg-blue-100 text-blue-800"}>{reservaDetalhes.status}</Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Solicitante</p>
                      <div className="flex items-center gap-2 text-gray-900"><User className="w-4 h-4 text-gray-400" />{reservaDetalhes.solicitante_nome}</div>
                    </div>
                    {reservaDetalhes.solicitante_email && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">Email</p>
                        <div className="flex items-center gap-2 text-gray-900"><Mail className="w-4 h-4 text-gray-400" />{reservaDetalhes.solicitante_email}</div>
                      </div>
                    )}
                    {reservaDetalhes.solicitante_area && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">Área</p>
                        <div className="flex items-center gap-2 text-gray-900"><Briefcase className="w-4 h-4 text-gray-400" />{reservaDetalhes.solicitante_area}</div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Horário</p>
                      <div className="flex items-center gap-2 text-gray-900"><Clock className="w-4 h-4 text-gray-400" />{reservaDetalhes.hora_inicio} – {reservaDetalhes.hora_fim}</div>
                    </div>
                    {reservaDetalhes.num_participantes && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">Participantes</p>
                        <div className="flex items-center gap-2 text-gray-900"><Users className="w-4 h-4 text-gray-400" />{reservaDetalhes.num_participantes}</div>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Criado em</p>
                      <div className="flex items-center gap-2 text-gray-900">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        {format(new Date(reservaDetalhes.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                </div>

                {reservaDetalhes.observacoes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Observações</p>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex gap-2"><FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /><p className="text-gray-900 text-sm">{reservaDetalhes.observacoes}</p></div>
                    </div>
                  </div>
                )}

                {reservaDetalhes.status !== "Cancelada" && reservaDetalhes.status !== "Concluída" && (
                  <div className="pt-2 border-t flex justify-end">
                    <Button variant="destructive" onClick={() => handleCancelarReserva(reservaDetalhes)} disabled={cancelMutation.isPending}>
                      {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Cancelar Reserva
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}