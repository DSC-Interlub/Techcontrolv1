import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import UsuariosAnteriores from "./UsuariosAnteriores";

export default function EquipamentoForm({ equipamento, onSubmit, onCancel, entityType }) {
  const [formData, setFormData] = useState(equipamento || {
    usuarios_anteriores: []
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderFieldsByType = () => {
    if (entityType === "PCs_Internos" || entityType === "Notebooks_Externos") {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Data de Aquisição</Label>
              <Input
                type="date"
                value={formData.data_aquisicao || ""}
                onChange={(e) => handleChange("data_aquisicao", e.target.value)}
              />
            </div>
            <div>
              <Label>Tempo de Uso</Label>
              <Input
                placeholder="Ex: 2 anos"
                value={formData.tempo_uso || ""}
                onChange={(e) => handleChange("tempo_uso", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select
                value={formData.tipo || ""}
                onValueChange={(value) => handleChange("tipo", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {entityType === "PCs_Internos" ? (
                    <>
                      <SelectItem value="Monitor">Monitor</SelectItem>
                      <SelectItem value="Desktop">Desktop</SelectItem>
                      <SelectItem value="Notebook">Notebook</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Notebook">Notebook</SelectItem>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marca</Label>
              <Input
                placeholder="Ex: Dell, HP, Lenovo"
                value={formData.marca || ""}
                onChange={(e) => handleChange("marca", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Modelo</Label>
              <Input
                placeholder="Modelo do equipamento"
                value={formData.modelo || ""}
                onChange={(e) => handleChange("modelo", e.target.value)}
              />
            </div>
            <div>
              <Label>Processador</Label>
              <Input
                placeholder="Ex: Intel i5, AMD Ryzen"
                value={formData.processador || ""}
                onChange={(e) => handleChange("processador", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nota Fiscal</Label>
              <Input
                placeholder="Número da NF"
                value={formData.nota_fiscal || ""}
                onChange={(e) => handleChange("nota_fiscal", e.target.value)}
              />
            </div>
            <div>
              <Label>Etiqueta Interna</Label>
              <Input
                placeholder="Código de identificação"
                value={formData.etiqueta_interna || ""}
                onChange={(e) => handleChange("etiqueta_interna", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Service Tag / Serial Number</Label>
              <Input
                placeholder="Service Tag Dell ou Serial"
                value={formData.service_tag || ""}
                onChange={(e) => handleChange("service_tag", e.target.value)}
              />
            </div>
            <div>
              <Label>Office</Label>
              <Input
                placeholder="Ex: Office 2021"
                value={formData.office || ""}
                onChange={(e) => handleChange("office", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Usuário Atual</Label>
              <Select
                value={formData.usuario_atual || ""}
                onValueChange={(value) => {
                  handleChange("usuario_atual", value);
                  const colaborador = colaboradores.find(c => c.nome_completo === value);
                  if (colaborador && entityType !== "Notebooks_Externos") {
                    handleChange("area", colaborador.area);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum (Disponível)</SelectItem>
                  {colaboradores.filter(c => c.status === "Ativo").map((colaborador) => (
                    <SelectItem key={colaborador.id} value={colaborador.nome_completo}>
                      {colaborador.nome_completo} - {colaborador.area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Área {entityType === "Notebooks_Externos" ? "/ UF" : ""}</Label>
              <Input
                placeholder="Departamento ou área"
                value={formData.area || entityType === "Notebooks_Externos" ? formData.uf || "" : ""}
                onChange={(e) => handleChange(entityType === "Notebooks_Externos" ? "uf" : "area", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status || "Disponível"}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Disponível">Disponível</SelectItem>
                  <SelectItem value="Em uso">Em uso</SelectItem>
                  {entityType === "Notebooks_Externos" && <SelectItem value="Reservado">Reservado</SelectItem>}
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                  <SelectItem value="Formatação">Formatação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condição</Label>
              <Select
                value={formData.condicao || ""}
                onValueChange={(value) => handleChange("condicao", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rápido">Rápido</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Lento">Lento</SelectItem>
                  <SelectItem value="Com Problema">Com Problema</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Antivírus</Label>
              <Select
                value={formData.antivirus || "Não"}
                onValueChange={(value) => handleChange("antivirus", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                  <SelectItem value="Não se aplica">Não se aplica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de Formatação</Label>
              <Input
                type="date"
                value={formData.data_formatacao || ""}
                onChange={(e) => handleChange("data_formatacao", e.target.value)}
              />
            </div>
          </div>

          <UsuariosAnteriores
            usuarios={formData.usuarios_anteriores || []}
            onChange={(usuarios) => handleChange("usuarios_anteriores", usuarios)}
          />

          <div>
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações gerais sobre o equipamento"
              value={formData.observacoes || ""}
              onChange={(e) => handleChange("observacoes", e.target.value)}
              rows={3}
            />
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>
            {equipamento ? "Editar Equipamento" : "Novo Equipamento"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-4">
          {renderFieldsByType()}
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            {equipamento ? "Atualizar" : "Criar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}