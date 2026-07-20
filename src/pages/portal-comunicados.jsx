import React, { useEffect } from "react";
import { usePortalAuth } from "../components/portal/usePortalAuth";
import PortalLayout from "../components/portal/PortalLayout";
import ListaDemandas from "../components/comunicados/ListaDemandas";
import VisaoEventos from "../components/comunicados/VisaoEventos";
import GestaoColaboradoresPortal from "../components/portal/GestaoColaboradoresPortal";
import AbaEnvios from "../components/comunicados/AbaEnvios";
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
  const podeEnviarDespedida = permissoes.includes("enviar_despedida");

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

  const defaultTab = podeVerVisao ? "calendario" : podeCadastrarArtes ? "artes" : "colabs";
  const nomeUsuario = colaborador.nome_completo || "";

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout}>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Comunicados</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão de artes e eventos de comunicação interna</p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-6 flex-wrap gap-1 h-auto">
            {podeVerVisao && <TabsTrigger value="calendario">📅 Calendário de Eventos</TabsTrigger>}
            {podeCadastrarArtes && <TabsTrigger value="artes">🎨 Gestão de Artes</TabsTrigger>}
            {podeGerirColabs && <TabsTrigger value="colabs">👥 Colaboradores</TabsTrigger>}
            {podeVerVisao && <TabsTrigger value="admin">⚙️ Painel de Controle</TabsTrigger>}
          </TabsList>

          {podeVerVisao && (
            <TabsContent value="calendario">
              <VisaoEventos modo="mes" podeEnviarDespedida={podeEnviarDespedida} />
            </TabsContent>
          )}
          {podeCadastrarArtes && (
            <TabsContent value="artes">
              <ListaDemandas podeCriarArte={true} nomeUsuario={nomeUsuario} />
            </TabsContent>
          )}
          {podeGerirColabs && (
            <TabsContent value="colabs">
              <GestaoColaboradoresPortal />
            </TabsContent>
          )}
          {podeVerVisao && (
            <TabsContent value="admin">
              <AbaEnvios />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </PortalLayout>
  );
}