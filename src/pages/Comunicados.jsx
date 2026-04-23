import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone } from "lucide-react";
import ListaDemandas from "../components/comunicados/ListaDemandas";
import VisaoEventos from "../components/comunicados/VisaoEventos";

export default function Comunicados() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      const role = u?.role;
      // comunicados_gestao e comunicados_dp veem a visão geral por padrão
      if (role === "comunicados_gestao" || role === "comunicados_dp") {
        setActiveTab("visao_mes");
      } else {
        setActiveTab("artes");
      }
    }).catch(() => setActiveTab("artes"));
  }, []);

  if (!activeTab) return null;

  const role = currentUser?.role;
  const podeVerArtes = !role || ["admin", "user", "comunicados_arte", "comunicados_gestao", "comunicados_dp"].includes(role);
  const podeVerVisao = !role || ["admin", "user", "comunicados_gestao", "comunicados_dp"].includes(role);
  const podeCriarArte = !role || ["admin", "user", "comunicados_arte"].includes(role);
  const podeEnviarDespedida = !role || ["admin", "user", "comunicados_dp"].includes(role);

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
          {podeVerArtes && <TabsTrigger value="artes">🎨 Artes e Demandas</TabsTrigger>}
          {podeVerVisao && <TabsTrigger value="visao_mes">📅 Este Mês</TabsTrigger>}
          {podeVerVisao && <TabsTrigger value="visao_anual">📆 Planejamento Anual</TabsTrigger>}
        </TabsList>

        {podeVerArtes && (
          <TabsContent value="artes">
            <ListaDemandas podeCriarArte={podeCriarArte} nomeUsuario={nomeUsuario} />
          </TabsContent>
        )}
        {podeVerVisao && (
          <TabsContent value="visao_mes">
            <VisaoEventos modo="mes" podeEnviarDespedida={podeEnviarDespedida} />
          </TabsContent>
        )}
        {podeVerVisao && (
          <TabsContent value="visao_anual">
            <VisaoEventos modo="anual" podeEnviarDespedida={false} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}