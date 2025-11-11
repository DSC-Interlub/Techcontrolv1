import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Headset, CheckCircle, Loader2 } from "lucide-react";

export default function ChamadoPublico() {
  const [formData, setFormData] = useState({
    tipo_solicitacao: "",
    solicitante_nome: "",
    solicitante_email: "",
    solicitante_area: "",
    solicitante_telefone: "",
    equipamento_atual: "",
    descricao_problema: "",
    urgencia: "Média",
  });
  const [success, setSuccess] = useState(false);

  const createChamadoMutation = useMutation({
    mutationFn: async (data) => {
      const numeroChamado = `CH${Date.now().toString().slice(-8)}`;
      return await base44.entities.Chamados.create({
        ...data,
        numero_chamado: numeroChamado,
        status: "Aberto",
        data_abertura: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          tipo_solicitacao: "",
          solicitante_nome: "",
          solicitante_email: "",
          solicitante_area: "",
          solicitante_telefone: "",
          equipamento_atual: "",
          descricao_problema: "",
          urgencia: "Média",
        });
      }, 3000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createChamadoMutation.mutate(formData);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Chamado Aberto!</h2>
            <p className="text-gray-600">
              Seu chamado foi registrado com sucesso. Nossa equipe entrará em contato em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Headset className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Abrir Chamado de Suporte
          </h1>
          <p className="text-gray-600">
            Descreva seu problema ou solicitação e nossa equipe irá atendê-lo
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="border-b bg-white">
            <CardTitle>Formulário de Chamado</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-5">
              <div>
                <Label>Tipo de Solicitação *</Label>
                <Select
                  required
                  value={formData.tipo_solicitacao}
                  onValueChange={(value) => setFormData({ ...formData, tipo_solicitacao: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de solicitação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Troca de Equipamento">Troca de Equipamento</SelectItem>
                    <SelectItem value="Novo Equipamento">Novo Equipamento</SelectItem>
                    <SelectItem value="Formatação">Formatação</SelectItem>
                    <SelectItem value="Manutenção">Manutenção</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Área/Departamento *</Label>
                  <Input
                    required
                    placeholder="Ex: Financeiro, TI, Vendas"
                    value={formData.solicitante_area}
                    onChange={(e) => setFormData({ ...formData, solicitante_area: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={formData.solicitante_telefone}
                    onChange={(e) => setFormData({ ...formData, solicitante_telefone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Equipamento Atual (se aplicável)</Label>
                <Input
                  placeholder="Ex: Notebook Dell Latitude, Desktop HP"
                  value={formData.equipamento_atual}
                  onChange={(e) => setFormData({ ...formData, equipamento_atual: e.target.value })}
                />
              </div>

              <div>
                <Label>Urgência *</Label>
                <Select
                  required
                  value={formData.urgencia}
                  onValueChange={(value) => setFormData({ ...formData, urgencia: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Descrição do Problema/Solicitação *</Label>
                <Textarea
                  required
                  placeholder="Descreva detalhadamente seu problema ou solicitação..."
                  value={formData.descricao_problema}
                  onChange={(e) => setFormData({ ...formData, descricao_problema: e.target.value })}
                  rows={5}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Importante:</strong> Após enviar, você receberá um número de chamado por email. 
                  Nossa equipe analisará sua solicitação e entrará em contato em até 24 horas.
                </p>
              </div>
            </CardContent>

            <div className="border-t p-6 bg-gray-50 flex justify-end">
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={createChamadoMutation.isLoading}
              >
                {createChamadoMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Abrir Chamado"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}