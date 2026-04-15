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
import { Calendar, Plus, CheckCircle, AlertCircle, Loader2, Laptop, X, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";

const statusColors = {
  "Pendente": "bg-yellow-100 text-yellow-800",
  "Confirmada": "bg-blue-100 text-blue-800",
  "Em Andamento": "bg-green-100 text-green-800",
  "Concluída": "bg-gray-100 text-gray-800",
  "Cancelada": "bg-red-100 text-red-800",
};

export default function PortalReservas() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [formData, setFormData] = useState({ data_inicio: "", hora_inicio: "07:42", data_fim: "", hora_fim: "17:30", motivo: "" });
  const [semanaRef, setSemanaRef] = useState(new Date());

  useEffect(() => {
    if (!loading) requireAuth();
  }, [loading]);

  const { data: notebooksExternos = [], isLoading: loadingNotebooksExt } = useQuery({
    queryKey: ['portal_nb_ext'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
    enabled: !!colaborador,
    staleTime: 0,
  });

  const { data: pcsInternos = [], isLoading: loadingPcsInternos } = useQuery({
    queryKey: ['portal_pcs_int'],
    queryFn: () => base44.entities.PCs_Internos.list(),
    enabled: !!colaborador,
    staleTime: 0,
  });

  const loadingNotebooks = loadingNotebooksExt || loadingPcsInternos;

  const { data: todasReservas = [] } = useQuery({
    queryKey: ['portal_todas_reservas'],
    queryFn: () => base44.entities.Reservas.list('-created_date'),
    enabled: !!colaborador,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Reservas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_todas_reservas'] });
      setSuccess(true);
      setShowForm(false);
      setSelectedNotebook(null);
      setFormData({ data_inicio: "", hora_inicio: "08:00", data_fim: "", hora_fim: "18:00", motivo: "" });
      setTimeout(() => setSuccess(false), 5000);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.Reservas.update(id, { status: "Cancelada" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal_todas_reservas'] }),
  });

  if (loading || !colaborador) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const getNotebookStatus = (nbId) => {
    const agora = new Date();
    const reservaAtiva = todasReservas.find(r => {
      if (r.equipamento_id !== nbId || r.status === "Cancelada" || r.status === "Concluída") return false;
      const ini = new Date(`${r.data_inicio}T${r.hora_inicio}`);
      const fim = new Date(`${r.data_fim}T${r.hora_fim}`);
      return agora >= ini && agora < fim;
    });
    if (reservaAtiva) {
      return { emUso: true, disponivelEm: new Date(`${reservaAtiva.data_fim}T${reservaAtiva.hora_fim}`) };
    }
    return { emUso: false, disponivelEm: null };
  };

  const getProximaDisponibilidade = (nbId) => {
    const agora = new Date();
    const futuras = todasReservas
      .filter(r => {
        if (r.equipamento_id !== nbId || r.status === "Cancelada" || r.status === "Concluída") return false;
        return new Date(`${r.data_fim}T${r.hora_fim}`) > agora;
      })
      .sort((a, b) => new Date(`${a.data_fim}T${a.hora_fim}`) - new Date(`${b.data_fim}T${b.hora_fim}`));
    if (futuras.length > 0) {
      const ultima = futuras[futuras.length - 1];
      return new Date(`${ultima.data_fim}T${ultima.hora_fim}`);
    }
    return null;
  };

  const getConflictingReserva = (nbId, dataInicio, horaInicio, dataFim, horaFim) => {
    const novoInicio = new Date(`${dataInicio}T${horaInicio}`);
    const novoFim = new Date(`${dataFim}T${horaFim}`);
    return todasReservas.find(r => {
      if (r.equipamento_id !== nbId) return false;
      if (r.status === "Cancelada" || r.status === "Concluída") return false;
      const rInicio = new Date(`${r.data_inicio}T${r.hora_inicio}`);
      const rFim = new Date(`${r.data_fim}T${r.hora_fim}`);
      return novoInicio < rFim && novoFim > rInicio;
    }) || null;
  };

  const checkWeekend = (dataInicio, dataFim) => {
    if (!dataInicio || !dataFim) return null;
    const [yI, mI, dI] = dataInicio.split('-').map(Number);
    const [yF, mF, dF] = dataFim.split('-').map(Number);
    const inicio = new Date(yI, mI - 1, dI);
    const fim = new Date(yF, mF - 1, dF);
    const cur = new Date(inicio);
    while (cur <= fim) {
      const dow = cur.getDay();
      if (dow === 0 || dow === 6) return true;
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  };

  const getLastFriday = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    while (dt.getDay() !== 5) dt.setDate(dt.getDate() - 1);
    return format(dt, 'dd/MM/yyyy');
  };

  const getNextMonday = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    while (dt.getDay() !== 1) dt.setDate(dt.getDate() + 1);
    return format(dt, 'dd/MM/yyyy');
  };



  const getPeriodosOcupadosNaData = (nbId, dataStr) => {
    if (!dataStr) return [];
    return todasReservas
      .filter(r => {
        if (r.equipamento_id !== nbId) return false;
        if (r.status === "Cancelada" || r.status === "Concluída") return false;
        // Apenas reservas onde data_inicio é exatamente o dia selecionado
        // Ignora reservas históricas com datas cruzadas (data_inicio diferente do dia)
        if (r.data_inicio !== dataStr) return false;
        // Validade extra: hora_inicio deve ser menor que hora_fim
        if (r.hora_inicio >= r.hora_fim) return false;
        return true;
      })
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  };

  // Verifica se um notebook está ocupado em determinado horário (para o calendário)
  const isNbOcupadoNoHorario = (nbId, dataStr, horaInicio) => {
    return todasReservas.some(r => {
      if (r.equipamento_id !== nbId) return false;
      if (r.status === "Cancelada" || r.status === "Concluída") return false;
      if (r.data_inicio !== dataStr) return false;
      return r.hora_inicio <= horaInicio && r.hora_fim > horaInicio;
    });
  };

  const validateForm = (nb, data) => {
    if (!nb || !data.data_inicio || !data.data_fim) return "";
    // Nova regra: mesma data
    if (data.data_inicio !== data.data_fim) {
      return "As reservas devem ser feitas dentro do mesmo dia. Se você precisar do equipamento por mais de um dia, crie uma reserva separada para cada dia.";
    }
    const [hIni] = data.hora_inicio.split(':').map(Number);
    const [mIni] = data.hora_inicio.split(':').map(Number).slice(1);
    const [hFim] = data.hora_fim.split(':').map(Number);
    const [mFim] = data.hora_fim.split(':').map(Number).slice(1);
    const inicioMinutos = hIni * 60 + mIni;
    const fimMinutos = hFim * 60 + mFim;
    if (inicioMinutos >= fimMinutos) {
      return "O horário de início deve ser anterior ao horário de fim.";
    }
    if (inicioMinutos < 7 * 60 + 42 || fimMinutos > 17 * 60 + 30) {
      return "O horário de reserva deve estar dentro do expediente: 07:42 às 17:30.";
    }
    const [yI, mI, dI] = data.data_inicio.split('-').map(Number);
    const dow = new Date(yI, mI - 1, dI).getDay();
    if (dow === 0 || dow === 6) {
      return "Reservas não são permitidas em finais de semana.";
    }
    const conflito = getConflictingReserva(nb.id, data.data_inicio, data.hora_inicio, data.data_fim, data.hora_fim);
    if (conflito) {
      const [ycI, mcI, dcI] = conflito.data_inicio.split('-').map(Number);
      const dtI = format(new Date(ycI, mcI - 1, dcI), 'dd/MM/yyyy');
      return `Este equipamento já possui reserva no dia ${dtI} das ${conflito.hora_inicio} às ${conflito.hora_fim}. Escolha outro horário ou equipamento.`;
    }
    return "";
  };

  const minhasReservas = todasReservas.filter(r =>
    r.solicitante_email?.toLowerCase() === colaborador.email?.toLowerCase()
  );

  // Combina notebooks externos e PCs internos tipo Notebook marcados como disponíveis para reserva
  const todosDispo = [
    ...notebooksExternos.map(n => ({ ...n, _fonte: "Notebooks_Externos" })),
    ...pcsInternos.filter(p => p.tipo === "Notebook").map(p => ({ ...p, _fonte: "PCs_Internos" })),
  ];
  const notebooksDisponiveis = todosDispo.filter(n => n.disponivel_para_reserva === true);

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validateForm(selectedNotebook, formData);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError("");
    createMutation.mutate({
      equipamento_id: selectedNotebook.id,
      equipamento_tipo: selectedNotebook._fonte || "Notebooks_Externos",
      equipamento_nome: `${selectedNotebook.marca} ${selectedNotebook.modelo}`,
      solicitante_nome: colaborador.nome_completo,
      solicitante_email: colaborador.email,
      solicitante_area: colaborador.area,
      ...formData,
      status: "Confirmada",
    });
  };

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout}>
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Reservar Notebook</h1>
                <p className="text-muted-foreground mt-1">Reserve um notebook para uso externo</p>
              </div>
            </div>
            <Button onClick={() => { setShowForm(!showForm); setValidationError(""); }} className="bg-purple-600 hover:bg-purple-700 gap-2">
              <Plus className="w-4 h-4" />
              Nova Reserva
            </Button>
          </div>

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 font-medium">Reserva confirmada com sucesso!</AlertDescription>
            </Alert>
          )}

          {showForm && (
            <Card className="mb-6 shadow-xl">
              <CardHeader className="border-b bg-purple-50 flex flex-row items-center justify-between">
                <CardTitle className="text-purple-900">Nova Reserva de Notebook</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="pt-5 space-y-5">
                  {validationError && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800 whitespace-pre-line">{validationError}</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Label>Selecione o Notebook *</Label>
                    {loadingNotebooks ? (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" />Carregando notebooks...</div>
                    ) : notebooksDisponiveis.length === 0 ? (
                      <p className="text-sm text-gray-500 mt-1">Nenhum notebook disponível para reserva. Configure notebooks marcando "Disponível para Reserva".</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        {(() => {
                          // Se data e hora de início já definidas (ex: clique no calendário), ordenar por disponibilidade naquele horário
                          const sorted = [...notebooksDisponiveis].sort((a, b) => {
                            if (!formData.data_inicio || !formData.hora_inicio) return 0;
                            const aOcupado = isNbOcupadoNoHorario(a.id, formData.data_inicio, formData.hora_inicio);
                            const bOcupado = isNbOcupadoNoHorario(b.id, formData.data_inicio, formData.hora_inicio);
                            return (aOcupado ? 1 : 0) - (bOcupado ? 1 : 0);
                          });
                          return sorted.map(nb => {
                            const nbStatus = getNotebookStatus(nb.id);
                            const isSelected = selectedNotebook?.id === nb.id;
                            const periodosNaData = formData.data_inicio ? getPeriodosOcupadosNaData(nb.id, formData.data_inicio) : [];
                            const ocupadoNoHorario = formData.data_inicio && formData.hora_inicio
                              ? isNbOcupadoNoHorario(nb.id, formData.data_inicio, formData.hora_inicio)
                              : false;
                            return (
                              <div
                                key={nb.id}
                                onClick={() => { if (!ocupadoNoHorario || !formData.hora_inicio) { setSelectedNotebook(nb); setValidationError(""); } }}
                                className={`border-2 rounded-xl p-4 transition-all ${ocupadoNoHorario && formData.hora_inicio ? 'opacity-60 cursor-not-allowed border-gray-200 bg-gray-50' : isSelected ? 'border-purple-500 shadow-lg bg-purple-50 cursor-pointer' : 'border-gray-200 hover:shadow-md hover:border-purple-300 cursor-pointer'}`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <p className="font-bold text-gray-900">{nb.marca}</p>
                                    <p className="text-sm text-gray-500">{nb.modelo}</p>
                                  </div>
                                  <Laptop className={`w-7 h-7 flex-shrink-0 ${ocupadoNoHorario && formData.hora_inicio ? 'text-gray-400' : 'text-purple-500'}`} />
                                </div>
                                <div className="space-y-1 text-sm mb-3">
                                  {nb.processador && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Processador:</span>
                                      <span className="font-medium">{nb.processador}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Etiqueta:</span>
                                    <span className="font-bold">{nb.etiqueta_interna || "—"}</span>
                                  </div>
                                </div>
                                {/* Badge de disponibilidade no horário clicado */}
                                {formData.data_inicio && formData.hora_inicio && (
                                  <div className="mb-2">
                                    {ocupadoNoHorario
                                      ? <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold">Ocupado às {formData.hora_inicio}</span>
                                      : <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">Livre neste horário</span>
                                    }
                                  </div>
                                )}
                                {/* Períodos ocupados na data (apenas reservas do mesmo dia, válidas) */}
                                {(() => {
                                  if (periodosNaData.length > 0) {
                                    return (
                                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs mt-1">
                                        <p className="font-semibold text-orange-900 mb-1">Períodos ocupados:</p>
                                        {periodosNaData.map((r, i) => (
                                          <p key={i} className="text-orange-700">• {r.hora_inicio} – {r.hora_fim} <span className="text-orange-500">({r.status})</span></p>
                                        ))}
                                      </div>
                                    );
                                  } else if (formData.data_inicio) {
                                    return <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">Disponível o dia todo</span>;
                                  } else if (nbStatus.emUso) {
                                    return (
                                      <>
                                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-semibold mb-2">Em Uso agora</span>
                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs">
                                          <p className="text-orange-700">Disponível a partir de {format(nbStatus.disponivelEm, "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                                        </div>
                                      </>
                                    );
                                  } else {
                                    return <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">Disponível</span>;
                                  }
                                })()}
                                {isSelected && <div className="mt-2 flex items-center gap-1 text-purple-700 text-xs font-semibold"><CheckCircle className="w-4 h-4" />Selecionado</div>}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>

                  {selectedNotebook && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label>Data *</Label>
                          <Input type="date" required value={formData.data_inicio} onChange={e => {
                            const nd = {...formData, data_inicio: e.target.value, data_fim: e.target.value};
                            setFormData(nd);
                            setValidationError(validateForm(selectedNotebook, nd));
                          }} min={new Date().toISOString().split('T')[0]} />
                          <p className="text-xs text-gray-500 mt-1">A devolução deve ser no mesmo dia.</p>
                        </div>
                        <div>
                          <Label>Hora Início</Label>
                          <Input type="time" value={formData.hora_inicio} min="07:42" max="17:30" onChange={e => { const nd = {...formData, hora_inicio: e.target.value}; setFormData(nd); setValidationError(validateForm(selectedNotebook, nd)); }} />
                        </div>
                        <div>
                          <Label>Data Devolução</Label>
                          <Input type="date" value={formData.data_fim} readOnly className="bg-gray-50 cursor-not-allowed" />
                          {formData.data_fim && formData.data_inicio !== formData.data_fim && (
                            <p className="text-xs text-red-600 mt-1">A data de devolução deve ser o mesmo dia do início da reserva.</p>
                          )}
                        </div>
                        <div>
                          <Label>Hora Fim</Label>
                          <Input type="time" value={formData.hora_fim} min="07:42" max="17:30" onChange={e => { const nd = {...formData, hora_fim: e.target.value}; setFormData(nd); setValidationError(validateForm(selectedNotebook, nd)); }} />
                        </div>
                      </div>
                      <div>
                        <Label>Motivo *</Label>
                        <Textarea required placeholder="Descreva o motivo da reserva..." value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} rows={2} />
                      </div>
                    </>
                  )}
                </CardContent>
                <div className="border-t p-5 flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={createMutation.isPending || !selectedNotebook}>
                    {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reservando...</> : "Confirmar Reserva"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Tabs defaultValue="ativas">
            <TabsList className="grid w-full grid-cols-3 max-w-sm mb-4">
              <TabsTrigger value="ativas">Minhas Reservas</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
              <TabsTrigger value="calendario">Calendário</TabsTrigger>
            </TabsList>
            <TabsContent value="ativas">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Notebook</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {minhasReservas.filter(r => r.status !== "Concluída" && r.status !== "Cancelada").length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">Nenhuma reserva ativa</TableCell></TableRow>
                      ) : minhasReservas.filter(r => r.status !== "Concluída" && r.status !== "Cancelada").map(r => {
                        const nb = todosDispo.find(n => n.id === r.equipamento_id);
                        const etiqueta = nb?.etiqueta_interna;
                        const nomeDisplay = etiqueta ? `${etiqueta} — ${r.equipamento_nome}` : r.equipamento_nome;
                        const [yI, mI, dI] = r.data_inicio.split('-').map(Number);
                        const [yF, mF, dF] = r.data_fim.split('-').map(Number);
                        return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{nomeDisplay}</TableCell>
                          <TableCell className="text-sm">
                            <p>{format(new Date(yI, mI-1, dI), 'dd/MM/yyyy')} às {r.hora_inicio}</p>
                            <p className="text-gray-500">até {format(new Date(yF, mF-1, dF), 'dd/MM/yyyy')} às {r.hora_fim}</p>
                          </TableCell>
                          <TableCell><Badge className={statusColors[r.status]}>{r.status}</Badge></TableCell>
                          <TableCell>
                            <Button size="sm" variant="destructive" onClick={() => cancelMutation.mutate(r.id)} disabled={cancelMutation.isPending}>Cancelar</Button>
                          </TableCell>
                        </TableRow>
                      );})}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="historico">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Notebook</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {minhasReservas.filter(r => r.status === "Concluída" || r.status === "Cancelada").length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">Sem histórico</TableCell></TableRow>
                      ) : minhasReservas.filter(r => r.status === "Concluída" || r.status === "Cancelada").map(r => {
                        const nb = todosDispo.find(n => n.id === r.equipamento_id);
                        const etiqueta = nb?.etiqueta_interna;
                        const nomeDisplay = etiqueta ? `${etiqueta} — ${r.equipamento_nome}` : r.equipamento_nome;
                        const [yI, mI, dI] = r.data_inicio.split('-').map(Number);
                        const [yF, mF, dF] = r.data_fim.split('-').map(Number);
                        const dtI = format(new Date(yI, mI-1, dI), 'dd/MM/yyyy');
                        const dtF = format(new Date(yF, mF-1, dF), 'dd/MM/yyyy');
                        return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{nomeDisplay}</TableCell>
                          <TableCell className="text-sm">{dtI} – {dtF}</TableCell>
                          <TableCell className="text-sm">{r.hora_inicio} – {r.hora_fim}</TableCell>
                          <TableCell><Badge className={statusColors[r.status]}>{r.status}</Badge></TableCell>
                        </TableRow>
                      );})}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="calendario">
              {(() => {
                const inicioSemana = startOfWeek(semanaRef, { weekStartsOn: 1 });
                const diasSemana = Array.from({ length: 5 }, (_, i) => addDays(inicioSemana, i));

                // Eixo de tempo: 07:00 às 18:00 = 660 minutos total
                const HORA_INICIO_GRADE = 7 * 60; // 07:00 em minutos
                const HORA_FIM_GRADE = 18 * 60;   // 18:00 em minutos
                const TOTAL_MINUTOS = HORA_FIM_GRADE - HORA_INICIO_GRADE; // 660
                const ALTURA_GRADE = 600; // px

                const toMinutos = (hhmm) => {
                  const [h, m] = hhmm.split(':').map(Number);
                  return h * 60 + m;
                };

                const horasEixo = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

                // Reservas válidas para exibir no calendário de um dia.
                // Regra: considera apenas reservas onde data_inicio === dia.
                // Para reservas cruzadas (data_fim diferente de data_inicio), exibe das hora_inicio até 17:30 (fim do expediente).
                const getReservasDia = (dia) => {
                  const diaStr = format(dia, 'yyyy-MM-dd');
                  return todasReservas
                    .filter(r => {
                      if (r.status === "Cancelada" || r.status === "Concluída") return false;
                      if (r.data_inicio !== diaStr) return false;
                      if (!r.hora_inicio || !r.hora_fim) return false;
                      return true;
                    })
                    .map(r => {
                      // Reserva cruzada (data_fim diferente): exibe só até o fim do expediente
                      if (r.data_fim !== r.data_inicio && r.hora_inicio > r.hora_fim) {
                        return { ...r, hora_fim: "17:30", _cruzada: true };
                      }
                      return r;
                    })
                    .filter(r => r.hora_inicio < r.hora_fim); // garante que hora_inicio < hora_fim
                };

                const handleClickAreaLivre = (dia, e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const fracaoClicada = clickY / ALTURA_GRADE;
                  const minutosClicados = HORA_INICIO_GRADE + Math.floor(fracaoClicada * TOTAL_MINUTOS);
                  // Arredonda para a hora cheia mais próxima
                  const hora = Math.max(7, Math.min(17, Math.floor(minutosClicados / 60)));
                  const horaStr = String(hora).padStart(2, '0') + ':00';
                  const horaFimSugerida = String(Math.min(hora + 1, 17)).padStart(2, '0') + ':30';
                  const diaStr = format(dia, 'yyyy-MM-dd');
                  setFormData(prev => ({ ...prev, data_inicio: diaStr, data_fim: diaStr, hora_inicio: horaStr, hora_fim: horaFimSugerida }));
                  setShowForm(true);
                  setValidationError("");
                  setSelectedNotebook(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                };

                return (
                  <Card>
                    <CardHeader className="border-b pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-base">Disponibilidade Semanal — Todos os Equipamentos</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => setSemanaRef(subWeeks(semanaRef, 1))}><ChevronLeft className="w-4 h-4" /></Button>
                          <span className="text-sm font-medium min-w-[160px] text-center">
                            {format(inicioSemana, "dd/MM")} – {format(addDays(inicioSemana, 4), "dd/MM/yyyy")}
                          </span>
                          <Button variant="outline" size="icon" onClick={() => setSemanaRef(addWeeks(semanaRef, 1))}><ChevronRight className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Clique em uma área livre para iniciar uma reserva naquele horário.</p>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <div className="min-w-[600px]">
                        {/* Header dos dias */}
                        <div className="flex border-b">
                          <div className="w-14 shrink-0" />
                          {diasSemana.map(dia => (
                            <div
                              key={dia.toISOString()}
                              className={`flex-1 text-center py-2 text-xs font-medium border-l ${isSameDay(dia, new Date()) ? 'bg-purple-50 text-purple-700' : 'text-gray-700'}`}
                            >
                              <div className="uppercase">{format(dia, 'EEE', { locale: ptBR })}</div>
                              <div className={`text-base font-bold ${isSameDay(dia, new Date()) ? 'text-purple-700' : ''}`}>{format(dia, 'dd/MM')}</div>
                            </div>
                          ))}
                        </div>

                        {/* Grade de tempo */}
                        <div className="flex" style={{ height: ALTURA_GRADE }}>
                          {/* Eixo de horas */}
                          <div className="w-14 shrink-0 relative" style={{ height: ALTURA_GRADE }}>
                            {horasEixo.map(hora => {
                              const top = ((hora * 60 - HORA_INICIO_GRADE) / TOTAL_MINUTOS) * ALTURA_GRADE;
                              return (
                                <div
                                  key={hora}
                                  className="absolute right-1 text-xs text-gray-400 font-mono leading-none"
                                  style={{ top: top - 6 }}
                                >
                                  {String(hora).padStart(2, '0')}:00
                                </div>
                              );
                            })}
                          </div>

                          {/* Colunas dos dias */}
                          {diasSemana.map(dia => {
                            const reservasDia = getReservasDia(dia);
                            const isPast = dia < new Date() && !isSameDay(dia, new Date());
                            return (
                              <div
                                key={dia.toISOString()}
                                className={`flex-1 relative border-l border-gray-100 ${isSameDay(dia, new Date()) ? 'bg-purple-50/20' : ''} ${isPast ? 'bg-gray-50/50' : ''}`}
                                style={{ height: ALTURA_GRADE }}
                                onClick={isPast ? undefined : (e) => handleClickAreaLivre(dia, e)}
                              >
                                {/* Linhas de hora */}
                                {horasEixo.map(hora => {
                                  const top = ((hora * 60 - HORA_INICIO_GRADE) / TOTAL_MINUTOS) * ALTURA_GRADE;
                                  return (
                                    <div
                                      key={hora}
                                      className="absolute left-0 right-0 border-t border-gray-100"
                                      style={{ top }}
                                    />
                                  );
                                })}

                                {/* Indicador "clique para reservar" em dias futuros sem hover */}
                                {!isPast && (
                                  <div className="absolute inset-0 cursor-pointer hover:bg-purple-50/30 transition-colors" />
                                )}

                                {/* Blocos de reserva — faixas contínuas */}
                                {reservasDia.map((r, i) => {
                                  const nb = [...notebooksExternos, ...pcsInternos].find(n => n.id === r.equipamento_id);
                                  const inicioMin = Math.max(toMinutos(r.hora_inicio), HORA_INICIO_GRADE);
                                  const fimMin = Math.min(toMinutos(r.hora_fim), HORA_FIM_GRADE);
                                  const duracaoMin = fimMin - inicioMin;
                                  if (duracaoMin <= 0) return null;
                                  const topPx = ((inicioMin - HORA_INICIO_GRADE) / TOTAL_MINUTOS) * ALTURA_GRADE;
                                  const heightPx = (duracaoMin / TOTAL_MINUTOS) * ALTURA_GRADE;
                                  const isSmall = duracaoMin < 45;
                                  return (
                                    <div
                                      key={r.id || i}
                                      className="absolute left-0.5 right-0.5 rounded bg-red-100 border border-red-300 overflow-hidden z-10 shadow-sm"
                                      style={{ top: topPx, height: Math.max(heightPx, 18) }}
                                      onClick={e => e.stopPropagation()}
                                      title={`${nb?.etiqueta_interna || r.equipamento_nome} · ${r.hora_inicio}–${r._cruzada ? r.hora_fim + ' (continua no dia seguinte)' : r.hora_fim}`}
                                    >
                                      <div className="p-0.5 leading-tight text-xs h-full flex flex-col justify-start overflow-hidden">
                                        <p className="font-mono font-bold text-purple-700 truncate">{nb?.etiqueta_interna || ""}</p>
                                        {!isSmall && (
                                          <p className="text-gray-600 truncate text-[10px]">{nb?.modelo || r.equipamento_nome}</p>
                                        )}
                                        <p className="text-red-600 text-[10px]">{r.hora_inicio}–{r.hora_fim}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PortalLayout>
  );
}