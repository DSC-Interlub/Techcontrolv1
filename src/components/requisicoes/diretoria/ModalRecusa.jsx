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
import { Loader2, X } from "lucide-react";
import { formatarBRL, calcularTeto } from "./utils";

const SUGESTOES_FASE1 = [
  "Valor estimado acima do esperado",
  "Verificar estoque antes",
  "Não é prioridade no momento",
  "Reavaliar necessidade com o gestor"
];

const SUGESTOES_FASE2 = [
  "Valor da cotação muito alto",
  "Buscar novos fornecedores",
  "Pesquisar outra marca / modelo similar",
  "Negociar desconto com fornecedor"
];

export default function ModalRecusa({ requisicao, open, onClose, onConfirmar, isPending }) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (open) {
      setMotivo("");
    }
  }, [open]);

  if (!requisicao) return null;

  const isFase1 = requisicao.status === "Aguardando Diretor";
  const sugestoes = isFase1 ? SUGESTOES_FASE1 : SUGESTOES_FASE2;

  const aplicarSugestao = (sug) => {
    setMotivo((prev) => (prev.trim() ? `${prev.trim()}. ${sug}` : sug));
  };

  const handleConfirmar = () => {
    if (!motivo.trim() || isPending) return;
    onConfirmar(requisicao, motivo.trim());
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
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[11px] font-semibold">
                1ª Fase · Recusa de Cotação
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[11px] font-semibold">
                2ª Fase · Recusa da Compra
              </Badge>
            )}
          </div>

          <DialogTitle className="text-xl font-semibold text-foreground">
            {isFase1 ? "Recusar Abertura de Cotação" : "Recusar Compra Final"}
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
              <span className="text-muted-foreground">Valor estimado inicial:</span>
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
                <span className="text-muted-foreground">Valor da cotação recusada:</span>
                <span className="font-bold text-red-700 text-sm font-mono">
                  {formatarBRL(valorCotado)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Campo de Motivo / Observação */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="motivo-recusa" className="text-xs font-semibold text-foreground">
              Observação / Motivo da Recusa <span className="text-destructive">*</span>
            </Label>
            <span className="text-[11px] text-muted-foreground">Enviado por e-mail para ciência do solicitante</span>
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
            id="motivo-recusa"
            rows={3}
            placeholder={
              isFase1
                ? "Explique a observação ou motivo pelo qual a cotação não foi autorizada..."
                : "Explique a observação ou motivo pelo qual a compra com este fornecedor/valor foi recusada..."
            }
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="text-sm resize-none"
            autoFocus
          />
        </div>

        <DialogFooter className="pt-3 gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold gap-1.5"
            disabled={!motivo.trim() || isPending}
            onClick={handleConfirmar}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Recusando...
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                Confirmar Recusa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
