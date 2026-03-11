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
  console.log(`[notificarNovoChamado] to=${to} status=${response.status} result=${JSON.stringify(result)}`);
  return result;
}

function buildEmailSolicitante(chamadoData, acompanharUrl) {
  const { numero_chamado, solicitante_nome, tipo_solicitacao, titulo_chamado, urgencia } = chamadoData;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background-color:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7;padding:32px 16px;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;"><tr><td align="center" style="padding-bottom:20px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#1e40af;border-radius:12px;padding:10px 22px;"><span style="color:#fff;font-size:18px;font-weight:700;">⚙ TechControl</span></td></tr></table></td></tr><tr><td style="background:#ea580c;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">📋 Chamado Aberto</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Olá, ${solicitante_nome}!</p><p style="margin:0 0 28px 0;font-size:15px;color:#6b7280;">Seu chamado foi registrado com sucesso. Nossa equipe irá analisar e entrar em contato em breve.</p><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px 24px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${numero_chamado}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Tipo:</strong> ${tipo_solicitacao}<br><strong>Título:</strong> ${titulo_chamado || '-'}<br><strong>Urgência:</strong> ${urgencia}</td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding-bottom:20px;"><a href="${acompanharUrl}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">🔍 Acompanhar Chamado</a></td></tr></table></td></tr><tr><td align="center" style="padding:24px 0 8px 0;"><p style="margin:0;font-size:12px;color:#9ca3af;">Este e-mail foi gerado automaticamente pelo <strong>TechControl</strong>. Por favor, não responda.</p></td></tr></table></td></tr></table></body></html>`;
}

function buildEmailAdmin(chamadoData, acompanharUrl) {
  const { numero_chamado, solicitante_nome, tipo_solicitacao, titulo_chamado, urgencia } = chamadoData;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background-color:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7;padding:32px 16px;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;"><tr><td align="center" style="padding-bottom:20px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#1e40af;border-radius:12px;padding:10px 22px;"><span style="color:#fff;font-size:18px;font-weight:700;">⚙ TechControl</span></td></tr></table></td></tr><tr><td style="background:#ea580c;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">📋 Novo Chamado Aberto</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Olá, Administrador!</p><p style="margin:0 0 28px 0;font-size:15px;color:#6b7280;">Um novo chamado foi aberto por <strong>${solicitante_nome}</strong> e aguarda atendimento.</p><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px 24px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${numero_chamado}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Solicitante:</strong> ${solicitante_nome}<br><strong>Tipo:</strong> ${tipo_solicitacao}<br><strong>Título:</strong> ${titulo_chamado || '-'}<br><strong>Urgência:</strong> ${urgencia}</td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding-bottom:20px;"><a href="${acompanharUrl}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">🔍 Ver Chamado</a></td></tr></table></td></tr><tr><td align="center" style="padding:24px 0 8px 0;"><p style="margin:0;font-size:12px;color:#9ca3af;">Este e-mail foi gerado automaticamente pelo <strong>TechControl</strong>. Por favor, não responda.</p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const chamado = payload.data || payload.chamadoData;

    if (!chamado) {
      return Response.json({ error: 'Nenhum dado de chamado' }, { status: 400 });
    }

    const acompanharUrl = 'https://preview-sandbox--691323397a0bc5c15e63e15d.base44.app/portal-chamados';

    // Único admin que recebe notificação de novo chamado
    const adminEmails = ['adm.sp1@interlub.com'];

    const solicitanteEmail = chamado.solicitante_email?.toLowerCase().trim();

    // Construir lista de envios — solicitante sempre recebe, admins recebem apenas se não forem o solicitante
    const envios = [];

    if (solicitanteEmail) {
      envios.push(enviarEmail(
        chamado.solicitante_email,
        `[TechControl] Chamado ${chamado.numero_chamado} aberto com sucesso`,
        buildEmailSolicitante(chamado, acompanharUrl)
      ));
    }

    for (const adminEmail of adminEmails) {
      if (adminEmail !== solicitanteEmail) {
        envios.push(enviarEmail(
          adminEmail,
          `[TechControl] Novo chamado aberto: ${chamado.numero_chamado}`,
          buildEmailAdmin(chamado, acompanharUrl)
        ));
      }
    }

    // Disparar em background sem bloquear a resposta
    Promise.all(envios).then(() => {
      console.log(`[notificarNovoChamado] Chamado ${chamado.numero_chamado} - ${envios.length} email(s) enviado(s)`);
    }).catch(err => console.error('[notificarNovoChamado] Erro:', err.message));

    return Response.json({ success: true });
  } catch (error) {
    console.error(`[notificarNovoChamado] Erro: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});