import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Users, Clock, CheckCircle, XCircle, ChevronRight, Loader2 } from "lucide-react";

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

export default function ModuloAprovador({ onSelectRequisicao }) {
  const [searchAprovador, setSearchAprovador] = useState("");
  const [aprovadorSelecionado, setAprovadorSelecionado] = useState(null);

  const { data: colaboradores = [], isLoading: loadingColab } = useQuery({
    queryKey: ["todos_colaboradores_aprovadores"],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  const { data: requisicoes = [], isLoading: loadingReq } = useQuery({
    queryKey: ["todas_requisicoes_modulo"],
    queryFn: () => base44.entities.RequisicaoCompras.list("-created_date"),
  });

  // Lista de aprovadores únicos que têm pelo menos um colaborador vinculado
  const aprovadoresMap = {};
  colaboradores.forEach(c => {
    if (c.responsavel_id && c.responsavel_nome) {
      if (!aprovadoresMap[c.responsavel_id]) {
        aprovadoresMap[c.responsavel_id] = {
          id: c.responsavel_id,
          nome: c.responsavel_nome,
          email: c.responsavel_email,
          colaboradores: [],
        };
      }
      aprovadoresMap[c.responsavel_id].colaboradores.push(c);
    }
  });
  const aprovadores = Object.values(aprovadoresMap);

  const aprovadoresFiltrados = aprovadores.filter(a =>
    !searchAprovador || a.nome.toLowerCase().includes(searchAprovador.toLowerCase())
  );

  if (aprovadorSelecionado) {
    const colaboradoresDoAprovador = aprovadorSelecionado.colaboradores;
    const idsColaboradores = new Set(colaboradoresDoAprovador.map(c => c.id));
    const requisicoesDeles = requisicoes.filter(r => idsColaboradores.has(r.colaborador_id) || r.aprovador_id === aprovadorSelecionado.id);
    const pendentes = requisicoesDeles.filter(r => r.status === 'Aguardando Aprovador');

    return (
      <div>
        <button
          onClick={() => setAprovadorSelecionado(null)}
          className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1"
        >
          ← Voltar para lista de aprovadores
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 font-semibold text-sm">
              {aprovadorSelecionado.nome.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-bold text-foreground">{aprovadorSelecionado.nome}</h2>
            <p className="text-xs text-muted-foreground">{aprovadorSelecionado.email}</p>
          </div>
          {pendentes.length > 0 && (
            <Badge className="bg-amber-100 text-amber-800 ml-auto">{pendentes.length} pendente(s)</Badge>
          )}
        </div>

        {/* Colaboradores vinculados */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Colaboradores Vinculados ({colaboradoresDoAprovador.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {colaboradoresDoAprovador.map(c => {
              const reqs = requisicoesDeles.filter(r => r.colaborador_id === c.id);
              const pendentesColab = reqs.filter(r => r.status === 'Aguardando Aprovador').length;
              return (
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div>
                    <p className="font-medium text-sm">{c.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">{c.area} · {c.cargo || c.tipo_funcionario}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{reqs.length} req(s)</p>
                    {pendentesColab > 0 && <Badge className="bg-amber-100 text-amber-800 text-xs">{pendentesColab} pend.</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Requisições desse aprovador */}
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Requisições ({requisicoesDeles.length})
        </h3>
        {loadingReq ? (
          <p className="text-center py-6 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Carregando...</p>
        ) : requisicoesDeles.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground">Nenhuma requisição encontrada.</p>
        ) : (
          <div className="space-y-2">
            {requisicoesDeles.map(r => (
              <div
                key={r.id}
                className="flex items-center justify-between p-4 bg-card border rounded-lg hover:shadow-sm cursor-pointer transition-all hover:border-blue-300"
                onClick={() => onSelectRequisicao(r)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">{r.numero_requisicao}</span>
                    <Badge className={`${statusColors[r.status]} flex items-center gap-1 text-xs`}>
                      {statusIcon[r.status]} {r.status}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm truncate">{r.item}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.colaborador_nome} · {r.colaborador_area}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar aprovador..."
            value={searchAprovador}
            onChange={e => setSearchAprovador(e.target.value)}
          />
        </div>
      </div>

      {loadingColab ? (
        <p className="text-center py-10 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Carregando...</p>
      ) : aprovadoresFiltrados.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">Nenhum aprovador encontrado. Configure o campo "Responsável" nos colaboradores.</p>
      ) : (
        <div className="space-y-3">
          {aprovadoresFiltrados.map(aprov => {
            const reqs = requisicoes.filter(r => r.aprovador_id === aprov.id);
            const pendentes = reqs.filter(r => r.status === 'Aguardando Aprovador').length;
            return (
              <Card
                key={aprov.id}
                className="cursor-pointer hover:shadow-md transition-all hover:border-blue-300"
                onClick={() => setAprovadorSelecionado(aprov)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-blue-700 font-semibold text-sm">
                        {aprov.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{aprov.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {aprov.colaboradores.length} colaborador(es) vinculado(s) · {reqs.length} requisição(ões)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendentes > 0 && (
                      <Badge className="bg-amber-100 text-amber-800">{pendentes} pendente(s)</Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}