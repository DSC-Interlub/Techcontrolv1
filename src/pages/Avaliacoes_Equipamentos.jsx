import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Activity, Search, TrendingUp, AlertTriangle, XCircle, FileDown, ExternalLink, AlertOctagon, ArrowUpDown, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/AuthContext";
import { formatarDataSemFuso } from "@/utils/date";
import AvaliacaoEquipamento from "@/components/equipamentos/AvaliacaoEquipamento";
import { formatarObservacoesComAnyDesk } from "@/utils/eval";

export default function AvaliacoesEquipamentos() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClassificacao, setFilterClassificacao] = useState("todos");
  const [activeTab, setActiveTab] = useState("realizadas");
  const [sortByPontuacao, setSortByPontuacao] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState({});
  const [editingAvaliacao, setEditingAvaliacao] = useState(null);
  const queryClient = useQueryClient();

  const salvarEdicaoMutation = useMutation({
    mutationFn: async (dados) => {
      const av = editingAvaliacao;
      if (!av) return;

      const anydeskVal = (dados.anydesk_id || "").trim();
      const versaoWindowsLimpa = (dados.versao_windows || "").replace(/\|\s*AnyDesk:\s*[^|;\n\r]+/gi, "").trim();

      const payloadUpdate = {
        memoria_ram: dados.memoria_ram || '',
        tipo_armazenamento: dados.tipo_armazenamento || '',
        espaco_disco: dados.espaco_disco || '',
        versao_windows: anydeskVal ? `${versaoWindowsLimpa} | AnyDesk: ${anydeskVal}` : versaoWindowsLimpa,
        antivirus: dados.antivirus || '',
        desempenho: dados.desempenho || '',
        problemas: dados.problemas || [],
        atende_trabalho: dados.atende_trabalho || '',
        recomendacao_usuario: dados.recomendacao_usuario || '',
        satisfacao: dados.satisfacao || '',
        pontuacao_total: dados.pontuacao_total || 0,
        classificacao: dados.classificacao || 'Manter'
      };

      await base44.entities.Avaliacoes.update(av.id, payloadUpdate);

      // Atualiza também o cadastro do equipamento correspondente
      const eqData = equipamentoMap[av.equipamento_id];
      const updateDataEquipamento = {};

      updateDataEquipamento.observacoes = formatarObservacoesComAnyDesk(
        eqData?.observacoes || "",
        anydeskVal,
        dados.memoria_ram,
        versaoWindowsLimpa
      );
      if (anydeskVal) updateDataEquipamento.anydesk_id = anydeskVal;
      if (dados.memoria_ram) updateDataEquipamento.memoria_ram = dados.memoria_ram;
      if (dados.versao_windows) updateDataEquipamento.versao_windows = versaoWindowsLimpa;
      if (dados.antivirus) updateDataEquipamento.antivirus = dados.antivirus;
      if (dados.desempenho) updateDataEquipamento.condicao = dados.desempenho;

      if (eqData && Object.keys(updateDataEquipamento).length > 0) {
        if (av.equipamento_tipo === 'Notebooks_Externos') {
          await base44.entities.Notebooks_Externos.update(av.equipamento_id, updateDataEquipamento);
        } else {
          await base44.entities.PCs_Internos.update(av.equipamento_id, updateDataEquipamento);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avaliacoes'] });
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
      setEditingAvaliacao(null);
      alert("Avaliação e dados cadastrais do equipamento atualizados com sucesso!");
    },
    onError: (err) => {
      alert("Erro ao atualizar avaliação: " + err.message);
    }
  });

  const { data: todasAvaliacoes = [], isLoading } = useQuery({
    queryKey: ['avaliacoes'],
    queryFn: () => base44.entities.Avaliacoes.list('-data_avaliacao'),
    staleTime: 30000,
  });

  // Agrupar avaliações por equipamento e pegar apenas a mais recente
  const avaliacoesAgrupadas = todasAvaliacoes.reduce((acc, av) => {
    if (!acc[av.equipamento_id] || new Date(av.data_avaliacao) > new Date(acc[av.equipamento_id].data_avaliacao)) {
      acc[av.equipamento_id] = av;
    }
    return acc;
  }, {});
  
  const avaliacoes = Object.values(avaliacoesAgrupadas);

  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['pcs_internos'],
    queryFn: () => base44.entities.PCs_Internos.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Identificar equipamentos não avaliados
  const equipamentosNaoAvaliados = [
    ...pcsInternos
      .filter(pc => (pc.tipo === "Desktop" || pc.tipo === "Notebook") && 
        !avaliacoes.some(av => av.equipamento_id === pc.id))
      .map(pc => ({ ...pc, entityType: "PCs_Internos" })),
    ...notebooksExternos
      .filter(nb => (nb.tipo === "Notebook") && 
        !avaliacoes.some(av => av.equipamento_id === nb.id))
      .map(nb => ({ ...nb, entityType: "Notebooks_Externos" }))
  ];

  // Map equipamento_id -> equipment data for etiqueta/area lookup
  const equipamentoMap = useMemo(() => {
    const map = {};
    pcsInternos.forEach(e => { map[e.id] = e; });
    notebooksExternos.forEach(e => { map[e.id] = e; });
    return map;
  }, [pcsInternos, notebooksExternos]);

  const avaliacoesFiltradas = avaliacoes.filter(av => {
    const matchSearch = !searchTerm || 
      av.usuario_equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      av.equipamento_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      av.avaliador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipamentoMap[av.equipamento_id]?.etiqueta_interna?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchClassificacao = filterClassificacao === "todos" || 
      av.classificacao === filterClassificacao;

    return matchSearch && matchClassificacao;
  }).sort((a, b) => {
    if (sortByPontuacao) return (a.pontuacao_total || 0) - (b.pontuacao_total || 0);
    return 0;
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

  const hasAlerts = (avaliacao) => {
    const alerts = [];
    
    // HD (não SSD)
    if (avaliacao.tipo_armazenamento?.toLowerCase().includes('hd')) {
      alerts.push("HD detectado (não SSD)");
    }
    
    // Windows 10
    if (avaliacao.versao_windows?.toLowerCase().includes('windows 10')) {
      alerts.push("Windows 10");
    }
    
    // Sem antivírus
    if (avaliacao.antivirus?.toLowerCase().includes('não') || 
        avaliacao.antivirus?.toLowerCase().includes('sem')) {
      alerts.push("Sem antivírus");
    }
    
    // Não atende trabalho
    if (avaliacao.atende_trabalho?.toLowerCase().includes('não')) {
      alerts.push("Não atende necessidades de trabalho");
    }
    
    // Memória RAM acima de 90%
    if (avaliacao.memoria_ram) {
      const ramMatch = avaliacao.memoria_ram.match(/(\d+)%/);
      if (ramMatch && parseInt(ramMatch[1]) > 90) {
        alerts.push(`Memória RAM acima de 90% (${ramMatch[1]}%)`);
      }
    }
    
    // Espaço livre em disco menos de 20 GB
    if (avaliacao.espaco_disco) {
      const discoMatch = avaliacao.espaco_disco.match(/(\d+)\s*gb/i);
      if (discoMatch && parseInt(discoMatch[1]) < 20) {
        alerts.push(`Pouco espaço em disco (${discoMatch[1]} GB)`);
      }
    }
    
    // Desempenho lento ou muito lento
    if (avaliacao.desempenho?.toLowerCase().includes('lento') || 
        avaliacao.desempenho?.toLowerCase().includes('muito lento')) {
      alerts.push(`Desempenho: ${avaliacao.desempenho}`);
    }
    
    return alerts;
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

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{total}</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Não Avaliados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{equipamentosNaoAvaliados.length}</p>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="realizadas">
            Avaliações Realizadas ({avaliacoesFiltradas.length})
          </TabsTrigger>
          <TabsTrigger value="nao-realizadas">
            Não Realizadas ({equipamentosNaoAvaliados.length})
          </TabsTrigger>
        </TabsList>

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
              {activeTab === "realizadas" && (
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
              )}
            </div>
          </CardContent>
        </Card>

        <TabsContent value="realizadas">
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
                    <TableHead>Alertas</TableHead>
                    <TableHead>Nº</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead
                      className="text-center cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => setSortByPontuacao(v => !v)}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Pontuação
                        <ArrowUpDown className={`w-3 h-3 ${sortByPontuacao ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    </TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Avaliador</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                  {avaliacoesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                        Nenhuma avaliação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    avaliacoesFiltradas.map((av) => {
                      const alerts = hasAlerts(av);
                      const eqData = equipamentoMap[av.equipamento_id];
                      const etiqueta = eqData?.etiqueta_interna;
                      const area = eqData?.area || eqData?.uf;
                      const visibleAlerts = expandedAlerts[av.id] ? alerts : alerts.slice(0, 2);
                      const hiddenCount = alerts.length - 2;
                      return (
                        <TableRow key={av.id} className={alerts.length > 0 ? "bg-red-50" : ""}>
                          <TableCell className="max-w-[200px]">
                            <div className="flex flex-wrap gap-1">
                              {visibleAlerts.map((a, i) => (
                                <span key={i} className="text-xs px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">{a}</span>
                              ))}
                              {!expandedAlerts[av.id] && hiddenCount > 0 && (
                                <button
                                  onClick={() => setExpandedAlerts(prev => ({ ...prev, [av.id]: true }))}
                                  className="text-xs px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-600 border hover:bg-gray-200"
                                >+{hiddenCount}</button>
                              )}
                              {expandedAlerts[av.id] && hiddenCount > 0 && (
                                <button
                                  onClick={() => setExpandedAlerts(prev => ({ ...prev, [av.id]: false }))}
                                  className="text-xs px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-600 border hover:bg-gray-200">menos</button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                           <div className="flex flex-col gap-1">
                             <Badge variant="outline" className="font-mono w-fit">{av.numero_avaliacao || 1}ª</Badge>
                             {av.desatualizada && <Badge className="bg-yellow-100 text-yellow-800 text-xs w-fit">Desatualizada</Badge>}
                           </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{av.usuario_equipamento || "—"}</p>
                              {area && <p className="text-xs text-gray-500">{area}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-sm">{etiqueta || <span className="text-gray-400 font-normal">Sem etiqueta</span>}</p>
                              <p className="text-xs text-gray-500">{av.equipamento_nome || "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {av.equipamento_tipo === "PCs_Internos" ? "PC Interno" : "Notebook Externo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={getPontuacaoColor(av.pontuacao_total)}>{av.pontuacao_total}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {getClassificacaoIcon(av.classificacao)}
                              <Badge className={getClassificacaoColor(av.classificacao)}>{av.classificacao}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{av.avaliador || "—"}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {av.data_avaliacao
                              ? new Date(av.data_avaliacao).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
                              : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingAvaliacao(av)}
                                className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1 font-semibold"
                                title="Editar respostas e dados do PowerShell desta avaliação"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Editar
                              </Button>
                              <Link 
                                to={`${createPageUrl(av.equipamento_tipo)}?id=${av.equipamento_id}`}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Ver
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="nao-realizadas">
          <Card>
            <CardHeader>
              <CardTitle>Equipamentos Não Avaliados ({equipamentosNaoAvaliados.filter(eq => 
                !searchTerm || 
                eq.usuario_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                eq.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                eq.marca?.toLowerCase().includes(searchTerm.toLowerCase())
              ).length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-gray-500 py-8">Carregando...</p>
              ) : (
                <div className="rounded-lg border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Data Aquisição</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipamentosNaoAvaliados.filter(eq => 
                        !searchTerm || 
                        eq.usuario_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        eq.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        eq.marca?.toLowerCase().includes(searchTerm.toLowerCase())
                      ).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                            {searchTerm ? "Nenhum equipamento encontrado" : "Todos os equipamentos foram avaliados! 🎉"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        equipamentosNaoAvaliados
                          .filter(eq => 
                            !searchTerm || 
                            eq.usuario_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            eq.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            eq.marca?.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((eq) => (
                            <TableRow key={`nao-avaliado-${eq.id}`} className="bg-orange-50">
                              <TableCell>
                                <div className="flex items-center gap-2 text-orange-600">
                                  <AlertOctagon className="w-5 h-5" />
                                  <Badge className="bg-orange-100 text-orange-800">
                                    Não Avaliado
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{eq.usuario_atual || "Disponível"}</TableCell>
                              <TableCell>{eq.modelo || "—"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {eq.tipo || (eq.entityType === "PCs_Internos" ? "PC Interno" : "Notebook Externo")}
                                </Badge>
                              </TableCell>
                              <TableCell>{eq.marca || "—"}</TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {formatarDataSemFuso(eq.data_aquisicao)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Link 
                                  to={`${createPageUrl(eq.entityType)}?id=${eq.id}`}
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Avaliar
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
        </TabsContent>
      </Tabs>

      {/* Modal de Edição de Avaliação */}
      <Dialog open={!!editingAvaliacao} onOpenChange={() => setEditingAvaliacao(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Pencil className="w-5 h-5 text-indigo-600" />
              Editar Avaliação de {editingAvaliacao?.usuario_equipamento || "Equipamento"}
            </DialogTitle>
            <DialogDescription>
              Cole os dados coletados do PowerShell ou ajuste manualmente as respostas para recalcular e atualizar a avaliação.
            </DialogDescription>
          </DialogHeader>

          {editingAvaliacao && (
            <AvaliacaoEquipamento
              equipamento={equipamentoMap[editingAvaliacao.equipamento_id] || { id: editingAvaliacao.equipamento_id, tipo: editingAvaliacao.equipamento_tipo === "PCs_Internos" ? "Desktop" : "Notebook" }}
              entityType={editingAvaliacao.equipamento_tipo}
              avaliacaoExistente={editingAvaliacao}
              onSalvar={(dados) => salvarEdicaoMutation.mutate(dados)}
              somenteLeitura={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}