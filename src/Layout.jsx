import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { 
  LayoutDashboard, 
  Monitor, 
  Laptop, 
  Smartphone, 
  Camera, 
  Barcode,
  Pen,
  Calendar,
  Headset,
  Upload,
  FileSpreadsheet,
  Settings,
  Phone,
  Users,
  LogOut,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "PCs Internos",
    url: createPageUrl("PCs_Internos"),
    icon: Monitor,
  },
  {
    title: "Notebooks Externos",
    url: createPageUrl("Notebooks_Externos"),
    icon: Laptop,
  },
  {
    title: "Tablets",
    url: createPageUrl("Tablets"),
    icon: Smartphone,
  },
  {
    title: "Smartphones",
    url: createPageUrl("Smartphones"),
    icon: Smartphone,
  },
  {
    title: "Câmeras",
    url: createPageUrl("Cameras"),
    icon: Camera,
  },
  {
    title: "Coletores",
    url: createPageUrl("Coletores"),
    icon: Barcode,
  },
  {
    title: "Canetas de Vibração",
    url: createPageUrl("Canetas_Vibracao"),
    icon: Pen,
  },
];

const managementItems = [
  {
    title: "Colaboradores",
    url: createPageUrl("Colaboradores"),
    icon: Users,
  },
  {
    title: "Reservas",
    url: createPageUrl("Reservas"),
    icon: Calendar,
  },
  {
    title: "Chamados",
    url: createPageUrl("Chamados"),
    icon: Headset,
  },
  {
    title: "Ramais",
    url: createPageUrl("Ramais"),
    icon: Phone,
  },
  {
    title: "Usuários",
    url: createPageUrl("Usuarios"),
    icon: Settings,
  },
  {
    title: "Avaliações de Equipamentos",
    url: createPageUrl("Avaliacoes_Equipamentos"),
    icon: Activity,
  },
  {
    title: "Importar Dados",
    url: createPageUrl("Importar"),
    icon: Upload,
  },
  {
    title: "Resumo",
    url: createPageUrl("Resumo"),
    icon: FileSpreadsheet,
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (err) {
        console.error("Erro ao carregar usuário:", err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      base44.auth.logout();
    }
  };

  // Detecta páginas públicas pelo pathname
  const isPublicPage = location.pathname.includes('/chamado-publico') || 
                       location.pathname.includes('/reserva-publica') ||
                       location.pathname.includes('/acompanhar-chamado');

  // Se for página pública, renderiza apenas o conteúdo sem layout
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Se não for página pública e estiver carregando, mostra loader
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

  // Se não for página pública e não estiver autenticado, redireciona para login
  if (!loading && !currentUser) {
    base44.auth.redirectToLogin(location.pathname);
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="border-r border-gray-200">
          <SidebarHeader className="border-b border-gray-200 p-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">TechControl</h2>
                <p className="text-xs text-blue-100">Gestão de Equipamentos</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">
                Equipamentos
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-medium' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-2 mt-2">
                Gestão
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {managementItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-green-50 hover:text-green-700 transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-green-50 text-green-700 font-medium' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4 bg-gray-50">
            {currentUser && (
              <div className="mb-3 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 font-semibold text-sm">
                      {currentUser.full_name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {currentUser.full_name || "Usuário"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  <LogOut className="w-3 h-3 mr-2" />
                  Sair do Sistema
                </Button>
              </div>
            )}
            <div className="text-xs text-gray-600 text-center">
              <p className="font-semibold">Sistema TechControl</p>
              <p className="text-gray-500">v1.0.0</p>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold text-gray-900">TechControl</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}