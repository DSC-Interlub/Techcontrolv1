/**
 * VisaoEventos — componente compartilhado entre /Comunicados e /portal-comunicados.
 * Exibe visão geral de eventos por mês com status de arte para cada demanda.
 *
 * CORREÇÃO DE BUG: O UploadArteModal foi movido para o nível RAIZ do componente
 * exportado (VisaoEventos), fora de qualquer acordeão ou lista. Isso evita o erro
 * "message channel closed before a response was received" causado pela desmontagem
 * do componente pai durante o upload assíncrono.
 *
 * Props:
 *   modo: "mes" | "anual"
 *   podeEnviarDespedida: boolean
 */
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Heart, Baby, Star, UserX, CheckCircle, Loader2 } from "lucide-react";
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

// Badge de status — ao clicar "Sem arte", chama onUpload (não renderiza modal aqui)
function ArteBadge({ demanda, onUpload }) {
  if (!demanda || demanda.status_arte === "sem_arte") {
    return (
      <button
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 text-orange-700 border border-orange-300 text-xs font-medium hover:bg-orange-200 transition-colors cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onUpload && onUpload(); }}
        title="Clique para carregar arte"
      >
        ⚠️ Sem arte
      </button>
    );
  }
  if (demanda.status_arte === "arte_carregada") return <Badge className="bg-green-100 text-green-800 text-xs shrink-0">✅ Arte pronta</Badge>;
  if (demanda.status_arte === "enviado") return <Badge className="bg-gray-100 text-gray-500 text-xs shrink-0">📤 Enviado</Badge>;
  if (demanda.status_arte === "erro_envio") return <Badge className="bg-red-100 text-red-700 text-xs shrink-0">❌ Erro</Badge>;
  return null;
}

