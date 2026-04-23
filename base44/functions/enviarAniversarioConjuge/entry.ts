import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@2.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function buildComunicadoHtml(arteUrl) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:640px;margin:0 auto;background:#ffffff;">
<img src="${arteUrl}" style="display:block;width:100%;max-width:640px;border:0;margin:0;padding:0;" />
<div style="padding:12px 0;text-align:center;">
<p style="margin:0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} · Todos os direitos reservados</p>
</div></div></body></html>`;
}

function ehHojeMesDia(dateStr) {
  if (!dateStr) return false;
  const hoje = new Date();
  const dt = new Date(dateStr + "T00:00:00");
  return dt.getMonth() === hoje.getMonth() && dt.getDate() === hoje.getDate();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split("T")[0];

  const demandas = await base44.asServiceRole.entities.Comunicados_Artes.filter({
    tipo_comunicado: "aniversario_conjuge",
    data_evento: hojeStr,
    status_arte: "arte_carregada",
  });

  if (demandas.length === 0) {
    console.log(`[enviarAniversarioConjuge] Nenhuma demanda com arte para hoje (${hojeStr}).`);
    return Response.json({ ok: true, enviados: 0, msg: "Nenhuma demanda com arte para hoje." });
  }

  const todosColabs = await base44.asServiceRole.entities.Colaboradores.filter({});
  let enviados = 0;

  for (const demanda of demandas) {
    const colaborador = todosColabs.find(c => c.id === demanda.colaborador_id);
    if (!colaborador || !colaborador.conjuge_data_nascimento) continue;
    if (!ehHojeMesDia(colaborador.conjuge_data_nascimento)) continue;

    const nomeConjuge = colaborador.conjuge_nome || "cônjuge";
    const assunto = `Parabéns, ${nomeConjuge}! 🎂`;
    const html = buildComunicadoHtml(demanda.imagem_url);

    const destinatarios = [colaborador.email, colaborador.conjuge_email, colaborador.contato_responsavel_email]
      .filter(Boolean);

    for (const email of destinatarios) {
      await resend.emails.send({ from: "TechControl <noreply@resend.dev>", to: email, subject: assunto, html });
    }

    await base44.asServiceRole.entities.Comunicados_Artes.update(demanda.id, {
      status_arte: "enviado",
      data_envio: new Date().toISOString(),
    });

    enviados++;
    console.log(`[enviarAniversarioConjuge] Enviado para cônjuge de ${colaborador.nome_completo}.`);
  }

  return Response.json({ ok: true, enviados });
});