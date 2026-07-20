import { createSupabaseAdmin } from './_supabase.js';
import { sendEmail } from './_email.js';

const ADM_EMAIL = 'adm.sp1@interlub.com';
const PORTAL_URL = 'https://techcontrol.site/portal-login';

// ── TEMPLATES DE TICKET (CHAMADOS) ─────────────────────────────────────────────
function htmlTicketCreatedUser(c) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;"><span style="background:#1e40af;border-radius:12px;padding:10px 22px;color:#fff;font-size:18px;font-weight:700;display:inline-block;">⚙ TechControl</span></td></tr><tr><td style="background:#ea580c;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">📋 Chamado Aberto</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Olá, ${c.solicitante_nome}!</p><p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Seu chamado foi registrado com sucesso. Nossa equipe irá analisá-lo em breve.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${c.numero_chamado}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Tipo:</strong> ${c.tipo_solicitacao}<br><strong>Título:</strong> ${c.titulo_chamado || '-'}<br><strong>Urgência:</strong> ${c.urgencia}</td></tr></table><div style="text-align:center;"><a href="${PORTAL_URL}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">🔍 Acompanhar Chamado</a></div></td></tr><tr><td align="center" style="padding:24px 0 8px;"><p style="margin:0;font-size:12px;color:#9ca3af;">E-mail gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

function htmlTicketCreatedAdmin(c) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;"><span style="background:#1e40af;border-radius:12px;padding:10px 22px;color:#fff;font-size:18px;font-weight:700;display:inline-block;">⚙ TechControl</span></td></tr><tr><td style="background:#ea580c;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">📋 Novo Chamado Aberto</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Olá, Administrador!</p><p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Novo chamado aberto por <strong>${c.solicitante_nome}</strong> (${c.solicitante_area || '-'}).</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${c.numero_chamado}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Solicitante:</strong> ${c.solicitante_nome}<br><strong>Tipo:</strong> ${c.tipo_solicitacao}<br><strong>Título:</strong> ${c.titulo_chamado || '-'}<br><strong>Urgência:</strong> ${c.urgencia}</td></tr></table><div style="text-align:center;"><a href="${PORTAL_URL}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">🔍 Ver Chamado</a></div></td></tr><tr><td align="center" style="padding:24px 0 8px;"><p style="margin:0;font-size:12px;color:#9ca3af;">E-mail gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

function htmlTicketStarted(c, responsavel) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;"><span style="background:#1e40af;border-radius:12px;padding:10px 22px;color:#fff;font-size:18px;font-weight:700;display:inline-block;">⚙ TechControl</span></td></tr><tr><td style="background:#2563eb;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">⚡ Atendimento Iniciado</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Olá, ${c.solicitante_nome}!</p><p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Seu chamado foi recebido e o atendimento já foi iniciado por <strong>${responsavel}</strong>.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${c.numero_chamado}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Responsável:</strong> ${responsavel}<br><strong>Tipo:</strong> ${c.tipo_solicitacao}</td></tr></table><div style="text-align:center;"><a href="${PORTAL_URL}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">🔍 Acompanhar Chamado</a></div></td></tr><tr><td align="center" style="padding:24px 0 8px;"><p style="margin:0;font-size:12px;color:#9ca3af;">E-mail gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

function htmlTicketClosed(c, responsavel) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;"><span style="background:#1e40af;border-radius:12px;padding:10px 22px;color:#fff;font-size:18px;font-weight:700;display:inline-block;">⚙ TechControl</span></td></tr><tr><td style="background:#16a34a;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">✅ Chamado Concluído</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Olá, ${c.solicitante_nome}!</p><p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Seu chamado foi concluído por <strong>${responsavel}</strong>.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${c.numero_chamado}</p></td></tr>${c.solucao ? `<tr><td style="padding:16px 24px;font-size:14px;color:#374151;"><strong>Solução:</strong><br>${c.solucao}</td></tr>` : ''}</table><div style="background:#fffbeb;border:2px solid #fcd34d;border-radius:10px;padding:24px;margin-bottom:24px;text-align:center;"><p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#92400e;">⭐ Avalie o Atendimento</p><a href="${PORTAL_URL}" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">⭐ Ir para o Portal</a><p style="margin:12px 0 0;font-size:12px;color:#92400e;">Use o número <strong>${c.numero_chamado}</strong> para avaliar</p></div></td></tr><tr><td align="center" style="padding:24px 0 8px;"><p style="margin:0;font-size:12px;color:#9ca3af;">E-mail gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

