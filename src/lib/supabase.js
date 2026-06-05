import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || SUPABASE_URL.includes('COLE_AQUI') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('COLE_AQUI')) {
  console.error(
    '[TechControl] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados no Vercel.'
  );
}

// Lock customizado: fila simples que serializa operações de auth.
//
// POR QUE precisamos disso:
// A Web Locks API nativa do browser pode "roubar" o lock entre operações
// concorrentes, fazendo o onAuthStateChange falhar silenciosamente e
// mantendo `user` como null para sempre.
//
// POR QUE SEM TIMEOUT:
// A versão anterior tinha timeout de 8s que causava "supabase lock timeout".
// Cada fn() é leitura rápida de localStorage (~0ms), então a fila resolve
// em microssegundos. Só fica lenta se houver refresh de token (rede),
// mas isso acontece no máximo 1x por hora.
let _lockQueue = Promise.resolve();

function lock(_name, _timeout, fn) {
  const result = _lockQueue.then(
    () => fn(),
    () => fn()  // avança mesmo se a anterior falhou
  );
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