// Coluna Detalhe para o Planejamento Anual
function DetalheCell({ ev }) {
  const { colaborador, tipo, extra } = ev;
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
      ? <span className="text-gray-600">{data} — {extra}</span>
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
// Recebe setModalUpload para abrir o modal NO NÍVEL RAIZ
function VisaoMesAtual({ colaboradores, demandas, podeEnviarDespedida, setModalUpload }) {
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
    colaboradores.filter(c => c.status !== "Desligado" && mesNasce(c.data_nascimento) === mesAtual),
    [colaboradores]
  );
  const tempoEmpresa = useMemo(() =>
    colaboradores.filter(c => {
      if (!c.data_admissao || c.status === "Desligado") return false;
      if (mesNasce(c.data_admissao) !== mesAtual) return false;
      const anos = differenceInYears(hoje, new Date(c.data_admissao + "T00:00:00"));
      return [1, 2, 3, 5, 10, 15, 20].includes(anos);
    }).map(c => ({ ...c, anos: differenceInYears(hoje, new Date(c.data_admissao + "T00:00:00")) })),
    [colaboradores]
  );
  const conjugesMes = useMemo(() =>
    colaboradores.filter(c => c.status !== "Desligado" && mesNasce(c.conjuge_data_nascimento) === mesAtual),
    [colaboradores]
  );
  const filhos1Ano = useMemo(() =>
    colaboradores.filter(c => {
      if (c.status === "Desligado") return false;
      return (c.filhos || []).some(f => {
        if (!f.filho_data_nascimento) return false;
        const dt = new Date(f.filho_data_nascimento + "T00:00:00");
        return dt.getFullYear() === anoAtual - 1 && dt.getMonth() === mesAtual;
      });
    }),
    [colaboradores]
  );
  const desligados = useMemo(() =>
    colaboradores.filter(c => c.status === "Desligado" && !c.comunicado_despedida_enviado),
    [colaboradores]
  );

  const tipoTempoLabel = (anos) => {
    if (anos >= 20) return "🌟 20 Anos"; if (anos >= 15) return "🌟 15 Anos";
    if (anos >= 10) return "🌟 10 Anos"; if (anos >= 5) return "🏆 5 Anos";
    if (anos >= 3) return "🥈 3 Anos"; if (anos >= 2) return "🥈 2 Anos";
    return "🥇 1 Ano";
  };

  const abrirUpload = (colaborador, tipo) => {
    const demanda = findDemanda(demandas, colaborador.id, tipo, mesAtual);
    setModalUpload({ colaborador, tipo, demanda });
  };

  return (
    <div className="space-y-5">
      <SecaoCard icon={Users} titulo={`Aniversariantes do Mês (${format(hoje, "MMMM", { locale: ptBR })})`} cor="text-pink-700">
        {aniversariantesMes.length === 0
          ? <p className="text-sm text-gray-400">Nenhum aniversariante este mês.</p>
          : <div className="space-y-2">
            {aniversariantesMes.map(c => {
              const demanda = findDemanda(demandas, c.id, "aniversario_colaborador", mesAtual);
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
                    <ArteBadge demanda={demanda} onUpload={() => abrirUpload(c, "aniversario_colaborador")} />
                  </div>
                </div>
              );
            })}
          </div>}
      </SecaoCard>

      <SecaoCard icon={Star} titulo="Aniversários de Tempo de Empresa" cor="text-yellow-700">
        {tempoEmpresa.length === 0
          ? <p className="text-sm text-gray-400">Nenhum este mês.</p>
          : <div className="space-y-2">
            {tempoEmpresa.map(c => {
              const demanda = findDemanda(demandas, c.id, "tempo_empresa", mesAtual);
              return (
                <div key={c.id} className="flex items-center gap-3 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{c.nome_completo}</p>
                    <p className="text-xs text-gray-500">Admissão: {fmtDiaMes(c.data_admissao) || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-400 text-yellow-900 text-xs">{tipoTempoLabel(c.anos)}</Badge>
                    <ArteBadge demanda={demanda} onUpload={() => abrirUpload(c, "tempo_empresa")} />
                  </div>
                </div>
              );
            })}
          </div>}
      </SecaoCard>

      <SecaoCard icon={Heart} titulo="Aniversários de Cônjuges" cor="text-red-600">
        {conjugesMes.length === 0
          ? <p className="text-sm text-gray-400">Nenhum este mês.</p>
          : <div className="space-y-2">
            {conjugesMes.map(c => {
              const demanda = findDemanda(demandas, c.id, "aniversario_conjuge", mesAtual);
              return (
                <div key={c.id} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg p-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{c.nome_completo}</p>
                    <p className="text-xs text-gray-500">Cônjuge: <strong>{c.conjuge_nome || "—"}</strong></p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.conjuge_data_nascimento ? <span className="text-xs text-gray-500">{fmtDiaMes(c.conjuge_data_nascimento)}</span> : null}
                    {isHoje(c.conjuge_data_nascimento) && <Badge className="bg-red-500 text-white text-xs">🎂 Hoje!</Badge>}
                    <ArteBadge demanda={demanda} onUpload={() => abrirUpload(c, "aniversario_conjuge")} />
                  </div>
                </div>
              );
            })}
          </div>}
      </SecaoCard>

      <SecaoCard icon={Baby} titulo="Filhos que Completam 1 Ano este Mês" cor="text-purple-700">
        {filhos1Ano.length === 0
          ? <p className="text-sm text-gray-400">Nenhum este mês.</p>
          : <div className="space-y-2">
            {filhos1Ano.map(c => {
              const filhosAniv = (c.filhos || []).filter(f => {
                if (!f.filho_data_nascimento) return false;
                const dt = new Date(f.filho_data_nascimento + "T00:00:00");
                return dt.getFullYear() === anoAtual - 1 && dt.getMonth() === mesAtual;
              });
              return filhosAniv.map((f, i) => {
                const demanda = findDemanda(demandas, c.id, "aniversario_filho_1ano", mesAtual);
                return (
                  <div key={`${c.id}-${i}`} className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{c.nome_completo}</p>
                      <p className="text-xs text-gray-500">Filho(a): <strong>{f.filho_nome || "—"}</strong></p>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.filho_data_nascimento && <span className="text-xs text-gray-500">{fmtDiaMes(f.filho_data_nascimento)}</span>}
                      {isHoje(f.filho_data_nascimento) && <Badge className="bg-purple-500 text-white text-xs">🎈 Hoje!</Badge>}
                      <ArteBadge demanda={demanda} onUpload={() => abrirUpload(c, "aniversario_filho_1ano")} />
                    </div>
                  </div>
                );
              });
            })}
          </div>}
      </SecaoCard>

      <SecaoCard icon={UserX} titulo="Desligamentos Pendentes (Despedida)" cor="text-gray-700">
        {desligados.length === 0
          ? <p className="text-sm text-gray-400">Nenhuma pendente. ✅</p>
          : <div className="space-y-2">
            {desligados.map(c => {
              const demanda = findDemanda(demandas, c.id, "despedida");
              return (
                <div key={c.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{c.nome_completo}</p>
                    <p className="text-xs text-gray-500">{c.area}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArteBadge demanda={demanda} onUpload={() => abrirUpload(c, "despedida")} />
                    {podeEnviarDespedida && (
                      <Button size="sm" variant="outline" onClick={() => enviarDespedida(c)} disabled={enviandoId === c.id}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {enviandoId === c.id ? "Enviando..." : "Enviar"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>}
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

// Recebe setModalUpload para abrir modal NO NÍVEL RAIZ (fora do acordeão)
function VisaoAnual({ colaboradores, demandas, setModalUpload }) {
  const [mesExpandido, setMesExpandido] = useState(mesAtual);
  const eventosPorMes = useMemo(() => calcularEventosPorMes(colaboradores), [colaboradores]);

  const abrirUpload = (colaborador, tipo, idx) => {
    const demanda = findDemanda(demandas, colaborador.id, tipo, idx);
    setModalUpload({ colaborador, tipo, demanda });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Planejamento anual de {anoAtual} — clique em um mês para ver os eventos.
      </p>
      {MESES.map((nomeMes, idx) => {
        const eventos = eventosPorMes[idx] || [];
        const isAtual = idx === mesAtual;
        const isOpen = mesExpandido === idx;
        const semArte = eventos.filter(ev => {
          const d = findDemanda(demandas, ev.colaborador.id, ev.tipo, idx);
          return !d || d.status_arte === "sem_arte";
        }).length;

        return (
          <div key={idx} className={`border rounded-lg overflow-hidden ${isAtual ? "border-indigo-400 shadow-sm" : "border-gray-200"}`}>
            <button
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isOpen ? "bg-indigo-50" : "bg-white hover:bg-gray-50"}`}
              onClick={() => setMesExpandido(isOpen ? -1 : idx)}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`font-semibold text-sm ${isAtual ? "text-indigo-700" : "text-gray-800"}`}>
                  {isAtual && "📍 "}{nomeMes}
                </span>
                {eventos.length === 0 && <span className="text-xs text-gray-400">Nenhum evento</span>}
                {eventos.length > 0 && <Badge className="bg-indigo-100 text-indigo-700 text-xs">{eventos.length} evento{eventos.length > 1 ? "s" : ""}</Badge>}
                {semArte > 0 && <Badge className="bg-orange-100 text-orange-700 border border-orange-300 text-xs">⚠️ {semArte} sem arte</Badge>}
                {eventos.length > 0 && semArte === 0 && <Badge className="bg-green-100 text-green-700 text-xs">✅ Artes ok</Badge>}
              </div>
              <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && eventos.length > 0 && (
              <div className="border-t overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Colaborador</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Evento</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Detalhe</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Arte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventos.map((ev, i) => {
                      const demanda = findDemanda(demandas, ev.colaborador.id, ev.tipo, idx);
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
                              demanda={demanda}
                              onUpload={() => abrirUpload(ev.colaborador, ev.tipo, idx)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {isOpen && eventos.length === 0 && (
              <div className="border-t px-4 py-3 text-sm text-gray-400">Nenhum evento neste mês.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Componente exportado — modal AQUI, fora de qualquer lista/acordeão ───────
export default function VisaoEventos({ modo = "mes", podeEnviarDespedida = false }) {
  // Estado do modal no NÍVEL RAIZ — evita desmontagem durante upload assíncrono
  const [modalUpload, setModalUpload] = useState(null); // { colaborador, tipo, demanda }
  const queryClient = useQueryClient();

  const updateDemandaMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comunicados_Artes.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] }),
  });

  const createDemandaMut = useMutation({
    mutationFn: (data) => base44.entities.Comunicados_Artes.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] }),
  });

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

  const handleUploadSuccess = async (fileUrl) => {
    if (!modalUpload) return;
    const { colaborador, tipo, demanda } = modalUpload;

    if (demanda?.id) {
      await updateDemandaMut.mutateAsync({
        id: demanda.id,
        data: { imagem_url: fileUrl, status_arte: "arte_carregada" },
      });
    } else {
      await createDemandaMut.mutateAsync({
        colaborador_id: colaborador.id,
        colaborador_nome: colaborador.nome_completo,
        tipo_comunicado: tipo,
        imagem_url: fileUrl,
        status_arte: "arte_carregada",
        ano_referencia: anoAtual,
        criado_por: "portal",
      });
    }
    setModalUpload(null);
  };

  if (loadColabs || loadDemandas) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <>
      {/* Modal renderizado UMA VEZ no nível raiz — fora de listas e acordeões */}
      {modalUpload && (
        <UploadArteModal
          open={!!modalUpload}
          onClose={() => setModalUpload(null)}
          colaborador={modalUpload.colaborador}
          tipo={modalUpload.tipo}
          anoReferencia={anoAtual}
          demandaExistente={modalUpload.demanda}
          onSuccess={handleUploadSuccess}
        />
      )}

      {modo === "anual" ? (
        <VisaoAnual
          colaboradores={colaboradores}
          demandas={demandas}
          setModalUpload={setModalUpload}
        />
      ) : (
        <VisaoMesAtual
          colaboradores={colaboradores}
          demandas={demandas}
          podeEnviarDespedida={podeEnviarDespedida}
          setModalUpload={setModalUpload}
        />
      )}
    </>
  );
}