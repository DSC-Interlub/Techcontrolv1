import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, Clock, Calendar, 
  Search, CheckCircle2, Monitor, Laptop, RefreshCw, FileSpreadsheet, Tv
} from "lucide-react";
import ModalImportacaoEquipamentos from "@/components/equipamentos/ModalImportacaoEquipamentos";
import { formatarDataSemFuso } from "@/utils/date";

export default function ConformidadeTI() {
  const [tabAtiva, setTabAtiva] = useState("computadores"); // 'computadores' | 'monitores'
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipoComputador, setFiltroTipoComputador] = useState("todos"); // 'todos' | 'Desktop' | 'Notebook'
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroAntivirus, setFiltroAntivirus] = useState("todos");
  const [filtroFormatacao, setFiltroFormatacao] = useState("todos");
  const [filtroVidaUtil, setFiltroVidaUtil] = useState("todos");
  const [modalImportacaoOpen, setModalImportacaoOpen] = useState(false);

  // Consulta à view de conformidade
  const { data: equipamentos = [], isLoading, refetch } = useQuery({
    queryKey: ['conformidade_ti'],
    queryFn: () => base44.entities.ConformidadeEquipamentos.list(),
  });

  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['pcs_internos_import'],
    queryFn: () => base44.entities.PCs_Internos.list(),
  });

  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['notebooks_externos_import'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores_import'],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  // Separação inicial dos dados
  const computadores = useMemo(() => {
    return equipamentos.filter(e => e.tipo === "Desktop" || e.tipo === "Notebook");
  }, [equipamentos]);

  const monitores = useMemo(() => {
    return equipamentos.filter(e => e.tipo === "Monitor");
  }, [equipamentos]);

  // KPIs para Desktops e Notebooks
  const kpisComputadores = useMemo(() => {
    const semAntivirus = computadores.filter(e => e.antivirus !== "Sim" && !(e.antivirus_nome || "").toLowerCase().includes("eset")).length;
    const formatacaoAtrasada = computadores.filter(e => e.status_formatacao === "atrasado" || e.status_formatacao === "sem_registro").length;
    const formatacaoAtencao = computadores.filter(e => e.status_formatacao === "atencao").length;
    const vidaUtilVencida = computadores.filter(e => e.status_vida_util === "atrasado").length;
    const vidaUtilAtencao = computadores.filter(e => e.status_vida_util === "atencao").length;

    return {
      total: computadores.length,
      semAntivirus,
      formatacaoAtrasada,
      formatacaoAtencao,
      vidaUtilVencida,
      vidaUtilAtencao
    };
  }, [computadores]);

  // KPIs para Monitores
  const kpisMonitores = useMemo(() => {
    const total = monitores.length;
    const emUso = monitores.filter(e => e.status === "Em uso").length;
    const disponiveis = monitores.filter(e => e.status === "Disponível").length;
    const vidaUtilVencida = monitores.filter(e => e.status_vida_util === "atrasado").length;
    const vidaUtilAtencao = monitores.filter(e => e.status_vida_util === "atencao").length;

    return {
      total,
      emUso,
      disponiveis,
      vidaUtilVencida,
      vidaUtilAtencao
    };
  }, [monitores]);

  // Filtragem Computadores
  const filteredComputadores = useMemo(() => {
    return computadores.filter(eq => {
      const matchSearch = 
        (eq.etiqueta_interna && eq.etiqueta_interna.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.maquina && eq.maquina.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.usuario_atual && eq.usuario_atual.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.colaborador_area && eq.colaborador_area.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.anydesk_id && eq.anydesk_id.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchTipo = filtroTipoComputador === "todos" || eq.tipo === filtroTipoComputador;
      const matchStatus = filtroStatus === "todos" || eq.status === filtroStatus;
      const hasEsetEq = eq.antivirus === "Sim" || (eq.antivirus_nome || "").toLowerCase().includes("eset");
      const matchAntivirus = filtroAntivirus === "todos" || 
        (filtroAntivirus === "Sim" && hasEsetEq) ||
        (filtroAntivirus === "Nao" && !hasEsetEq);
      const matchFormatacao = filtroFormatacao === "todos" || eq.status_formatacao === filtroFormatacao;
      const matchVidaUtil = filtroVidaUtil === "todos" || eq.status_vida_util === filtroVidaUtil;

      return matchSearch && matchTipo && matchStatus && matchAntivirus && matchFormatacao && matchVidaUtil;
    });
  }, [computadores, searchTerm, filtroTipoComputador, filtroStatus, filtroAntivirus, filtroFormatacao, filtroVidaUtil]);

  // Filtragem Monitores
  const filteredMonitores = useMemo(() => {
    return monitores.filter(eq => {
      const matchSearch = 
        (eq.etiqueta_interna && eq.etiqueta_interna.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.maquina && eq.maquina.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.usuario_atual && eq.usuario_atual.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.colaborador_area && eq.colaborador_area.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = filtroStatus === "todos" || eq.status === filtroStatus;
      const matchVidaUtil = filtroVidaUtil === "todos" || eq.status_vida_util === filtroVidaUtil;

      return matchSearch && matchStatus && matchVidaUtil;
    });
  }, [monitores, searchTerm, filtroStatus, filtroVidaUtil]);

  return (
    <div className="p-4 md:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Painel de Conformidade de TI</h1>
              <p className="text-muted-foreground mt-1">
                Políticas de segurança e ciclo de vida: Formatação periódica (30 meses) e Vida Útil (5 anos)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
            <Button onClick={() => setModalImportacaoOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Importação em Lote (.xlsx)
            </Button>
          </div>
        </div>

        {/* Abas Principais: Computadores vs Monitores */}
        <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="w-full space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <TabsList className="bg-slate-100 p-1">
              <TabsTrigger value="computadores" className="gap-2 px-4 py-2 font-semibold">
                <Laptop className="w-4 h-4 text-indigo-600" />
                Desktops & Notebooks ({computadores.length})
              </TabsTrigger>
              <TabsTrigger value="monitores" className="gap-2 px-4 py-2 font-semibold">
                <Tv className="w-4 h-4 text-slate-700" />
                Monitores ({monitores.length})
              </TabsTrigger>
            </TabsList>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {tabAtiva === "computadores" ? "Monitores não se aplicam a antivírus e formatação." : "Exibição simplificada de periféricos (sem antivírus, anydesk ou formatação)."}
            </span>
          </div>

          {/* ========================================================================= */}
          {/* ABA 1: DESKTOPS & NOTEBOOKS                                              */}
          {/* ========================================================================= */}
          <TabsContent value="computadores" className="space-y-6 m-0">
            {/* KPI Cards Computadores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* 1. Sem Antivírus */}
              <Card className="border-rose-200 bg-rose-50/40">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-rose-800">Sem Antivírus</p>
                      <p className="text-3xl font-bold text-rose-700 mt-1">{kpisComputadores.semAntivirus}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-rose-600 mt-2">de {kpisComputadores.total} Desktops/Notebooks</p>
                </CardContent>
              </Card>

              {/* 2. Formatação Atrasada (> 30 meses ou sem registro) */}
              <Card className="border-red-200 bg-red-50/40">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-800">Formatação Vencida</p>
                      <p className="text-3xl font-bold text-red-700 mt-1">{kpisComputadores.formatacaoAtrasada}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-700">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-red-600 mt-2">&gt; 30 meses ou sem histórico</p>
                </CardContent>
              </Card>

              {/* 3. Formatação Próxima (vence em ≤ 60 dias) */}
              <Card className="border-amber-200 bg-amber-50/40">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Formatar em Breve</p>
                      <p className="text-3xl font-bold text-amber-700 mt-1">{kpisComputadores.formatacaoAtencao}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-600 mt-2">Vence nos próximos 60 dias</p>
                </CardContent>
              </Card>

              {/* 4. Vida Útil Vencida (> 5 anos) */}
              <Card className="border-purple-200 bg-purple-50/40">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-800">Vida Útil Vencida</p>
                      <p className="text-3xl font-bold text-purple-700 mt-1">{kpisComputadores.vidaUtilVencida}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-purple-600 mt-2">&gt; 5 anos desde aquisição</p>
                </CardContent>
              </Card>
            </div>

            {/* Barra de Filtros Computadores */}
            <Card className="p-4 border-slate-200">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por etiqueta, máquina, usuário, área ou anydesk..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select value={filtroTipoComputador} onValueChange={setFiltroTipoComputador}>
                    <SelectTrigger className="w-[130px] text-xs">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos (Desk/Note)</SelectItem>
                      <SelectItem value="Desktop">Desktop</SelectItem>
                      <SelectItem value="Notebook">Notebook</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="w-[125px] text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Status</SelectItem>
                      <SelectItem value="Em uso">Em uso</SelectItem>
                      <SelectItem value="Disponível">Disponível</SelectItem>
                      <SelectItem value="Aguardando Devolução">Aguardando Dev.</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filtroAntivirus} onValueChange={setFiltroAntivirus}>
                    <SelectTrigger className="w-[130px] text-xs">
                      <SelectValue placeholder="Antivírus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Antivírus</SelectItem>
                      <SelectItem value="Sim">Com Antivírus</SelectItem>
                      <SelectItem value="Nao">Sem Antivírus</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filtroFormatacao} onValueChange={setFiltroFormatacao}>
                    <SelectTrigger className="w-[145px] text-xs">
                      <SelectValue placeholder="Formatação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas Formatações</SelectItem>
                      <SelectItem value="ok">Em dia (OK)</SelectItem>
                      <SelectItem value="atencao">Atenção (≤ 60d)</SelectItem>
                      <SelectItem value="atrasado">Vencida (&gt; 30m)</SelectItem>
                      <SelectItem value="sem_registro">Sem Registro</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filtroVidaUtil} onValueChange={setFiltroVidaUtil}>
                    <SelectTrigger className="w-[140px] text-xs">
                      <SelectValue placeholder="Vida Útil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Toda Vida Útil</SelectItem>
                      <SelectItem value="ok">Em dia (&lt; 5 anos)</SelectItem>
                      <SelectItem value="atencao">Atenção (≤ 90d)</SelectItem>
                      <SelectItem value="atrasado">Vencida (&gt; 5 anos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Tabela de Computadores (Completa) */}
            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="border-b py-3 px-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-800">
                    Desktops e Notebooks ({filteredComputadores.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-xs">Etiqueta</TableHead>
                        <TableHead className="text-xs">Tipo & Máquina</TableHead>
                        <TableHead className="text-xs">Usuário & Área</TableHead>
                        <TableHead className="text-xs">AnyDesk</TableHead>
                        <TableHead className="text-xs">Antivírus</TableHead>
                        <TableHead className="text-xs">Última Formatação (30m)</TableHead>
                        <TableHead className="text-xs">Vida Útil (5 anos)</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Carregando indicadores de conformidade...
                          </TableCell>
                        </TableRow>
                      ) : filteredComputadores.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhum desktop ou notebook encontrado com os filtros selecionados
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredComputadores.map((eq) => {
                          return (
                            <TableRow key={`${eq.origem_tabela}-${eq.id}`} className="hover:bg-slate-50/70 text-xs">
                              <TableCell className="font-mono font-bold text-slate-900">
                                {eq.etiqueta_interna || "—"}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-semibold text-slate-800">{eq.maquina}</p>
                                  <Badge variant="outline" className="text-[10px] mt-0.5">
                                    {eq.tipo}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-slate-900">{eq.usuario_atual || "Estoque / Livre"}</p>
                                  <p className="text-[11px] text-slate-500">{eq.colaborador_area || "—"}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {eq.anydesk_id ? (
                                  <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                    {eq.anydesk_id}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {eq.antivirus === "Sim" || (eq.antivirus_nome || "").toLowerCase().includes("eset") ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    {eq.antivirus_nome || "ESET"}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-rose-100 text-rose-800 border border-rose-300">
                                    Não
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-slate-800">
                                    {eq.data_formatacao ? formatarDataSemFuso(eq.data_formatacao) : "Nunca registrado"}
                                  </p>
                                  <div className="mt-1">
                                    {eq.status_formatacao === "ok" && (
                                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                        Em dia (próx: {formatarDataSemFuso(eq.proxima_formatacao)})
                                      </Badge>
                                    )}
                                    {eq.status_formatacao === "atencao" && (
                                      <Badge className="bg-amber-100 text-amber-800 text-[10px] border-amber-300">
                                        Vence em {eq.dias_para_proxima_formatacao} dias
                                      </Badge>
                                    )}
                                    {eq.status_formatacao === "atrasado" && (
                                      <Badge className="bg-red-100 text-red-800 text-[10px] border-red-300 font-bold">
                                        Vencida há {Math.abs(eq.dias_para_proxima_formatacao)} dias
                                      </Badge>
                                    )}
                                    {eq.status_formatacao === "sem_registro" && (
                                      <Badge className="bg-rose-100 text-rose-800 text-[10px] border-rose-300 font-bold">
                                        Sem registro de formatação
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-slate-800">
                                    {eq.data_aquisicao ? formatarDataSemFuso(eq.data_aquisicao) : "Sem aquisição"}
                                  </p>
                                  <div className="mt-1">
                                    {eq.status_vida_util === "ok" && (
                                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                        OK ({eq.dias_para_fim_vida_util}d restantes)
                                      </Badge>
                                    )}
                                    {eq.status_vida_util === "atencao" && (
                                      <Badge className="bg-amber-100 text-amber-800 text-[10px] border-amber-300">
                                        Vence em {eq.dias_para_fim_vida_util} dias
                                      </Badge>
                                    )}
                                    {eq.status_vida_util === "atrasado" && (
                                      <Badge className="bg-purple-100 text-purple-800 text-[10px] border-purple-300 font-bold">
                                        Vencida há {Math.abs(eq.dias_para_fim_vida_util)} dias
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  eq.status === "Disponível" ? "bg-emerald-100 text-emerald-800" :
                                  eq.status === "Em uso" ? "bg-blue-100 text-blue-800" :
                                  eq.status === "Aguardando Devolução" ? "bg-amber-100 text-amber-800 border-amber-300" :
                                  "bg-slate-100 text-slate-800"
                                }>
                                  {eq.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 2: MONITORES (SEM ANTIVÍRUS, ANYDESK E FORMATAÇÃO)                     */}
          {/* ========================================================================= */}
          <TabsContent value="monitores" className="space-y-6 m-0">
            {/* KPI Cards Monitores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* 1. Total Monitores */}
              <Card className="border-slate-200 bg-slate-50/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">Total Monitores</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">{kpisMonitores.total}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700">
                      <Tv className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Periféricos cadastrados</p>
                </CardContent>
              </Card>

              {/* 2. Em Uso */}
              <Card className="border-blue-200 bg-blue-50/40">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-800">Em Uso</p>
                      <p className="text-3xl font-bold text-blue-700 mt-1">{kpisMonitores.emUso}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-blue-600 mt-2">Alocados com colaboradores/postos</p>
                </CardContent>
              </Card>

              {/* 3. Disponíveis */}
              <Card className="border-emerald-200 bg-emerald-50/40">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Disponíveis</p>
                      <p className="text-3xl font-bold text-emerald-700 mt-1">{kpisMonitores.disponiveis}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <Monitor className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-600 mt-2">Livres em estoque TI</p>
                </CardContent>
              </Card>

              {/* 4. Vida Útil Vencida (> 5 anos) */}
              <Card className="border-purple-200 bg-purple-50/40">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-800">Vida Útil Vencida</p>
                      <p className="text-3xl font-bold text-purple-700 mt-1">{kpisMonitores.vidaUtilVencida}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-purple-600 mt-2">&gt; 5 anos desde aquisição</p>
                </CardContent>
              </Card>
            </div>

            {/* Barra de Filtros Monitores (sem antivírus e formatação) */}
            <Card className="p-4 border-slate-200">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar monitor por etiqueta, modelo, usuário ou área..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="w-[140px] text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Status</SelectItem>
                      <SelectItem value="Em uso">Em uso</SelectItem>
                      <SelectItem value="Disponível">Disponível</SelectItem>
                      <SelectItem value="Aguardando Devolução">Aguardando Dev.</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filtroVidaUtil} onValueChange={setFiltroVidaUtil}>
                    <SelectTrigger className="w-[140px] text-xs">
                      <SelectValue placeholder="Vida Útil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Toda Vida Útil</SelectItem>
                      <SelectItem value="ok">Em dia (&lt; 5 anos)</SelectItem>
                      <SelectItem value="atencao">Atenção (≤ 90d)</SelectItem>
                      <SelectItem value="atrasado">Vencida (&gt; 5 anos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Tabela de Monitores (Apenas Etiqueta, Modelo, Usuário/Área, Aquisição, Vida Útil, Status) */}
            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="border-b py-3 px-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-800">
                    Monitores ({filteredMonitores.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-xs">Etiqueta</TableHead>
                        <TableHead className="text-xs">Modelo & Marca</TableHead>
                        <TableHead className="text-xs">Usuário & Área</TableHead>
                        <TableHead className="text-xs">Data de Aquisição</TableHead>
                        <TableHead className="text-xs">Vida Útil (5 anos)</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Carregando monitores...
                          </TableCell>
                        </TableRow>
                      ) : filteredMonitores.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum monitor encontrado com os filtros selecionados
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMonitores.map((eq) => {
                          return (
                            <TableRow key={`${eq.origem_tabela}-${eq.id}`} className="hover:bg-slate-50/70 text-xs">
                              <TableCell className="font-mono font-bold text-slate-900">
                                {eq.etiqueta_interna || "—"}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-semibold text-slate-800">{eq.maquina || "Monitor"}</p>
                                  <Badge variant="outline" className="text-[10px] mt-0.5">
                                    Monitor
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-slate-900">{eq.usuario_atual || "Estoque / Livre"}</p>
                                  <p className="text-[11px] text-slate-500">{eq.colaborador_area || "—"}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="font-medium text-slate-800">
                                  {eq.data_aquisicao ? formatarDataSemFuso(eq.data_aquisicao) : "Sem aquisição"}
                                </p>
                              </TableCell>
                              <TableCell>
                                <div>
                                  {eq.status_vida_util === "ok" && (
                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                      OK ({eq.dias_para_fim_vida_util}d restantes)
                                    </Badge>
                                  )}
                                  {eq.status_vida_util === "atencao" && (
                                    <Badge className="bg-amber-100 text-amber-800 text-[10px] border-amber-300">
                                      Vence em {eq.dias_para_fim_vida_util} dias
                                    </Badge>
                                  )}
                                  {eq.status_vida_util === "atrasado" && (
                                    <Badge className="bg-purple-100 text-purple-800 text-[10px] border-purple-300 font-bold">
                                      Vencida há {Math.abs(eq.dias_para_fim_vida_util)} dias
                                    </Badge>
                                  )}
                                  {eq.status_vida_util === "sem_registro" && (
                                    <Badge className="bg-slate-100 text-slate-600 text-[10px]">
                                      Sem registro de data
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  eq.status === "Disponível" ? "bg-emerald-100 text-emerald-800" :
                                  eq.status === "Em uso" ? "bg-blue-100 text-blue-800" :
                                  eq.status === "Aguardando Devolução" ? "bg-amber-100 text-amber-800 border-amber-300" :
                                  "bg-slate-100 text-slate-800"
                                }>
                                  {eq.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>

      {/* Modal de Importação em Lote via Excel */}
      <ModalImportacaoEquipamentos
        open={modalImportacaoOpen}
        onClose={() => setModalImportacaoOpen(false)}
        pcs={pcsInternos}
        notebooks={notebooksExternos}
        colaboradores={colaboradores}
      />
    </div>
  );
}
