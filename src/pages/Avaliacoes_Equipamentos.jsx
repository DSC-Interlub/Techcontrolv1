import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

export default function AvaliacoesEquipamentos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRecomendacao, setFilterRecomendacao] = useState("todos");

  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['pcs_internos'],
    queryFn: () => base44.entities.PCs_Internos.list(),
  });

  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
  });

  const equipamentosAvaliados = [
    ...pcsInternos
      .filter(pc => (pc.tipo === "Desktop" || pc.tipo === "Notebook") && 
                    pc.avaliacao_score !== undefined && 
                    pc.avaliacao_score !== null)
      .map(pc => ({ ...pc, origem: "PCs Internos" })),
    ...notebooksExternos
      .filter(nb => nb.tipo === "Notebook" && 
                   nb.avaliacao_score !== undefined && 
                   nb.avaliacao_score !== null)
      .map(nb => ({ ...nb, origem: "Notebooks Externos" }))
  ];

  const equipamentosFiltrados = equipamentosAvaliados.filter(eq => {
    const matchSearch = !searchTerm || 
      eq.usuario_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.modelo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRecomendacao = filterRecomendacao === "todos" || 
      eq.avaliacao_recomendacao_sistema === filterRecomendacao;

    return matchSearch && matchRecomendacao;
  });

  const equipamentosOrdenados = [...equipamentosFiltrados].sort((a, b) => 
    (b.avaliacao_score || 0) - (a.avaliacao_score || 0)
  );

  const total = equipamentosAvaliados.length;
  const substituir = equipamentosAvaliados.filter(eq => eq.avaliacao_recomendacao_sistema === "Substituir").length;
  const upgrade = equipamentosAvaliados.filter(eq => eq.avaliacao_recomendacao_sistema === "Upgrade").length;
  const manter = equipamentosAvaliados.filter(eq => eq.avaliacao_recomendacao_sistema === "Manter").length;
  const media = total > 0 ? (equipamentosAvaliados.reduce((sum, eq) => sum + (eq.avaliacao_score || 0), 0) / total).toFixed(1) : 0;

  const getScoreIcon = (score) => {
    if (score <= 39) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (score <= 69) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const getScoreColor = (score) => {
    if (score <= 39) return "text-green-600";
    if (score <= 69) return "text-yellow-600";
    return "text-red-600";
  };

  const getRecomendacaoColor = (rec) => {
    if (rec === "Manter") return "bg-green-100 text-green-800";
    if (rec === "Upgrade") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-8 h-8 text-blue-600" />
          Avaliações de Equipamentos
        </h1>
        <p className="text-gray-600 mt-1">Relatório de saúde dos equipamentos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Média</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{media}</p>
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

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRecomendacao} onValueChange={setFilterRecomendacao}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por recomendação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="Substituir">Substituir</SelectItem>
                <SelectItem value="Upgrade">Upgrade</SelectItem>
                <SelectItem value="Manter">Manter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipamentos Avaliados ({equipamentosOrdenados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Marca/Modelo</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Recomendação</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Data Avaliação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipamentosOrdenados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      Nenhuma avaliação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  equipamentosOrdenados.map((eq, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{eq.usuario_atual || "Disponível"}</TableCell>
                      <TableCell><Badge variant="outline">{eq.tipo}</Badge></TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{eq.marca}</div>
                          <div className="text-gray-500">{eq.modelo}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScoreIcon(eq.avaliacao_score)}
                          <span className={`font-bold ${getScoreColor(eq.avaliacao_score)}`}>
                            {eq.avaliacao_score}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getRecomendacaoColor(eq.avaliacao_recomendacao_sistema)}>
                          {eq.avaliacao_recomendacao_sistema}
                        </Badge>
                      </TableCell>
                      <TableCell>{eq.origem}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {eq.avaliacao_data ? new Date(eq.avaliacao_data).toLocaleDateString('pt-BR') : "—"}
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