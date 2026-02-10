import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, TrendingUp, AlertTriangle, XCircle, FileDown } from "lucide-react";

export default function AvaliacoesEquipamentos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClassificacao, setFilterClassificacao] = useState("todos");

  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['pcs_internos'],
    queryFn: () => base44.entities.PCs_Internos.list(),
  });

  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
  });

  const avaliacoes = [
    ...pcsInternos
      .filter(pc => (pc.tipo === "Desktop" || pc.tipo === "Notebook") && pc.avaliacao_pontuacao_total !== undefined && pc.avaliacao_pontuacao_total !== null)
      .map(pc => ({
        id: pc.id,
        usuario_avaliador: pc.avaliacao_usuario || pc.usuario_atual,
        equipamento_nome: `${pc.marca || ''} ${pc.modelo || ''}`.trim() || "Sem nome",
        equipamento_tipo: "PCs_Internos",
        pontuacao_total: pc.avaliacao_pontuacao_total,
        classificacao: pc.avaliacao_classificacao,
        data_avaliacao: pc.avaliacao_data
      })),
    ...notebooksExternos
      .filter(nb => nb.tipo === "Notebook" && nb.avaliacao_pontuacao_total !== undefined && nb.avaliacao_pontuacao_total !== null)
      .map(nb => ({
        id: nb.id,
        usuario_avaliador: nb.avaliacao_usuario || nb.usuario_atual,
        equipamento_nome: `${nb.marca || ''} ${nb.modelo || ''}`.trim() || "Sem nome",
        equipamento_tipo: "Notebooks_Externos",
        pontuacao_total: nb.avaliacao_pontuacao_total,
        classificacao: nb.avaliacao_classificacao,
        data_avaliacao: nb.avaliacao_data
      }))
  ].sort((a, b) => {
    if (!a.data_avaliacao) return 1;
    if (!b.data_avaliacao) return -1;
    return new Date(b.data_avaliacao) - new Date(a.data_avaliacao);
  });

  const isLoading = false;

  const avaliacoesFiltradas = avaliacoes.filter(av => {
    const matchSearch = !searchTerm || 
      av.usuario_avaliador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      av.equipamento_nome?.toLowerCase().includes(searchTerm.toLowerCase());

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
    const headers = ["Usuário", "Equipamento", "Tipo", "Pontuação", "Classificação", "Data Avaliação"];
    const rows = avaliacoesFiltradas.map(av => [
      av.usuario_avaliador || "",
      av.equipamento_nome || "",
      av.equipamento_tipo || "",
      av.pontuacao_total || "",
      av.classificacao || "",
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
                placeholder="Buscar por usuário ou equipamento..."
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
                    <TableHead>Data Avaliação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avaliacoesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        Nenhuma avaliação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    avaliacoesFiltradas.map((av) => (
                      <TableRow key={av.id}>
                        <TableCell className="font-medium">{av.usuario_avaliador || "—"}</TableCell>
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