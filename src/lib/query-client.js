import { QueryClient, MutationCache } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

function getMutationErrorMessage(error) {
  if (!error) return 'Erro desconhecido';

  // Supabase PostgREST errors
  const msg = error?.message || error?.error_description || String(error);

  if (msg.includes('column') && msg.includes('does not exist'))
    return `Coluna ausente no banco de dados: ${msg}`;
  if (msg.includes('violates row-level security'))
    return 'Permissão negada pelo banco de dados. Verifique as políticas RLS.';
  if (msg.includes('JWT') || msg.includes('token'))
    return 'Sessão expirada. Faça login novamente.';
  if (msg.includes('duplicate key') || msg.includes('already exists'))
    return 'Registro duplicado: já existe um item com esses dados.';
  if (msg.includes('violates not-null') || msg.includes('null value'))
    return 'Campo obrigatório em branco no banco de dados.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Erro de conexão. Verifique sua internet e tente novamente.';

  return msg || 'Erro ao salvar. Tente novamente.';
}

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minuto de dados aquecidos sem re-fetch compulsivo
      gcTime: 10 * 60 * 1000, // 10 minutos para Garbage Collection em memória
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      const description = getMutationErrorMessage(error);
      toast({
        title: 'Erro ao salvar',
        description,
        variant: 'destructive',
      });
      console.error('[Mutation Error]', error);
    },
  }),
});

// Instrument React Query cache updates to track loading and pending states and run a watchdog
const queryWatchdogs = new Map();

queryClientInstance.getQueryCache().subscribe((event) => {
  if (event.type === 'updated') {
    const { query } = event;
    const queryKey = query.queryKey;
    const queryHash = query.queryHash;
    const status = query.state.status;
    const fetchStatus = query.state.fetchStatus;
    
    console.log(`[DEBUG-QUERY] Key: ${JSON.stringify(queryKey)} | Status: ${status} | FetchStatus: ${fetchStatus}`);

    if (fetchStatus === 'fetching') {
      if (!queryWatchdogs.has(queryHash)) {
        const timer = setTimeout(() => {
          console.warn(
            `[WATCHDOG-WARNING] A query com a chave ${JSON.stringify(queryKey)} está em estado 'fetching' há mais de 15 segundos sem responder. Possível travamento ou deadlock detectado.`
          );
        }, 15000);
        queryWatchdogs.set(queryHash, timer);
      }
    } else {
      if (queryWatchdogs.has(queryHash)) {
        clearTimeout(queryWatchdogs.get(queryHash));
        queryWatchdogs.delete(queryHash);
      }
    }
  }
});

