import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight, X, Check, Loader2 } from "lucide-react";
import QuadroValores from "./QuadroValores";
import GradeAnexos from "./GradeAnexos";
import EtapasRequisicao from "./EtapasRequisicao";
import { formatarDataHora, eventoMaisRecente } from "./utils";

export default function CartaoDecisao({
  requisicao,
  onOpenFicha,
  onAprovar,
  onRecusar,
  onSelectAnexo,
  isPending
}) {
  const isFase1 = requisicao.status === "Aguardando Diretor";
  const dataAberta = formatarDataHora(requisicao.created_date, true);

  // Verifica se é item reenviado após recusa
  const eventoReenvio = eventoMaisRecente(requisicao, ["reenvio_apos_ajuste", "reenvio"]);
  const eventoRecusaAnterior = eventoMaisRecente(requisicao, ["reprovacao_diretor_1", "reprovacao_diretor_final", "recusa"]);
  const dataRecusaAnterior = eventoRecusaAnterior?.data_hora
    ? formatarDataHora(eventoRecusaAnterior.data_hora, true)
    : null;
  const motivoAnterior = eventoReenvio?.motivo_anterior || eventoRecusaAnterior?.motivo;

  return (
    <article className="border rounded-xl bg-card overflow-hidden shadow-xs transition hover:border-foreground/25">
      {/* Faixa de reenvio após recusa */}
      {eventoReenvio && (
        <div className="flex items-start gap-2.5 px-5 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <strong>
              Reenviada depois da sua recusa {dataRecusaAnterior ? `de ${dataRecusaAnterior}` : "anterior"}
            </strong>
            {motivoAnterior && (
              <span className="block mt-0.5 text-foreground/80">
                Seu motivo: <q className="italic">"{motivoAnterior}"</q>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Corpo do Cartão */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Linha meta */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono px-2 py-0.5 rounded bg-muted text-foreground font-semibold">
              {requisicao.numero_requisicao}
            </span>
            <span>Aberta em {dataAberta}</span>
          </div>

          <div>
            {isFase1 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                Liberar cotação
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                Cotação acima do teto
              </span>
            )}
          </div>
        </div>

        {/* Título e Solicitante */}
        <div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight leading-snug">
            {requisicao.item}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>
              <strong>{requisicao.quantidade} {requisicao.unidade_medida || "unidade"}</strong>
            </span>
            <span>·</span>
            <span>
              Pedido por <strong>{requisicao.colaborador_nome}</strong>
            </span>
            <span>·</span>
            <span>{requisicao.colaborador_area || "Geral"}</span>
          </div>
        </div>

        {/* Justificativa (parágrafo limpo sem caixa e sem itálico) */}
        {requisicao.justificativa && (
          <p className="text-sm text-foreground leading-relaxed max-w-prose">
            {requisicao.justificativa}
          </p>
        )}

        {/* Quadro de Valores */}
        <QuadroValores requisicao={requisicao} />

        {/* Grade de Orçamentos e Anexos */}
        <GradeAnexos requisicao={requisicao} onSelectAnexo={onSelectAnexo} />

        {/* Linha de Etapas */}
        <EtapasRequisicao requisicao={requisicao} />
      </div>

      {/* Rodapé do Card */}
      <div className="border-t bg-muted/40 px-5 py-3.5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground justify-center sm:justify-start gap-1 px-2"
          onClick={() => onOpenFicha(requisicao)}
        >
          <span>Ver histórico completo</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 h-11 px-5 font-semibold gap-1.5"
            disabled={isPending}
            onClick={() => onRecusar(requisicao)}
          >
            <X className="w-4 h-4" />
            Recusar
          </Button>

          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 font-semibold gap-1.5 shadow-xs"
            disabled={isPending}
            onClick={() => onAprovar(requisicao)}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Autorizando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isFase1 ? "Autorizar cotação" : "Autorizar compra"}
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
