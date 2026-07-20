import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Download, TrendingUp, Clock, DollarSign, Layers } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function calcularMinutosUteis(inicio, fim) {
  if (!inicio || !fim) return 0;
  const d1 = new Date(inicio);
  const d2 = new Date(fim);
  if (d2 <= d1) return 0;
  const INICIO_MIN = 7 * 60 + 42;
  const FIM_MIN = 17 * 60 + 30;
  let total = 0;
  const cur = new Date(d1);
  cur.setSeconds(0, 0);
  while (cur < d2) {
    const dow = cur.getDay();
    if (dow >= 1 && dow <= 5) {
      const base = new Date(cur); base.setHours(0, 0, 0, 0);
      const expIni = new Date(base.getTime() + INICIO_MIN * 60000);
      const expFim = new Date(base.getTime() + FIM_MIN * 60000);
      const segIni = cur < expIni ? expIni : cur;
      const nextDay = new Date(base.getTime() + 86400000);
      const segFim = d2 < expFim ? d2 : (nextDay < expFim ? nextDay : expFim);
      if (segFim > segIni) total += Math.round((segFim - segIni) / 60000);
    }
    const next = new Date(cur); next.setDate(next.getDate() + 1); next.setHours(0, 0, 0, 0);
    cur.setTime(next.getTime());
  }
  return total;
}

function formatMin(m) {
  if (!m || m <= 0) return "—";
  const h = Math.floor(m / 60); const min = m % 60;
  return min > 0 ? `${h}h ${min}min` : `${h}h`;
}

