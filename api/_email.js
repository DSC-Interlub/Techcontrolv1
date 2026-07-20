export async function sendEmail({ to, subject, html, cc }) {
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_KEY) {
    const errorMsg = "Erro de Configuração: RESEND_API_KEY não está configurada nas variáveis de ambiente.";
    console.error(`[sendEmail] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const body = {
    from: 'TechControl <suporte@techcontrol.site>',
    to: Array.isArray(to) ? to : [to],
    subject,
    html
  };

  if (cc) {
    body.cc = Array.isArray(cc) ? cc : [cc];
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get("content-type");
    let responseData = {};
    if (contentType && contentType.includes("application/json")) {
      responseData = await res.json();
    } else {
      responseData = { message: await res.text() };
    }

    console.log(`[sendEmail:resend] to=${to} cc=${cc || ''} status=${res.status} id=${responseData.id || 'N/A'}`);

    if (res.status >= 400) {
      const errorMsg = responseData.message || `Erro no Resend (Status: ${res.status})`;
      throw new Error(errorMsg);
    }

    return responseData;
  } catch (err) {
    console.error(`[sendEmail] Falha ao enviar e-mail: ${err.message}`);
    throw err;
  }
}

