import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const ADM_EMAIL = 'adm.sp1@interlub.com';
const PORTAL_URL = 'https://preview-sandbox--691323397a0bc5c15e63e15d.base44.app/portal-chamados';
const RATE_LIMIT_MS = 60 * 1000; // 1 minuto

// Rate limiting em memória por chamado para o admin
const admLastSent = {};

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'TechControl <suporte@techcontrol.site>', to: [to], subject, html }),
  });
  const json = await res.json();
  console.log(`[sendEmailChatMessage] to=${to} status=${res.status} id=${json.id}`);
}

function buildHtml(nome, remetente, mensagem, numero) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;"><span style="background:#1e40af;border-radius:12px;padding:10px 22px;color:#fff;font-size:18px;font-weight:700;display:inline-block;">⚙ TechControl</span></td></tr><tr><td style="background:#7c3aed;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">💬 Nova Mensagem</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Olá, ${nome}!</p><p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Você recebeu uma nova mensagem de <strong>${remetente}</strong>.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 6px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Chamado #${numero}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Mensagem:</strong><br>"${mensagem.substring(0, 200)}${mensagem.length > 200 ? '...' : ''}"</td></tr></table><div style="text-align:center;"><a href="${PORTAL_URL}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">💬 Ver Mensagem</a></div></td></tr><tr><td align="center" style="padding:24px 0 8px;"><p style="margin:0;font-size:12px;color:#9ca3af;">E-mail gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { chamado_id, remetente_nome, mensagem, sender_type } = await req.json();
    // sender_type: "admin" | "solicitante"

    const ticket = await base44.asServiceRole.entities.Chamados.get(chamado_id);
    if (!ticket) return Response.json({ error: 'Chamado não encontrado' }, { status: 404 });

    const solicitanteEmail = ticket.solicitante_email?.toLowerCase().trim();
    const agora = Date.now();

    if (sender_type === 'admin') {
      // ADM enviou → notificar usuário (sempre, imediato)
      if (ticket.solicitante_email) {
        sendEmail(
          ticket.solicitante_email,
          `[TechControl] Chamado ${ticket.numero_chamado} — Nova Mensagem`,
          buildHtml(ticket.solicitante_nome, remetente_nome, mensagem, ticket.numero_chamado)
        ).catch(err => console.error('[sendEmailChatMessage] Erro usuário:', err.message));
      }
    } else {
      // USUÁRIO enviou → notificar admin com rate limit de 1/min por chamado
      if (ADM_EMAIL !== solicitanteEmail) {
        const ultimoEnvio = admLastSent[chamado_id] || 0;
        const elapsed = agora - ultimoEnvio;

        if (elapsed >= RATE_LIMIT_MS) {
          admLastSent[chamado_id] = agora;

          // Persistir timestamp no ticket para sobreviver a cold starts
          base44.asServiceRole.entities.Chamados.update(chamado_id, {
            ultimo_email_admin_chat: new Date(agora).toISOString()
          }).catch(() => {});

          sendEmail(
            ADM_EMAIL,
            `[TechControl] Chamado ${ticket.numero_chamado} — Nova Mensagem de ${remetente_nome}`,
            buildHtml('Administrador', remetente_nome, mensagem, ticket.numero_chamado)
          ).catch(err => console.error('[sendEmailChatMessage] Erro admin:', err.message));

          console.log(`[sendEmailChatMessage] Admin notificado — chamado ${chamado_id}`);
        } else {
          const restante = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
          console.log(`[sendEmailChatMessage] Admin rate-limited (${restante}s) — chamado ${chamado_id}`);
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[sendEmailChatMessage] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});