import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Headset, CheckCircle, Loader2, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ChamadoPublico() {
  const [formData, setFormData] = useState({
    tipo_solicitacao: "",
    sistema_tipo: "",
    sistema_subtipo: "",
    impressora_subtipo: "",
    equipamento_subtipo: "",
    equipamento_outros_detalhes: "",
    melhorias_detalhes: "",
    solicitante_nome: "",
    solicitante_email: "",
    solicitante_area: "",
    solicitante_telefone: "",
    equipamento_atual: "",
    descricao_problema: "",
    urgencia: "Média",
  });
  const [success, setSuccess] = useState(false);
  const [searchNome, setSearchNome] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [usuariosSugeridos, setUsuariosSugeridos] = useState([]);
  const [equipamentosUsuario, setEquipamentosUsuario] = useState([]);

  // Buscar todos os equipamentos
  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['pcs_internos_publico'],
    queryFn: async () => {
      try {
        return await base44.entities.PCs_Internos.list();
      } catch (error) {
        return [];
      }
    },
  });

  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['notebooks_externos_publico'],
    queryFn: async () => {
      try {
        return await base44.entities.Notebooks_Externos.list();
      } catch (error) {
        return [];
      }
    },
  });

  const { data: smartphones = [] } = useQuery({
    queryKey: ['smartphones_publico'],
    queryFn: async () => {
      try {
        return await base44.entities.Smartphones.list();
      } catch (error) {
        return [];
      }
    },
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras_publico'],
    queryFn: async () => {
      try {
        return await base44.entities.Cameras.list();
      } catch (error) {
        return [];
      }
    },
  });

  const { data: coletores = [] } = useQuery({
    queryKey: ['coletores_publico'],
    queryFn: async () => {
      try {
        return await base44.entities.Coletores.list();
      } catch (error) {
        return [];
      }
    },
  });

  const { data: canetasVibracao = [] } = useQuery({
    queryKey: ['canetas_vibracao_publico'],
    queryFn: async () => {
      try {
        return await base44.entities.Canetas_Vibracao.list();
      } catch (error) {
        return [];
      }
    },
  });

  // Função para normalizar nomes
  const normalizeString = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Buscar usuários únicos quando o nome for digitado
  useEffect(() => {
    if (searchNome.length < 2) {
      setUsuariosSugeridos([]);
      setShowSuggestions(false);
      return;
    }

    const todosEquipamentos = [
      ...pcsInternos,
      ...notebooksExternos,
      ...smartphones,
      ...cameras,
      ...coletores,
      ...canetasVibracao
    ];

    // Extrair nomes únicos
    const nomesUnicos = new Set();
    todosEquipamentos.forEach(eq => {
      if (eq.usuario_atual && eq.usuario_atual.trim() !== "") {
        nomesUnicos.add(eq.usuario_atual.trim());
      }
    });

    // Filtrar nomes que contêm o texto digitado
    const searchNormalized = normalizeString(searchNome);
    const sugestoes = Array.from(nomesUnicos)
      .filter(nome => normalizeString(nome).includes(searchNormalized))
      .sort()
      .slice(0, 5); // Máximo 5 sugestões

    setUsuariosSugeridos(sugestoes);
    setShowSuggestions(sugestoes.length > 0);
  }, [searchNome, pcsInternos, notebooksExternos, smartphones, cameras, coletores, canetasVibracao]);

  // Buscar equipamentos do usuário selecionado
  const buscarEquipamentosUsuario = (nomeUsuario) => {
    const equipamentos = [];

    const addEquipamento = (eq, tipo) => {
      if (eq.usuario_atual && normalizeString(eq.usuario_atual) === normalizeString(nomeUsuario)) {
        equipamentos.push({
          tipo: tipo,
          marca: eq.marca || "",
          modelo: eq.modelo || "",
          etiqueta: eq.etiqueta_interna || eq.numero_sequencial || ""
        });
      }
    };

    pcsInternos.forEach(eq => addEquipamento(eq, eq.tipo || "PC"));
    notebooksExternos.forEach(eq => addEquipamento(eq, "Notebook Externo"));
    smartphones.forEach(eq => addEquipamento(eq, "Smartphone"));
    cameras.forEach(eq => addEquipamento(eq, "Câmera"));
    coletores.forEach(eq => addEquipamento(eq, "Coletor"));
    canetasVibracao.forEach(eq => addEquipamento(eq, "Caneta Vibração"));

    return equipamentos;
  };

  const handleSelectUsuario = (nome) => {
    setSearchNome(nome);
    setFormData({ ...formData, solicitante_nome: nome });
    setShowSuggestions(false);
    
    const equipamentos = buscarEquipamentosUsuario(nome);
    setEquipamentosUsuario(equipamentos);
  };

  const createChamadoMutation = useMutation({
    mutationFn: async (data) => {
      const numeroChamado = `CH${Date.now().toString().slice(-8)}`;
      return await base44.entities.Chamados.create({
        ...data,
        numero_chamado: numeroChamado,
        status: "Aberto",
        data_abertura: new Date().toISOString().split('T')[0],
        equipamentos_usuario: equipamentosUsuario,
      });
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          tipo_solicitacao: "",
          sistema_tipo: "",
          sistema_subtipo: "",
          impressora_subtipo: "",
          equipamento_subtipo: "",
          equipamento_outros_detalhes: "",
          melhorias_detalhes: "",
          solicitante_nome: "",
          solicitante_email: "",
          solicitante_area: "",
          solicitante_telefone: "",
          equipamento_atual: "",
          descricao_problema: "",
          urgencia: "Média",
        });
        setSearchNome("");
        setEquipamentosUsuario([]);
      }, 3000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createChamadoMutation.mutate(formData);
  };

  // Reset sub-campos quando o tipo principal muda
  const handleTipoChange = (value) => {
    setFormData({
      ...formData,
      tipo_solicitacao: value,
      sistema_tipo: "",
      sistema_subtipo: "",
      impressora_subtipo: "",
      equipamento_subtipo: "",
      equipamento_outros_detalhes: "",
      melhorias_detalhes: "",
    });
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
              {/* Tipo de Solicitação */}
              <div>
                <Label>Tipo de Solicitação *</Label>
                <Select
                  required
                  value={formData.tipo_solicitacao}
                  onValueChange={handleTipoChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de solicitação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sistema">Sistema</SelectItem>
                    <SelectItem value="Impressora">Impressora</SelectItem>
                    <SelectItem value="Equipamento">Equipamento</SelectItem>
                    <SelectItem value="Melhorias">Melhorias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sub-opções para SISTEMA */}
              {formData.tipo_solicitacao === "Sistema" && (
                <>
                  <div>
                    <Label>Qual Sistema? *</Label>
                    <Select
                      required
                      value={formData.sistema_tipo}
                      onValueChange={(value) => setFormData({ ...formData, sistema_tipo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o sistema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WMS">WMS</SelectItem>
                        <SelectItem value="Portal de Vendas">Portal de Vendas</SelectItem>
                        <SelectItem value="SAP">SAP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.sistema_tipo && (
                    <div>
                      <Label>Tipo de Problema *</Label>
                      <Select
                        required
                        value={formData.sistema_subtipo}
                        onValueChange={(value) => setFormData({ ...formData, sistema_subtipo: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Problema no Sistema">Problema no Sistema</SelectItem>
                          <SelectItem value="Nova Implementação no Sistema">Nova Implementação no Sistema</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {/* Sub-opções para IMPRESSORA */}
              {formData.tipo_solicitacao === "Impressora" && (
                <div>
                  <Label>Problema com Impressora *</Label>
                  <Select
                    required
                    value={formData.impressora_subtipo}
                    onValueChange={(value) => setFormData({ ...formData, impressora_subtipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o problema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Troca de Cartucho ou Toner">Troca de Cartucho ou Toner</SelectItem>
                      <SelectItem value="Problemas na Impressora">Problemas na Impressora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sub-opções para EQUIPAMENTO */}
              {formData.tipo_solicitacao === "Equipamento" && (
                <>
                  <div>
                    <Label>Problema com Equipamento *</Label>
                    <Select
                      required
                      value={formData.equipamento_subtipo}
                      onValueChange={(value) => setFormData({ ...formData, equipamento_subtipo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o problema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lentidão no Computador">Lentidão no Computador</SelectItem>
                        <SelectItem value="Problemas no Monitor, Mouse ou Teclado">Problemas no Monitor, Mouse ou Teclado</SelectItem>
                        <SelectItem value="Problemas na Máquina">Problemas na Máquina</SelectItem>
                        <SelectItem value="Formatação">Formatação</SelectItem>
                        <SelectItem value="Solicitar Troca de Equipamento">Solicitar Troca de Equipamento</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.equipamento_subtipo === "Outros" && (
                    <div>
                      <Label>Descreva o Problema *</Label>
                      <Textarea
                        required
                        placeholder="Descreva detalhadamente o problema..."
                        value={formData.equipamento_outros_detalhes}
                        onChange={(e) => setFormData({ ...formData, equipamento_outros_detalhes: e.target.value })}
                        rows={3}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Campo para MELHORIAS */}
              {formData.tipo_solicitacao === "Melhorias" && (
                <div>
                  <Label>Descreva a Melhoria Desejada *</Label>
                  <Textarea
                    required
                    placeholder="Descreva detalhadamente a melhoria que você gostaria de ver implementada..."
                    value={formData.melhorias_detalhes}
                    onChange={(e) => setFormData({ ...formData, melhorias_detalhes: e.target.value })}
                    rows={4}
                  />
                </div>
              )}

              {/* Dados do Solicitante */}
              <div className="border-t pt-5 mt-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Seus Dados</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Label>Nome Completo *</Label>
                    <Input
                      required
                      placeholder="Digite seu nome"
                      value={searchNome}
                      onChange={(e) => {
                        setSearchNome(e.target.value);
                        setFormData({ ...formData, solicitante_nome: e.target.value });
                      }}
                      onFocus={() => searchNome.length >= 2 && setShowSuggestions(true)}
                    />
                    {showSuggestions && usuariosSugeridos.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {usuariosSugeridos.map((nome, idx) => (
                          <div
                            key={idx}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                            onClick={() => handleSelectUsuario(nome)}
                          >
                            <p className="font-medium text-gray-900">{nome}</p>
                          </div>
                        ))}
                      </div>
                    )}
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

                <div className="grid md:grid-cols-2 gap-4 mt-4">
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
              </div>

              {/* Equipamentos do Usuário */}
              {equipamentosUsuario.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Laptop className="w-4 h-4" />
                    Seus Equipamentos Cadastrados
                  </h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {equipamentosUsuario.map((eq, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-blue-100">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge variant="outline" className="text-xs mb-1">{eq.tipo}</Badge>
                            <p className="text-sm font-medium text-gray-900">{eq.marca} {eq.modelo}</p>
                            {eq.etiqueta && (
                              <p className="text-xs text-gray-500 mt-1">Etiqueta: {eq.etiqueta}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Equipamento Atual (opcional)</Label>
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
                <Label>Descrição Adicional do Problema *</Label>
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