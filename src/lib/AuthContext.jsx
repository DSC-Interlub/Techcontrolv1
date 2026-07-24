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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        sessionStorage.removeItem('techcontrol_user_cache');
        setIsLoadingAuth(false);
      } else {
        // b) Construa o usuário/sessão inicial de forma síncrona usando apenas o parâmetro session já recebido pelo callback
        const userObj = session.user;
        const baseUser = {
          id: userObj.id,
          email: userObj.email,
          role: userObj.app_metadata?.role || userObj.user_metadata?.role || 'admin',
          name: userObj.user_metadata?.full_name || userObj.user_metadata?.name || userObj.email
        };

        setUser(baseUser);
        sessionStorage.setItem('techcontrol_user_cache', JSON.stringify(baseUser));
        setIsLoadingAuth(false);

        // c) Qualquer chamada adicional ao Supabase necessária (buscar perfil, role, etc.) seja adiada com setTimeout(fn, 0) para rodar depois que o callback termina
        setTimeout(async () => {
          if (!mounted) return;
          try {
            // Busca dados complementares de perfil (profiles / colaboradores) usando chamadas diretas de banco (NÃO usando auth.*)
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userObj.id)
              .maybeSingle();

            if (profile && mounted) {
               const updatedUser = {
                ...baseUser,
                role: profile.role || baseUser.role,
                name: profile.full_name || profile.nome_exibicao || baseUser.name
              };
              setUser(updatedUser);
              sessionStorage.setItem('techcontrol_user_cache', JSON.stringify(updatedUser));
              return;
            }

            const { data: colab } = await supabase
              .from('colaboradores')
              .select('*')
              .eq('id', userObj.id)
              .maybeSingle();

            if (colab && mounted) {
              const updatedUser = {
                ...baseUser,
                role: 'colaborador',
                name: colab.nome_completo || baseUser.name
              };
              setUser(updatedUser);
              sessionStorage.setItem('techcontrol_user_cache', JSON.stringify(updatedUser));
            }
          } catch (err) {
            console.warn("[AuthContext] Erro ao carregar detalhes complementares no setTimeout:", err);
          }
        }, 0);
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