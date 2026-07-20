import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, Mail, Lock, Key, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Se já houver sessão ativa, redireciona para o Dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = "/Dashboard";
      } else {
        setCheckingSession(false);
      }
    }).catch(() => setCheckingSession(false));
  }, []);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (authError) throw authError;

      // Verifica se o usuário é um Administrador (existe na tabela profiles)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        // Desloga se não for admin
        await supabase.auth.signOut();
        throw new Error("Acesso negado. Esta área é restrita a administradores.");
      }

      window.location.href = "/Dashboard";
    } catch (err) {
      setError(err.message || "Falha na autenticação. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    if (!email) {
      setError("Por favor, digite seu e-mail para solicitar o link de acesso.");
      return;
    }

    setMagicLinkLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/Dashboard`
        }
      });

      if (otpError) throw otpError;
      setInfoMessage("Link mágico enviado! Verifique sua caixa de entrada e spam.");
    } catch (err) {
      setError(err.message || "Erro ao enviar Magic Link. Tente novamente.");
    } finally {
      setMagicLinkLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    if (!email) {
      setError("Por favor, informe seu e-mail para solicitar a recuperação de senha.");
      return;
    }

    setRecoveryLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (resetError) throw resetError;
      setInfoMessage("E-mail de recuperação de senha enviado! Verifique seu e-mail.");
    } catch (err) {
      setError(err.message || "Erro ao solicitar recuperação de senha.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4">
      {/* Círculos decorativos de background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Barra superior de destaque */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-indigo-500" />
        
        <CardHeader className="space-y-1 pb-6 text-center">
          <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-200 bg-clip-text text-transparent">
            TechControl
          </CardTitle>
          <CardDescription className="text-slate-400">
            Portal Administrativo e Gestão de TI
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-red-500/50 bg-red-950/50 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {infoMessage && (
            <Alert className="border-teal-500/50 bg-teal-950/50 text-teal-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-xs">{infoMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 text-sm font-medium">E-mail Corporativo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus-visible:ring-teal-500 focus-visible:border-teal-500"
                  disabled={loading || magicLinkLoading || recoveryLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">Senha</Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                  disabled={loading || magicLinkLoading || recoveryLoading}
                >
                  {recoveryLoading ? "Enviando..." : "Esqueceu a senha?"}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus-visible:ring-teal-500"
                  disabled={loading || magicLinkLoading || recoveryLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-medium shadow-md transition-all duration-200"
              disabled={loading || magicLinkLoading || recoveryLoading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Entrar com Senha"
              )}
            </Button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-600 text-xs font-semibold uppercase tracking-wider">ou</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleMagicLink}
            className="w-full border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-900 hover:text-teal-400 font-medium transition-all duration-200"
            disabled={loading || magicLinkLoading || recoveryLoading}
          >
            {magicLinkLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-teal-400" />
                Enviando Link...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Receber Link Mágico por E-mail
              </>
            )}
          </Button>
          
          <div className="text-center pt-2">
            <a
              href="/portal-login"
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium transition-all"
            >
              Ir para o Portal do Colaborador ➡️
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}