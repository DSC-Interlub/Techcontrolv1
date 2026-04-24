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

  // Buscar demandas do tipo aniversario_colaborador para hoje com arte carregada
  const demandas = await base44.asServiceRole.entities.Comunicados_Artes.filter({
    tipo_comunicado: "aniversario_colaborador",
    data_evento: hojeStr,
    status_arte: "arte_carregada",
  });

  if (demandas.length === 0) {
    console.log(`[enviarAniversariosColaboradores] Nenhuma demanda com arte carregada para hoje (${hojeStr}).`);
    return Response.json({ ok: true, enviados: 0, msg: "Nenhuma demanda com arte para hoje." });
  }

  // Buscar todos os colaboradores ativos para enviar o e-mail para todos
  const todosColabs = await base44.asServiceRole.entities.Colaboradores.filter({});
  const destinatariosGerais = todosColabs
    .filter(c => c.status !== "Desligado" && c.email && c.incluir_comunicados)
    .map(c => c.email);

  let enviados = 0;

  for (const demanda of demandas) {
    const colaborador = todosColabs.find(c => c.id === demanda.colaborador_id);
    if (!colaborador) continue;

    if (!ehHojeMesDia(colaborador.data_nascimento)) continue;

    const assunto = `Feliz Aniversário, ${colaborador.nome_completo.split(" ")[0]}! 🎉`;
    const html = buildComunicadoHtml(demanda.imagem_url);
    const dataEnvio = new Date().toISOString();

    try {
      for (const email of destinatariosGerais) {
        await resend.emails.send({ from: "TechControl <noreply@resend.dev>", to: email, subject: assunto, html });
      }

      await base44.asServiceRole.entities.Comunicados_Artes.update(demanda.id, {
        status_arte: "enviado",
        data_envio: dataEnvio,
      });

      const historico = colaborador.comunicados_historico || [];
      historico.push({ tipo: "aniversario_colaborador", data_envio: dataEnvio, ano: hoje.getFullYear(), destinatarios: destinatariosGerais, assunto });
      await base44.asServiceRole.entities.Colaboradores.update(colaborador.id, { comunicados_historico: historico });

      // Gravar log de envio
      await base44.asServiceRole.entities.Comunicados_Log.create({
        tipo_comunicado: "aniversario_colaborador",
        colaborador_nome: colaborador.nome_completo,
        colaborador_id: colaborador.id,
        destinatarios: destinatariosGerais,
        assunto_enviado: assunto,
        data_envio: dataEnvio,
        status: "enviado",
        demanda_id: demanda.id,
      });

      enviados++;
      console.log(`[enviarAniversariosColaboradores] Enviado para ${colaborador.nome_completo} (${destinatariosGerais.length} destinatários).`);
    } catch (err) {
      await base44.asServiceRole.entities.Comunicados_Log.create({
        tipo_comunicado: "aniversario_colaborador",
        colaborador_nome: colaborador.nome_completo,
        colaborador_id: colaborador.id,
        destinatarios: destinatariosGerais,
        assunto_enviado: assunto,
        data_envio: dataEnvio,
        status: "erro",
        detalhe_erro: err.message,
        demanda_id: demanda.id,
      });
      console.error(`[enviarAniversariosColaboradores] Erro ao enviar para ${colaborador.nome_completo}: ${err.message}`);
    }
  }

  return Response.json({ ok: true, enviados, msg: `${enviados} e-mail(s) de aniversário enviado(s).` });
});