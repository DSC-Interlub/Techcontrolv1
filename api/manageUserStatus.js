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

    const { email, ban = true } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

    const emailNorm = email.trim().toLowerCase();

    // 1. Localizar o profile e usuário em Auth
    const { data: profile } = await supabase.from('profiles').select('id, email').eq('email', emailNorm).maybeSingle();

    if (!profile) {
      return res.status(200).json({ 
        success: true, 
        message: 'Nenhum usuário de sistema (profiles/auth) vinculado a este e-mail.',
        userFound: false 
      });
    }

    // 2. Aplicar ban ou desbanimento via Supabase Auth Admin API
    const banDuration = ban ? '876000h' : 'none';
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      profile.id,
      { ban_duration: banDuration }
    );

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      userFound: true,
      userId: profile.id,
      banned: ban,
      banDuration,
      user: updatedUser?.user
    });
  } catch (err) {
    console.error('[manageUserStatus] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
