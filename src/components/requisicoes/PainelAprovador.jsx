import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, Users, ChevronRight, Loader2, ShoppingBag, ArrowRight } from "lucide-react";
import RequisicaoDetalhes from "./RequisicaoDetalhes";

const statusColors = {
  "Aguardando Aprovador": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Aguardando Diretor": "bg-blue-100 text-blue-800 border-blue-300",
  "Aguardando Cotação": "bg-amber-100 text-amber-800 border-amber-300",
  "Aguardando Aprovação Final": "bg-purple-100 text-purple-800 border-purple-300",
  "Aprovada": "bg-green-100 text-green-800 border-green-300",
  "Reprovada pelo Aprovador": "bg-red-100 text-red-800 border-red-300",
  "Reprovada pelo Diretor": "bg-red-100 text-red-800 border-red-300",
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

export default function PainelAprovador({ colaboradorFull }) {
  const queryClient = useQueryClient();
  const [selectedReq, setSelectedReq] = useState(null);
  const [selectedColabModal, setSelectedColabModal] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("pendentes"); // "pendentes" | "emandamento" | "historico" | "colaboradores"

  // Busca requisições com atualização em tempo real (polling a cada 3s)
  const { data: requisicoes = [], isLoading: loadingReqs } = useQuery({
    queryKey: ["painel_aprovador_reqs", colaboradorFull?.id],
    queryFn: () => base44.entities.RequisicaoCompras.list("-created_date"),
    enabled: !!colaboradorFull?.id,
    refetchInterval: 3000,
    staleTime: 0,
  });

  // Busca colaboradores vinculados como responsável
  const { data: colaboradores = [], isLoading: loadingColab } = useQuery({
    queryKey: ["painel_aprovador_colab", colaboradorFull?.id],
    queryFn: () => base44.entities.Colaboradores.filter({ responsavel_id: colaboradorFull.id }),
    enabled: !!colaboradorFull?.id,
    refetchInterval: 5000,
  });

  const minhasReqs = requisicoes.filter(r => r.aprovador_id === colaboradorFull?.id);
  const pendentesAprovacao = minhasReqs.filter(r => r.status === "Aguardando Aprovador");
  const emAndamento = minhasReqs.filter(r =>
    ["Aguardando Diretor", "Aguardando Cotação", "Aguardando Aprovação Final"].includes(r.status)
  );
  const aprovadas = minhasReqs.filter(r => r.status === "Aprovada");
  const reprovadas = minhasReqs.filter(r => r.status?.startsWith("Reprovada"));
  const historicoConcluidas = [...aprovadas, ...reprovadas];

  // Requisições do colaborador selecionado no modal
  const reqsColabSelecionado = selectedColabModal
    ? requisicoes.filter(r => r.colaborador_id === selectedColabModal.id)
    : [];

  return (
    <div>
      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className={pendentesAprovacao.length > 0 ? "border-amber-300 bg-amber-50" : ""}>
          <CardContent className="pt-4 pb-4 text-center">
            <Clock className={`w-5 h-5 mx-auto mb-1 ${pendentesAprovacao.length > 0 ? "text-amber-600 animate-pulse" : "text-muted-foreground"}`} />
            <p className={`text-2xl font-bold ${pendentesAprovacao.length > 0 ? "text-amber-700" : "text-foreground"}`}>{pendentesAprovacao.length}</p>
            <p className="text-xs font-medium text-muted-foreground">Aguardando Aprovação</p>
          </CardContent>
        </Card>
        <Card className={emAndamento.length > 0 ? "border-blue-300 bg-blue-50" : ""}>
          <CardContent className="pt-4 pb-4 text-center">
            <ShoppingBag className={`w-5 h-5 mx-auto mb-1 ${emAndamento.length > 0 ? "text-blue-600" : "text-muted-foreground"}`} />
            <p className={`text-2xl font-bold ${emAndamento.length > 0 ? "text-blue-700" : "text-foreground"}`}>{emAndamento.length}</p>
            <p className="text-xs font-medium text-muted-foreground">Em Andamento (Diretor/Cotação)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{aprovadas.length}</p>
            <p className="text-xs font-medium text-muted-foreground">Aprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-purple-600" />
            <p className="text-2xl font-bold text-purple-700">{colaboradores.length}</p>
            <p className="text-xs font-medium text-muted-foreground">Meus Colaboradores</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-abas */}
      <div className="flex flex-wrap gap-1 border-b mb-4">
        {[
          { key: "pendentes", label: `Aguardando Aprovação (${pendentesAprovacao.length})` },
          { key: "emandamento", label: `Em Andamento (${emAndamento.length})` },
          { key: "historico", label: `Concluídas / Histórico (${historicoConcluidas.length})` },
          { key: "colaboradores", label: `Meus Colaboradores (${colaboradores.length})` },
        ].map(aba => (
          <button
            key={aba.key}
            onClick={() => setAbaAtiva(aba.key)}
            className={`px-4 py-2 text-xs md:text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === aba.key
                ? "border-emerald-600 text-emerald-700 font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {aba.label}
            {aba.key === "pendentes" && pendentesAprovacao.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendentesAprovacao.length}</span>
            )}
            {aba.key === "emandamento" && emAndamento.length > 0 && (
              <span className="ml-1.5 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{emAndamento.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      {abaAtiva === "pendentes" && (
        <div>
          {loadingReqs ? (
            <p className="text-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Carregando...</p>
          ) : pendentesAprovacao.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 border rounded-lg p-6">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">Tudo em dia!</p>
              <p className="text-xs text-slate-500 mt-1">Você não possui requisições pendentes da sua aprovação no momento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendentesAprovacao.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:shadow-md transition-all"
                  onClick={() => setSelectedReq(r)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{r.numero_requisicao}</span>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-semibold">Aguardando sua aprovação</Badge>
                      <Badge variant="outline" className="text-xs">{r.urgencia}</Badge>
                    </div>
                    <p className="font-medium text-foreground truncate">{r.item}</p>
                    <p className="text-xs text-muted-foreground">
                      Solicitante: <strong>{r.colaborador_nome}</strong> ({r.colaborador_area}) · Qtd: {r.quantidade}
                      {r.material ? ` · Mat: ${r.material}` : ""}
                      {r.cor ? ` · Cor: ${r.cor}` : ""}
                    </p>
                  </div>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1 text-xs ml-3 shrink-0">
                    Analisar <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {abaAtiva === "emandamento" && (
        <div>
          {loadingReqs ? (
            <p className="text-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Carregando...</p>
          ) : emAndamento.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 border rounded-lg p-6">
              <p className="font-semibold text-slate-800">Nenhuma requisição em andamento nas etapas seguintes.</p>
              <p className="text-xs text-slate-500 mt-1">As requisições aprovadas por você que estão com a Diretoria ou em Cotação aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {emAndamento.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 bg-card border rounded-lg cursor-pointer hover:shadow-sm transition-all"
                  onClick={() => setSelectedReq(r)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{r.numero_requisicao}</span>
                      <Badge className={`${statusColors[r.status] || "bg-blue-100 text-blue-800"} flex items-center gap-1 text-xs`}>
                        {statusIcon[r.status]} {r.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{r.urgencia}</Badge>
                    </div>
                    <p className="font-medium text-foreground truncate">{r.item}</p>
                    <p className="text-xs text-muted-foreground">
                      Solicitante: <strong>{r.colaborador_nome}</strong> ({r.colaborador_area}) · Qtd: {r.quantidade}
                      {r.cotacao_valor ? ` · Cotação: R$ ${Number(r.cotacao_valor).toLocaleString('pt-BR')}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {abaAtiva === "historico" && (
        <div>
          {loadingReqs ? (
            <p className="text-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Carregando...</p>
          ) : historicoConcluidas.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhuma requisição concluída ou reprovada até o momento.</p>
          ) : (
            <div className="space-y-2">
              {historicoConcluidas.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 bg-card border rounded-lg cursor-pointer hover:shadow-sm transition-all"
                  onClick={() => setSelectedReq(r)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{r.numero_requisicao}</span>
                      <Badge className={`${statusColors[r.status] || "bg-gray-100 text-gray-800"} flex items-center gap-1 text-xs`}>
                        {statusIcon[r.status]} {r.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{r.urgencia}</Badge>
                    </div>
                    <p className="font-medium truncate">{r.item}</p>
                    <p className="text-xs text-muted-foreground">
                      Solicitante: <strong>{r.colaborador_nome}</strong> ({r.colaborador_area}) · {new Date(r.created_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {abaAtiva === "colaboradores" && (
        <div>
          {loadingColab ? (
            <p className="text-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Carregando...</p>
          ) : colaboradores.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum colaborador vinculado a você como aprovador no momento.</p>
          ) : (
            <div className="space-y-2">
              {colaboradores.map(c => {
                const reqs = requisicoes.filter(r => r.colaborador_id === c.id);
                const pendColab = reqs.filter(r => r.status === "Aguardando Aprovador").length;
                const emAndColab = reqs.filter(r => ["Aguardando Diretor", "Aguardando Cotação", "Aguardando Aprovação Final"].includes(r.status)).length;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-4 bg-card border rounded-lg hover:border-emerald-500 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => setSelectedColabModal(c)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-emerald-700 font-semibold text-sm">{c.nome_completo?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{c.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{c.area}{c.cargo ? ` · ${c.cargo}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right flex flex-col items-end gap-0.5">
                        <p className="text-xs font-semibold text-foreground">{reqs.length} requisição(ões)</p>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {pendColab > 0 && <Badge className="bg-amber-100 text-amber-800 text-[10px] py-0">{pendColab} aguardando você</Badge>}
                          {emAndColab > 0 && <Badge className="bg-blue-100 text-blue-800 text-[10px] py-0">{emAndColab} em andamento</Badge>}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Requisições do Colaborador Selecionado */}
      <Dialog open={!!selectedColabModal} onOpenChange={() => setSelectedColabModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Requisições de {selectedColabModal?.nome_completo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-slate-50 p-3 rounded-lg border flex justify-between items-center text-xs">
              <div>
                <p className="font-semibold text-slate-800">{selectedColabModal?.area}</p>
                <p className="text-slate-500">{selectedColabModal?.email}</p>
              </div>
              <Badge variant="outline">{reqsColabSelecionado.length} requisição(ões) no total</Badge>
            </div>

            {reqsColabSelecionado.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">Este colaborador não possui requisições de compra cadastradas.</p>
            ) : (
              <div className="space-y-2">
                {reqsColabSelecionado.map(r => (
                  <div
                    key={r.id}
                    className="p-3 border rounded-lg bg-card hover:bg-slate-50 cursor-pointer transition-all flex items-center justify-between"
                    onClick={() => setSelectedReq(r)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{r.numero_requisicao}</span>
                        <Badge className={`${statusColors[r.status] || "bg-gray-100 text-gray-800"} text-xs flex items-center gap-1`}>
                          {statusIcon[r.status]} {r.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm truncate">{r.item}</p>
                      <p className="text-xs text-muted-foreground">
                        Qtd: {r.quantidade}
                        {r.material ? ` · Material: ${r.material}` : ""}
                        {r.cor ? ` · Cor: ${r.cor}` : ""}
                        {r.cotacao_valor ? ` · Cotação: R$ ${Number(r.cotacao_valor).toLocaleString('pt-BR')}` : ""}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      Ver <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog detalhes da requisição */}
      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Requisição {selectedReq?.numero_requisicao}</DialogTitle>
          </DialogHeader>
          {selectedReq && (
            <RequisicaoDetalhes
              requisicao={selectedReq}
              colaboradorAtual={colaboradorFull}
              onAcao={() => {
                queryClient.invalidateQueries({ queryKey: ["painel_aprovador_reqs"] });
                queryClient.invalidateQueries({ queryKey: ["portal_requisicoes"] });
                setSelectedReq(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}