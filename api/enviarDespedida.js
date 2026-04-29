import { createSupabaseAdmin } from './_supabase.js';
import nodemailer from 'nodemailer';

function criarTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

function buildHtml(arteUrl) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;"><div style="max-width:640px;margin:0 auto;background:#ffffff;"><img src="${arteUrl}" style="display:block;width:100%;max-width:640px;border:0;margin:0;padding:0;" /><div style="padding:12px 0;text-align:center;"><p style="margin:0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} · Todos os direitos reservados</p></div></div></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createSupabaseAdmin();

    const portalColabId = req.headers['x-portal-colaborador-id'];
    if (portalColabId) {
      const { data: colabs } = await supabase.from('colaboradores').select('*').eq('id', portalColabId);
      const c = colabs?.[0];
      if (!c || !(c.permissoes_comunicados || []).includes('enviar_despedida')) {
        return res.status(403).json({ error: 'Sem permissão' });
      }
    } else {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profile && !['admin', 'user', 'comunicados_dp'].includes(profile.role)) {
            return res.status(403).json({ error: 'Sem permissão' });
          }
        }
      }
    }

    const { colaborador_id } = req.body || {};
    if (!colaborador_id) return res.status(400).json({ error: 'colaborador_id é obrigatório' });

    const { data: colaboradores } = await supabase.from('colaboradores').select('*').eq('id', colaborador_id);
    const colaborador = colaboradores?.[0];
    if (!colaborador) return res.status(404).json({ error: 'Colaborador não encontrado' });

    const { data: demandas } = await supabase.from('comunicados_artes').select('*')
      .eq('colaborador_id', colaborador_id)
      .eq('tipo_comunicado', 'despedida')
      .eq('status_arte', 'arte_carregada');

    if (!demandas?.length) {
      return res.status(400).json({ ok: false, msg: 'Nenhuma arte de despedida carregada para este colaborador.' });
    }

    const demanda = demandas[0];
    const { data: todosColabs } = await supabase.from('colaboradores').select('*');
    const destinatarios = (todosColabs || [])
      .filter(c => c.status !== 'Desligado' && c.email && c.incluir_comunicados)
      .map(c => c.email);

    const assunto = `Até logo, ${colaborador.nome_completo} — obrigado por tudo! 💼`;
    const html = buildHtml(demanda.imagem_url);
    const dataEnvio = new Date().toISOString();
    const transporter = criarTransporter();

    try {
      await transporter.sendMail({
        from: `"TechControl" <${process.env.GMAIL_USER}>`,
        to: destinatarios.join(','),
        subject: assunto,
        html,
      });

      await supabase.from('comunicados_artes').update({ status_arte: 'enviado', data_envio: dataEnvio }).eq('id', demanda.id);
      await supabase.from('colaboradores').update({ comunicado_despedida_enviado: true }).eq('id', colaborador_id);
      await supabase.from('comunicados_log').insert({
        tipo_comunicado: 'despedida',
        colaborador_nome: colaborador.nome_completo,
        colaborador_id: colaborador.id,
        destinatarios,
        assunto_enviado: assunto,
        data_envio: dataEnvio,
        status: 'enviado',
        demanda_id: demanda.id,
      });

      return res.status(200).json({ ok: true, enviados: destinatarios.length, msg: `${destinatarios.length} e-mail(s) enviado(s).` });
    } catch (erro) {
      await supabase.from('comunicados_log').insert({
        tipo_comunicado: 'despedida',
        colaborador_nome: colaborador.nome_completo,
        colaborador_id: colaborador.id,
        destinatarios,
        assunto_enviado: assunto,
        data_envio: dataEnvio,
        status: 'erro',
        detalhe_erro: erro.message,
        demanda_id: demanda.id,
      });
      return res.status(500).json({ ok: false, msg: erro.message });
    }
  } catch (err) {
    console.error('[enviarDespedida] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
