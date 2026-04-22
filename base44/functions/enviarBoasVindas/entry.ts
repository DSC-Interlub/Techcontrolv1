import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const EMPRESA = 'sua empresa';

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

async function buscarArte(base44, colaboradorId, anoAtual) {
  const TIPO = 'boas_vindas';
  // 1. Arte personalizada para o colaborador
  if (colaboradorId) {
    const artes = await base44.asServiceRole.entities.Comunicados_Artes.filter({
      colaborador_id: colaboradorId,
      tipo_comunicado: TIPO,
      ano_referencia: anoAtual,
      status_envio: 'pendente',
    });
    if (artes && artes.length > 0) return artes[0];
  }
  // 2. Arte genérica (colaborador_id vazio)
  const artesGen = await base44.asServiceRole.entities.Comunicados_Artes.filter({
    colaborador_id: '',
    tipo_comunicado: TIPO,
    status_envio: 'pendente',
  });
  return artesGen && artesGen.length > 0 ? artesGen[0] : null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const TIPO = 'boas_vindas';
  const anoAtual = new Date().getFullYear();

  const body = await req.json().catch(() => ({}));
  const { colaborador_id } = body;

  // Verificar se chamada vem de colaborador do portal com permissão
  // Se há header de colaborador portal, verificar permissão
  const portalColabId = req.headers.get('x-portal-colaborador-id');
  if (portalColabId) {
    const callerColabs = await base44.asServiceRole.entities.Colaboradores.filter({});
    const caller = callerColabs.find(c => c.id === portalColabId);
    if (!caller || !(caller.permissoes_comunicados || []).includes('enviar_boas_vindas')) {
      return Response.json({ error: 'Permissão negada' }, { status: 403 });
    }
  }

  const todosAtivos = await base44.asServiceRole.entities.Colaboradores.filter({ status: 'Ativo', incluir_comunicados: true });
  const destinatarios = todosAtivos.map(c => c.email).filter(Boolean);

  let alvos = [];
  if (colaborador_id) {
    const colabs = await base44.asServiceRole.entities.Colaboradores.filter({ status: 'Ativo' });
    const colab = colabs.find(c => c.id === colaborador_id);
    if (colab) alvos = [colab];
  } else {
    alvos = await base44.asServiceRole.entities.Colaboradores.filter({ status: 'Ativo', comunicado_boas_vindas_enviado: false });
  }

  const enviados = [];
  const semArte = [];

  for (const colab of alvos) {
    const arte = await buscarArte(base44, colab.id, anoAtual);

    if (!arte) {
      console.log(`Arte não encontrada para ${colab.nome_completo} — tipo ${TIPO} — ano ${anoAtual}. E-mail não enviado.`);
      semArte.push(colab.nome_completo);
      continue;
    }

    const assunto = `Boas-vindas, ${colab.nome_completo}! Seja muito bem-vindo(a)!`;
    const html = buildComunicadoHtml(assunto, arte.imagem_url);

    await resend.emails.send({ from: 'Comunicados <comunicados@resend.dev>', to: destinatarios, subject: assunto, html });

    // Marcar arte como enviada apenas se for personalizada (genérica pode ser reutilizada)
    if (arte.colaborador_id) {
      await base44.asServiceRole.entities.Comunicados_Artes.update(arte.id, {
        status_envio: 'enviado',
        data_envio: new Date().toISOString(),
      });
    }

    await base44.asServiceRole.entities.Colaboradores.update(colab.id, { comunicado_boas_vindas_enviado: true });
    enviados.push(colab.nome_completo);
  }

  return Response.json({ ok: true, enviados, semArte });
});