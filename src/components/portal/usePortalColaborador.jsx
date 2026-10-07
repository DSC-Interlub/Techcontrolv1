import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabase";

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

  const id = colaborador?.id || null;
  const queryClient = useQueryClient();

  // Query para dados frescos do banco
  const { data: fresco } = useQuery({
    queryKey: ["portal_colaborador", id],
    queryFn: async () => {
      if (!id) return null;
      const result = await base44.entities.Colaboradores.get(id);
      return result || null;
    },
    enabled: !!id,
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 15 * 1000, // Verifica a cada 15 segundos ativamente
    refetchOnWindowFocus: true, // Ao voltar para a aba, verifica na hora
    gcTime: 10 * 60 * 1000,
  });

  const logout = () => {
    sessionStorage.removeItem('portal_colaborador');
    queryClient.clear();
    window.location.href = "/portal-login";
  };

  // Monitor de Segurança:
  // 1. Escuta canal de Broadcast em tempo real ('portal-security-room')
  // 2. Escuta Postgres Changes caso o schema suporte
  // 3. Checagem periódica a cada 3 segundos via query rápida do status atual do colaborador
  useEffect(() => {
    if (!id) return;

    // Checagem imediata local
    if (fresco && (fresco.status === 'Desligado' || fresco.acesso_portal_bloqueado === true)) {
      console.warn('[Segurança] Colaborador desligado ou bloqueado detectado. Encerrando sessão do portal imediatamente.');
      logout();
      return;
    }

    // 1. Canal Broadcast Global de Segurança
    const channelName = `portal-security-room`;
    const secChannel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'colaborador-desligado' }, (payload) => {
        const pId = payload?.payload?.colaborador_id;
        const pEmail = payload?.payload?.email;
        if (pId === id || (pEmail && colaborador?.email && pEmail.toLowerCase() === colaborador.email.toLowerCase())) {
          console.warn('[Segurança Broadcast] Evento de desligamento recebido em tempo real! Deslogando...');
          logout();
        }
      })
      .subscribe();

    // 2. Polling ativo ultra-leve a cada 3 segundos para garantir deslogamento imediato
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('status, acesso_portal_bloqueado')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          if (data.status === 'Desligado' || data.acesso_portal_bloqueado === true) {
            console.warn('[Segurança Monitor] Desligamento/bloqueio detectado pelo monitor ativo! Deslogando...');
            logout();
          }
        }
      } catch (e) {
        // Silencioso em caso de erro de rede transitório
      }
    }, 3000);

    return () => {
      supabase.removeChannel(secChannel);
      clearInterval(interval);
    };
  }, [id, fresco, colaborador?.email]);

  // Quando dados frescos chegam (e válidos), atualiza o sessionStorage e o estado local
  useEffect(() => {
    if (!fresco) return;
    if (fresco.status === 'Desligado' || fresco.acesso_portal_bloqueado === true) {
      logout();
      return;
    }
    const sessao = {
      id: fresco.id,
      nome_completo: fresco.nome_completo,
      email: fresco.email,
      area: fresco.area,
      tipo_funcionario: fresco.tipo_funcionario,
      eh_comprador: fresco.eh_comprador ?? false,
      eh_facilities: fresco.eh_facilities ?? false,
      eh_comunicacao_branding: fresco.eh_comunicacao_branding ?? false,
      eh_conexao_humana: fresco.eh_conexao_humana ?? false,
      permissoes_comunicados: fresco.permissoes_comunicados || [],
    };
    sessionStorage.setItem('portal_colaborador', JSON.stringify(sessao));
    setColaborador(sessao);
  }, [fresco]);

  const temAcessoComunicados =
    Boolean(colaborador?.eh_comunicacao_branding) ||
    Boolean(colaborador?.eh_conexao_humana) ||
    colaborador?.area === "Comunicação e Branding" ||
    colaborador?.area === "Conexão Humana" ||
    (Array.isArray(colaborador?.permissoes_comunicados) && colaborador.permissoes_comunicados.length > 0);

  const isEquipeFacilities =
    Boolean(colaborador?.eh_facilities) ||
    colaborador?.area?.toLowerCase().includes("facilities");

  const isComprador =
    Boolean(colaborador?.eh_comprador) ||
    colaborador?.area?.toLowerCase().includes("compras");

  return { colaborador, temAcessoComunicados, isEquipeFacilities, isComprador, logout };
}