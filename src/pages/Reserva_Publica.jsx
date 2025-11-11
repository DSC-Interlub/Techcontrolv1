import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Laptop, CheckCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Reserva_Publica() {
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

  const queryClient = useQueryClient();

  const { data: notebooks = [] } = useQuery({
    queryKey: ['notebooks_disponiveis'],
    queryFn: () => base44.entities.Notebooks_Externos.filter({ status: "Disponível" }),
  });

  const createReservaMutation = useMutation({
    mutationFn: (data) => base44.entities.Reservas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks_disponiveis'] });
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
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const reservaData = {
      equipamento_id: selectedEquipamento.id,
      equipamento_tipo: "Notebooks_Externos",
      equipamento_nome: `${selectedEquipamento.marca} ${selectedEquipamento.modelo}`,
      ...formData,
      status: "Pendente"
    };

    createReservaMutation.mutate(reservaData);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reserva Solicitada!</h2>
            <p className="text-gray-600">
              Sua solicitação foi enviada com sucesso. Aguarde a confirmação da equipe de TI.
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
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Escolha um Notebook</h2>
            {notebooks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Laptop className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhum notebook disponível no momento</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {notebooks.map((notebook) => (
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
                        <Badge className="bg-green-100 text-green-800 mt-2">
                          Disponível
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedEquipamento && (
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Continuar
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Dados da Reserva</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Notebook selecionado: {selectedEquipamento.marca} {selectedEquipamento.modelo}
              </p>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo *</Label>
                    <Input
                      required
                      placeholder="Seu nome"
                      value={formData.solicitante_nome}
                      onChange={(e) => setFormData({ ...formData, solicitante_nome: e.target.value })}
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
                    />
                  </div>
                </div>

                <div>
                  <Label>Área/Departamento *</Label>
                  <Input
                    required
                    placeholder="Ex: Financeiro, TI, Vendas"
                    value={formData.solicitante_area}
                    onChange={(e) => setFormData({ ...formData, solicitante_area: e.target.value })}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Início *</Label>
                    <Input
                      required
                      type="date"
                      value={formData.data_inicio}
                      onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label>Horário de Início *</Label>
                    <Input
                      required
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
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
                    />
                  </div>
                  <div>
                    <Label>Horário de Término *</Label>
                    <Input
                      required
                      type="time"
                      value={formData.hora_fim}
                      onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
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
                  />
                </div>

                <Alert>
                  <Clock className="w-4 h-4" />
                  <AlertDescription>
                    Sua reserva será enviada para aprovação. Você receberá uma confirmação por email.
                  </AlertDescription>
                </Alert>
              </CardContent>

              <div className="border-t p-6 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={createReservaMutation.isLoading}
                >
                  {createReservaMutation.isLoading ? "Enviando..." : "Solicitar Reserva"}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}