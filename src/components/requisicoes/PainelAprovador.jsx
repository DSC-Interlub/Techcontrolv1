import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, CheckCircle, XCircle, Users, ChevronRight, Loader2 } from "lucide-react";
import RequisicaoDetalhes from "./RequisicaoDetalhes";

const statusColors = {
  "Aguardando Aprovador": "bg-yellow-100 text-yellow-800",
  "Aguardando Diretor": "bg-blue-100 text-blue-800",
  "Aprovada": "bg-green-100 text-green-800",
  "Reprovada pelo Aprovador": "bg-red-100 text-red-800",
  "Reprovada pelo Diretor": "bg-red-100 text-red-800",
};

const statusIcon = {
  "Aguardando Aprovador": <Clock className="w-3 h-3" />,
  "Aguardando Diretor": <Clock className="w-3 h-3" />,
  "Aprovada": <CheckCircle className="w-3 h-3" />,
  "Reprovada pelo Aprovador": <XCircle className="w-3 h-3" />,
  "Reprovada pelo Diretor": <XCircle className="w-3 h-3" />,
};

export default function PainelAprovador({ colaboradorFull }) {
  const queryClient = useQueryClient();
  const [selectedReq, setSelectedReq] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("pendentes"); // "pendentes" | "historico" | "colaboradores"

  const { data: requisicoes = [], isLoading: loadingReqs } = useQuery({
    queryKey: ["painel_aprovador_reqs", colaboradorFull?.id],
    queryFn: () => base44.entities.RequisicaoCompras.list("-created_date"),
    enabled: !!colaboradorFull?.id,
  });

  const { data: colaboradores = [], isLoading: loadingColab } = useQuery({
    queryKey: ["painel_aprovador_colab", colaboradorFull?.id],
    queryFn: () => base44.entities.Colaboradores.filter({ responsavel_id: colaboradorFull.id }),
    enabled: !!colaboradorFull?.id,
  });

  const minhasReqs = requisicoes.filter(r => r.aprovador_id === colaboradorFull?.id);
  const pendentes = minhasReqs.filter(r => r.status === "Aguardando Aprovador");
  const historico = minhasReqs.filter(r => r.status !== "Aguardando Aprovador");
  const aprovadas = minhasReqs.filter(r => r.status === "Aprovada");
  const reprovadas = minhasReqs.filter(r => r.status?.startsWith("Reprovada"));

  return (
    <div>
      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className={pendentes.length > 0 ? "border-amber-300 bg-amber-50" : ""}>
          <CardContent className="pt-4 pb-4 text-center">
            <Clock className={`w-5 h-5 mx-auto mb-1 ${pendentes.length > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
            <p className={`text-2xl font-bold ${pendentes.length > 0 ? "text-amber-700" : "text-foreground"}`}>{pendentes.length}</p>
            <p className="text-xs text-muted-foreground">Aguardando</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{aprovadas.length}</p>
            <p className="text-xs text-muted-foreground">Aprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <XCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold text-red-600">{reprovadas.length}</p>
            <p className="text-xs text-muted-foreground">Reprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold text-blue-700">{colaboradores.length}</p>
            <p className="text-xs text-muted-foreground">Colaboradores</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-abas */}
      <div className="flex gap-1 border-b mb-4">
        {[
          { key: "pendentes", label: `Aguardando (${pendentes.length})` },
          { key: "historico", label: `Histórico (${historico.length})` },
          { key: "colaboradores", label: `Colaboradores (${colaboradores.length})` },
        ].map(aba => (
          <button
            key={aba.key}
            onClick={() => setAbaAtiva(aba.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === aba.key
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {aba.label}
            {aba.key === "pendentes" && pendentes.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendentes.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      {abaAtiva === "pendentes" && (
        <div>
          {loadingReqs ? (
            <p className="text-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Carregando...</p>
          ) : pendentes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhuma requisição aguardando sua aprovação.</p>
          ) : (
            <div className="space-y-2">
              {pendentes.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:shadow-sm transition-all"
                  onClick={() => setSelectedReq(r)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{r.numero_requisicao}</span>
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">Aguardando sua aprovação</Badge>
                      <Badge variant="outline" className="text-xs">{r.urgencia}</Badge>
                    </div>
                    <p className="font-medium truncate">{r.item}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.colaborador_nome} · {r.colaborador_area} · Qtd: {r.quantidade}
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
          ) : historico.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhuma requisição no histórico.</p>
          ) : (
            <div className="space-y-2">
              {historico.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 bg-card border rounded-lg cursor-pointer hover:shadow-sm transition-all"
                  onClick={() => setSelectedReq(r)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{r.numero_requisicao}</span>
                      <Badge className={`${statusColors[r.status]} flex items-center gap-1 text-xs`}>
                        {statusIcon[r.status]} {r.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{r.urgencia}</Badge>
                    </div>
                    <p className="font-medium truncate">{r.item}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.colaborador_nome} · {r.colaborador_area} · {new Date(r.created_date).toLocaleDateString('pt-BR')}
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
            <p className="text-center py-8 text-muted-foreground">Nenhum colaborador vinculado a você como aprovador.</p>
          ) : (
            <div className="space-y-2">
              {colaboradores.map(c => {
                const reqs = minhasReqs.filter(r => r.colaborador_id === c.id);
                const pendColab = reqs.filter(r => r.status === "Aguardando Aprovador").length;
                return (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-card border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-blue-700 font-semibold text-sm">{c.nome_completo?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{c.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{c.area}{c.cargo ? ` · ${c.cargo}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{reqs.length} req(s)</p>
                      {pendColab > 0 && <Badge className="bg-amber-100 text-amber-800 text-xs mt-1">{pendColab} pend.</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dialog detalhes */}
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