function htmlTicketChatMessage(nome, remetente, mensagem, numero) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;"><span style="background:#1e40af;border-radius:12px;padding:10px 22px;color:#fff;font-size:18px;font-weight:700;display:inline-block;">⚙ TechControl</span></td></tr><tr><td style="background:#7c3aed;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">💬 Nova Mensagem</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Olá, ${nome}!</p><p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Nova mensagem de <strong>${remetente}</strong>.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Chamado #${numero}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Mensagem:</strong><br>"${mensagem.substring(0, 300)}${mensagem.length > 300 ? '...' : ''}"</td></tr></table><div style="text-align:center;"><a href="${PORTAL_URL}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">💬 Ver Mensagem</a></div></td></tr><tr><td align="center" style="padding:24px 0 8px;"><p style="margin:0;font-size:12px;color:#9ca3af;">E-mail gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

// ── TEMPLATE DE COMUNICADOS (IMAGENS COMPLETAS) ─────────────────────────────────
function buildImageComunicadoHtml(arteUrl) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;"><div style="max-width:640px;margin:0 auto;background:#ffffff;"><img src="${arteUrl}" style="display:block;width:100%;max-width:640px;border:0;margin:0;padding:0;" /><div style="padding:12px 0;text-align:center;"><p style="margin:0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} · Todos os direitos reservados</p></div></div></body></html>`;
}

// ── BUSCA DE ARTE DE COMUNICADOS ────────────────────────────────────────────────
async function buscarArte(supabase, colaboradorId, anoAtual, tipo) {
  if (colaboradorId) {
    const { data: artes } = await supabase.from('comunicados_artes').select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('tipo_comunicado', tipo)
      .eq('status_arte', 'arte_carregada');
    const arteDaAno = (artes || []).find(a => !a.ano_referencia || a.ano_referencia === anoAtual);
    if (arteDaAno) return arteDaAno;
  }
  const { data: artesGen } = await supabase.from('comunicados_artes').select('*')
    .eq('tipo_comunicado', tipo)
    .eq('status_arte', 'arte_carregada');
  return (artesGen || []).find(a => !a.colaborador_id || a.colaborador_id === '') || null;
}

