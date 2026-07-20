import React, { useEffect } from "react";
import { usePortalAuth } from "../components/portal/usePortalAuth";
import PortalLayout from "../components/portal/PortalLayout";
import PainelComunicados from "../components/comunicados/PainelComunicados";
import GestaoColaboradoresPortal from "../components/portal/GestaoColaboradoresPortal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function PortalComunicados() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();

  useEffect(() => { if (!loading) requireAuth(); }, [loading]);

  if (loading || !colaborador) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const permissoes = colaborador.permissoes_comunicados || [];
  const podeVerVisao = permissoes.includes("ver_visao_geral");
  const podeCadastrarArtes = permissoes.includes("cadastrar_artes");
  const podeGerirColabs = permissoes.includes("gerir_colaboradores");

  if (!podeVerVisao && !podeCadastrarArtes && !podeGerirColabs) {
    return (
      <PortalLayout colaborador={colaborador} onLogout={logout}>
        <div className="p-8 text-center text-gray-500">
          <p className="text-lg font-medium">Sem permissão de acesso</p>
          <p className="text-sm mt-1">Você não tem permissões de comunicados configuradas. Contate o administrador.</p>
        </div>
      </PortalLayout>
    );
  }

  const nomeUsuario = colaborador.nome_completo || "";

  if (podeGerirColabs) {
    return (
      <PortalLayout colaborador={colaborador} onLogout={logout}>
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
          <Tabs defaultValue="painel" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="painel">📢 Central de Comunicados</TabsTrigger>
              <TabsTrigger value="colabs">👥 Gestão de Colaboradores</TabsTrigger>
            </TabsList>
            <TabsContent value="painel">
              <PainelComunicados
                podeCriarArte={podeCadastrarArtes || podeVerVisao}
                podeGerenciarConfig={podeVerVisao}
                nomeUsuario={nomeUsuario}
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
    <PortalLayout colaborador={colaborador} onLogout={logout}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <PainelComunicados
          podeCriarArte={podeCadastrarArtes || podeVerVisao}
          podeGerenciarConfig={podeVerVisao}
          nomeUsuario={nomeUsuario}
        />
      </div>
    </PortalLayout>
  );
}