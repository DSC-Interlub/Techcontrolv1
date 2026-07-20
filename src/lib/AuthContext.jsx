import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: destrava o carregamento se a autenticação demorar mais de 3 segundos
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setIsLoadingAuth(false);
      }
    }, 3000);

    // 1. Carrega a sessão inicial
    base44.auth.me()
      .then((u) => {
        if (mounted) {
          setUser(u);
          setIsLoadingAuth(false);
          clearTimeout(timeoutId);
        }
      })
      .catch((err) => {
        console.error("[AuthContext] Erro ao carregar me():", err);
        if (mounted) {
          setUser(null);
          setIsLoadingAuth(false);
          clearTimeout(timeoutId);
        }
      });

    // 2. Escuta mudanças de estado do Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        try {
          const u = await base44.auth.me();
          if (mounted) setUser(u);
        } catch (err) {
          console.error("[AuthContext] Erro onAuthStateChange:", err);
          if (mounted) setUser(null);
        }
      } else {
        if (mounted) setUser(null);
      }
      if (mounted) setIsLoadingAuth(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const logout = () => {
    base44.auth.logout('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout,
      navigateToLogin: () => base44.auth.redirectToLogin(),
      checkAppState: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};