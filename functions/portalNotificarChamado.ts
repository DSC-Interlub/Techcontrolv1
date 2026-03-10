import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function enviarEmail(to, subject, html) {
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
  console.log(`[portalNotificarChamado] to=${to} status=${response.status}`);
  return result;
}

function buildEmail(destinatario, intro, chamadoData, acompanharUrl) {
  const { numeroChamado, solicitante_nome, tipo_solicitacao, titulo_chamado, urgencia } = chamadoData;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background-color:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7;padding:32px 16px;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;"><tr><td align="center" style="padding-bottom:20px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#1e40af;border-radius:12px;padding:10px 22px;"><span style="color:#fff;font-size:18px;font-weight:700;">⚙ TechControl</span></td></tr></table></td></tr><tr><td style="background:#ea580c;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">📋 Chamado Aberto</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Olá, ${destinatario}!</p><p style="margin:0 0 28px 0;font-size:15px;color:#6b7280;">${intro}</p><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px 24px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${numeroChamado}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Solicitante:</strong> ${solicitante_nome}<br><strong>Tipo:</strong> ${tipo_solicitacao}<br><strong>Título:</strong> ${titulo_chamado || '-'}<br><strong>Urgência:</strong> ${urgencia}</td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding-bottom:20px;"><a href="${acompanharUrl}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">🔍 Ver Portal do Colaborador</a></td></tr></table></td></tr><tr><td align="center" style="padding:24px 0 8px 0;"><p style="margin:0;font-size:12px;color:#9ca3af;">Este e-mail foi gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const { chamadoData, solicitanteEmail, acompanharUrl } = await req.json();

    // Envia em paralelo para: solicitante + ADM fixo
    await Promise.all([
      enviarEmail(
        solicitanteEmail,
        `[TechControl] Chamado ${chamadoData.numeroChamado} aberto com sucesso`,
        buildEmail(chamadoData.solicitante_nome, 'Seu chamado foi registrado com sucesso. Nossa equipe irá analisar e entrar em contato em breve.', chamadoData, acompanharUrl)
      ),
      enviarEmail(
        'adm.sp1@interlub.com',
        `[TechControl] Novo chamado aberto: ${chamadoData.numeroChamado}`,
        buildEmail('Administrador', `Um novo chamado foi aberto por <strong>${chamadoData.solicitante_nome}</strong> e aguarda atendimento.`, chamadoData, acompanharUrl)
      )
    ]);

    console.log(`[portalNotificarChamado] Enviados 2 emails`);
    return Response.json({ success: true, enviados: 2 });
  } catch (error) {
    console.error(`[portalNotificarChamado] Erro: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});