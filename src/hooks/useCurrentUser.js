import { useAuth } from '@/lib/AuthContext';

export function useCurrentUser() {
  const { user, isLoadingAuth: loading } = useAuth();
  return { user, loading };
}
