import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ShoppingBag, 
  AlertTriangle, 
  ChevronRight, 
  Loader2, 
  FileText, 
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  User,
  ArrowRight
} from "lucide-react";
import { usePortalAuth } from "@/components/portal/usePortalAuth";
import RequisicaoDetalhes from "@/components/requisicoes/RequisicaoDetalhes";

export default function PainelDiretor() {
  const queryClient = useQueryClient();
  const { colaborador, loading: authLoading, requireAuth } = usePortalAuth();

  useEffect(() => {
    if (!authLoading) requireAuth();
  }, [authLoading]);

  // Busca dados completos do colaborador logado
  const { data: colaboradorFull } = useQuery({
    queryKey: ['portal_colab_full', colaborador?.email],
    queryFn: async () => {
      const results = await base44.entities.Colaboradores.filter({ email: colaborador.email });
      return results?.[0] || null;
    },
    enabled: !!colaborador?.email,
  });

  const [abaAtiva, setAbaAtiva] = useState("pendentes"); // "pendentes" | "cotacao" | "concluidas"
  const [selectedReq, setSelectedReq] = useState(null);
  
  // Modal de Recusa / Reprovação
  const [modalReprovar, setModalReprovar] = useState(null);
  const [motivoReprovacao, setMotivoReprovacao] = useState("");

  // Busca todas as requisições em tempo real
  const { data: requisicoes = [], isLoading: loadingReqs } = useQuery({
    queryKey: ["painel_diretor_requisicoes"],
    queryFn: () => base44.entities.RequisicaoCompras.list("-created_date"),
    refetchInterval: 3000,
  });

  // Filtros de inteligência executiva
  const pendentesDiretor = useMemo(() => {
    return requisicoes.filter(r => 
      r.status === "Aguardando Diretor" || r.status === "Aguardando Aprovação Final"
    );
  }, [requisicoes]);

  const emCotacaoCompras = useMemo(() => {
    return requisicoes.filter(r => r.status === "Aguardando Cotação");
  }, [requisicoes]);

  const concluidasAprovadas = useMemo(() => {
    return requisicoes.filter(r => 
      r.status === "Aprovada" || r.status?.startsWith("Reprovada")
    );
  }, [requisicoes]);

  // Ação de aprovar
  const aprovarMutation = useMutation({
    mutationFn: async ({ reqId, token }) => {
      const res = await base44.functions.invoke("requisicaoComprasAction", {
        action: "diretor_aprovar",
        requisicao_id: reqId,
        token: token || undefined,
        comentario: "Autorizado pelo Diretor via Painel Executivo"
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel_diretor_requisicoes"] });
      queryClient.invalidateQueries({ queryKey: ["portal_requisicoes"] });
      queryClient.invalidateQueries({ queryKey: ["painel_aprovador_reqs"] });
      setSelectedReq(null);
    }
  });

  // Ação de reprovar
  const reprovarMutation = useMutation({
    mutationFn: async ({ reqId, token, motivo }) => {
      const res = await base44.functions.invoke("requisicaoComprasAction", {
        action: "diretor_reprovar",
        requisicao_id: reqId,
        token: token || undefined,
        comentario: motivo
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel_diretor_requisicoes"] });
      queryClient.invalidateQueries({ queryKey: ["portal_requisicoes"] });
      queryClient.invalidateQueries({ queryKey: ["painel_aprovador_reqs"] });
      setModalReprovar(null);
      setMotivoReprovacao("");
      setSelectedReq(null);
    }
  });

  const handleReprovarConfirm = () => {
    if (!modalReprovar || !motivoReprovacao.trim()) return;
    reprovarMutation.mutate({
      reqId: modalReprovar.id,
      token: modalReprovar.token_aprovacao,
      motivo: motivoReprovacao.trim()
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Topo Executivo Acolhedor */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                Painel da Diretoria
              </h1>
              <p className="text-sm font-medium text-slate-500">
                Olá, {colaboradorFull?.nome_completo || "Diretor"}. Gerencie as autorizações de compras com agilidade.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href="/portal-requisicoes" 
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-2 rounded-lg border flex items-center gap-1 transition"
            >
              Portal Completo <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Cards de Métricas com números grandes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card 
            className={`cursor-pointer transition-all border-2 ${
              abaAtiva === "pendentes" 
                ? "border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-200" 
                : "border-slate-200 hover:border-purple-300 bg-white"
            }`}
            onClick={() => setAbaAtiva("pendentes")}
          >
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold tracking-wider text-purple-700">Aguardando Sua Decisão</p>
                  <p className="text-3xl md:text-4xl font-black text-purple-900 mt-1">
                    {pendentesDiretor.length}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pendentesDiretor.length > 0 ? "bg-purple-600 text-white animate-pulse" : "bg-purple-100 text-purple-700"}`}>
                  <Clock className="w-6 h-6" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {pendentesDiretor.length === 0 ? "Tudo em dia!" : "Necessitam da sua autorização"}
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all border-2 ${
              abaAtiva === "cotacao" 
                ? "border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-200" 
                : "border-slate-200 hover:border-blue-300 bg-white"
            }`}
            onClick={() => setAbaAtiva("cotacao")}
          >
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold tracking-wider text-blue-700">Em Cotação com Compras</p>
                  <p className="text-3xl md:text-4xl font-black text-blue-900 mt-1">
                    {emCotacaoCompras.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Autorizadas por você, sendo cotadas
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all border-2 ${
              abaAtiva === "concluidas" 
                ? "border-green-600 bg-green-50/50 shadow-md ring-2 ring-green-200" 
                : "border-slate-200 hover:border-green-300 bg-white"
            }`}
            onClick={() => setAbaAtiva("concluidas")}
          >
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold tracking-wider text-green-700">Concluídas / Histórico</p>
                  <p className="text-3xl md:text-4xl font-black text-green-900 mt-1">
                    {concluidasAprovadas.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Compras finalizadas ou arquivadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Requisições com Layout Executivo */}
        {loadingReqs ? (
          <div className="text-center py-16 bg-white rounded-2xl border shadow-sm">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Carregando informações...</p>
          </div>
        ) : abaAtiva === "pendentes" ? (
          <div className="space-y-4">
            {pendentesDiretor.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800">Tudo em dia, Valter!</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                  Você não possui nenhuma compra aguardando sua autorização no momento. Bom trabalho!
                </p>
              </div>
            ) : (
              pendentesDiretor.map((req) => {
                const isFase1 = req.status === "Aguardando Diretor";
                const isFase2 = req.status === "Aguardando Aprovação Final";
                
                // Verifica se foi reenviado após reprovação anterior
                const ultimoReenvio = (req.historico || []).slice().reverse().find(h => h.tipo === 'reenvio_apos_ajuste');
                const motivoRecusaAnterior = ultimoReenvio?.motivo_anterior || null;

                const qtdReq = Number(req.quantidade) || 1;
                const valorMaximoEstimado = Number(req.valor_maximo) || 0;
                const valorUnitarioMaxEstimado = Number(req.valor_unitario_maximo) || 0;
                const valorEstimadoTeto = valorMaximoEstimado > 0 ? valorMaximoEstimado : (valorUnitarioMaxEstimado > 0 ? valorUnitarioMaxEstimado * qtdReq : 0);
                const valorCotado = Number(req.cotacao_valor) || 0;
                const diferencaExcedente = valorEstimadoTeto > 0 && valorCotado > valorEstimadoTeto ? (valorCotado - valorEstimadoTeto) : 0;

                return (
                  <Card key={req.id} className="border-2 border-purple-200 bg-white hover:border-purple-400 transition-all shadow-sm rounded-xl overflow-hidden">
                    {/* Tarja de Alerta de Reenvio */}
                    {motivoRecusaAnterior && (
                      <div className="bg-amber-100 border-b border-amber-300 px-4 py-2.5 flex items-start gap-2.5 text-amber-900 text-sm">
                        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">⚠️ Item Reenviado pelo Colaborador após Ajustes</p>
                          <p className="text-xs text-amber-800 mt-0.5">
                            Motivo da recusa anterior: <em>"{motivoRecusaAnterior}"</em>
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="p-5 md:p-6">
                      {/* Cabeçalho do Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                            {req.numero_requisicao}
                          </span>
                          {isFase1 ? (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold px-3 py-1">
                              1ª Etapa: Autorizar Cotação de Preços
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-100 text-purple-900 border-purple-300 font-bold px-3 py-1">
                              2ª Etapa: Aprovação Financeira Final
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs font-semibold">
                            Urgência: {req.urgencia}
                          </Badge>
                        </div>
                        {req.data_necessidade && (
                          <span className="text-xs text-slate-600 font-semibold bg-slate-50 px-2.5 py-1 rounded border">
                            📅 Necessidade: {new Date(req.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>

                      {/* Nome do Item e Solicitante */}
                      <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                        {req.item}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-4">
                        <span>Solicitante: <strong className="text-slate-800">{req.colaborador_nome}</strong> ({req.colaborador_area})</span>
                        <span>·</span>
                        <span>Quantidade: <strong className="text-slate-800">{req.quantidade} {req.unidade_medida || 'un'}</strong></span>
                        {req.material && <span>· Material: <strong>{req.material}</strong></span>}
                        {req.cor && <span>· Cor: <strong>{req.cor}</strong></span>}
                      </div>

                      {/* Destaque Financeiro da Cotação ou Estimativa */}
                      {isFase2 ? (
                        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 mb-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase text-purple-700">Preço Cotado no Mercado</p>
                              <p className="text-2xl font-black text-purple-900">
                                R$ {valorCotado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-slate-600 mt-0.5">Fornecedor: <strong>{req.cotacao_fornecedor}</strong></p>
                            </div>
                            {valorEstimadoTeto > 0 && (
                              <div>
                                <p className="text-xs font-bold uppercase text-slate-600">Estimativa Prévia Aprovada</p>
                                <p className="text-xl font-bold text-slate-700">
                                  R$ {valorEstimadoTeto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                {diferencaExcedente > 0 && (
                                  <p className="text-xs font-bold text-red-600 mt-0.5">
                                    Excedeu em +R$ {diferencaExcedente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                )}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-bold uppercase text-slate-600">Comprador Responsável</p>
                              <p className="text-sm font-semibold text-slate-800 mt-1">
                                {req.cotacao_comprador_nome || "Setor de Compras"}
                              </p>
                              {req.cotacao_comentario && (
                                <p className="text-xs italic text-slate-600 mt-1">
                                  "{req.cotacao_comentario}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border rounded-xl p-3.5 mb-4 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold text-slate-800">Valor Estimado Previsto: </span>
                            {valorEstimadoTeto > 0 ? (
                              <strong className="text-sm font-bold text-slate-900">R$ {valorEstimadoTeto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            ) : (
                              <span className="text-slate-500 italic">Não informado previamente</span>
                            )}
                          </div>
                          <span className="text-emerald-700 font-medium">
                            💡 Se compras cotar até este valor, aprovará automaticamente.
                          </span>
                        </div>
                      )}

                      {/* Justificativa */}
                      {req.justificativa && (
                        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-700 mb-4 border">
                          <p className="font-bold text-slate-800 mb-1">Justificativa da Solicitação:</p>
                          <p className="italic">"{req.justificativa}"</p>
                        </div>
                      )}

                      {/* Botões Grandes de Ação Executiva */}
                      <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-900 text-xs gap-1"
                          onClick={() => setSelectedReq(req)}
                        >
                          <FileText className="w-4 h-4" /> Ver Detalhes e Anexos ({((req.anexos || []).length) + ((req.cotacao_anexos || []).length)})
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 font-bold px-4 py-2.5 text-sm"
                            disabled={reprovarMutation.isPending || aprovarMutation.isPending}
                            onClick={() => {
                              setModalReprovar(req);
                              setMotivoReprovacao("");
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1.5 text-red-600" />
                            Recusar / Devolver
                          </Button>

                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 text-sm shadow-md"
                            disabled={aprovarMutation.isPending || reprovarMutation.isPending}
                            onClick={() => {
                              aprovarMutation.mutate({
                                reqId: req.id,
                                token: req.token_aprovacao
                              });
                            }}
                          >
                            {aprovarMutation.isPending ? (
                              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Processando...</>
                            ) : isFase1 ? (
                              <><CheckCircle className="w-4 h-4 mr-1.5" /> Autorizar Cotação</>
                            ) : (
                              <><CheckCircle className="w-4 h-4 mr-1.5" /> Aprovar Compra Final</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        ) : abaAtiva === "cotacao" ? (
          <div className="space-y-3">
            {emCotacaoCompras.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border p-8">
                <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">Nenhuma requisição em cotação no momento.</p>
              </div>
            ) : (
              emCotacaoCompras.map(req => (
                <div 
                  key={req.id}
                  className="bg-white border rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                  onClick={() => setSelectedReq(req)}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-slate-500">{req.numero_requisicao}</span>
                      <Badge className="bg-blue-100 text-blue-800 text-xs">Em cotação com compras</Badge>
                      <Badge variant="outline" className="text-xs">{req.urgencia}</Badge>
                    </div>
                    <p className="font-bold text-slate-900 truncate">{req.item}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Solicitante: <strong>{req.colaborador_nome}</strong> ({req.colaborador_area}) · Qtd: {req.quantidade} {req.unidade_medida || 'un'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {concluidasAprovadas.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border p-8">
                <p className="font-semibold text-slate-700">Nenhum histórico disponível.</p>
              </div>
            ) : (
              concluidasAprovadas.map(req => (
                <div 
                  key={req.id}
                  className="bg-white border rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                  onClick={() => setSelectedReq(req)}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-slate-500">{req.numero_requisicao}</span>
                      <Badge className={req.status === 'Aprovada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {req.status}
                      </Badge>
                    </div>
                    <p className="font-bold text-slate-900 truncate">{req.item}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {req.colaborador_nome} · {new Date(req.created_date).toLocaleDateString('pt-BR')}
                      {req.cotacao_valor ? ` · Valor Final: R$ ${Number(req.cotacao_valor).toLocaleString('pt-BR')}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Modal de Reprovação com Justificativa Simples */}
      <Dialog open={!!modalReprovar} onOpenChange={() => setModalReprovar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-700 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Devolver / Recusar Requisição
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-600">
              Você está recusando a requisição <strong>{modalReprovar?.numero_requisicao}</strong> ({modalReprovar?.item}).
            </p>
            <div>
              <Label className="text-xs font-bold text-slate-700">
                Motivo ou Orientação para o Colaborador <span className="text-red-500">*</span>
              </Label>
              <Textarea
                rows={3}
                className="mt-1.5 text-sm"
                placeholder="Ex: Buscar fornecedor mais barato, reduzir a quantidade para 2 unidades, verificar se já temos no estoque..."
                value={motivoReprovacao}
                onChange={e => setMotivoReprovacao(e.target.value)}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Esta orientação será enviada ao colaborador para que ele possa ajustar se necessário.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setModalReprovar(null)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              disabled={!motivoReprovacao.trim() || reprovarMutation.isPending}
              onClick={handleReprovarConfirm}
            >
              {reprovarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Recusa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes da Requisição */}
      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Requisição {selectedReq?.numero_requisicao}</DialogTitle>
          </DialogHeader>
          {selectedReq && (
            <RequisicaoDetalhes
              requisicao={selectedReq}
              colaboradorAtual={colaboradorFull}
              isAdmin={true}
              onAcao={() => {
                queryClient.invalidateQueries({ queryKey: ["painel_diretor_requisicoes"] });
                setSelectedReq(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
