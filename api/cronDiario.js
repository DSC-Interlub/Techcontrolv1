import { createSupabaseAdmin } from './_supabase.js';
import { sendEmail } from './_email.js';

const ADM_EMAIL = 'adm.sp1@interlub.com';
const PORTAL_URL = 'https://techcontrol.site/portal-chamados';
const ANTI_SPAM_HORAS = 11;
const DIAS_UTEIS_ENCERRAMENTO = 5;

// ── AUXILIARES DE CHAMADOS ───────────────────────────────────────────────────
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

function buildTicketReminderHtml(chamado) {
  const { numero_chamado, solicitante_nome, responsavel, solucao } = chamado;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;"><span style="background:#1e40af;border-radius:12px;padding:10px 22px;color:#fff;font-size:18px;font-weight:700;display:inline-block;">⚙ TechControl</span></td></tr><tr><td style="background:#d97706;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">⭐ Avalie o Atendimento</p></td></tr><tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 40px;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Olá, ${solicitante_nome}!</p><p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Seu chamado <strong>${numero_chamado}</strong> foi resolvido por <strong>${responsavel || 'nossa equipe'}</strong> e está aguardando sua avaliação.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:monospace;">${numero_chamado}</p></td></tr>${solucao ? `<tr><td style="padding:16px 24px;font-size:14px;color:#374151;"><strong>Solução:</strong><br>${solucao}</td></tr>` : ''}</table><div style="text-align:center;"><a href="${PORTAL_URL}" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;">⭐ Avaliar Atendimento</a></div></td></tr><tr><td align="center" style="padding:24px 0 8px;"><p style="margin:0;font-size:12px;color:#9ca3af;">E-mail gerado automaticamente pelo <strong>TechControl</strong>.</p></td></tr></table></td></tr></table></body></html>`;
}

// ── AUXILIARES DE COMUNICADOS ────────────────────────────────────────────────
function buildImageComunicadoHtml(arteUrl) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;"><div style="max-width:640px;margin:0 auto;background:#ffffff;"><img src="${arteUrl}" style="display:block;width:100%;max-width:640px;border:0;margin:0;padding:0;" /><div style="padding:12px 0;text-align:center;"><p style="margin:0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} · Todos os direitos reservados</p></div></div></body></html>`;
}

function ehHojeMesDia(dateStr) {
  if (!dateStr) return false;
  const hoje = new Date();
  const dt = new Date(dateStr + 'T00:00:00');
  return dt.getMonth() === hoje.getMonth() && dt.getDate() === hoje.getDate();
}

async function processarComunicadoTipo(supabase, tipo, hojeStr, todosColabs) {
  const { data: demandas } = await supabase.from('comunicados_artes').select('*')
    .eq('tipo_comunicado', tipo)
    .eq('data_evento', hojeStr)
    .eq('status_arte', 'arte_carregada');

  if (!demandas?.length) return 0;

  const destinatariosGlobal = (todosColabs || [])
    .filter(c => c.status !== 'Desligado' && c.email && c.incluir_comunicados)
    .map(c => c.email);

  let enviados = 0;

  for (const demanda of demandas) {
    const colaborador = (todosColabs || []).find(c => c.id === demanda.colaborador_id);
    if (!colaborador) continue;

    let assunto, destinatarios;

    if (tipo === 'aniversario_colaborador') {
      if (!ehHojeMesDia(colaborador.data_nascimento)) continue;
      assunto = `🎂 Feliz Aniversário, ${colaborador.nome_completo}!`;
      destinatarios = destinatariosGlobal;
    } else if (tipo === 'aniversario_conjuge') {
      if (!ehHojeMesDia(colaborador.conjuge_data_nascimento)) continue;
      const nomeConjuge = colaborador.conjuge_nome || 'cônjuge';
      assunto = `Parabéns, ${nomeConjuge}! 🎂`;
      destinatarios = [colaborador.email, colaborador.conjuge_email, colaborador.contato_responsavel_email].filter(Boolean);
    } else if (tipo === 'aniversario_filho_1ano') {
      const nomeFilho = demanda.filho_nome || 'filho(a)';
      assunto = `Feliz 1 Aninho, ${nomeFilho}! 🎈`;
      destinatarios = [colaborador.email, colaborador.conjuge_email, colaborador.contato_responsavel_email].filter(Boolean);
    } else if (tipo === 'tempo_empresa') {
      const anos = demanda.anos_empresa || '?';
      assunto = `${colaborador.nome_completo} está completando ${anos} ano${anos > 1 ? 's' : ''} conosco! 🎉`;
      destinatarios = destinatariosGlobal;
    } else {
      continue;
    }

    if (!destinatarios?.length) continue;

    const dataEnvio = new Date().toISOString();
    const html = buildImageComunicadoHtml(demanda.imagem_url);

    try {
      await sendEmail({ to: destinatarios, subject: assunto, html, service: 'gmail' });

      await supabase.from('comunicados_artes').update({ status_arte: 'enviado', data_envio: dataEnvio }).eq('id', demanda.id);
      await supabase.from('comunicados_log').insert({
        tipo_comunicado: tipo, colaborador_nome: colaborador.nome_completo, colaborador_id: colaborador.id,
        destinatarios, assunto_enviado: assunto, data_envio: dataEnvio, status: 'enviado', demanda_id: demanda.id,
      });

      enviados++;
    } catch (erro) {
      await supabase.from('comunicados_log').insert({
        tipo_comunicado: tipo, colaborador_nome: colaborador.nome_completo, colaborador_id: colaborador.id,
        destinatarios, assunto_enviado: assunto, data_envio: dataEnvio, status: 'erro', detalhe_erro: erro.message, demanda_id: demanda.id,
      });
    }
  }

  return enviados;
}

