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
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const publicUrl = `${window.location.origin}/chamado-publico`;

  const { data: chamados = [], isLoading } = useQuery({
    queryKey: ['chamados'],
    queryFn: () => base44.entities.Chamados.list('-created_date'),
  });

  const updateChamadoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Chamados.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      setShowDetails(false);
      setSelectedChamado(null);
    },
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    }
    
    return detalhes;
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
                            onClick={() => {
                              setSelectedChamado(chamado);
                              setShowDetails(true);
                            }}
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