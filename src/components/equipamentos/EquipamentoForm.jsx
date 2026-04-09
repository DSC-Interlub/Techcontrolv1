import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { X, FileText, Activity, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsuariosAnteriores from "./UsuariosAnteriores";
import AvaliacaoEquipamento from "./AvaliacaoEquipamento";


export default function EquipamentoForm({ equipamento, onSubmit, onCancel, entityType }) {
  const [formData, setFormData] = useState(equipamento || {
    usuarios_anteriores: []
  });
  const [novaFormatacao, setNovaFormatacao] = useState({ data_formatacao: "", observacoes: "" });
  const [showFormatacaoForm, setShowFormatacaoForm] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");
  const [avaliacaoExpandida, setAvaliacaoExpandida] = useState(null);
  const queryClient = useQueryClient();

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['avaliacoes', equipamento?.id],
    queryFn: async () => {
      if (!equipamento?.id) return [];
      const avaliacoes = await base44.entities.Avaliacoes.filter({
        equipamento_id: equipamento.id,
        equipamento_tipo: entityType
      }, '-data_avaliacao');
      return avaliacoes;
    },
    enabled: !!equipamento?.id,
  });

  const salvarAvaliacaoMutation = useMutation({
    mutationFn: async (dadosAvaliacao) => {
      const user = await base44.auth.me();
      const numeroAvaliacao = avaliacoes.length + 1;
      
      const avaliacaoData = {
        equipamento_id: equipamento.id,
        equipamento_tipo: entityType,
        equipamento_nome: `${formData.marca || ''} ${formData.modelo || ''}`.trim(),
        usuario_equipamento: formData.usuario_atual || '',
        numero_avaliacao: numeroAvaliacao,
        ...dadosAvaliacao,
        data_avaliacao: new Date().toISOString(),
        avaliador: user.email,
      };

      return base44.entities.Avaliacoes.create(avaliacaoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['avaliacoes', equipamento?.id]);
      queryClient.invalidateQueries(['avaliacoes']);
      alert('Avaliação salva com sucesso!');
    },
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

  const handleSubmit = (e) => {
    e.preventDefault();

    let dataToSubmit = { ...formData };

    if (equipamento && equipamento.usuario_atual && equipamento.usuario_atual !== dataToSubmit.usuario_atual) {
      const usuariosAnteriores = dataToSubmit.usuarios_anteriores || equipamento.usuarios_anteriores || [];
      usuariosAnteriores.push({
        nome: equipamento.usuario_atual,
        data_inicio: equipamento.usuario_desde || equipamento.data_aquisicao || "",
        data_fim: new Date().toISOString().split('T')[0]
      });
      dataToSubmit.usuarios_anteriores = usuariosAnteriores;
    }

    const fieldsToRemove = [
      'id',
      'created_date',
      'updated_date',
      'created_by_id',
      'created_by',
      'is_sample',
      'entity_name',
      'app_id',
      'tempo_uso',
      'origem'
    ];

    const cleanData = {};
    for (const key in dataToSubmit) {
      if (!fieldsToRemove.includes(key) && dataToSubmit[key] !== undefined) {
        cleanData[key] = dataToSubmit[key];
      }
    }

    onSubmit(cleanData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSalvarAvaliacao = async (dadosAvaliacao) => {
    await salvarAvaliacaoMutation.mutateAsync(dadosAvaliacao);
  };

  const calcTempoUso = (acquisitionDate) => {
    if (!acquisitionDate) return "Data de aquisição não informada";
    const today = new Date();
    const acquisition = new Date(acquisitionDate);
    const diffDays = Math.ceil(Math.abs(today - acquisition) / (1000 * 60 * 60 * 24));
    if (diffDays < 30) return diffDays === 1 ? "1 dia" : `${diffDays} dias`;
    if (diffDays < 365) { const m = Math.floor(diffDays / 30); return m === 1 ? "1 mês" : `${m} meses`; }
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    return months === 0 ? `${years} ano${years > 1 ? 's' : ''}` : `${years} ano${years > 1 ? 's' : ''} e ${months} mês${months > 1 ? 'es' : ''}`;
  };

  const adicionarFormatacao = () => {
    if (!novaFormatacao.data_formatacao) return;
    const historico = [...(formData.historico_formatacoes || [])];
    historico.push({ ...novaFormatacao });
    historico.sort((a, b) => new Date(b.data_formatacao) - new Date(a.data_formatacao));
    const dataRecente = historico[0]?.data_formatacao || novaFormatacao.data_formatacao;
    handleChange("historico_formatacoes", historico);
    handleChange("data_formatacao", dataRecente);
    setNovaFormatacao({ data_formatacao: "", observacoes: "" });
    setShowFormatacaoForm(false);
  };

  const removerFormatacao = (idx) => {
    const historico = (formData.historico_formatacoes || []).filter((_, i) => i !== idx);
    handleChange("historico_formatacoes", historico);
    handleChange("data_formatacao", historico[0]?.data_formatacao || "");
  };

  const podeAvaliar = (entityType === "PCs_Internos" || entityType === "Notebooks_Externos") &&
                       (formData.tipo === "Desktop" || formData.tipo === "Notebook") &&
                       equipamento?.id;

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
                value={calcTempoUso(formData.data_aquisicao)}
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
            <div></div>
          </div>

          {/* Histórico de Formatações */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Histórico de Formatações</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowFormatacaoForm(v => !v)} className="gap-1 text-xs">
                <Plus className="w-3 h-3" />
                Registrar Formatação
              </Button>
            </div>
            {showFormatacaoForm && (
              <div className="bg-gray-50 rounded p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={novaFormatacao.data_formatacao} onChange={e => setNovaFormatacao(v => ({ ...v, data_formatacao: e.target.value }))} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Observações</Label>
                    <Input placeholder="Ex: Office 365 instalado" value={novaFormatacao.observacoes} onChange={e => setNovaFormatacao(v => ({ ...v, observacoes: e.target.value }))} className="h-8" />
                  </div>
                </div>
                <Button type="button" size="sm" onClick={adicionarFormatacao} disabled={!novaFormatacao.data_formatacao} className="w-full">
                  Adicionar
                </Button>
              </div>
            )}
            {(formData.historico_formatacoes || []).length === 0 ? (
              <p className="text-xs text-gray-400">Nenhuma formatação registrada</p>
            ) : (
              <div className="space-y-1">
                {(formData.historico_formatacoes || []).map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-white border rounded px-3 py-1.5 text-sm">
                    <div>
                      <span className="font-medium">{new Date(f.data_formatacao).toLocaleDateString('pt-BR')}</span>
                      {f.observacoes && <span className="text-gray-500 ml-2">{f.observacoes}</span>}
                      {i === 0 && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1 rounded">Última</span>}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removerFormatacao(i)}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
          {podeAvaliar ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="dados" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Dados do Equipamento
                </TabsTrigger>
                <TabsTrigger value="avaliacao" className="gap-2">
                  <Activity className="w-4 h-4" />
                  Avaliação de Saúde
                </TabsTrigger>
              </TabsList>
              <TabsContent value="dados" className="space-y-4">
                {renderFieldsByType()}
              </TabsContent>
              <TabsContent value="avaliacao" className="space-y-4">
                {avaliacoes.length > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        Histórico de Avaliações ({avaliacoes.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {avaliacoes.map((av, index) => (
                        <div key={av.id}>
                          <div 
                            onClick={() => setAvaliacaoExpandida(avaliacaoExpandida === av.id ? null : av.id)}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{av.numero_avaliacao || (avaliacoes.length - index)}ª Avaliação</p>
                              <p className="text-xs text-gray-600">
                                {new Date(av.data_avaliacao).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })} - {av.avaliador}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={
                                av.classificacao === "Manter" ? "bg-green-100 text-green-800" :
                                av.classificacao === "Upgrade" ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              }>
                                {av.classificacao}
                              </Badge>
                              <span className="text-lg font-bold text-gray-700">{av.pontuacao_total} pts</span>
                            </div>
                          </div>
                          
                          {avaliacaoExpandida === av.id && (
                            <div className="mt-2 p-4 bg-gray-50 rounded-lg border text-sm space-y-2">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="font-semibold text-gray-700">Memória RAM:</p>
                                  <p className="text-gray-600">{av.memoria_ram || "—"}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-700">Armazenamento:</p>
                                  <p className="text-gray-600">{av.tipo_armazenamento || "—"}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-700">Espaço em Disco:</p>
                                  <p className="text-gray-600">{av.espaco_disco || "—"}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-700">Windows:</p>
                                  <p className="text-gray-600">{av.versao_windows || "—"}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-700">Antivírus:</p>
                                  <p className="text-gray-600">{av.antivirus || "—"}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-700">Desempenho:</p>
                                  <p className="text-gray-600">{av.desempenho || "—"}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-700">Atende Trabalho:</p>
                                  <p className="text-gray-600">{av.atende_trabalho || "—"}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-700">Satisfação:</p>
                                  <p className="text-gray-600">{av.satisfacao || "—"}</p>
                                </div>
                              </div>
                              {av.problemas && av.problemas.length > 0 && (
                                <div>
                                  <p className="font-semibold text-gray-700">Problemas:</p>
                                  <ul className="list-disc list-inside text-gray-600">
                                    {av.problemas.map((prob, i) => (
                                      <li key={i}>{prob}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {av.recomendacao_usuario && (
                                <div>
                                  <p className="font-semibold text-gray-700">Recomendação do Usuário:</p>
                                  <p className="text-gray-600">{av.recomendacao_usuario}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Activity className="w-6 h-6 text-blue-600" />
                      Nova Avaliação ({avaliacoes.length + 1}ª)
                    </CardTitle>
                  </CardHeader>
                </Card>
                
                <AvaliacaoEquipamento
                  equipamento={equipamento}
                  entityType={entityType}
                  avaliacaoExistente={null}
                  onSalvar={handleSalvarAvaliacao}
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