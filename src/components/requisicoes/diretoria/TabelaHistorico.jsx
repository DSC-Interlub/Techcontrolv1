import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatarBRL, calcularTeto, formatarDataHora } from "./utils";

export default function TabelaHistorico({ lista = [], onOpenFicha }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todas"); // "todas" | "aprovadas" | "recusadas"

  const listaFiltrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter((r) => {
      // Filtro de resultado
      if (filtro === "aprovadas" && r.status !== "Aprovada") return false;
      if (filtro === "recusadas" && !r.status?.startsWith("Reprovada")) return false;

      // Filtro de busca textual
      if (!q) return true;
      const haystack = [
        r.item,
        r.numero_requisicao,
        r.colaborador_nome,
        r.colaborador_area,
        r.cotacao_fornecedor
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [lista, busca, filtro]);

  return (
    <div className="space-y-3">
      {/* Barra de Ferramentas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por item, número, pessoa ou fornecedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>

        {/* Segmented Control */}
        <div className="inline-flex p-1 rounded-lg bg-muted border self-start sm:self-auto">
          {[
            { id: "todas", label: "Todas" },
            { id: "aprovadas", label: "Aprovadas" },
            { id: "recusadas", label: "Recusadas" }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFiltro(item.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                filtro === item.id
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela do Shadcn */}
      {listaFiltrada.length === 0 ? (
        <div className="text-center py-12 px-4 border rounded-xl bg-card">
          <h3 className="text-base font-semibold text-foreground">Nada encontrado</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Tente outro termo de busca ou limpe o filtro selecionado.
          </p>
        </div>
      ) : (
        <div className="border rounded-xl bg-card overflow-x-auto shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[35%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Requisição
                </TableHead>
                <TableHead className="w-[20%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Solicitante
                </TableHead>
                <TableHead className="w-[18%] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valor final
                </TableHead>
                <TableHead className="w-[17%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Resultado
                </TableHead>
                <TableHead className="w-[10%] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Concluída
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listaFiltrada.map((r) => {
                const teto = calcularTeto(r);
                const cotacao = Number(r.cotacao_valor) || 0;
                const isAprovada = r.status === "Aprovada";
                const isAuto =
                  (r.historico || []).some((h) => h.tipo === "aprovacao_automatica_teto" || h.k === "auto") ||
                  r.modo === "auto";

                const ultimoEvento = (r.historico || []).slice().reverse()[0];
                const dataConcluida = ultimoEvento?.data_hora
                  ? formatarDataHora(ultimoEvento.data_hora, true)
                  : formatarDataHora(r.created_date, true);

                return (
                  <TableRow
                    key={r.id}
                    onClick={() => onOpenFicha(r)}
                    className="cursor-pointer hover:bg-muted/50 transition"
                  >
                    <TableCell className="py-3">
                      <div className="font-semibold text-foreground text-sm leading-snug line-clamp-1" title={r.item}>
                        {r.item}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {r.numero_requisicao}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-sm">
                      <div className="text-foreground font-medium truncate" title={r.colaborador_nome}>
                        {r.colaborador_nome}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.colaborador_area || "Geral"}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <div className="font-semibold text-foreground text-sm tabular-nums">
                        {cotacao > 0 ? formatarBRL(cotacao) : teto > 0 ? formatarBRL(teto) : "—"}
                      </div>
                      {teto > 0 && cotacao > 0 && (
                        <div className="text-xs text-muted-foreground tabular-nums">
                          teto {formatarBRL(teto)}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-3">
                      {isAprovada ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-medium"
                        >
                          {isAuto ? "Aprovada automaticamente" : "Aprovada por você"}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 text-xs font-medium"
                        >
                          Recusada
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-right text-xs text-muted-foreground font-mono">
                      {dataConcluida}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
