import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const EMPRESA = 'sua empresa';

async function getArteAtiva(base44, tipo_comunicado) {
  const artes = await base44.asServiceRole.entities.Comunicados_Artes.filter({ tipo_comunicado, ativa: true });
  return artes.length > 0 ? artes[0].imagem_url : null;
}

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
  if (!arteUrl) {
    console.log(`E-mail de ${TIPO} não enviado em ${new Date().toISOString()} — nenhuma arte ativa cadastrada para este tipo.`);
    return Response.json({ ok: true, msg: 'Nenhuma arte ativa cadastrada para este tipo.', enviados: [] });
  }

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

      const assunto = `Feliz 1 Aninho, ${filho.filho_nome || 'bebê'}! 🎈`;
      const html = buildComunicadoHtml(assunto, arteUrl);

      const dests = [colab.email, colab.conjuge_email, colab.contato_responsavel_email].filter(Boolean);
      await resend.emails.send({ from: 'Comunicados <comunicados@resend.dev>', to: dests, subject: assunto, html });

      const novoHistorico = registrarHistorico(colab, tipoChave, dests, assunto);
      await base44.asServiceRole.entities.Colaboradores.update(colab.id, { comunicados_historico: novoHistorico });
      enviados.push(`${colab.nome_completo} → ${filho.filho_nome}`);
    }
  }

  return Response.json({ ok: true, enviados });
});