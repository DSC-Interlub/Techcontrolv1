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
    try {
      const u = await base44.auth.me();
      setUser(u);
      if (u) {
        sessionStorage.setItem('techcontrol_user_cache', JSON.stringify(u));
      } else {
        sessionStorage.removeItem('techcontrol_user_cache');
      }
      return u;
    } catch (err) {
      console.error("[AuthContext] Erro ao carregar usuário:", err);
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Dispara a busca inicial de sessão
    fetchCurrentUser();

    // Escuta alterações na sessão do Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        sessionStorage.removeItem('techcontrol_user_cache');
        setIsLoadingAuth(false);
      } else if (session?.user) {
        try {
          const u = await base44.auth.me();
          if (mounted && u) {
            setUser(u);
            sessionStorage.setItem('techcontrol_user_cache', JSON.stringify(u));
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