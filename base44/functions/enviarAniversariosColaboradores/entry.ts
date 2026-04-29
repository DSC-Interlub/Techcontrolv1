import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import nodemailer from 'npm:nodemailer@6.9.0';

function criarTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: Deno.env.get('GMAIL_USER'),
      pass: Deno.env.get('GMAIL_APP_PASSWORD'),
    },
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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const hojeStr = new Date().toISOString().split('T')[0];

  const demandas = await base44.asServiceRole.entities.Comunicados_Artes.filter({
    tipo_comunicado: 'aniversario_colaborador',
    data_evento: hojeStr,
    status_arte: 'arte_carregada',
  });

  if (demandas.length === 0) {
    console.log(`[enviarAniversariosColaboradores] Nenhuma demanda para hoje (${hojeStr}).`);
    return Response.json({ ok: true, enviados: 0, msg: 'Nenhuma demanda com arte para hoje.' });
  }

  const todosColabs = await base44.asServiceRole.entities.Colaboradores.filter({});
  const destinatarios = todosColabs
    .filter(c => c.status !== 'Desligado' && c.email && c.incluir_comunicados)
    .map(c => c.email);

  const transporter = criarTransporter();
  let enviados = 0;

  for (const demanda of demandas) {
    const colaborador = todosColabs.find(c => c.id === demanda.colaborador_id);
    if (!colaborador || !ehHojeMesDia(colaborador.data_nascimento)) continue;

    const assunto = `🎂 Feliz Aniversário, ${colaborador.nome_completo}!`;
    const html = buildHtml(demanda.imagem_url);
    const dataEnvio = new Date().toISOString();

    try {
      await transporter.sendMail({
        from: `"TechControl" <${Deno.env.get('GMAIL_USER')}>`,
        to: destinatarios.join(','),
        subject: assunto,
        html,
      });

      await base44.asServiceRole.entities.Comunicados_Artes.update(demanda.id, {
        status_arte: 'enviado',
        data_envio: dataEnvio,
      });

      await base44.asServiceRole.entities.Comunicados_Log.create({
        tipo_comunicado: 'aniversario_colaborador',
        colaborador_nome: colaborador.nome_completo,
        colaborador_id: colaborador.id,
        destinatarios,
        assunto_enviado: assunto,
        data_envio: dataEnvio,
        status: 'enviado',
        detalhe_erro: null,
        demanda_id: demanda.id,
      });

      enviados++;
      console.log(`[enviarAniversariosColaboradores] ${colaborador.nome_completo}: ${destinatarios.length} destinatários.`);
    } catch (erro) {
      console.error(`[enviarAniversariosColaboradores] Erro para ${colaborador.nome_completo}:`, erro.message);
      await base44.asServiceRole.entities.Comunicados_Log.create({
        tipo_comunicado: 'aniversario_colaborador',
        colaborador_nome: colaborador.nome_completo,
        colaborador_id: colaborador.id,
        destinatarios,
        assunto_enviado: assunto,
        data_envio: dataEnvio,
        status: 'erro',
        detalhe_erro: erro.message || 'Erro no envio Gmail',
        demanda_id: demanda.id,
      });
    }
  }

  return Response.json({ ok: true, enviados, msg: `${enviados} processado(s).` });
});