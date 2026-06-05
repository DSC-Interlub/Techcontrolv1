import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    const safetyTimeout = setTimeout(() => {
      if (mounted) setIsLoadingAuth(false);
    }, 10000);

    async function loadProfile(sessionUser) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();
        return { ...sessionUser, ...(profile || {}) };
      } catch {
        return sessionUser;
      }
    }

    // Carrega sessão atual imediatamente (não espera por evento)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      clearTimeout(safetyTimeout);

      if (session?.user) {
        const fullUser = await loadProfile(session.user);
        if (mounted) {
          setUser(fullUser);
          setIsAuthenticated(true);
        }
      } else {
        if (mounted) {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      if (mounted) setIsLoadingAuth(false);
    }).catch(() => {
      if (mounted) setIsLoadingAuth(false);
    });

    // Mantém sync em mudanças subsequentes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          const fullUser = await loadProfile(session.user);
          if (mounted) {
            setUser(fullUser);
            setIsAuthenticated(true);
            setIsLoadingAuth(false);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout,
      navigateToLogin: () => { window.location.href = '/login'; },
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
