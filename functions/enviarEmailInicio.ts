import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function enviarEmail(to, subject, html) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TechControl <suporte@techcontrol.site>',
        to: [to],
        subject,
        html,
      }),
    });
    const result = await response.json();
    if (response.ok) {
      console.log(`[enviarEmailInicio] Email enviado para ${to}`);
    } else {
      console.error(`[enviarEmailInicio] Erro para ${to}: ${result.message}`);
    }
  } catch (error) {
    console.error(`[enviarEmailInicio] Erro: ${error.message}`);
  }
}

function buildEmail(nome, numero, responsavel) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7;padding:32px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

<tr><td align="center" style="padding-bottom:20px;">
  <table cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#1e40af;border-radius:12px;padding:10px 22px;">
      <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px;">⚙ TechControl</span>
    </td>
  </tr></table>
</td></tr>

<tr><td style="background:#3b82f6;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;">
  <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">⚡&nbsp;&nbsp;Atendimento Iniciado</p>
</td></tr>

<tr><td style="background:#ffffff;border-radius:0 0 10px 10px;padding:36px 40px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
  <p style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Olá, ${nome}!</p>
  <p style="margin:0 0 28px 0;font-size:15px;color:#6b7280;line-height:1.6;">Seu chamado está sendo atendido por <strong>${responsavel}</strong>. Acompanhe o progresso em tempo real!</p>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;">
    <tr><td style="padding:20px 24px 12px 24px;border-bottom:1px solid #e2e8f0;">
      <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;">Número do Chamado</p>
      <p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:'Courier New',Courier,monospace;letter-spacing:1px;">${numero}</p>
    </td></tr>
    <tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;">
      <strong>Responsável:</strong> ${responsavel}
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding-bottom:20px;">
      <a href="/portal-chamados" style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(30,64,175,0.3);">🔍 Acompanhar Chamado</a>
    </td></tr>
  </table>
</td></tr>

<tr><td align="center" style="padding:24px 0 8px 0;">
  <p style="margin:0;font-size:12px;color:#9ca3af;">Este e-mail foi gerado automaticamente pelo sistema <strong style="color:#6b7280;">TechControl</strong>.</p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { chamado_id, responsavel } = await req.json();

    const chamado = await base44.asServiceRole.entities.Chamados.get(chamado_id);
    
    if (!chamado || !chamado.solicitante_email) {
      return Response.json({ success: false }, { status: 400 });
    }

    enviarEmail(
      chamado.solicitante_email,
      `[TechControl] Chamado ${chamado.numero_chamado} - Atendimento Iniciado ⚡`,
      buildEmail(chamado.solicitante_nome, chamado.numero_chamado, responsavel)
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error(`[enviarEmailInicio] Erro: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});