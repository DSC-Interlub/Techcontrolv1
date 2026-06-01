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
      refetchOnWindowFocus: false,
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