// ── HANDLER PRINCIPAL ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createSupabaseAdmin();
    const body = req.body || {};
    const { type, data } = body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Parâmetros "type" e "data" são obrigatórios.' });
    }

    const origin = req.headers.referer || req.headers.origin || 'https://techcontrol.site';

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. ABERTURA DE TICKET (CREATED)
    // ─────────────────────────────────────────────────────────────────────────────
    if (type === 'sendEmailTicketCreated') {
      const { chamado_id } = data;
      const { data: chamado } = await supabase.from('chamados').select('*').eq('id', chamado_id).single();
      if (!chamado?.solicitante_email) return res.status(404).json({ error: 'Chamado ou e-mail do solicitante não encontrado' });
      if (chamado.email_abertura_enviado) return res.status(200).json({ skipped: true });

      await supabase.from('chamados').update({ email_abertura_enviado: true }).eq('id', chamado.id);

      await Promise.all([
        sendEmail({ to: chamado.solicitante_email, subject: `[TechControl] Chamado ${chamado.numero_chamado} aberto com sucesso`, html: htmlTicketCreatedUser(chamado) }),
        sendEmail({ to: ADM_EMAIL, subject: `[TechControl] Novo chamado: ${chamado.numero_chamado} — ${chamado.solicitante_nome}`, html: htmlTicketCreatedAdmin(chamado) })
      ]);
      return res.status(200).json({ success: true });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. ATENDIMENTO INICIADO (STARTED)
    // ─────────────────────────────────────────────────────────────────────────────
    if (type === 'sendEmailTicketStarted') {
      const { chamado_id, responsavel } = data;
      const { data: chamado } = await supabase.from('chamados').select('*').eq('id', chamado_id).single();
      if (!chamado?.solicitante_email) return res.status(404).json({ error: 'Chamado ou e-mail do solicitante não encontrado' });
      if (chamado.email_inicio_enviado) return res.status(200).json({ skipped: true });

      await supabase.from('chamados').update({ email_inicio_enviado: true }).eq('id', chamado_id);

      await sendEmail({
        to: chamado.solicitante_email,
        subject: `[TechControl] Chamado ${chamado.numero_chamado} - Atendimento iniciado ⚡`,
        html: htmlTicketStarted(chamado, responsavel || chamado.responsavel || 'Equipe TechControl')
      });
      return res.status(200).json({ success: true });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. ATENDIMENTO CONCLUÍDO (CLOSED)
    // ─────────────────────────────────────────────────────────────────────────────
    if (type === 'sendEmailTicketClosed') {
      const { chamado_id, responsavel } = data;
      const { data: chamado } = await supabase.from('chamados').select('*').eq('id', chamado_id).single();
      if (!chamado?.solicitante_email) return res.status(404).json({ error: 'Chamado ou e-mail do solicitante não encontrado' });
      if (chamado.email_conclusao_enviado) return res.status(200).json({ skipped: true });

      await supabase.from('chamados').update({ email_conclusao_enviado: true }).eq('id', chamado_id);

      await sendEmail({
        to: chamado.solicitante_email,
        subject: `[TechControl] Chamado ${chamado.numero_chamado} Concluído ✅ — Avalie o atendimento`,
        html: htmlTicketClosed(chamado, responsavel || chamado.responsavel || 'Equipe TechControl')
      });
      return res.status(200).json({ success: true });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. NOVA MENSAGEM NO CHAT (CHAT MESSAGE)
    // ─────────────────────────────────────────────────────────────────────────────
    if (type === 'sendEmailChatMessage') {
      const { chamado_id, tipo_remetente, remetente_nome, mensagem } = data;
      const { data: chamado } = await supabase.from('chamados').select('*').eq('id', chamado_id).single();
      if (!chamado?.solicitante_email) return res.status(404).json({ error: 'Chamado não encontrado' });

      if (tipo_remetente === 'admin') {
        await sendEmail({
          to: chamado.solicitante_email,
          subject: `[TechControl] Chamado ${chamado.numero_chamado} — Nova mensagem do suporte`,
          html: htmlTicketChatMessage(chamado.solicitante_nome, remetente_nome, mensagem, chamado.numero_chamado)
        });
      } else {
        await sendEmail({
          to: ADM_EMAIL,
          subject: `[TechControl] Chamado ${chamado.numero_chamado} — Nova mensagem de ${chamado.solicitante_nome}`,
          html: htmlTicketChatMessage('Administrador', remetente_nome || chamado.solicitante_nome, mensagem, chamado.numero_chamado)
        });
      }
      return res.status(200).json({ success: true });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. NOTIFICAR APROVADOR DE REQUISIÇÃO DE COMPRAS
    // ─────────────────────────────────────────────────────────────────────────────
    if (type === 'notificarAprovadorRequisicao') {
      const requisicaoId = data.requisicaoId || data.requisicao_id;
      let req_data = null;
      if (requisicaoId) {
        const { data: found } = await supabase.from('requisicao_compras').select('*').eq('id', requisicaoId).maybeSingle();
        req_data = found;
      }
      if (!req_data) {
        req_data = data;
      }

      const {
        aprovador_email, aprovador_nome, numero_requisicao, colaborador_nome,
        colaborador_email, item, urgencia, justificativa,
        valor_minimo, valor_maximo, valor_unitario_minimo, valor_unitario_maximo,
        centro_custo_nome
      } = req_data;

      if (!aprovador_email) return res.status(400).json({ error: 'E-mail do aprovador não cadastrado' });

      const valorRangeTotal = valor_minimo && valor_maximo
        ? `R$ ${Number(valor_minimo).toLocaleString('pt-BR')} – R$ ${Number(valor_maximo).toLocaleString('pt-BR')}`
        : valor_minimo ? `A partir de R$ ${Number(valor_minimo).toLocaleString('pt-BR')}` : 'Não informado';

      const valorRangeUnit = valor_unitario_minimo && valor_unitario_maximo
        ? `R$ ${Number(valor_unitario_minimo).toLocaleString('pt-BR')} – R$ ${Number(valor_unitario_maximo).toLocaleString('pt-BR')}`
        : valor_unitario_minimo ? `A partir de R$ ${Number(valor_unitario_minimo).toLocaleString('pt-BR')}` : null;

      const htmlAprovador = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
          <div style="background:#059669;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
            <h2 style="margin:0;">🛒 Nova Requisição de Compra</h2>
          </div>
          <p>Olá, <strong>${aprovador_nome}</strong>!</p>
          <p>Uma nova requisição de compra foi aberta e está aguardando sua aprovação.</p>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
            <p><strong>Número:</strong> ${numero_requisicao}</p>
            <p><strong>Solicitante:</strong> ${colaborador_nome}</p>
            <p><strong>Item:</strong> ${item}</p>
            ${urgencia ? `<p><strong>Urgência:</strong> ${urgencia}</p>` : ''}
            ${justificativa ? `<p><strong>Justificativa:</strong> ${justificativa}</p>` : ''}
            ${centro_custo_nome ? `<p><strong>Centro de Custo:</strong> ${centro_custo_nome}</p>` : ''}
            ${valorRangeUnit ? `<p><strong>Valor Unitário:</strong> ${valorRangeUnit}</p>` : ''}
            <p><strong>Valor Total:</strong> ${valorRangeTotal}</p>
          </div>
          <a href="${origin}/portal-requisicoes" style="display:inline-block;background:#059669;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Acessar Portal para Aprovar
          </a>
        </div>
      `;

      const htmlRequisitante = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
          <div style="background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
            <h2 style="margin:0;">📋 Requisição Recebida</h2>
          </div>
          <p>Olá, <strong>${colaborador_nome}</strong>!</p>
          <p>Sua requisição de compra foi criada com sucesso e já foi enviada para aprovação do seu responsável.</p>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
            <p><strong>Número:</strong> ${numero_requisicao}</p>
            <p><strong>Item:</strong> ${item}</p>
            ${urgencia ? `<p><strong>Urgência:</strong> ${urgencia}</p>` : ''}
            ${centro_custo_nome ? `<p><strong>Centro de Custo:</strong> ${centro_custo_nome}</p>` : ''}
            ${valorRangeUnit ? `<p><strong>Valor Unitário:</strong> ${valorRangeUnit}</p>` : ''}
            <p><strong>Valor Total:</strong> ${valorRangeTotal}</p>
            <p><strong>Responsável:</strong> ${aprovador_nome}</p>
            <p><strong>Status:</strong> Aguardando Aprovador</p>
          </div>
          <a href="${origin}/portal-requisicoes" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Acompanhar Requisição
          </a>
        </div>
      `;

      await Promise.all([
        sendEmail({ to: aprovador_email, subject: `🛒 Nova Requisição de Compra Aguardando Aprovação — ${numero_requisicao}`, html: htmlAprovador }),
        colaborador_email ? sendEmail({ to: colaborador_email, subject: `📋 Requisição ${numero_requisicao} criada com sucesso`, html: htmlRequisitante }) : Promise.resolve()
      ]);
      return res.status(200).json({ success: true });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. ENVIAR BOAS-VINDAS (COMUNICADOS) — GMAIL
    // ─────────────────────────────────────────────────────────────────────────────
    if (type === 'enviarBoasVindas') {
      const { colaborador_id } = data;
      const anoAtual = new Date().getFullYear();

      const { data: todosAtivos } = await supabase.from('colaboradores').select('*')
        .eq('status', 'Ativo').eq('incluir_comunicados', true);
      const destinatarios = (todosAtivos || []).map(c => c.email).filter(Boolean);

      let alvos = [];
      if (colaborador_id) {
        const { data: colabs } = await supabase.from('colaboradores').select('*').eq('id', colaborador_id);
        if (colabs?.[0]) alvos = [colabs[0]];
      } else {
        const limiteData = new Date();
        limiteData.setDate(limiteData.getDate() - 7);
        const limiteDateStr = limiteData.toISOString().split('T')[0];
        const { data: pendentes } = await supabase.from('colaboradores').select('*')
          .eq('status', 'Ativo').eq('comunicado_boas_vindas_enviado', false);
        alvos = (pendentes || []).filter(c => c.data_admissao && c.data_admissao >= limiteDateStr);
      }

      const enviados = [], semArte = [], erros = [];

      for (const colab of alvos) {
        const arte = await buscarArte(supabase, colab.id, anoAtual, 'boas_vindas');
        if (!arte) {
          semArte.push(colab.nome_completo);
          await supabase.from('comunicados_log').insert({
            tipo_comunicado: 'boas_vindas', colaborador_nome: colab.nome_completo, colaborador_id: colab.id,
            destinatarios: [], data_envio: new Date().toISOString(), status: 'sem_arte'
          });
          continue;
        }

        const assunto = `Boas-vindas, ${colab.nome_completo}! Seja muito bem-vindo(a)! 👋`;
        const html = buildImageComunicadoHtml(arte.imagem_url);
        const dataEnvio = new Date().toISOString();

        try {
          await sendEmail({ to: destinatarios, subject: assunto, html, service: 'gmail' });

          if (arte.colaborador_id) {
            await supabase.from('comunicados_artes').update({ status_arte: 'enviado', data_envio: dataEnvio }).eq('id', arte.id);
          }
          await supabase.from('colaboradores').update({ comunicado_boas_vindas_enviado: true }).eq('id', colab.id);
          await supabase.from('comunicados_log').insert({
            tipo_comunicado: 'boas_vindas', colaborador_nome: colab.nome_completo, colaborador_id: colab.id,
            destinatarios, assunto_enviado: assunto, data_envio: dataEnvio, status: 'enviado', demanda_id: arte.id
          });
          enviados.push(colab.nome_completo);
        } catch (erro) {
          await supabase.from('comunicados_log').insert({
            tipo_comunicado: 'boas_vindas', colaborador_nome: colab.nome_completo, colaborador_id: colab.id,
            destinatarios, assunto_enviado: assunto, data_envio: dataEnvio, status: 'erro', detalhe_erro: erro.message, demanda_id: arte.id
          });
          erros.push(colab.nome_completo);
        }
      }
      return res.status(200).json({ ok: true, enviados, semArte, erros, msg: `${enviados.length} enviado(s), ${semArte.length} sem arte, ${erros.length} com erro.` });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 7. ENVIAR DESPEDIDA (COMUNICADOS) — GMAIL
    // ─────────────────────────────────────────────────────────────────────────────
    if (type === 'enviarDespedida') {
      const { colaborador_id } = data;
      if (!colaborador_id) return res.status(400).json({ error: 'colaborador_id é obrigatório' });

      const { data: colaboradores } = await supabase.from('colaboradores').select('*').eq('id', colaborador_id);
      const colaborador = colaboradores?.[0];
      if (!colaborador) return res.status(404).json({ error: 'Colaborador não encontrado' });

      const { data: demandas } = await supabase.from('comunicados_artes').select('*')
        .eq('colaborador_id', colaborador_id).eq('tipo_comunicado', 'despedida').eq('status_arte', 'arte_carregada');

      if (!demandas?.length) return res.status(400).json({ ok: false, msg: 'Nenhuma arte de despedida carregada.' });

      const demanda = demandas[0];
      const { data: todosColabs } = await supabase.from('colaboradores').select('*');
      const destinatarios = (todosColabs || []).filter(c => c.status !== 'Desligado' && c.email && c.incluir_comunicados).map(c => c.email);

      const assunto = `Até logo, ${colaborador.nome_completo} — obrigado por tudo! 💼`;
      const html = buildImageComunicadoHtml(demanda.imagem_url);
      const dataEnvio = new Date().toISOString();

      try {
        await sendEmail({ to: destinatarios, subject: assunto, html, service: 'gmail' });

        await supabase.from('comunicados_artes').update({ status_arte: 'enviado', data_envio: dataEnvio }).eq('id', demanda.id);
        await supabase.from('colaboradores').update({ comunicado_despedida_enviado: true }).eq('id', colaborador_id);
        await supabase.from('comunicados_log').insert({
          tipo_comunicado: 'despedida', colaborador_nome: colaborador.nome_completo, colaborador_id: colaborador.id,
          destinatarios, assunto_enviado: assunto, data_envio: dataEnvio, status: 'enviado', demanda_id: demanda.id
        });
        return res.status(200).json({ ok: true, enviados: destinatarios.length, msg: `${destinatarios.length} e-mail(s) enviado(s).` });
      } catch (erro) {
        await supabase.from('comunicados_log').insert({
          tipo_comunicado: 'despedida', colaborador_nome: colaborador.nome_completo, colaborador_id: colaborador.id,
          destinatarios, assunto_enviado: assunto, data_envio: dataEnvio, status: 'erro', detalhe_erro: erro.message, demanda_id: demanda.id
        });
        return res.status(500).json({ ok: false, msg: erro.message });
      }
    }

    return res.status(400).json({ error: 'Tipo de notificação inválido' });
  } catch (err) {
    console.error('[notificar] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
