import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import nodemailer from 'npm:nodemailer@6.9.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { aprovador_email, aprovador_nome, requisicao_id, numero, colaborador_nome, item } = body;

    if (!aprovador_email) {
      return Response.json({ error: 'E-mail do aprovador não informado' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: Deno.env.get('GMAIL_USER'),
        pass: Deno.env.get('GMAIL_APP_PASSWORD'),
      },
    });

    const portalUrl = req.headers.get('origin') || 'https://app.base44.com';

    await transporter.sendMail({
      from: `"TechControl" <${Deno.env.get('GMAIL_USER')}>`,
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
          </div>
          <a href="${portalUrl}/portal-requisicoes" style="display:inline-block;background:#059669;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Acessar Portal para Aprovar
          </a>
          <p style="color:#64748b;font-size:12px;margin-top:16px;">Acesse o Portal do Colaborador e vá em "Para Aprovar" para analisar esta requisição.</p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});