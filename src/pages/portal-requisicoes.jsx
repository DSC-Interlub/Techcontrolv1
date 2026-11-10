import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  ShieldCheck,
  Paperclip,
  AlertTriangle
} from "lucide-react";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";
import NovaRequisicaoForm from "../components/requisicoes/NovaRequisicaoForm";
import RequisicaoDetalhes from "../components/requisicoes/RequisicaoDetalhes";
import IndicadoresRequisicao from "../components/requisicoes/IndicadoresRequisicao";
import PainelAprovador from "../components/requisicoes/PainelAprovador";

const statusColors = {
  "Aguardando Aprovador": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Aguardando Diretor": "bg-blue-100 text-blue-800 border-blue-200",
  "Aguardando Cotação": "bg-amber-100 text-amber-800 border-amber-300",
  "Aguardando Aprovação Final": "bg-purple-100 text-purple-800 border-purple-300",
  "Aprovada": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Reprovada pelo Aprovador": "bg-red-100 text-red-800 border-red-200",
  "Reprovada pelo Diretor": "bg-red-100 text-red-800 border-red-200",
};

const statusIcon = {
  "Aguardando Aprovador": <Clock className="w-3.5 h-3.5 text-yellow-700" />,
  "Aguardando Diretor": <Clock className="w-3.5 h-3.5 text-blue-700" />,
  "Aguardando Cotação": <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />,
  "Aguardando Aprovação Final": <Clock className="w-3.5 h-3.5 text-purple-700" />,
  "Aprovada": <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />,
  "Reprovada pelo Aprovador": <XCircle className="w-3.5 h-3.5 text-red-700" />,
  "Reprovada pelo Diretor": <XCircle className="w-3.5 h-3.5 text-red-700" />,
};

