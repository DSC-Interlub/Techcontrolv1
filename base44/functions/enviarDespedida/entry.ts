import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

async function getArteAtiva(base44, tipo_comunicado) {
  const artes = await base44.asServiceRole.entities.Comunicados_Artes.filter({ tipo_comunicado, ativa: true });
  return artes.length > 0 ? artes[0].imagem_url : null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Requer colaborador_id no body — chamada manual pelo painel
  const body = await req.json().catch(() => ({}));
  const { colaborador_id } = body;

  if (!colaborador_id) {
    return Response.json({ error: 'colaborador_id é obrigatório' }, { status: 400 });
  }

  const colab = await base44.asServiceRole.entities.Colaboradores.get('Colaboradores', colaborador_id);
  if (!colab) {
    return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
  }

  const todosAtivos = await base44.asServiceRole.entities.Colaboradores.filter({ status: 'Ativo', incluir_comunicados: true });
  const destinatarios = todosAtivos.map(c => c.email).filter(Boolean);

  const arteUrl = await getArteAtiva(base44, 'despedida');
  const imgHtml = arteUrl ? `<img src="${arteUrl}" alt="Despedida" style="max-width:600px;width:100%;border-radius:12px;margin-bottom:24px;" />` : '';
  const fotoHtml = colab.foto_url ? `<img src="${colab.foto_url}" alt="${colab.nome_completo}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;margin:16px auto;" />` : '';

  const assunto = `💼 Despedida de ${colab.nome_completo}`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;text-align:center;">
      ${imgHtml}
      ${fotoHtml}
      <h1 style="color:#6b7280;">💼 Despedida</h1>
      <h2 style="color:#111827;">${colab.nome_completo}</h2>
      <p style="color:#6b7280;font-size:14px;">Área: ${colab.area || '—'} ${colab.cargo ? `· ${colab.cargo}` : ''}</p>
      <p style="font-size:16px;margin-top:20px;color:#374151;">
        É com sentimento de gratidão que nos despedimos de <strong>${colab.nome_completo}</strong>,
        que encerra sua jornada conosco.
      </p>
      <p style="font-size:15px;color:#374151;">
        Agradecemos por toda a dedicação, comprometimento e contribuições ao longo do tempo em que esteve conosco.
        Desejamos muito sucesso nos próximos passos!
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px;">TechControl · Comunicados Internos</p>
    </div>`;

  await resend.emails.send({
    from: 'Comunicados <comunicados@resend.dev>',
    to: destinatarios,
    subject: assunto,
    html,
  });

  await base44.asServiceRole.entities.Colaboradores.update(colab.id, { comunicado_despedida_enviado: true });

  return Response.json({ ok: true, enviado: colab.nome_completo });
});