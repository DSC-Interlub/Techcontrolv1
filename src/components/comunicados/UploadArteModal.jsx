/**
 * Modal de upload de arte para uma demanda de comunicado.
 * Usado na VisaoEventos (coluna Arte) no Planejamento Anual.
 */
import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon } from "lucide-react";

const TIPO_LABEL = {
  aniversario_colaborador: "Aniversário",
  aniversario_conjuge: "Aniversário do Cônjuge",
  aniversario_filho_1ano: "1 Aninho do Filho(a)",
  tempo_empresa: "Tempo de Empresa",
  despedida: "Despedida",
};

export default function UploadArteModal({ open, onClose, colaborador, tipo, anoReferencia, demandaExistente }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();
  const queryClient = useQueryClient();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleConfirm = async () => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    if (demandaExistente) {
      await base44.entities.Comunicados_Artes.update(demandaExistente.id, {
        imagem_url: file_url,
        status_arte: "arte_carregada",
      });
    } else {
      await base44.entities.Comunicados_Artes.create({
        colaborador_id: colaborador.id,
        colaborador_nome: colaborador.nome_completo,
        tipo_comunicado: tipo,
        imagem_url: file_url,
        status_arte: "arte_carregada",
        ano_referencia: anoReferencia,
        criado_por: "portal",
      });
    }

    queryClient.invalidateQueries({ queryKey: ["comunicados_artes"] });
    setUploading(false);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    onClose();
  };

  if (!colaborador) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">
            Carregar Arte — {colaborador.nome_completo}
            <span className="block text-sm font-normal text-gray-500 mt-0.5">{TIPO_LABEL[tipo] || tipo}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Área de upload */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-48 max-w-full object-contain rounded-lg" />
            ) : (
              <>
                <ImageIcon className="w-12 h-12 text-gray-300" />
                <p className="text-sm text-gray-500 text-center">
                  Clique para selecionar uma imagem<br />
                  <span className="text-xs text-gray-400">JPG, JPEG, PNG, GIF, WEBP</span>
                </p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {file && (
            <div className="flex items-center justify-between bg-gray-50 border rounded-lg px-3 py-2">
              <span className="text-xs text-gray-600 truncate">{file.name}</span>
              <button onClick={() => { setFile(null); setPreview(null); }} className="text-gray-400 hover:text-gray-600 ml-2 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>Cancelar</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!file || uploading}
              onClick={handleConfirm}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              {uploading ? "Enviando..." : "Confirmar Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}