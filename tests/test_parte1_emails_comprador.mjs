import assert from 'node:assert';
import handler from '../api/requisicaoComprasAction.js';

console.log('=================================================================');
console.log('TESTE DA PARTE 1: E-MAILS DO COMPRADOR E RESILIÊNCIA RESEND (429)');
console.log('=================================================================\n');

// 1. Mock do Supabase
let dbRequisicao = {
  id: 'req-teste-fase2',
  numero_requisicao: 'REQ-2026-F2',
  item: 'Servidor Dell PowerEdge R750',
  quantidade: 1,
  unidade_medida: 'un',
  status: 'Aguardando Aprovação Final',
  cotacao_valor: 45000.00,
  cotacao_fornecedor: 'Dell Computadores do Brasil',
  colaborador_id: 'colab-solicitante-01',
  colaborador_nome: 'Lucas Desenvolvedor',
  colaborador_email: 'lucas@interlub.com',
  colaborador_area: 'TI / Infraestrutura',
  aprovador_nome: 'Gestor Antigo',
  aprovador_email: 'gestor.antigo@interlub.com',
  anexos: [{ file_url: 'https://exemplo.com/cotacao.pdf', file_name: 'cotacao.pdf' }],
  historico: []
};

const mockColaboradores = [
  { id: '1', nome_completo: 'Juliana Compradora Flag', email: 'juliana.compras@interlub.com', eh_comprador: true, area: 'Logística', status: 'Ativo' },
  { id: '2', nome_completo: 'Marcos Comprador Area', email: 'marcos.suprimentos@interlub.com', eh_comprador: false, area: 'Compras e Suprimentos', status: 'Ativo' },
  { id: '3', nome_completo: 'Renata Desligada', email: 'renata.antiga@interlub.com', eh_comprador: true, area: 'Compras', status: 'Desligado' },
  { id: '4', nome_completo: 'Juliana Duplicada Com Espaços', email: ' JULIANA.COMPRAS@interlub.com ', eh_comprador: true, area: 'Compras', status: 'Ativo' }
];

// Mock da chamada do createSupabaseAdmin
globalThis.__mockSupabase = {
  from: (table) => {
    if (table === 'colaboradores') {
      return {
        select: (cols) => ({
          or: (filterStr) => ({
            neq: (statusField, statusVal) => {
              // Aplica a mesma regra da query: (eh_comprador = true or area ilike '%compras%') and status <> 'Desligado'
              const filtrados = mockColaboradores.filter(c => {
                const matchOr = c.eh_comprador === true || (c.area && c.area.toLowerCase().includes('compras'));
                const matchNeq = c.status !== statusVal;
                return matchOr && matchNeq;
              });
              return Promise.resolve({ data: filtrados, error: null });
            }
          })
        })
      };
    }

    if (table === 'configuracoes') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { valor: 'vtorres@interlub.com' }, error: null })
          })
        })
      };
    }

    if (table === 'requisicao_compras') {
      return {
        select: (cols) => ({
          eq: (field, val) => ({
            maybeSingle: () => Promise.resolve({ data: { ...dbRequisicao }, error: null }),
            limit: () => Promise.resolve({ data: [{ ...dbRequisicao }], error: null })
          })
        }),
        update: (payload) => ({
          eq: (field, val) => {
            Object.assign(dbRequisicao, payload);
            return Promise.resolve({ error: null });
          }
        })
      };
    }

    throw new Error(`Tabela não mockada: ${table}`);
  }
};

// 2. Mock do fetch do Resend para simular rate limit 429
let emailCalls = [];
let fetchCallCount = 0;

globalThis.fetch = async (url, options) => {
  if (url.includes('api.resend.com')) {
    fetchCallCount++;
    const payload = JSON.parse(options.body);
    emailCalls.push({
      callIndex: fetchCallCount,
      to: payload.to,
      subject: payload.subject,
      html: payload.html
    });

    // Simula 429 no 2º envio (exatamente conforme o teste requerido)
    if (fetchCallCount === 2) {
      console.log(`  [SIMULAÇÃO RESEND] Chamada #${fetchCallCount} para ${payload.to} -> Retornando 429 Too Many Requests`);
      return {
        status: 429,
        headers: { get: () => 'application/json' },
        json: async () => ({ message: 'Rate limit exceeded: 2 requests per second' })
      };
    }

    console.log(`  [SIMULAÇÃO RESEND] Chamada #${fetchCallCount} para ${payload.to} -> Retornando 200 OK`);
    return {
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ id: `email-id-${fetchCallCount}` })
    };
  }

  throw new Error(`URL não interceptada: ${url}`);
};

process.env.RESEND_API_KEY = 're_test_mock_key';

// Mock de Request e Response do Express / Vercel
function createMockReqRes(body) {
  const req = { method: 'POST', body };
  let statusCode = 200;
  let responseData = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    statusCode: () => statusCode,
    body: () => responseData
  };

  return { req, res };
}

