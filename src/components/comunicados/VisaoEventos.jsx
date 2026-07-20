/**
 * VisaoEventos — visão geral de eventos por mês com status de arte por demanda.
 *
 * BUG FIX (upload): O estado modalUpload armazena APENAS { demandaId, colaboradorId,
 * colaboradorNome, tipo } — não o objeto completo. O handleUploadSuccess captura
 * demandaId em const antes do await, garantindo que a closure seja estável mesmo
 * após re-renders assíncronos.
 */
import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Heart, Baby, Star, UserX, CheckCircle, Loader2, Search } from "lucide-react";
import { format, getMonth, getDate, getYear, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import UploadArteModal from "./UploadArteModal";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const hoje = new Date();
const mesAtual = getMonth(hoje);
const anoAtual = getYear(hoje);
const diaAtual = getDate(hoje);

function mesNasce(d) { if (!d) return -1; return getMonth(new Date(d + "T00:00:00")); }
function isHoje(d) {
  if (!d) return false;
  const dt = new Date(d + "T00:00:00");
  return getMonth(dt) === mesAtual && getDate(dt) === diaAtual;
}
function fmtDiaMes(d) {
  if (!d) return null;
  const dt = new Date(d + "T00:00:00");
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function findDemanda(demandas, colaboradorId, tipo, mesFiltro) {
  return demandas.find(d =>
    d.colaborador_id === colaboradorId &&
    d.tipo_comunicado === tipo &&
    d.ano_referencia === anoAtual &&
    (mesFiltro === undefined || (d.data_evento && new Date(d.data_evento + "T00:00:00").getMonth() === mesFiltro))
  );
}

// Badge de status — onUpload é apenas uma callback, não renderiza modal aqui
function ArteBadge({ demanda, onUpload }) {
  if (!demanda || demanda.status_arte === "sem_arte") {
    return (
      <button
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 text-orange-700 border border-orange-300 text-xs font-medium hover:bg-orange-200 transition-colors cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onUpload && onUpload(); }}
        title="Clique para carregar arte"
      >⚠️ Sem arte</button>
    );
  }
  if (demanda.status_arte === "arte_carregada") return <Badge className="bg-green-100 text-green-800 text-xs shrink-0">✅ Arte pronta</Badge>;
  if (demanda.status_arte === "enviado") {
    const dtEnvio = demanda.data_envio ? format(new Date(demanda.data_envio), "dd/MM") : "";
    return <Badge className="bg-gray-100 text-gray-500 text-xs shrink-0">📤 Enviado{dtEnvio ? ` ${dtEnvio}` : ""}</Badge>;
  }
  if (demanda.status_arte === "erro_envio") return <Badge className="bg-red-100 text-red-700 text-xs shrink-0">❌ Erro</Badge>;
  return null;
}

function DetalheCell({ ev }) {
  const { colaborador, tipo } = ev;
  if (tipo === "aniversario_colaborador") {
    const data = fmtDiaMes(colaborador.data_nascimento);
    return data ? <span className="text-gray-600">{data}</span> : <span className="text-orange-500 text-xs font-medium">📅 Data não cadastrada</span>;
  }
  if (tipo === "aniversario_conjuge") {
    const data = fmtDiaMes(colaborador.conjuge_data_nascimento);
    return data ? <span className="text-gray-600">{data}</span> : <span className="text-orange-500 text-xs font-medium">📅 Data não cadastrada</span>;
  }
  if (tipo === "aniversario_filho_1ano") {
    const filho = (colaborador.filhos || []).find(f => {
      if (!f.filho_data_nascimento) return false;
      return new Date(f.filho_data_nascimento + "T00:00:00").getFullYear() === anoAtual - 1;
    });
    const data = fmtDiaMes(filho?.filho_data_nascimento);
    return data ? <span className="text-gray-600">{data} <span className="text-gray-400">(1 ano)</span></span>
      : <span className="text-orange-500 text-xs font-medium">📅 Data não cadastrada</span>;
  }
  if (tipo === "tempo_empresa") {
    const data = fmtDiaMes(colaborador.data_admissao);
    return data
      ? <span className="text-gray-600">{data} — {ev.extra}</span>
      : <span className="text-orange-500 text-xs font-medium">📅 Data não cadastrada</span>;
  }
  return <span className="text-gray-400">—</span>;
}

