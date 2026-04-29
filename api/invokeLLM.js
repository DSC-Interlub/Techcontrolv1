import { createSupabaseAdmin } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createSupabaseAdmin();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return res.status(401).json({ error: 'Não autorizado' });
    }

    const { prompt, response_json_schema, max_tokens = 1000 } = req.body || {};

    const messages = [{ role: 'user', content: prompt }];
    let systemPrompt = 'You are a helpful assistant.';

    if (response_json_schema) {
      systemPrompt = 'You are a helpful assistant. Always respond with valid JSON matching the provided schema.';
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens,
        response_format: response_json_schema ? { type: 'json_object' } : undefined,
      }),
    });

    const data = await openaiRes.json();
    if (!openaiRes.ok) throw new Error(data.error?.message || 'OpenAI error');

    const content = data.choices[0].message.content;
    if (response_json_schema) {
      return res.status(200).json(JSON.parse(content));
    }
    return res.status(200).json({ result: content });
  } catch (err) {
    console.error('[invokeLLM] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
