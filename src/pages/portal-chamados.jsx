import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Headset, Plus, Eye, Star, Loader2, ExternalLink, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";

const statusColors = {
  "Aberto": "bg-red-100 text-red-800",
  "Em Análise": "bg-yellow-100 text-yellow-800",
  "Em Andamento": "bg-blue-100 text-blue-800",
  "Aguardando Peça": "bg-orange-100 text-orange-800",
  "Aguardando Avaliação": "bg-purple-100 text-purple-800",
  "Resolvido": "bg-green-100 text-green-800",
  "Cancelado": "bg-gray-100 text-gray-800",
};

export default function PortalChamados() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();
  const [selectedChamado, setSelectedChamado] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading) requireAuth();
  }, [loading]);

  const { data: chamados = [], isLoading } = useQuery({
    queryKey: ['portal_chamados_list', colaborador?.nome_completo],
    queryFn: () => base44.entities.Chamados.list('-created_date'),
    enabled: !!colaborador,
  });

  if (loading || !colaborador) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  const nomeNorm = colaborador.nome_completo?.toLowerCase().trim();
  const meusChamados = chamados.filter(c => c.solicitante_nome?.toLowerCase().trim() === nomeNorm);
  const abertos = meusChamados.filter(c => c.status !== "Resolvido" && c.status !== "Cancelado");
  const encerrados = meusChamados.filter(c => c.status === "Resolvido" || c.status === "Cancelado");

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}${createPageUrl("chamado-publico")}` : '';
  const acompanharUrl = typeof window !== 'undefined' ? `${window.location.origin}${createPageUrl("acompanhar-chamado")}` : '';

  const ChamadoRow = ({ chamado }) => (
    <TableRow key={chamado.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedChamado(chamado)}>
      <TableCell className="font-mono text-sm">{chamado.numero_chamado}</TableCell>
      <TableCell>{chamado.tipo_solicitacao}</TableCell>
      <TableCell className="max-w-[200px] truncate">{chamado.titulo_chamado || chamado.descricao_problema?.slice(0, 50)}</TableCell>
      <TableCell>{chamado.data_abertura || "-"}</TableCell>
      <TableCell>
        <Badge className={statusColors[chamado.status] || "bg-gray-100 text-gray-800"}>{chamado.status}</Badge>
      </TableCell>
      <TableCell>
        <Badge className={
          chamado.urgencia === "Urgente" ? "bg-red-100 text-red-800" :
          chamado.urgencia === "Alta" ? "bg-orange-100 text-orange-800" :
          "bg-yellow-100 text-yellow-800"
        }>{chamado.urgencia}</Badge>
      </TableCell>
    </TableRow>
  );

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout}>
      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Headset className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Meus Chamados</h1>
                <p className="text-gray-500 mt-1">Acompanhe e abra chamados de suporte</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={acompanharUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Acompanhar
                </Button>
              </a>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-orange-600 hover:bg-orange-700 gap-2">
                  <Plus className="w-4 h-4" />
                  Abrir Chamado
                </Button>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-gray-900">{meusChamados.length}</p><p className="text-sm text-gray-600">Total</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-orange-600">{abertos.length}</p><p className="text-sm text-gray-600">Em aberto</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-green-600">{encerrados.length}</p><p className="text-sm text-gray-600">Resolvidos</p></CardContent></Card>
          </div>

          <Tabs defaultValue="abertos">
            <TabsList className="grid w-full grid-cols-2 max-w-xs mb-4">
              <TabsTrigger value="abertos">Em Aberto ({abertos.length})</TabsTrigger>
              <TabsTrigger value="historico">Histórico ({encerrados.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="abertos">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Urgência</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
                        ) : abertos.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Nenhum chamado em aberto</TableCell></TableRow>
                        ) : (
                          abertos.map(c => <ChamadoRow key={c.id} chamado={c} />)
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historico">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Urgência</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {encerrados.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Nenhum chamado no histórico</TableCell></TableRow>
                        ) : (
                          encerrados.map(c => <ChamadoRow key={c.id} chamado={c} />)
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal detalhes */}
      <Dialog open={!!selectedChamado} onOpenChange={() => setSelectedChamado(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chamado {selectedChamado?.numero_chamado}</DialogTitle>
          </DialogHeader>
          {selectedChamado && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <Badge className={statusColors[selectedChamado.status]}>{selectedChamado.status}</Badge>
                <Badge className={selectedChamado.urgencia === "Urgente" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>{selectedChamado.urgencia}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-gray-500">Tipo</p><p className="font-medium">{selectedChamado.tipo_solicitacao}</p></div>
                <div><p className="text-gray-500">Data Abertura</p><p className="font-medium">{selectedChamado.data_abertura || "—"}</p></div>
                <div><p className="text-gray-500">Responsável</p><p className="font-medium">{selectedChamado.responsavel || "Não atribuído"}</p></div>
                {selectedChamado.data_conclusao && <div><p className="text-gray-500">Data Conclusão</p><p className="font-medium">{new Date(selectedChamado.data_conclusao).toLocaleDateString('pt-BR')}</p></div>}
              </div>
              {selectedChamado.descricao_problema && (
                <div><p className="text-gray-500 font-semibold mb-1">Descrição</p><p className="bg-gray-50 rounded p-3">{selectedChamado.descricao_problema}</p></div>
              )}
              {selectedChamado.solucao && (
                <div><p className="text-gray-500 font-semibold mb-1">Solução</p><p className="bg-green-50 rounded p-3 text-green-800">{selectedChamado.solucao}</p></div>
              )}
              {selectedChamado.numero_chamado && (
                <a href={`${typeof window !== 'undefined' ? window.location.origin : ''}${createPageUrl("acompanhar-chamado")}?numero=${selectedChamado.numero_chamado}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full gap-2 mt-2">
                    <ExternalLink className="w-4 h-4" />
                    Acompanhar / Avaliar
                  </Button>
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}