import { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export function usePortalAuth() {
  const [colaborador, setColaborador] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = sessionStorage.getItem('portal_colaborador');
    if (!data) {
      setLoading(false);
      return;
    }
    let cached;
    try {
      cached = JSON.parse(data);
    } catch {
      sessionStorage.removeItem('portal_colaborador');
      setLoading(false);
      return;
    }
    // Re-busca dados atualizados do banco para garantir permissões em tempo real
    base44.entities.Colaboradores.filter({ id: cached.id }).then(results => {
      const fresco = results?.[0];
      if (!fresco) {
        sessionStorage.removeItem('portal_colaborador');
        setLoading(false);
        return;
      }
      const sessao = {
        id: fresco.id,
        nome_completo: fresco.nome_completo,
        email: fresco.email,
        area: fresco.area,
        tipo_funcionario: fresco.tipo_funcionario,
        permissoes_comunicados: fresco.permissoes_comunicados || [],
      };
      sessionStorage.setItem('portal_colaborador', JSON.stringify(sessao));
      setColaborador(sessao);
      setLoading(false);
    }).catch(() => {
      // fallback: usa cache local se banco falhar
      setColaborador(cached);
      setLoading(false);
    });
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