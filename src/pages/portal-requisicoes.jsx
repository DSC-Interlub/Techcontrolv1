import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  ShoppingCart, 
  Plus, 
  Loader2, 
  CheckCircle, 
  Clock, 
  XCircle, 
  ChevronLeft, 
  UserCheck, 
  ShoppingBag, 
  Search, 
  ListFilter, 
  ShieldCheck, 
  ArrowRight,
  AlertTriangle,
  FileText
} from "lucide-react";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";
import NovaRequisicaoForm from "../components/requisicoes/NovaRequisicaoForm";
import RequisicaoDetalhes from "../components/requisicoes/RequisicaoDetalhes";
import IndicadoresRequisicao from "../components/requisicoes/IndicadoresRequisicao";
import PainelAprovador from "../components/requisicoes/PainelAprovador";

const statusColors = {
  "Aguardando Aprovador": "bg-yellow-100 text-yellow-800",
  "Aguardando Diretor": "bg-blue-100 text-blue-800",
  "Aguardando Cotação": "bg-amber-100 text-amber-800 border-amber-300",
  "Aguardando Aprovação Final": "bg-purple-100 text-purple-800 border-purple-300",
  "Aprovada": "bg-green-100 text-green-800",
  "Reprovada pelo Aprovador": "bg-red-100 text-red-800",
  "Reprovada pelo Diretor": "bg-red-100 text-red-800",
};

const statusIcon = {
  "Aguardando Aprovador": <Clock className="w-3 h-3" />,
  "Aguardando Diretor": <Clock className="w-3 h-3" />,
  "Aguardando Cotação": <ShoppingBag className="w-3 h-3" />,
  "Aguardando Aprovação Final": <Clock className="w-3 h-3" />,
  "Aprovada": <CheckCircle className="w-3 h-3" />,
  "Reprovada pelo Aprovador": <XCircle className="w-3 h-3" />,
  "Reprovada pelo Diretor": <XCircle className="w-3 h-3" />,
};

