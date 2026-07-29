import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatarDataSemFuso, formatarDataHoraSemFuso } from "@/utils/date";
import { Shield, ShieldOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function EquipamentoDetalhes({ equipamento, onClose }) {
  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['portal_avaliacoes'],
    queryFn: () => base44.entities.Avaliacoes.list('-data_avaliacao'),
    enabled: !!equipamento,
  });

  const ultimaAvaliacao = avaliacoes.find(a => a.equipamento_id === equipamento?.id);

  const getCondicao = () => {
    if (["Desktop", "Notebook", "Tablet"].includes(equipamento?.tipo)) {
      if (ultimaAvaliacao) {
        return <Badge variant="secondary">{ultimaAvaliacao.desempenho || "Sem resposta"}</Badge>;
      }
      return <span className="text-gray-400 italic">Ainda não avaliado</span>;
    }
    if (equipamento?.tipo === "Monitor") {
      return <span className="text-gray-400">Não se aplica</span>;
    }
    return equipamento?.condicao ? <Badge variant="secondary">{equipamento.condicao}</Badge> : "-";
  };

  const getAntivirus = () => {
    if (["Desktop", "Notebook", "Tablet"].includes(equipamento?.tipo)) {
      if (ultimaAvaliacao) {
        const antivirusVal = (ultimaAvaliacao.antivirus || "").toLowerCase();
        const isProtected = antivirusVal.includes("ativo") || antivirusVal.includes("sim");
        const hasWarning = antivirusVal.includes("aviso");
        
        if (isProtected) {
          return (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-600">{ultimaAvaliacao.antivirus}</span>
            </div>
          );
        } else if (hasWarning) {
          return (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-amber-600">{ultimaAvaliacao.antivirus}</span>
            </div>
          );
        } else {
          return (
            <div className="flex items-center gap-2">
              <ShieldOff className="w-4 h-4 text-red-600" />
              <span className="font-medium text-red-600">{ultimaAvaliacao.antivirus || "Não instalado"}</span>
            </div>
          );
        }
      }
      return <span className="text-gray-400 italic">Ainda não avaliado</span>;
    }
    if (equipamento?.tipo === "Monitor") {
      return <span className="text-gray-500">Não se aplica</span>;
    }
    return equipamento?.antivirus === "Sim" ? (
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-green-600" />
        <span className="font-medium text-green-600">Sim</span>
      </div>
    ) : equipamento?.antivirus === "Não" ? (
      <div className="flex items-center gap-2">
        <ShieldOff className="w-4 h-4 text-red-600" />
        <span className="font-medium text-red-600">Não</span>
      </div>
    ) : (
      <span className="font-medium text-gray-500">{equipamento?.antivirus || "Não se aplica"}</span>
    );
  };

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
                {formatarDataSemFuso(equipamento.data_aquisicao)}
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
              <p className="text-sm text-gray-500">Condição {["Desktop", "Notebook", "Tablet"].includes(equipamento?.tipo) ? "(última avaliação)" : ""}</p>
              {getCondicao()}
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
              <p className="text-sm text-gray-500">Antivírus {["Desktop", "Notebook", "Tablet"].includes(equipamento?.tipo) ? "(última avaliação)" : ""}</p>
              {getAntivirus()}
            </div>
          </div>

          {equipamento.tipo !== "Monitor" && equipamento.data_formatacao && (
            <div>
              <p className="text-sm text-gray-500">Última Formatação</p>
              <p className="font-medium">
                {formatarDataSemFuso(equipamento.data_formatacao)}
              </p>
            </div>
          )}

          {/* BLOCO DE DADOS TÉCNICOS & AVALIAÇÃO DA MÁQUINA */}
          <div className="pt-4 border-t space-y-3">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Dados da Avaliação Técnica & Acesso Remoto
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <p className="text-slate-500 font-semibold">AnyDesk (Remoto)</p>
                <p className="font-mono font-bold text-indigo-700 mt-0.5">
                  {(equipamento.observacoes && (equipamento.observacoes.match(/AnyDesk:\s*([^\s|;\n\r]+)/i)?.[1])) ||
                   (ultimaAvaliacao && (ultimaAvaliacao.versao_windows?.match(/AnyDesk:\s*([^\s|;\n\r]+)/i)?.[1])) ||
                   "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold">Memória RAM</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {equipamento.memoria_ram || ultimaAvaliacao?.memoria_ram || "Não avaliada"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold">Sistema Operacional</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {equipamento.versao_windows ? equipamento.versao_windows.split('|')[0].trim() : (ultimaAvaliacao?.versao_windows?.split('|')[0].trim() || "Não informado")}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold">Antivírus Corporativo</p>
                <div className="mt-0.5">{getAntivirus()}</div>
              </div>
              <div>
                <p className="text-slate-500 font-semibold">Condição Avaliada</p>
                <div className="mt-0.5">{getCondicao()}</div>
              </div>
              <div>
                <p className="text-slate-500 font-semibold">Pontuação / Classificação</p>
                <p className="font-bold text-slate-900 mt-0.5">
                  {ultimaAvaliacao ? `${ultimaAvaliacao.pontuacao_total || 0} pts (${ultimaAvaliacao.classificacao || 'Manter'})` : "Ainda não avaliado"}
                </p>
              </div>
            </div>
          </div>

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
                      {usuario.data_inicio && formatarDataSemFuso(usuario.data_inicio)}
                      {" → "}
                      {usuario.data_fim 
                        ? formatarDataSemFuso(usuario.data_fim)
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