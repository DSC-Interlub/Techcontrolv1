import { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";

export function usePortalAuth() {
  const [colaborador, setColaborador] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = sessionStorage.getItem('portal_colaborador');
    if (data) {
      try {
        setColaborador(JSON.parse(data));
      } catch {
        sessionStorage.removeItem('portal_colaborador');
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    sessionStorage.removeItem('portal_colaborador');
    window.location.href = createPageUrl("portal-login");
  };

  const requireAuth = () => {
    if (!loading && !colaborador) {
      window.location.href = createPageUrl("portal-login");
      return false;
    }
    return true;
  };

  return { colaborador, loading, logout, requireAuth };
}