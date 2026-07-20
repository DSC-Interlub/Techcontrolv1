import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CheckCircle, AlertCircle, Loader2, CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";

const HORARIOS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];

const statusColors = {
  "Confirmada": "bg-blue-100 text-blue-800",
  "Concluída": "bg-gray-100 text-gray-800",
  "Cancelada": "bg-red-100 text-red-800",
};

const normalizeUserName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export default function PortalSala() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();
  const queryClient = useQueryClient();
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ hora_fim: "", motivo: "", num_participantes: "", observacoes: "" });
  const [success, setSuccess] = useState(false);
  const [conflictError, setConflictError] = useState(false);

  useEffect(() => {
    if (!loading) requireAuth();
  }, [loading]);

  const { data: reservas = [] } = useQuery({
    queryKey: ['portal_sala_reservas'],
    queryFn: () => base44.entities.ReservasSala.list('-created_date'),
    enabled: !!colaborador,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReservasSala.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_sala_reservas'] });
      setSuccess(true);
      setShowForm(false);
      setSelectedSlot(null);
      setFormData({ hora_fim: "", motivo: "", num_participantes: "", observacoes: "" });
      setTimeout(() => setSuccess(false), 5000);
    },
    onError: () => setConflictError(true),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.ReservasSala.update(id, { status: "Cancelada" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal_sala_reservas'] }),
  });

  if (loading || !colaborador) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const hoje = new Date();
  const inicioSemana = addDays(startOfWeek(hoje, { weekStartsOn: 1 }), semanaOffset * 7);
  const diasSemana = Array.from({ length: 5 }, (_, i) => addDays(inicioSemana, i));

  const reservasAtivas = reservas.filter(r => r.status !== "Cancelada");
  const nomeNorm = normalizeUserName(colaborador.nome_completo);
  const minhasReservas = reservas.filter(r => normalizeUserName(r.solicitante_nome) === nomeNorm);

  const getReservaNoSlot = (data, hora) => {
    const dataStr = format(data, 'yyyy-MM-dd');
    return reservasAtivas.find(r => r.data === dataStr && hora >= r.hora_inicio && hora < r.hora_fim);
  };

  const isSlotPassado = (data, hora) => new Date(`${format(data, 'yyyy-MM-dd')}T${hora}`) < new Date();

  const checkConflict = (data, horaInicio, horaFim) =>
    reservasAtivas.some(r => r.data === data && horaInicio < r.hora_fim && horaFim > r.hora_inicio);

  const handleSlotClick = (data, hora) => {
    const reserva = getReservaNoSlot(data, hora);
    if (reserva || isSlotPassado(data, hora)) return;
    setSelectedSlot({ data, hora_inicio: hora });
    const idx = HORARIOS.indexOf(hora);
    setFormData(prev => ({ ...prev, hora_fim: HORARIOS[idx + 2] || HORARIOS[idx + 1] || hora }));
    setShowForm(true);
    setConflictError(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataStr = format(selectedSlot.data, 'yyyy-MM-dd');
    if (checkConflict(dataStr, selectedSlot.hora_inicio, formData.hora_fim)) { setConflictError(true); return; }
    createMutation.mutate({
      solicitante_nome: colaborador.nome_completo,
      solicitante_email: colaborador.email,
      solicitante_area: colaborador.area,
      data: dataStr,
      hora_inicio: selectedSlot.hora_inicio,
      ...formData,
      num_participantes: formData.num_participantes ? Number(formData.num_participantes) : undefined,
      status: "Confirmada",
    });
  };

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout}>
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sala de Treinamento</h1>
              <p className="text-muted-foreground mt-1">Clique em um horário disponível para reservar</p>
            </div>
          </div>

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 font-medium">Reserva confirmada com sucesso!</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="agenda">
            <TabsList className="grid w-full grid-cols-2 max-w-xs mb-6">
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
              <TabsTrigger value="minhas">Minhas Reservas</TabsTrigger>
            </TabsList>

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
                    <div className="grid grid-cols-6 border-b bg-muted/50">
                      <div className="p-3 text-xs font-semibold text-muted-foreground text-center">Horário</div>
                      {diasSemana.map((dia) => (
                        <div key={dia.toISOString()} className={`p-3 text-center border-l ${isToday(dia) ? 'bg-teal-50 dark:bg-teal-950' : ''}`}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">{format(dia, 'EEE', { locale: ptBR })}</p>
                          <p className={`text-lg font-bold ${isToday(dia) ? 'text-teal-600' : 'text-foreground'}`}>{format(dia, 'd')}</p>
                        </div>
                      ))}
                    </div>
                    {HORARIOS.slice(0, -1).map((hora) => (
                      <div key={hora} className="grid grid-cols-6 border-b hover:bg-muted/30">
                      <div className="p-2 text-xs text-muted-foreground text-center font-medium border-r bg-muted/30 flex items-center justify-center">{hora}</div>
                        {diasSemana.map((dia) => {
                          const reserva = getReservaNoSlot(dia, hora);
                          const passado = isSlotPassado(dia, hora);
                          const selecionado = selectedSlot && isSameDay(dia, selectedSlot.data) && hora === selectedSlot.hora_inicio;
                          return (
                            <div
                              key={dia.toISOString()}
                              onClick={() => handleSlotClick(dia, hora)}
                              className={`border-l min-h-[40px] p-1 transition-all ${
                                reserva ? 'bg-teal-100 cursor-not-allowed'
                                : passado ? 'bg-muted cursor-not-allowed opacity-50'
                                : selecionado ? 'bg-teal-200 cursor-pointer ring-2 ring-teal-500'
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

              <div className="flex gap-4 justify-center flex-wrap text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-background border-2 border-border" />Disponível</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-teal-100 border-2 border-teal-300" />Reservado</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-muted border-2 border-border" />Passado</div>
              </div>

              {showForm && selectedSlot && (
                <Card className="shadow-xl max-w-lg mx-auto">
                  <CardHeader className="border-b bg-teal-50 flex flex-row items-center justify-between">
                    <CardTitle className="text-teal-900 text-base">
                      {format(selectedSlot.data, "EEEE, dd/MM/yyyy", { locale: ptBR })} às {selectedSlot.hora_inicio}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setSelectedSlot(null); }}><X className="w-4 h-4" /></Button>
                  </CardHeader>
                  <form onSubmit={handleSubmit}>
                    <CardContent className="pt-5 space-y-4">
                      {conflictError && (
                        <Alert className="bg-red-50 border-red-200">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <AlertDescription className="text-red-800">Conflito de horário! Escolha outro período.</AlertDescription>
                        </Alert>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Início</Label><Input disabled value={selectedSlot.hora_inicio} className="bg-gray-50" /></div>
                        <div>
                          <Label>Término *</Label>
                          <select required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            value={formData.hora_fim} onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}>
                            {HORARIOS.filter(h => h > selectedSlot.hora_inicio).map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>
                      <div><Label>Pauta / Motivo *</Label><Textarea required placeholder="Objetivo da reunião..." value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} rows={2} /></div>
                      <div><Label>Nº de Participantes</Label><Input type="number" min="1" placeholder="Ex: 10" value={formData.num_participantes} onChange={e => setFormData({...formData, num_participantes: e.target.value})} /></div>
                      <div><Label>Observações</Label><Input placeholder="Projetor, coffee break, etc." value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} /></div>
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

            <TabsContent value="minhas">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Pauta</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {minhasReservas.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Nenhuma reserva</TableCell></TableRow>
                      ) : minhasReservas.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{r.data}</TableCell>
                          <TableCell>{r.hora_inicio} – {r.hora_fim}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{r.motivo || "—"}</TableCell>
                          <TableCell><Badge className={statusColors[r.status] || "bg-blue-100 text-blue-800"}>{r.status}</Badge></TableCell>
                          <TableCell>
                            {r.status === "Confirmada" && (
                              <Button size="sm" variant="destructive" onClick={() => cancelMutation.mutate(r.id)} disabled={cancelMutation.isPending}>Cancelar</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PortalLayout>
  );
}