import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    if (action === 'login') {
      const { email, senha } = body;
      if (!email || !senha) {
        return Response.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });
      }

      const colaboradores = await base44.asServiceRole.entities.Colaboradores.filter({ email: email.toLowerCase().trim() });
      const colaborador = colaboradores?.[0];

      if (!colaborador) {
        return Response.json({ error: 'E-mail não cadastrado no sistema' }, { status: 401 });
      }

      if (colaborador.acesso_portal_bloqueado) {
        return Response.json({ error: 'Acesso bloqueado. Entre em contato com o TI.' }, { status: 403 });
      }

      if (colaborador.status === 'Desligado') {
        return Response.json({ error: 'Colaborador desligado. Acesso não permitido.' }, { status: 403 });
      }

      if (colaborador.senha_portal !== senha) {
        return Response.json({ error: 'Senha incorreta' }, { status: 401 });
      }

      if (colaborador.senha_precisa_trocar) {
        return Response.json({ precisaTrocarSenha: true, colaborador });
      }

      return Response.json({ success: true, colaborador });
    }

    if (action === 'changePassword') {
      const { colaboradorId, novaSenha } = body;
      if (!colaboradorId || !novaSenha) {
        return Response.json({ error: 'Dados inválidos' }, { status: 400 });
      }

      const colaboradores = await base44.asServiceRole.entities.Colaboradores.filter({ id: colaboradorId });
      const colaborador = colaboradores?.[0];
      if (!colaborador) {
        return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
      }

      await base44.asServiceRole.entities.Colaboradores.update(colaboradorId, {
        senha_portal: novaSenha,
        senha_precisa_trocar: false,
      });

      return Response.json({ success: true, colaborador: { ...colaborador, senha_portal: novaSenha, senha_precisa_trocar: false } });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});