import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
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

const visaoGeralItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Relatórios & BI",
    url: createPageUrl("Resumo"),
    icon: FileSpreadsheet,
  },
];

const ativosItems = [
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
  {
    title: "Reservas de Veículos",
    url: createPageUrl("Reservas"),
    icon: Calendar,
  },
  {
    title: "Sala de Treinamento",
    url: createPageUrl("sala-treinamento"),
    icon: Users,
  },
];

const operacoesItems = [
  {
    title: "Chamados TI",
    url: createPageUrl("Chamados"),
    icon: Headset,
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
];

const gestaoItems = [
  {
    title: "Colaboradores",
    url: createPageUrl("Colaboradores"),
    icon: Users,
  },
  {
    title: "Ramais",
    url: createPageUrl("Ramais"),
    icon: Phone,
  },
  {
    title: "Usuários do Sistema",
    url: createPageUrl("Usuarios"),
    icon: Settings,
  },
  {
    title: "Vistorias & Avaliações",
    url: createPageUrl("Avaliacoes_Equipamentos"),
    icon: Activity,
  },
  {
    title: "Projetos / Terceiros",
    url: createPageUrl("ProjetosTerceiros"),
    icon: Building2,
  },
];

const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}${createPageUrl("portal-login")}` : '';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
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
                       location.pathname.includes('/reset-password') ||
                       location.pathname === '/login';

  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      await base44.auth.logout('/login');
    }
  };

  // Se for página pública, renderiza apenas o conteúdo sem o layout administrativo
  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-foreground">TechControl</h1>
                  <p className="text-xs text-muted-foreground">Gestão de TI & Ativos</p>
                </div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-4">
            {isComunicadosRole ? (
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
              // ── Sidebar completo organizado para admin / user ──
              <>
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-2 py-1 text-muted-foreground">
                    Visão Geral
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visaoGeralItems.map((item) => (
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
                  <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-2 py-1 mt-2 text-muted-foreground">
                    Ativos & Recursos
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {ativosItems.map((item) => (
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
                  <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-2 py-1 mt-2 text-muted-foreground">
                    Operações & Suporte
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {operacoesItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            asChild 
                            className={`hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors duration-200 rounded-lg mb-1 ${
                              location.pathname === item.url ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium' : ''
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
                  <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-2 py-1 mt-2 text-muted-foreground">
                    Gestão & Pessoas
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {gestaoItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            asChild 
                            className={`hover:bg-purple-50 dark:hover:bg-purple-950 hover:text-purple-700 dark:hover:text-purple-300 transition-colors duration-200 rounded-lg mb-1 ${
                              location.pathname === item.url ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium' : ''
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
                      {currentUser.full_name?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {currentUser.full_name || currentUser.name || "Usuário"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
                className="flex-1 justify-start gap-2 text-xs"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
                <span>{darkMode ? "Modo Claro" : "Modo Escuro"}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sair do sistema"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="h-4 w-[1px] bg-border" />
              <span className="text-sm font-medium text-muted-foreground">
                Painel Administrativo
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(portalUrl, '_blank')}
                className="text-xs gap-2"
              >
                <span>Portal do Colaborador</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}