import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { usePortalAuth } from "../components/portal/usePortalAuth";
import PortalLayout from "../components/portal/PortalLayout";
import PainelComunicados from "../components/comunicados/PainelComunicados";
import GestaoColaboradoresPortal from "../components/portal/GestaoColaboradoresPortal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function PortalComunicados() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();

  useEffect(() => {
    if (!loading) requireAuth();
  }, [loading]);

  // Busca dados frescos do colaborador logado
  const { data: colaboradorFull, isLoading: loadingFull } = useQuery({
    queryKey: ["portal_colab_comunicados_full", colaborador?.email],
    queryFn: async () => {
      if (!colaborador?.email) return null;
      const results = await base44.entities.Colaboradores.filter({ email: colaborador.email });
      return results?.[0] || null;
    },
    enabled: !!colaborador?.email,
    staleTime: 60_000,
  });

  const colabAtivo = colaboradorFull || colaborador;

  if (loading || !colaborador || loadingFull) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isComunicacao = 
    colabAtivo?.eh_comunicacao_branding ||
    colabAtivo?.area === "Comunicação e Branding" ||
    (Array.isArray(colabAtivo?.permissoes_comunicados) && colabAtivo.permissoes_comunicados.includes("comunicacao_branding"));

  const isConexaoHumana = 
    colabAtivo?.eh_conexao_humana ||
    colabAtivo?.area === "Conexão Humana" ||
    (Array.isArray(colabAtivo?.permissoes_comunicados) && colabAtivo.permissoes_comunicados.includes("conexao_humana"));

  const temAcesso = isComunicacao || isConexaoHumana;

  if (!temAcesso) {
    return (
      <PortalLayout colaborador={colabAtivo} onLogout={logout}>
        <div className="p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium">Sem permissão de acesso</p>
          <p className="text-sm mt-1">Este módulo é reservado às áreas de Comunicação e Branding e Conexão Humana (DP/RH/DHO).</p>
        </div>
      </PortalLayout>
    );
  }

  const nomeUsuario = colabAtivo?.nome_completo || "";

  if (isConexaoHumana || podeGerirColabs) {
    return (
      <PortalLayout colaborador={colabAtivo} onLogout={logout}>
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
          <Tabs defaultValue="painel" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="painel">📢 Central de Comunicados</TabsTrigger>
              <TabsTrigger value="colabs">👥 Gestão de Colaboradores</TabsTrigger>
            </TabsList>
            <TabsContent value="painel">
              <PainelComunicados
                podeCriarArte={isComunicacao}
                podeGerenciarConfig={false}
                nomeUsuario={nomeUsuario}
                colaboradorAtual={colabAtivo}
              />
            </TabsContent>
            <TabsContent value="colabs">
              <GestaoColaboradoresPortal />
            </TabsContent>
          </Tabs>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout colaborador={colabAtivo} onLogout={logout}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <PainelComunicados
          podeCriarArte={isComunicacao}
          podeGerenciarConfig={false}
          nomeUsuario={nomeUsuario}
          colaboradorAtual={colabAtivo}
        />
      </div>
    </PortalLayout>
  );
}