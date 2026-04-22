import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

async function getArteAtiva(base44, tipo_comunicado) {
  const artes = await base44.asServiceRole.entities.Comunicados_Artes.filter({ tipo_comunicado, ativa: true });
  return artes.length > 0 ? artes[0].imagem_url : null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Aceita colaborador_id no body para chamada manual
  const body = await req.json().catch(() => ({}));
  const { colaborador_id } = body;

  const todos = await base44.asServiceRole.entities.Colaboradores.filter({ status: 'Ativo', incluir_comunicados: true });
  const destinatarios = todos.map(c => c.email).filter(Boolean);

  let alvos = [];
  if (colaborador_id) {
    // Chamada manual para um colaborador específico
    const colab = await base44.asServiceRole.entities.Colaboradores.get('Colaboradores', colaborador_id);
    if (colab) alvos = [colab];
  } else {
    // Chamada automática: buscar todos pendentes
    alvos = await base44.asServiceRole.entities.Colaboradores.filter({ status: 'Ativo', comunicado_boas_vindas_enviado: false });
  }

  const arteUrl = await getArteAtiva(base44, 'boas_vindas');
  const enviados = [];

  for (const colab of alvos) {
    const imgHtml = arteUrl ? `<img src="${arteUrl}" alt="Boas-Vindas" style="max-width:600px;width:100%;border-radius:12px;margin-bottom:24px;" />` : '';
    const fotoHtml = colab.foto_url ? `<img src="${colab.foto_url}" alt="${colab.nome_completo}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;margin:16px auto;" />` : '';

    const assunto = `👋 Boas-Vindas, ${colab.nome_completo}!`;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;text-align:center;">
        ${imgHtml}
        ${fotoHtml}
        <h1 style="color:#059669;">👋 Seja bem-vindo(a)!</h1>
        <h2 style="color:#111827;">${colab.nome_completo}</h2>
        <table style="margin:16px auto;text-align:left;border-collapse:collapse;">
          ${colab.cargo ? `<tr><td style="padding:4px 12px;color:#6b7280;">Cargo:</td><td style="padding:4px 12px;font-weight:bold;">${colab.cargo}</td></tr>` : ''}
          ${colab.area ? `<tr><td style="padding:4px 12px;color:#6b7280;">Área:</td><td style="padding:4px 12px;font-weight:bold;">${colab.area}</td></tr>` : ''}
          ${colab.local_trabalho ? `<tr><td style="padding:4px 12px;color:#6b7280;">Local:</td><td style="padding:4px 12px;font-weight:bold;">${colab.local_trabalho}</td></tr>` : ''}
          ${colab.email ? `<tr><td style="padding:4px 12px;color:#6b7280;">E-mail:</td><td style="padding:4px 12px;">${colab.email}</td></tr>` : ''}
          ${colab.graduacao ? `<tr><td style="padding:4px 12px;color:#6b7280;">Formação:</td><td style="padding:4px 12px;">${colab.graduacao}</td></tr>` : ''}
        </table>
        ${colab.resumo_experiencia ? `<p style="color:#374151;font-style:italic;padding:0 24px;">"${colab.resumo_experiencia}"</p>` : ''}
        <p style="font-size:16px;margin-top:20px;">Estamos muito felizes em tê-lo(a) no time! 🎉</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px;">TechControl · Comunicados Internos</p>
      </div>`;

    await resend.emails.send({
      from: 'Comunicados <comunicados@resend.dev>',
      to: destinatarios,
      subject: assunto,
      html,
    });

    await base44.asServiceRole.entities.Colaboradores.update(colab.id, { comunicado_boas_vindas_enviado: true });
    enviados.push(colab.nome_completo);
  }

  return Response.json({ ok: true, enviados });
});