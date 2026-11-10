import React from "react";
import { Info } from "lucide-react";
import { formatarBRL, calcularTeto, formatarDataHora, eventoMaisRecente } from "./utils";

export default function QuadroValores({ requisicao }) {
  const isFase1 = requisicao.status === "Aguardando Diretor";
  const teto = calcularTeto(requisicao);
  const cotacao = Number(requisicao.cotacao_valor) || 0;

  if (isFase1) {
    const ccPartes = (requisicao.centro_custo_nome || requisicao.centro_custo_codigo || "Geral · Operacional").split(" · ");
    const ccCodigo = ccPartes[0] || "Geral";
    const ccNome = ccPartes[1] || requisicao.centro_custo_nome || requisicao.colaborador_area || "Interlub";

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x border rounded-lg bg-card overflow-hidden">
          <div className="p-3.5 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teto pedido</div>
            <div className="text-2xl font-bold tracking-tight tabular-nums mt-1 text-foreground">
              {teto > 0 ? formatarBRL(teto) : <span className="text-muted-foreground text-base font-normal">Sem teto informado</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {requisicao.quantidade} {requisicao.unidade_medida || "unidade"}
            </div>
          </div>

          <div className="p-3.5 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Urgência</div>
            <div className="text-xl font-bold tracking-tight mt-1 text-foreground">
              {requisicao.urgencia || "Média"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {requisicao.data_necessidade ? `Precisa até ${formatarDataHora(requisicao.data_necessidade, true)}` : "Sem prazo fixo"}
            </div>
          </div>

          <div className="p-3.5 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Centro de custo</div>
            <div className="text-base font-semibold tracking-tight mt-1 text-foreground truncate" title={ccCodigo}>
              {ccCodigo}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate" title={ccNome}>
              {ccNome}
            </div>
          </div>
        </div>

        {teto > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
            <Info className="w-3.5 h-3.5 shrink-0 text-blue-600" />
            <span>Se o Compras encontrar preço igual ou menor que {formatarBRL(teto)}, a compra é aprovada sem voltar para você.</span>
          </div>
        )}
      </div>
    );
  }

  // FASE 2: Cotação acima do teto (Aguardando Aprovação Final)
  const eventoAprov1 = eventoMaisRecente(requisicao, ["aprovacao_diretor_1", "aprov1"]);
  const dataAprov1 = eventoAprov1?.data_hora || eventoAprov1?.d || requisicao.created_date;
  const diferenca = cotacao - teto;
  const percentual = teto > 0 ? ((diferenca / teto) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : 0;
  const acima = diferenca > 0;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x border rounded-lg bg-card overflow-hidden">
        <div className="p-3.5 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teto autorizado</div>
          <div className="text-2xl font-bold tracking-tight tabular-nums mt-1 text-foreground">
            {teto > 0 ? formatarBRL(teto) : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Por você em {formatarDataHora(dataAprov1, true)}
          </div>
        </div>

        <div className="p-3.5 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cotação do Compras</div>
          <div className="text-2xl font-bold tracking-tight tabular-nums mt-1 text-foreground">
            {cotacao > 0 ? formatarBRL(cotacao) : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate" title={requisicao.cotacao_fornecedor}>
            {requisicao.cotacao_fornecedor || "Fornecedor"}
          </div>
        </div>

        <div className={`p-3.5 min-w-0 ${acima ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}>
          <div className={`text-xs font-semibold uppercase tracking-wide ${acima ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>
            Diferença
          </div>
          <div className={`text-2xl font-bold tracking-tight tabular-nums mt-1 ${acima ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {acima ? `+${formatarBRL(diferenca)}` : formatarBRL(diferenca)}
          </div>
          <div className={`text-xs font-medium mt-0.5 ${acima ? "text-red-600/90 dark:text-red-400/90" : "text-emerald-600/90"}`}>
            {acima ? `${percentual}% acima do teto` : "Dentro do teto previsto"}
          </div>
        </div>
      </div>

      {requisicao.cotacao_comentario && (
        <div className="p-2.5 rounded-lg bg-muted/50 border text-xs text-foreground">
          <span className="font-semibold text-muted-foreground">Observação do Compras: </span>
          <span>{requisicao.cotacao_comentario}</span>
        </div>
      )}
    </div>
  );
}
