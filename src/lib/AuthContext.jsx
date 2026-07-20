import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

const getInitialUser = () => {
  try {
    const cached = sessionStorage.getItem('techcontrol_user_cache');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getInitialUser);
  const [isLoadingAuth, setIsLoadingAuth] = useState(!user);

  const fetchCurrentUser = useCallback(async () => {
    console.log("[DEBUG-AUTH] fetchCurrentUser started. Current isLoadingAuth:", isLoadingAuth);
    try {
      const u = await base44.auth.me();
      console.log("[DEBUG-AUTH] fetchCurrentUser resolved user:", u?.email || "none");
      setUser(u);
      if (u) {
        sessionStorage.setItem('techcontrol_user_cache', JSON.stringify(u));
      } else {
        sessionStorage.removeItem('techcontrol_user_cache');
      }
      return u;
    } catch (err) {
      console.error("[DEBUG-AUTH] [AuthContext] Erro ao carregar usuário:", err);
      return null;
    } finally {
      setIsLoadingAuth(false);
      console.log("[DEBUG-AUTH] fetchCurrentUser completed. New isLoadingAuth: false");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Dispara a busca inicial de sessão
    fetchCurrentUser();

    // Escuta alterações na sessão do Supabase Auth
    console.log("[DEBUG-AUTH] Setting up supabase.auth.onAuthStateChange listener");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[DEBUG-AUTH] onAuthStateChange event fired: ${event} | User email: ${session?.user?.email || "none"}`);
      if (!mounted) {
        console.log("[DEBUG-AUTH] onAuthStateChange event skipped (component unmounted)");
        return;
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        sessionStorage.removeItem('techcontrol_user_cache');
        setIsLoadingAuth(false);
        console.log("[DEBUG-AUTH] event SIGNED_OUT handled");
      } else if (session?.user) {
        try {
          const u = await base44.auth.me();
          if (mounted && u) {
            setUser(u);
            sessionStorage.setItem('techcontrol_user_cache', JSON.stringify(u));
            console.log("[DEBUG-AUTH] event SIGNED_IN/TOKEN_REFRESHED handled successfully");
          }
        } catch (err) {
          console.warn("[DEBUG-AUTH] [AuthContext] Erro ao atualizar perfil em " + event + ":", err);
        } finally {
          if (mounted) {
            setIsLoadingAuth(false);
            console.log("[DEBUG-AUTH] Auth resolution completed for event:", event);
          }
        }
      } else {
        if (mounted) {
          setIsLoadingAuth(false);
          console.log("[DEBUG-AUTH] No session user, set isLoadingAuth to false");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchCurrentUser]);

  const logout = async (redirectTo = '/login') => {
    setIsLoadingAuth(true);
    try {
      sessionStorage.removeItem('techcontrol_user_cache');
      await base44.auth.logout(redirectTo);
    } finally {
      setUser(null);
      setIsLoadingAuth(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoadingAuth,
      refreshUser: fetchCurrentUser,
      logout,
      navigateToLogin: () => {
        if (typeof window !== 'undefined') window.location.href = '/login';
      },
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};