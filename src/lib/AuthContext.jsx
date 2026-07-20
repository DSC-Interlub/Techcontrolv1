import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // 1. Carrega a sessão inicial
    base44.auth.me()
      .then((u) => {
        setUser(u);
        setIsLoadingAuth(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoadingAuth(false);
      });

    // 2. Escuta mudanças de estado do Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoadingAuth(true);
      if (session?.user) {
        try {
          const u = await base44.auth.me();
          setUser(u);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoadingAuth(false);
    });

    return () => {
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