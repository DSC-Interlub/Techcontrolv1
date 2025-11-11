
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Headset, CheckCircle, Loader2, Laptop, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ChamadoPublico() {
  const [formData, setFormData] = useState({
    tipo_solicitacao: "",
    sistema_tipo: "",
    sistema_subtipo: "",
    impressora_subtipo: "",
    equipamento_subtipo: "",
    equipamento_selecionado: "",
    equipamento_outros_detalhes: "",
    melhorias_detalhes: "",
    desenvolvimento_detalhes: "",
    servidor_subtipo: "",
    solicitante_nome: "",
    solicitante_email: "",
    solicitante_area: "",
    solicitante_telefone: "",
    equipamento_atual: "",
    descricao_problema: "",
    urgencia: "Média",
  });
  const [success, setSuccess] = useState(false);
  const [numeroChamado, setNumeroChamado] = useState("");
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

    const addEquipamento = (eq, tipo, entityId) => {
      if (eq.usuario_atual && normalizeString(eq.usuario_atual) === normalizeString(nomeUsuario)) {
        equipamentos.push({
          id: entityId,
          tipo: tipo,
          marca: eq.marca || "",
          modelo: eq.modelo || "",
          etiqueta: eq.etiqueta_interna || eq.numero_sequencial || "",
          displayName: `${tipo} - ${eq.marca} ${eq.modelo}${eq.etiqueta_interna ? ` (${eq.etiqueta_interna})` : ''}`
        });
      }
    };

    pcsInternos.forEach(eq => addEquipamento(eq, eq.tipo || "PC", eq.id));
    notebooksExternos.forEach(eq => addEquipamento(eq, "Notebook Externo", eq.id));
    smartphones.forEach(eq => addEquipamento(eq, "Smartphone", eq.id));
    cameras.forEach(eq => addEquipamento(eq, "Câmera", eq.id));
    coletores.forEach(eq => addEquipamento(eq, "Coletor", eq.id));
    canetasVibracao.forEach(eq => addEquipamento(eq, "Caneta Vibração", eq.id));

    return equipamentos;
  };

  const handleSelectUsuario = (nome) => {
    setSearchNome(nome);
    setFormData({ ...formData, solicitante_nome: nome, equipamento_selecionado: "" });
    setShowSuggestions(false);
    
    const equipamentos = buscarEquipamentosUsuario(nome);
    setEquipamentosUsuario(equipamentos);
  };

  const getTipoCompleto = (data) => {
    let detalhes = data.tipo_solicitacao || "";
    
    if (data.tipo_solicitacao === "Sistema") {
      if (data.sistema_tipo) detalhes += ` - ${data.sistema_tipo}`;
      if (data.sistema_subtipo) detalhes += ` (${data.sistema_subtipo})`;
    } else if (data.tipo_solicitacao === "Impressora") {
      if (data.impressora_subtipo) detalhes += ` - ${data.impressora_subtipo}`;
    } else if (data.tipo_solicitacao === "Equipamento") {
      if (data.equipamento_subtipo) detalhes += ` - ${data.equipamento_subtipo}`;
      if (data.equipamento_selecionado) detalhes += `<br><small>Equipamento: ${data.equipamento_selecionado}</small>`;
    } else if (data.tipo_solicitacao === "Servidor") {
      if (data.servidor_subtipo) detalhes += ` - ${data.servidor_subtipo}`;
    }
    
    return detalhes;
  };

  const createChamadoMutation = useMutation({
    mutationFn: async (data) => {
      const numeroChamado = `CH${Date.now().toString().slice(-8)}`;
      
      // Criar o chamado
      const chamado = await base44.entities.Chamados.create({
        ...data,
        numero_chamado: numeroChamado,
        status: "Aberto",
        data_abertura: new Date().toISOString().split('T')[0],
        equipamentos_usuario: equipamentosUsuario,
      });

      // Enviar email com o número do chamado
      try {
        await base44.integrations.Core.SendEmail({
          from_name: "TechControl - Suporte",
          to: data.solicitante_email,
          subject: `✅ Chamado ${numeroChamado} Aberto com Sucesso`,
          body: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c61 100%); padding: 30px 20px; text-align: center;">
                    <div style="background-color: white; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 30px;">✅</span>
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 600;">Chamado Aberto com Sucesso!</h1>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 30px 25px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Olá, <strong>${data.solicitante_nome}</strong>!
                    </p>
                    
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                      Seu chamado foi registrado com sucesso em nosso sistema de suporte.
                    </p>
                    
                    <!-- Número do Chamado -->
                    <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffe8a3 100%); border-left: 4px solid #ff6b35; padding: 20px; margin: 25px 0; border-radius: 8px;">
                      <p style="color: #856404; font-size: 13px; font-weight: 600; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 1px;">
                        📋 Número do Chamado
                      </p>
                      <p style="color: #333; font-size: 28px; font-weight: bold; margin: 0; font-family: 'Courier New', monospace;">
                        ${numeroChamado}
                      </p>
                    </div>
                    
                    <!-- Detalhes -->
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <h3 style="color: #333; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">📊 Detalhes da Solicitação</h3>
                      
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                            <span style="color: #666; font-size: 14px;">Tipo:</span>
                          </td>
                          <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">
                            <span style="color: #333; font-size: 14px; font-weight: 600;">${getTipoCompleto(data)}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                            <span style="color: #666; font-size: 14px;">Urgência:</span>
                          </td>
                          <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">
                            <span style="color: ${data.urgencia === 'Urgente' ? '#dc3545' : data.urgencia === 'Alta' ? '#fd7e14' : data.urgencia === 'Média' ? '#ffc107' : '#17a2b8'}; font-size: 14px; font-weight: 600;">
                              ${data.urgencia}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                            <span style="color: #666; font-size: 14px;">Área:</span>
                          </td>
                          <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">
                            <span style="color: #333; font-size: 14px; font-weight: 600;">${data.solicitante_area}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0;">
                            <span style="color: #666; font-size: 14px;">Data de Abertura:</span>
                          </td>
                          <td style="padding: 10px 0; text-align: right;">
                            <span style="color: #333; font-size: 14px; font-weight: 600;">${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    ${data.descricao_problema ? `
                    <div style="margin: 20px 0;">
                      <h3 style="color: #333; font-size: 16px; margin: 0 0 10px 0; font-weight: 600;">📝 Descrição</h3>
                      <p style="color: #666; font-size: 14px; line-height: 1.6; background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 0;">
                        ${data.descricao_problema}
                      </p>
                    </div>
                    ` : ''}
                    
                    <!-- Info Box -->
                    <div style="background-color: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 25px 0; border-radius: 6px;">
                      <p style="color: #004085; font-size: 14px; line-height: 1.6; margin: 0;">
                        <strong>⏱️ Próximos Passos:</strong><br>
                        Nossa equipe técnica analisará sua solicitação e entrará em contato em até 24 horas úteis. 
                        Você receberá atualizações por email sempre que houver mudanças no status do chamado.
                      </p>
                    </div>
                    
                    <p style="color: #999; font-size: 13px; line-height: 1.6; margin: 25px 0 0 0; text-align: center;">
                      Este é um email automático do sistema TechControl.<br>
                      Por favor, não responda diretamente a este email.
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999; font-size: 12px; margin: 0;">
                      <strong>TechControl</strong> - Sistema de Gestão de Equipamentos<br>
                      © ${new Date().getFullYear()} Todos os direitos reservados
                    </p>
                  </div>
                  
                </div>
              </body>
            </html>
          `
        });
        
        console.log('✅ Email de abertura enviado com sucesso para:', data.solicitante_email);
      } catch (emailError) {
        console.error('❌ Erro ao enviar email de abertura:', emailError);
        // Não bloqueia a criação do chamado se o email falhar
      }

      return { chamado, numeroChamado };
    },
    onSuccess: (data) => {
      setNumeroChamado(data.numeroChamado);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setNumeroChamado("");
        setFormData({
          tipo_solicitacao: "",
          sistema_tipo: "",
          sistema_subtipo: "",
          impressora_subtipo: "",
          equipamento_subtipo: "",
          equipamento_selecionado: "",
          equipamento_outros_detalhes: "",
          melhorias_detalhes: "",
          desenvolvimento_detalhes: "",
          servidor_subtipo: "",
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
      }, 5000);
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
      equipamento_selecionado: "",
      equipamento_outros_detalhes: "",
      melhorias_detalhes: "",
      desenvolvimento_detalhes: "",
      servidor_subtipo: "",
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
              <p className="text-sm text-yellow-800 mb-2">
                <strong>Número do Chamado:</strong>
              </p>
              <p className="text-2xl font-bold text-yellow-900">{numeroChamado}</p>
            </div>
            <p className="text-gray-600 mb-2">
              Seu chamado foi registrado com sucesso.
            </p>
            <p className="text-sm text-gray-500">
              Um email de confirmação com o número do chamado foi enviado para <strong>{formData.solicitante_email}</strong>
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
                    <SelectItem value="Desenvolvimento">Desenvolvimento</SelectItem>
                    <SelectItem value="Servidor">Servidor</SelectItem>
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
                      <SelectItem value="Problema na Impressora">Problema na Impressora</SelectItem>
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
                        <SelectItem value="Problema no Monitor, Mouse ou Teclado">Problema no Monitor, Mouse ou Teclado</SelectItem>
                        <SelectItem value="Problema na Máquina">Problema na Máquina</SelectItem>
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

              {/* Campo para DESENVOLVIMENTO */}
              {formData.tipo_solicitacao === "Desenvolvimento" && (
                <div>
                  <Label>Descreva o Desenvolvimento Necessário *</Label>
                  <Textarea
                    required
                    placeholder="Descreva detalhadamente o desenvolvimento ou funcionalidade que você precisa..."
                    value={formData.desenvolvimento_detalhes}
                    onChange={(e) => setFormData({ ...formData, desenvolvimento_detalhes: e.target.value })}
                    rows={4}
                  />
                </div>
              )}

              {/* Sub-opções para SERVIDOR */}
              {formData.tipo_solicitacao === "Servidor" && (
                <div>
                  <Label>Problema com Servidor *</Label>
                  <Select
                    required
                    value={formData.servidor_subtipo}
                    onValueChange={(value) => setFormData({ ...formData, servidor_subtipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o problema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rede">Rede</SelectItem>
                      <SelectItem value="Internet">Internet</SelectItem>
                    </SelectContent>
                  </Select>
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

              {/* Seleção de Equipamento quando tipo = Equipamento */}
              {formData.tipo_solicitacao === "Equipamento" && equipamentosUsuario.length > 0 && (
                <div>
                  <Label>Selecione o Equipamento com Problema *</Label>
                  <Select
                    required
                    value={formData.equipamento_selecionado}
                    onValueChange={(value) => setFormData({ ...formData, equipamento_selecionado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione qual equipamento está com problema" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipamentosUsuario.map((eq) => (
                        <SelectItem key={eq.id} value={eq.displayName}>
                          {eq.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!formData.equipamento_selecionado && formData.equipamento_subtipo && (
                    <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        Por favor, selecione qual equipamento está com problema
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {formData.tipo_solicitacao === "Equipamento" && equipamentosUsuario.length === 0 && formData.solicitante_nome && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Nenhum equipamento cadastrado</strong> em seu nome. 
                    Você pode descrever o equipamento no campo "Equipamento Atual" abaixo.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label>Equipamento Atual (opcional)</Label>
                <Input
                  placeholder="Ex: Notebook Dell Latitude, Desktop HP"
                  value={formData.equipamento_atual}
                  onChange={(e) => setFormData({ ...formData, equipamento_atual: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se o equipamento não estiver na lista acima, descreva aqui
                </p>
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
                  <strong>Importante:</strong> Após enviar, você receberá um email de confirmação com o número do chamado. 
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
