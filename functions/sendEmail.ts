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

    if (!response.ok) {
      return Response.json({ error: result.message || 'Erro ao enviar e-mail' }, { status: response.status });
    }

    return Response.json({ success: true, id: result.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});