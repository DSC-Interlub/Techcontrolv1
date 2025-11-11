import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, CheckCircle, AlertCircle, XCircle, Laptop, Calendar, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AcompanharChamado() {
  const [numeroChamado, setNumeroChamado] = useState("");
  const [buscarChamado, setBuscarChamado] = useState(false);

  const { data: chamados = [], isLoading, error } = useQuery({
    queryKey: ['chamados_acompanhamento', numeroChamado],
    queryFn: async () => {
      if (!numeroChamado) return [];
      const allChamados = await base44.entities.Chamados.list();
      return allChamados.filter(c => c.numero_chamado === numeroChamado.toUpperCase().trim());
    },
    enabled: buscarChamado && numeroChamado.length > 0,
  });

  const handleBuscar = (e) => {
    e.preventDefault();
    setBuscarChamado(true);
  };

  const chamado = chamados.length > 0 ? chamados[0] : null;

  const getStatusIcon = (status) => {
    switch (status) {
      case "Aberto":
        return <Clock className="w-5 h-5 text-red-600" />;
      case "Em Análise":
        return <Search className="w-5 h-5 text-blue-600" />;
      case "Em Andamento":
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      case "Aguardando Peça":
        return <Clock className="w-5 h-5 text-orange-600" />;
      case "Resolvido":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "Cancelado":
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Aberto":
        return "bg-red-100 text-red-800 border-red-200";
      case "Em Análise":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Em Andamento":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Aguardando Peça":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Resolvido":
        return "bg-green-100 text-green-800 border-green-200";
      case "Cancelado":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTipoCompleto = (chamado) => {
    let detalhes = chamado.tipo_solicitacao || "";
    
    if (chamado.tipo_solicitacao === "Sistema") {
      if (chamado.sistema_tipo) detalhes += ` - ${chamado.sistema_tipo}`;
      if (chamado.sistema_subtipo) detalhes += ` (${chamado.sistema_subtipo})`;
    } else if (chamado.tipo_solicitacao === "Impressora") {
      if (chamado.impressora_subtipo) detalhes += ` - ${chamado.impressora_subtipo}`;
    } else if (chamado.tipo_solicitacao === "Equipamento") {
      if (chamado.equipamento_subtipo) detalhes += ` - ${chamado.equipamento_subtipo}`;
    } else if (chamado.tipo_solicitacao === "Servidor") {
      if (chamado.servidor_subtipo) detalhes += ` - ${chamado.servidor_subtipo}`;
    }
    
    return detalhes;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Search className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Acompanhar Chamado
          </h1>
          <p className="text-gray-600">
            Digite o número do seu chamado para ver o status e atualizações
          </p>
        </div>

        <Card className="shadow-xl mb-6">
          <CardHeader className="border-b bg-white">
            <CardTitle>Buscar Chamado</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleBuscar} className="space-y-4">
              <div>
                <Label>Número do Chamado *</Label>
                <div className="flex gap-3 mt-2">
                  <Input
                    required
                    placeholder="Ex: CH12345678"
                    value={numeroChamado}
                    onChange={(e) => {
                      setNumeroChamado(e.target.value);
                      setBuscarChamado(false);
                    }}
                    className="flex-1 font-mono text-lg"
                  />
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-8">
                    <Search className="w-4 h-4 mr-2" />
                    Buscar
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Digite o número que você recebeu ao abrir o chamado
                </p>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Não tem um chamado?</strong> 
                  <Link to={createPageUrl("chamado-publico")} className="underline ml-1">
                    Clique aqui para abrir um novo chamado
                  </Link>
                </AlertDescription>
              </Alert>
            </form>
          </CardContent>
        </Card>

        {isLoading && (
          <Card className="shadow-xl">
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Buscando chamado...</p>
            </CardContent>
          </Card>
        )}

        {buscarChamado && !isLoading && !chamado && (
          <Card className="shadow-xl">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Chamado não encontrado</h3>
              <p className="text-gray-600 mb-4">
                Não encontramos nenhum chamado com o número <strong className="font-mono">{numeroChamado}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Verifique se digitou corretamente e tente novamente.
              </p>
            </CardContent>
          </Card>
        )}

        {chamado && (
          <div className="space-y-6">
            <Card className="shadow-xl">
              <CardHeader className={`border-b ${getStatusColor(chamado.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(chamado.status)}
                    <div>
                      <CardTitle className="text-2xl">Status: {chamado.status}</CardTitle>
                      <p className="text-sm opacity-80 mt-1">
                        Chamado: <span className="font-mono font-bold">{chamado.numero_chamado}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">Informações do Solicitante</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Nome:</span>
                        <p className="font-medium">{chamado.solicitante_nome}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <p className="font-medium">{chamado.solicitante_email}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Área:</span>
                        <p className="font-medium">{chamado.solicitante_area}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">Datas</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Abertura:</span>
                        <p className="font-medium">
                          {chamado.data_abertura && format(new Date(chamado.data_abertura), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      {chamado.responsavel && (
                        <div>
                          <span className="text-gray-600">Responsável:</span>
                          <p className="font-medium">{chamado.responsavel}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Urgência:</span>
                        <Badge className={
                          chamado.urgencia === "Urgente" ? "bg-red-100 text-red-800" :
                          chamado.urgencia === "Alta" ? "bg-orange-100 text-orange-800" :
                          chamado.urgencia === "Média" ? "bg-yellow-100 text-yellow-800" :
                          "bg-blue-100 text-blue-800"
                        }>
                          {chamado.urgencia}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Tipo de Solicitação</h3>
                  <p className="text-sm text-blue-800">{getTipoCompleto(chamado)}</p>
                </div>

                {chamado.equipamento_selecionado && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Laptop className="w-4 h-4 text-yellow-800" />
                      <h3 className="font-semibold text-yellow-900">Equipamento com Problema</h3>
                    </div>
                    <p className="text-sm text-yellow-800">{chamado.equipamento_selecionado}</p>
                  </div>
                )}

                {chamado.equipamentos_usuario && chamado.equipamentos_usuario.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Laptop className="w-4 h-4" />
                      Equipamentos Cadastrados
                    </h3>
                    <div className="grid md:grid-cols-2 gap-2">
                      {chamado.equipamentos_usuario.map((eq, idx) => (
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
                  <h3 className="font-semibold text-gray-900 mb-2">Descrição do Problema</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {chamado.descricao_problema}
                  </p>
                </div>

                {chamado.solucao && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-700" />
                      <h3 className="font-semibold text-green-900">Solução Aplicada</h3>
                    </div>
                    <p className="text-sm text-green-800">{chamado.solucao}</p>
                  </div>
                )}

                {chamado.observacoes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Observações</h3>
                    <p className="text-sm text-blue-800">{chamado.observacoes}</p>
                  </div>
                )}

                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Dica:</strong> Guarde o número do seu chamado ({chamado.numero_chamado}) para consultas futuras.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  setNumeroChamado("");
                  setBuscarChamado(false);
                }}
              >
                Buscar Outro Chamado
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}