import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Headset, Calendar, Users, Phone, Activity,
  Settings, LogOut, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Início", url: createPageUrl("portal"), icon: LayoutDashboard },
  { title: "Meus Chamados", url: createPageUrl("portal-chamados"), icon: Headset },
  { title: "Reservar Notebook", url: createPageUrl("portal-reservas"), icon: Calendar },
  { title: "Sala de Treinamento", url: createPageUrl("portal-sala"), icon: Users },
  { title: "Meus Equipamentos", url: createPageUrl("portal-equipamentos"), icon: Activity },
  { title: "Lista de Ramais", url: createPageUrl("portal-ramais"), icon: Phone },
];

export default function PortalLayout({ children, colaborador, onLogout }) {
  const location = useLocation();

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
                <p className="text-xs text-blue-100">Portal do Colaborador</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">
                Menu
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
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
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4 bg-gray-50">
            {colaborador && (
              <div className="mb-3 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 font-semibold text-sm">
                      {colaborador.nome_completo?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{colaborador.nome_completo}</p>
                    <p className="text-xs text-gray-500 truncate">{colaborador.area}</p>
                  </div>
                </div>
                <Button onClick={onLogout} variant="outline" size="sm" className="w-full text-xs">
                  <LogOut className="w-3 h-3 mr-2" />
                  Sair
                </Button>
              </div>
            )}
            <div className="text-xs text-gray-600 text-center">
              <p className="font-semibold">TechControl</p>
              <p className="text-gray-500">Portal do Colaborador</p>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors" />
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