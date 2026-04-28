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

  const portalColabId = req.headers.get("x-portal-colaborador-id");
  if (portalColabId) {
    const colabChamador = await base44.asServiceRole.entities.Colaboradores.filter({ id: portalColabId });
    const c = colabChamador[0];
    if (!c || !(c.permissoes_comunicados || []).includes("enviar_despedida")) {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }
  } else {
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (user && !["admin", "user", "comunicados_dp"].includes(user.role)) {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }
  }

  let body = {};
  try { body = await req.json(); } catch (_) {}
  const { colaborador_id } = body;

  if (!colaborador_id) {
    return Response.json({ error: "colaborador_id é obrigatório" }, { status: 400 });
  }

  const colaboradores = await base44.asServiceRole.entities.Colaboradores.filter({ id: colaborador_id });
  const colaborador = colaboradores[0];
  if (!colaborador) {
    return Response.json({ error: "Colaborador não encontrado" }, { status: 404 });
  }

  const demandas = await base44.asServiceRole.entities.Comunicados_Artes.filter({
    colaborador_id,
    tipo_comunicado: "despedida",
    status_arte: "arte_carregada",
  });

  if (demandas.length === 0) {
    return Response.json({
      ok: false,
      msg: "Nenhuma arte de despedida carregada para este colaborador. Carregue a arte antes de enviar.",
    }, { status: 400 });
  }

  const demanda = demandas[0];
  const todosColabs = await base44.asServiceRole.entities.Colaboradores.filter({});
  const destinatarios = todosColabs
    .filter(c => c.status !== "Desligado" && c.email && c.incluir_comunicados)
    .map(c => c.email);

  const assunto = `Até logo, ${colaborador.nome_completo} — obrigado por tudo! 💼`;
  const html = buildComunicadoHtml(demanda.imagem_url);
  const dataEnvio = new Date().toISOString();

  try {
    for (const email of destinatarios) {
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
    await base44.asServiceRole.entities.Colaboradores.update(colaborador_id, {
      comunicado_despedida_enviado: true,
    });

    await base44.asServiceRole.entities.Comunicados_Log.create({
      tipo_comunicado: "despedida",
      colaborador_nome: colaborador.nome_completo,
      colaborador_id: colaborador.id,
      destinatarios,
      assunto_enviado: assunto,
      data_envio: dataEnvio,
      status: "enviado",
      detalhe_erro: null,
      demanda_id: demanda.id,
    });

    console.log(`[enviarDespedida] ${colaborador.nome_completo}: ${destinatarios.length} enviados.`);
    return Response.json({ ok: true, enviados: destinatarios.length, msg: `${destinatarios.length} e-mail(s) enviado(s).` });
  } catch (erro) {
    console.error(`[enviarDespedida] Erro para ${colaborador.nome_completo}:`, erro.message);

    await base44.asServiceRole.entities.Comunicados_Log.create({
      tipo_comunicado: "despedida",
      colaborador_nome: colaborador.nome_completo,
      colaborador_id: colaborador.id,
      destinatarios,
      assunto_enviado: assunto,
      data_envio: dataEnvio,
      status: "erro",
      detalhe_erro: erro.message || "Erro desconhecido no SendEmail",
      demanda_id: demanda.id,
    });

    return Response.json({ ok: false, msg: erro.message }, { status: 500 });
  }
});