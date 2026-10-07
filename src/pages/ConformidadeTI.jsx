import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, Clock, Calendar, 
  Search, Upload, CheckCircle2, Monitor, Laptop, RefreshCw, FileSpreadsheet
} from "lucide-react";
import ModalImportacaoEquipamentos from "@/components/equipamentos/ModalImportacaoEquipamentos";
import { formatarDataSemFuso } from "@/utils/date";

export default function ConformidadeTI() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
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

  // KPI Calculations
  const kpis = useMemo(() => {
    // Filtramos apenas máquinas com sistema operacional (Desktop, Notebook) para antivírus e formatação
    const maquinasSO = equipamentos.filter(e => e.tipo === "Desktop" || e.tipo === "Notebook");

    const semAntivirus = maquinasSO.filter(e => e.antivirus !== "Sim").length;
    const formatacaoAtrasada = maquinasSO.filter(e => e.status_formatacao === "atrasado" || e.status_formatacao === "sem_registro").length;
    const formatacaoAtencao = maquinasSO.filter(e => e.status_formatacao === "atencao").length;
    const vidaUtilVencida = equipamentos.filter(e => e.status_vida_util === "atrasado").length;
    const vidaUtilAtencao = equipamentos.filter(e => e.status_vida_util === "atencao").length;

    return {
      total: equipamentos.length,
      maquinasSO: maquinasSO.length,
      semAntivirus,
      formatacaoAtrasada,
      formatacaoAtencao,
      vidaUtilVencida,
      vidaUtilAtencao
    };
  }, [equipamentos]);

  // Filtragem da tabela
  const filteredEquipamentos = useMemo(() => {
    return equipamentos.filter(eq => {
      const matchSearch = 
        (eq.etiqueta_interna && eq.etiqueta_interna.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.maquina && eq.maquina.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.usuario_atual && eq.usuario_atual.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.colaborador_area && eq.colaborador_area.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.anydesk_id && eq.anydesk_id.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchTipo = filtroTipo === "todos" || eq.tipo === filtroTipo;
      const matchStatus = filtroStatus === "todos" || eq.status === filtroStatus;
      const matchAntivirus = filtroAntivirus === "todos" || 
        (filtroAntivirus === "Sim" && eq.antivirus === "Sim") ||
        (filtroAntivirus === "Nao" && eq.antivirus !== "Sim");
      const matchFormatacao = filtroFormatacao === "todos" || eq.status_formatacao === filtroFormatacao;
      const matchVidaUtil = filtroVidaUtil === "todos" || eq.status_vida_util === filtroVidaUtil;

      return matchSearch && matchTipo && matchStatus && matchAntivirus && matchFormatacao && matchVidaUtil;
    });
  }, [equipamentos, searchTerm, filtroTipo, filtroStatus, filtroAntivirus, filtroFormatacao, filtroVidaUtil]);

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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Sem Antivírus */}
          <Card className="border-rose-200 bg-rose-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-800">Sem Antivírus</p>
                  <p className="text-3xl font-bold text-rose-700 mt-1">{kpis.semAntivirus}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-rose-600 mt-2">de {kpis.maquinasSO} Desktops/Notebooks</p>
            </CardContent>
          </Card>

          {/* 2. Formatação Atrasada (> 30 meses ou sem registro) */}
          <Card className="border-red-200 bg-red-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-800">Formatação Vencida</p>
                  <p className="text-3xl font-bold text-red-700 mt-1">{kpis.formatacaoAtrasada}</p>
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
                  <p className="text-3xl font-bold text-amber-700 mt-1">{kpis.formatacaoAtencao}</p>
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
                  <p className="text-3xl font-bold text-purple-700 mt-1">{kpis.vidaUtilVencida}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-purple-600 mt-2">&gt; 5 anos desde aquisição</p>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Filtros e Busca */}
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
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[130px] text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="Desktop">Desktop</SelectItem>
                  <SelectItem value="Notebook">Notebook</SelectItem>
                  <SelectItem value="Monitor">Monitor</SelectItem>
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

        {/* Tabela de Conformidade */}
        <Card className="overflow-hidden border-slate-200">
          <CardHeader className="border-b py-3 px-4 bg-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800">
                Inventário e Conformidade de Equipamentos ({filteredEquipamentos.length})
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
                  ) : filteredEquipamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum equipamento encontrado com os filtros selecionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEquipamentos.map((eq) => {
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
                            {eq.tipo === "Monitor" ? (
                              <span className="text-slate-400 italic">N/A</span>
                            ) : eq.antivirus === "Sim" ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">
                                {eq.antivirus_nome || "Sim (ESET)"}
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-800 border border-rose-300">
                                Não
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {eq.status_formatacao === "nao_se_aplica" ? (
                              <span className="text-slate-400 italic">N/A</span>
                            ) : (
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
                            )}
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
