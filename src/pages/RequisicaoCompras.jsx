import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Search, Clock, CheckCircle, XCircle, Loader2, Filter, UserCheck } from "lucide-react";
import RequisicaoDetalhes from "@/components/requisicoes/RequisicaoDetalhes";
import ModuloAprovador from "@/components/requisicoes/ModuloAprovador";

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

const urgenciaColors = {
  "Baixa": "bg-gray-100 text-gray-700",
  "Média": "bg-blue-100 text-blue-700",
  "Alta": "bg-orange-100 text-orange-700",
  "Urgente": "bg-red-100 text-red-700",
};

export default function RequisicaoCompras() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroUrgencia, setFiltroUrgencia] = useState("todos");
  const [selectedReq, setSelectedReq] = useState(null);

  const { data: requisicoes = [], isLoading } = useQuery({
    queryKey: ["admin_requisicoes"],
    queryFn: () => base44.entities.RequisicaoCompras.list("-created_date"),
  });

  const pendentes = requisicoes.filter(r => r.status === "Aguardando Aprovador" || r.status === "Aguardando Diretor");
  const aprovadas = requisicoes.filter(r => r.status === "Aprovada");
  const reprovadas = requisicoes.filter(r => r.status?.startsWith("Reprovada"));

  function filtrar(lista) {
    return lista.filter(r => {
      const matchSearch =
        !search ||
        r.item?.toLowerCase().includes(search.toLowerCase()) ||
        r.colaborador_nome?.toLowerCase().includes(search.toLowerCase()) ||
        r.numero_requisicao?.toLowerCase().includes(search.toLowerCase()) ||
        r.colaborador_area?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filtroStatus === "todos" || r.status === filtroStatus;
      const matchUrgencia = filtroUrgencia === "todos" || r.urgencia === filtroUrgencia;
      return matchSearch && matchStatus && matchUrgencia;
    });
  }

  const totalValorAprovado = aprovadas.reduce((acc, r) => acc + (r.valor_maximo || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
          <ShoppingCart className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Requisições de Compra</h1>
          <p className="text-muted-foreground text-sm">Visão geral de todas as requisições do sistema</p>
        </div>
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold text-foreground">{requisicoes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Pendentes</p>
            <p className="text-2xl font-bold text-amber-600">{pendentes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Aprovadas</p>
            <p className="text-2xl font-bold text-green-600">{aprovadas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Reprovadas</p>
            <p className="text-2xl font-bold text-red-600">{reprovadas.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por item, solicitante, área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Aguardando Aprovador">Aguardando Aprovador</SelectItem>
            <SelectItem value="Aguardando Diretor">Aguardando Diretor</SelectItem>
            <SelectItem value="Aprovada">Aprovada</SelectItem>
            <SelectItem value="Reprovada pelo Aprovador">Reprovada pelo Aprovador</SelectItem>
            <SelectItem value="Reprovada pelo Diretor">Reprovada pelo Diretor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroUrgencia} onValueChange={setFiltroUrgencia}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Urgência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Toda urgência</SelectItem>
            <SelectItem value="Baixa">Baixa</SelectItem>
            <SelectItem value="Média">Média</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="todas">
        <TabsList className="grid grid-cols-5 w-full mb-4">
          <TabsTrigger value="todas">Todas ({filtrar(requisicoes).length})</TabsTrigger>
          <TabsTrigger value="pendentes">
            Pendentes
            {pendentes.length > 0 && <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendentes.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="aprovadas">Aprovadas ({filtrar(aprovadas).length})</TabsTrigger>
          <TabsTrigger value="reprovadas">Reprovadas ({filtrar(reprovadas).length})</TabsTrigger>
          <TabsTrigger value="aprovadores" className="flex items-center gap-1">
            <UserCheck className="w-3 h-3" />Aprovadores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas">
          <ListaRequisicoes lista={filtrar(requisicoes)} isLoading={isLoading} onSelect={setSelectedReq} />
        </TabsContent>
        <TabsContent value="pendentes">
          <ListaRequisicoes lista={filtrar(pendentes)} isLoading={isLoading} onSelect={setSelectedReq} />
        </TabsContent>
        <TabsContent value="aprovadas">
          {filtrar(aprovadas).length > 0 && (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              💰 Valor total aprovado (máximo estimado): <strong>R$ {totalValorAprovado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
          )}
          <ListaRequisicoes lista={filtrar(aprovadas)} isLoading={isLoading} onSelect={setSelectedReq} />
        </TabsContent>
        <TabsContent value="reprovadas">
          <ListaRequisicoes lista={filtrar(reprovadas)} isLoading={isLoading} onSelect={setSelectedReq} />
        </TabsContent>
        <TabsContent value="aprovadores">
          <ModuloAprovador onSelectRequisicao={setSelectedReq} />
        </TabsContent>
      </Tabs>

      {/* Dialog detalhes */}
      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Requisição {selectedReq?.numero_requisicao}</DialogTitle>
          </DialogHeader>
          {selectedReq && (
            <RequisicaoDetalhes
              requisicao={selectedReq}
              colaboradorAtual={null}
              onAcao={() => {
                queryClient.invalidateQueries({ queryKey: ["admin_requisicoes"] });
                setSelectedReq(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListaRequisicoes({ lista, isLoading, onSelect }) {
  if (isLoading) return <p className="text-center py-10 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Carregando...</p>;
  if (!lista.length) return <p className="text-center py-10 text-muted-foreground">Nenhuma requisição encontrada.</p>;

  return (
    <div className="space-y-2">
      {lista.map(r => (
        <div
          key={r.id}
          className="flex items-center justify-between p-4 bg-card border rounded-lg hover:shadow-sm cursor-pointer transition-all hover:border-emerald-300"
          onClick={() => onSelect(r)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">{r.numero_requisicao}</span>
              <Badge className={`${statusColors[r.status]} flex items-center gap-1 text-xs`}>
                {statusIcon[r.status]} {r.status}
              </Badge>
              <Badge className={`${urgenciaColors[r.urgencia]} text-xs`}>{r.urgencia}</Badge>
            </div>
            <p className="font-medium text-foreground truncate">{r.item}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {r.colaborador_nome} · {r.colaborador_area} · Qtd: {r.quantidade}
              {r.valor_minimo && r.valor_maximo
                ? ` · R$ ${Number(r.valor_minimo).toLocaleString('pt-BR')} – R$ ${Number(r.valor_maximo).toLocaleString('pt-BR')}`
                : ""}
            </p>
          </div>
          <div className="text-xs text-muted-foreground ml-3 shrink-0 text-right">
            <p>{new Date(r.created_date).toLocaleDateString('pt-BR')}</p>
            {r.aprovador_nome && <p className="mt-0.5">Aprv: {r.aprovador_nome.split(' ')[0]}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}