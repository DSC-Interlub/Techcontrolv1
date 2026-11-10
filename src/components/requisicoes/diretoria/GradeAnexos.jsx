import React from "react";
import { FileText, ExternalLink, Image as ImageIcon } from "lucide-react";
import { normalizarAnexos } from "./utils";

export default function GradeAnexos({ requisicao, onSelectAnexo }) {
  const anexos = normalizarAnexos(requisicao);
  const doCompras = anexos.filter((a) => a.origem === "Compras").length;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Orçamentos e anexos ({anexos.length})
        </span>
        {doCompras > 0 && (
          <span className="text-xs text-muted-foreground">
            {doCompras} do Compras
          </span>
        )}
      </div>

      {anexos.length === 0 ? (
        <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg bg-muted/20">
          Nenhum orçamento anexado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
          {anexos.map((arq, idx) => {
            const isPdf = arq.tipo === "pdf";
            const isImg = arq.tipo === "img";
            const isLink = arq.tipo === "link";
            const ext = arq.nome.split(".").pop()?.toUpperCase() || (isLink ? "LINK" : "DOC");

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectAnexo(arq)}
                className="group flex flex-col border rounded-lg overflow-hidden bg-card text-left transition hover:border-foreground/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* Thumb de 96px */}
                <div className="h-24 bg-muted/40 relative flex items-center justify-center border-b overflow-hidden">
                  {isImg ? (
                    <img
                      src={arq.url}
                      alt={arq.nome}
                      className="w-full h-full object-cover transition group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : isPdf ? (
                    <div className="w-12 h-16 bg-card border rounded shadow-xs p-1.5 flex flex-col gap-1.5">
                      <div className="h-1 bg-muted-foreground/30 rounded w-full" />
                      <div className="h-1 bg-muted-foreground/20 rounded w-4/5" />
                      <div className="h-1 bg-muted-foreground/20 rounded w-2/3" />
                      <div className="h-1 bg-muted-foreground/20 rounded w-full" />
                    </div>
                  ) : isLink ? (
                    <ExternalLink className="w-7 h-7 text-blue-600" />
                  ) : (
                    <FileText className="w-7 h-7 text-muted-foreground" />
                  )}

                  {/* Badge de extensão */}
                  <span
                    className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded border shadow-2xs ${
                      isPdf
                        ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300"
                        : isLink
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                        : "bg-card text-muted-foreground border-border"
                    }`}
                  >
                    {ext.slice(0, 4)}
                  </span>
                </div>

                {/* Informações do arquivo */}
                <div className="p-2 min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate" title={arq.nome}>
                    {arq.nome}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    Enviado por {arq.origem === "Compras" ? "Compras" : "solicitante"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
