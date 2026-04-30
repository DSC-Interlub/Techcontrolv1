import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || SUPABASE_URL.includes('COLE_AQUI') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('COLE_AQUI')) {
  console.error(
    '[TechControl] Variáveis de ambiente do Supabase não configuradas.\n' +
    'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel (Settings → Environment Variables) e faça um novo deploy.'
  );
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder'
);
