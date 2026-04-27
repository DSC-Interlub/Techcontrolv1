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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split("T")[0];

  const demandas = await base44.asServiceRole.entities.Comunicados_Artes.filter({
    tipo_comunicado: "aniversario_filho_1ano",
    data_evento: hojeStr,
    status_arte: "arte_carregada",
  });

  if (demandas.length === 0) {
    console.log(`[enviarAniversarioFilho1Ano] Nenhuma demanda com arte para hoje (${hojeStr}).`);
    return Response.json({ ok: true, enviados: 0, msg: "Nenhuma demanda com arte para hoje." });
  }

  const todosColabs = await base44.asServiceRole.entities.Colaboradores.filter({});
  let enviados = 0;

  for (const demanda of demandas) {
    const colaborador = todosColabs.find(c => c.id === demanda.colaborador_id);
    if (!colaborador) continue;

    const nomeFilho = demanda.filho_nome || "filho(a)";
    const assunto = `Feliz 1 Aninho, ${nomeFilho}! 🎈`;
    const html = buildComunicadoHtml(demanda.imagem_url);
    const dataEnvio = new Date().toISOString();

    const destinatarios = [colaborador.email, colaborador.conjuge_email, colaborador.contato_responsavel_email].filter(Boolean);

    const emailsOk = [];
    const emailsErro = [];
    for (const email of destinatarios) {
      const result = await resend.emails.send({
        from: "TechControl <onboarding@resend.dev>",
        to: email,
        subject: assunto,
        html,
      });
      if (result.error) {
        console.error(`[enviarAniversarioFilho1Ano] RESEND ERRO para ${email}:`, JSON.stringify(result.error));
        emailsErro.push(email);
      } else {
        emailsOk.push(email);
      }
    }

    await base44.asServiceRole.entities.Comunicados_Artes.update(demanda.id, {
      status_arte: "enviado",
      data_envio: dataEnvio,
    });

    await base44.asServiceRole.entities.Comunicados_Log.create({
      tipo_comunicado: "aniversario_filho_1ano",
      colaborador_nome: colaborador.nome_completo,
      colaborador_id: colaborador.id,
      destinatarios: emailsOk,
      assunto_enviado: assunto,
      data_envio: dataEnvio,
      status: emailsErro.length === destinatarios.length ? "erro" : "enviado",
      detalhe_erro: emailsErro.length > 0 ? `Falhou para: ${emailsErro.join(", ")}` : undefined,
      demanda_id: demanda.id,
    });

    enviados++;
    console.log(`[enviarAniversarioFilho1Ano] ${colaborador.nome_completo} — filho: ${nomeFilho}: ${emailsOk.length} ok.`);
  }

  return Response.json({ ok: true, enviados, msg: `${enviados} processado(s).` });
});