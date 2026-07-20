import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Settings } from "lucide-react";
import ListaDemandas from "../components/comunicados/ListaDemandas";
import VisaoEventos from "../components/comunicados/VisaoEventos";
import AbaEnvios from "../components/comunicados/AbaEnvios";
import AbaConfiguracoes from "../components/comunicados/AbaConfiguracoes";

function getDefaultTab(user) {
  const role = user?.role;
  if (role === "comunicados_gestao" || role === "comunicados_dp") return "calendario";
  return "artes";
}

export default function Comunicados() {
  const { user: currentUser, isLoadingAuth } = useAuth();
  const [activeTab, setActiveTab] = useState("artes");

  useEffect(() => {
    if (currentUser) setActiveTab(getDefaultTab(currentUser));
  }, [currentUser]);

  const role = currentUser?.role;
  const isAdmin = role === "admin";
  const podeVerArtes = ["admin", "user", "comunicados_arte", "comunicados_gestao", "comunicados_dp"].includes(role);
  const podeVerVisao = ["admin", "user", "comunicados_gestao", "comunicados_dp"].includes(role);
  const podeCriarArte = ["admin", "user", "comunicados_arte"].includes(role);
  const podeEnviarDespedida = ["admin", "user", "comunicados_dp"].includes(role);
  const podeVerEnvios = ["admin", "user", "comunicados_gestao", "comunicados_dp"].includes(role);

  const nomeUsuario = currentUser?.full_name || currentUser?.email || "";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Megaphone className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comunicados</h1>
          <p className="text-sm text-gray-500">Gestão de artes por demanda e painel de datas importantes</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 flex-wrap gap-1 h-auto">
          {podeVerArtes && <TabsTrigger value="artes">🎨 Gestão de Artes</TabsTrigger>}
          {podeVerVisao && <TabsTrigger value="calendario">📅 Calendário de Eventos</TabsTrigger>}
          {(podeVerEnvios || isAdmin) && <TabsTrigger value="admin">⚙️ Painel de Controle</TabsTrigger>}
        </TabsList>

        {podeVerArtes && (
          <TabsContent value="artes">
            <ListaDemandas podeCriarArte={podeCriarArte} nomeUsuario={nomeUsuario} />
          </TabsContent>
        )}
        {podeVerVisao && (
          <TabsContent value="calendario">
            <VisaoEventos modo="mes" podeEnviarDespedida={podeEnviarDespedida} />
          </TabsContent>
        )}
        {(podeVerEnvios || isAdmin) && (
          <TabsContent value="admin" className="space-y-8">
            <AbaEnvios />
            {isAdmin && (
              <div className="border-t pt-8">
                <h3 className="font-semibold text-gray-800 text-base mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-650" />
                  Configurações de E-mail por Tipo de Evento
                </h3>
                <AbaConfiguracoes />
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}