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

function ehHojeMesDia(dateStr) {
  if (!dateStr) return false;
  const hoje = new Date();
  const dt = new Date(dateStr + 'T00:00:00');
  return dt.getMonth() === hoje.getMonth() && dt.getDate() === hoje.getDate();
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createSupabaseAdmin();
    const hojeStr = new Date().toISOString().split('T')[0];

    const { data: demandas } = await supabase.from('comunicados_artes').select('*')
      .eq('tipo_comunicado', 'aniversario_colaborador')
      .eq('data_evento', hojeStr)
      .eq('status_arte', 'arte_carregada');

    if (!demandas?.length) {
      return res.status(200).json({ ok: true, enviados: 0, msg: 'Nenhuma demanda com arte para hoje.' });
    }

    const { data: todosColabs } = await supabase.from('colaboradores').select('*');
    const destinatarios = (todosColabs || [])
      .filter(c => c.status !== 'Desligado' && c.email && c.incluir_comunicados)
      .map(c => c.email);

    const transporter = criarTransporter();
    let enviados = 0;

    for (const demanda of demandas) {
      const colaborador = (todosColabs || []).find(c => c.id === demanda.colaborador_id);
      if (!colaborador || !ehHojeMesDia(colaborador.data_nascimento)) continue;

      const assunto = `🎂 Feliz Aniversário, ${colaborador.nome_completo}!`;
      const html = buildHtml(demanda.imagem_url);
      const dataEnvio = new Date().toISOString();

      try {
        await transporter.sendMail({
          from: `"TechControl" <${process.env.GMAIL_USER}>`,
          to: destinatarios.join(','),
          subject: assunto,
          html,
        });

        await supabase.from('comunicados_artes').update({ status_arte: 'enviado', data_envio: dataEnvio }).eq('id', demanda.id);
        await supabase.from('comunicados_log').insert({
          tipo_comunicado: 'aniversario_colaborador',
          colaborador_nome: colaborador.nome_completo,
          colaborador_id: colaborador.id,
          destinatarios,
          assunto_enviado: assunto,
          data_envio: dataEnvio,
          status: 'enviado',
          demanda_id: demanda.id,
        });

        enviados++;
      } catch (erro) {
        await supabase.from('comunicados_log').insert({
          tipo_comunicado: 'aniversario_colaborador',
          colaborador_nome: colaborador.nome_completo,
          colaborador_id: colaborador.id,
          destinatarios,
          assunto_enviado: assunto,
          data_envio: new Date().toISOString(),
          status: 'erro',
          detalhe_erro: erro.message,
          demanda_id: demanda.id,
        });
      }
    }

    return res.status(200).json({ ok: true, enviados, msg: `${enviados} processado(s).` });
  } catch (err) {
    console.error('[enviarAniversariosColaboradores] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