// ── HANDLER PRINCIPAL (CRON DIÁRIO CONSOLIDADO) ─────────────────────────────────
export default async function handler(req, res) {
  // Aceita GET (Vercel Cron) ou POST (Chamadas Manuais)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { runType } = req.body || req.query || {};

  try {
    const supabase = createSupabaseAdmin();
    const results = {};

    // ─────────────────────────────────────────────────────────────────────────────
    // TAREFA 1: ENVIAR COMUNICADOS DIÁRIOS (ANIVERSÁRIOS E EMPRESA)
    // ─────────────────────────────────────────────────────────────────────────────
    if (!runType || runType === 'comunicados') {
      const hojeStr = new Date().toISOString().split('T')[0];
      const { data: todosColabs } = await supabase.from('colaboradores').select('*');

      const tipos = ['aniversario_colaborador', 'aniversario_conjuge', 'aniversario_filho_1ano', 'tempo_empresa'];
      const resultadosCom = {};
      for (const tipo of tipos) {
        resultadosCom[tipo] = await processarComunicadoTipo(supabase, tipo, hojeStr, todosColabs);
      }
      results.comunicados = resultadosCom;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TAREFA 2: LEMBRETES DE AVALIAÇÃO DE CHAMADOS & FECHAMENTO AUTOMÁTICO
    // ─────────────────────────────────────────────────────────────────────────────
    if (!runType || runType === 'avaliacoes') {
      const { data: todosChamados } = await supabase.from('chamados').select('*');
      const aguardando = (todosChamados || []).filter(c =>
        c.status === 'Aguardando Avaliação' && !c.avaliacao_data && c.solicitante_email
      );

      const agora = new Date();
      const agoraMs = Date.now();
      const limiteMs = ANTI_SPAM_HORAS * 60 * 60 * 1000;
      let enviados = 0, pulados = 0, encerrados = 0;

      for (const chamado of aguardando) {
        if (!chamado.data_conclusao) continue;
        const diasUteis = contarDiasUteis(new Date(chamado.data_conclusao), agora);
        if (diasUteis >= DIAS_UTEIS_ENCERRAMENTO) {
          const historico = [...(chamado.historico || [])];
          historico.push({ data_hora: agora.toISOString(), tipo: 'status', descricao: 'Chamado encerrado automaticamente após 5 dias úteis sem avaliação.', usuario: 'Sistema' });
          await supabase.from('chamados').update({ status: 'Resolvido', historico }).eq('id', chamado.id);
          encerrados++;
          continue;
        }
      }

      const aguardandoAtivos = aguardando.filter(c => {
        if (!c.data_conclusao) return true;
        return contarDiasUteis(new Date(c.data_conclusao), agora) < DIAS_UTEIS_ENCERRAMENTO;
      });

      for (const chamado of aguardandoAtivos) {
        if (chamado.ultimo_lembrete_enviado) {
          const ultimoMs = new Date(chamado.ultimo_lembrete_enviado).getTime();
          if (agoraMs - ultimoMs < limiteMs) { pulados++; continue; }
        }

        await sendEmail({
          to: chamado.solicitante_email,
          subject: `Avalie seu atendimento — Chamado ${chamado.numero_chamado}`,
          html: buildTicketReminderHtml(chamado),
          service: 'resend'
        });
        await supabase.from('chamados').update({ ultimo_lembrete_enviado: new Date().toISOString() }).eq('id', chamado.id);
        enviados++;
        await new Promise(r => setTimeout(r, 600)); // anti-rate limit
      }

      results.avaliacoes = { enviados, pulados, encerrados, total_aguardando: aguardando.length };
    }

    return res.status(200).json({ ok: true, results });
  } catch (err) {
    console.error('[cronDiario] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
