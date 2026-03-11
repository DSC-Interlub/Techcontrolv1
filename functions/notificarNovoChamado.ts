const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ADM_EMAIL = 'adm.sp1@interlub.com';
const PORTAL_URL = 'https://preview-sandbox--691323397a0bc5c15e63e15d.base44.app/portal-chamados';

async function enviarEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: 'TechControl <suporte@techcontrol.site>', to: [to], subject, html }),
  });
  const json = await res.json();
  console.log(`[email] to=${to} status=${res.status} id=${json.id}`);
}

function htmlSolicitante(d) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;"><span style="background:#1e40af;border-radius:12px;padding:10px 22px;color:#fff;font-size:18px;font-weight:700;display:inline-block;">⚙ TechControl</span></td></tr><tr><td style="background:#ea580c;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">📋 Chamado Aberto</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Olá, ${d.solicitante_nome}!</p><p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Seu chamado foi registrado com sucesso.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 6px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${d.numero_chamado}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Tipo:</strong> ${d.tipo_solicitacao}<br><strong>Título:</strong> ${d.titulo_chamado || '-'}<br><strong>Urgência:</strong> ${d.urgencia}</td></tr></table><div style="text-align:center;"><a href="${PORTAL_URL}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">🔍 Acompanhar Chamado</a></div></td></tr><tr><td align="center" style="padding:24px 0 8px;"><p style="margin:0;font-size:12px;color:#9ca3af;">E-mail gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

function htmlAdmin(d) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;"><span style="background:#1e40af;border-radius:12px;padding:10px 22px;color:#fff;font-size:18px;font-weight:700;display:inline-block;">⚙ TechControl</span></td></tr><tr><td style="background:#ea580c;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">📋 Novo Chamado Aberto</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Olá, Administrador!</p><p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Novo chamado aberto por <strong>${d.solicitante_nome}</strong>.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 6px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${d.numero_chamado}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Solicitante:</strong> ${d.solicitante_nome}<br><strong>Tipo:</strong> ${d.tipo_solicitacao}<br><strong>Título:</strong> ${d.titulo_chamado || '-'}<br><strong>Urgência:</strong> ${d.urgencia}</td></tr></table><div style="text-align:center;"><a href="${PORTAL_URL}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">🔍 Ver Chamado</a></div></td></tr><tr><td align="center" style="padding:24px 0 8px;"><p style="margin:0;font-size:12px;color:#9ca3af;">E-mail gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const payload = await req.json();
  const chamado = payload.data || payload.chamadoData;

  if (!chamado) {
    return Response.json({ error: 'Sem dados' }, { status: 400 });
  }

  const solicitanteEmail = chamado.solicitante_email?.toLowerCase().trim();
  const envios = [];

  // Email para o solicitante
  if (solicitanteEmail) {
    envios.push(enviarEmail(
      chamado.solicitante_email,
      `[TechControl] Chamado ${chamado.numero_chamado} aberto com sucesso`,
      htmlSolicitante(chamado)
    ));
  }

  // Email para o admin (só se não for o próprio solicitante)
  if (ADM_EMAIL !== solicitanteEmail) {
    envios.push(enviarEmail(
      ADM_EMAIL,
      `[TechControl] Novo chamado: ${chamado.numero_chamado}`,
      htmlAdmin(chamado)
    ));
  }

  // Disparar em paralelo sem bloquear
  Promise.all(envios).catch(err => console.error('[notificarNovoChamado]', err.message));

  return Response.json({ success: true });
});