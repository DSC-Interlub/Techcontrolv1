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
import { Calendar, Plus, CheckCircle, AlertCircle, Loader2, Laptop, X, Clock } from "lucide-react";
import { format } from "date-fns";
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
  const [conflictError, setConflictError] = useState(false);
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [formData, setFormData] = useState({ data_inicio: "", hora_inicio: "08:00", data_fim: "", hora_fim: "18:00", motivo: "" });

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

  const checkConflict = (nbId, dataInicio, horaInicio, dataFim, horaFim) => {
    const novoInicio = new Date(`${dataInicio}T${horaInicio}`);
    const novoFim = new Date(`${dataFim}T${horaFim}`);
    return todasReservas.some(r => {
      if (r.equipamento_id !== nbId) return false;
      if (r.status === "Cancelada" || r.status === "Concluída") return false;
      const rInicio = new Date(`${r.data_inicio}T${r.hora_inicio}`);
      const rFim = new Date(`${r.data_fim}T${r.hora_fim}`);
      return novoInicio < rFim && novoFim > rInicio;
    });
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
    if (checkConflict(selectedNotebook.id, formData.data_inicio, formData.hora_inicio, formData.data_fim, formData.hora_fim)) {
      setConflictError(true);
      return;
    }
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
                <h1 className="text-2xl font-bold text-gray-900">Reservar Notebook</h1>
                <p className="text-gray-500 mt-1">Reserve um notebook para uso externo</p>
              </div>
            </div>
            <Button onClick={() => { setShowForm(!showForm); setConflictError(false); }} className="bg-purple-600 hover:bg-purple-700 gap-2">
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
                  {conflictError && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800">Conflito! Este notebook já está reservado nesse período.</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Label>Selecione o Notebook *</Label>
                    {loadingNotebooks ? (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" />Carregando notebooks...</div>
                    ) : notebooksDisponiveis.length === 0 ? (
                      <p className="text-sm text-gray-500 mt-1">Nenhum notebook disponível para reserva. Configure os notebooks em "Notebooks Externos" marcando "Disponível para Reserva".</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        {notebooksDisponiveis.map(nb => (
                          <div
                            key={nb.id}
                            onClick={() => { setSelectedNotebook(nb); setConflictError(false); }}
                            className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedNotebook?.id === nb.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            <div className="flex items-center gap-3">
                              <Laptop className="w-6 h-6 text-gray-400" />
                              <div>
                                <p className="font-medium">{nb.marca} {nb.modelo}</p>
                                <p className="text-xs text-gray-500">Etiqueta: {nb.etiqueta_interna || "—"}</p>
                              </div>
                              {selectedNotebook?.id === nb.id && <CheckCircle className="w-5 h-5 text-purple-600 ml-auto" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedNotebook && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label>Data Início *</Label>
                          <Input type="date" required value={formData.data_inicio} onChange={e => setFormData({...formData, data_inicio: e.target.value})} min={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div>
                          <Label>Hora Início</Label>
                          <Input type="time" value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} />
                        </div>
                        <div>
                          <Label>Data Fim *</Label>
                          <Input type="date" required value={formData.data_fim} onChange={e => setFormData({...formData, data_fim: e.target.value})} min={formData.data_inicio || new Date().toISOString().split('T')[0]} />
                        </div>
                        <div>
                          <Label>Hora Fim</Label>
                          <Input type="time" value={formData.hora_fim} onChange={e => setFormData({...formData, hora_fim: e.target.value})} />
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
            <TabsList className="grid w-full grid-cols-2 max-w-xs mb-4">
              <TabsTrigger value="ativas">Ativas</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
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
                      ) : minhasReservas.filter(r => r.status !== "Concluída" && r.status !== "Cancelada").map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.equipamento_nome}</TableCell>
                          <TableCell className="text-sm">
                            <p>{r.data_inicio} {r.hora_inicio}</p>
                            <p className="text-gray-500">até {r.data_fim} {r.hora_fim}</p>
                          </TableCell>
                          <TableCell><Badge className={statusColors[r.status]}>{r.status}</Badge></TableCell>
                          <TableCell>
                            <Button size="sm" variant="destructive" onClick={() => cancelMutation.mutate(r.id)} disabled={cancelMutation.isPending}>Cancelar</Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {minhasReservas.filter(r => r.status === "Concluída" || r.status === "Cancelada").length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-500">Sem histórico</TableCell></TableRow>
                      ) : minhasReservas.filter(r => r.status === "Concluída" || r.status === "Cancelada").map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.equipamento_nome}</TableCell>
                          <TableCell className="text-sm">{r.data_inicio} – {r.data_fim}</TableCell>
                          <TableCell><Badge className={statusColors[r.status]}>{r.status}</Badge></TableCell>
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