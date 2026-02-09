import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Shield, ShieldOff } from "lucide-react";

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Office</p>
              <p className="font-medium">{equipamento.office || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Antivírus</p>
              <div className="flex items-center gap-2">
                {equipamento.antivirus === "Sim" ? (
                  <>
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-600">Instalado</span>
                  </>
                ) : equipamento.antivirus === "Não" ? (
                  <>
                    <ShieldOff className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-600">Não instalado</span>
                  </>
                ) : (
                  <span className="font-medium text-gray-500">Não se aplica</span>
                )}
              </div>
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

          {equipamento.avaliacao_score !== undefined && equipamento.avaliacao_score !== null && (
            <div className="pt-4 border-t">
              <p className="text-sm font-semibold text-gray-700 mb-3">Avaliação de Saúde do Equipamento</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Score de Saúde</p>
                  <p className={`text-2xl font-bold ${
                    equipamento.avaliacao_score >= 70 ? "text-red-600" :
                    equipamento.avaliacao_score >= 40 ? "text-yellow-600" :
                    "text-green-600"
                  }`}>
                    {equipamento.avaliacao_score.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Recomendação</p>
                  <Badge className={
                    equipamento.avaliacao_recomendacao_sistema === "Manter" ? "bg-green-100 text-green-800" :
                    equipamento.avaliacao_recomendacao_sistema === "Upgrade" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }>
                    {equipamento.avaliacao_recomendacao_sistema || "Não avaliado"}
                  </Badge>
                </div>
              </div>
              {equipamento.avaliacao_data && (
                <p className="text-xs text-gray-500 mt-2">
                  Avaliado em: {format(new Date(equipamento.avaliacao_data), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              )}
            </div>
          )}

          {equipamento.usuarios_anteriores && equipamento.usuarios_anteriores.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-semibold text-gray-700 mb-3">Histórico de Usuários Anteriores</p>
              <div className="space-y-2">
                {equipamento.usuarios_anteriores.map((usuario, index) => (
                  <div key={index} className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{usuario.nome}</p>
                      <Badge variant="outline" className="bg-white">
                        #{index + 1}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Período:</span>{" "}
                      {usuario.data_inicio && format(new Date(usuario.data_inicio), "dd/MM/yyyy")}
                      {" → "}
                      {usuario.data_fim 
                        ? format(new Date(usuario.data_fim), "dd/MM/yyyy")
                        : <span className="text-blue-600 font-medium">Atual</span>}
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