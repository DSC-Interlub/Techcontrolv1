import React from "react";
import { Check } from "lucide-react";
import { formatarBRL, formatarDataHora } from "./utils";

export default function EtapasRequisicao({ requisicao }) {
  const isFase1 = requisicao.status === "Aguardando Diretor";
  const cotacao = Number(requisicao.cotacao_valor) || 0;
  const dataAberta = formatarDataHora(requisicao.created_date, true);

  const steps = [
    {
      titulo: "Aberta",
      sub: dataAberta.slice(0, 5),
      status: "done"
    },
    {
      titulo: "Cotação autorizada",
      sub: isFase1 ? "Aguardando você" : "Por você",
      status: isFase1 ? "now" : "done"
    },
    {
      titulo: "Cotação recebida",
      sub: isFase1 ? "Compras" : cotacao > 0 ? formatarBRL(cotacao) : "Compras",
      status: isFase1 ? "todo" : cotacao > 0 ? "done" : "now"
    },
    {
      titulo: "Decisão final",
      sub: isFase1 ? "Automática até o teto" : "Aguardando você",
      status: isFase1 ? "todo" : "now"
    }
  ];

  return (
    <div className="pt-2">
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 sm:gap-x-0 relative list-none m-0 p-0">
        {steps.map((st, idx) => {
          const isDone = st.status === "done";
          const isNow = st.status === "now";

          return (
            <li key={idx} className="relative pt-6 min-w-0 pr-2">
              {/* Linha conectora horizontal */}
              <div
                className={`hidden sm:block absolute top-[7px] left-0 right-0 h-[2px] ${
                  isDone ? "bg-emerald-600" : "bg-border"
                } ${idx === 0 ? "left-[8px]" : ""} ${idx === steps.length - 1 ? "right-auto w-[8px]" : ""}`}
              />

              {/* Indicador circular */}
              <div
                className={`absolute top-0 left-0 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-card ${
                  isDone
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : isNow
                    ? "border-blue-600 ring-4 ring-blue-100 dark:ring-blue-950"
                    : "border-muted-foreground/30"
                }`}
              >
                {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                {isNow && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
              </div>

              {/* Textos */}
              <div className="text-[13px] font-semibold text-foreground truncate" title={st.titulo}>
                {st.titulo}
              </div>
              <div className="text-xs text-muted-foreground truncate" title={st.sub}>
                {st.sub}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
