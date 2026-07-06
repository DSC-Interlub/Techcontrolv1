import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const body = await req.json();
    const { action, requisicao_id, comentario, token, aprovador_email } = body;

    // Helper para enviar e-mail via Resend
    async function sendEmail(to, subject, html) {
      await resend.emails.send({
        from: 'TechControl <suporte@techcontrol.site>',
        to,
        subject,
        html,
      });
    }

    // Ação do aprovador — autenticado pelo e-mail na requisição (portal não usa auth Base44)
    if (action === 'aprovador_aprovar' || action === 'aprovador_reprovar') {
      if (!requisicao_id) return Response.json({ error: 'requisicao_id obrigatório' }, { status: 400 });

      const req_data = await base44.asServiceRole.entities.RequisicaoCompras.get(requisicao_id);
      if (!req_data) return Response.json({ error: 'Requisição não encontrada' }, { status: 404 });

      // Valida que quem chama é o aprovador correto (via email passado pelo portal)
      if (aprovador_email && req_data.aprovador_email &&
          req_data.aprovador_email.toLowerCase() !== aprovador_email.toLowerCase()) {
        return Response.json({ error: 'Não autorizado para esta requisição' }, { status: 403 });
      }

      if (req_data.status !== 'Aguardando Aprovador') {
        return Response.json({ error: 'Esta requisição não está aguardando aprovador' }, { status: 400 });
      }

      if (action === 'aprovador_reprovar') {
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
          await sendEmail(
            req_data.colaborador_email,
            `❌ Requisição ${req_data.numero_requisicao} Reprovada`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
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
            </div>`
          );
        }

        return Response.json({ success: true, action: 'reprovado' });
      }

      // Busca e-mail do diretor nas configurações
      const configs = await base44.asServiceRole.entities.Configuracoes.filter({ chave: 'diretor_email' });
      const diretorEmail = configs?.[0]?.valor;
      if (!diretorEmail) return Response.json({ error: 'E-mail do diretor não configurado' }, { status: 500 });

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

      const valorRangeTotal = req_data.valor_minimo && req_data.valor_maximo
        ? `R$ ${Number(req_data.valor_minimo).toLocaleString('pt-BR')} – R$ ${Number(req_data.valor_maximo).toLocaleString('pt-BR')}`
        : req_data.valor_minimo ? `A partir de R$ ${Number(req_data.valor_minimo).toLocaleString('pt-BR')}` : 'Não informado';

      const valorRangeUnit = req_data.valor_unitario_minimo && req_data.valor_unitario_maximo
        ? `R$ ${Number(req_data.valor_unitario_minimo).toLocaleString('pt-BR')} – R$ ${Number(req_data.valor_unitario_maximo).toLocaleString('pt-BR')}`
        : req_data.valor_unitario_minimo ? `A partir de R$ ${Number(req_data.valor_unitario_minimo).toLocaleString('pt-BR')}` : null;

      await sendEmail(
        diretorEmail,
        `🛒 Aprovação Necessária — Requisição ${req_data.numero_requisicao}`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
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
            ${req_data.centro_custo_nome ? `<p><strong>Centro de Custo:</strong> ${req_data.centro_custo_codigo} — ${req_data.centro_custo_nome}</p>` : ''}
            ${valorRangeUnit ? `<p><strong>Valor Unitário:</strong> ${valorRangeUnit}</p>` : ''}
            <p><strong>Valor Total:</strong> ${valorRangeTotal}</p>
            <p><strong>Urgência:</strong> ${req_data.urgencia}</p>
            <p><strong>Justificativa:</strong> ${req_data.justificativa}</p>
            ${req_data.fornecedor_sugerido ? `<p><strong>Fornecedor Sugerido:</strong> ${req_data.fornecedor_sugerido}</p>` : ''}
            ${comentario ? `<p><strong>Comentário do Aprovador:</strong> ${comentario}</p>` : ''}
            ${req_data.anexos?.length > 0 ? `<p><strong>Anexos:</strong> ${req_data.anexos.map(a => `<a href="${a.file_url}">${a.file_name}</a>`).join(', ')}</p>` : ''}
          </div>
          <div style="margin:24px 0;text-align:center;">
            <a href="${linkAprovar}" style="display:inline-block;background:#16a34a;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin-right:16px;">✅ APROVAR</a>
            <a href="${linkReprovar}" style="display:inline-block;background:#dc2626;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">❌ REPROVAR</a>
          </div>
          <p style="color:#64748b;font-size:12px;text-align:center;">Ao clicar em Reprovar, você será direcionado a uma página para informar a justificativa.</p>
        </div>`
      );

      // Notifica o requisitante que está aguardando aprovação do diretor
      if (req_data.colaborador_email) {
        await sendEmail(
          req_data.colaborador_email,
          `⏳ Requisição ${req_data.numero_requisicao} — Aguardando Diretor`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
            <div style="background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
              <h2 style="margin:0;">⏳ Requisição em Análise pelo Diretor</h2>
            </div>
            <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
            <p>Sua requisição foi <strong>aprovada pelo seu responsável</strong> e agora aguarda a aprovação do diretor.</p>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
              <p><strong>Requisição:</strong> ${req_data.numero_requisicao}</p>
              <p><strong>Item:</strong> ${req_data.item}</p>
              ${comentario ? `<p><strong>Comentário do Aprovador:</strong> ${comentario}</p>` : ''}
            </div>
            <p style="color:#64748b;font-size:14px;">Você será notificado quando o diretor tomar uma decisão.</p>
          </div>`
        );
      }

      return Response.json({ success: true, action: 'enviado_diretor' });
    }

    // Editar requisição (solicitante reenvia com novos dados — volta para o aprovador)
    if (action === 'requisicao_editar') {
      if (!requisicao_id) return Response.json({ error: 'requisicao_id obrigatório' }, { status: 400 });

      const req_data = await base44.asServiceRole.entities.RequisicaoCompras.get(requisicao_id);
      if (!req_data) return Response.json({ error: 'Requisição não encontrada' }, { status: 404 });

      // Só permite editar se estiver Aprovada ou Reprovada
      const statusEditavel = ['Aprovada', 'Reprovada pelo Aprovador', 'Reprovada pelo Diretor'];
      if (!statusEditavel.includes(req_data.status)) {
        return Response.json({ error: 'Esta requisição não pode ser editada no status atual' }, { status: 400 });
      }

      const {
        item, quantidade, centro_custo_codigo, centro_custo_nome,
        valor_unitario_minimo, valor_unitario_maximo,
        valor_minimo, valor_maximo,
        justificativa, urgencia, fornecedor_sugerido, anexos,
      } = body;

      await base44.asServiceRole.entities.RequisicaoCompras.update(requisicao_id, {
        item, quantidade, centro_custo_codigo, centro_custo_nome,
        valor_unitario_minimo, valor_unitario_maximo,
        valor_minimo, valor_maximo,
        justificativa, urgencia, fornecedor_sugerido,
        anexos: anexos || [],
        status: 'Aguardando Aprovador',
        aprovador_comentario: '',
        aprovador_data: null,
        diretor_comentario: '',
        diretor_data: null,
        token_aprovacao: '',
        historico: [...(req_data.historico || []), {
          data_hora: new Date().toISOString(),
          tipo: 'edicao_reenvio',
          descricao: 'Requisição editada e reenviada para aprovação com novos valores.',
          usuario: req_data.colaborador_nome,
        }],
      });

      // E-mail para o aprovador (reenvio)
      if (req_data.aprovador_email) {
        const portalUrl = req.headers.get('origin') || 'https://app.base44.com';
        const valorRangeTotal = valor_minimo && valor_maximo
          ? `R$ ${Number(valor_minimo).toLocaleString('pt-BR')} – R$ ${Number(valor_maximo).toLocaleString('pt-BR')}`
          : valor_minimo ? `A partir de R$ ${Number(valor_minimo).toLocaleString('pt-BR')}` : 'Não informado';
        const valorRangeUnit = valor_unitario_minimo && valor_unitario_maximo
          ? `R$ ${Number(valor_unitario_minimo).toLocaleString('pt-BR')} – R$ ${Number(valor_unitario_maximo).toLocaleString('pt-BR')}`
          : valor_unitario_minimo ? `A partir de R$ ${Number(valor_unitario_minimo).toLocaleString('pt-BR')}` : null;

        await sendEmail(
          req_data.aprovador_email,
          `🔄 Requisição ${req_data.numero_requisicao} Editada e Reenviada`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
            <div style="background:#d97706;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
              <h2 style="margin:0;">🔄 Requisição Editada e Reenviada</h2>
            </div>
            <p>Olá, <strong>${req_data.aprovador_nome}</strong>!</p>
            <p>O solicitante editou a requisição <strong>${req_data.numero_requisicao}</strong> e ela está novamente aguardando sua aprovação.</p>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
              <p><strong>Número:</strong> ${req_data.numero_requisicao}</p>
              <p><strong>Solicitante:</strong> ${req_data.colaborador_nome}</p>
              <p><strong>Item:</strong> ${item}</p>
              <p><strong>Quantidade:</strong> ${quantidade}</p>
              ${urgencia ? `<p><strong>Urgência:</strong> ${urgencia}</p>` : ''}
              ${justificativa ? `<p><strong>Justificativa:</strong> ${justificativa}</p>` : ''}
              ${centro_custo_nome ? `<p><strong>Centro de Custo:</strong> ${centro_custo_nome}</p>` : ''}
              ${valorRangeUnit ? `<p><strong>Valor Unitário:</strong> ${valorRangeUnit}</p>` : ''}
              <p><strong>Valor Total:</strong> ${valorRangeTotal}</p>
              ${fornecedor_sugerido ? `<p><strong>Fornecedor Sugerido:</strong> ${fornecedor_sugerido}</p>` : ''}
              ${anexos?.length > 0 ? `<p><strong>Anexos:</strong> ${anexos.map(a => `<a href="${a.file_url}">${a.file_name}</a>`).join(', ')}</p>` : ''}
            </div>
            <a href="${portalUrl}/portal-requisicoes" style="display:inline-block;background:#d97706;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Acessar Portal para Aprovar
            </a>
            <p style="color:#64748b;font-size:12px;margin-top:16px;">Acesse o Portal do Colaborador e vá em "Para Aprovar" para analisar esta requisição.</p>
          </div>`
        );
      }

      // Confirmação para o solicitante
      if (req_data.colaborador_email) {
        const portalUrl = req.headers.get('origin') || 'https://app.base44.com';
        await sendEmail(
          req_data.colaborador_email,
          `🔄 Requisição ${req_data.numero_requisicao} Reenviada para Aprovação`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
            <div style="background:#d97706;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
              <h2 style="margin:0;">🔄 Requisição Reenviada</h2>
            </div>
            <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
            <p>Sua requisição foi editada e reenviada para aprovação do seu responsável (<strong>${req_data.aprovador_nome}</strong>).</p>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
              <p><strong>Número:</strong> ${req_data.numero_requisicao}</p>
              <p><strong>Item:</strong> ${item}</p>
              <p><strong>Status:</strong> Aguardando Aprovador</p>
            </div>
            <a href="${portalUrl}/portal-requisicoes" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Acompanhar Requisição
            </a>
          </div>`
        );
      }

      return Response.json({ success: true, action: 'editada' });
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

        const emails = [req_data.aprovador_email, req_data.colaborador_email].filter(Boolean);
        for (const email of emails) {
          const nome = email === req_data.colaborador_email ? req_data.colaborador_nome : req_data.aprovador_nome;
          await sendEmail(
            email,
            `✅ Requisição ${req_data.numero_requisicao} Aprovada pelo Diretor`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
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
            </div>`
          );
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
        await sendEmail(
          email,
          `❌ Requisição ${req_data.numero_requisicao} Reprovada pelo Diretor`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
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
          </div>`
        );
      }
      return Response.json({ success: true, action: 'reprovado', requisicao: req_data });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});