import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const SUGESTOES = [
  "Valor acima do esperado",
  "Pesquisar outra marca",
  "Verificar estoque antes",
  "Não é prioridade agora"
];

export default function ModalRecusa({ requisicao, open, onClose, onConfirmar, isPending }) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (open) {
      setMotivo("");
    }
  }, [open]);

  if (!requisicao) return null;

  const aplicarSugestao = (sug) => {
    setMotivo((prev) => (prev.trim() ? `${prev.trim()}. ${sug}` : sug));
  };

  const handleConfirmar = () => {
    if (!motivo.trim() || isPending) return;
    onConfirmar(requisicao, motivo.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg p-5">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Recusar requisição
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            <strong className="text-foreground">{requisicao.item}</strong> · pedido por {requisicao.colaborador_nome}.
            A pessoa recebe o motivo e pode corrigir e reenviar.
          </p>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <Label htmlFor="motivo-recusa" className="text-xs font-semibold text-foreground">
            Motivo da recusa <span className="text-destructive">*</span>
          </Label>

          {/* Sugestões Rápidas */}
          <div className="flex flex-wrap gap-1.5">
            {SUGESTOES.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => aplicarSugestao(sug)}
                className="text-xs px-2.5 py-1 rounded-full border bg-muted/30 hover:bg-muted text-foreground transition"
              >
                {sug}
              </button>
            ))}
          </div>

          <Textarea
            id="motivo-recusa"
            rows={3}
            placeholder="Escreva ou toque em uma sugestão acima..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="text-sm"
            autoFocus
          />
        </div>

        <DialogFooter className="pt-3 gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            disabled={!motivo.trim() || isPending}
            onClick={handleConfirmar}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Recusando...
              </>
            ) : (
              "Confirmar recusa"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
