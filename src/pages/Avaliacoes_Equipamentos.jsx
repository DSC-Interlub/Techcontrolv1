import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, Filter, TrendingUp, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

export default function AvaliacoesEquipamentos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRecomendacao, setFilterRecomendacao] = useState("todos");
  const [filterScore, setFilterScore] = useState("todos");

  // Buscar PCs Internos e Notebooks Externos
  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['pcs_internos'],
    queryFn: () => base44.entities.PCs_Internos.list(),
  });

  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
  });

  // Combinar todos os equipamentos avaliados (apenas os que têm score válido)
  const equipamentosAvaliados = [
    ...pcsInternos
      .filter(pc => (pc.tipo === "Desktop" || pc.tipo === "Notebook") && 
                    pc.avaliacao_score !== undefined && 
                    pc.avaliacao_score !== null &&
                    pc.avaliacao_data)
      .map(pc => ({ ...pc, origem: "PCs_Internos" })),
    ...notebooksExternos
      .filter(nb => nb.tipo === "Notebook" && 
                   nb.avaliacao_score !== undefined && 
                   nb.avaliacao_score !== null &&
                   nb.avaliacao_data)
      .map(nb => ({ ...nb, origem: "Notebooks_Externos" }))
  ];

  // Aplicar filtros
  const equipamentosFiltrados = equipamentosAvaliados.filter(eq => {
    const matchSearch = !searchTerm || 
      eq.usuario_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.etiqueta_interna?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRecomendacao = filterRecomendacao === "todos" || 
      eq.avaliacao_recomendacao_sistema === filterRecomendacao;

    const matchScore = 
      filterScore === "todos" ||
      (filterScore === "critico" && eq.avaliacao_score >= 70) ||
      (filterScore === "atencao" && eq.avaliacao_score >= 40 && eq.avaliacao_score < 70) ||
      (filterScore === "bom" && eq.avaliacao_score < 40);

    return matchSearch && matchRecomendacao && matchScore;
  });

  // Ordenar por score (maior primeiro)
  const equipamentosOrdenados = [...equipamentosFiltrados].sort((a, b) => 
    (b.avaliacao_score || 0) - (a.avaliacao_score || 0)
  );

  // Estatísticas
  const totalAvaliados = equipamentosAvaliados.length;
  const substituir = equipamentosAvaliados.filter(eq => eq.avaliacao_recomendacao_sistema === "Substituir").length;
  const upgrade = equipamentosAvaliados.filter(eq => eq.avaliacao_recomendacao_sistema === "Upgrade").length;
  const manter = equipamentosAvaliados.filter(eq => eq.avaliacao_recomendacao_sistema === "Manter").length;
  const scoremedio = totalAvaliados > 0 
    ? (equipamentosAvaliados.reduce((sum, eq) => sum + (eq.avaliacao_score || 0), 0) / totalAvaliados).toFixed(1)
    : 0;

  const getScoreColor = (score) => {
    if (score >= 70) return "text-red-600";
    if (score >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  const getScoreIcon = (score) => {
    if (score >= 70) return <AlertCircle className="w-4 h-4 text-red-600" />;
    if (score >= 40) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  const getRecomendacaoColor = (recomendacao) => {
    if (recomendacao === "Manter") return "bg-green-100 text-green-800";
    if (recomendacao === "Upgrade") return "bg-yellow-100 text-yellow-800";
    if (recomendacao === "Substituir") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-8 h-8 text-blue-600" />
          Avaliações de Equipamentos
        </h1>
        <p className="text-gray-600 mt-1">
          Relatório de saúde dos equipamentos Desktop e Notebook
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Avaliados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{totalAvaliados}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Score Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{scoremedio}</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Manter</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{manter}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Upgrade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{upgrade}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Substituir</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{substituir}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por usuário, marca, modelo, etiqueta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div>
              <Select value={filterRecomendacao} onValueChange={setFilterRecomendacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por recomendação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas Recomendações</SelectItem>
                  <SelectItem value="Substituir">Substituir</SelectItem>
                  <SelectItem value="Upgrade">Upgrade</SelectItem>
                  <SelectItem value="Manter">Manter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterScore} onValueChange={setFilterScore}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Scores</SelectItem>
                  <SelectItem value="critico">Crítico (≥70)</SelectItem>
                  <SelectItem value="atencao">Atenção (40-69)</SelectItem>
                  <SelectItem value="bom">Bom (&lt;40)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Equipamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Equipamentos Avaliados ({equipamentosOrdenados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Marca/Modelo</TableHead>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Recomendação</TableHead>
                  <TableHead>Armazenamento</TableHead>
                  <TableHead>Desempenho</TableHead>
                  <TableHead>Data Avaliação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipamentosOrdenados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      Nenhum equipamento avaliado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  equipamentosOrdenados.map((eq) => (
                    <TableRow key={`${eq.origem}-${eq.id}`}>
                      <TableCell className="font-medium">
                        {eq.usuario_atual || "Disponível"}
                        {eq.area && <div className="text-xs text-gray-500">{eq.area}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{eq.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{eq.marca}</div>
                          <div className="text-gray-500">{eq.modelo}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{eq.etiqueta_interna || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(eq.avaliacao_score)}
                          <span className={`font-bold ${getScoreColor(eq.avaliacao_score)}`}>
                            {eq.avaliacao_score?.toFixed(1)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getRecomendacaoColor(eq.avaliacao_recomendacao_sistema)}>
                          {eq.avaliacao_recomendacao_sistema}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={eq.avaliacao_tipo_armazenamento === "HD" ? "destructive" : "default"}>
                          {eq.avaliacao_tipo_armazenamento || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{eq.avaliacao_desempenho || "—"}</span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {eq.avaliacao_data 
                          ? new Date(eq.avaliacao_data).toLocaleDateString('pt-BR')
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}