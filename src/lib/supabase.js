import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'techcontrol_supabase_auth_v1',
    // Desativa a Web Locks API concorrente do navegador que provocava a exceção de Lock Stolen
    lock: async (name, acquireTimeout, fn) => await fn()
  }
});