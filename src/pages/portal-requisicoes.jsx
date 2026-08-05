import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Plus, Loader2, CheckCircle, Clock, XCircle, ChevronLeft, UserCheck, ShoppingBag } from "lucide-react";
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

  const { data: requisicoes = [], isLoading } = useQuery({
    queryKey: ['portal_requisicoes', colaborador?.id],
    queryFn: () => base44.entities.RequisicaoCompras.list('-created_date'),
    enabled: !!colaborador,
  });

  const { data: todosColaboradores = [] } = useQuery({
    queryKey: ['portal_todos_colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list(),
    enabled: !!colaborador,
  });

  const minhasRequisicoes = requisicoes.filter(r => r.colaborador_id === colaboradorFull?.id);

  // É aprovador se é gestor de alguém, se tem requisições onde é aprovador_id ou se possui cargo/flag de aprovador/gestão
  const isGestorDeAlguem = todosColaboradores.some(c => c.responsavel_id === colaboradorFull?.id);
  const temReqsComoAprovador = requisicoes.some(r => r.aprovador_id === colaboradorFull?.id);

  const isAprovador = isGestorDeAlguem || temReqsComoAprovador || !!(
    colaboradorFull?.is_aprovador ||
    colaboradorFull?.cargo?.toLowerCase().includes('aprovador') ||
    colaboradorFull?.cargo?.toLowerCase().includes('gerente') ||
    colaboradorFull?.cargo?.toLowerCase().includes('coordenador') ||
    colaboradorFull?.cargo?.toLowerCase().includes('diretor') ||
    colaboradorFull?.cargo?.toLowerCase().includes('supervisor')
  );

  // isComprador: lê do campo eh_comprador do colaborador ou área/cargo de compras
  const isComprador = !!(colaboradorFull?.eh_comprador || colaboradorFull?.area?.toLowerCase().includes('compras'));

  // Requisições pendentes de aprovação atribuídas a este usuário
  const requisicoesPendentesAprovador = requisicoes.filter(r =>
    r.aprovador_id === colaboradorFull?.id && r.status === 'Aguardando Aprovador'
  );

  // Se colaborador é comprador, mostra as liberadas para cotação
  const requisicoesPendentesCotacao = isComprador
    ? requisicoes.filter(r => r.status === 'Aguardando Cotação')
    : [];

  const pendentes = minhasRequisicoes.filter(r =>
    ['Aguardando Aprovador', 'Aguardando Diretor', 'Aguardando Cotação', 'Aguardando Aprovação Final'].includes(r.status)
  );
  const aprovadas = minhasRequisicoes.filter(r => r.status === 'Aprovada');
  const reprovadas = minhasRequisicoes.filter(r => r.status?.startsWith('Reprovada'));

  const numTabs = 3 + (isAprovador ? 1 : 0) + (isComprador ? 1 : 0);
  const gridColsClass = numTabs === 5 ? "grid-cols-5" : numTabs === 4 ? "grid-cols-4" : "grid-cols-3";

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
                setView("lista");
              }}
              onCancel={() => setView("lista")}
            />
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout} permissoesComunicados={colaborador.permissoes_comunicados || []}>
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Requisições de Compra</h1>
                <p className="text-muted-foreground mt-1">Solicite e acompanhe suas requisições</p>
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

          <Tabs defaultValue="minhas">
            <TabsList className={`grid w-full mb-4 ${gridColsClass}`}>
              <TabsTrigger value="minhas" className="text-xs">Minhas ({minhasRequisicoes.length})</TabsTrigger>
              <TabsTrigger value="pendentes" className="text-xs">Em Andamento ({pendentes.length})</TabsTrigger>
              <TabsTrigger value="historico" className="text-xs">Histórico ({aprovadas.length + reprovadas.length})</TabsTrigger>
              {isAprovador && (
                <TabsTrigger value="aprovador" className="text-xs relative flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />Aprovador
                  {requisicoesPendentesAprovador.length > 0 && (
                    <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{requisicoesPendentesAprovador.length}</span>
                  )}
                </TabsTrigger>
              )}
              {isComprador && (
                <TabsTrigger value="cotacoes" className="text-xs relative flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" />Cotações
                  {requisicoesPendentesCotacao.length > 0 && (
                    <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{requisicoesPendentesCotacao.length}</span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="minhas">
              <RequisicaoLista lista={minhasRequisicoes} isLoading={isLoading} onSelect={setSelectedReq} empty="Você ainda não abriu requisições." />
            </TabsContent>
            <TabsContent value="pendentes">
              <RequisicaoLista lista={pendentes} isLoading={isLoading} onSelect={setSelectedReq} empty="Nenhuma requisição em andamento." />
            </TabsContent>
            <TabsContent value="historico">
              <RequisicaoLista lista={[...aprovadas, ...reprovadas]} isLoading={isLoading} onSelect={setSelectedReq} empty="Nenhuma requisição concluída." />
            </TabsContent>
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
              isAdmin={false}
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

function RequisicaoLista({ lista, isLoading, onSelect, empty }) {
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
              Qtd: {r.quantidade}
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