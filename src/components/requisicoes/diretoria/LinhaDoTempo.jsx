import React from "react";
import { Paperclip } from "lucide-react";
import { formatarDataHora, mapaEventos, detectarTipoArquivo } from "./utils";

export default function LinhaDoTempo({ historico = [], onSelectAnexo }) {
  if (!Array.isArray(historico) || historico.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg bg-muted/20">
        Nenhum evento registrado no histórico ainda.
      </div>
    );
  }

  return (
    <ol className="relative m-0 p-0 list-none space-y-4">
      {historico.map((h, idx) => {
        const info = mapaEventos[h.tipo || h.k] || {
          titulo: h.tipo ? h.tipo.replace(/_/g, " ") : "Atualização",
          cor: "neutral"
        };

        const usuarioTratado = h.usuario === "Diretor" ? "Você" : h.usuario || h.q || "Sistema";
        const dataFormatada = formatarDataHora(h.data_hora || h.d);
        const motivo = h.motivo || h.motivo_anterior;

        // Anexos da etapa
        const anexosEtapa = Array.isArray(h.anexos)
          ? h.anexos.map((a, aIdx) => {
              if (typeof a === "string") {
                return {
                  nome: a.split("/").pop()?.split("?")[0] || `Anexo ${aIdx + 1}`,
                  url: a,
                  tipo: detectarTipoArquivo(a),
                  origem: usuarioTratado
                };
              }
              return {
                nome: a.file_name || a.nome || a.name || `Anexo ${aIdx + 1}`,
                url: a.file_url || a.url,
                tipo: a.file_type || detectarTipoArquivo(a.file_name || a.url),
                origem: usuarioTratado
              };
            })
          : [];

        // Cores dos marcadores
        const markerClass =
          info.cor === "ok"
            ? "bg-emerald-600 border-emerald-600 ring-2 ring-emerald-100 dark:ring-emerald-950"
            : info.cor === "bad"
            ? "bg-red-600 border-red-600 ring-2 ring-red-100 dark:ring-red-950"
            : info.cor === "warn"
            ? "bg-amber-500 border-amber-500 ring-2 ring-amber-100 dark:ring-amber-950"
            : info.cor === "info"
            ? "bg-blue-600 border-blue-600 ring-2 ring-blue-100 dark:ring-blue-950"
            : "bg-muted-foreground border-muted-foreground";

        return (
          <li key={idx} className="relative pl-6 pb-2">
            {/* Linha vertical conectora */}
            {idx !== historico.length - 1 && (
              <div className="absolute left-[7px] top-[14px] bottom-[-16px] w-[2px] bg-border" />
            )}

            {/* Marcador circular */}
            <div
              className={`absolute left-0 top-[3px] w-3.5 h-3.5 rounded-full border-2 border-card ${markerClass}`}
            />

            {/* Cabeçalho do item */}
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {info.titulo}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {dataFormatada}
              </span>
            </div>

            {/* Descrição */}
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              <strong className="text-foreground font-medium">{usuarioTratado}</strong> · {h.descricao || h.txt || "Ação registrada no sistema"}
            </p>

            {/* Motivo de recusa destacado */}
            {motivo && (
              <blockquote className="mt-2 p-2 border-l-2 border-red-400 bg-red-50/60 dark:bg-red-950/20 rounded-r text-xs text-foreground italic">
                "{motivo}"
              </blockquote>
            )}

            {/* Pílulas de anexos */}
            {anexosEtapa.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {anexosEtapa.map((arq, aIdx) => (
                  <button
                    key={aIdx}
                    type="button"
                    onClick={() => onSelectAnexo && onSelectAnexo(arq)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted/50 hover:bg-muted text-foreground border rounded text-xs transition"
                  >
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                    <span className="max-w-[180px] truncate">{arq.nome}</span>
                  </button>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
