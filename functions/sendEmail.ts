Deno.serve(async (req) => {
  try {
    const { to, subject, body, html } = await req.json();

    if (!to || !subject || (!body && !html)) {
      return Response.json({ error: 'Parametros obrigatorios: to, subject, body' }, { status: 400 });
    }

    const emailPayload = {
      from: 'TechControl <suporte@techcontrol.site>',
      to: [to],
      subject,
    };

    if (html) {
      emailPayload.html = html;
    } else {
      emailPayload.text = body;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    console.log(`[sendEmail] to=${to} status=${response.status} result=${JSON.stringify(result)}`);

    if (!response.ok) {
      console.error(`[sendEmail] ERRO ao enviar para ${to}: ${JSON.stringify(result)}`);
      return Response.json({ error: result.message || result.name || 'Erro ao enviar e-mail', details: result }, { status: response.status });
    }

    return Response.json({ success: true, id: result.id });
  } catch (error) {
    console.error(`[sendEmail] Exception: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});