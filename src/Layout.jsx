import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
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
  FileSpreadsheet,
  Settings,
  Phone,
  Users,
  LogOut,
  Activity,
  Sun,
  Moon,
  Building2,
  Megaphone,
  ShoppingCart
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
    title: "Sala de Treinamento",
    url: createPageUrl("sala-treinamento"),
    icon: Users,
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
    title: "Projetos / Terceiros",
    url: createPageUrl("ProjetosTerceiros"),
    icon: Building2,
  },
  {
    title: "Requisições de Compra",
    url: createPageUrl("RequisicaoCompras"),
    icon: ShoppingCart,
  },
  {
    title: "Comunicados",
    url: createPageUrl("Comunicados"),
    icon: Megaphone,
  },
  {
    title: "Resumo",
    url: createPageUrl("Resumo"),
    icon: FileSpreadsheet,
  },
];

const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}${createPageUrl("portal-login")}` : '';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser, isLoadingAuth: loading } = useAuth();
  const [darkMode, setDarkMode] = React.useState(() => localStorage.getItem('techcontrol_theme') === 'dark');

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('techcontrol_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('techcontrol_theme', 'light');
    }
  }, [darkMode]);

  const comunicadosRoles = ['comunicados_arte', 'comunicados_gestao', 'comunicados_dp'];
  const isComunicadosRole = currentUser && comunicadosRoles.includes(currentUser.role);

  const isPublicPage = location.pathname.includes('/chamado-publico') ||
                       location.pathname.includes('/reserva-publica') ||
                       location.pathname.includes('/reserva-sala-publica') ||
                       location.pathname.includes('/acompanhar-chamado') ||
                       location.pathname.includes('/portal-login') ||
                       location.pathname.includes('/portal-chamados') ||
                       location.pathname.includes('/portal-reservas') ||
                       location.pathname.includes('/portal-sala') ||
                       location.pathname.includes('/portal-equipamentos') ||
                       location.pathname.includes('/portal-ramais') ||
                       location.pathname.includes('/portal-requisicoes') ||
                       location.pathname.includes('/aprovacao-diretor') ||
                       location.pathname.includes('/portal') ||
                       location.pathname === '/login';


  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  // Se for página pública, renderiza apenas o conteúdo sem layout
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Redireciona para login se não autenticado em páginas privadas
  if (!loading && !currentUser) {
    window.location.href = '/login';
    return null;
  }


  return (
    <SidebarProvider>
      <style>{`
        .dark {
          --background: 222 20% 13%;
          --foreground: 210 40% 96%;
          --card: 222 20% 16%;
          --card-foreground: 210 40% 96%;
          --popover: 222 20% 16%;
          --popover-foreground: 210 40% 96%;
          --primary: 210 40% 96%;
          --primary-foreground: 222 20% 13%;
          --secondary: 222 20% 20%;
          --secondary-foreground: 210 40% 96%;
          --muted: 222 20% 20%;
          --muted-foreground: 215 20% 65%;
          --accent: 222 20% 22%;
          --accent-foreground: 210 40% 96%;
          --destructive: 0 62.8% 40%;
          --destructive-foreground: 0 0% 98%;
          --border: 222 20% 22%;
          --input: 222 20% 22%;
          --ring: 215 40% 60%;
          --sidebar-background: 222 25% 10%;
          --sidebar-foreground: 210 40% 92%;
          --sidebar-primary: 224.3 76.3% 60%;
          --sidebar-primary-foreground: 0 0% 100%;
          --sidebar-accent: 222 20% 18%;
          --sidebar-accent-foreground: 210 40% 92%;
          --sidebar-border: 222 20% 18%;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="border-b border-border p-4 bg-gradient-to-r from-blue-600 to-blue-700">
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
            {isComunicadosRole ? (
              // ── Sidebar simplificado para perfis de Comunicados ──
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-2 py-2">
                  Comunicados
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-indigo-50 hover:text-indigo-700 transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname.includes('/Comunicados') ? 'bg-indigo-50 text-indigo-700 font-medium' : ''
                        }`}
                      >
                        <Link to={createPageUrl("Comunicados")} className="flex items-center gap-3 px-3 py-2">
                          <Megaphone className="w-4 h-4" />
                          <span>Comunicados</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {['comunicados_gestao', 'comunicados_dp'].includes(currentUser?.role) && (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-indigo-50 hover:text-indigo-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname.includes('/Colaboradores') ? 'bg-indigo-50 text-indigo-700 font-medium' : ''
                          }`}
                        >
                          <Link to={createPageUrl("Colaboradores")} className="flex items-center gap-3 px-3 py-2">
                            <Users className="w-4 h-4" />
                            <span>Colaboradores</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : (
              // ── Sidebar completo para admin / user ──
              <>
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-2 py-2">
                    Equipamentos
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navigationItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            asChild 
                            className={`hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 rounded-lg mb-1 ${
                              location.pathname === item.url ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium' : ''
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
                  <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-2 py-2 mt-2">
                    Gestão
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {managementItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            asChild 
                            className={`hover:bg-green-50 dark:hover:bg-green-950 hover:text-green-700 dark:hover:text-green-300 transition-colors duration-200 rounded-lg mb-1 ${
                              location.pathname === item.url ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 font-medium' : ''
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
              </>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-4">
            {currentUser && (
              <div className="mb-3 pb-3 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 dark:text-blue-300 font-semibold text-sm">
                      {currentUser.full_name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {currentUser.full_name || "Usuário"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                  >
                    <LogOut className="w-3 h-3 mr-2" />
                    Sair do Sistema
                  </Button>
                  <Button
                    onClick={() => setDarkMode(!darkMode)}
                    variant="outline"
                    size="sm"
                    title={darkMode ? "Modo claro" : "Modo escuro"}
                  >
                    {darkMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground text-center">
              <p className="font-semibold">Sistema TechControl</p>
              <p>v1.0.0</p>
              <a
                href={createPageUrl("portal-login")}
                className="mt-2 inline-block text-blue-600 hover:underline"
              >
                🔗 Portal do Colaborador
              </a>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-background border-b border-border px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-muted p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold">TechControl</h1>
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