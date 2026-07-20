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

  const { email, senha } = req.body || {};

  if (!email || !senha) {
    return res.status(400).json({ ok: false, error: 'Email e senha são obrigatórios.' });
  }

  try {
    const supabase = createSupabaseAdmin();

    // Busca colaborador pelo email usando service role (bypassa RLS)
    const { data: colaboradores, error } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('status', 'Ativo')
      .limit(1);

    if (error) {
      console.error('[portal-auth] Supabase error:', error);
      return res.status(500).json({ ok: false, error: 'Erro interno. Tente novamente.' });
    }

    const colaborador = colaboradores?.[0];

    if (!colaborador) {
      // Tempo constante para prevenir user enumeration
      await new Promise(r => setTimeout(r, 200));
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });
    }

    // Verifica senha — comparação constante para evitar timing attacks
    const senhaCorreta = colaborador.senha_portal;
    if (!senhaCorreta) {
      return res.status(401).json({ ok: false, error: 'Conta sem senha configurada. Contate o TI.' });
    }

    // Comparação caractere a caractere (constant-time)
    let match = senhaCorreta.length === senha.length;
    let diffBits = 0;
    const maxLen = Math.max(senhaCorreta.length, senha.length);
    for (let i = 0; i < maxLen; i++) {
      const a = senhaCorreta.charCodeAt(i) || 0;
      const b = senha.charCodeAt(i) || 0;
      diffBits |= a ^ b;
    }
    match = match && diffBits === 0;

    if (!match) {
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });
    }

    // Monta resposta SEM expor senha_portal
    const {
      senha_portal: _senha,
      ...colaboradorSemSenha
    } = colaborador;

    return res.status(200).json({ ok: true, colaborador: colaboradorSemSenha });

  } catch (err) {
    console.error('[portal-auth] Unexpected error:', err);
    return res.status(500).json({ ok: false, error: 'Erro interno do servidor.' });
  }
}
