import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Check, Loader2 } from "lucide-react";
import GradeAnexos from "./GradeAnexos";
import LinhaDoTempo from "./LinhaDoTempo";
import { formatarBRL, calcularTeto, formatarDataHora } from "./utils";

export default function FichaRequisicao({
  requisicao,
  open,
  onClose,
  onAprovar,
  onRecusar,
  onSelectAnexo,
  isPending
}) {
  if (!requisicao) return null;

  const isFase1 = requisicao.status === "Aguardando Diretor";
  const isFase2 = requisicao.status === "Aguardando Aprovação Final";
  const isPendente = isFase1 || isFase2;

  const teto = calcularTeto(requisicao);
  const cotacao = Number(requisicao.cotacao_valor) || 0;

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-background border-l"
      >
        {/* Cabeçalho da Ficha */}
        <div className="p-5 border-b bg-card">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
              {requisicao.numero_requisicao}
            </span>

            {isFase1 ? (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                Liberar cotação
              </Badge>
            ) : isFase2 ? (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300">
                Cotação acima do teto
              </Badge>
            ) : requisicao.status === "Aguardando Cotação" ? (
              <Badge variant="outline" className="text-muted-foreground">
                Em cotação
              </Badge>
            ) : requisicao.status === "Aprovada" ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                Aprovada
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                Recusada
              </Badge>
            )}
          </div>

          <SheetTitle className="text-xl font-semibold text-foreground leading-snug">
            {requisicao.item}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Detalhes e histórico da requisição de compras
          </SheetDescription>
        </div>

        {/* Corpo com rolagem */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Lista de dados (dl em 2 colunas) */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Informações do Pedido
            </h4>
            <dl className="grid grid-cols-1 sm:grid-cols-[130px_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
              <dt className="text-muted-foreground">Pedido por</dt>
              <dd className="font-medium text-foreground">
                {requisicao.colaborador_nome} · {requisicao.colaborador_area || "Geral"}
              </dd>

              <dt className="text-muted-foreground">Quantidade</dt>
              <dd className="font-medium text-foreground">
                {requisicao.quantidade} {requisicao.unidade_medida || "unidade"}
              </dd>

              <dt className="text-muted-foreground">Teto</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {teto > 0 ? formatarBRL(teto) : "Sem teto informado"}
              </dd>

              {cotacao > 0 && (
                <>
                  <dt className="text-muted-foreground">Cotação</dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {formatarBRL(cotacao)} {requisicao.cotacao_fornecedor ? `· ${requisicao.cotacao_fornecedor}` : ""}
                  </dd>
                </>
              )}

              <dt className="text-muted-foreground">Urgência</dt>
              <dd className="text-foreground">
                {requisicao.urgencia || "Média"}
                {requisicao.data_necessidade ? ` · precisa até ${formatarDataHora(requisicao.data_necessidade, true)}` : ""}
              </dd>

              <dt className="text-muted-foreground">Centro de custo</dt>
              <dd className="text-foreground">
                {requisicao.centro_custo_nome || requisicao.centro_custo_codigo || "Geral · Operacional"}
              </dd>

              {requisicao.justificativa && (
                <>
                  <dt className="text-muted-foreground">Justificativa</dt>
                  <dd className="text-foreground leading-relaxed">
                    {requisicao.justificativa}
                  </dd>
                </>
              )}
            </dl>
          </div>

          {/* Orçamentos e Anexos */}
          <div className="pt-2 border-t">
            <GradeAnexos
              requisicao={requisicao}
              onSelectAnexo={onSelectAnexo}
            />
          </div>

          {/* Linha do Tempo */}
          <div className="pt-2 border-t">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Histórico da Requisição
            </h4>
            <LinhaDoTempo
              historico={requisicao.historico || []}
              onSelectAnexo={onSelectAnexo}
            />
          </div>
        </div>

        {/* Rodapé fixo de decisão (se estiver pendente) */}
        {isPendente && (
          <div className="p-4 border-t bg-card flex items-center justify-end gap-2.5">
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 font-semibold gap-1.5"
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
        )}
      </SheetContent>
    </Sheet>
  );
}