function SecaoCard({ icon: IconComp, titulo, cor, children }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 text-base ${cor}`}>
          <IconComp className="w-5 h-5" />{titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Visão do mês atual ───────────────────────────────────────────────────────
function VisaoMesAtual({ colaboradores, demandas, podeEnviarDespedida, abrirModal }) {
  const queryClient = useQueryClient();
  const [enviandoId, setEnviandoId] = useState(null);

  const enviarDespedida = async (c) => {
    setEnviandoId(c.id);
    await base44.functions.invoke('enviarDespedida', { colaborador_id: c.id });
    queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
    queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] });
    setEnviandoId(null);
  };

  const aniversariantesMes = useMemo(() =>
    colaboradores.filter(c => c.status !== "Desligado" && mesNasce(c.data_nascimento) === mesAtual), [colaboradores]);
  const tempoEmpresa = useMemo(() =>
    colaboradores.filter(c => {
      if (!c.data_admissao || c.status === "Desligado") return false;
      if (mesNasce(c.data_admissao) !== mesAtual) return false;
      const anos = differenceInYears(hoje, new Date(c.data_admissao + "T00:00:00"));
      return [1, 2, 3, 5, 10, 15, 20].includes(anos);
    }).map(c => ({ ...c, anos: differenceInYears(hoje, new Date(c.data_admissao + "T00:00:00")) })),
    [colaboradores]);
  const conjugesMes = useMemo(() =>
    colaboradores.filter(c => c.status !== "Desligado" && mesNasce(c.conjuge_data_nascimento) === mesAtual), [colaboradores]);
  const filhos1Ano = useMemo(() =>
    colaboradores.filter(c => {
      if (c.status === "Desligado") return false;
      return (c.filhos || []).some(f => {
        if (!f.filho_data_nascimento) return false;
        const dt = new Date(f.filho_data_nascimento + "T00:00:00");
        return dt.getFullYear() === anoAtual - 1 && dt.getMonth() === mesAtual;
      });
    }), [colaboradores]);
  const desligados = useMemo(() =>
    colaboradores.filter(c => c.status === "Desligado" && !c.comunicado_despedida_enviado), [colaboradores]);

  const tipoTempoLabel = (anos) => {
    if (anos >= 20) return "🌟 20 Anos"; if (anos >= 15) return "🌟 15 Anos";
    if (anos >= 10) return "🌟 10 Anos"; if (anos >= 5) return "🏆 5 Anos";
    if (anos >= 3) return "🥈 3 Anos"; if (anos >= 2) return "🥈 2 Anos";
    return "🥇 1 Ano";
  };

  return (
    <div className="space-y-5">
      <SecaoCard icon={Users} titulo={`Aniversariantes do Mês (${format(hoje, "MMMM", { locale: ptBR })})`} cor="text-pink-700">
        {aniversariantesMes.length === 0 ? <p className="text-sm text-gray-400">Nenhum aniversariante este mês.</p>
          : <div className="space-y-2">{aniversariantesMes.map(c => {
            const dem = findDemanda(demandas, c.id, "aniversario_colaborador", mesAtual);
            return (
              <div key={c.id} className="flex items-center gap-3 bg-pink-50 border border-pink-100 rounded-lg p-3">
                {c.foto_url
                  ? <img src={c.foto_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  : <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-bold text-sm shrink-0">{c.nome_completo?.charAt(0)}</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{c.nome_completo}</p>
                  <p className="text-xs text-gray-500">{c.area}{c.cargo && ` · ${c.cargo}`}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {c.data_nascimento ? <span className="text-xs text-gray-500">{fmtDiaMes(c.data_nascimento)}</span> : <span className="text-xs text-orange-500">Data não cadastrada</span>}
                  {isHoje(c.data_nascimento) && <Badge className="bg-pink-500 text-white text-xs">🎂 Hoje!</Badge>}
                  <ArteBadge demanda={dem} onUpload={() => abrirModal(c, "aniversario_colaborador", dem, mesAtual)} />
                </div>
              </div>
            );
          })}</div>}
      </SecaoCard>

      <SecaoCard icon={Star} titulo="Aniversários de Tempo de Empresa" cor="text-yellow-700">
        {tempoEmpresa.length === 0 ? <p className="text-sm text-gray-400">Nenhum este mês.</p>
          : <div className="space-y-2">{tempoEmpresa.map(c => {
            const dem = findDemanda(demandas, c.id, "tempo_empresa", mesAtual);
            return (
              <div key={c.id} className="flex items-center gap-3 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{c.nome_completo}</p>
                  <p className="text-xs text-gray-500">Admissão: {fmtDiaMes(c.data_admissao) || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-400 text-yellow-900 text-xs">{tipoTempoLabel(c.anos)}</Badge>
                  <ArteBadge demanda={dem} onUpload={() => abrirModal(c, "tempo_empresa", dem, mesAtual)} />
                </div>
              </div>
            );
          })}</div>}
      </SecaoCard>

      <SecaoCard icon={Heart} titulo="Aniversários de Cônjuges" cor="text-red-600">
        {conjugesMes.length === 0 ? <p className="text-sm text-gray-400">Nenhum este mês.</p>
          : <div className="space-y-2">{conjugesMes.map(c => {
            const dem = findDemanda(demandas, c.id, "aniversario_conjuge", mesAtual);
            return (
              <div key={c.id} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg p-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{c.nome_completo}</p>
                  <p className="text-xs text-gray-500">Cônjuge: <strong>{c.conjuge_nome || "—"}</strong></p>
                </div>
                <div className="flex items-center gap-2">
                  {c.conjuge_data_nascimento ? <span className="text-xs text-gray-500">{fmtDiaMes(c.conjuge_data_nascimento)}</span> : null}
                  {isHoje(c.conjuge_data_nascimento) && <Badge className="bg-red-500 text-white text-xs">🎂 Hoje!</Badge>}
                  <ArteBadge demanda={dem} onUpload={() => abrirModal(c, "aniversario_conjuge", dem, mesAtual)} />
                </div>
              </div>
            );
          })}</div>}
      </SecaoCard>

      <SecaoCard icon={Baby} titulo="Filhos que Completam 1 Ano este Mês" cor="text-purple-700">
        {filhos1Ano.length === 0 ? <p className="text-sm text-gray-400">Nenhum este mês.</p>
          : <div className="space-y-2">{filhos1Ano.map(c => {
            const filhosAniv = (c.filhos || []).filter(f => {
              if (!f.filho_data_nascimento) return false;
              const dt = new Date(f.filho_data_nascimento + "T00:00:00");
              return dt.getFullYear() === anoAtual - 1 && dt.getMonth() === mesAtual;
            });
            return filhosAniv.map((f, i) => {
              const dem = findDemanda(demandas, c.id, "aniversario_filho_1ano", mesAtual);
              return (
                <div key={`${c.id}-${i}`} className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{c.nome_completo}</p>
                    <p className="text-xs text-gray-500">Filho(a): <strong>{f.filho_nome || "—"}</strong></p>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.filho_data_nascimento && <span className="text-xs text-gray-500">{fmtDiaMes(f.filho_data_nascimento)}</span>}
                    {isHoje(f.filho_data_nascimento) && <Badge className="bg-purple-500 text-white text-xs">🎈 Hoje!</Badge>}
                    <ArteBadge demanda={dem} onUpload={() => abrirModal(c, "aniversario_filho_1ano", dem, mesAtual)} />
                  </div>
                </div>
              );
            });
          })}</div>}
      </SecaoCard>

      <SecaoCard icon={UserX} titulo="Desligamentos Pendentes (Despedida)" cor="text-gray-700">
        {desligados.length === 0 ? <p className="text-sm text-gray-400">Nenhuma pendente. ✅</p>
          : <div className="space-y-2">{desligados.map(c => {
            const dem = findDemanda(demandas, c.id, "despedida");
            return (
              <div key={c.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{c.nome_completo}</p>
                  <p className="text-xs text-gray-500">{c.area}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ArteBadge demanda={dem} onUpload={() => abrirModal(c, "despedida", dem, undefined)} />
                  {podeEnviarDespedida && (
                    <Button size="sm" variant="outline" onClick={() => enviarDespedida(c)} disabled={enviandoId === c.id}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {enviandoId === c.id ? "Enviando..." : "Enviar"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}</div>}
      </SecaoCard>
    </div>
  );
}

// ─── Visão Anual ──────────────────────────────────────────────────────────────
function calcularEventosPorMes(colaboradores) {
  const porMes = Array.from({ length: 12 }, () => []);
  colaboradores.forEach(c => {
    if (c.status === "Desligado") {
      if (!c.comunicado_despedida_enviado) porMes[mesAtual].push({ colaborador: c, tipo: "despedida" });
      return;
    }
    if (c.data_nascimento) {
      const m = mesNasce(c.data_nascimento);
      if (m >= 0) porMes[m].push({ colaborador: c, tipo: "aniversario_colaborador" });
    }
    if (c.conjuge_data_nascimento) {
      const m = mesNasce(c.conjuge_data_nascimento);
      if (m >= 0) porMes[m].push({ colaborador: c, tipo: "aniversario_conjuge" });
    }
    (c.filhos || []).forEach(f => {
      if (!f.filho_data_nascimento) return;
      const dt = new Date(f.filho_data_nascimento + "T00:00:00");
      if (dt.getFullYear() === anoAtual - 1) {
        porMes[dt.getMonth()].push({ colaborador: c, tipo: "aniversario_filho_1ano", extra: f.filho_nome });
      }
    });
    if (c.data_admissao) {
      const dtAdm = new Date(c.data_admissao + "T00:00:00");
      const anos = anoAtual - dtAdm.getFullYear();
      if ([1, 2, 3, 5, 10, 15, 20].includes(anos)) {
        porMes[dtAdm.getMonth()].push({ colaborador: c, tipo: "tempo_empresa", extra: `${anos} ano${anos > 1 ? "s" : ""}` });
      }
    }
  });
  return porMes;
}

const TIPO_COR = {
  aniversario_colaborador: "bg-pink-100 text-pink-800",
  aniversario_conjuge: "bg-red-100 text-red-800",
  aniversario_filho_1ano: "bg-purple-100 text-purple-800",
  tempo_empresa: "bg-yellow-100 text-yellow-800",
  despedida: "bg-gray-100 text-gray-700",
};
const TIPO_LABEL_CURTO = {
  aniversario_colaborador: "🎂 Aniv.",
  aniversario_conjuge: "💑 Cônjuge",
  aniversario_filho_1ano: "🎈 1 Aninho",
  tempo_empresa: "🏆 Empresa",
  despedida: "💼 Despedida",
};

// Ordenação: sem_arte primeiro, depois arte_carregada, depois enviado
function statusOrdem(status) {
  if (!status || status === "sem_arte") return 0;
  if (status === "arte_carregada") return 1;
  return 2;
}

function VisaoAnual({ colaboradores, demandas, abrirModal }) {
  const [mesExpandido, setMesExpandido] = useState(mesAtual);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroArte, setFiltroArte] = useState("todos");

  const eventosPorMes = useMemo(() => calcularEventosPorMes(colaboradores), [colaboradores]);

  return (
    <div className="space-y-3">
      {/* Filtros globais */}
      <div className="flex flex-wrap gap-2 items-center p-3 bg-gray-50 border rounded-lg">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Buscar colaborador..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="aniversario_colaborador">🎂 Aniversário</SelectItem>
            <SelectItem value="aniversario_conjuge">💑 Cônjuge</SelectItem>
            <SelectItem value="aniversario_filho_1ano">🎈 Filho 1 ano</SelectItem>
            <SelectItem value="tempo_empresa">🏆 Tempo empresa</SelectItem>
            <SelectItem value="despedida">💼 Despedida</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroArte} onValueChange={setFiltroArte}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="sem_arte">⚠️ Sem arte</SelectItem>
            <SelectItem value="arte_carregada">✅ Arte pronta</SelectItem>
            <SelectItem value="enviado">📤 Enviado</SelectItem>
          </SelectContent>
        </Select>
        {(busca || filtroTipo !== "todos" || filtroArte !== "todos") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setBusca(""); setFiltroTipo("todos"); setFiltroArte("todos"); }}>
            Limpar
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-500">Planejamento anual de {anoAtual} — clique em um mês para ver os eventos.</p>

      {MESES.map((nomeMes, idx) => {
        const todosEventos = eventosPorMes[idx] || [];

        // Filtrar eventos
        let eventos = todosEventos;
        if (filtroTipo !== "todos") eventos = eventos.filter(ev => ev.tipo === filtroTipo);
        if (busca) eventos = eventos.filter(ev => ev.colaborador.nome_completo?.toLowerCase().includes(busca.toLowerCase()));
        if (filtroArte !== "todos") eventos = eventos.filter(ev => {
          const dem = findDemanda(demandas, ev.colaborador.id, ev.tipo, idx);
          const s = dem?.status_arte || "sem_arte";
          return s === filtroArte;
        });

        // Ordenar: sem arte > arte pronta > enviado
        eventos = [...eventos].sort((a, b) => {
          const da = findDemanda(demandas, a.colaborador.id, a.tipo, idx);
          const db = findDemanda(demandas, b.colaborador.id, b.tipo, idx);
          return statusOrdem(da?.status_arte) - statusOrdem(db?.status_arte);
        });

        const isAtual = idx === mesAtual;
        const isOpen = mesExpandido === idx;

        // Contadores para o cabeçalho (baseados nos eventos originais do mês, sem filtro)
        const prontas = todosEventos.filter(ev => findDemanda(demandas, ev.colaborador.id, ev.tipo, idx)?.status_arte === "arte_carregada").length;
        const semArte = todosEventos.filter(ev => { const d = findDemanda(demandas, ev.colaborador.id, ev.tipo, idx); return !d || d.status_arte === "sem_arte"; }).length;
        const enviadas = todosEventos.filter(ev => findDemanda(demandas, ev.colaborador.id, ev.tipo, idx)?.status_arte === "enviado").length;

        return (
          <div key={idx} className={`border rounded-lg overflow-hidden ${isAtual ? "border-indigo-400 shadow-sm" : "border-gray-200"}`}>
            <button
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isOpen ? "bg-indigo-50" : "bg-white hover:bg-gray-50"}`}
              onClick={() => setMesExpandido(isOpen ? -1 : idx)}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-semibold text-sm ${isAtual ? "text-indigo-700" : "text-gray-800"}`}>
                  {isAtual && "📍 "}{nomeMes}
                </span>
                {todosEventos.length === 0 && <span className="text-xs text-gray-400">Nenhum evento</span>}
                {todosEventos.length > 0 && <Badge className="bg-indigo-100 text-indigo-700 text-xs">{todosEventos.length} evento{todosEventos.length > 1 ? "s" : ""}</Badge>}
                {prontas > 0 && <Badge className="bg-green-100 text-green-700 text-xs">✅ {prontas} pronta{prontas > 1 ? "s" : ""}</Badge>}
                {semArte > 0 && <Badge className="bg-orange-100 text-orange-700 border border-orange-300 text-xs">⚠️ {semArte} sem arte</Badge>}
                {enviadas > 0 && <Badge className="bg-gray-100 text-gray-500 text-xs">📤 {enviadas} enviada{enviadas > 1 ? "s" : ""}</Badge>}
              </div>
              <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
              <div className="border-t">
                {eventos.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">
                    {todosEventos.length > 0 ? "Nenhum evento corresponde aos filtros." : "Nenhum evento neste mês."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Colaborador</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Evento</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Detalhe</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Arte</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Envio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventos.map((ev, i) => {
                          const dem = findDemanda(demandas, ev.colaborador.id, ev.tipo, idx);
                          return (
                            <tr key={i} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-2">
                                <p className="font-medium text-gray-800">{ev.colaborador.nome_completo}</p>
                                <p className="text-xs text-gray-400">{ev.colaborador.area}</p>
                              </td>
                              <td className="px-4 py-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${TIPO_COR[ev.tipo] || "bg-gray-100 text-gray-700"}`}>
                                  {TIPO_LABEL_CURTO[ev.tipo] || ev.tipo}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-xs">
                                <DetalheCell ev={ev} />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <ArteBadge
                                  demanda={dem}
                                  onUpload={() => abrirModal(ev.colaborador, ev.tipo, dem, idx)}
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                {dem?.status_arte === "arte_carregada" && (
                                  <Badge className="bg-gray-100 text-gray-500 text-xs">Não enviado</Badge>
                                )}
                                {dem?.status_arte === "enviado" && dem?.data_envio && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    Enviado {format(new Date(dem.data_envio), "dd/MM")}
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Componente exportado ─────────────────────────────────────────────────────
export default function VisaoEventos({ modo = "mes", podeEnviarDespedida = false }) {
  const queryClient = useQueryClient();
  const [localModo, setLocalModo] = useState(modo);

  // Estado estável: só IDs e campos primitivos — sem objetos instáveis
  const [modalUpload, setModalUpload] = useState(null);
  // { demandaId: string|null, colaboradorId: string, colaboradorNome: string, tipo: string }

  const { data: colaboradores = [], isLoading: loadColabs } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: () => base44.entities.Colaboradores.list(),
    staleTime: 60_000,
  });

  const { data: demandas = [], isLoading: loadDemandas } = useQuery({
    queryKey: ["comunicados_artes"],
    queryFn: () => base44.entities.Comunicados_Artes.list(),
    staleTime: 30_000,
  });

  // Captura apenas primitivos — closure estável mesmo após re-renders
  const abrirModal = (colaborador, tipo, demanda, mesFiltro) => {
    setModalUpload({
      demandaId: demanda?.id || null,
      colaboradorId: colaborador.id,
      colaboradorNome: colaborador.nome_completo,
      tipo,
    });
  };

  // onSuccess recebe a URL do arquivo já uploaded pelo UploadArteModal
  // Captura demandaId em const ANTES do await — closure estável
  const handleUploadSuccess = async (fileUrl) => {
    if (!modalUpload) return;
    const { demandaId, colaboradorId, colaboradorNome, tipo } = modalUpload;

    if (demandaId) {
      const id = demandaId;
      await base44.entities.Comunicados_Artes.update(id, {
        imagem_url: fileUrl,
        status_arte: "arte_carregada",
      });
    } else {
      await base44.entities.Comunicados_Artes.create({
        colaborador_id: colaboradorId,
        colaborador_nome: colaboradorNome,
        tipo_comunicado: tipo,
        imagem_url: fileUrl,
        status_arte: "arte_carregada",
        ano_referencia: anoAtual,
        criado_por: "portal",
      });
    }

    queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] });
    setModalUpload(null);
  };

  if (loadColabs || loadDemandas) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setLocalModo("mes")}
            className={`px-4 py-2 text-xs font-medium border rounded-l-lg hover:bg-gray-100 transition-colors ${localModo === "mes" ? "bg-indigo-600 border-indigo-600 text-white font-semibold" : "bg-white border-gray-200 text-gray-700"}`}
          >
            📅 Eventos do Mês
          </button>
          <button
            type="button"
            onClick={() => setLocalModo("anual")}
            className={`px-4 py-2 text-xs font-medium border-t border-b border-r rounded-r-lg hover:bg-gray-100 transition-colors ${localModo === "anual" ? "bg-indigo-600 border-indigo-600 text-white font-semibold" : "bg-white border-gray-200 text-gray-700"}`}
          >
            📆 Planejamento Anual
          </button>
        </div>
      </div>

      {/* Modal UMA VEZ no nível raiz — nunca dentro de map/loop */}
      {modalUpload && (
        <UploadArteModal
          open={!!modalUpload}
          onClose={() => setModalUpload(null)}
          colaborador={{ id: modalUpload.colaboradorId, nome_completo: modalUpload.colaboradorNome }}
          tipo={modalUpload.tipo}
          anoReferencia={anoAtual}
          onSuccess={handleUploadSuccess}
        />
      )}

      {localModo === "anual" ? (
        <VisaoAnual
          colaboradores={colaboradores}
          demandas={demandas}
          abrirModal={abrirModal}
        />
      ) : (
        <VisaoMesAtual
          colaboradores={colaboradores}
          demandas={demandas}
          podeEnviarDespedida={podeEnviarDespedida}
          abrirModal={abrirModal}
        />
      )}
    </div>
  );
}
