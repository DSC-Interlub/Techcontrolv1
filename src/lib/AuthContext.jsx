import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      return u;
    } catch (err) {
      console.error("[AuthContext] Erro ao carregar usuário:", err);
      setUser(null);
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Timeout de segurança absoluto para garantir que a aplicação nunca fique presa no estado de loading
    const safetyTimer = setTimeout(() => {
      if (mounted && isLoadingAuth) {
        console.warn("[AuthContext] Timeout de segurança atingido. Destravando carregamento.");
        setIsLoadingAuth(false);
      }
    }, 4000);

    // Escuta alterações na sessão do Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setIsLoadingAuth(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        try {
          const u = await base44.auth.me();
          if (mounted) setUser(u);
        } catch (err) {
          console.error("[AuthContext] Erro ao carregar perfil em " + event + ":", err);
          if (mounted) setUser(null);
        } finally {
          if (mounted) setIsLoadingAuth(false);
        }
      } else {
        if (mounted) setIsLoadingAuth(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async (redirectTo = '/login') => {
    setIsLoadingAuth(true);
    try {
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