/**
 * AbaEnvios — aba de histórico de envios e disparo manual de automações.
 * Visível para admin e colaboradores com permissão ver_visao_geral.
 */
import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Play, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_LABELS = {
  aniversario_colaborador: "🎂 Aniversário",
  aniversario_conjuge: "💑 Cônjuge",
  aniversario_filho_1ano: "🎈 1 Aninho",
  tempo_empresa: "🏆 Empresa",
  despedida: "💼 Despedida",
  boas_vindas: "👋 Boas-vindas",
};

function StatusBadge({ status }) {
  if (status === "enviado") return <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Enviado</Badge>;
  if (status === "erro") return <Badge className="bg-red-100 text-red-800 text-xs"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
  if (status === "sem_arte") return <Badge className="bg-orange-100 text-orange-700 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Sem arte</Badge>;
  if (status === "sem_destinatario") return <Badge className="bg-gray-100 text-gray-600 text-xs">Sem dest.</Badge>;
  return <Badge className="bg-gray-100 text-gray-500 text-xs">{status}</Badge>;
}

function ModalDetalhes({ log, onClose }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Colaborador</p>
          <p className="font-medium">{log.colaborador_nome || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Tipo</p>
          <p>{TIPO_LABELS[log.tipo_comunicado] || log.tipo_comunicado}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Status</p>
          <StatusBadge status={log.status} />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Data de Envio</p>
          <p>{log.data_envio ? format(parseISO(log.data_envio), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</p>
        </div>
      </div>
      {log.assunto_enviado && (
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Assunto</p>
          <p className="text-sm bg-gray-50 border rounded px-3 py-2">{log.assunto_enviado}</p>
        </div>
      )}
      {log.destinatarios?.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Destinatários ({log.destinatarios.length})</p>
          <div className="max-h-40 overflow-y-auto bg-gray-50 border rounded px-3 py-2 space-y-1">
            {log.destinatarios.map((e, i) => <p key={i} className="text-xs text-gray-700">{e}</p>)}
          </div>
        </div>
      )}
      {log.detalhe_erro && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-red-700 mb-0.5">Detalhe do erro</p>
          <p className="text-xs text-red-600">{log.detalhe_erro}</p>
        </div>
      )}
      <div className="flex justify-end pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}

export default function AbaEnvios() {
  const queryClient = useQueryClient();
  const [disparando, setDisparando] = useState(false);
  const [resultadoDisparo, setResultadoDisparo] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [detalhesLog, setDetalhesLog] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroMes, setFiltroMes] = useState("todos");

  const { data: configs = [] } = useQuery({
    queryKey: ["comunicados_config"],
    queryFn: () => base44.entities.Comunicados_Config.list(),
    staleTime: 5 * 60_000,
  });

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["comunicados_log"],
    queryFn: () => base44.entities.Comunicados_Log.list("-data_envio", 200),
    staleTime: 30_000,
  });

  const mesesDisponiveis = useMemo(() => {
    const set = new Set();
    logs.forEach(l => {
      if (l.data_envio) {
        const d = parseISO(l.data_envio);
        set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
    });
    return Array.from(set).sort().reverse();
  }, [logs]);

  const logsFiltrados = useMemo(() => {
    let r = logs;
    if (filtroStatus !== "todos") r = r.filter(l => l.status === filtroStatus);
    if (filtroMes !== "todos") r = r.filter(l => {
      if (!l.data_envio) return false;
      const d = parseISO(l.data_envio);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === filtroMes;
    });
    return r;
  }, [logs, filtroStatus, filtroMes]);

  const handleDisparar = async () => {
    setConfirmando(false);
    setDisparando(true);
    setResultadoDisparo(null);
    try {
      const res = await base44.functions.invoke('dispararComunicados', {});
      queryClient.invalidateQueries({ queryKey: ["comunicados_log"] });
      queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] });
      
      const counts = res.data?.results?.comunicados || {};
      const totalEnviados = Object.values(counts).reduce((a, b) => a + b, 0);
      
      setResultadoDisparo({
        automacao: "Rotina Consolidada de Comunicados",
        msg: `Rotina executada com sucesso! Gerou demandas e enviou ${totalEnviados} e-mail(s) agendado(s) para hoje.`,
      });
    } catch (err) {
      console.error("Erro ao disparar rotina:", err);
      setResultadoDisparo({
        automacao: "Erro na Execução",
        msg: err.message || "Erro desconhecido ao disparar rotina de comunicados.",
        error: true,
      });
    } finally {
      setDisparando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resultado do disparo */}
      {resultadoDisparo && (
        <div className={`border rounded-lg p-4 flex items-start gap-3 ${resultadoDisparo.error ? "bg-red-50 border-red-300 text-red-800" : "bg-green-50 border-green-300 text-green-850"}`}>
          {resultadoDisparo.error ? (
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold">{resultadoDisparo.automacao}</p>
            <p className="text-xs mt-0.5">{resultadoDisparo.msg}</p>
          </div>
          <button className="text-gray-400 hover:text-gray-600 text-sm" onClick={() => setResultadoDisparo(null)}>✕</button>
        </div>
      )}

      {/* Disparador Manual Consolidado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="w-4 h-4 text-indigo-650" />
            Execução Manual da Rotina Diária
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            A rotina diária é executada de forma automática pelo servidor todas as manhãs. 
            Ao disparar manualmente, o sistema irá:
          </p>
          <ul className="text-xs text-gray-500 list-disc list-inside space-y-1.5 pl-2">
            <li>Sincronizar e criar automaticamente demandas pendentes para os próximos <strong>30 dias</strong>.</li>
            <li>Buscar colaboradores que fazem aniversário ou completam tempo de empresa <strong>HOJE</strong>.</li>
            <li>Disparar os e-mails com as artes customizadas prontas conforme as configurações salvas.</li>
            <li>Verificar se há eventos próximos sem arte cadastrada e notificar o RH por e-mail com <strong>7 dias</strong> de antecedência.</li>
          </ul>
          <div className="pt-3 border-t flex justify-end">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              disabled={disparando}
              onClick={() => setConfirmando(true)}
            >
              {disparando ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Processando Rotina...</>
              ) : (
                <><Play className="w-4 h-4 mr-1.5" />Executar Rotina Diária Agora</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de logs */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            Histórico de Envios
          </h3>
          <div className="flex gap-2 flex-wrap">
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {mesesDisponiveis.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
                <SelectItem value="sem_arte">Sem arte</SelectItem>
                <SelectItem value="sem_destinatario">Sem destinatário</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />Atualizar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : logsFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border rounded-lg">
            <p className="text-sm">Nenhum registro de envio encontrado.</p>
            <p className="text-xs mt-1">Os registros aparecerão aqui após o disparo das automações.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Data</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Colaborador</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Tipo</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Destinatários</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logsFiltrados.map(l => (
                  <tr key={l.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                      {l.data_envio ? format(parseISO(l.data_envio), "dd/MM/yyyy HH:mm") : "—"}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-800">{l.colaborador_nome || "—"}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs">{TIPO_LABELS[l.tipo_comunicado] || l.tipo_comunicado}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{l.destinatarios?.length ?? 0} e-mail(s)</td>
                    <td className="px-4 py-2"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-2 text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-600" onClick={() => setDetalhesLog(l)}>
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal confirmação de disparo */}
      <Dialog open={!!confirmando} onOpenChange={v => !v && setConfirmando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Disparo</DialogTitle>
            <DialogDescription>
              Disparar automação agora para verificar demandas de hoje.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                Isso irá verificar as demandas de <strong>HOJE</strong> com arte carregada e enviará os e-mails correspondentes.
              </p>
              <p className="text-xs text-yellow-600 mt-1">Automação: <strong>{confirmando?.label}</strong></p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setConfirmando(null)}>Cancelar</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleDisparar(confirmando)}>
                <Play className="w-3.5 h-3.5 mr-1" />Disparar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal detalhes do log */}
      <Dialog open={!!detalhesLog} onOpenChange={v => !v && setDetalhesLog(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Envio</DialogTitle>
            <DialogDescription>Informações completas sobre este registro de envio</DialogDescription>
          </DialogHeader>
          {detalhesLog && <ModalDetalhes log={detalhesLog} onClose={() => setDetalhesLog(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}