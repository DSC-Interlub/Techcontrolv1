import { createSupabaseAdmin } from './_supabase.js';

const RESEND_KEY = process.env.RESEND_API_KEY;

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'TechControl <suporte@techcontrol.site>', to: [to], subject, html }),
  });
  const j = await res.json();
  console.log(`[notificarAprovadorRequisicao] to=${to} status=${res.status} id=${j.id}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createSupabaseAdmin();
    const body = req.body || {};
    const { requisicaoId } = body;

    if (!requisicaoId) {
      return res.status(400).json({ error: 'requisicaoId é obrigatório' });
    }

    // Busca a requisição
    const { data: req_data, error } = await supabase
      .from('requisicao_compras')
      .select('*')
      .eq('id', requisicaoId)
      .maybeSingle();

    if (error || !req_data) {
      return res.status(404).json({ error: 'Requisição não encontrada' });
    }

    const {
      aprovador_email, aprovador_nome, numero_requisicao, colaborador_nome,
      colaborador_email, item, urgencia, justificativa,
      valor_minimo, valor_maximo, valor_unitario_minimo, valor_unitario_maximo,
      centro_custo_nome
    } = req_data;

    if (!aprovador_email) {
      return res.status(400).json({ error: 'E-mail do aprovador não cadastrado' });
    }

    const origin = req.headers.referer || req.headers.origin || 'https://techcontrol.site';
    const portalUrl = origin;

    const valorRangeTotal = valor_minimo && valor_maximo
      ? `R$ ${Number(valor_minimo).toLocaleString('pt-BR')} – R$ ${Number(valor_maximo).toLocaleString('pt-BR')}`
      : valor_minimo ? `A partir de R$ ${Number(valor_minimo).toLocaleString('pt-BR')}` : 'Não informado';

    const valorRangeUnit = valor_unitario_minimo && valor_unitario_maximo
      ? `R$ ${Number(valor_unitario_minimo).toLocaleString('pt-BR')} – R$ ${Number(valor_unitario_maximo).toLocaleString('pt-BR')}`
      : valor_unitario_minimo ? `A partir de R$ ${Number(valor_unitario_minimo).toLocaleString('pt-BR')}` : null;

    // E-mail para o aprovador
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
        <a href="${portalUrl}/portal-requisicoes" style="display:inline-block;background:#059669;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Acessar Portal para Aprovar
        </a>
        <p style="color:#64748b;font-size:12px;margin-top:16px;">Acesse o Portal do Colaborador e vá em "Para Aprovar" para analisar esta requisição.</p>
      </div>
    `;

    // E-mail de confirmação para o requisitante
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
        <a href="${portalUrl}/portal-requisicoes" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Acompanhar Requisição
        </a>
        <p style="color:#64748b;font-size:12px;margin-top:16px;">Você receberá um e-mail quando houver uma atualização na sua requisição.</p>
      </div>
    `;

    await Promise.all([
      sendEmail(aprovador_email, `🛒 Nova Requisição de Compra Aguardando Aprovação — ${numero_requisicao}`, htmlAprovador),
      colaborador_email ? sendEmail(colaborador_email, `📋 Requisição ${numero_requisicao} criada com sucesso`, htmlRequisitante) : Promise.resolve()
    ]);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[notificarAprovadorRequisicao] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
