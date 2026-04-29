import { createSupabaseAdmin } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createSupabaseAdmin();

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Não autorizado' });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Não autorizado' });

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });

    const { data: usuarios } = await supabase.from('profiles').select('*').order('full_name');
    return res.status(200).json({ usuarios: usuarios || [] });
  } catch (err) {
    console.error('[listarUsuarios] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
