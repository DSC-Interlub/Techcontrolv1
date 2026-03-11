// sendEmailTicketCreated
// Chamado quando um chamado é criado.
// Envia: 1 email para o usuário + 1 email para o admin (se não for o mesmo)
// Proteção: campo email_abertura_enviado evita duplicação

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const ADM_EMAIL = 'adm.sp1@interlub.com';
const PORTAL_URL = 'https://preview-sandbox--691323397a0bc5c15e63e15d.base44.app/portal-chamados';

async function send(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'TechControl <suporte@techcontrol.site>', to: [to], subject, html }),
  });
  const j = await res.json();
  console.log(`[sendEmailTicketCreated] to=${to} status=${res.status} id=${j.id}`);
}

function htmlUsuario(c) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;"><span style="background:#1e40af;border-radius:12px;padding:10px 22px;color:#fff;font-size:18px;font-weight:700;display:inline-block;">⚙ TechControl</span></td></tr><tr><td style="background:#ea580c;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">📋 Chamado Aberto</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Olá, ${c.solicitante_nome}!</p><p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Seu chamado foi registrado com sucesso. Nossa equipe irá analisá-lo em breve.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${c.numero_chamado}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Tipo:</strong> ${c.tipo_solicitacao}<br><strong>Título:</strong> ${c.titulo_chamado || '-'}<br><strong>Urgência:</strong> ${c.urgencia}</td></tr></table><div style="text-align:center;"><a href="${PORTAL_URL}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">🔍 Acompanhar Chamado</a></div></td></tr><tr><td align="center" style="padding:24px 0 8px;"><p style="margin:0;font-size:12px;color:#9ca3af;">E-mail gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

function htmlAdmin(c) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;"><span style="background:#1e40af;border-radius:12px;padding:10px 22px;color:#fff;font-size:18px;font-weight:700;display:inline-block;">⚙ TechControl</span></td></tr><tr><td style="background:#ea580c;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">📋 Novo Chamado Aberto</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Olá, Administrador!</p><p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Novo chamado aberto por <strong>${c.solicitante_nome}</strong> (${c.solicitante_area || '-'}).</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${c.numero_chamado}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Solicitante:</strong> ${c.solicitante_nome}<br><strong>Tipo:</strong> ${c.tipo_solicitacao}<br><strong>Título:</strong> ${c.titulo_chamado || '-'}<br><strong>Urgência:</strong> ${c.urgencia}</td></tr></table><div style="text-align:center;"><a href="${PORTAL_URL}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">🔍 Ver Chamado</a></div></td></tr><tr><td align="center" style="padding:24px 0 8px;"><p style="margin:0;font-size:12px;color:#9ca3af;">E-mail gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
  const base44 = createClientFromRequest(req);
  const payload = await req.json();

  // Suporta chamada direta (chamado_id), via automação (event.entity_id + data) ou payload.data
  let chamado = payload.data || null;
  const chamadoId = payload.chamado_id || payload.event?.entity_id || chamado?.id;

  if (chamadoId && !chamado) {
    chamado = await base44.asServiceRole.entities.Chamados.get(chamadoId);
  }

  if (!chamado?.solicitante_email) {
    return Response.json({ success: false, message: 'Dados insuficientes' }, { status: 400 });
  }

  // Proteção anti-duplicação
  if (chamado.email_abertura_enviado) {
    console.log(`[sendEmailTicketCreated] Já enviado para chamado ${chamado.id} — ignorado`);
    return Response.json({ success: true, skipped: true });
  }

  // Marca como enviado ANTES de disparar (evita race condition)
  await base44.asServiceRole.entities.Chamados.update(chamado.id, { email_abertura_enviado: true });

  const solicitanteEmailNorm = chamado.solicitante_email.toLowerCase().trim();

  // Dispara emails em paralelo (fire-and-forget)
  const promises = [
    send(
      chamado.solicitante_email,
      `[TechControl] Chamado ${chamado.numero_chamado} aberto com sucesso`,
      htmlUsuario(chamado)
    )
  ];

  if (ADM_EMAIL !== solicitanteEmailNorm) {
    promises.push(
      send(
        ADM_EMAIL,
        `[TechControl] Novo chamado: ${chamado.numero_chamado} — ${chamado.solicitante_nome}`,
        htmlAdmin(chamado)
      )
    );
  }

  Promise.all(promises).catch(err => console.error('[sendEmailTicketCreated] Erro:', err.message));

  return Response.json({ success: true });
  } catch (err) {
    console.error('[sendEmailTicketCreated] Erro fatal:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});