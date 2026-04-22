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

function jaEnviouEsteAno(colaborador, tipo) {
  const anoAtual = new Date().getFullYear();
  return (colaborador.comunicados_historico || []).some(h => h.tipo === tipo && h.ano === anoAtual);
}

function registrarHistorico(colaborador, tipo, destinatarios, assunto) {
  const historico = colaborador.comunicados_historico || [];
  return [...historico, { tipo, data_envio: new Date().toISOString(), ano: new Date().getFullYear(), destinatarios, assunto }];
}

function ehHoje(dateStr) {
  if (!dateStr) return false;
  const hoje = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const TIPO = 'aniversario_colaborador';
  const anoAtual = new Date().getFullYear();

  const todos = await base44.asServiceRole.entities.Colaboradores.filter({ status: 'Ativo', incluir_comunicados: true });
  const aniversariantes = todos.filter(c => ehHoje(c.data_nascimento));

  if (aniversariantes.length === 0) {
    return Response.json({ ok: true, msg: 'Nenhum aniversariante hoje.' });
  }

  const destinatarios = todos.map(c => c.email).filter(Boolean);
  const enviados = [];
  const semArte = [];

  for (const colab of aniversariantes) {
    if (jaEnviouEsteAno(colab, TIPO)) continue;

    // Buscar arte individual para este colaborador
    const artes = await base44.asServiceRole.entities.Comunicados_Artes.filter({
      colaborador_id: colab.id,
      tipo_comunicado: TIPO,
      ano_referencia: anoAtual,
      status_envio: 'pendente',
    });

    if (!artes || artes.length === 0) {
      console.log(`Arte não encontrada para ${colab.nome_completo} — tipo ${TIPO} — ano ${anoAtual}. E-mail não enviado.`);
      semArte.push(colab.nome_completo);
      continue;
    }

    const arte = artes[0];
    const assunto = `Feliz Aniversário, ${colab.nome_completo}! 🎉`;
    const html = buildComunicadoHtml(assunto, arte.imagem_url);

    await resend.emails.send({ from: 'Comunicados <comunicados@resend.dev>', to: destinatarios, subject: assunto, html });

    // Atualizar status da arte
    await base44.asServiceRole.entities.Comunicados_Artes.update(arte.id, {
      status_envio: 'enviado',
      data_envio: new Date().toISOString(),
    });

    const novoHistorico = registrarHistorico(colab, TIPO, destinatarios, assunto);
    await base44.asServiceRole.entities.Colaboradores.update(colab.id, { comunicados_historico: novoHistorico });
    enviados.push(colab.nome_completo);
  }

  return Response.json({ ok: true, enviados, semArte });
});