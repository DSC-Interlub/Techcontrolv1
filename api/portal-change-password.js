import { createSupabaseAdmin } from './_supabase.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeaders(CORS).end();
  }

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { colaboradorId, novaSenha } = req.body || {};

  if (!colaboradorId || !novaSenha) {
    return res.status(400).json({ ok: false, error: 'Colaborador e nova senha são obrigatórios.' });
  }

  if (novaSenha.length < 6) {
    return res.status(400).json({ ok: false, error: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const supabase = createSupabaseAdmin();

    // Primeiro buscamos o colaborador para garantir que ele existe e precisa trocar a senha
    const { data: colaborador, error: fetchError } = await supabase
      .from('colaboradores')
      .select('id, senha_precisa_trocar')
      .eq('id', colaboradorId)
      .single();

    if (fetchError || !colaborador) {
      return res.status(404).json({ ok: false, error: 'Colaborador não encontrado.' });
    }

    // Atualizamos a senha_portal e a flag senha_precisa_trocar
    const { error: updateError } = await supabase
      .from('colaboradores')
      .update({
        senha_portal: novaSenha,
        senha_precisa_trocar: false
      })
      .eq('id', colaboradorId);

    if (updateError) {
      console.error('[portal-change-password] Update error:', updateError);
      return res.status(500).json({ ok: false, error: 'Erro ao atualizar a senha.' });
    }

    return res.status(200).json({ ok: true, message: 'Senha atualizada com sucesso.' });

  } catch (err) {
    console.error('[portal-change-password] Unexpected error:', err);
    return res.status(500).json({ ok: false, error: 'Erro interno do servidor.' });
  }
}
