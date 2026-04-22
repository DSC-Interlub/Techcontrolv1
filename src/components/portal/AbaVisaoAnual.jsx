import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { getMonth, getYear } from "date-fns";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const TIPO_COR = {
  aniversario_colaborador: "bg-pink-100 text-pink-800",
  aniversario_conjuge: "bg-red-100 text-red-800",
  aniversario_filho_1ano: "bg-purple-100 text-purple-800",
  tempo_empresa_1ano: "bg-yellow-100 text-yellow-800",
  tempo_empresa_5anos: "bg-yellow-100 text-yellow-900",
  tempo_empresa_10anos: "bg-amber-100 text-amber-900",
  despedida: "bg-gray-100 text-gray-700",
};

const TIPO_LABEL_CURTO = {
  aniversario_colaborador: "🎂 Aniv.",
  aniversario_conjuge: "💑 Cônjuge",
  aniversario_filho_1ano: "🎈 1 Aninho",
  tempo_empresa_1ano: "🥇 1 Ano Emp.",
  tempo_empresa_5anos: "🏆 5 Anos Emp.",
  tempo_empresa_10anos: "🌟 10 Anos Emp.",
  despedida: "💼 Despedida",
};

const anoAtual = getYear(new Date());

function mesNasce(d) { if (!d) return -1; return getMonth(new Date(d + "T00:00:00")); }

function calcularEventosPorMes(colaboradores) {
  const porMes = Array.from({ length: 12 }, () => []);

  colaboradores.forEach(c => {
    if (c.status === "Desligado") {
      // Só aparece em despedida se pendente
      if (!c.comunicado_despedida_enviado) {
        porMes.forEach((_, m) => {
          // Despedida: aparece em todos os meses até ser enviado (mostramos só uma vez — mês da admissão ou mês atual)
        });
        // Exibir no mês atual como alerta
        const mesHoje = getMonth(new Date());
        porMes[mesHoje].push({ colaborador: c, tipo: "despedida" });
      }
      return;
    }

    // Aniversário do colaborador
    if (c.data_nascimento) {
      const m = mesNasce(c.data_nascimento);
      if (m >= 0) porMes[m].push({ colaborador: c, tipo: "aniversario_colaborador" });
    }

    // Aniversário do cônjuge
    if (c.conjuge_data_nascimento) {
      const m = mesNasce(c.conjuge_data_nascimento);
      if (m >= 0) porMes[m].push({ colaborador: c, tipo: "aniversario_conjuge" });
    }

    // Filhos completando 1 ano neste ano (nasceram no ano passado)
    (c.filhos || []).forEach(f => {
      if (!f.filho_data_nascimento) return;
      const dt = new Date(f.filho_data_nascimento + "T00:00:00");
      if (dt.getFullYear() === anoAtual - 1) {
        // Completa 1 ano no mês de nascimento, neste ano
        const m = getMonth(dt);
        porMes[m].push({ colaborador: c, tipo: "aniversario_filho_1ano", extra: f.filho_nome });
      }
    });

    // Tempo de empresa (marcos neste ano)
    if (c.data_admissao) {
      const dataAdm = new Date(c.data_admissao + "T00:00:00");
      const anosEmpresa = anoAtual - dataAdm.getFullYear();
      if ([1, 2, 3, 5, 10, 15, 20].includes(anosEmpresa)) {
        const m = getMonth(dataAdm);
        const tipo = anosEmpresa >= 10 ? "tempo_empresa_10anos" : anosEmpresa >= 5 ? "tempo_empresa_5anos" : "tempo_empresa_1ano";
        porMes[m].push({ colaborador: c, tipo, extra: `${anosEmpresa} ano${anosEmpresa > 1 ? "s" : ""}` });
      }
    }
  });

  return porMes;
}

function ArteStatusDot({ artes, colaboradorId, tipo }) {
  const status = useMemo(() => {
    if (!artes || !colaboradorId) return "sem";
    if (artes.some(a => a.colaborador_id === colaboradorId && a.tipo_comunicado === tipo && a.ano_referencia === anoAtual && a.status_envio === "enviado")) return "enviado";
    if (artes.some(a => a.colaborador_id === colaboradorId && a.tipo_comunicado === tipo && a.ano_referencia === anoAtual && a.status_envio === "pendente")) return "pronta";
    return "sem";
  }, [artes, colaboradorId, tipo]);

  if (status === "enviado") return <span title="Enviado" className="text-green-600 text-xs">✅</span>;
  if (status === "pronta") return <span title="Arte pronta" className="text-blue-500 text-xs">🎨</span>;
  return <span title="Sem arte" className="text-orange-400 text-xs">⚠️</span>;
}

export default function AbaVisaoAnual() {
  const [mesExpandido, setMesExpandido] = useState(getMonth(new Date()));

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["portal_comu_colabs"],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  const { data: artes = [] } = useQuery({
    queryKey: ["portal_artes"],
    queryFn: () => base44.entities.Comunicados_Artes.list(),
  });

  const eventosPorMes = useMemo(() => calcularEventosPorMes(colaboradores), [colaboradores]);
  const mesAtualIdx = getMonth(new Date());

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Planejamento anual de {anoAtual} — clique em um mês para ver os eventos e verificar quais artes precisam ser cadastradas.
      </p>

      {MESES.map((nomeMes, idx) => {
        const eventos = eventosPorMes[idx] || [];
        const isAtual = idx === mesAtualIdx;
        const isOpen = mesExpandido === idx;
        const semArte = eventos.filter(ev => {
          const enviado = artes.some(a => a.colaborador_id === ev.colaborador.id && a.tipo_comunicado === ev.tipo && a.ano_referencia === anoAtual && a.status_envio !== "erro");
          return !enviado;
        }).length;

        return (
          <div key={idx} className={`border rounded-lg overflow-hidden ${isAtual ? "border-indigo-400 shadow-sm" : "border-gray-200"}`}>
            <button
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isOpen ? "bg-indigo-50" : "bg-white hover:bg-gray-50"}`}
              onClick={() => setMesExpandido(isOpen ? -1 : idx)}
            >
              <div className="flex items-center gap-3">
                <span className={`font-semibold text-sm ${isAtual ? "text-indigo-700" : "text-gray-800"}`}>
                  {isAtual && "📍 "}{nomeMes}
                </span>
                {eventos.length === 0 && <span className="text-xs text-gray-400">Nenhum evento</span>}
                {eventos.length > 0 && (
                  <Badge className="bg-indigo-100 text-indigo-700 text-xs">{eventos.length} evento{eventos.length > 1 ? "s" : ""}</Badge>
                )}
                {semArte > 0 && (
                  <Badge className="bg-orange-100 text-orange-700 border border-orange-300 text-xs">⚠️ {semArte} sem arte</Badge>
                )}
                {eventos.length > 0 && semArte === 0 && (
                  <Badge className="bg-green-100 text-green-700 text-xs">✅ Artes ok</Badge>
                )}
              </div>
              <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && eventos.length > 0 && (
              <div className="border-t">
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
                    {eventos.map((ev, i) => (
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
                        <td className="px-4 py-2 text-xs text-gray-500">{ev.extra || "—"}</td>
                        <td className="px-4 py-2 text-center">
                          <ArteStatusDot artes={artes} colaboradorId={ev.colaborador.id} tipo={ev.tipo} />
                        </td>
                      </tr>
                    ))}
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