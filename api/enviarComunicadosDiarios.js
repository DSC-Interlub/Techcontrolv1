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

async function processarTipo(supabase, transporter, tipo, hojeStr, todosColabs) {
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
    const html = buildHtml(demanda.imagem_url);

    try {
      await transporter.sendMail({
        from: `"TechControl" <${process.env.GMAIL_USER}>`,
        to: destinatarios.join(','),
        subject: assunto,
        html,
      });

      await supabase.from('comunicados_artes').update({ status_arte: 'enviado', data_envio: dataEnvio }).eq('id', demanda.id);
      await supabase.from('comunicados_log').insert({
        tipo_comunicado: tipo,
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
        tipo_comunicado: tipo,
        colaborador_nome: colaborador.nome_completo,
        colaborador_id: colaborador.id,
        destinatarios,
        assunto_enviado: assunto,
        data_envio: dataEnvio,
        status: 'erro',
        detalhe_erro: erro.message,
        demanda_id: demanda.id,
      });
    }
  }

  return enviados;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createSupabaseAdmin();
    const hojeStr = new Date().toISOString().split('T')[0];
    const transporter = criarTransporter();

    const { data: todosColabs } = await supabase.from('colaboradores').select('*');

    const tipos = ['aniversario_colaborador', 'aniversario_conjuge', 'aniversario_filho_1ano', 'tempo_empresa'];
    const resultados = {};

    for (const tipo of tipos) {
      resultados[tipo] = await processarTipo(supabase, transporter, tipo, hojeStr, todosColabs);
    }

    return res.status(200).json({ ok: true, resultados });
  } catch (err) {
    console.error('[enviarComunicadosDiarios] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
