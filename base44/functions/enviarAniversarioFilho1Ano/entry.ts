import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

async function getArteAtiva(base44, tipo_comunicado) {
  const artes = await base44.asServiceRole.entities.Comunicados_Artes.filter({ tipo_comunicado, ativa: true });
  return artes.length > 0 ? artes[0].imagem_url : null;
}

function registrarHistorico(colaborador, tipo, destinatarios, assunto) {
  const historico = colaborador.comunicados_historico || [];
  return [...historico, { tipo, data_envio: new Date().toISOString(), ano: new Date().getFullYear(), destinatarios, assunto }];
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const TIPO = 'aniversario_filho_1ano';
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();

  const todos = await base44.asServiceRole.entities.Colaboradores.filter({ status: 'Ativo' });

  const arteUrl = await getArteAtiva(base44, TIPO);
  const enviados = [];

  for (const colab of todos) {
    const filhos1Ano = (colab.filhos || []).filter(f => {
      if (!f.filho_data_nascimento) return false;
      const d = new Date(f.filho_data_nascimento + 'T00:00:00');
      const completaHoje = d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth();
      const completa1Ano = anoAtual - d.getFullYear() === 1;
      return completaHoje && completa1Ano;
    });

    for (const filho of filhos1Ano) {
      const tipoChave = `${TIPO}_${filho.filho_nome}`;
      const jaEnviou = (colab.comunicados_historico || []).some(h => h.tipo === tipoChave && h.ano === anoAtual);
      if (jaEnviou) continue;

      const assunto = `🎂 Feliz 1 Aninho, ${filho.filho_nome || 'bebê'}!`;
      const imgHtml = arteUrl ? `<img src="${arteUrl}" alt="Arte 1 Aninho" style="max-width:600px;width:100%;border-radius:12px;margin-bottom:24px;" />` : '';

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;text-align:center;">
          ${imgHtml}
          <h1 style="color:#7c3aed;">🎈 Feliz 1 Aninho!</h1>
          <p style="font-size:18px;"><strong>${filho.filho_nome || 'O bebê'}</strong> está completando 1 aninho hoje!</p>
          <p style="color:#6b7280;">Filho(a) de ${colab.nome_completo} · ${colab.area || ''}</p>
          <p style="font-size:16px;margin-top:20px;">Que venham muitos anos de saúde, sorrisos e alegria! 🧸</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px;">TechControl · Comunicados Internos</p>
        </div>`;

      const dests = [colab.email, colab.conjuge_email, colab.contato_responsavel_email].filter(Boolean);

      await resend.emails.send({
        from: 'Comunicados <comunicados@resend.dev>',
        to: dests,
        subject: assunto,
        html,
      });

      const novoHistorico = registrarHistorico(colab, tipoChave, dests, assunto);
      await base44.asServiceRole.entities.Colaboradores.update(colab.id, { comunicados_historico: novoHistorico });
      enviados.push(`${colab.nome_completo} → ${filho.filho_nome}`);
    }
  }

  return Response.json({ ok: true, enviados });
});