export default function PortalRequisicoes() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState("lista"); // "lista" | "nova"
  const [selectedReq, setSelectedReq] = useState(null);

  // Filtros da visão geral do comprador
  const [buscaComprador, setBuscaComprador] = useState("");
  const [filtroStatusComprador, setFiltroStatusComprador] = useState("todos");

  // Estados e mutations exclusivas para o Diretor Geral
  const [modalReprovar, setModalReprovar] = useState(null);
  const [motivoReprovacao, setMotivoReprovacao] = useState("");
  const [abaDiretor, setAbaDiretor] = useState("pendentes");

  const aprovarDiretorMutation = useMutation({
    mutationFn: async ({ reqId, token }) => {
      const res = await base44.functions.invoke("requisicaoComprasAction", {
        action: "diretor_aprovar",
        requisicao_id: reqId,
        token: token || undefined,
        comentario: "Autorizado pelo Diretor via Portal"
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_requisicoes'] });
      queryClient.invalidateQueries({ queryKey: ['painel_aprovador_reqs'] });
      setSelectedReq(null);
    }
  });

  const reprovarDiretorMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['portal_requisicoes'] });
      queryClient.invalidateQueries({ queryKey: ['painel_aprovador_reqs'] });
      setModalReprovar(null);
      setMotivoReprovacao("");
      setSelectedReq(null);
    }
  });

  useEffect(() => {
    if (!loading) requireAuth();
  }, [loading]);

  // Busca dados frescos do colaborador para ter responsavel_id e eh_comprador
  const { data: colaboradorFull } = useQuery({
    queryKey: ['portal_colab_full', colaborador?.email],
    queryFn: async () => {
      const results = await base44.entities.Colaboradores.filter({ email: colaborador.email });
      return results?.[0] || null;
    },
    enabled: !!colaborador?.email,
  });

  // Polling automático a cada 3s para eliminar delay de exibição
  const { data: requisicoes = [], isLoading } = useQuery({
    queryKey: ['portal_requisicoes', colaborador?.id],
    queryFn: () => base44.entities.RequisicaoCompras.list('-created_date'),
    enabled: !!colaborador,
    refetchInterval: 3000,
    staleTime: 0,
  });

  const { data: todosColaboradores = [] } = useQuery({
    queryKey: ['portal_todos_colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list(),
    enabled: !!colaborador,
  });

  if (loading || !colaborador) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  // É aprovador se é gestor de alguém, se tem requisições onde é aprovador_id ou se possui cargo/flag de aprovador/gestão
  const isGestorDeAlguem = todosColaboradores.some(c => c.responsavel_id === colaboradorFull?.id);
  const temReqsComoAprovador = requisicoes.some(r => r.aprovador_id === colaboradorFull?.id);

  const isDiretor = !!(
    colaboradorFull?.email?.toLowerCase() === 'vtorres@interlub.com' ||
    colaboradorFull?.area?.toLowerCase() === 'diretoria' ||
    colaboradorFull?.cargo?.toLowerCase().includes('diretor')
  );

  const isAprovador = isGestorDeAlguem || temReqsComoAprovador || isDiretor || !!(
    colaboradorFull?.is_aprovador ||
    colaboradorFull?.cargo?.toLowerCase().includes('aprovador') ||
    colaboradorFull?.cargo?.toLowerCase().includes('gerente') ||
    colaboradorFull?.cargo?.toLowerCase().includes('coordenador') ||
    colaboradorFull?.cargo?.toLowerCase().includes('supervisor')
  );

  const minhasRequisicoes = requisicoes.filter(r => r.colaborador_id === colaboradorFull?.id);
  const reqsAprovador = isAprovador ? requisicoes.filter(r => r.aprovador_id === colaboradorFull?.id) : [];

  // Se o colaborador é diretor, ele tem visibilidade de todas as requisições que necessitam de aprovação da diretoria
  const requisicoesPendentesDiretor = isDiretor
    ? requisicoes.filter(r => r.status === 'Aguardando Diretor' || r.status === 'Aguardando Aprovação Final')
    : [];

  // Junta minhas requisições + requisições sob minha responsabilidade como aprovador + aprovações de diretoria
  const todasRelacionadas = Array.from(
    new Map([...minhasRequisicoes, ...reqsAprovador, ...(isDiretor ? requisicoes : [])].map(r => [r.id, r])).values()
  );

  // isComprador: lê do campo eh_comprador do colaborador ou área/cargo de compras
  const isComprador = !!(colaboradorFull?.eh_comprador || colaboradorFull?.area?.toLowerCase().includes('compras'));

  // Requisições pendentes de aprovação atribuídas a este usuário (como gestor direto)
  const requisicoesPendentesAprovador = requisicoes.filter(r =>
    r.aprovador_id === colaboradorFull?.id && r.status === 'Aguardando Aprovador'
  );

  // Se colaborador é comprador, mostra as liberadas para cotação
  const requisicoesPendentesCotacao = isComprador
    ? requisicoes.filter(r => r.status === 'Aguardando Cotação')
    : [];

  const pendentes = todasRelacionadas.filter(r =>
    ['Aguardando Aprovador', 'Aguardando Diretor', 'Aguardando Cotação', 'Aguardando Aprovação Final'].includes(r.status)
  );
  const aprovadas = todasRelacionadas.filter(r => r.status === 'Aprovada');
  const reprovadas = todasRelacionadas.filter(r => r.status?.startsWith('Reprovada'));

  // Lista filtrada para a visão completa do comprador
  const requisicoesCompradorFiltradas = requisicoes.filter(r => {
    if (filtroStatusComprador !== "todos" && r.status !== filtroStatusComprador) return false;
    if (buscaComprador.trim()) {
      const q = buscaComprador.toLowerCase();
      const matchItem = r.item?.toLowerCase().includes(q);
      const matchNum = r.numero_requisicao?.toLowerCase().includes(q);
      const matchSolic = r.colaborador_nome?.toLowerCase().includes(q);
      const matchArea = r.colaborador_area?.toLowerCase().includes(q);
      const matchForn = r.cotacao_fornecedor?.toLowerCase().includes(q);
      return matchItem || matchNum || matchSolic || matchArea || matchForn;
    }
    return true;
  });

  if (view === "nova") {
    return (
      <PortalLayout colaborador={colaborador} onLogout={logout} permissoesComunicados={colaborador.permissoes_comunicados || []}>
        <div className="p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            <Button variant="outline" className="mb-6 gap-2" onClick={() => setView("lista")}>
              <ChevronLeft className="w-4 h-4" />Voltar
            </Button>
            <NovaRequisicaoForm
              colaborador={colaboradorFull || colaborador}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['portal_requisicoes'] });
                queryClient.invalidateQueries({ queryKey: ['painel_aprovador_reqs'] });
                setView("lista");
              }}
              onCancel={() => setView("lista")}
            />
          </div>
        </div>
      </PortalLayout>
    );
  }

  // SE FOR O DIRETOR (VALTER ALVES TORRES / DIRETORIA):
  // Exibe DIRETAMENTE a experiência executiva simplificada com apenas 2 abas limpas.
  if (isDiretor && view !== "nova") {
    return (
      <PortalLayout colaborador={colaborador} onLogout={logout} permissoesComunicados={colaborador.permissoes_comunicados || []}>
        <div className="p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Topo Executivo Limpo */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 bg-white p-5 rounded-2xl border-2 border-purple-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                    Painel da Diretoria — Compras
                  </h1>
                  <p className="text-sm font-medium text-slate-500">
                    Olá, {colaboradorFull?.nome_completo || "Valter"}. Aqui estão as compras que dependem da sua decisão.
                  </p>
                </div>
              </div>
              <Button onClick={() => setView("nova")} className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 text-xs">
                <Plus className="w-4 h-4" />
                Fazer uma Solicitação
              </Button>
            </div>

            {/* Abas Executivas: Apenas 2 Abas Claras */}
            <div className="flex gap-2 border-b-2 border-slate-200 mb-6 pb-1">
              <button
                onClick={() => setAbaDiretor("pendentes")}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm md:text-base transition-all ${
                  abaDiretor === "pendentes"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Clock className="w-4 h-4" />
                Aguardando Minha Decisão
                {requisicoesPendentesDiretor.length > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-black ${
                    abaDiretor === "pendentes" ? "bg-white text-purple-700" : "bg-purple-600 text-white"
                  }`}>
                    {requisicoesPendentesDiretor.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setAbaDiretor("concluidas")}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm md:text-base transition-all ${
                  abaDiretor === "concluidas"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Compras Concluídas / Histórico ({aprovadas.length + reprovadas.length})
              </button>
            </div>

            {/* Conteúdo da Aba Pendentes */}
            {abaDiretor === "pendentes" ? (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-12 bg-white rounded-2xl border p-6">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
                    <p className="text-slate-600 font-semibold text-sm">Carregando compras...</p>
                  </div>
                ) : requisicoesPendentesDiretor.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-800">Tudo em dia, Valter!</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                      Você não possui nenhuma compra aguardando sua autorização no momento.
                    </p>
                  </div>
                ) : (
                  requisicoesPendentesDiretor.map((req) => {
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

                    const totalAnexos = ((req.anexos || []).length) + ((req.cotacao_anexos || []).length);

                    return (
                      <Card key={req.id} className="border-2 border-purple-200 bg-white hover:border-purple-400 transition-all shadow-sm rounded-2xl overflow-hidden">
                        {/* Tarja de Alerta de Reenvio */}
                        {motivoRecusaAnterior && (
                          <div className="bg-amber-100 border-b border-amber-300 px-5 py-3 flex items-start gap-3 text-amber-900 text-sm">
                            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">⚠️ Item Reenviado pelo Colaborador após Ajustes</p>
                              <p className="text-xs text-amber-800 mt-0.5">
                                Motivo da sua recusa anterior: <em>"{motivoRecusaAnterior}"</em>
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="p-6">
                          {/* Cabeçalho do Card */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                                {req.numero_requisicao}
                              </span>
                              {isFase1 ? (
                                <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold px-3 py-1 text-xs">
                                  🟢 1ª Etapa: Autorizar Procura de Preço (Cotação)
                                </Badge>
                              ) : (
                                <Badge className="bg-purple-100 text-purple-900 border-purple-300 font-bold px-3 py-1 text-xs">
                                  ⚠️ 2ª Etapa: Preço Superou a Estimativa (Autorizar Valor)
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs font-semibold">
                                Urgência: {req.urgencia}
                              </Badge>
                            </div>
                            {req.data_necessidade && (
                              <span className="text-xs text-slate-700 font-semibold bg-slate-50 px-2.5 py-1 rounded border">
                                📅 Limite: {new Date(req.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>

                          {/* Nome do Item e Solicitante em Destaque */}
                          <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-2">
                            {req.item}
                          </h2>
                          <p className="text-sm text-slate-600 mb-4">
                            Pedido por: <strong className="text-slate-800">{req.colaborador_nome}</strong> ({req.colaborador_area || 'Geral'}) · Quantidade: <strong className="text-slate-800">{req.quantidade} {req.unidade_medida || 'un'}</strong>
                            {req.material ? ` · Material: ${req.material}` : ''}
                            {req.cor ? ` · Cor: ${req.cor}` : ''}
                          </p>

                          {/* Destaque Financeiro em Linguagem Humana */}
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
                                        +R$ {diferencaExcedente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} acima da estimativa
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
                            <div className="bg-slate-50 border rounded-xl p-3.5 mb-4 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="font-semibold text-slate-800">Valor Estimado Previsto: </span>
                                {valorEstimadoTeto > 0 ? (
                                  <strong className="text-sm font-black text-slate-900">R$ {valorEstimadoTeto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                ) : (
                                  <span className="text-slate-500 italic">Não informado previamente</span>
                                )}
                              </div>
                              <span className="text-emerald-700 font-semibold">
                                💡 Se compras achar um preço até este valor, aprova automaticamente.
                              </span>
                            </div>
                          )}

                          {/* Justificativa da Compra */}
                          {req.justificativa && (
                            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-700 mb-5 border">
                              <p className="font-bold text-slate-800 mb-1">Motivo do Pedido:</p>
                              <p className="italic">"{req.justificativa}"</p>
                            </div>
                          )}

                          {/* Botões Grandes de Ação Executiva */}
                          <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-600 hover:text-slate-900 text-xs gap-1.5"
                              onClick={() => setSelectedReq(req)}
                            >
                              <FileText className="w-4 h-4 text-slate-500" />
                              Ver Detalhes e Orçamentos ({totalAnexos})
                            </Button>

                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 font-bold px-5 py-2.5 text-sm h-11"
                                disabled={reprovarDiretorMutation.isPending || aprovarDiretorMutation.isPending}
                                onClick={() => {
                                  setModalReprovar(req);
                                  setMotivoReprovacao("");
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-1.5 text-red-600" />
                                Recusar / Devolver
                              </Button>

                              <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-7 py-2.5 text-sm h-11 shadow-md gap-2"
                                disabled={aprovarDiretorMutation.isPending || reprovarDiretorMutation.isPending}
                                onClick={() => {
                                  aprovarDiretorMutation.mutate({
                                    reqId: req.id,
                                    token: req.token_aprovacao
                                  });
                                }}
                              >
                                {aprovarDiretorMutation.isPending ? (
                                  <><Loader2 className="w-4 h-4 animate-spin" /> Autorizando...</>
                                ) : isFase1 ? (
                                  <><CheckCircle className="w-5 h-5" /> AUTORIZAR COTAÇÃO</>
                                ) : (
                                  <><CheckCircle className="w-5 h-5" /> APROVAR COMPRA DEFINITIVA</>
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
            ) : (
              <div className="bg-white rounded-2xl border p-4 shadow-sm">
                <RequisicaoLista
                  lista={[...aprovadas, ...reprovadas]}
                  isLoading={isLoading}
                  onSelect={setSelectedReq}
                  empty="Nenhuma compra concluída encontrada."
                  exibirSolicitante={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Simples de Recusa */}
        <Dialog open={!!modalReprovar} onOpenChange={() => setModalReprovar(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-red-700 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Recusar / Devolver Compra
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-slate-700">
                Você está recusando o item <strong>{modalReprovar?.item}</strong> solicitado por <strong>{modalReprovar?.colaborador_nome}</strong>.
              </p>
              <div>
                <Label className="text-xs font-bold text-slate-700">
                  Motivo ou Orientação para a Equipe <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  rows={3}
                  className="mt-1.5 text-sm"
                  placeholder="Ex: Pesquisar outra marca, verificar se temos no estoque, valor muito alto..."
                  value={motivoReprovacao}
                  onChange={e => setMotivoReprovacao(e.target.value)}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  O colaborador receberá esta justificativa para poder consertar se necessário.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button variant="outline" onClick={() => setModalReprovar(null)}>Cancelar</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                disabled={!motivoReprovacao.trim() || reprovarDiretorMutation.isPending}
                onClick={() => {
                  if (!modalReprovar || !motivoReprovacao.trim()) return;
                  reprovarDiretorMutation.mutate({
                    reqId: modalReprovar.id,
                    token: modalReprovar.token_aprovacao,
                    motivo: motivoReprovacao.trim()
                  });
                }}
              >
                {reprovarDiretorMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Recusa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Detalhes da Requisição */}
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
                  queryClient.invalidateQueries({ queryKey: ['portal_requisicoes'] });
                  setSelectedReq(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </PortalLayout>
    );
  }

  // FLUXO NORMAL PARA COLABORADORES COMUNS:
  return (
    <PortalLayout colaborador={colaborador} onLogout={logout} permissoesComunicados={colaborador.permissoes_comunicados || []}>
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Requisições de Compra</h1>
                <p className="text-muted-foreground mt-1">Solicite, acompanhe e gerencie as requisições da empresa</p>
              </div>
            </div>
            <Button onClick={() => setView("nova")} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" />
              Nova Requisição
            </Button>
          </div>

          {/* Indicadores pessoais */}
          <IndicadoresRequisicao
            requisicoes={minhasRequisicoes}
            pendentesAprovador={isAprovador ? requisicoesPendentesAprovador : []}
            isAprovador={isAprovador}
            todasRequisicoes={isAprovador ? requisicoes.filter(r => r.aprovador_id === colaboradorFull?.id) : []}
          />

          {/* Aviso para aprovador */}
          {isAprovador && requisicoesPendentesAprovador.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Você tem {requisicoesPendentesAprovador.length} requisição(ões) aguardando sua aprovação</p>
                <p className="text-sm text-amber-700">Acesse a aba "Aprovador" abaixo para analisar.</p>
              </div>
            </div>
          )}

          {/* Aviso / Acesso Rápido para Diretor */}
          {isDiretor && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 text-white rounded-lg flex items-center justify-center shrink-0 shadow">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-purple-950 text-base">Painel Executivo da Diretoria</p>
                  <p className="text-xs text-purple-800">
                    {requisicoesPendentesDiretor.length > 0
                      ? `Você tem ${requisicoesPendentesDiretor.length} compra(s) aguardando sua autorização.`
                      : "Todas as requisições da Diretoria estão em dia."}
                  </p>
                </div>
              </div>
              <a
                href="/painel-diretor"
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow flex items-center gap-1.5 transition shrink-0"
              >
                Abrir Modo Simples da Diretoria <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Aviso para comprador */}
          {isComprador && requisicoesPendentesCotacao.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-blue-900">Há {requisicoesPendentesCotacao.length} requisição(ões) liberada(s) para cotação</p>
                <p className="text-sm text-blue-700">Acesse a aba "Cotações Pendentes" para cadastrar os orçamentos.</p>
              </div>
            </div>
          )}

          <Tabs defaultValue={isDiretor && requisicoesPendentesDiretor.length > 0 ? "diretoria" : (isAprovador && requisicoesPendentesAprovador.length > 0 ? "aprovador" : "minhas")}>
            <div className="overflow-x-auto mb-4">
              <TabsList className="flex w-max min-w-full gap-1 p-1 bg-muted rounded-lg">
                <TabsTrigger value="minhas" className="text-xs px-3 py-1.5">Minhas ({minhasRequisicoes.length})</TabsTrigger>
                <TabsTrigger value="pendentes" className="text-xs px-3 py-1.5">Em Andamento ({pendentes.length})</TabsTrigger>
                <TabsTrigger value="historico" className="text-xs px-3 py-1.5">Histórico ({aprovadas.length + reprovadas.length})</TabsTrigger>
                {isDiretor && (
                  <TabsTrigger value="diretoria" className="text-xs px-3 py-1.5 relative flex items-center gap-1 font-semibold text-blue-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />Aprovações da Diretoria
                    {requisicoesPendentesDiretor.length > 0 && (
                      <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 animate-pulse">{requisicoesPendentesDiretor.length}</span>
                    )}
                  </TabsTrigger>
                )}
                {isAprovador && (
                  <TabsTrigger value="aprovador" className="text-xs px-3 py-1.5 relative flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />Painel Aprovador
                    {requisicoesPendentesAprovador.length > 0 && (
                      <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{requisicoesPendentesAprovador.length}</span>
                    )}
                  </TabsTrigger>
                )}
                {isComprador && (
                  <TabsTrigger value="cotacoes" className="text-xs px-3 py-1.5 relative flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />Cotações Pendentes
                    {requisicoesPendentesCotacao.length > 0 && (
                      <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{requisicoesPendentesCotacao.length}</span>
                    )}
                  </TabsTrigger>
                )}
                {isComprador && (
                  <TabsTrigger value="todas_comprador" className="text-xs px-3 py-1.5 relative flex items-center gap-1 font-semibold text-emerald-700">
                    <ShoppingCart className="w-3.5 h-3.5" />Todas as Requisições ({requisicoes.length})
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="minhas">
              <RequisicaoLista lista={minhasRequisicoes} isLoading={isLoading} onSelect={setSelectedReq} empty="Você ainda não abriu requisições." />
            </TabsContent>
            <TabsContent value="pendentes">
              <RequisicaoLista lista={pendentes} isLoading={isLoading} onSelect={setSelectedReq} empty="Nenhuma requisição em andamento." />
            </TabsContent>
            <TabsContent value="historico">
              <RequisicaoLista lista={[...aprovadas, ...reprovadas]} isLoading={isLoading} onSelect={setSelectedReq} empty="Nenhuma requisição concluída." />
            </TabsContent>
            {isDiretor && (
              <TabsContent value="diretoria">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">Painel de Decisões da Diretoria</h3>
                      <p className="text-xs text-slate-500">Requisições que aguardam sua 1ª aprovação (liberação para cotação) ou aprovação final (valores cotados).</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">{requisicoesPendentesDiretor.length} pendente(s)</Badge>
                  </div>
                  <RequisicaoLista
                    lista={requisicoesPendentesDiretor}
                    isLoading={isLoading}
                    onSelect={setSelectedReq}
                    empty="Nenhuma requisição aguardando decisão da Diretoria no momento."
                    exibirSolicitante={true}
                  />
                </div>
              </TabsContent>
            )}
            {isAprovador && (
              <TabsContent value="aprovador">
                <PainelAprovador colaboradorFull={colaboradorFull} />
              </TabsContent>
            )}
            {isComprador && (
              <TabsContent value="cotacoes">
                <RequisicaoLista
                  lista={requisicoesPendentesCotacao}
                  isLoading={isLoading}
                  onSelect={setSelectedReq}
                  empty="Nenhuma requisição aguardando cotação no momento."
                />
              </TabsContent>
            )}
            {isComprador && (
              <TabsContent value="todas_comprador">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-lg border">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por item, número, solicitante, área..."
                        className="pl-9 text-sm"
                        value={buscaComprador}
                        onChange={e => setBuscaComprador(e.target.value)}
                      />
                    </div>
                    <div className="w-full sm:w-64">
                      <Select value={filtroStatusComprador} onValueChange={setFiltroStatusComprador}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Filtrar por Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os Status</SelectItem>
                          <SelectItem value="Aguardando Aprovador">Aguardando Aprovador</SelectItem>
                          <SelectItem value="Aguardando Diretor">Aguardando Diretor</SelectItem>
                          <SelectItem value="Aguardando Cotação">Aguardando Cotação</SelectItem>
                          <SelectItem value="Aguardando Aprovação Final">Aguardando Aprovação Final</SelectItem>
                          <SelectItem value="Aprovada">Aprovada</SelectItem>
                          <SelectItem value="Reprovada pelo Aprovador">Reprovada pelo Aprovador</SelectItem>
                          <SelectItem value="Reprovada pelo Diretor">Reprovada pelo Diretor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <RequisicaoLista
                    lista={requisicoesCompradorFiltradas}
                    isLoading={isLoading}
                    onSelect={setSelectedReq}
                    empty="Nenhuma requisição encontrada com os filtros selecionados."
                    exibirSolicitante={true}
                  />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Requisição {selectedReq?.numero_requisicao}</DialogTitle>
          </DialogHeader>
          {selectedReq && (
            <RequisicaoDetalhes
              requisicao={selectedReq}
              colaboradorAtual={colaboradorFull}
              isAdmin={isDiretor}
              onAcao={() => {
                queryClient.invalidateQueries({ queryKey: ['portal_requisicoes'] });
                queryClient.invalidateQueries({ queryKey: ['painel_aprovador_reqs'] });
                setSelectedReq(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}

function RequisicaoLista({ lista, isLoading, onSelect, empty, exibirSolicitante = false }) {
  if (isLoading) return <p className="text-center py-8 text-muted-foreground">Carregando...</p>;
  if (!lista.length) return <p className="text-center py-8 text-muted-foreground">{empty}</p>;

  return (
    <div className="space-y-2">
      {lista.map(r => (
        <div key={r.id} className="flex items-center justify-between p-4 bg-card border rounded-lg hover:shadow-sm cursor-pointer transition-all" onClick={() => onSelect(r)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">{r.numero_requisicao}</span>
              <Badge className={`${statusColors[r.status] || "bg-gray-100 text-gray-800"} flex items-center gap-1`}>
                {statusIcon[r.status]} {r.status}
              </Badge>
              <Badge variant="outline" className="text-xs">{r.urgencia}</Badge>
            </div>
            <p className="font-medium text-foreground truncate">{r.item}</p>
            <p className="text-xs text-muted-foreground">
              {exibirSolicitante ? `${r.colaborador_nome} (${r.colaborador_area}) · ` : ""}
              Qtd: {r.quantidade} {r.unidade_medida || 'un'}
              {r.data_necessidade ? ` · Necessidade: ${new Date(r.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}` : ""}
              {r.material ? ` · Material: ${r.material}` : ""}
              {r.cor ? ` · Cor: ${r.cor}` : ""}
              {r.centro_custo_nome ? ` · CC: ${r.centro_custo_codigo}` : ""}
              {r.cotacao_valor ? ` · Cotação: R$ ${Number(r.cotacao_valor).toLocaleString('pt-BR')}` : (r.valor_minimo && r.valor_maximo ? ` · Est.: R$ ${Number(r.valor_minimo).toLocaleString('pt-BR')} – R$ ${Number(r.valor_maximo).toLocaleString('pt-BR')}` : ' · Valor não informado')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}