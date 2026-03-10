import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Loader2, Monitor, Laptop, ChevronLeft, History, ClipboardList } from "lucide-react";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";
import AvaliacaoEquipamento from "../components/equipamentos/AvaliacaoEquipamento";

const getClassColor = (c) => c === "Manter" ? "bg-green-100 text-green-800" : c === "Upgrade" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

export default function PortalEquipamentos() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();
  const queryClient = useQueryClient();
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState(null);
  const [avaliacaoSalva, setAvaliacaoSalva] = useState(false);

  useEffect(() => {
    if (!loading) requireAuth();
  }, [loading]);

  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['portal_pcs'],
    queryFn: () => base44.entities.PCs_Internos.list(),
    enabled: !!colaborador,
  });

  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['portal_nbs'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
    enabled: !!colaborador,
  });

  const { data: avaliacoes = [], refetch: refetchAvaliacoes } = useQuery({
    queryKey: ['portal_avaliacoes'],
    queryFn: () => base44.entities.Avaliacoes.list('-data_avaliacao'),
    enabled: !!colaborador,
  });

  const salvarAvaliacaoMutation = useMutation({
    mutationFn: async (dados) => {
      const eq = equipamentoSelecionado;
      const avaliacoesDoEq = avaliacoes.filter(a => a.equipamento_id === eq.id);
      const numeroAvaliacao = avaliacoesDoEq.length + 1;

      return base44.entities.Avaliacoes.create({
        equipamento_id: eq.id,
        equipamento_tipo: eq.entityType,
        equipamento_nome: `${eq.marca} ${eq.modelo}`,
        usuario_equipamento: eq.usuario_atual,
        numero_avaliacao: numeroAvaliacao,
        avaliador: colaborador.nome_completo,
        data_avaliacao: new Date().toISOString(),
        ...dados,
      });
    },
    onSuccess: () => {
      refetchAvaliacoes();
      setAvaliacaoSalva(true);
      setTimeout(() => {
        setAvaliacaoSalva(false);
        setEquipamentoSelecionado(null);
      }, 2500);
    },
  });

  if (loading || !colaborador) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const nomeNorm = colaborador.nome_completo?.toLowerCase().trim();

  const meusEquipamentos = [
    ...pcsInternos
      .filter(pc => pc.usuario_atual?.toLowerCase().trim() === nomeNorm && pc.tipo !== "Monitor")
      .map(pc => ({ ...pc, entityType: "PCs_Internos", IconComp: pc.tipo === "Notebook" ? Laptop : Monitor })),
    ...notebooksExternos
      .filter(nb => nb.usuario_atual?.toLowerCase().trim() === nomeNorm)
      .map(nb => ({ ...nb, entityType: "Notebooks_Externos", IconComp: Laptop })),
  ];

  // Todas avaliações dos meus equipamentos (histórico completo)
  const meusEquipamentosIds = meusEquipamentos.map(e => e.id);
  const minhasAvaliacoes = avaliacoes.filter(a => meusEquipamentosIds.includes(a.equipamento_id));

  const getUltimaAvaliacao = (id) => avaliacoes.find(a => a.equipamento_id === id);
  const getHistoricoEquipamento = (id) => avaliacoes.filter(a => a.equipamento_id === id).sort((a, b) => new Date(b.data_avaliacao) - new Date(a.data_avaliacao));

  // Tela de avaliação de equipamento específico
  if (equipamentoSelecionado) {
    const historicoEq = getHistoricoEquipamento(equipamentoSelecionado.id);
    const ultimaAvaliacao = historicoEq[0];
    return (
      <PortalLayout colaborador={colaborador} onLogout={logout}>
        <div className="p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <Button variant="outline" className="mb-6 gap-2" onClick={() => setEquipamentoSelecionado(null)}>
              <ChevronLeft className="w-4 h-4" />
              Voltar para Meus Equipamentos
            </Button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {equipamentoSelecionado.marca} {equipamentoSelecionado.modelo}
                </h1>
                <p className="text-gray-500 text-sm">Etiqueta: {equipamentoSelecionado.etiqueta_interna || "—"} · {historicoEq.length} avaliação(ões) anteriores</p>
              </div>
            </div>

            {avaliacaoSalva ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-green-800 mb-2">Avaliação salva!</h2>
                <p className="text-gray-500">Redirecionando...</p>
              </div>
            ) : (
              <Tabs defaultValue="nova">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="nova" className="gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Nova Avaliação
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="gap-2">
                    <History className="w-4 h-4" />
                    Histórico ({historicoEq.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="nova">
                  <AvaliacaoEquipamento
                    equipamento={equipamentoSelecionado}
                    entityType={equipamentoSelecionado.entityType}
                    avaliacaoExistente={null}
                    onSalvar={(dados) => salvarAvaliacaoMutation.mutate(dados)}
                  />
                </TabsContent>

                <TabsContent value="historico">
                  {historicoEq.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <History className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p>Nenhuma avaliação anterior para este equipamento.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {historicoEq.map((av, idx) => (
                        <Card key={av.id} className={idx === 0 ? "border-blue-200" : ""}>
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">{av.numero_avaliacao || idx + 1}ª Avaliação</Badge>
                                {idx === 0 && <Badge className="bg-blue-100 text-blue-800">Mais recente</Badge>}
                              </div>
                              <Badge className={getClassColor(av.classificacao)}>{av.classificacao}</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                              <div><p className="text-gray-500">Data</p><p className="font-medium">{new Date(av.data_avaliacao).toLocaleDateString('pt-BR')}</p></div>
                              <div><p className="text-gray-500">Pontuação</p><p className="font-medium">{av.pontuacao_total}/100</p></div>
                              <div><p className="text-gray-500">Desempenho</p><p className="font-medium">{av.desempenho || "—"}</p></div>
                              <div><p className="text-gray-500">Armazenamento</p><p className="font-medium">{av.tipo_armazenamento || "—"}</p></div>
                              <div><p className="text-gray-500">Antivírus</p><p className="font-medium">{av.antivirus || "—"}</p></div>
                              <div><p className="text-gray-500">Windows</p><p className="font-medium">{av.versao_windows || "—"}</p></div>
                            </div>
                            {av.problemas?.length > 0 && (
                              <div className="mt-3">
                                <p className="text-gray-500 text-sm mb-1">Problemas relatados:</p>
                                <div className="flex flex-wrap gap-1">
                                  {av.problemas.map((p, pi) => <Badge key={pi} variant="outline" className="text-xs text-red-700 border-red-200">{p}</Badge>)}
                                </div>
                              </div>
                            )}
                            {av.satisfacao && <p className="text-xs text-gray-500 mt-2">Satisfação: {av.satisfacao}</p>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout}>
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meus Equipamentos</h1>
              <p className="text-gray-500 mt-1">Equipamentos atribuídos a você · {minhasAvaliacoes.length} avaliação(ões) realizadas</p>
            </div>
          </div>

          {meusEquipamentos.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum equipamento atribuído a você no momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meusEquipamentos.map((eq) => {
                const avaliacao = getUltimaAvaliacao(eq.id);
                const historico = getHistoricoEquipamento(eq.id);
                const Icon = eq.IconComp;
                return (
                  <Card key={eq.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{eq.marca} {eq.modelo}</p>
                          <p className="text-sm text-gray-500">Etiqueta: {eq.etiqueta_interna || "—"}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge className={
                              eq.status === "Em uso" ? "bg-blue-100 text-blue-800" :
                              eq.status === "Disponível" ? "bg-green-100 text-green-800" :
                              "bg-orange-100 text-orange-800"
                            }>{eq.status}</Badge>
                            {eq.tipo && <Badge variant="outline">{eq.tipo}</Badge>}
                            {avaliacao && <Badge className={getClassColor(avaliacao.classificacao)}>{avaliacao.classificacao}</Badge>}
                          </div>
                          {avaliacao ? (
                            <p className="text-xs text-gray-500 mt-1">
                              Última avaliação: {new Date(avaliacao.data_avaliacao).toLocaleDateString('pt-BR')}
                              {" · "}Pontuação: {avaliacao.pontuacao_total}
                              {historico.length > 1 && ` · ${historico.length} avaliações`}
                            </p>
                          ) : (
                            <p className="text-xs text-orange-600 mt-1">Ainda não avaliado</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => setEquipamentoSelecionado(eq)}
                        >
                          <Activity className="w-4 h-4" />
                          {avaliacao ? "Reavaliar" : "Avaliar"}
                        </Button>
                        {historico.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-gray-500"
                            onClick={() => setEquipamentoSelecionado(eq)}
                          >
                            <History className="w-4 h-4" />
                            {historico.length}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}