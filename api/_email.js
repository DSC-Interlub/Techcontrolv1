import nodemailer from 'nodemailer';

export async function sendEmail({ to, subject, html, service }) {
  const chosenService = service || (process.env.RESEND_API_KEY ? 'resend' : 'gmail');

  if (chosenService === 'resend' && process.env.RESEND_API_KEY) {
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'TechControl <suporte@techcontrol.site>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      }),
    });
    const j = await res.json();
    console.log(`[sendEmail:resend] to=${to} status=${res.status} id=${j.id}`);
    if (res.status >= 400) throw new Error(j.message || 'Erro no Resend');
    return j;
  } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    const info = await transporter.sendMail({
      from: `"TechControl" <${process.env.GMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html,
    });
    console.log(`[sendEmail:gmail] to=${to} messageId=${info.messageId}`);
    return info;
  } else {
    console.warn("[sendEmail] Nenhuma credencial de e-mail (Resend ou Gmail) configurada.");
    return { ok: false, warning: "Credenciais de e-mail não configuradas" };
  }
}
