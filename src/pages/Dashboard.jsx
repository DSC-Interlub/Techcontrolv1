import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Monitor, 
  Laptop, 
  Smartphone, 
  Camera, 
  Barcode, 
  Pen,
  TrendingUp,
  Package,
  DollarSign,
  AlertCircle,
  Calendar,
  Headset
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['pcs_internos'],
    queryFn: () => base44.entities.PCs_Internos.list(),
    enabled: !!user,
  });

  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
    enabled: !!user,
  });

  const { data: smartphones = [] } = useQuery({
    queryKey: ['smartphones'],
    queryFn: () => base44.entities.Smartphones.list(),
    enabled: !!user,
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => base44.entities.Cameras.list(),
    enabled: !!user,
  });

  const { data: coletores = [] } = useQuery({
    queryKey: ['coletores'],
    queryFn: () => base44.entities.Coletores.list(),
    enabled: !!user,
  });

  const { data: canetas = [] } = useQuery({
    queryKey: ['canetas_vibracao'],
    queryFn: () => base44.entities.Canetas_Vibracao.list(),
    enabled: !!user,
  });

  const { data: chamados = [] } = useQuery({
    queryKey: ['chamados'],
    queryFn: () => base44.entities.Chamados.list('-created_date', 5),
    enabled: !!user,
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas'],
    queryFn: () => base44.entities.Reservas.list('-created_date', 5),
    enabled: !!user,
  });

  const equipmentStats = [
    {
      name: "PCs Internos",
      total: pcsInternos.length,
      disponiveis: pcsInternos.filter(e => e.status === "Disponível").length,
      icon: Monitor,
      color: "bg-blue-500",
      link: createPageUrl("PCs_Internos")
    },
    {
      name: "Notebooks Externos",
      total: notebooksExternos.length,
      disponiveis: notebooksExternos.filter(e => e.status === "Disponível").length,
      icon: Laptop,
      color: "bg-purple-500",
      link: createPageUrl("Notebooks_Externos")
    },
    {
      name: "Smartphones",
      total: smartphones.length,
      disponiveis: smartphones.filter(e => e.status === "Disponível").length,
      icon: Smartphone,
      color: "bg-green-500",
      link: createPageUrl("Smartphones")
    },
    {
      name: "Câmeras",
      total: cameras.length,
      disponiveis: cameras.filter(e => e.status === "Disponível").length,
      icon: Camera,
      color: "bg-orange-500",
      link: createPageUrl("Cameras")
    },
    {
      name: "Coletores",
      total: coletores.length,
      disponiveis: coletores.filter(e => e.status === "Disponível").length,
      icon: Barcode,
      color: "bg-cyan-500",
      link: createPageUrl("Coletores")
    },
    {
      name: "Canetas",
      total: canetas.length,
      disponiveis: canetas.filter(e => e.status === "Disponível").length,
      icon: Pen,
      color: "bg-pink-500",
      link: createPageUrl("Canetas_Vibracao")
    },
  ];

  const totalEquipamentos = equipmentStats.reduce((sum, stat) => sum + stat.total, 0);
  const totalDisponiveis = equipmentStats.reduce((sum, stat) => sum + stat.disponiveis, 0);
  const valorTotal = smartphones.reduce((sum, s) => sum + (s.valor || 0), 0);

  const chamadosAbertos = chamados.filter(c => c.status === "Aberto").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Visão geral do controle de equipamentos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium opacity-90">Total de Equipamentos</CardTitle>
                <Package className="w-5 h-5 opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalEquipamentos}</div>
              <p className="text-xs opacity-80 mt-1">Em todos os segmentos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium opacity-90">Disponíveis</CardTitle>
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalDisponiveis}</div>
              <p className="text-xs opacity-80 mt-1">Prontos para uso</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium opacity-90">Valor Total Investido</CardTitle>
                <DollarSign className="w-5 h-5 opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">R$ {valorTotal.toLocaleString('pt-BR')}</div>
              <p className="text-xs opacity-80 mt-1">Em smartphones</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium opacity-90">Chamados Abertos</CardTitle>
                <AlertCircle className="w-5 h-5 opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{chamadosAbertos}</div>
              <p className="text-xs opacity-80 mt-1">Aguardando atendimento</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {equipmentStats.map((stat) => (
            <Link key={stat.name} to={stat.link}>
              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{stat.name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Total: {stat.total}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${stat.color} bg-opacity-20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Disponíveis:</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {stat.disponiveis}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-600">Em uso:</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {stat.total - stat.disponiveis}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Headset className="w-5 h-5 text-orange-600" />
                  <CardTitle>Chamados Recentes</CardTitle>
                </div>
                <Link to={createPageUrl("Chamados")}>
                  <Button variant="outline" size="sm">Ver todos</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {chamados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Headset className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum chamado registrado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chamados.map((chamado) => (
                    <div key={chamado.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{chamado.solicitante_nome}</p>
                        <p className="text-xs text-gray-600 mt-1">{chamado.tipo_solicitacao}</p>
                        <p className="text-xs text-gray-500 mt-1">{chamado.descricao_problema?.substring(0, 50)}...</p>
                      </div>
                      <Badge className={
                        chamado.status === "Aberto" ? "bg-orange-100 text-orange-800" :
                        chamado.status === "Em Andamento" ? "bg-blue-100 text-blue-800" :
                        "bg-green-100 text-green-800"
                      }>
                        {chamado.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <CardTitle>Reservas Recentes</CardTitle>
                </div>
                <Link to={createPageUrl("Reservas")}>
                  <Button variant="outline" size="sm">Ver todas</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {reservas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma reserva registrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reservas.map((reserva) => (
                    <div key={reserva.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{reserva.solicitante_nome}</p>
                        <p className="text-xs text-gray-600 mt-1">{reserva.equipamento_nome}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(reserva.data_inicio).toLocaleDateString('pt-BR')} - {reserva.hora_inicio}
                        </p>
                      </div>
                      <Badge className={
                        reserva.status === "Pendente" ? "bg-yellow-100 text-yellow-800" :
                        reserva.status === "Confirmada" ? "bg-green-100 text-green-800" :
                        reserva.status === "Em Andamento" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-800"
                      }>
                        {reserva.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}