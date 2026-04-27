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
    tipo_comunicado: "aniversario_colaborador",
    data_evento: hojeStr,
    status_arte: "arte_carregada",
  });

  if (demandas.length === 0) {
    console.log(`[enviarAniversariosColaboradores] Nenhuma demanda com arte carregada para hoje (${hojeStr}).`);
    return Response.json({ ok: true, enviados: 0, msg: "Nenhuma demanda com arte para hoje." });
  }

  const todosColabs = await base44.asServiceRole.entities.Colaboradores.filter({});
  const destinatariosGerais = todosColabs
    .filter(c => c.status !== "Desligado" && c.email && c.incluir_comunicados)
    .map(c => c.email);

  if (destinatariosGerais.length === 0) {
    console.log(`[enviarAniversariosColaboradores] Nenhum destinatário encontrado.`);
    return Response.json({ ok: true, enviados: 0, msg: "Nenhum destinatário encontrado." });
  }

  let enviados = 0;

  for (const demanda of demandas) {
    const colaborador = todosColabs.find(c => c.id === demanda.colaborador_id);
    if (!colaborador) continue;
    if (!ehHojeMesDia(colaborador.data_nascimento)) continue;

    const assunto = `Feliz Aniversário, ${colaborador.nome_completo.split(" ")[0]}! 🎂`;
    const html = buildComunicadoHtml(demanda.imagem_url);
    const dataEnvio = new Date().toISOString();

    // Enviar um a um para capturar erros individuais
    const emailsComErro = [];
    const emailsOk = [];
    for (const email of destinatariosGerais) {
      const result = await resend.emails.send({
        from: "TechControl <onboarding@resend.dev>",
        to: email,
        subject: assunto,
        html,
      });
      if (result.error) {
        console.error(`[enviarAniversariosColaboradores] RESEND ERRO para ${email}:`, JSON.stringify(result.error));
        emailsComErro.push(email);
      } else {
        emailsOk.push(email);
      }
    }

    const statusFinal = emailsComErro.length === destinatariosGerais.length ? "erro"
      : emailsComErro.length > 0 ? "enviado" : "enviado";

    await base44.asServiceRole.entities.Comunicados_Artes.update(demanda.id, {
      status_arte: "enviado",
      data_envio: dataEnvio,
    });

    const historico = colaborador.comunicados_historico || [];
    historico.push({ tipo: "aniversario_colaborador", data_envio: dataEnvio, ano: hoje.getFullYear(), destinatarios: emailsOk, assunto });
    await base44.asServiceRole.entities.Colaboradores.update(colaborador.id, { comunicados_historico: historico });

    await base44.asServiceRole.entities.Comunicados_Log.create({
      tipo_comunicado: "aniversario_colaborador",
      colaborador_nome: colaborador.nome_completo,
      colaborador_id: colaborador.id,
      destinatarios: emailsOk,
      assunto_enviado: assunto,
      data_envio: dataEnvio,
      status: statusFinal,
      detalhe_erro: emailsComErro.length > 0 ? `Falhou para: ${emailsComErro.join(", ")}` : undefined,
      demanda_id: demanda.id,
    });

    enviados++;
    console.log(`[enviarAniversariosColaboradores] ${colaborador.nome_completo}: ${emailsOk.length} ok, ${emailsComErro.length} erro.`);
  }

  return Response.json({ ok: true, enviados, msg: `${enviados} e-mail(s) de aniversário processado(s).` });
});