const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    val = val.replace(/^["']|["']$/g, '');
    env[match[1]] = val.trim();
  }
});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAuth() {
  const { data } = await sb.auth.admin.listUsers();
  console.log('Auth users:', data.users.map(u => ({ email: u.email, id: u.id, banned: u.banned_until })));
}
checkAuth();
