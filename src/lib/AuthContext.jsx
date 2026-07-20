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
      // Mantém o estado anterior se houver
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Dispara a busca inicial de sessão imediatamente no boot
    fetchCurrentUser();

    // Escuta alterações reativas na sessão do Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoadingAuth(false);
      } else if (session?.user) {
        try {
          const u = await base44.auth.me();
          if (mounted && u) {
            setUser(u);
          }
        } catch (err) {
          console.warn("[AuthContext] Erro ao atualizar perfil em " + event + ":", err);
        } finally {
          if (mounted) setIsLoadingAuth(false);
        }
      } else {
        if (mounted) setIsLoadingAuth(false);
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