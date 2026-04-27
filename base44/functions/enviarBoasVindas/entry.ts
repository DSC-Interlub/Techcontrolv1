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

async function buscarArteDemanda(base44, colaboradorId, anoAtual) {
  // Arte específica para o colaborador
  if (colaboradorId) {
    const artes = await base44.asServiceRole.entities.Comunicados_Artes.filter({
      colaborador_id: colaboradorId,
      tipo_comunicado: "boas_vindas",
      status_arte: "arte_carregada",
    });
    const arteDaAno = artes.find(a => !a.ano_referencia || a.ano_referencia === anoAtual);
    if (arteDaAno) return arteDaAno;
  }
  // Arte genérica (sem colaborador vinculado)
  const artesGen = await base44.asServiceRole.entities.Comunicados_Artes.filter({
    tipo_comunicado: "boas_vindas",
    status_arte: "arte_carregada",
  });
  const generica = artesGen.find(a => !a.colaborador_id || a.colaborador_id === "");
  return generica || null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const anoAtual = new Date().getFullYear();

  const portalColabId = req.headers.get("x-portal-colaborador-id");
  if (portalColabId) {
    const colabs = await base44.asServiceRole.entities.Colaboradores.filter({ id: portalColabId });
    const caller = colabs[0];
    if (!caller || !(caller.permissoes_comunicados || []).includes("enviar_boas_vindas")) {
      return Response.json({ error: "Permissão negada" }, { status: 403 });
    }
  }

  let body = {};
  try { body = await req.json(); } catch (_) {}
  const { colaborador_id } = body;

  const todosAtivos = await base44.asServiceRole.entities.Colaboradores.filter({ status: "Ativo", incluir_comunicados: true });
  const destinatarios = todosAtivos.map(c => c.email).filter(Boolean);

  let alvos = [];
  if (colaborador_id) {
    // Modo manual: envia para o colaborador específico independente da data de admissão
    const colabs = await base44.asServiceRole.entities.Colaboradores.filter({ id: colaborador_id });
    if (colabs[0]) alvos = [colabs[0]];
  } else {
    // Modo automático: apenas colaboradores admitidos nos últimos 7 dias
    // Evita spam em massa para colaboradores antigos com comunicado_boas_vindas_enviado = false
    const limiteData = new Date();
    limiteData.setDate(limiteData.getDate() - 7);
    const limiteDateStr = limiteData.toISOString().split("T")[0];

    const pendentes = await base44.asServiceRole.entities.Colaboradores.filter({ status: "Ativo", comunicado_boas_vindas_enviado: false });
    alvos = pendentes.filter(c => c.data_admissao && c.data_admissao >= limiteDateStr);
    console.log(`[enviarBoasVindas] Modo automático: ${pendentes.length} pendentes, ${alvos.length} elegíveis (admissão >= ${limiteDateStr}).`);
  }

  const enviados = [];
  const semArte = [];
  const erros = [];

  for (const colab of alvos) {
    const arte = await buscarArteDemanda(base44, colab.id, anoAtual);

    if (!arte) {
      console.log(`[enviarBoasVindas] Arte não encontrada para ${colab.nome_completo}.`);
      semArte.push(colab.nome_completo);
      await base44.asServiceRole.entities.Comunicados_Log.create({
        tipo_comunicado: "boas_vindas",
        colaborador_nome: colab.nome_completo,
        colaborador_id: colab.id,
        destinatarios: [],
        data_envio: new Date().toISOString(),
        status: "sem_arte",
      });
      continue;
    }

    const assunto = `Boas-vindas, ${colab.nome_completo}! Seja muito bem-vindo(a)! 👋`;
    const html = buildComunicadoHtml(arte.imagem_url);
    const dataEnvio = new Date().toISOString();

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
        console.error(`[enviarBoasVindas] RESEND ERRO para ${email}:`, JSON.stringify(result.error));
        emailsErro.push(email);
      } else {
        emailsOk.push(email);
      }
    }

    if (arte.colaborador_id) {
      await base44.asServiceRole.entities.Comunicados_Artes.update(arte.id, {
        status_arte: "enviado",
        data_envio: dataEnvio,
      });
    }

    await base44.asServiceRole.entities.Colaboradores.update(colab.id, { comunicado_boas_vindas_enviado: true });

    await base44.asServiceRole.entities.Comunicados_Log.create({
      tipo_comunicado: "boas_vindas",
      colaborador_nome: colab.nome_completo,
      colaborador_id: colab.id,
      destinatarios: emailsOk,
      assunto_enviado: assunto,
      data_envio: dataEnvio,
      status: emailsErro.length === destinatarios.length ? "erro" : "enviado",
      detalhe_erro: emailsErro.length > 0 ? `Falhou para: ${emailsErro.join(", ")}` : undefined,
      demanda_id: arte.id,
    });

    if (emailsErro.length > 0) erros.push(colab.nome_completo);
    else enviados.push(colab.nome_completo);
  }

  return Response.json({ ok: true, enviados, semArte, erros, msg: `${enviados.length} enviado(s), ${semArte.length} sem arte, ${erros.length} com erro.` });
});