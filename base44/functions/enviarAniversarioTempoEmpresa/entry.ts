import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const MARCOS = [1, 2, 3, 5, 10, 15, 20];

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
  return [...historico, { tipo, data_envio: new Date().toISOString(), ano: new Date().getFullYear(), destinatarios, assunto }];
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();

  const todos = await base44.asServiceRole.entities.Colaboradores.filter({ status: 'Ativo', incluir_comunicados: true });

  const destinatarios = todos.map(c => c.email).filter(Boolean);

  // Buscar artes disponíveis
  const arte1Ano = await getArteAtiva(base44, 'tempo_empresa_1ano');
  const arte5Anos = await getArteAtiva(base44, 'tempo_empresa_5anos');
  const arte10Anos = await getArteAtiva(base44, 'tempo_empresa_10anos');

  function escolherArte(anos) {
    if (anos >= 10) return arte10Anos || arte5Anos || arte1Ano;
    if (anos >= 5) return arte5Anos || arte1Ano;
    return arte1Ano;
  }

  const enviados = [];

  for (const colab of todos) {
    if (!colab.data_admissao) continue;
    const admissao = new Date(colab.data_admissao + 'T00:00:00');
    const ehAniversario = admissao.getDate() === hoje.getDate() && admissao.getMonth() === hoje.getMonth();
    if (!ehAniversario) continue;

    const anosCompletos = anoAtual - admissao.getFullYear();
    if (!MARCOS.includes(anosCompletos)) continue;

    const TIPO = `tempo_empresa_${anosCompletos}anos`;
    if (jaEnviouEsteAno(colab, TIPO)) continue;

    const arteUrl = escolherArte(anosCompletos);
    const imgHtml = arteUrl ? `<img src="${arteUrl}" alt="Tempo de Empresa" style="max-width:600px;width:100%;border-radius:12px;margin-bottom:24px;" />` : '';
    const assunto = `🏆 ${colab.nome_completo} está completando ${anosCompletos} ano${anosCompletos > 1 ? 's' : ''} na empresa!`;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;text-align:center;">
        ${imgHtml}
        <h1 style="color:#d97706;">🏆 ${anosCompletos} Ano${anosCompletos > 1 ? 's' : ''} de Empresa!</h1>
        <p style="font-size:18px;"><strong>${colab.nome_completo}</strong> está completando <strong>${anosCompletos} ano${anosCompletos > 1 ? 's' : ''}</strong> conosco!</p>
        <p style="color:#6b7280;">Área: ${colab.area || '—'} ${colab.cargo ? `· ${colab.cargo}` : ''}</p>
        <p style="font-size:16px;margin-top:20px;">Obrigado pela dedicação e pelo tempo investido. Você é parte fundamental da nossa história! 🌟</p>
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
    enviados.push(`${colab.nome_completo} (${anosCompletos} anos)`);
  }

  return Response.json({ ok: true, enviados });
});