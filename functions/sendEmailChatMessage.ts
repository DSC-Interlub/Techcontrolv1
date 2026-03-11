// sendEmailChatMessage
// Chamado após envio de mensagem no chat.
// - Se admin enviou → notifica o usuário
// - Se usuário enviou → notifica o admin
// Sem rate limit. Sempre envia.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const ADM_EMAIL = 'adm.sp1@interlub.com';
const PORTAL_URL = 'https://techcontrol.site/portal-login';

async function send(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'TechControl <suporte@techcontrol.site>', to: Array.isArray(to) ? to : [to], subject, html }),
  });
  const j = await res.json();
  console.log(`[sendEmailChatMessage] to=${JSON.stringify(to)} status=${res.status} id=${j.id}`);
}

function buildHtml(nome, remetente, mensagem, numero) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;"><span style="background:#1e40af;border-radius:12px;padding:10px 22px;color:#fff;font-size:18px;font-weight:700;display:inline-block;">⚙ TechControl</span></td></tr><tr><td style="background:#7c3aed;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">💬 Nova Mensagem</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Olá, ${nome}!</p><p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Você recebeu uma nova mensagem de <strong>${remetente}</strong>.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Chamado #${numero}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Mensagem:</strong><br>"${mensagem.substring(0, 300)}${mensagem.length > 300 ? '...' : ''}"</td></tr></table><div style="text-align:center;"><a href="${PORTAL_URL}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">💬 Ver Mensagem</a></div></td></tr><tr><td align="center" style="padding:24px 0 8px;"><p style="margin:0;font-size:12px;color:#9ca3af;">E-mail gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { chamado_id, tipo_remetente, remetente_nome, mensagem } = await req.json();

    if (!chamado_id || !tipo_remetente || !mensagem) {
      return Response.json({ success: false, message: 'Parâmetros inválidos' }, { status: 400 });
    }

    const chamado = await base44.asServiceRole.entities.Chamados.get(chamado_id);

    if (!chamado?.solicitante_email) {
      return Response.json({ success: false, message: 'Chamado não encontrado' }, { status: 400 });
    }

    if (tipo_remetente === 'admin') {
      // Admin enviou → notifica o usuário
      await send(
        chamado.solicitante_email,
        `[TechControl] Chamado ${chamado.numero_chamado} — Nova mensagem do suporte`,
        buildHtml(chamado.solicitante_nome, remetente_nome, mensagem, chamado.numero_chamado)
      );
      console.log(`[sendEmailChatMessage] Usuário notificado: ${chamado.solicitante_email}`);
    } else {
      // Usuário enviou → notifica o admin (sem rate limit)
      await send(
        ADM_EMAIL,
        `[TechControl] Chamado ${chamado.numero_chamado} — Nova mensagem de ${chamado.solicitante_nome}`,
        buildHtml('Administrador', remetente_nome || chamado.solicitante_nome, mensagem, chamado.numero_chamado)
      );
      console.log(`[sendEmailChatMessage] Admin notificado para chamado ${chamado_id}`);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('[sendEmailChatMessage] Erro:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});