import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatarBRL, calcularTeto, formatarDataHora, eventoMaisRecente } from "./utils";

export default function ListaEmAndamento({ lista = [], onOpenFicha }) {
  if (!lista.length) {
    return (
      <div className="text-center py-12 px-4 border rounded-xl bg-card">
        <h3 className="text-base font-semibold text-foreground">
          Nenhuma compra em andamento
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          As requisições que você autorizar para cotação aparecerão aqui enquanto o setor de compras busca fornecedores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Compras que você já autorizou ou devolveu e que ainda não terminaram.
      </p>

      <div className="border rounded-xl bg-card divide-y overflow-hidden shadow-xs">
        {lista.map((r) => {
          const teto = calcularTeto(r);
          const isDevolvida = r.status?.startsWith("Reprovada");

          // Último evento para saber desde quando está com quem
          const ultimoEvento = (r.historico || []).slice().reverse()[0];
          const dataDesde = ultimoEvento?.data_hora
            ? formatarDataHora(ultimoEvento.data_hora, true).slice(0, 5)
            : formatarDataHora(r.created_date, true).slice(0, 5);

          const comQuem = isDevolvida ? "o solicitante (ajustando)" : "Compras";

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpenFicha(r)}
              className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition focus-visible:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground text-sm sm:text-base leading-snug truncate" title={r.item}>
                  {r.item}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-mono">{r.numero_requisicao}</span>
                  <span>·</span>
                  <span>{r.colaborador_nome}</span>
                  <span>·</span>
                  <span>{r.colaborador_area || "Geral"}</span>
                  {teto > 0 && (
                    <>
                      <span>·</span>
                      <span>teto {formatarBRL(teto)}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0">
                {isDevolvida ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-xs">
                    Devolvida para ajuste
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted/60 text-foreground border-border text-xs">
                    Em cotação
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Com {comQuem} desde {dataDesde}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
