import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { formatarDataSemFuso, formatarDataHoraSemFuso } from "@/utils/date";
import { Shield, ShieldOff, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { extrairAnyDesk, formatarObservacoesComAnyDesk } from "@/utils/eval";
import AvaliacaoEquipamento from "@/components/equipamentos/AvaliacaoEquipamento";

export default function EquipamentoDetalhes({ equipamento, onClose }) {
  const [editingAvaliacao, setEditingAvaliacao] = useState(null);
  const queryClient = useQueryClient();

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['portal_avaliacoes'],
    queryFn: () => base44.entities.Avaliacoes.list('-data_avaliacao'),
    enabled: !!equipamento,
  });

  const salvarEdicaoMutation = useMutation({
    mutationFn: async (dados) => {
      const av = editingAvaliacao;
      if (!av) return;

      const anydeskVal = (dados.anydesk_id || "").trim();
      const versaoWindowsLimpa = (dados.versao_windows || "").replace(/\|\s*AnyDesk:\s*[^|;\n\r]+/gi, "").trim();

      const payloadUpdate = {
        memoria_ram: dados.memoria_ram || '',
        tipo_armazenamento: dados.tipo_armazenamento || '',
        espaco_disco: dados.espaco_disco || '',
        versao_windows: anydeskVal ? `${versaoWindowsLimpa} | AnyDesk: ${anydeskVal}` : versaoWindowsLimpa,
        antivirus: dados.antivirus || '',
        desempenho: dados.desempenho || '',
        problemas: dados.problemas || [],
        atende_trabalho: dados.atende_trabalho || '',
        recomendacao_usuario: dados.recomendacao_usuario || '',
        satisfacao: dados.satisfacao || '',
        pontuacao_total: dados.pontuacao_total || 0,
        classificacao: dados.classificacao || 'Manter'
      };

      await base44.entities.Avaliacoes.update(av.id, payloadUpdate);

      const updateDataEquipamento = {};
      updateDataEquipamento.observacoes = formatarObservacoesComAnyDesk(
        equipamento?.observacoes || "",
        anydeskVal,
        dados.memoria_ram,
        versaoWindowsLimpa
      );
      if (anydeskVal) updateDataEquipamento.anydesk_id = anydeskVal;
      if (dados.memoria_ram) updateDataEquipamento.memoria_ram = dados.memoria_ram;
      if (dados.versao_windows) updateDataEquipamento.versao_windows = versaoWindowsLimpa;
      if (dados.antivirus) updateDataEquipamento.antivirus = dados.antivirus;
      if (dados.desempenho) updateDataEquipamento.condicao = dados.desempenho;

      if (equipamento && Object.keys(updateDataEquipamento).length > 0) {
        if (av.equipamento_tipo === 'Notebooks_Externos' || equipamento.entityType === 'Notebooks_Externos') {
          await base44.entities.Notebooks_Externos.update(equipamento.id, updateDataEquipamento);
        } else {
          await base44.entities.PCs_Internos.update(equipamento.id, updateDataEquipamento);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_avaliacoes'] });
      queryClient.invalidateQueries({ queryKey: ['avaliacoes'] });
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
      setEditingAvaliacao(null);
      alert("Avaliação e equipamento atualizados com sucesso!");
    },
    onError: (err) => {
      alert("Erro ao atualizar avaliação: " + err.message);
    }
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
    <>
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

          {/* Indicadores de Formatação (30 meses) e Vida Útil (5 anos) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            {equipamento.tipo !== "Monitor" ? (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Última Formatação (Ciclo 30m)</p>
                <p className="font-bold text-slate-900 mt-0.5">
                  {formatarDataSemFuso(equipamento.data_formatacao || (Array.isArray(equipamento.historico_formatacoes) && equipamento.historico_formatacoes[0]?.data_formatacao)) || "Não registrada"}
                </p>
                {(() => {
                  const dataFormat = equipamento.data_formatacao || (Array.isArray(equipamento.historico_formatacoes) && equipamento.historico_formatacoes[0]?.data_formatacao);
                  if (!dataFormat) {
                    return <Badge className="bg-rose-100 text-rose-800 text-[10px] mt-1 border-rose-300">Sem registro de formatação</Badge>;
                  }
                  const dt = new Date(dataFormat);
                  if (isNaN(dt.getTime())) return null;
                  const target = new Date(dt);
                  target.setMonth(target.getMonth() + 30);
                  const diasRestantes = Math.round((target - new Date()) / (1000 * 60 * 60 * 24));
                  if (diasRestantes < 0) {
                    return <Badge className="bg-red-100 text-red-800 text-[10px] mt-1 border-red-300 font-bold">Vencida há {Math.abs(diasRestantes)} dias</Badge>;
                  }
                  if (diasRestantes <= 60) {
                    return <Badge className="bg-amber-100 text-amber-800 text-[10px] mt-1 border-amber-300 font-bold">Vence em {diasRestantes} dias</Badge>;
                  }
                  return <Badge className="bg-emerald-100 text-emerald-800 text-[10px] mt-1">Em dia ({diasRestantes} dias restantes)</Badge>;
                })()}
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Formatação Periódica</p>
                <p className="text-xs text-slate-400 italic mt-1">Não se aplica a monitores</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vida Útil (Ciclo 5 anos)</p>
              <p className="font-bold text-slate-900 mt-0.5">
                {formatarDataSemFuso(equipamento.data_aquisicao) || "Sem aquisição"}
              </p>
              {(() => {
                if (!equipamento.data_aquisicao) {
                  return <Badge className="bg-slate-100 text-slate-600 text-[10px] mt-1">Sem registro de aquisição</Badge>;
                }
                const dt = new Date(equipamento.data_aquisicao);
                if (isNaN(dt.getTime())) return null;
                const target = new Date(dt);
                target.setFullYear(target.getFullYear() + 5);
                const diasRestantes = Math.round((target - new Date()) / (1000 * 60 * 60 * 24));
                if (diasRestantes < 0) {
                  return <Badge className="bg-purple-100 text-purple-800 text-[10px] mt-1 border-purple-300 font-bold">Vencida há {Math.abs(diasRestantes)} dias</Badge>;
                }
                if (diasRestantes <= 90) {
                  return <Badge className="bg-amber-100 text-amber-800 text-[10px] mt-1 border-amber-300 font-bold">Vence em {diasRestantes} dias</Badge>;
                }
                return <Badge className="bg-emerald-100 text-emerald-800 text-[10px] mt-1">OK ({diasRestantes} dias restantes)</Badge>;
              })()}
            </div>
          </div>

          {/* BLOCO DE DADOS TÉCNICOS & AVALIAÇÃO DA MÁQUINA */}
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                Dados da Avaliação Técnica & Acesso Remoto
              </p>
              {ultimaAvaliacao && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAvaliacao(ultimaAvaliacao)}
                  className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1 font-semibold"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar Avaliação
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <p className="text-slate-500 font-semibold">AnyDesk (Remoto)</p>
                <p className="font-mono font-bold text-indigo-700 mt-0.5">
                  {extrairAnyDesk(equipamento) || extrairAnyDesk(ultimaAvaliacao) || "Não informado"}
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

    {/* Modal para Editar Avaliação */}
    <Dialog open={!!editingAvaliacao} onOpenChange={() => setEditingAvaliacao(null)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Pencil className="w-5 h-5 text-indigo-600" />
            Editar Avaliação Técnica
          </DialogTitle>
          <DialogDescription>
            Cole o JSON retornado pelo script do PowerShell ou atualize manualmente os dados do hardware.
          </DialogDescription>
        </DialogHeader>

        {editingAvaliacao && (
          <AvaliacaoEquipamento
            equipamento={equipamento}
            entityType={editingAvaliacao.equipamento_tipo || equipamento.entityType}
            avaliacaoExistente={editingAvaliacao}
            onSalvar={(dados) => salvarEdicaoMutation.mutate(dados)}
            somenteLeitura={false}
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}