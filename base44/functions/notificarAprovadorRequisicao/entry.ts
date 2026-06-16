import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const body = await req.json();
    const { aprovador_email, aprovador_nome, requisicao_id, numero, colaborador_nome, colaborador_email, item, urgencia, justificativa, valor_minimo, valor_maximo } = body;

    if (!aprovador_email) {
      return Response.json({ error: 'E-mail do aprovador não informado' }, { status: 400 });
    }

    const portalUrl = req.headers.get('origin') || 'https://app.base44.com';

    const valorRange = valor_minimo && valor_maximo
      ? `R$ ${Number(valor_minimo).toLocaleString('pt-BR')} – R$ ${Number(valor_maximo).toLocaleString('pt-BR')}`
      : valor_minimo ? `A partir de R$ ${Number(valor_minimo).toLocaleString('pt-BR')}` : 'Não informado';

    // E-mail para o aprovador
    await resend.emails.send({
      from: 'TechControl <onboarding@resend.dev>',
      to: aprovador_email,
      subject: `🛒 Nova Requisição de Compra Aguardando Aprovação — ${numero}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
          <div style="background:#059669;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
            <h2 style="margin:0;">🛒 Nova Requisição de Compra</h2>
          </div>
          <p>Olá, <strong>${aprovador_nome}</strong>!</p>
          <p>Uma nova requisição de compra foi aberta e está aguardando sua aprovação.</p>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
            <p><strong>Número:</strong> ${numero}</p>
            <p><strong>Solicitante:</strong> ${colaborador_nome}</p>
            <p><strong>Item:</strong> ${item}</p>
            ${urgencia ? `<p><strong>Urgência:</strong> ${urgencia}</p>` : ''}
            ${justificativa ? `<p><strong>Justificativa:</strong> ${justificativa}</p>` : ''}
            <p><strong>Valor Estimado:</strong> ${valorRange}</p>
          </div>
          <a href="${portalUrl}/portal-requisicoes" style="display:inline-block;background:#059669;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Acessar Portal para Aprovar
          </a>
          <p style="color:#64748b;font-size:12px;margin-top:16px;">Acesse o Portal do Colaborador e vá em "Para Aprovar" para analisar esta requisição.</p>
        </div>
      `,
    });

    // E-mail de confirmação para o requisitante
    if (colaborador_email) {
      await resend.emails.send({
        from: 'TechControl <onboarding@resend.dev>',
        to: colaborador_email,
        subject: `📋 Requisição ${numero} criada com sucesso`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
            <div style="background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
              <h2 style="margin:0;">📋 Requisição Recebida</h2>
            </div>
            <p>Olá, <strong>${colaborador_nome}</strong>!</p>
            <p>Sua requisição de compra foi criada com sucesso e já foi enviada para aprovação do seu responsável.</p>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
              <p><strong>Número:</strong> ${numero}</p>
              <p><strong>Item:</strong> ${item}</p>
              ${urgencia ? `<p><strong>Urgência:</strong> ${urgencia}</p>` : ''}
              <p><strong>Valor Estimado:</strong> ${valorRange}</p>
              <p><strong>Responsável:</strong> ${aprovador_nome}</p>
              <p><strong>Status:</strong> Aguardando Aprovador</p>
            </div>
            <a href="${portalUrl}/portal-requisicoes" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Acompanhar Requisição
            </a>
            <p style="color:#64748b;font-size:12px;margin-top:16px;">Você receberá um e-mail quando houver uma atualização na sua requisição.</p>
          </div>
        `,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});