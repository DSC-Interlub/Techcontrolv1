import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook centralizado para dados do colaborador no portal.
 * - Retorna dados do sessionStorage IMEDIATAMENTE (zero delay)
 * - Em paralelo, busca dados frescos do banco UMA VEZ (staleTime: 5min)
 * - Atualiza sessionStorage e estado quando dados frescos chegam
 * - Cache compartilhado via queryKey ["portal_colaborador", email]
 *   → toda troca de rota usa o cache, sem rebuscar
 */
export function usePortalColaborador() {
  // Leitura síncrona do sessionStorage — sem delay, zero race condition
  const [colaborador, setColaborador] = useState(() => {
    try {
      const data = sessionStorage.getItem('portal_colaborador');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  });

  const email = colaborador?.email || null;
  const queryClient = useQueryClient();

  // Query com staleTime alto: só refaz a busca após 5 minutos de inatividade
  const { data: fresco } = useQuery({
    queryKey: ["portal_colaborador", email],
    queryFn: async () => {
      if (!email) return null;
      const results = await base44.entities.Colaboradores.filter({ email });
      return results?.[0] || null;
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000, // 5 minutos — não rebusca em troca de rota
    gcTime: 10 * 60 * 1000,   // mantém no cache por 10 minutos
  });

  // Quando dados frescos chegam, atualiza o sessionStorage e o estado local
  useEffect(() => {
    if (!fresco) return;
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
  }, [fresco]);

  const logout = () => {
    sessionStorage.removeItem('portal_colaborador');
    queryClient.clear();
    window.location.href = "/portal-login";
  };

  const temAcessoComunicados = Array.isArray(colaborador?.permissoes_comunicados) &&
    colaborador.permissoes_comunicados.length > 0;

  return { colaborador, temAcessoComunicados, logout };
}