import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import nodemailer from 'npm:nodemailer@6.9.0';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: Deno.env.get('GMAIL_USER'),
    pass: Deno.env.get('GMAIL_APP_PASSWORD'),
  },
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, requisicao_id, comentario, token } = body;

    // Ação do aprovador (requer auth)
    if (action === 'aprovador_aprovar' || action === 'aprovador_reprovar') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const req_data = await base44.asServiceRole.entities.RequisicaoCompras.get(requisicao_id);
      if (!req_data) return Response.json({ error: 'Requisição não encontrada' }, { status: 404 });

      if (action === 'aprovador_reprovar') {
        // Reprovar: notifica colaborador
        await base44.asServiceRole.entities.RequisicaoCompras.update(requisicao_id, {
          status: 'Reprovada pelo Aprovador',
          aprovador_comentario: comentario || '',
          aprovador_data: new Date().toISOString(),
          historico: [...(req_data.historico || []), {
            data_hora: new Date().toISOString(),
            tipo: 'reprovacao_aprovador',
            descricao: `Reprovado pelo aprovador. ${comentario ? 'Motivo: ' + comentario : ''}`,
            usuario: req_data.aprovador_nome,
          }],
        });

        if (req_data.colaborador_email) {
          await transporter.sendMail({
            from: `"TechControl" <${Deno.env.get('GMAIL_USER')}>`,
            to: req_data.colaborador_email,
            subject: `❌ Requisição ${req_data.numero_requisicao} Reprovada`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
                <div style="background:#ef4444;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                  <h2 style="margin:0;">❌ Requisição Reprovada</h2>
                </div>
                <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
                <p>Sua requisição de compra foi <strong>reprovada pelo responsável</strong>.</p>
                <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                  <p><strong>Requisição:</strong> ${req_data.numero_requisicao}</p>
                  <p><strong>Item:</strong> ${req_data.item}</p>
                  <p><strong>Devolutiva:</strong> ${comentario || 'Sem comentário adicional.'}</p>
                </div>
                <p style="color:#64748b;font-size:14px;">Em caso de dúvidas, entre em contato com seu gestor.</p>
              </div>
            `,
          });
        }

        return Response.json({ success: true, action: 'reprovado' });
      }

      // Aprovar: enviar para o diretor
      const token_dir = crypto.randomUUID().replace(/-/g, '');
      await base44.asServiceRole.entities.RequisicaoCompras.update(requisicao_id, {
        status: 'Aguardando Diretor',
        aprovador_comentario: comentario || '',
        aprovador_data: new Date().toISOString(),
        token_aprovacao: token_dir,
        historico: [...(req_data.historico || []), {
          data_hora: new Date().toISOString(),
          tipo: 'aprovacao_aprovador',
          descricao: 'Aprovado pelo responsável. Aguardando aprovação do diretor.',
          usuario: req_data.aprovador_nome,
        }],
      });

      const baseUrl = req.headers.get('origin') || 'https://app.base44.com';
      const linkAprovar = `${baseUrl}/aprovacao-diretor?token=${token_dir}&acao=aprovar`;
      const linkReprovar = `${baseUrl}/aprovacao-diretor?token=${token_dir}&acao=reprovar`;

      const valorRange = req_data.valor_minimo && req_data.valor_maximo
        ? `R$ ${Number(req_data.valor_minimo).toLocaleString('pt-BR')} – R$ ${Number(req_data.valor_maximo).toLocaleString('pt-BR')}`
        : 'Não informado';

      await transporter.sendMail({
        from: `"TechControl" <${Deno.env.get('GMAIL_USER')}>`,
        to: 'vtorres@interlub.com',
        subject: `🛒 Aprovação Necessária — Requisição ${req_data.numero_requisicao}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
            <div style="background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
              <h2 style="margin:0;">🛒 Requisição de Compra — Aprovação do Diretor</h2>
            </div>
            <p>Uma requisição de compra foi aprovada pelo responsável e precisa da sua aprovação.</p>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
              <p><strong>Número:</strong> ${req_data.numero_requisicao}</p>
              <p><strong>Solicitante:</strong> ${req_data.colaborador_nome} (${req_data.colaborador_area})</p>
              <p><strong>Aprovador:</strong> ${req_data.aprovador_nome}</p>
              <p><strong>Item:</strong> ${req_data.item}</p>
              <p><strong>Quantidade:</strong> ${req_data.quantidade}</p>
              <p><strong>Valor Estimado:</strong> ${valorRange}</p>
              <p><strong>Urgência:</strong> ${req_data.urgencia}</p>
              <p><strong>Justificativa:</strong> ${req_data.justificativa}</p>
              ${req_data.fornecedor_sugerido ? `<p><strong>Fornecedor Sugerido:</strong> ${req_data.fornecedor_sugerido}</p>` : ''}
              ${comentario ? `<p><strong>Comentário do Aprovador:</strong> ${comentario}</p>` : ''}
            </div>
            <div style="margin:24px 0;text-align:center;">
              <a href="${linkAprovar}" style="display:inline-block;background:#16a34a;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin-right:16px;">✅ APROVAR</a>
              <a href="${linkReprovar}" style="display:inline-block;background:#dc2626;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">❌ REPROVAR</a>
            </div>
            <p style="color:#64748b;font-size:12px;text-align:center;">Ao clicar em Reprovar, você será direcionado a uma página para informar a justificativa.</p>
          </div>
        `,
      });

      return Response.json({ success: true, action: 'enviado_diretor' });
    }

    // Ação do diretor via token (sem auth)
    if (action === 'diretor_aprovar' || action === 'diretor_reprovar') {
      if (!token) return Response.json({ error: 'Token inválido' }, { status: 400 });

      const lista = await base44.asServiceRole.entities.RequisicaoCompras.filter({ token_aprovacao: token });
      const req_data = lista?.[0];
      if (!req_data) return Response.json({ error: 'Token não encontrado ou já utilizado' }, { status: 404 });
      if (req_data.status !== 'Aguardando Diretor') return Response.json({ error: 'Esta requisição já foi processada' }, { status: 400 });

      if (action === 'diretor_aprovar') {
        await base44.asServiceRole.entities.RequisicaoCompras.update(req_data.id, {
          status: 'Aprovada',
          diretor_comentario: comentario || '',
          diretor_data: new Date().toISOString(),
          token_aprovacao: '',
          historico: [...(req_data.historico || []), {
            data_hora: new Date().toISOString(),
            tipo: 'aprovacao_diretor',
            descricao: 'Aprovado pelo diretor.',
            usuario: 'Diretor',
          }],
        });

        // Notifica aprovador e colaborador
        const emails = [req_data.aprovador_email, req_data.colaborador_email].filter(Boolean);
        for (const email of emails) {
          const nome = email === req_data.colaborador_email ? req_data.colaborador_nome : req_data.aprovador_nome;
          await transporter.sendMail({
            from: `"TechControl" <${Deno.env.get('GMAIL_USER')}>`,
            to: email,
            subject: `✅ Requisição ${req_data.numero_requisicao} Aprovada pelo Diretor`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
                <div style="background:#16a34a;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                  <h2 style="margin:0;">✅ Requisição Aprovada!</h2>
                </div>
                <p>Olá, <strong>${nome}</strong>!</p>
                <p>A requisição de compra foi <strong>aprovada pelo diretor</strong>.</p>
                <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                  <p><strong>Requisição:</strong> ${req_data.numero_requisicao}</p>
                  <p><strong>Item:</strong> ${req_data.item}</p>
                  <p><strong>Solicitante:</strong> ${req_data.colaborador_nome}</p>
                  ${comentario ? `<p><strong>Observação do Diretor:</strong> ${comentario}</p>` : ''}
                </div>
              </div>
            `,
          });
        }
        return Response.json({ success: true, action: 'aprovado', requisicao: req_data });
      }

      // Diretor reprova
      await base44.asServiceRole.entities.RequisicaoCompras.update(req_data.id, {
        status: 'Reprovada pelo Diretor',
        diretor_comentario: comentario || '',
        diretor_data: new Date().toISOString(),
        token_aprovacao: '',
        historico: [...(req_data.historico || []), {
          data_hora: new Date().toISOString(),
          tipo: 'reprovacao_diretor',
          descricao: `Reprovado pelo diretor. ${comentario ? 'Motivo: ' + comentario : ''}`,
          usuario: 'Diretor',
        }],
      });

      const emails = [req_data.aprovador_email, req_data.colaborador_email].filter(Boolean);
      for (const email of emails) {
        const nome = email === req_data.colaborador_email ? req_data.colaborador_nome : req_data.aprovador_nome;
        await transporter.sendMail({
          from: `"TechControl" <${Deno.env.get('GMAIL_USER')}>`,
          to: email,
          subject: `❌ Requisição ${req_data.numero_requisicao} Reprovada pelo Diretor`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
              <div style="background:#ef4444;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0;">❌ Requisição Reprovada pelo Diretor</h2>
              </div>
              <p>Olá, <strong>${nome}</strong>!</p>
              <p>A requisição de compra foi <strong>reprovada pelo diretor</strong>.</p>
              <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                <p><strong>Requisição:</strong> ${req_data.numero_requisicao}</p>
                <p><strong>Item:</strong> ${req_data.item}</p>
                <p><strong>Solicitante:</strong> ${req_data.colaborador_nome}</p>
                <p><strong>Devolutiva:</strong> ${comentario || 'Sem comentário adicional.'}</p>
              </div>
            </div>
          `,
        });
      }
      return Response.json({ success: true, action: 'reprovado', requisicao: req_data });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});