async function run() {
  console.log('[TESTE 1] Executando FASE 2: diretor_aprovar em Aguardando Aprovação Final...');
  const { req, res } = createMockReqRes({
    action: 'diretor_aprovar',
    requisicao_id: 'req-teste-fase2',
    comentario: 'Aprovado para compra urgente'
  });

  await handler(req, res);

  console.log(`\n-> Status da resposta da API: ${res.statusCode()} (Esperado 200)`);
  assert.strictEqual(res.statusCode(), 200, 'A API deve devolver 200 mesmo com falha no Resend');

  const jsonResp = res.body();
  console.log('-> Resposta da API:', JSON.stringify(jsonResp, null, 2));
  assert.strictEqual(jsonResp.success, true);
  assert.strictEqual(jsonResp.action, 'aprovado');

  // 1. Validar que compradores foram buscados e notificados
  console.log('\n[TESTE 2] Validando destinatários dos e-mails disparados:');
  const destinatariosNotificados = emailCalls.map(c => c.to[0]);
  console.log('  Destinatários notificados:', destinatariosNotificados);

  // Destinatários esperados: juliana.compras@interlub.com, marcos.suprimentos@interlub.com, lucas@interlub.com (solicitante)
  assert.ok(destinatariosNotificados.includes('juliana.compras@interlub.com'), 'Juliana (eh_comprador=true) deve ser notificada');
  assert.ok(destinatariosNotificados.includes('marcos.suprimentos@interlub.com'), 'Marcos (area=Compras) deve ser notificado');
  assert.ok(!destinatariosNotificados.includes('renata.antiga@interlub.com'), 'Renata (status=Desligado) NÃO pode ser notificada');
  assert.ok(destinatariosNotificados.includes('lucas@interlub.com'), 'Lucas (solicitante) deve ser notificado');

  // 2. Validar que gestor antigo / aprovador_email NÃO foi notificado
  assert.ok(!destinatariosNotificados.includes('gestor.antigo@interlub.com'), 'aprovador_email NÃO deve ser notificado na FASE 2');
  console.log('  [OK] aprovador_email não foi notificado.');

  // 3. Validar assunto e conteúdo do e-mail para compradores na FASE 2
  const emailComprador = emailCalls.find(c => c.to[0] === 'juliana.compras@interlub.com');
  assert.ok(emailComprador, 'E-mail para o comprador deve existir');
  console.log('  Assunto do e-mail para comprador:', emailComprador.subject);
  assert.ok(emailComprador.subject.includes('Compra aprovada pelo Diretor: lançar no SAP'), 'Assunto deve conter "Compra aprovada pelo Diretor: lançar no SAP"');
  assert.ok(emailComprador.html.includes('?aba=pedidos'), 'E-mail deve conter o link ?aba=pedidos');
  assert.ok(emailComprador.html.includes('R$ 45.000,00') || emailComprador.html.includes('45000'), 'E-mail deve conter o valor aprovado');
  assert.ok(emailComprador.html.includes('Dell Computadores'), 'E-mail deve conter o fornecedor');
  console.log('  [OK] Conteúdo e link ?aba=pedidos conferidos.');

  // 4. Validar comportamento com falha 429
  console.log('\n[TESTE 3] Validando resiliência à falha 429 do Resend:');
  console.log(`  Total de tentativas de e-mail: ${emailCalls.length}`);
  assert.strictEqual(emailCalls.length, 3, 'Todos os 3 e-mails devem ter sido tentados mesmo após a falha do 2º');
  console.log(`  E-mails enviados com sucesso: ${jsonResp.emails?.enviados?.length}`);
  console.log(`  E-mails com falha: ${jsonResp.emails?.falhas?.length}`);
  assert.strictEqual(jsonResp.emails.enviados.length, 2, '2 e-mails devem ter sido entregues com sucesso');
  assert.strictEqual(jsonResp.emails.falhas.length, 1, '1 e-mail deve ter falhado com 429');

  // 5. Validar que a falha foi registrada no histórico da requisição
  console.log('\n[TESTE 4] Validando histórico da requisição no banco:');
  const eventoFalha = dbRequisicao.historico.find(h => h.tipo === 'falha_notificacao');
  console.log('  Evento de falha registrado:', eventoFalha);
  assert.ok(eventoFalha, 'Deve existir um evento do tipo falha_notificacao no histórico');
  assert.ok(eventoFalha.descricao.includes('Rate limit exceeded') || eventoFalha.descricao.includes('429'), 'Descrição deve detalhar o motivo da falha');
  console.log('  [OK] Falha de e-mail registrada no histórico com sucesso.');

  // 6. Validar que o status da requisição mudou para Aprovada
  assert.strictEqual(dbRequisicao.status, 'Aprovada', 'Status deve ter sido atualizado para Aprovada');
  console.log('  [OK] Status da requisição atualizado para Aprovada.');

  console.log('\n=================================================================');
  console.log('TODAS AS ASSERÇÕES DA PARTE 1 PASSARAM COM SUCESSO (CÓDIGO 0)!');
  console.log('=================================================================');
}

run().catch(err => {
  console.error('\nFALHA NO TESTE DA PARTE 1:', err);
  process.exit(1);
});
