import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    tipo_comunicado: "tempo_empresa",
    data_evento: hojeStr,
    status_arte: "arte_carregada",
  });

  if (demandas.length === 0) {
    console.log(`[enviarAniversarioTempoEmpresa] Nenhuma demanda com arte para hoje (${hojeStr}).`);
    return Response.json({ ok: true, enviados: 0, msg: "Nenhuma demanda com arte para hoje." });
  }

  const todosColabs = await base44.asServiceRole.entities.Colaboradores.filter({});
  const destinatariosGerais = todosColabs
    .filter(c => c.status !== "Desligado" && c.email && c.incluir_comunicados)
    .map(c => c.email);

  let enviados = 0;

  for (const demanda of demandas) {
    const colaborador = todosColabs.find(c => c.id === demanda.colaborador_id);
    if (!colaborador) continue;

    const anos = demanda.anos_empresa || "?";
    const assunto = `${colaborador.nome_completo} está completando ${anos} ano${anos > 1 ? "s" : ""} conosco! 🎉`;
    const html = buildComunicadoHtml(demanda.imagem_url);
    const dataEnvio = new Date().toISOString();

    try {
      for (const email of destinatariosGerais) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: assunto,
          body: html,
        });
      }

      await base44.asServiceRole.entities.Comunicados_Artes.update(demanda.id, {
        status_arte: "enviado",
        data_envio: dataEnvio,
      });

      await base44.asServiceRole.entities.Comunicados_Log.create({
        tipo_comunicado: "tempo_empresa",
        colaborador_nome: colaborador.nome_completo,
        colaborador_id: colaborador.id,
        destinatarios: destinatariosGerais,
        assunto_enviado: assunto,
        data_envio: dataEnvio,
        status: "enviado",
        detalhe_erro: null,
        demanda_id: demanda.id,
      });

      enviados++;
      console.log(`[enviarAniversarioTempoEmpresa] ${colaborador.nome_completo} — ${anos} anos: ${destinatariosGerais.length} enviados.`);
    } catch (erro) {
      console.error(`[enviarAniversarioTempoEmpresa] Erro para ${colaborador.nome_completo}:`, erro.message);

      await base44.asServiceRole.entities.Comunicados_Log.create({
        tipo_comunicado: "tempo_empresa",
        colaborador_nome: colaborador.nome_completo,
        colaborador_id: colaborador.id,
        destinatarios: destinatariosGerais,
        assunto_enviado: assunto,
        data_envio: dataEnvio,
        status: "erro",
        detalhe_erro: erro.message || "Erro desconhecido no SendEmail",
        demanda_id: demanda.id,
      });
    }
  }

  return Response.json({ ok: true, enviados, msg: `${enviados} processado(s).` });
});