export default function PortalRequisicoes() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState("lista"); // "lista" | "nova"
  const [selectedReq, setSelectedReq] = useState(null);

  // Filtros de busca no histórico e visão do comprador
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [buscaComprador, setBuscaComprador] = useState("");
  const [filtroStatusComprador, setFiltroStatusComprador] = useState("todos");

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

  // Identificação do perfil Diretor
  const isDiretor = !!(
    colaboradorFull?.email?.toLowerCase() === 'vtorres@interlub.com' ||
    colaboradorFull?.area?.toLowerCase() === 'diretoria' ||
    colaboradorFull?.cargo?.toLowerCase().includes('diretor')
  );

  // Gestor comum (quando não for o diretor)
  const isGestorDeAlguem = todosColaboradores.some(c => c.responsavel_id === colaboradorFull?.id);
  const temReqsComoAprovador = requisicoes.some(r => r.aprovador_id === colaboradorFull?.id);

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

  // Junta minhas requisições + sob responsabilidade como aprovador + aprovações de diretoria
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

  // Lista do Histórico filtrada por busca
  const listaHistoricoFiltrada = [...aprovadas, ...reprovadas].filter(r => {
    if (!buscaHistorico.trim()) return true;
    const q = buscaHistorico.toLowerCase();
    return (
      r.item?.toLowerCase().includes(q) ||
      r.numero_requisicao?.toLowerCase().includes(q) ||
      r.colaborador_nome?.toLowerCase().includes(q) ||
      r.colaborador_area?.toLowerCase().includes(q) ||
      r.cotacao_fornecedor?.toLowerCase().includes(q)
    );
  });

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

  // Aba padrão inicial inteligente
  const tabPadrao = isDiretor && requisicoesPendentesDiretor.length > 0
    ? "diretoria"
    : (isAprovador && !isDiretor && requisicoesPendentesAprovador.length > 0)
    ? "aprovador"
    : isDiretor
    ? "diretoria"
    : "minhas";

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout} permissoesComunicados={colaborador.permissoes_comunicados || []}>
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Cabeçalho Corporativo Elegante */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Requisições de Compra</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Solicite, acompanhe o histórico e gerencie as autorizações de compras da empresa
                </p>
              </div>
            </div>
            <Button onClick={() => setView("nova")} className="bg-emerald-600 hover:bg-emerald-700 gap-2 font-medium">
              <Plus className="w-4 h-4" />
              Nova Requisição
            </Button>
          </div>

          {/* Indicadores / KPIs Corporativos */}
          <IndicadoresRequisicao
            requisicoes={minhasRequisicoes}
            pendentesAprovador={isAprovador ? requisicoesPendentesAprovador : []}
            isAprovador={isAprovador}
            todasRequisicoes={isAprovador ? requisicoes.filter(r => r.aprovador_id === colaboradorFull?.id) : []}
          />

          {/* Aviso Corporativo para o Diretor (Sem botões que desviam de tela) */}
          {isDiretor && requisicoesPendentesDiretor.length > 0 && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 mb-5 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-blue-950 text-sm">Painel da Diretoria</p>
                  <p className="text-xs text-blue-800">
                    Você possui <strong>{requisicoesPendentesDiretor.length} compra(s)</strong> aguardando sua decisão na aba abaixo. Clique em qualquer item para ver os detalhes, cotações e autorizar.
                  </p>
                </div>
              </div>
              <Badge className="bg-blue-600 text-white font-mono text-xs px-2.5 py-1">
                {requisicoesPendentesDiretor.length} pendente(s)
              </Badge>
            </div>
          )}

          {/* Aviso para gestor comum (não diretor) */}
          {!isDiretor && isAprovador && requisicoesPendentesAprovador.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Você tem {requisicoesPendentesAprovador.length} requisição(ões) aguardando sua aprovação</p>
                <p className="text-xs text-amber-700">Acesse a aba "Painel Aprovador" para analisar.</p>
              </div>
            </div>
          )}

          {/* Aviso para comprador */}
          {isComprador && requisicoesPendentesCotacao.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 text-sm">Há {requisicoesPendentesCotacao.length} requisição(ões) liberada(s) para cotação</p>
                <p className="text-xs text-blue-700">Acesse a aba "Cotações Pendentes" para cadastrar os orçamentos.</p>
              </div>
            </div>
          )}

          {/* Abas Corporativas do TechControl */}
          <Tabs defaultValue={tabPadrao}>
            <div className="overflow-x-auto mb-4">
              <TabsList className="flex w-max min-w-full gap-1 p-1 bg-muted rounded-lg">
                {/* Se for Diretor, a aba de aprovações da diretoria vem em 1º lugar com badge */}
                {isDiretor && (
                  <TabsTrigger value="diretoria" className="text-xs px-3.5 py-1.5 relative flex items-center gap-1.5 font-semibold text-blue-700 data-[state=active]:bg-white data-[state=active]:text-blue-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Aprovações da Diretoria
                    {requisicoesPendentesDiretor.length > 0 && (
                      <span className="ml-1 bg-blue-600 text-white text-[11px] font-bold rounded-full px-2 py-0.2">
                        {requisicoesPendentesDiretor.length}
                      </span>
                    )}
                  </TabsTrigger>
                )}

                <TabsTrigger value="pendentes" className="text-xs px-3 py-1.5">
                  Em Andamento ({pendentes.length})
                </TabsTrigger>

                <TabsTrigger value="historico" className="text-xs px-3 py-1.5">
                  Histórico ({aprovadas.length + reprovadas.length})
                </TabsTrigger>

                <TabsTrigger value="minhas" className="text-xs px-3 py-1.5">
                  Minhas ({minhasRequisicoes.length})
                </TabsTrigger>

                {/* Exibe "Painel Aprovador" apenas para gestores comuns que não são o diretor */}
                {!isDiretor && isAprovador && (
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

            {/* ABA: MINHAS */}
            <TabsContent value="minhas">
              <RequisicaoLista 
                lista={minhasRequisicoes} 
                isLoading={isLoading} 
                onSelect={setSelectedReq} 
                empty="Você ainda não abriu nenhuma requisição de compra." 
              />
            </TabsContent>

            {/* ABA: EM ANDAMENTO */}
            <TabsContent value="pendentes">
              <RequisicaoLista 
                lista={pendentes} 
                isLoading={isLoading} 
                onSelect={setSelectedReq} 
                empty="Nenhuma requisição em andamento no momento."
                exibirSolicitante={isDiretor || isAprovador || isComprador}
              />
            </TabsContent>

            {/* ABA: HISTÓRICO COM BUSCA */}
            <TabsContent value="historico">
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-card border rounded-lg p-2.5">
                  <Search className="w-4 h-4 text-muted-foreground ml-2" />
                  <Input
                    placeholder="Buscar no histórico por item, código, solicitante ou fornecedor..."
                    className="border-0 shadow-none focus-visible:ring-0 text-xs md:text-sm h-8"
                    value={buscaHistorico}
                    onChange={e => setBuscaHistorico(e.target.value)}
                  />
                  {buscaHistorico && (
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setBuscaHistorico("")}>
                      Limpar
                    </Button>
                  )}
                </div>

                <RequisicaoLista 
                  lista={listaHistoricoFiltrada} 
                  isLoading={isLoading} 
                  onSelect={setSelectedReq} 
                  empty="Nenhuma requisição concluída encontrada no histórico."
                  exibirSolicitante={true}
                />
              </div>
            </TabsContent>

            {/* ABA: APROVAÇÕES DA DIRETORIA */}
            {isDiretor && (
              <TabsContent value="diretoria">
                <div className="space-y-3">
                  <div className="bg-slate-50/80 p-3.5 rounded-lg border flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">Decisões Pendentes da Diretoria</h3>
                      <p className="text-xs text-slate-500">
                        Clique em qualquer requisição para analisar os valores, orçamentos e emitir a sua autorização ou recusa.
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {requisicoesPendentesDiretor.length} aguardando
                    </Badge>
                  </div>

                  <RequisicaoLista
                    lista={requisicoesPendentesDiretor}
                    isLoading={isLoading}
                    onSelect={setSelectedReq}
                    empty="Tudo em dia! Nenhuma requisição aguardando decisão da Diretoria no momento."
                    exibirSolicitante={true}
                  />
                </div>
              </TabsContent>
            )}

            {/* ABA: PAINEL APROVADOR (apenas gestores comuns) */}
            {!isDiretor && isAprovador && (
              <TabsContent value="aprovador">
                <PainelAprovador colaboradorFull={colaboradorFull} />
              </TabsContent>
            )}

            {/* ABA: COTAÇÕES (Comprador) */}
            {isComprador && (
              <TabsContent value="cotacoes">
                <RequisicaoLista
                  lista={requisicoesPendentesCotacao}
                  isLoading={isLoading}
                  onSelect={setSelectedReq}
                  empty="Nenhuma requisição aguardando cotação no momento."
                  exibirSolicitante={true}
                />
              </TabsContent>
            )}

            {/* ABA: TODAS AS REQUISIÇÕES (Comprador) */}
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

      {/* Modal Corporativo Completo de Detalhes da Requisição */}
      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Requisição {selectedReq?.numero_requisicao}</span>
            </DialogTitle>
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

// Componente Corporativo de Lista de Requisições
function RequisicaoLista({ lista, isLoading, onSelect, empty, exibirSolicitante = false }) {
  if (isLoading) return <p className="text-center py-8 text-muted-foreground text-sm">Carregando requisições...</p>;
  if (!lista.length) return <p className="text-center py-8 text-muted-foreground text-sm">{empty}</p>;

  return (
    <div className="space-y-2">
      {lista.map(r => {
        const totalAnexos = ((r.anexos || []).length) + ((r.cotacao_anexos || []).length);
        const reenvio = (r.historico || []).slice().reverse().find(h => h.tipo === 'reenvio_apos_ajuste');

        return (
          <div 
            key={r.id} 
            className="flex items-center justify-between p-4 bg-card border rounded-lg hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all"
            onClick={() => onSelect(r)}
          >
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded font-medium">
                  {r.numero_requisicao}
                </span>

                <Badge className={`${statusColors[r.status] || "bg-gray-100 text-gray-800"} flex items-center gap-1 text-xs border font-medium`}>
                  {statusIcon[r.status]} {r.status}
                </Badge>

                {r.urgencia && (
                  <Badge variant="outline" className="text-[11px] font-normal">
                    {r.urgencia}
                  </Badge>
                )}

                {reenvio && (
                  <Badge variant="outline" className="text-[11px] bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Reenviado
                  </Badge>
                )}

                {totalAnexos > 0 && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded">
                    <Paperclip className="w-3 h-3 text-slate-400" /> {totalAnexos} anexo(s)
                  </span>
                )}
              </div>

              <p className="font-semibold text-foreground text-sm md:text-base truncate">
                {r.item}
              </p>

              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                {exibirSolicitante && (
                  <span>
                    Solicitante: <strong className="text-slate-700">{r.colaborador_nome}</strong> ({r.colaborador_area || 'Geral'})
                  </span>
                )}
                <span>· Qtd: <strong>{r.quantidade} {r.unidade_medida || 'un'}</strong></span>

                {r.data_necessidade && (
                  <span>· Data Limite: {new Date(r.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                )}

                {r.cotacao_valor ? (
                  <span className="text-emerald-700 font-semibold">
                    · Cotado: R$ {Number(r.cotacao_valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    {r.cotacao_fornecedor ? ` (${r.cotacao_fornecedor})` : ''}
                  </span>
                ) : r.valor_maximo ? (
                  <span>
                    · Estimativa: R$ {Number(r.valor_maximo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                ) : r.valor_unitario_maximo ? (
                  <span>
                    · Estimativa Unit.: R$ {Number(r.valor_unitario_maximo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
                Ver detalhes →
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
