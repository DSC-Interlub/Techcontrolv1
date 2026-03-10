import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Users, Clock, AlertCircle, Loader2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

const HORARIOS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];

export default function ReservaSalaPublica() {
  React.useEffect(() => {
    document.title = "Reservar Sala de Treinamento - TechControl";
  }, []);

  const [semanaOffset, setSemanaOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
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

  const queryClient = useQueryClient();

  const hoje = new Date();
  const inicioSemana = addDays(startOfWeek(hoje, { weekStartsOn: 1 }), semanaOffset * 7);
  const diasSemana = Array.from({ length: 5 }, (_, i) => addDays(inicioSemana, i));

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores_sala_pub'],
    queryFn: async () => {
      try {
        return await base44.entities.Colaboradores.list();
      } catch {
        return [];
      }
    },
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas_sala_pub'],
    queryFn: async () => {
      try {
        return await base44.entities.ReservasSala.list();
      } catch {
        return [];
      }
    },
  });

  const reservasAtivas = reservas.filter(r => r.status !== "Cancelada");

  const getReservaNoSlot = (data, hora) => {
    const dataStr = format(data, 'yyyy-MM-dd');
    return reservasAtivas.find(r => r.data === dataStr && hora >= r.hora_inicio && hora < r.hora_fim);
  };

  const isSlotPassado = (data, hora) => {
    return new Date(`${format(data, 'yyyy-MM-dd')}T${hora}`) < new Date();
  };

  const checkConflict = (data, horaInicio, horaFim) => {
    return reservasAtivas.some(r => r.data === data && horaInicio < r.hora_fim && horaFim > r.hora_inicio);
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReservasSala.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas_sala_pub'] });
      setSuccess(true);
    },
    onError: () => setConflictError(true),
  });

  const handleSlotClick = (data, hora) => {
    if (getReservaNoSlot(data, hora) || isSlotPassado(data, hora)) return;
    const idx = HORARIOS.indexOf(hora);
    setSelectedSlot({ data, hora_inicio: hora });
    setFormData(prev => ({ ...prev, hora_fim: HORARIOS[idx + 2] || HORARIOS[idx + 1] || hora }));
    setConflictError(false);
    // Scroll para o formulário
    setTimeout(() => document.getElementById('form-reserva-sala')?.scrollIntoView({ behavior: 'smooth' }), 100);
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

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reserva Confirmada!</h2>
            <p className="text-gray-600 mb-6">
              Sua reserva da Sala de Treinamento foi confirmada com sucesso para{" "}
              <strong>{format(selectedSlot.data, "dd/MM/yyyy", { locale: ptBR })}</strong> das{" "}
              <strong>{selectedSlot.hora_inicio}</strong> às <strong>{formData.hora_fim}</strong>.
            </p>
            <Button onClick={() => { setSuccess(false); setSelectedSlot(null); setFormData({ solicitante_nome: "", solicitante_email: "", solicitante_area: "", hora_fim: "", motivo: "", num_participantes: "", observacoes: "" }); }} className="bg-teal-600 hover:bg-teal-700">
              Fazer outra reserva
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Sala de Treinamento</h1>
          <p className="text-gray-600">Clique em um horário disponível no calendário para reservar</p>
        </div>

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
                <Button variant="outline" size="sm" onClick={() => setSemanaOffset(0)}>Hoje</Button>
                <Button variant="outline" size="sm" onClick={() => setSemanaOffset(o => o + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[640px]">
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

              {/* Linhas de horário */}
              {HORARIOS.slice(0, -1).map((hora) => (
                <div key={hora} className="grid grid-cols-6 border-b">
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
                            ? 'bg-teal-100 cursor-not-allowed'
                            : passado
                            ? 'bg-gray-100 cursor-not-allowed opacity-50'
                            : selecionado
                            ? 'bg-teal-200 cursor-pointer ring-2 ring-teal-500'
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
        <div className="flex gap-4 justify-center mb-8 flex-wrap">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-white border-2 border-gray-300" /><span className="text-sm text-gray-600">Disponível (clique para reservar)</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-teal-100 border-2 border-teal-300" /><span className="text-sm text-gray-600">Reservado</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-teal-200 border-2 border-teal-500" /><span className="text-sm text-gray-600">Selecionado</span></div>
        </div>

        {/* Formulário de reserva */}
        {selectedSlot && (
          <Card className="shadow-xl max-w-lg mx-auto" id="form-reserva-sala">
            <CardHeader className="border-b bg-teal-50">
              <CardTitle className="text-teal-900 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {format(selectedSlot.data, "EEEE, dd/MM/yyyy", { locale: ptBR })} — {selectedSlot.hora_inicio}
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="pt-5 space-y-4">
                {conflictError && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Conflito de horário!</strong> Já existe uma reserva neste período. Escolha outro horário.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Nome */}
                <div>
                  <Label>Seu Nome *</Label>
                  {colaboradores.length > 0 ? (
                    <>
                      <Combobox
                        value={formData.solicitante_nome}
                        onValueChange={(value) => {
                          const colab = colaboradores.find(c => c.nome_completo === value);
                          setFormData({ ...formData, solicitante_nome: value, solicitante_email: colab?.email || "", solicitante_area: colab?.area || "" });
                        }}
                        options={colaboradores.filter(c => c.status === "Ativo").map(c => ({ value: c.nome_completo, label: `${c.nome_completo} - ${c.area}` }))}
                        placeholder="Selecione seu nome"
                      />
                      <p className="text-xs text-gray-500 mt-1">Seus dados serão preenchidos automaticamente</p>
                    </>
                  ) : (
                    <Input required placeholder="Seu nome completo" value={formData.solicitante_nome} onChange={(e) => setFormData({ ...formData, solicitante_nome: e.target.value })} />
                  )}
                </div>

                {/* Email */}
                <div>
                  <Label>E-mail *</Label>
                  <Input required type="email" placeholder="seu@email.com" value={formData.solicitante_email} onChange={(e) => setFormData({ ...formData, solicitante_email: e.target.value })} />
                </div>

                {/* Área (só mostra se não veio do combobox) */}
                {!colaboradores.length && (
                  <div>
                    <Label>Área/Departamento</Label>
                    <Input placeholder="Ex: TI, RH, Vendas" value={formData.solicitante_area} onChange={(e) => setFormData({ ...formData, solicitante_area: e.target.value })} />
                  </div>
                )}

                {/* Horários */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Início</Label>
                    <Input disabled value={selectedSlot.hora_inicio} className="bg-gray-50" />
                  </div>
                  <div>
                    <Label>Término *</Label>
                    <select
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={formData.hora_fim}
                      onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                    >
                      {HORARIOS.filter(h => h > selectedSlot.hora_inicio).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Motivo */}
                <div>
                  <Label>Pauta / Motivo *</Label>
                  <Textarea required placeholder="Descreva o objetivo da reunião..." value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })} rows={2} />
                </div>

                {/* Participantes */}
                <div>
                  <Label>Nº de Participantes</Label>
                  <Input type="number" min="1" placeholder="Ex: 10" value={formData.num_participantes} onChange={(e) => setFormData({ ...formData, num_participantes: e.target.value })} />
                </div>

                {/* Observações */}
                <div>
                  <Label>Observações (opcional)</Label>
                  <Input placeholder="Projetor, coffee break, etc." value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
                </div>
              </CardContent>

              <div className="border-t p-5 flex justify-between">
                <Button type="button" variant="outline" onClick={() => setSelectedSlot(null)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reservando...</>
                  ) : "Confirmar Reserva"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {!selectedSlot && (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">👆 Clique em um horário disponível no calendário acima para iniciar a reserva</p>
          </div>
        )}
      </div>
    </div>
  );
}