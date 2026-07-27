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

    const { email, role = 'user', nome_exibicao = '', full_name = '' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

    // Criar o usuário diretamente com senha provisória 'demo123' e marcar para troca obrigatória
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: 'demo123',
      email_confirm: true,
      user_metadata: { senha_precisa_trocar: true }
    });

    if (createError) throw createError;

    if (createData?.user?.id) {
      await supabase.from('profiles').upsert(
        { 
          id: createData.user.id, 
          email: email.trim().toLowerCase(), 
          role, 
          nome_exibicao: nome_exibicao || '', 
          full_name: full_name || '' 
        },
        { onConflict: 'id' }
      );
    }

    return res.status(200).json({ success: true, user: createData.user });
  } catch (err) {
    console.error('[createUser] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
