import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const PORTAL_URL = 'https://techcontrol.site/portal-chamados';
const ANTI_SPAM_HORAS = 11;
const DIAS_UTEIS_ENCERRAMENTO = 5;

// Conta dias úteis (seg-sex) entre duas datas
function contarDiasUteis(inicio, fim) {
  let count = 0;
  const cur = new Date(inicio);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(fim);
  end.setHours(0, 0, 0, 0);
  while (cur < end) {
    const dow = cur.getDay();
    if (dow >= 1 && dow <= 5) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

async function enviarEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'TechControl <suporte@techcontrol.site>', to: [to], subject, html }),
  });
  const data = await res.json();
  console.log(`[lembreteAvaliacao] email to=${to} status=${res.status} id=${data.id || data.error}`);
  return data;
}

function buildEmail(chamado) {
  const { numero_chamado, solicitante_nome, responsavel, solucao } = chamado;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7;padding:32px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

<tr><td align="center" style="padding-bottom:20px;">
  <table cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#1e40af;border-radius:12px;padding:10px 22px;">
      <span style="color:#fff;font-size:18px;font-weight:700;">⚙ TechControl</span>
    </td>
  </tr></table>
</td></tr>

<tr><td style="background:#d97706;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;">
  <p style="margin:0;color:#fff;font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">⭐ Avalie o Atendimento</p>
</td></tr>

<tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;">
  <p style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Olá, ${solicitante_nome}!</p>
  <p style="margin:0 0 24px 0;font-size:15px;color:#6b7280;">
    Seu chamado <strong>${numero_chamado}</strong> foi resolvido por <strong>${responsavel || 'nossa equipe'}</strong> e está aguardando sua avaliação.<br>
    Leva menos de 1 minuto — sua opinião é muito importante!
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;">
    <tr><td style="padding:20px 24px 12px 24px;border-bottom:1px solid #e2e8f0;">
      <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Número do Chamado</p>
      <p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${numero_chamado}</p>
    </td></tr>
    ${solucao ? `<tr><td style="padding:16px 24px;font-size:14px;color:#374151;"><strong>Solução aplicada:</strong><br>${solucao}</td></tr>` : ''}
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding-bottom:20px;">
      <a href="${PORTAL_URL}" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">⭐ Ir para o Portal e Avaliar</a>
    </td></tr>
  </table>
  <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Acesse o Portal do Colaborador e localize o chamado <strong>${numero_chamado}</strong> para avaliar.</p>
</td></tr>

<tr><td align="center" style="padding:24px 0 8px 0;">
  <p style="margin:0;font-size:12px;color:#9ca3af;">Este e-mail foi gerado automaticamente pelo <strong>TechControl</strong>. Por favor, não responda.</p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const todosChamados = await base44.asServiceRole.entities.Chamados.list();
    const aguardando = todosChamados.filter(c =>
      c.status === 'Aguardando Avaliação' &&
      !c.avaliacao_data &&
      c.solicitante_email
    );

    console.log(`[lembreteAvaliacao] Total chamados na base: ${todosChamados.length}`);
    console.log(`[lembreteAvaliacao] Chamados com status exato "Aguardando Avaliação" e sem avaliação: ${aguardando.length}`);

    const agoraMs = Date.now();
    const limiteMs = ANTI_SPAM_HORAS * 60 * 60 * 1000;
    let enviados = 0;
    let pulados = 0;
    let encerrados = 0;

    // Encerramento automático: chamados com 5+ dias úteis sem avaliação
    const agora = new Date();
    for (const chamado of aguardando) {
      if (!chamado.data_conclusao) continue;
      const diasUteis = contarDiasUteis(new Date(chamado.data_conclusao), agora);
      if (diasUteis >= DIAS_UTEIS_ENCERRAMENTO) {
        const historico = [...(chamado.historico || [])];
        historico.push({
          data_hora: agora.toISOString(),
          tipo: 'status',
          descricao: 'Chamado encerrado automaticamente após 5 dias úteis sem avaliação.',
          usuario: 'Sistema'
        });
        await base44.asServiceRole.entities.Chamados.update(chamado.id, {
          status: 'Resolvido',
          historico
        });
        console.log(`[lembreteAvaliacao] Encerrado automaticamente: ${chamado.numero_chamado} (${diasUteis} dias úteis)`);
        encerrados++;
        continue;
      }
    }

    // Re-filtrar após encerramento automático
    const aguardandoAtivos = aguardando.filter(c => {
      if (!c.data_conclusao) return true;
      return contarDiasUteis(new Date(c.data_conclusao), agora) < DIAS_UTEIS_ENCERRAMENTO;
    });

    for (const chamado of aguardandoAtivos) {
      // Anti-spam: verifica último lembrete
      if (chamado.ultimo_lembrete_enviado) {
        const ultimoMs = new Date(chamado.ultimo_lembrete_enviado).getTime();
        if (agoraMs - ultimoMs < limiteMs) {
          console.log(`[lembreteAvaliacao] Pulando ${chamado.numero_chamado} — lembrete enviado há menos de ${ANTI_SPAM_HORAS}h`);
          pulados++;
          continue;
        }
      }

      await enviarEmail(
        chamado.solicitante_email,
        `Avalie seu atendimento — Chamado ${chamado.numero_chamado}`,
        buildEmail(chamado)
      );

      // Atualiza timestamp do último lembrete
      await base44.asServiceRole.entities.Chamados.update(chamado.id, {
        ultimo_lembrete_enviado: new Date().toISOString()
      });

      enviados++;
      await new Promise(r => setTimeout(r, 600));
    }

    console.log(`[lembreteAvaliacao] Resultado: ${enviados} enviados, ${pulados} pulados, ${encerrados} encerrados automaticamente`);
    return Response.json({ success: true, enviados, pulados, encerrados, total_aguardando: aguardando.length });
  } catch (error) {
    console.error(`[lembreteAvaliacao] Erro: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});