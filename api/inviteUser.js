import { createSupabaseAdmin } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createSupabaseAdmin();

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Não autorizado' });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Não autorizado' });

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (callerProfile?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });

    const { email, role = 'user' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
    if (inviteError) throw inviteError;

    if (inviteData?.user?.id) {
      await supabase.from('profiles').upsert(
        { id: inviteData.user.id, email, role },
        { onConflict: 'id' }
      );
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[inviteUser] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
