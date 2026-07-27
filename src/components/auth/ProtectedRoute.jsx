import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const location = useLocation();

  // Exibe a tela de carregamento APENAS no boot inicial da aplicação se ainda não soubermos o estado do usuário
  if (isLoadingAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !user) {
    // Redireciona via React Router sem destruir o estado do app
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.user_metadata?.senha_precisa_trocar) {
    return <Navigate to="/reset-password" replace />;
  }

  return <>{children}</>;
}
