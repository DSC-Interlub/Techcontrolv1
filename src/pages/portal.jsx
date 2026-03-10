import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Headset, Calendar, Users, Phone, Activity, ArrowRight, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";

export default function Portal() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();

  useEffect(() => {
    if (!loading) requireAuth();
  }, [loading]);

  const { data: chamados = [] } = useQuery({
    queryKey: ['portal_chamados', colaborador?.nome_completo],
    queryFn: () => base44.entities.Chamados.list('-created_date'),
    enabled: !!colaborador,
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ['portal_reservas_nb', colaborador?.email],
    queryFn: () => base44.entities.Reservas.list('-created_date'),
    enabled: !!colaborador,
  });

  const { data: reservasSala = [] } = useQuery({
    queryKey: ['portal_reservas_sala', colaborador?.nome_completo],
    queryFn: () => base44.entities.ReservasSala.list('-created_date'),
    enabled: !!colaborador,
  });

  if (loading || !colaborador) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const nomeNorm = colaborador.nome_completo?.toLowerCase().trim();

  const meusChamados = chamados.filter(c => c.solicitante_nome?.toLowerCase().trim() === nomeNorm);
  const chamadosAbertos = meusChamados.filter(c => c.status !== "Resolvido" && c.status !== "Cancelado");

  const minhasReservasNb = reservas.filter(r =>
    r.solicitante_email?.toLowerCase() === colaborador.email?.toLowerCase() && r.status !== "Cancelada"
  );

  const minhasReservasSala = reservasSala.filter(r =>
    r.solicitante_nome?.toLowerCase().trim() === nomeNorm && r.status !== "Cancelada"
  );

  const cards = [
    {
      title: "Abrir Chamado",
      desc: "Solicite suporte técnico para problemas de TI",
      icon: Headset,
      color: "bg-orange-100 text-orange-600",
      url: createPageUrl("portal-chamados"),
      badge: chamadosAbertos.length > 0 ? `${chamadosAbertos.length} em aberto` : null,
      badgeColor: "bg-orange-100 text-orange-800",
    },
    {
      title: "Reservar Notebook",
      desc: "Reserve um notebook disponível para uso externo",
      icon: Calendar,
      color: "bg-purple-100 text-purple-600",
      url: createPageUrl("portal-reservas"),
      badge: minhasReservasNb.length > 0 ? `${minhasReservasNb.length} ativa(s)` : null,
      badgeColor: "bg-purple-100 text-purple-800",
    },
    {
      title: "Sala de Treinamento",
      desc: "Reserve a sala para reuniões e treinamentos",
      icon: Users,
      color: "bg-teal-100 text-teal-600",
      url: createPageUrl("portal-sala"),
      badge: minhasReservasSala.length > 0 ? `${minhasReservasSala.length} ativa(s)` : null,
      badgeColor: "bg-teal-100 text-teal-800",
    },
    {
      title: "Meus Equipamentos",
      desc: "Veja e avalie os equipamentos atribuídos a você",
      icon: Activity,
      color: "bg-blue-100 text-blue-600",
      url: createPageUrl("portal-equipamentos"),
      badge: null,
    },
    {
      title: "Lista de Ramais",
      desc: "Consulte os ramais telefônicos da empresa",
      icon: Phone,
      color: "bg-green-100 text-green-600",
      url: createPageUrl("portal-ramais"),
      badge: null,
    },
  ];

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout}>
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Olá, {colaborador.nome_completo.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-500 mt-1">{colaborador.area} · Portal do Colaborador</p>
          </div>

          {/* Resumo rápido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className={chamadosAbertos.length > 0 ? "border-orange-200 bg-orange-50" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Headset className={`w-8 h-8 ${chamadosAbertos.length > 0 ? "text-orange-600" : "text-gray-400"}`} />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{chamadosAbertos.length}</p>
                    <p className="text-sm text-gray-600">Chamados em aberto</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{minhasReservasNb.length}</p>
                    <p className="text-sm text-gray-600">Reservas de notebook</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-teal-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{minhasReservasSala.length}</p>
                    <p className="text-sm text-gray-600">Reservas de sala</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Atalhos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <Link key={card.title} to={card.url}>
                <Card className="hover:shadow-lg transition-all cursor-pointer h-full border hover:border-blue-200">
                  <CardContent className="pt-6 pb-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}>
                        <card.icon className="w-6 h-6" />
                      </div>
                      {card.badge && (
                        <Badge className={card.badgeColor}>{card.badge}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{card.title}</h3>
                    <p className="text-sm text-gray-500">{card.desc}</p>
                    <div className="flex items-center gap-1 mt-3 text-blue-600 text-sm font-medium">
                      Acessar <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}