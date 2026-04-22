import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const EMPRESA = 'sua empresa';

async function getArteAtiva(base44, tipo_comunicado) {
  const artes = await base44.asServiceRole.entities.Comunicados_Artes.filter({ tipo_comunicado, ativa: true });
  return artes.length > 0 ? artes[0].imagem_url : null;
}

function buildComunicadoHtml(assunto, arteUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;">
    <img src="${arteUrl}" alt="${assunto}" style="display:block;width:100%;max-width:640px;border:0;margin:0;padding:0;" />
    <div style="padding:12px 0;text-align:center;">
      <p style="margin:0;font-family:sans-serif;font-size:11px;color:#9ca3af;">© 2026 ${EMPRESA} · Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const TIPO = 'boas_vindas';

  const body = await req.json().catch(() => ({}));
  const { colaborador_id } = body;

  const todosAtivos = await base44.asServiceRole.entities.Colaboradores.filter({ status: 'Ativo', incluir_comunicados: true });
  const destinatarios = todosAtivos.map(c => c.email).filter(Boolean);

  let alvos = [];
  if (colaborador_id) {
    const colab = await base44.asServiceRole.entities.Colaboradores.get('Colaboradores', colaborador_id);
    if (colab) alvos = [colab];
  } else {
    alvos = await base44.asServiceRole.entities.Colaboradores.filter({ status: 'Ativo', comunicado_boas_vindas_enviado: false });
  }

  const arteUrl = await getArteAtiva(base44, TIPO);
  if (!arteUrl) {
    console.log(`E-mail de ${TIPO} não enviado em ${new Date().toISOString()} — nenhuma arte ativa cadastrada para este tipo.`);
    return Response.json({ ok: true, msg: 'Nenhuma arte ativa cadastrada para este tipo.', enviados: [] });
  }

  const enviados = [];

  for (const colab of alvos) {
    const assunto = `Boas-vindas, ${colab.nome_completo}! Seja muito bem-vindo(a)!`;
    const html = buildComunicadoHtml(assunto, arteUrl);

    await resend.emails.send({ from: 'Comunicados <comunicados@resend.dev>', to: destinatarios, subject: assunto, html });
    await base44.asServiceRole.entities.Colaboradores.update(colab.id, { comunicado_boas_vindas_enviado: true });
    enviados.push(colab.nome_completo);
  }

  return Response.json({ ok: true, enviados });
});