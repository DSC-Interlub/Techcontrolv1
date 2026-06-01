import { createSupabaseAdmin } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createSupabaseAdmin();
  const { action, email, senha, colaboradorId, novaSenha } = req.body || {};

  // ── Login ────────────────────────────────────────────────────────────────────
  if (action === 'login') {
    if (!email || !senha) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const { data: colaboradores, error } = await supabase
      .from('colaboradores')
      .select('id,nome_completo,email,area,tipo_funcionario,status,acesso_portal_bloqueado,senha_portal,senha_precisa_trocar,permissoes_comunicados')
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    if (error) return res.status(500).json({ error: 'Erro ao consultar banco de dados' });

    const colaborador = colaboradores?.[0];

    if (!colaborador) return res.status(401).json({ error: 'Email não encontrado. Verifique e tente novamente.' });
    if (colaborador.acesso_portal_bloqueado) return res.status(403).json({ error: 'Seu acesso ao portal está bloqueado. Entre em contato com o TI.' });
    if (colaborador.status === 'Desligado') return res.status(403).json({ error: 'Usuário inativo. Entre em contato com o TI.' });
    if (!colaborador.senha_portal) return res.status(403).json({ error: 'Senha de portal não configurada. Entre em contato com o TI.' });
    if (colaborador.senha_portal !== senha) return res.status(401).json({ error: 'Senha incorreta. Tente novamente.' });

    // Retorna dados sem senha
    const { senha_portal: _, ...dadosSeguros } = colaborador;

    return res.status(200).json({
      colaborador: dadosSeguros,
      precisaTrocarSenha: !!colaborador.senha_precisa_trocar,
    });
  }

  // ── Trocar Senha ─────────────────────────────────────────────────────────────
  if (action === 'changePassword') {
    if (!colaboradorId || !novaSenha) return res.status(400).json({ error: 'Dados incompletos' });
    if (novaSenha.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });

    const { error } = await supabase
      .from('colaboradores')
      .update({ senha_portal: novaSenha, senha_precisa_trocar: false })
      .eq('id', colaboradorId);

    if (error) return res.status(500).json({ error: 'Erro ao atualizar senha' });

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Ação inválida' });
}
