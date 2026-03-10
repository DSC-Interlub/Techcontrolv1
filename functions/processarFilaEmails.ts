import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Busca todos os emails pendentes (máximo 10 por vez)
    const emailsPendentes = await base44.asServiceRole.entities.FilaEmails.filter(
      { status: 'pendente' },
      'created_date',
      10
    );

    if (emailsPendentes.length === 0) {
      return Response.json({ processados: 0, sucesso: 0, erro: 0 });
    }

    let sucessos = 0;
    let erros = 0;

    for (const email of emailsPendentes) {
      try {
        // Envia o email via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'TechControl <suporte@techcontrol.site>',
            to: [email.destinatario],
            subject: email.assunto,
            html: email.corpo_html,
          }),
        });

        if (response.ok) {
          // Atualiza como enviado
          await base44.asServiceRole.entities.FilaEmails.update(email.id, {
            status: 'enviado',
            data_envio: new Date().toISOString(),
            tentativas: email.tentativas + 1,
          });
          sucessos++;
          console.log(`✅ Email enviado para: ${email.destinatario}`);
        } else {
          const errorData = await response.json();
          throw new Error(`Resend error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }
      } catch (error) {
        // Atualiza como erro
        const novasTentativas = (email.tentativas || 0) + 1;
        await base44.asServiceRole.entities.FilaEmails.update(email.id, {
          status: novasTentativas >= 5 ? 'erro' : 'pendente', // Desista após 5 tentativas
          tentativas: novasTentativas,
          mensagem_erro: error.message,
        });
        erros++;
        console.error(`❌ Erro ao enviar para ${email.destinatario}: ${error.message}`);
      }
    }

    return Response.json({
      processados: emailsPendentes.length,
      sucesso: sucessos,
      erro: erros,
    });
  } catch (error) {
    console.error(`[processarFilaEmails] Erro fatal: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});