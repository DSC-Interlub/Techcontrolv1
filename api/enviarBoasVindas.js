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

async function buscarArte(supabase, colaboradorId, anoAtual) {
  if (colaboradorId) {
    const { data: artes } = await supabase.from('comunicados_artes').select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('tipo_comunicado', 'boas_vindas')
      .eq('status_arte', 'arte_carregada');
    const arteDaAno = (artes || []).find(a => !a.ano_referencia || a.ano_referencia === anoAtual);
    if (arteDaAno) return arteDaAno;
  }
  const { data: artesGen } = await supabase.from('comunicados_artes').select('*')
    .eq('tipo_comunicado', 'boas_vindas')
    .eq('status_arte', 'arte_carregada');
  return (artesGen || []).find(a => !a.colaborador_id || a.colaborador_id === '') || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createSupabaseAdmin();
    const anoAtual = new Date().getFullYear();

    const portalColabId = req.headers['x-portal-colaborador-id'];
    if (portalColabId) {
      const { data: colabs } = await supabase.from('colaboradores').select('*').eq('id', portalColabId);
      const caller = colabs?.[0];
      if (!caller || !(caller.permissoes_comunicados || []).includes('enviar_boas_vindas')) {
        return res.status(403).json({ error: 'Permissão negada' });
      }
    }

    const { colaborador_id } = req.body || {};

    const { data: todosAtivos } = await supabase.from('colaboradores').select('*')
      .eq('status', 'Ativo').eq('incluir_comunicados', true);
    const destinatarios = (todosAtivos || []).map(c => c.email).filter(Boolean);

    let alvos = [];
    if (colaborador_id) {
      const { data: colabs } = await supabase.from('colaboradores').select('*').eq('id', colaborador_id);
      if (colabs?.[0]) alvos = [colabs[0]];
    } else {
      const limiteData = new Date();
      limiteData.setDate(limiteData.getDate() - 7);
      const limiteDateStr = limiteData.toISOString().split('T')[0];
      const { data: pendentes } = await supabase.from('colaboradores').select('*')
        .eq('status', 'Ativo').eq('comunicado_boas_vindas_enviado', false);
      alvos = (pendentes || []).filter(c => c.data_admissao && c.data_admissao >= limiteDateStr);
    }

    const transporter = criarTransporter();
    const enviados = [], semArte = [], erros = [];

    for (const colab of alvos) {
      const arte = await buscarArte(supabase, colab.id, anoAtual);

      if (!arte) {
        semArte.push(colab.nome_completo);
        await supabase.from('comunicados_log').insert({
          tipo_comunicado: 'boas_vindas',
          colaborador_nome: colab.nome_completo,
          colaborador_id: colab.id,
          destinatarios: [],
          data_envio: new Date().toISOString(),
          status: 'sem_arte',
        });
        continue;
      }

      const assunto = `Boas-vindas, ${colab.nome_completo}! Seja muito bem-vindo(a)! 👋`;
      const html = buildHtml(arte.imagem_url);
      const dataEnvio = new Date().toISOString();

      try {
        await transporter.sendMail({
          from: `"TechControl" <${process.env.GMAIL_USER}>`,
          to: destinatarios.join(','),
          subject: assunto,
          html,
        });

        if (arte.colaborador_id) {
          await supabase.from('comunicados_artes').update({ status_arte: 'enviado', data_envio: dataEnvio }).eq('id', arte.id);
        }

        await supabase.from('colaboradores').update({ comunicado_boas_vindas_enviado: true }).eq('id', colab.id);
        await supabase.from('comunicados_log').insert({
          tipo_comunicado: 'boas_vindas',
          colaborador_nome: colab.nome_completo,
          colaborador_id: colab.id,
          destinatarios,
          assunto_enviado: assunto,
          data_envio: dataEnvio,
          status: 'enviado',
          demanda_id: arte.id,
        });

        enviados.push(colab.nome_completo);
      } catch (erro) {
        await supabase.from('comunicados_log').insert({
          tipo_comunicado: 'boas_vindas',
          colaborador_nome: colab.nome_completo,
          colaborador_id: colab.id,
          destinatarios,
          assunto_enviado: assunto,
          data_envio: dataEnvio,
          status: 'erro',
          detalhe_erro: erro.message,
          demanda_id: arte.id,
        });
        erros.push(colab.nome_completo);
      }
    }

    return res.status(200).json({ ok: true, enviados, semArte, erros, msg: `${enviados.length} enviado(s), ${semArte.length} sem arte, ${erros.length} com erro.` });
  } catch (err) {
    console.error('[enviarBoasVindas] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
