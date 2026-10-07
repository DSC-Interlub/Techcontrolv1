import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

function getEnv(key) {
  if (process.env[key]) return process.env[key];
  for (const envFile of ['.env.local', '.env']) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const [k, ...v] = line.trim().split('=');
        if (k === key) return v.join('=');
      }
    }
  }
  return null;
}

export function createSupabaseAdmin() {
  const url = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, serviceKey);
}
