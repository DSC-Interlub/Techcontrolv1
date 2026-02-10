import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, TrendingUp, AlertTriangle, XCircle, FileDown, ExternalLink } from "lucide-react";

export default function AvaliacoesEquipamentos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClassificacao, setFilterClassificacao] = useState("todos");

  const { data: avaliacoes = [], isLoading } = useQuery({
    queryKey: ['avaliacoes'],
    queryFn: () => base44.entities.Avaliacoes.list('-data_avaliacao'),
  });

  const avaliacoesFiltradas = avaliacoes.filter(av => {
    const matchSearch = !searchTerm || 
      av.usuario_equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      av.equipamento_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      av.avaliador?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchClassificacao = filterClassificacao === "todos" || 
      av.classificacao === filterClassificacao;

    return matchSearch && matchClassificacao;
  });

  const total = avaliacoes.length;
  const manter = avaliacoes.filter(av => av.classificacao === "Manter").length;
  const upgrade = avaliacoes.filter(av => av.classificacao === "Upgrade").length;
  const substituir = avaliacoes.filter(av => av.classificacao === "Substituir").length;
  const mediaPontuacao = total > 0 
    ? (avaliacoes.reduce((sum, av) => sum + (av.pontuacao_total || 0), 0) / total).toFixed(1) 
    : 0;

  const getClassificacaoIcon = (classificacao) => {
    if (classificacao === "Manter") return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (classificacao === "Upgrade") return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getClassificacaoColor = (classificacao) => {
    if (classificacao === "Manter") return "bg-green-100 text-green-800";
    if (classificacao === "Upgrade") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getPontuacaoColor = (pontos) => {
    if (pontos <= 39) return "text-green-600 font-bold";
    if (pontos <= 69) return "text-yellow-600 font-bold";
    return "text-red-600 font-bold";
  };

  const exportarCSV = () => {
    const headers = ["Usuário Equipamento", "Equipamento", "Tipo", "Pontuação", "Classificação", "Avaliador", "Data"];
    const rows = avaliacoesFiltradas.map(av => [
      av.usuario_equipamento || "",
      av.equipamento_nome || "",
      av.equipamento_tipo === "PCs_Internos" ? "PC Interno" : "Notebook Externo",
      av.pontuacao_total || "",
      av.classificacao || "",
      av.avaliador || "",
      av.data_avaliacao ? new Date(av.data_avaliacao).toLocaleDateString('pt-BR') : ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `avaliacoes_equipamentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-8 h-8 text-blue-600" />
            Avaliações de Equipamentos
          </h1>
          <p className="text-gray-600 mt-1">Relatório completo de avaliações realizadas</p>
        </div>
        <Button onClick={exportarCSV} variant="outline" className="gap-2">
          <FileDown className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Média</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{mediaPontuacao}</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Manter</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{manter}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Upgrade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{upgrade}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Substituir</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{substituir}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por usuário, equipamento ou avaliador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterClassificacao} onValueChange={setFilterClassificacao}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por classificação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Classificações</SelectItem>
                <SelectItem value="Manter">Manter</SelectItem>
                <SelectItem value="Upgrade">Upgrade</SelectItem>
                <SelectItem value="Substituir">Substituir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avaliações Realizadas ({avaliacoesFiltradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : (
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Pontuação</TableHead>
                    <TableHead className="text-center">Classificação</TableHead>
                    <TableHead>Avaliador</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avaliacoesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        Nenhuma avaliação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    avaliacoesFiltradas.map((av) => (
                      <TableRow key={av.id}>
                        <TableCell className="font-medium">{av.usuario_equipamento || "—"}</TableCell>
                        <TableCell>{av.equipamento_nome || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {av.equipamento_tipo === "PCs_Internos" ? "PC Interno" : "Notebook Externo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={getPontuacaoColor(av.pontuacao_total)}>
                            {av.pontuacao_total}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {getClassificacaoIcon(av.classificacao)}
                            <Badge className={getClassificacaoColor(av.classificacao)}>
                              {av.classificacao}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{av.avaliador || "—"}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {av.data_avaliacao 
                            ? new Date(av.data_avaliacao).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Link 
                            to={`${createPageUrl(av.equipamento_tipo)}?id=${av.equipamento_id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Ver
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}