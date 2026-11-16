import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Sparkles } from "lucide-react";
import { formatarBRL, calcularTeto } from "./utils";

const SUGESTOES_FASE1 = [
  "Liberado para cotação",
  "Priorizar prazo de entrega",
  "Pesquisar fornecedor habitual",
  "Buscar alternativas de menor custo"
];

const SUGESTOES_FASE2 = [
  "Aprovado conforme orçado",
  "Negociar condição de pagamento",
  "Priorizar entrega rápida",
  "Lançar com urgência no SAP"
];

export default function ModalAprovacao({ requisicao, open, onClose, onConfirmar, isPending }) {
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (open) {
      setObservacao("");
    }
  }, [open]);

  if (!requisicao) return null;

  const isFase1 = requisicao.status === "Aguardando Diretor";
  const sugestoes = isFase1 ? SUGESTOES_FASE1 : SUGESTOES_FASE2;

  const aplicarSugestao = (sug) => {
    setObservacao((prev) => (prev.trim() ? `${prev.trim()}. ${sug}` : sug));
  };

  const handleConfirmar = () => {
    if (isPending) return;
    onConfirmar(requisicao, observacao.trim());
  };

  const teto = calcularTeto(requisicao);
  const valorCotado = Number(requisicao.cotacao_valor) || 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg p-5 sm:p-6">
        <DialogHeader className="pb-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
              {requisicao.numero_requisicao}
            </span>
            {isFase1 ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold">
                1ª Fase · Liberação para Cotação
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                2ª Fase · Aprovação Final de Compra
              </Badge>
            )}
          </div>

          <DialogTitle className="text-xl font-semibold text-foreground">
            {isFase1 ? "Autorizar Cotação" : "Autorizar Compra"}
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
            <strong className="text-foreground">{requisicao.item}</strong>
            <span> · Qtd: {requisicao.quantidade} {requisicao.unidade_medida || "un"}</span>
            <span> · Solicitante: {requisicao.colaborador_nome} ({requisicao.colaborador_area || "Geral"})</span>
          </DialogDescription>
        </DialogHeader>

        {/* Resumo financeiro do item */}
        <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1">
          {isFase1 ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor estimado / teto:</span>
              <span className="font-semibold text-foreground font-mono">
                {teto > 0 ? formatarBRL(teto) : "Sem estimativa prévia"}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fornecedor cotado:</span>
                <span className="font-semibold text-foreground">
                  {requisicao.cotacao_fornecedor || "Não informado"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor final da compra:</span>
                <span className="font-bold text-emerald-700 text-sm font-mono">
                  {formatarBRL(valorCotado)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Campo de Observação da Diretoria */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="obs-aprovacao" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              Observação da Diretoria <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <span className="text-[11px] text-muted-foreground">Ficará salva no histórico e enviada por e-mail</span>
          </div>

          {/* Sugestões Rápidas */}
          <div className="flex flex-wrap gap-1.5">
            {sugestoes.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => aplicarSugestao(sug)}
                className="text-xs px-2.5 py-1 rounded-full border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                + {sug}
              </button>
            ))}
          </div>

          <Textarea
            id="obs-aprovacao"
            rows={3}
            placeholder={
              isFase1
                ? "Adicione uma orientação para a equipe de compras se desejar (ex: priorizar fornecedor X, negociar prazo)..."
                : "Adicione uma observação de autorização se desejar (ex: aprovado conforme reunião, negociar condição)..."
            }
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="text-sm resize-none"
            autoFocus
          />
        </div>

        <DialogFooter className="pt-3 gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
            disabled={isPending}
            onClick={handleConfirmar}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Autorizando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isFase1 ? "Confirmar Autorização de Cotação" : "Confirmar Autorização de Compra"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
