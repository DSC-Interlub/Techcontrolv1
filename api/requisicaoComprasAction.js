import { createSupabaseAdmin } from './_supabase.js';

import { sendEmail as sendEmailUnified } from './_email.js';

async function sendEmail(to, subject, html) {
  return sendEmailUnified({ to, subject, html });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createSupabaseAdmin();
    const body = req.body || {};
    const { action, requisicao_id, comentario, token, aprovador_email } = body;
    const origin = req.headers.referer || req.headers.origin || 'https://techcontrol.site';

    // ── AÇÃO DO APROVADOR GESTOR ──────────────────────────────────────────────────
    if (action === 'aprovador_aprovar' || action === 'aprovador_reprovar') {
      if (!requisicao_id) return res.status(400).json({ error: 'requisicao_id obrigatório' });

      const { data: req_data, error: getError } = await supabase
        .from('requisicao_compras')
        .select('*')
        .eq('id', requisicao_id)
        .maybeSingle();

      if (getError || !req_data) return res.status(404).json({ error: 'Requisição não encontrada' });

      // Validação de aprovador
      if (aprovador_email && req_data.aprovador_email &&
          req_data.aprovador_email.toLowerCase() !== aprovador_email.toLowerCase()) {
        return res.status(403).json({ error: 'Não autorizado para esta requisição' });
      }

      if (req_data.status !== 'Aguardando Aprovador') {
        return res.status(400).json({ error: 'Esta requisição não está aguardando aprovador' });
      }

      // Reprovar pelo aprovador
      if (action === 'aprovador_reprovar') {
        const { error: updError } = await supabase
          .from('requisicao_compras')
          .update({
            status: 'Reprovada pelo Aprovador',
            aprovador_comentario: comentario || '',
            aprovador_data: new Date().toISOString(),
            historico: [...(req_data.historico || []), {
              data_hora: new Date().toISOString(),
              tipo: 'reprovacao_aprovador',
              descricao: `Reprovado pelo aprovador. ${comentario ? 'Motivo: ' + comentario : ''}`,
              usuario: req_data.aprovador_nome,
            }],
          })
          .eq('id', requisicao_id);

        if (updError) throw updError;

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

        return res.status(200).json({ success: true, action: 'reprovado' });
      }

      // Aprovar: enviar para o diretor
      const { data: configs } = await supabase
        .from('configuracoes')
        .select('value')
        .eq('key', 'diretor_email')
        .limit(1);

      const diretorEmail = configs?.[0]?.value || configs?.[0]?.valor || 'diretor.geral@interlub.com';
      if (!diretorEmail) return res.status(500).json({ error: 'E-mail do diretor não configurado' });

      // Gera UUID para token de aprovação
      const token_dir = crypto.randomUUID().replace(/-/g, '');

      const { error: updError2 } = await supabase
        .from('requisicao_compras')
        .update({
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
        })
        .eq('id', requisicao_id);

      if (updError2) throw updError2;

      const linkAprovar = `${origin}/aprovacao-diretor?token=${token_dir}&acao=aprovar`;
      const linkReprovar = `${origin}/aprovacao-diretor?token=${token_dir}&acao=reprovar`;

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
        </div>`
      );

      // Notifica o requisitante
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
          </div>`
        );
      }

      return res.status(200).json({ success: true, action: 'enviado_diretor' });
    }

    // ── SOLICITANTE EDITA E REENVIA ────────────────────────────────────────────────
    if (action === 'requisicao_editar') {
      if (!requisicao_id) return res.status(400).json({ error: 'requisicao_id obrigatório' });

      const { data: req_data } = await supabase
        .from('requisicao_compras')
        .select('*')
        .eq('id', requisicao_id)
        .maybeSingle();

      if (!req_data) return res.status(404).json({ error: 'Requisição não encontrada' });

      const {
        item, quantidade, centro_custo_codigo, centro_custo_nome,
        valor_unitario_minimo, valor_unitario_maximo,
        valor_minimo, valor_maximo,
        justificativa, urgencia, fornecedor_sugerido, anexos
      } = body;

      const { error: editError } = await supabase
        .from('requisicao_compras')
        .update({
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
        })
        .eq('id', requisicao_id);

      if (editError) throw editError;

      // E-mail para o aprovador
      if (req_data.aprovador_email) {
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
            </div>
            <a href="${origin}/portal-requisicoes" style="display:inline-block;background:#d97706;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Acessar Portal para Aprovar
            </a>
          </div>`
        );
      }

      return res.status(200).json({ success: true, action: 'editada' });
    }

    // ── AÇÃO DO DIRETOR VIA TOKEN ────────────────────────────────────────────────
    if (action === 'diretor_aprovar' || action === 'diretor_reprovar') {
      if (!token) return res.status(400).json({ error: 'Token inválido' });

      const { data: listData } = await supabase
        .from('requisicao_compras')
        .select('*')
        .eq('token_aprovacao', token)
        .limit(1);

      const req_data = listData?.[0];
      if (!req_data) return res.status(404).json({ error: 'Token não encontrado ou já utilizado' });
      if (req_data.status !== 'Aguardando Diretor') return res.status(400).json({ error: 'Esta requisição já foi processada' });

      if (action === 'diretor_aprovar') {
        const { error: finishError } = await supabase
          .from('requisicao_compras')
          .update({
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
          })
          .eq('id', req_data.id);

        if (finishError) throw finishError;

        const emails = [req_data.aprovador_email, req_data.colaborador_email].filter(Boolean);
        for (const targetEmail of emails) {
          const nome = targetEmail === req_data.colaborador_email ? req_data.colaborador_nome : req_data.aprovador_nome;
          await sendEmail(
            targetEmail,
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
        return res.status(200).json({ success: true, action: 'aprovado' });
      }

      // Diretor reprova
      const { error: rejectError } = await supabase
        .from('requisicao_compras')
        .update({
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
        })
        .eq('id', req_data.id);

      if (rejectError) throw rejectError;

      const emails = [req_data.aprovador_email, req_data.colaborador_email].filter(Boolean);
      for (const targetEmail of emails) {
        const nome = targetEmail === req_data.colaborador_email ? req_data.colaborador_nome : req_data.aprovador_nome;
        await sendEmail(
          targetEmail,
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
      return res.status(200).json({ success: true, action: 'reprovado' });
    }

    return res.status(400).json({ error: 'Ação inválida' });
  } catch (err) {
    console.error('[requisicaoComprasAction] Erro fatal:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
