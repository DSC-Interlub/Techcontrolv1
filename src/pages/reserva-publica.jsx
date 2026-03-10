import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Calendar, Laptop, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ReservaPublica() {
  // Configura o título da página
  React.useEffect(() => {
    document.title = "Reservar Notebook - TechControl";
  }, []);
  const [step, setStep] = useState(1);
  const [selectedEquipamento, setSelectedEquipamento] = useState(null);
  const [formData, setFormData] = useState({
    solicitante_nome: "",
    solicitante_email: "",
    solicitante_area: "",
    data_inicio: "",
    hora_inicio: "",
    data_fim: "",
    hora_fim: "",
    motivo: "",
  });
  const [success, setSuccess] = useState(false);
  const [conflictError, setConflictError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores_reserva'],
    queryFn: async () => {
      try {
        return await base44.entities.Colaboradores.list();
      } catch (error) {
        console.log('Não foi possível carregar colaboradores (esperado em página pública)');
        return [];
      }
    },
  });



  const { data: notebooks = [], isLoading: loadingNotebooks } = useQuery({
    queryKey: ['notebooks_disponiveis'],
    queryFn: async () => {
      try {
        // Busca notebooks de ambas as entidades
        const [notebooksExternos, pcsInternos] = await Promise.all([
          base44.entities.Notebooks_Externos.list(),
          base44.entities.PCs_Internos.list()
        ]);
        
        // Filtra notebooks disponíveis para reserva
        const externosDisponiveis = notebooksExternos.filter(nb => nb.disponivel_para_reserva === true);
        const internosDisponiveis = pcsInternos.filter(pc => pc.tipo === 'Notebook' && pc.disponivel_para_reserva === true);
        
        // Combina e adiciona identificador de origem
        return [
          ...externosDisponiveis.map(n => ({ ...n, origem: 'Notebooks_Externos' })),
          ...internosDisponiveis.map(n => ({ ...n, origem: 'PCs_Internos' }))
        ];
      } catch (error) {
        console.error('Erro ao carregar notebooks:', error);
        return [];
      }
    },
  });

  const { data: reservasExistentes = [], refetch: refetchReservas } = useQuery({
    queryKey: ['reservas_existentes'],
    queryFn: async () => {
      try {
        return await base44.entities.Reservas.list();
      } catch (error) {
        console.error('Erro ao carregar reservas:', error);
        return [];
      }
    },
  });

  // Função para verificar se um notebook está em uso agora
  const getNotebookStatus = (notebookId) => {
    const agora = new Date();
    
    const reservaAtiva = reservasExistentes.find(reserva => {
      if (reserva.equipamento_id !== notebookId || reserva.status === "Cancelada" || reserva.status === "Concluída") {
        return false;
      }

      const inicioReserva = new Date(`${reserva.data_inicio}T${reserva.hora_inicio}`);
      const fimReserva = new Date(`${reserva.data_fim}T${reserva.hora_fim}`);

      // Verifica se a reserva está ativa agora
      return agora >= inicioReserva && agora < fimReserva;
    });

    if (reservaAtiva) {
      return {
        emUso: true,
        disponivelEm: new Date(`${reservaAtiva.data_fim}T${reservaAtiva.hora_fim}`),
        reservaAtual: reservaAtiva
      };
    }

    return { emUso: false, disponivelEm: null, reservaAtual: null };
  };

  // Função para obter a próxima disponibilidade de um notebook
  const getProximaDisponibilidade = (notebookId) => {
    const agora = new Date();
    
    // Busca todas as reservas futuras ou ativas deste notebook
    const reservasFuturas = reservasExistentes
      .filter(reserva => {
        if (reserva.equipamento_id !== notebookId || reserva.status === "Cancelada" || reserva.status === "Concluída") {
          return false;
        }
        const fimReserva = new Date(`${reserva.data_fim}T${reserva.hora_fim}`);
        return fimReserva > agora;
      })
      .sort((a, b) => {
        const fimA = new Date(`${a.data_fim}T${a.hora_fim}`);
        const fimB = new Date(`${b.data_fim}T${b.hora_fim}`);
        return fimA - fimB;
      });

    if (reservasFuturas.length > 0) {
      const ultimaReserva = reservasFuturas[reservasFuturas.length - 1];
      return new Date(`${ultimaReserva.data_fim}T${ultimaReserva.hora_fim}`);
    }

    return null;
  };

  const checkConflict = (equipamentoId, dataInicio, horaInicio, dataFim, horaFim) => {
    const inicioSolicitado = new Date(`${dataInicio}T${horaInicio}`);
    const fimSolicitado = new Date(`${dataFim}T${horaFim}`);

    return reservasExistentes.some(reserva => {
      if (reserva.equipamento_id !== equipamentoId || reserva.status === "Cancelada" || reserva.status === "Concluída") {
        return false;
      }

      const inicioReserva = new Date(`${reserva.data_inicio}T${reserva.hora_inicio}`);
      const fimReserva = new Date(`${reserva.data_fim}T${reserva.hora_fim}`);

      return (
        (inicioSolicitado >= inicioReserva && inicioSolicitado < fimReserva) ||
        (fimSolicitado > inicioReserva && fimSolicitado <= fimReserva) ||
        (inicioSolicitado <= inicioReserva && fimSolicitado >= fimReserva)
      );
    });
  };

  const createReservaMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Reservas.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks_disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['reservas_existentes'] });
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        setStep(1);
        setSelectedEquipamento(null);
        setFormData({
          solicitante_nome: "",
          solicitante_email: "",
          solicitante_area: "",
          data_inicio: "",
          hora_inicio: "",
          data_fim: "",
          hora_fim: "",
          motivo: "",
        });
        setSuccess(false);
      }, 3000);
    },
    onError: () => {
      setIsSubmitting(false);
      setConflictError(true);
      setTimeout(() => setConflictError(false), 5000);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Previne múltiplas submissões
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setConflictError(false);

    try {
      // Recarrega as reservas existentes para ter os dados mais recentes
      await refetchReservas();
      
      // Aguarda um momento para garantir que os dados foram atualizados
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verifica conflito com dados atualizados
      const hasConflict = checkConflict(
        selectedEquipamento.id,
        formData.data_inicio,
        formData.hora_inicio,
        formData.data_fim,
        formData.hora_fim
      );

      if (hasConflict) {
        setConflictError(true);
        setIsSubmitting(false);
        setTimeout(() => setConflictError(false), 5000);
        return;
      }

      const agora = new Date();
      const inicioReserva = new Date(`${formData.data_inicio}T${formData.hora_inicio}`);
      const fimReserva = new Date(`${formData.data_fim}T${formData.hora_fim}`);

      let statusInicial = "Confirmada";
      if (inicioReserva <= agora && fimReserva > agora) {
        statusInicial = "Em Andamento";
      } else if (fimReserva <= agora) {
        statusInicial = "Concluída";
      }

      const reservaData = {
        equipamento_id: selectedEquipamento.id,
        equipamento_tipo: selectedEquipamento.origem || "Notebooks_Externos",
        equipamento_nome: `${selectedEquipamento.marca} ${selectedEquipamento.modelo}`,
        ...formData,
        status: statusInicial
      };

      createReservaMutation.mutate(reservaData);
    } catch (error) {
      console.error('Erro ao processar reserva:', error);
      setIsSubmitting(false);
      setConflictError(true);
      setTimeout(() => setConflictError(false), 5000);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reserva Confirmada!</h2>
            <p className="text-gray-600">
              Sua reserva foi confirmada com sucesso. O notebook estará disponível no horário agendado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Reservar Notebook
          </h1>
          <p className="text-gray-600">
            Escolha um notebook disponível e reserve para o período desejado
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              2
            </div>
          </div>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader className="border-b">
              <h2 className="text-xl font-bold text-gray-900">Escolha um Notebook</h2>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingNotebooks ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-12 h-12 text-purple-600 mx-auto mb-3 animate-spin" />
                  <p className="text-gray-600">Carregando notebooks disponíveis...</p>
                </div>
              ) : notebooks.length === 0 ? (
                <div className="py-12 text-center">
                  <Laptop className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhum notebook disponível no momento</p>
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {notebooks.map((notebook) => {
                      const status = getNotebookStatus(notebook.id);
                      const proximaDisponibilidade = getProximaDisponibilidade(notebook.id);
                      
                      return (
                        <Card
                          key={notebook.id}
                          className={`cursor-pointer transition-all ${
                            selectedEquipamento?.id === notebook.id
                              ? 'ring-2 ring-purple-600 shadow-lg'
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => setSelectedEquipamento(notebook)}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{notebook.marca}</CardTitle>
                                <p className="text-sm text-gray-600 mt-1">{notebook.modelo}</p>
                              </div>
                              <Laptop className="w-8 h-8 text-purple-600" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Processador:</span>
                                <span className="font-medium">{notebook.processador || "-"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Etiqueta:</span>
                                <span className="font-medium">{notebook.etiqueta_interna || "-"}</span>
                              </div>
                              
                              <div className="mt-3 space-y-2">
                                {status.emUso ? (
                                  <>
                                    <Badge className="bg-orange-100 text-orange-800">
                                      Em Uso
                                    </Badge>
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
                                      <p className="text-xs font-semibold text-orange-900 mb-1">
                                        Disponível em:
                                      </p>
                                      <p className="text-xs text-orange-700">
                                        {format(status.disponivelEm, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                      </p>
                                      <p className="text-xs text-orange-600 mt-2">
                                        Reserve para depois deste horário
                                      </p>
                                    </div>
                                  </>
                                ) : proximaDisponibilidade ? (
                                  <>
                                    <Badge className="bg-green-100 text-green-800">
                                      Disponível Agora
                                    </Badge>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                                      <p className="text-xs font-semibold text-blue-900 mb-1">
                                        ✅ Disponível para reserva
                                      </p>
                                      <p className="text-xs text-blue-700">
                                        Já tem uma locação a partir de {format(proximaDisponibilidade, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                      </p>
                                      <p className="text-xs text-blue-600 mt-1">
                                        Reserve para antes dessa data
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <Badge className="bg-green-100 text-green-800">
                                    Disponível
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {selectedEquipamento && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => setStep(2)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Continuar
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Dados da Reserva</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Notebook selecionado: {selectedEquipamento.marca} {selectedEquipamento.modelo}
              </p>
              {(() => {
                const status = getNotebookStatus(selectedEquipamento.id);
                if (status.emUso) {
                  return (
                    <Alert className="mt-3 bg-orange-50 border-orange-200">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <strong>Atenção:</strong> Este notebook está em uso até{" "}
                        {format(status.disponivelEm, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
                        Sua reserva deve começar após este horário.
                      </AlertDescription>
                    </Alert>
                  );
                }
              })()}
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="pt-6 space-y-4">
                {conflictError && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Conflito de horário!</strong> Já existe uma reserva para este notebook no período selecionado. 
                      Por favor, escolha outro horário ou notebook.
                    </AlertDescription>
                  </Alert>
                )}

                {colaboradores.length > 0 ? (
                  <div>
                    <Label>Nome Completo *</Label>
                    <Combobox
                      value={formData.solicitante_nome}
                      onValueChange={(value) => {
                        const colab = colaboradores.find(c => c.nome_completo === value);
                        setFormData({
                          ...formData,
                          solicitante_nome: value,
                          solicitante_email: colab?.email || "",
                          solicitante_area: colab?.area || ""
                        });
                      }}
                      options={colaboradores.filter(c => c.status === "Ativo").map(c => ({
                        value: c.nome_completo,
                        label: `${c.nome_completo} - ${c.area}`
                      }))}
                      placeholder="Selecione seu nome"
                    />
                    <p className="text-xs text-gray-500 mt-1">Seus dados de contato serão preenchidos automaticamente</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Nome Completo *</Label>
                      <Input
                        required
                        placeholder="Digite seu nome completo"
                        value={formData.solicitante_nome}
                        onChange={(e) => setFormData({ ...formData, solicitante_nome: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <Label>Email *</Label>
                      <Input
                        required
                        type="email"
                        placeholder="seu.email@empresa.com"
                        value={formData.solicitante_email}
                        onChange={(e) => setFormData({ ...formData, solicitante_email: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <Label>Área/Departamento *</Label>
                      <Input
                        required
                        placeholder="Ex: TI, Vendas, Logística"
                        value={formData.solicitante_area}
                        onChange={(e) => setFormData({ ...formData, solicitante_area: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                  </>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Início *</Label>
                    <Input
                      required
                      type="date"
                      value={formData.data_inicio}
                      onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label>Horário de Início *</Label>
                    <Input
                      required
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Término *</Label>
                    <Input
                      required
                      type="date"
                      value={formData.data_fim}
                      onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                      min={formData.data_inicio || new Date().toISOString().split('T')[0]}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label>Horário de Término *</Label>
                    <Input
                      required
                      type="time"
                      value={formData.hora_fim}
                      onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <Label>Motivo da Reserva *</Label>
                  <Textarea
                    required
                    placeholder="Descreva o motivo da reserva..."
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>

                <Alert>
                  <Clock className="w-4 h-4" />
                  <AlertDescription>
                    {isSubmitting ? (
                      <strong className="text-blue-600">Processando sua reserva... Por favor, aguarde.</strong>
                    ) : (
                      "Sua reserva será confirmada automaticamente. O notebook estará disponível no horário agendado."
                    )}
                  </AlertDescription>
                </Alert>
              </CardContent>

              <div className="border-t p-6 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 min-w-[160px]"
                  disabled={isSubmitting || createReservaMutation.isLoading}
                >
                  {isSubmitting || createReservaMutation.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Confirmar Reserva"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}