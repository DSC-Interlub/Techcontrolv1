import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";

export default function VisualizadorAnexo({ anexo, requisicao, onClose }) {
  if (!anexo) return null;

  const isImg = anexo.tipo === "img";
  const isPdf = anexo.tipo === "pdf";

  const abrirNovaAba = () => {
    if (anexo.url) {
      window.open(anexo.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={!!anexo} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-5 overflow-hidden">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-start justify-between pr-6 min-w-0">
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-semibold truncate" title={anexo.nome}>
                {anexo.nome}
              </DialogTitle>
              {requisicao && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {requisicao.numero_requisicao} · {requisicao.item}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com visualizador */}
        <div className="flex-1 min-h-[300px] max-h-[62vh] overflow-auto py-2 flex items-center justify-center bg-muted/30 rounded-lg border">
          {isImg ? (
            <img
              src={anexo.url}
              alt={anexo.nome}
              className="max-w-full max-h-[58vh] object-contain rounded shadow-xs"
            />
          ) : isPdf ? (
            <iframe
              src={`${anexo.url}#toolbar=0`}
              title={anexo.nome}
              className="w-full h-[58vh] rounded border-0"
            />
          ) : (
            <div className="text-center p-8 space-y-3">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Este tipo de documento pode ser visualizado diretamente no seu navegador.
              </p>
              <Button onClick={abrirNovaAba} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Abrir arquivo
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={abrirNovaAba} className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Abrir em nova aba
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
