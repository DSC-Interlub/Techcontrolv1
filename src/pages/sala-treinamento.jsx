import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Users, Clock, AlertCircle, Loader2, CalendarDays, ChevronLeft, ChevronRight, ExternalLink, X, Trash2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format, addDays, startOfWeek, isSameDay, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

const HORARIOS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];

export default function SalaTreinamento() {
  React.useEffect(() => {
    document.title = "Sala de Treinamento - TechControl";
  }, []);

  const [semanaOffset, setSemanaOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null); // { data, hora_inicio }
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    solicitante_nome: "",
    solicitante_email: "",
    solicitante_area: "",
    hora_fim: "",
    motivo: "",
    num_participantes: "",
    observacoes: "",
  });
  const [success, setSuccess] = useState(false);
  const [conflictError, setConflictError] = useState(false);
  const [reservaDetalhes, setReservaDetalhes] = useState(null); // reserva selecionada para ver/cancelar

  const queryClient = useQueryClient();

  const hoje = new Date();
  const inicioSemana = addDays(startOfWeek(hoje, { weekStartsOn: 1 }), semanaOffset * 7);
  const diasSemana = Array.from({ length: 5 }, (_, i) => addDays(inicioSemana, i));

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores_sala'],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas_sala'],
    queryFn: () => base44.entities.ReservasSala.list(),
  });

  const reservasAtivas = reservas.filter(r => r.status !== "Cancelada");

  const getReservaNoSlot = (data, hora) => {
    const dataStr = format(data, 'yyyy-MM-dd');
    return reservasAtivas.find(r => {
      if (r.data !== dataStr) return false;
      return hora >= r.hora_inicio && hora < r.hora_fim;
    });
  };

  const isSlotPassado = (data, hora) => {
    const slotDt = new Date(`${format(data, 'yyyy-MM-dd')}T${hora}`);
    return slotDt < new Date();
  };

  const checkConflict = (data, horaInicio, horaFim) => {
    return reservasAtivas.some(r => {
      if (r.data !== data) return false;
      return (horaInicio < r.hora_fim && horaFim > r.hora_inicio);
    });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReservasSala.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas_sala'] });
      setSuccess(true);
      setShowForm(false);
      setSelectedSlot(null);
      setTimeout(() => setSuccess(false), 5000);
    },
    onError: () => setConflictError(true),
  });

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
    if (checkConflict(dataStr, selectedSlot.hora_inicio, formData.hora_fim)) {
      setConflictError(true);
      return;
    }
    createMutation.mutate({
      ...formData,
      data: dataStr,
      hora_inicio: selectedSlot.hora_inicio,
      num_participantes: formData.num_participantes ? Number(formData.num_participantes) : undefined,
      status: "Confirmada",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Sala de Treinamento</h1>
          <p className="text-gray-600">Reserve a sala de reunião clicando em um horário disponível</p>
          <a
            href={createPageUrl("reserva-sala-publica")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Link público para agendamento
          </a>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200 max-w-lg mx-auto">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">
              Reserva confirmada com sucesso!
            </AlertDescription>
          </Alert>
        )}

        {/* Calendário semanal */}
        <Card className="shadow-xl mb-6">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-teal-600" />
                {format(inicioSemana, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSemanaOffset(o => o - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSemanaOffset(0)}>
                  Hoje
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSemanaOffset(o => o + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header dias */}
              <div className="grid grid-cols-6 border-b bg-gray-50">
                <div className="p-3 text-xs font-semibold text-gray-500 text-center">Horário</div>
                {diasSemana.map((dia) => (
                  <div key={dia.toISOString()} className={`p-3 text-center border-l ${isToday(dia) ? 'bg-teal-50' : ''}`}>
                    <p className="text-xs font-semibold text-gray-500 uppercase">{format(dia, 'EEE', { locale: ptBR })}</p>
                    <p className={`text-lg font-bold ${isToday(dia) ? 'text-teal-600' : 'text-gray-900'}`}>{format(dia, 'd')}</p>
                  </div>
                ))}
              </div>

              {/* Grade de horários */}
              {HORARIOS.slice(0, -1).map((hora) => (
                <div key={hora} className="grid grid-cols-6 border-b hover:bg-gray-50/50">
                  <div className="p-2 text-xs text-gray-500 text-center font-medium border-r bg-gray-50 flex items-center justify-center">
                    {hora}
                  </div>
                  {diasSemana.map((dia) => {
                    const reserva = getReservaNoSlot(dia, hora);
                    const passado = isSlotPassado(dia, hora);
                    const selecionado = selectedSlot && isSameDay(dia, selectedSlot.data) && hora === selectedSlot.hora_inicio;

                    return (
                      <div
                        key={dia.toISOString()}
                        onClick={() => handleSlotClick(dia, hora)}
                        className={`border-l min-h-[40px] p-1 transition-all ${
                          reserva
                            ? 'bg-teal-100 cursor-default'
                            : passado
                            ? 'bg-gray-100 cursor-not-allowed opacity-50'
                            : selecionado
                            ? 'bg-teal-200 cursor-pointer'
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
        <div className="flex gap-4 justify-center mb-6 flex-wrap">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-white border-2 border-gray-300" /><span className="text-sm text-gray-600">Disponível</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-teal-100 border-2 border-teal-300" /><span className="text-sm text-gray-600">Reservado</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-300" /><span className="text-sm text-gray-600">Passado</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-teal-200 border-2 border-teal-400" /><span className="text-sm text-gray-600">Selecionado</span></div>
        </div>

        {/* Formulário de reserva */}
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
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setSelectedSlot(null); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reservando...</> : "Confirmar Reserva"}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}