import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function EquipamentoDetalhes({ equipamento, onClose }) {
  return (
    <Dialog open={!!equipamento} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Detalhes do Equipamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Tipo</p>
              <p className="font-medium">{equipamento.tipo || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Marca</p>
              <p className="font-medium">{equipamento.marca || "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Modelo</p>
              <p className="font-medium">{equipamento.modelo || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Processador</p>
              <p className="font-medium">{equipamento.processador || "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Etiqueta Interna</p>
              <p className="font-medium">{equipamento.etiqueta_interna || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service Tag</p>
              <p className="font-medium">{equipamento.service_tag || "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Data de Aquisição</p>
              <p className="font-medium">
                {equipamento.data_aquisicao 
                  ? format(new Date(equipamento.data_aquisicao), "dd/MM/yyyy") 
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tempo de Uso</p>
              <p className="font-medium">{equipamento.tempo_uso || "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge className={
                equipamento.status === "Disponível" ? "bg-green-100 text-green-800" :
                equipamento.status === "Em uso" ? "bg-blue-100 text-blue-800" :
                "bg-orange-100 text-orange-800"
              }>
                {equipamento.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Condição</p>
              {equipamento.condicao ? (
                <Badge variant="secondary">{equipamento.condicao}</Badge>
              ) : "-"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Usuário Atual</p>
              <p className="font-medium">{equipamento.usuario_atual || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Área</p>
              <p className="font-medium">{equipamento.area || equipamento.uf || "-"}</p>
            </div>
          </div>

          {equipamento.data_formatacao && (
            <div>
              <p className="text-sm text-gray-500">Última Formatação</p>
              <p className="font-medium">
                {format(new Date(equipamento.data_formatacao), "dd/MM/yyyy")}
              </p>
            </div>
          )}

          {equipamento.observacoes && (
            <div>
              <p className="text-sm text-gray-500">Observações</p>
              <p className="font-medium">{equipamento.observacoes}</p>
            </div>
          )}

          {equipamento.usuarios_anteriores && equipamento.usuarios_anteriores.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Histórico de Usuários</p>
              <div className="space-y-2">
                {equipamento.usuarios_anteriores.map((usuario, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{usuario.nome}</p>
                    <p className="text-sm text-gray-600">
                      {usuario.data_inicio && format(new Date(usuario.data_inicio), "dd/MM/yyyy")} - 
                      {usuario.data_fim ? format(new Date(usuario.data_fim), "dd/MM/yyyy") : "Atual"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}