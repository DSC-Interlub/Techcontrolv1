
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Headset, Copy, Check, Eye, Laptop } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function Chamados() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [originalChamado, setOriginalChamado] = useState(null); // New state to store original data
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const publicUrl = `${window.location.origin}/chamado-publico`;

  const { data: chamados = [], isLoading } = useQuery({
    queryKey: ['chamados'],
    queryFn: () => base44.entities.Chamados.list('-created_date'),
  });

  const getTipoCompleto = (chamado) => {
    let detalhes = chamado.tipo_solicitacao || "";
    
    if (chamado.tipo_solicitacao === "Sistema") {
      if (chamado.sistema_tipo) {
        detalhes += ` - ${chamado.sistema_tipo}`;
      }
      if (chamado.sistema_subtipo) {
        detalhes += ` (${chamado.sistema_subtipo})`;
      }
    } else if (chamado.tipo_solicitacao === "Impressora") {
      if (chamado.impressora_subtipo) {
        detalhes += ` - ${chamado.impressora_subtipo}`;
      }
    } else if (chamado.tipo_solicitacao === "Equipamento") {
      if (chamado.equipamento_subtipo) {
        detalhes += ` - ${chamado.equipamento_subtipo}`;
      }
    } else if (chamado.tipo_solicitacao === "Servidor") {
      if (chamado.servidor_subtipo) {
        detalhes += ` - ${chamado.servidor_subtipo}`;
      }
    }
    
    return detalhes;
  };

  const enviarEmailAtualizacao = async (chamado, mudancas) => {
    if (!chamado.solicitante_email) {
      console.warn('❌ Não foi possível enviar email de atualização: solicitante_email não encontrado.');
      return;
    }
    try {
      await base44.integrations.Core.SendEmail({
        from_name: "TechControl - Suporte",
        to: chamado.solicitante_email,
        subject: `🔔 Atualização do Chamado ${chamado.numero_chamado}`,
        body: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Atualização do Chamado ${chamado.numero_chamado}</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); padding: 30px 20px; text-align: center;">
                  <div style="background-color: white; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 30px;">🔔</span>
                  </div>
                  <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 600;">Atualização do Chamado</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px 25px;">
                  <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Olá, <strong>${chamado.solicitante_nome}</strong>!
                  </p>
                  
                  <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                    Houve uma atualização no seu chamado de suporte.
                  </p>
                  
                  <!-- Número do Chamado -->
                  <div style="background-color: #f0f8ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; border-radius: 8px;">
                    <p style="color: #004085; font-size: 13px; font-weight: 600; text-transform: uppercase; margin: 0 0 5px 0;">
                      📋 Chamado
                    </p>
                    <p style="color: #333; font-size: 20px; font-weight: bold; margin: 0; font-family: 'Courier New', monospace;">
                      ${chamado.numero_chamado}
                    </p>
                  </div>
                  
                  <!-- Mudanças -->
                  <div style="background-color: #fff8e1; border-left: 4px solid #ffa726; padding: 20px; margin: 25px 0; border-radius: 8px;">
                    <h3 style="color: #e65100; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">📝 O que mudou?</h3>
                    <div style="color: #666; font-size: 14px; line-height: 1.8;">
                      ${mudancas.map(m => `
                        <div style="margin-bottom: 12px; padding: 10px; background-color: white; border-radius: 6px; border: 1px solid #fbd38d;">
                          <strong style="color: #333;">${m.campo}:</strong><br>
                          ${m.antes ? `<span style="color: #999; text-decoration: line-through;">${m.antes}</span><br>` : ''}
                          <span style="color: #4caf50; font-weight: 600;">${m.antes ? '→ ' : ''}${m.depois || 'Vazio'}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                  
                  <!-- Status Atual -->
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #333; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">📊 Status Atual do Chamado</h3>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <span style="color: #666; font-size: 14px;">Status:</span>
                        </td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">
                          <span style="color: ${
                            chamado.status === 'Resolvido' ? '#28a745' : 
                            chamado.status === 'Em Andamento' ? '#0066cc' : 
                            chamado.status === 'Aberto' ? '#dc3545' : '#6c757d'
                          }; font-size: 14px; font-weight: 600; background-color: ${
                            chamado.status === 'Resolvido' ? '#d4edda' : 
                            chamado.status === 'Em Andamento' ? '#cfe2ff' : 
                            chamado.status === 'Aberto' ? '#f8d7da' : '#e2e3e5'
                          }; padding: 4px 12px; border-radius: 12px;">
                            ${chamado.status}
                          </span>
                        </td>
                      </tr>
                      ${chamado.responsavel ? `
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <span style="color: #666; font-size: 14px;">Responsável:</span>
                        </td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">
                          <span style="color: #333; font-size: 14px; font-weight: 600;">${chamado.responsavel}</span>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #666; font-size: 14px;">Data da Atualização:</span>
                        </td>
                        <td style="padding: 10px 0; text-align: right;">
                          <span style="color: #333; font-size: 14px; font-weight: 600;">${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  ${chamado.solucao ? `
                  <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 6px;">
                    <h4 style="color: #155724; font-size: 15px; margin: 0 0 8px 0; font-weight: 600;">✅ Solução Aplicada</h4>
                    <p style="color: #155724; font-size: 14px; line-height: 1.6; margin: 0;">
                      ${chamado.solucao}
                    </p>
                  </div>
                  ` : ''}
                  
                  ${chamado.observacoes ? `
                  <div style="margin: 20px 0;">
                    <h4 style="color: #333; font-size: 15px; margin: 0 0 10px 0; font-weight: 600;">💬 Observações</h4>
                    <p style="color: #666; font-size: 14px; line-height: 1.6; background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 0;">
                      ${chamado.observacoes}
                    </p>
                  </div>
                  ` : ''}
                  
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
      
      console.log('✅ Email de atualização enviado para:', chamado.solicitante_email);
    } catch (error) {
      console.error('❌ Erro ao enviar email de atualização:', error);
    }
  };

  const updateChamadoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Chamados.update(id, data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      
      // Detectar mudanças
      const mudancas = [];
      const camposMonitorados = {
        status: 'Status',
        responsavel: 'Responsável',
        solucao: 'Solução',
        observacoes: 'Observações'
      };

      if (originalChamado) { // Ensure originalChamado exists for comparison
        Object.keys(camposMonitorados).forEach(campo => {
          const antes = originalChamado[campo];
          const depois = variables.data[campo];
          
          if (String(antes || '') !== String(depois || '')) { // Compare as strings to handle null/undefined consistency
            mudancas.push({
              campo: camposMonitorados[campo],
              antes: antes || 'Não informado',
              depois: depois || 'Não informado'
            });
          }
        });
      }
      
      // Enviar email se houver mudanças e se o chamado tiver email do solicitante
      if (mudancas.length > 0) {
        await enviarEmailAtualizacao(variables.data, mudancas);
      }
      
      setShowDetails(false);
      setSelectedChamado(null);
      setOriginalChamado(null); // Clear originalChamado after saving
    },
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Function to handle opening details and saving the original state
  const handleOpenDetails = (chamado) => {
    setSelectedChamado({ ...chamado }); // Create a mutable copy for editing
    setOriginalChamado({ ...chamado }); // Save a deep copy of the original for comparison
    setShowDetails(true);
  };

  const filteredChamados = filterStatus === "all" 
    ? chamados 
    : chamados.filter(c => c.status === filterStatus);

  const stats = {
    total: chamados.length,
    abertos: chamados.filter(c => c.status === "Aberto").length,
    emAndamento: chamados.filter(c => c.status === "Em Andamento").length,
    resolvidos: chamados.filter(c => c.status === "Resolvido").length,
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Headset className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Chamados de Suporte</h1>
              <p className="text-gray-500 mt-1">Gerenciar solicitações de suporte</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600 font-mono truncate max-w-xs">{publicUrl}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyLink}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">Link público para abrir chamados</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Abertos</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.abertos}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Em Andamento</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.emAndamento}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Resolvidos</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.resolvidos}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Lista de Chamados ({filteredChamados.length})</CardTitle>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Aberto">Aberto</SelectItem>
                  <SelectItem value="Em Análise">Em Análise</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                  <SelectItem value="Resolvido">Resolvido</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Chamado</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Urgência</TableHead>
                    <TableHead>Data Abertura</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredChamados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Nenhum chamado encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredChamados.map((chamado) => (
                      <TableRow key={chamado.id}>
                        <TableCell className="font-mono text-sm">{chamado.numero_chamado}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{chamado.solicitante_nome}</p>
                            <p className="text-sm text-gray-500">{chamado.solicitante_area}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="text-sm truncate">{getTipoCompleto(chamado)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            chamado.urgencia === "Urgente" ? "bg-red-100 text-red-800" :
                            chamado.urgencia === "Alta" ? "bg-orange-100 text-orange-800" :
                            chamado.urgencia === "Média" ? "bg-yellow-100 text-yellow-800" :
                            "bg-blue-100 text-blue-800"
                          }>
                            {chamado.urgencia}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {chamado.data_abertura && format(new Date(chamado.data_abertura), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            chamado.status === "Aberto" ? "bg-red-100 text-red-800" :
                            chamado.status === "Em Andamento" ? "bg-blue-100 text-blue-800" :
                            chamado.status === "Resolvido" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-800"
                          }>
                            {chamado.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDetails(chamado)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Chamado</DialogTitle>
            </DialogHeader>
            {selectedChamado && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Número do Chamado</Label>
                    <p className="font-mono font-medium">{selectedChamado.numero_chamado}</p>
                  </div>
                  <div>
                    <Label>Status Atual</Label>
                    <Select
                      value={selectedChamado.status}
                      onValueChange={(value) => setSelectedChamado({ ...selectedChamado, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aberto">Aberto</SelectItem>
                        <SelectItem value="Em Análise">Em Análise</SelectItem>
                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                        <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                        <SelectItem value="Resolvido">Resolvido</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Tipo de Solicitação</h3>
                  <p className="text-sm text-blue-800">{getTipoCompleto(selectedChamado)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Solicitante</Label>
                    <p className="font-medium">{selectedChamado.solicitante_nome}</p>
                    <p className="text-sm text-gray-600">{selectedChamado.solicitante_email}</p>
                  </div>
                  <div>
                    <Label>Área/Departamento</Label>
                    <p className="font-medium">{selectedChamado.solicitante_area}</p>
                  </div>
                </div>

                {selectedChamado.equipamentos_usuario && selectedChamado.equipamentos_usuario.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Laptop className="w-4 h-4" />
                      Equipamentos do Usuário
                    </h3>
                    <div className="grid md:grid-cols-2 gap-2">
                      {selectedChamado.equipamentos_usuario.map((eq, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-gray-100">
                          <Badge variant="outline" className="text-xs mb-1">{eq.tipo}</Badge>
                          <p className="text-sm font-medium">{eq.marca} {eq.modelo}</p>
                          {eq.etiqueta && (
                            <p className="text-xs text-gray-500 mt-1">Etiqueta: {eq.etiqueta}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New: Display selected equipment if available */}
                {selectedChamado.equipamento_selecionado && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <Label className="text-yellow-900">Equipamento com Problema</Label>
                    <p className="font-medium text-yellow-800 mt-1">{selectedChamado.equipamento_selecionado}</p>
                  </div>
                )}

                <div>
                  <Label>Descrição do Problema</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedChamado.descricao_problema}</p>
                </div>

                {selectedChamado.melhorias_detalhes && (
                  <div>
                    <Label>Detalhes da Melhoria</Label>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedChamado.melhorias_detalhes}</p>
                  </div>
                )}

                {selectedChamado.desenvolvimento_detalhes && (
                  <div>
                    <Label>Detalhes do Desenvolvimento</Label>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedChamado.desenvolvimento_detalhes}</p>
                  </div>
                )}

                {selectedChamado.equipamento_outros_detalhes && (
                  <div>
                    <Label>Outros Detalhes</Label>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedChamado.equipamento_outros_detalhes}</p>
                  </div>
                )}

                <div>
                  <Label>Responsável</Label>
                  <Input
                    value={selectedChamado.responsavel || ""}
                    onChange={(e) => setSelectedChamado({ ...selectedChamado, responsavel: e.target.value })}
                    placeholder="Nome do responsável"
                  />
                </div>

                <div>
                  <Label>Solução Aplicada</Label>
                  <Textarea
                    value={selectedChamado.solucao || ""}
                    onChange={(e) => setSelectedChamado({ ...selectedChamado, solucao: e.target.value })}
                    placeholder="Descreva a solução aplicada..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={selectedChamado.observacoes || ""}
                    onChange={(e) => setSelectedChamado({ ...selectedChamado, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                    rows={2}
                  />
                </div>

                {/* New: Email notification tip */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Dica:</strong> Ao salvar alterações, o usuário receberá automaticamente um email com as atualizações do chamado.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowDetails(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => updateChamadoMutation.mutate({ 
                      id: selectedChamado.id, 
                      data: selectedChamado 
                    })}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
