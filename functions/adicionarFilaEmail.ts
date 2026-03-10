import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { destinatario, assunto, corpo_html, tipo_evento, referencia_id } = await req.json();

    // Adiciona à fila de forma instantânea
    await base44.asServiceRole.entities.FilaEmails.create({
      destinatario,
      assunto,
      corpo_html,
      tipo_evento: tipo_evento || 'notificacao_geral',
      referencia_id: referencia_id || null,
      status: 'pendente',
      tentativas: 0,
      data_criacao: new Date().toISOString(),
    });

    // Retorna IMEDIATAMENTE
    return Response.json({ success: true, queued: true });
  } catch (error) {
    console.error(`[adicionarFilaEmail] Erro: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});