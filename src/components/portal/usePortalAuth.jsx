import { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { usePortalColaborador } from "./usePortalColaborador";

export function usePortalAuth() {
  const { colaborador, logout: logoutBase } = usePortalColaborador();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // loading starts true, becomes false after checking sessionStorage
    setLoading(false);
  }, []);

  const getColaborador = () => {
    try {
      const data = sessionStorage.getItem('portal_colaborador');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Erro ao ler portal_colaborador do sessionStorage", e);
      return null;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('portal_colaborador');
    window.location.href = createPageUrl("portal-login");
  };

  const requireAuth = () => {
    const user = getColaborador();
    if (!user) {
      window.location.href = createPageUrl("portal-login");
      return false;
    }
    return true;
  };

  return { colaborador: getColaborador() || colaborador, getColaborador, loading, logout, requireAuth };
}