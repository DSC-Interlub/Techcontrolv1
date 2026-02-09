import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, FileText, Activity } from "lucide-react";
import UsuariosAnteriores from "./UsuariosAnteriores";
import AvaliacaoEquipamento from "./AvaliacaoEquipamento";
import { calcularAvaliacaoEquipamento } from "../utils/calcularAvaliacaoEquipamento";

export default function EquipamentoForm({ equipamento, onSubmit, onCancel, entityType }) {
  const [formData, setFormData] = useState(equipamento || {
    usuarios_anteriores: []
  });
  const [activeTab, setActiveTab] = useState("dados");

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  // Calcular tempo de uso automaticamente
  const calculateTimeInUse = (acquisitionDate) => {
    if (!acquisitionDate) return "";
    
    const today = new Date();
    const acquisition = new Date(acquisitionDate);
    const diffTime = Math.abs(today - acquisition);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return diffDays === 1 ? "1 dia" : `${diffDays} dias`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? "1 mês" : `${months} meses`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      if (remainingMonths === 0) {
        return years === 1 ? "1 ano" : `${years} anos`;
      }
      return `${years} ano${years > 1 ? 's' : ''} e ${remainingMonths} mês${remainingMonths > 1 ? 'es' : ''}`;
    }
  };

  // Para outros tipos de equipamento
  const renderUsuarioAtualField = () => {
    const colaboradoresOptions = [
      { value: "", label: "Nenhum (Disponível)" },
      ...colaboradores
        .filter(c => c.status === "Ativo")
        .map(c => ({
          value: c.nome_completo,
          label: `${c.nome_completo} - ${c.area}`
        }))
    ];

    return (
      <div>
        <Label>Usuário Atual</Label>
        <Combobox
          value={formData.usuario_atual || ""}
          onValueChange={(value) => {
            handleChange("usuario_atual", value);
            const colaborador = colaboradores.find(c => c.nome_completo === value);
            if (colaborador) {
              handleChange("area", colaborador.area);
            }
            // Define data atual como usuario_desde quando atribuir usuário
            if (value && !formData.usuario_desde) {
              handleChange("usuario_desde", new Date().toISOString().split('T')[0]);
            } else if (!value) {
              handleChange("usuario_desde", "");
            }
          }}
          options={colaboradoresOptions}
          placeholder="Selecione o colaborador"
          searchPlaceholder="Buscar colaborador..."
          emptyText="Nenhum colaborador encontrado"
        />
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Se está editando e o usuário mudou, adicionar ao histórico
    if (equipamento && equipamento.usuario_atual && equipamento.usuario_atual !== formData.usuario_atual) {
      const usuariosAnteriores = formData.usuarios_anteriores || equipamento.usuarios_anteriores || [];
      usuariosAnteriores.push({
        nome: equipamento.usuario_atual,
        data_inicio: equipamento.usuario_desde || equipamento.data_aquisicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });
      formData.usuarios_anteriores = usuariosAnteriores;
    }
    
    // Calcular score e recomendação se houver dados de avaliação
    if (entityType === "PCs_Internos" || entityType === "Notebooks_Externos") {
      const temAvaliacao = formData.avaliacao_uso_memoria || formData.avaliacao_desempenho || 
                          formData.avaliacao_atende_necessidades || formData.avaliacao_recomendacao_usuario;
      
      if (temAvaliacao) {
        const { score, recomendacao } = await calcularAvaliacaoEquipamento(formData, base44);
        formData.avaliacao_score = score;
        formData.avaliacao_recomendacao_sistema = recomendacao;
        formData.avaliacao_data = new Date().toISOString();
      }
    }
    
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderFieldsByType = () => {
    if (entityType === "PCs_Internos" || entityType === "Notebooks_Externos" || entityType === "Tablets") {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Data de Aquisição</Label>
              <Input
                type="date"
                value={formData.data_aquisicao || ""}
                onChange={(e) => {
                  const newDate = e.target.value;
                  handleChange("data_aquisicao", newDate);
                  handleChange("tempo_uso", calculateTimeInUse(newDate));
                }}
              />
            </div>
            <div>
              <Label>Tempo de Uso</Label>
              <Input
                placeholder="Calculado automaticamente"
                value={formData.tempo_uso || ""}
                readOnly
                className="bg-gray-50"
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
                  ) : entityType === "Tablets" ? (
                    <SelectItem value="Tablet">Tablet</SelectItem>
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
              <Combobox
                value={formData.usuario_atual || ""}
                onValueChange={(value) => {
                  handleChange("usuario_atual", value);
                  const colaborador = colaboradores.find(c => c.nome_completo === value);
                  if (colaborador) {
                    handleChange("area", colaborador.area);
                    if (entityType === "Notebooks_Externos" || entityType === "Tablets") {
                      handleChange("uf", colaborador.area);
                    }
                  }
                  // Define data atual como usuario_desde quando atribuir usuário
                  if (value && !formData.usuario_desde) {
                    handleChange("usuario_desde", new Date().toISOString().split('T')[0]);
                  } else if (!value) {
                    handleChange("usuario_desde", "");
                  }
                }}
                options={[
                  { value: "", label: "Nenhum (Disponível)" },
                  ...colaboradores
                    .filter(c => c.status === "Ativo")
                    .map(c => ({
                      value: c.nome_completo,
                      label: `${c.nome_completo} - ${c.area}`
                    }))
                ]}
                placeholder="Selecione o colaborador"
                searchPlaceholder="Buscar colaborador..."
                emptyText="Nenhum colaborador encontrado"
              />
            </div>
            <div>
              <Label>Usuário Desde</Label>
              <Input
                type="date"
                value={formData.usuario_desde || ""}
                onChange={(e) => handleChange("usuario_desde", e.target.value)}
                disabled={!formData.usuario_atual}
                className={!formData.usuario_atual ? "bg-gray-50" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Área {(entityType === "Notebooks_Externos" || entityType === "Tablets") ? "/ UF" : ""}</Label>
              <Input
                placeholder="Departamento ou área"
                value={(entityType === "Notebooks_Externos" || entityType === "Tablets") ? formData.uf || "" : formData.area || ""}
                onChange={(e) => handleChange((entityType === "Notebooks_Externos" || entityType === "Tablets") ? "uf" : "area", e.target.value)}
                className="bg-gray-50"
                readOnly
              />
            </div>
            <div></div>
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
                  {(entityType === "Notebooks_Externos" || entityType === "Tablets") && <SelectItem value="Reservado">Reservado</SelectItem>}
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                  <SelectItem value="Formatação">Formatação</SelectItem>
                  <SelectItem value="Danificado">Danificado</SelectItem>
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
            colaboradores={colaboradores}
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

    if (entityType === "Smartphones" || entityType === "Cameras" || entityType === "Coletores" || entityType === "Canetas_Vibracao") {
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
              <Label>Marca</Label>
              <Input
                placeholder="Marca do equipamento"
                value={formData.marca || ""}
                onChange={(e) => handleChange("marca", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Modelo</Label>
              <Input
                placeholder="Modelo"
                value={formData.modelo || ""}
                onChange={(e) => handleChange("modelo", e.target.value)}
              />
            </div>
            <div>
              <Label>Nota Fiscal</Label>
              <Input
                placeholder="Número da NF"
                value={formData.nota_fiscal || ""}
                onChange={(e) => handleChange("nota_fiscal", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderUsuarioAtualField()}
            <div>
              <Label>Usuário Desde</Label>
              <Input
                type="date"
                value={formData.usuario_desde || ""}
                onChange={(e) => handleChange("usuario_desde", e.target.value)}
                disabled={!formData.usuario_atual}
                className={!formData.usuario_atual ? "bg-gray-50" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Área</Label>
              <Input
                placeholder="Departamento ou área"
                value={formData.area || ""}
                onChange={(e) => handleChange("area", e.target.value)}
                className="bg-gray-50"
                readOnly
              />
            </div>
            <div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                  <SelectItem value="Danificado">Danificado</SelectItem>
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
              <Label>Etiqueta Interna</Label>
              <Input
                placeholder="Código"
                value={formData.etiqueta_interna || ""}
                onChange={(e) => handleChange("etiqueta_interna", e.target.value)}
              />
            </div>
          </div>

          <UsuariosAnteriores
            usuarios={formData.usuarios_anteriores || []}
            onChange={(usuarios) => handleChange("usuarios_anteriores", usuarios)}
            colaboradores={colaboradores}
          />

          <div>
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações gerais"
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

  const podeAvaliar = entityType === "PCs_Internos" || entityType === "Notebooks_Externos";
  const eComputador = formData.tipo === "Desktop" || formData.tipo === "Notebook";

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
        <CardContent className="pt-6">
          {podeAvaliar && eComputador ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="dados" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Dados do Equipamento
                </TabsTrigger>
                <TabsTrigger value="avaliacao" className="gap-2">
                  <Activity className="w-4 h-4" />
                  Avaliação do Equipamento
                </TabsTrigger>
              </TabsList>
              <TabsContent value="dados" className="space-y-4">
                {renderFieldsByType()}
              </TabsContent>
              <TabsContent value="avaliacao">
                <AvaliacaoEquipamento 
                  equipamento={formData} 
                  onChange={setFormData}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              {renderFieldsByType()}
            </div>
          )}
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