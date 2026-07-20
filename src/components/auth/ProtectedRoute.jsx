import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Carregando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redireciona via React Router mantendo a URL de destino desejada
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
