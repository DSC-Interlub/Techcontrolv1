import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

async function getArteAtiva(base44, tipo_comunicado) {
  const artes = await base44.asServiceRole.entities.Comunicados_Artes.filter({ tipo_comunicado, ativa: true });
  return artes.length > 0 ? artes[0].imagem_url : null;
}

function jaEnviouEsteAno(colaborador, tipo) {
  const anoAtual = new Date().getFullYear();
  return (colaborador.comunicados_historico || []).some(h => h.tipo === tipo && h.ano === anoAtual);
}

function registrarHistorico(colaborador, tipo, destinatarios, assunto) {
  const historico = colaborador.comunicados_historico || [];
  return [
    ...historico,
    {
      tipo,
      data_envio: new Date().toISOString(),
      ano: new Date().getFullYear(),
      destinatarios,
      assunto,
    }
  ];
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

  const todos = await base44.asServiceRole.entities.Colaboradores.filter({ status: 'Ativo', incluir_comunicados: true });

  const aniversariantes = todos.filter(c => ehHoje(c.data_nascimento));
  if (aniversariantes.length === 0) {
    return Response.json({ ok: true, msg: 'Nenhum aniversariante hoje.' });
  }

  const arteUrl = await getArteAtiva(base44, TIPO);
  const destinatarios = todos.map(c => c.email).filter(Boolean);

  const enviados = [];

  for (const colab of aniversariantes) {
    if (jaEnviouEsteAno(colab, TIPO)) continue;

    const assunto = `🎂 Feliz Aniversário, ${colab.nome_completo}!`;
    const imgHtml = arteUrl ? `<img src="${arteUrl}" alt="Arte Aniversário" style="max-width:600px;width:100%;border-radius:12px;margin-bottom:24px;" />` : '';

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;text-align:center;">
        ${imgHtml}
        <h1 style="color:#4f46e5;">🎂 Feliz Aniversário!</h1>
        <p style="font-size:18px;">Hoje é aniversário de <strong>${colab.nome_completo}</strong>!</p>
        <p style="color:#6b7280;">Área: ${colab.area || '—'}</p>
        <p style="font-size:16px;margin-top:20px;">Que este novo ano seja repleto de conquistas, saúde e alegria! 🎉</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px;">TechControl · Comunicados Internos</p>
      </div>`;

    await resend.emails.send({
      from: 'Comunicados <comunicados@resend.dev>',
      to: destinatarios,
      subject: assunto,
      html,
    });

    const novoHistorico = registrarHistorico(colab, TIPO, destinatarios, assunto);
    await base44.asServiceRole.entities.Colaboradores.update(colab.id, { comunicados_historico: novoHistorico });
    enviados.push(colab.nome_completo);
  }

  return Response.json({ ok: true, enviados });
});