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

  const { email, senha, colaboradorId } = req.body || {};

  if (!email || !senha) {
    return res.status(400).json({ ok: false, error: 'Email e senha são obrigatórios.' });
  }

  try {
    const supabase = createSupabaseAdmin();

    // Busca todos os colaboradores ativos com o email especificado usando service role (bypassa RLS)
    const { data: colaboradores, error } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('status', 'Ativo');

    if (error) {
      console.error('[portal-auth] Supabase error:', error);
      return res.status(500).json({ ok: false, error: 'Erro interno. Tente novamente.' });
    }

    if (!colaboradores || colaboradores.length === 0) {
      // Tempo constante para prevenir user enumeration
      await new Promise(r => setTimeout(r, 200));
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });
    }

    // Filtra colaboradores com senhas válidas
    const candidatosValidos = [];

    for (const colab of colaboradores) {
      const senhaCorreta = colab.senha_portal;
      if (!senhaCorreta) continue;

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

      if (match) {
        candidatosValidos.push(colab);
      }
    }

    if (candidatosValidos.length === 0) {
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });
    }

    // Se o frontend solicitou um colaboradorId específico (após a seleção)
    if (colaboradorId) {
      const colabMatch = candidatosValidos.find(c => c.id === colaboradorId);
      if (!colabMatch) {
        return res.status(401).json({ ok: false, error: 'Perfil inválido ou não autorizado.' });
      }

      const {
        senha_portal: _senha,
        ...colaboradorSemSenha
      } = colabMatch;

      return res.status(200).json({ ok: true, colaborador: colaboradorSemSenha });
    }

    // Se mais de um colaborador válido compartilha o e-mail, retorna a lista para escolha
    if (candidatosValidos.length > 1) {
      const candidatosSaneados = candidatosValidos.map(c => ({
        id: c.id,
        nome_completo: c.nome_completo,
        cargo: c.cargo,
        foto_url: c.foto_url
      }));

      return res.status(200).json({
        ok: true,
        precisaEscolherPerfil: true,
        candidatos: candidatosSaneados
      });
    }

    // Caso contrário (apenas 1 válido), login direto
    const colaborador = candidatosValidos[0];

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
