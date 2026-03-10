import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Loader2, Monitor, Laptop, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";

export default function PortalEquipamentos() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();

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

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['portal_avaliacoes'],
    queryFn: () => base44.entities.Avaliacoes.list('-data_avaliacao'),
    enabled: !!colaborador,
  });

  if (loading || !colaborador) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  const nomeNorm = colaborador.nome_completo?.toLowerCase().trim();

  const meusEquipamentos = [
    ...pcsInternos
      .filter(pc => pc.usuario_atual?.toLowerCase().trim() === nomeNorm)
      .map(pc => ({ ...pc, entityType: "PCs_Internos", icon: pc.tipo === "Notebook" ? Laptop : Monitor })),
    ...notebooksExternos
      .filter(nb => nb.usuario_atual?.toLowerCase().trim() === nomeNorm)
      .map(nb => ({ ...nb, entityType: "Notebooks_Externos", icon: Laptop })),
  ];

  const getUltimaAvaliacao = (id) => avaliacoes.find(a => a.equipamento_id === id);

  const getClassColor = (c) => c === "Manter" ? "bg-green-100 text-green-800" : c === "Upgrade" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

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
              <p className="text-gray-500 mt-1">Equipamentos atribuídos a você</p>
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
                const Icon = eq.icon;
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
                            {avaliacao && (
                              <Badge className={getClassColor(avaliacao.classificacao)}>{avaliacao.classificacao}</Badge>
                            )}
                          </div>
                          {avaliacao && (
                            <p className="text-xs text-gray-500 mt-1">
                              Última avaliação: {new Date(avaliacao.data_avaliacao).toLocaleDateString('pt-BR')}
                              {" · "}Pontuação: {avaliacao.pontuacao_total}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t">
                        <Link to={`${createPageUrl(eq.entityType)}?id=${eq.id}`}>
                          <Button variant="outline" size="sm" className="w-full gap-2">
                            <ExternalLink className="w-4 h-4" />
                            Ver detalhes / Avaliar
                          </Button>
                        </Link>
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