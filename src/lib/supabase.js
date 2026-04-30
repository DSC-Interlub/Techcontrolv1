import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || SUPABASE_URL.includes('COLE_AQUI') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('COLE_AQUI')) {
  console.error(
    '[TechControl] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados no Vercel.'
  );
}

// Lock customizado: fila simples em vez de Web Locks API do browser.
// Resolve o "lock stolen" que ocorre com múltiplas queries simultâneas.
let _lockQueue = Promise.resolve();
function lock(_name, _timeout, fn) {
  const result = _lockQueue.then(() => fn(), () => fn());
  _lockQueue = result.then(() => {}, () => {});
  return result;
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      lock,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
