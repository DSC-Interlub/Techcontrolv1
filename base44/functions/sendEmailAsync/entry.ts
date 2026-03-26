// Função APENAS para enviar e retornar imediatamente
// O envio acontece de forma assíncrona NO BACKGROUND do Resend

Deno.serve(async (req) => {
  try {
    const { to, subject, html } = await req.json();

    // CRITICAL: Não await - apenas inicia o fetch e retorna imediatamente
    // Resend vai lidar com o envio em background
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TechControl <suporte@techcontrol.site>',
        to: [to],
        subject,
        html,
      }),
    }).catch(err => console.error('[sendEmailAsync] Erro:', err.message));

    // Retorna IMEDIATAMENTE sem esperar o envio
    return Response.json({ success: true, queued: true });
  } catch (error) {
    console.error(`[sendEmailAsync] Erro: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});