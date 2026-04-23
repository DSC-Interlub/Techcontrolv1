import { useState } from "react";
import { createPageUrl } from "@/utils";
import { usePortalColaborador } from "./usePortalColaborador";

/**
 * Hook de autenticação do portal.
 * Delega ao usePortalColaborador (que usa cache React Query compartilhado com staleTime 5min).
 * Resultado: dados disponíveis imediatamente do sessionStorage, sem race condition.
 */
export function usePortalAuth() {
  const { colaborador, logout: logoutBase } = usePortalColaborador();

  // loading é false imediatamente pois lemos sessionStorage de forma síncrona
  const loading = false;

  const logout = () => {
    sessionStorage.removeItem('portal_colaborador');
    window.location.href = createPageUrl("portal-login");
  };

  const requireAuth = () => {
    if (!colaborador) {
      window.location.href = createPageUrl("portal-login");
      return false;
    }
    return true;
  };

  return { colaborador, loading, logout, requireAuth };
}