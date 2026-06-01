import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || SUPABASE_URL.includes('COLE_AQUI') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('COLE_AQUI')) {
  console.error(
    '[TechControl] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados no Vercel.'
  );
}

// Lock customizado com timeout de segurança.
// Se fn() travar (ex: refresh de token sem resposta), o timeout desbloqeia a fila
// evitando que mutations e queries fiquem em isPending eterno.
let _lockQueue = Promise.resolve();

function lock(_name, _timeout, fn) {
  const timeoutMs = (typeof _timeout === 'number' && _timeout > 0) ? Math.min(_timeout, 10000) : 8000;

  const result = _lockQueue.then(
    () => Promise.race([
      Promise.resolve().then(fn),
      new Promise((_, reject) => setTimeout(() => reject(new Error('supabase lock timeout')), timeoutMs)),
    ]),
    () => Promise.race([
      Promise.resolve().then(fn),
      new Promise((_, reject) => setTimeout(() => reject(new Error('supabase lock timeout')), timeoutMs)),
    ])
  );

  // _lockQueue avança mesmo se fn() falhar ou travar
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