function exportCSV(rows) {
  const cols = ["Chamado","Mês","Empresa","Nº Chamado Externo","Solicitante","Responsável","H. Contratadas","H. Realizadas","Valor/hora","Custo Total","Tempo TI (útil)","Tempo Terceiro (útil)","Marcos","Status"];
  const data = rows.map(r => [
    r.numero_chamado, r.mesLabel, r.terceiro_empresa || "—", r.terceiro_numero_chamado || "—",
    r.solicitante_nome, r.responsavel || "—",
    r.projeto_horas_contratadas || 0, r.projeto_horas_realizadas || 0,
    r.projeto_valor_hora || 0, r.custoTotal,
    formatMin(r.tempoTI), formatMin(r.tempoTerceiro),
    (r.projeto_marcos||[]).length, r.status,
  ]);
  const csv = [cols, ...data].map(r => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "projetos_terceiros.csv"; a.click();
}

export default function ProjetosTerceiros() {
  const { user } = useAuth();
  const [filterMes, setFilterMes] = useState("todos");
  const [filterEmpresa, setFilterEmpresa] = useState("todas");

  const { data: chamados = [], isLoading } = useQuery({
    queryKey: ['chamados_terceiros'],
    queryFn: () => base44.entities.Chamados.list('-created_date'),
    staleTime: 30000,
  });

  // Um chamado é considerado PROJETO quando tem dados financeiros ou marcos definidos.
  // Chamados com terceiro_envolvido=true mas sem dados de projeto são apenas atendimentos terceirizados,
  // não aparecem aqui — ficam apenas no módulo de Chamados.
  const eProjeto = (c) => (
    (c.projeto_horas_contratadas > 0) ||
    (c.projeto_valor_hora > 0) ||
    ((c.projeto_marcos || []).length > 0)
  );

  const projetos = chamados
    .filter(c => c.terceiro_envolvido && eProjeto(c))
    .map(c => {
      const mes = c.data_abertura ? format(parseISO(c.data_abertura), "yyyy-MM") : "—";
      const mesLabel = c.data_abertura ? format(parseISO(c.data_abertura), "MMMM/yyyy", { locale: ptBR }) : "—";
      const horas = c.projeto_horas_realizadas || c.projeto_horas_contratadas || 0;
      const valorHora = c.projeto_valor_hora || 0;
      const custoTotal = horas * valorHora;
      const tempoTI = c.tempo_util_minutos || 0;
      const tempoTerceiro = (c.terceiro_data_abertura && c.terceiro_data_resolucao)
        ? calcularMinutosUteis(c.terceiro_data_abertura, c.terceiro_data_resolucao)
        : 0;
      return { ...c, mes, mesLabel, custoTotal, tempoTI, tempoTerceiro };
    });

  const meses = [...new Set(projetos.map(p => p.mes))].sort().reverse();
  const empresas = [...new Set(projetos.map(p => p.terceiro_empresa).filter(Boolean))].sort();

  const filtrados = projetos.filter(p => {
    if (filterMes !== "todos" && p.mes !== filterMes) return false;
    if (filterEmpresa !== "todas" && p.terceiro_empresa !== filterEmpresa) return false;
    return true;
  });

  const porMes = filtrados.reduce((acc, p) => {
    if (!acc[p.mes]) acc[p.mes] = { label: p.mesLabel, itens: [], totalCusto: 0, totalHorasContr: 0, totalHorasReal: 0 };
    acc[p.mes].itens.push(p);
    acc[p.mes].totalCusto += p.custoTotal;
    acc[p.mes].totalHorasContr += p.projeto_horas_contratadas || 0;
    acc[p.mes].totalHorasReal += p.projeto_horas_realizadas || 0;
    return acc;
  }, {});

  const totalGeral = {
    custo: filtrados.reduce((a, p) => a + p.custoTotal, 0),
    hContr: filtrados.reduce((a, p) => a + (p.projeto_horas_contratadas || 0), 0),
    hReal: filtrados.reduce((a, p) => a + (p.projeto_horas_realizadas || 0), 0),
    projetos: filtrados.length
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="p-4 md:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center"><Building2 className="w-6 h-6 text-indigo-600" /></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Projetos / Terceiros</h1>
              <p className="text-muted-foreground mt-1">Chamados com terceiros que possuem horas contratadas, valor/hora ou marcos definidos</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => exportCSV(filtrados)} className="gap-2"><Download className="w-4 h-4" />Exportar CSV</Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">Mês</p>
            <Select value={filterMes} onValueChange={setFilterMes}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {meses.map(m => <SelectItem key={m} value={m}>{projetos.find(p=>p.mes===m)?.mesLabel}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Empresa Terceira</p>
            <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as empresas</SelectItem>
                {empresas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-6 text-center">
            <Layers className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
            <p className="text-sm text-gray-600">Projetos</p>
            <p className="text-3xl font-bold text-indigo-700">{totalGeral.projetos}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <DollarSign className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-sm text-gray-600">Custo Total</p>
            <p className="text-2xl font-bold text-green-700">R$ {totalGeral.custo.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <Clock className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-sm text-gray-600">Horas Contratadas</p>
            <p className="text-3xl font-bold text-blue-700">{totalGeral.hContr}h</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <TrendingUp className="w-6 h-6 text-orange-500 mx-auto mb-1" />
            <p className="text-sm text-gray-600">Horas Realizadas</p>
            <p className={`text-3xl font-bold ${totalGeral.hReal > totalGeral.hContr ? "text-red-600" : "text-orange-600"}`}>{totalGeral.hReal}h</p>
          </CardContent></Card>
        </div>

        {filtrados.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-gray-400">Nenhum projeto de terceiro encontrado para os filtros selecionados.</CardContent></Card>
        ) : (
          Object.entries(porMes).sort(([a],[b]) => b.localeCompare(a)).map(([mes, grupo]) => (
            <Card key={mes} className="mb-6">
              <CardHeader className="border-b bg-indigo-50 rounded-t-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <CardTitle className="text-indigo-900 capitalize">{grupo.label}</CardTitle>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-600">Projetos: <strong className="text-indigo-700">{grupo.itens.length}</strong></span>
                    <span className="text-gray-600">Custo: <strong className="text-green-700">R$ {grupo.totalCusto.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></span>
                    <span className="text-gray-600">Horas: <strong className="text-blue-700">{grupo.totalHorasReal}/{grupo.totalHorasContr}h</strong></span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chamado</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Nº Externo</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>H. Contr.</TableHead>
                        <TableHead>H. Real.</TableHead>
                        <TableHead>Custo (R$)</TableHead>
                        <TableHead>Tempo TI (útil)</TableHead>
                        <TableHead>Tempo 3º (útil)</TableHead>
                        <TableHead>Marcos</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grupo.itens.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-sm">{p.numero_chamado}</TableCell>
                          <TableCell className="font-medium">{p.terceiro_empresa || "—"}</TableCell>
                          <TableCell className="text-sm text-gray-600">{p.terceiro_numero_chamado || "—"}</TableCell>
                          <TableCell><div><p className="text-sm font-medium">{p.solicitante_nome}</p><p className="text-xs text-gray-500">{p.solicitante_area}</p></div></TableCell>
                          <TableCell className="text-sm">{p.responsavel || "—"}</TableCell>
                          <TableCell className="text-sm text-center">{p.projeto_horas_contratadas || "—"}</TableCell>
                          <TableCell>
                            <span className={`text-sm font-semibold ${(p.projeto_horas_realizadas||0) > (p.projeto_horas_contratadas||0) ? "text-red-600" : "text-gray-800"}`}>
                              {p.projeto_horas_realizadas || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm font-semibold text-green-700">
                            {p.custoTotal > 0 ? `R$ ${p.custoTotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-blue-700 font-medium">{p.tempoTI > 0 ? formatMin(p.tempoTI) : "—"}</TableCell>
                          <TableCell className="text-sm text-orange-700 font-medium">{p.tempoTerceiro > 0 ? formatMin(p.tempoTerceiro) : "—"}</TableCell>
                          <TableCell>
                            {(p.projeto_marcos||[]).length > 0 && (
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{(p.projeto_marcos||[]).filter(m=>m.status==="Concluído").length}/{(p.projeto_marcos||[]).length}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={p.status === "Resolvido" ? "bg-green-100 text-green-800" : p.status === "Em Andamento" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}>{p.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}