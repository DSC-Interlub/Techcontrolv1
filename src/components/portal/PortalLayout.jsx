import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { usePortalColaborador } from "./usePortalColaborador";
import {
  LayoutDashboard, Headset, Calendar, Users, Phone, Activity,
  Settings, LogOut, Sun, Moon, KeyRound, X, Eye, EyeOff, Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

const staticNavItems = [
  { title: "Início", url: createPageUrl("portal"), icon: LayoutDashboard },
  { title: "Meus Chamados", url: createPageUrl("portal-chamados"), icon: Headset },
  { title: "Reservar Notebook", url: createPageUrl("portal-reservas"), icon: Calendar },
  { title: "Sala de Treinamento", url: createPageUrl("portal-sala"), icon: Users },
  { title: "Meus Equipamentos", url: createPageUrl("portal-equipamentos"), icon: Activity },
  { title: "Lista de Ramais", url: createPageUrl("portal-ramais"), icon: Phone },
];

export default function PortalLayout({ children, colaborador: colaboradorProp, onLogout }) {
  const location = useLocation();
  // Usa o hook centralizado que retorna dados do sessionStorage imediatamente
  // (staleTime 5min no React Query — sem rebuscar a cada troca de rota)
  const { colaborador: colaboradorHook, temAcessoComunicados } = usePortalColaborador();
  // Usa dados da prop se disponível (compatibilidade), senão usa o hook
  const colaborador = colaboradorProp || colaboradorHook;
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('techcontrol_theme') === 'dark');
  const [showTrocarSenha, setShowTrocarSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenhas, setShowSenhas] = useState({});
  const [mensagem, setMensagem] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('techcontrol_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('techcontrol_theme', 'light');
    }
  }, [darkMode]);

  const handleTrocarSenha = async (e) => {
    e.preventDefault();
    setMensagem(null);

    if (novaSenha.length < 6) {
      setMensagem({ tipo: "erro", texto: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setMensagem({ tipo: "erro", texto: "As senhas não coincidem." });
      return;
    }

    setSalvando(true);

    // Buscar colaborador atual para verificar senha atual
    const colaboradores = await base44.entities.Colaboradores.filter({ email: colaborador.email });
    const colabAtual = colaboradores[0];

    if (!colabAtual) {
      setMensagem({ tipo: "erro", texto: "Erro ao localizar seu cadastro." });
      setSalvando(false);
      return;
    }

    if (colabAtual.senha_portal !== senhaAtual) {
      setMensagem({ tipo: "erro", texto: "Senha atual incorreta." });
      setSalvando(false);
      return;
    }

    await base44.entities.Colaboradores.update(colabAtual.id, {
      senha_portal: novaSenha,
      senha_precisa_trocar: false,
    });

    setMensagem({ tipo: "sucesso", texto: "Senha alterada com sucesso!" });
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarSenha("");
    setSalvando(false);

    setTimeout(() => {
      setShowTrocarSenha(false);
      setMensagem(null);
    }, 2000);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="border-b border-border p-4 bg-gradient-to-r from-blue-600 to-blue-700">
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
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-2 py-2">
                Menu
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {staticNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300 transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {/* Comunicados — visível apenas se tiver permissão (usa hook com cache, sem piscar) */}
                  {temAcessoComunicados && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-indigo-50 hover:text-indigo-700 transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname.includes('portal-comunicados') ? 'bg-indigo-50 text-indigo-700 font-medium' : ''
                        }`}
                      >
                        <Link to={createPageUrl("portal-comunicados")} className="flex items-center gap-3 px-3 py-2">
                          <Megaphone className="w-4 h-4" />
                          <span>Comunicados</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-4">
            {colaborador && (
              <div className="mb-3 pb-3 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 dark:text-blue-300 font-semibold text-sm">
                      {colaborador.nome_completo?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{colaborador.nome_completo}</p>
                    <p className="text-xs text-muted-foreground truncate">{colaborador.area}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={onLogout} variant="outline" size="sm" className="flex-1 text-xs">
                    <LogOut className="w-3 h-3 mr-2" />
                    Sair
                  </Button>
                  <Button
                    onClick={() => setShowTrocarSenha(true)}
                    variant="outline"
                    size="sm"
                    title="Alterar senha"
                  >
                    <KeyRound className="w-3 h-3" />
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
              <p className="font-semibold">TechControl</p>
              <p>Portal do Colaborador</p>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-background border-b border-border px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-muted p-2 rounded-lg transition-colors" />
              <h1 className="text-xl font-bold">TechControl</h1>
            </div>
          </header>
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Modal Trocar Senha */}
      {showTrocarSenha && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-lg">Alterar Senha</h2>
              </div>
              <button onClick={() => { setShowTrocarSenha(false); setMensagem(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTrocarSenha} className="p-5 space-y-4">
              {mensagem && (
                <div className={`rounded-lg px-4 py-3 text-sm ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800' : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800'}`}>
                  {mensagem.texto}
                </div>
              )}
              <div>
                <Label>Senha Atual</Label>
                <div className="relative mt-1">
                  <Input
                    type={showSenhas.atual ? "text" : "password"}
                    required
                    placeholder="Sua senha atual"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowSenhas(s => ({ ...s, atual: !s.atual }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showSenhas.atual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Nova Senha</Label>
                <div className="relative mt-1">
                  <Input
                    type={showSenhas.nova ? "text" : "password"}
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowSenhas(s => ({ ...s, nova: !s.nova }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showSenhas.nova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirmar Nova Senha</Label>
                <div className="relative mt-1">
                  <Input
                    type={showSenhas.confirmar ? "text" : "password"}
                    required
                    placeholder="Repita a nova senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowSenhas(s => ({ ...s, confirmar: !s.confirmar }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showSenhas.confirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowTrocarSenha(false); setMensagem(null); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={salvando}>
                  {salvando ? "Salvando..." : "Alterar Senha"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}