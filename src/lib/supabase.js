import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || SUPABASE_URL.includes('COLE_AQUI') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('COLE_AQUI')) {
  console.error(
    '[TechControl] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados no Vercel.'
  );
}

// Sem lock customizado — o lock serializa getSession() em CADA query,
// causando timeout em páginas com 7+ queries simultâneas.
// O lock nativo do browser (Web Locks API) funciona corretamente
// para uso em aba única; o aviso "lock stolen" no console é inofensivo.
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
