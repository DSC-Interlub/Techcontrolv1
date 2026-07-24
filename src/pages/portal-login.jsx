import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Eye, EyeOff, Loader2, AlertCircle, Lock, Users } from "lucide-react";
import { createPageUrl } from "@/utils";

function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PortalLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  // Estado para escolher perfil em logins com múltiplos colaboradores no mesmo e-mail
  const [escolherPerfil, setEscolherPerfil] = useState(false);
  const [candidatos, setCandidatos] = useState([]);

  // Estado para troca de senha obrigatória
  const [trocarSenha, setTrocarSenha] = useState(false);
  const [colaboradorLogando, setColaboradorLogando] = useState(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const res = await fetch('/api/portal-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), senha: senha })
      });
      const data = await res.json();
      
      if (!data.ok) throw new Error(data.error || 'Credenciais invalidas');

      if (data.precisaEscolherPerfil) {
        setCandidatos(data.candidatos);
        setEscolherPerfil(true);
        setLoading(false);
        return;
      }

      const colaborador = data.colaborador;

      // Verifica se precisa trocar senha
      if (colaborador.senha_precisa_trocar) {
        setColaboradorLogando(colaborador);
        setTrocarSenha(true);
        setLoading(false);
        return;
      }

      // Salva a sessão no sessionStorage para retrocompatibilidade
      sessionStorage.setItem('portal_colaborador', JSON.stringify({
        id: colaborador.id,
        nome_completo: colaborador.nome_completo,
        email: colaborador.email,
        area: colaborador.area,
        tipo_funcionario: colaborador.tipo_funcionario,
        permissoes_comunicados: colaborador.permissoes_comunicados || [],
      }));

      window.location.href = createPageUrl("portal");
    } catch (err) {
      setErro(err.message || "Erro desconhecido ao logar.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarPerfil = async (candidato) => {
    setErro("");
    setLoading(true);

    try {
      const res = await fetch('/api/portal-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), senha: senha, colaboradorId: candidato.id })
      });
      const data = await res.json();
      
      if (!data.ok) throw new Error(data.error || 'Erro ao selecionar perfil');

      const colaborador = data.colaborador;

      // Verifica se precisa trocar senha
      if (colaborador.senha_precisa_trocar) {
        setColaboradorLogando(colaborador);
        setTrocarSenha(true);
        setEscolherPerfil(false);
        setLoading(false);
        return;
      }

      // Salva a sessão no sessionStorage
      sessionStorage.setItem('portal_colaborador', JSON.stringify({
        id: colaborador.id,
        nome_completo: colaborador.nome_completo,
        email: colaborador.email,
        area: colaborador.area,
        tipo_funcionario: colaborador.tipo_funcionario,
        permissoes_comunicados: colaborador.permissoes_comunicados || [],
      }));

      window.location.href = createPageUrl("portal");
    } catch (err) {
      setErro(err.message || "Erro desconhecido ao selecionar perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrocarSenha = async (e) => {
    e.preventDefault();
    setErro("");

    if (novaSenha.length < 6) { 
      setErro("A senha deve ter pelo menos 6 caracteres."); 
      return; 
    }
    if (novaSenha !== confirmarSenha) { 
      setErro("As senhas não coincidem."); 
      return; 
    }

    setSalvandoSenha(true);
    try {
      // Chama o endpoint de backend seguro para atualizar a senha
      const res = await fetch('/api/portal-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaboradorId: colaboradorLogando.id,
          novaSenha: novaSenha
        })
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Erro ao salvar a nova senha.');

      // Salva a sessão no sessionStorage
      sessionStorage.setItem('portal_colaborador', JSON.stringify({
        id: colaboradorLogando.id,
        nome_completo: colaboradorLogando.nome_completo,
        email: colaboradorLogando.email,
        area: colaboradorLogando.area,
        tipo_funcionario: colaboradorLogando.tipo_funcionario,
        permissoes_comunicados: colaboradorLogando.permissoes_comunicados || [],
      }));

      window.location.href = createPageUrl("portal");
    } catch (err) {
      setErro(err.message || "Erro ao salvar a nova senha.");
    } finally {
      setSalvandoSenha(false);
    }
  };

  if (escolherPerfil && candidatos.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">TechControl</h1>
            <p className="text-gray-600 mt-1">Escolha seu perfil</p>
          </div>

          <Card className="shadow-2xl">
            <CardHeader className="border-b">
              <CardTitle className="text-center text-lg">Quem é você?</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {erro && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-800">{erro}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-3">
                {candidatos.map((cand) => {
                  const initials = getInitials(cand.nome_completo);
                  return (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => handleSelecionarPerfil(cand)}
                      disabled={loading}
                      className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all duration-200 group w-full"
                    >
                      {cand.foto_url ? (
                        <img
                          src={cand.foto_url}
                          alt={cand.nome_completo}
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 group-hover:border-blue-500 transition-colors"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm group-hover:bg-blue-200 transition-colors shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                          {cand.nome_completo}
                        </p>
                        {cand.cargo && (
                          <p className="text-xs text-slate-500 truncate">{cand.cargo}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                className="w-full rounded-xl border-slate-200"
                onClick={() => {
                  setEscolherPerfil(false);
                  setCandidatos([]);
                  setErro("");
                }}
                disabled={loading}
              >
                Voltar ao Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (trocarSenha && colaboradorLogando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">TechControl</h1>
            <p className="text-gray-600 mt-1">Defina sua senha de acesso</p>
          </div>

          <Card className="shadow-2xl">
            <CardHeader className="border-b">
              <CardTitle className="text-center text-lg">Primeiro Acesso</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-800">
                  Olá, <strong>{colaboradorLogando.nome_completo.split(' ')[0]}</strong>!
                  Por segurança, você precisa definir uma senha pessoal antes de continuar.
                </p>
              </div>

              <form onSubmit={handleTrocarSenha} className="space-y-4">
                {erro && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800">{erro}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label>Nova Senha</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showNovaSenha ? "text" : "password"}
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowNovaSenha(!showNovaSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Confirmar Nova Senha</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showConfirmarSenha ? "text" : "password"}
                      required
                      placeholder="Repita a senha"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirmarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 mt-2" disabled={salvandoSenha}>
                  {salvandoSenha ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Definir Senha e Entrar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">TechControl</h1>
          <p className="text-gray-600 mt-1">Portal do Colaborador</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="border-b">
            <CardTitle className="text-center text-lg">Entrar no Portal</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {erro && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-800">{erro}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label>E-mail corporativo</Label>
                <Input type="email" required placeholder="seu@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label>Senha</Label>
                <div className="relative mt-1">
                  <Input
                    type={showSenha ? "text" : "password"}
                    required placeholder="••••••••"
                    value={senha} onChange={(e) => setSenha(e.target.value)} className="pr-10"
                  />
                  <button type="button" onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-2" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Entrando...</> : "Entrar"}
              </Button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-4">
              Problemas de acesso? Entre em contato com o TI.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}