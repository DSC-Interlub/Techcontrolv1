import { createSupabaseAdmin } from './_supabase.js';
import { sendEmail as sendEmailUnified } from './_email.js';

async function sendEmail(to, subject, html) {
  return sendEmailUnified({ to, subject, html });
}

const SITE_URL = 'https://techcontrol.site';

// Helper para agregar TODOS os anexos de uma requisição de qualquer fonte
function getTodosAnexosConsolidados(req_data, novosAnexos = []) {
  const lista = [
    ...(req_data?.anexos || []),
    ...(req_data?.cotacao_anexos || []),
    ...(novosAnexos || [])
  ];
  if (Array.isArray(req_data?.historico)) {
    req_data.historico.forEach(h => {
      if (Array.isArray(h?.anexos)) {
        lista.push(...h.anexos);
      }
    });
  }
  const map = new Map();
  lista.forEach(item => {
    if (item && item.file_url && !map.has(item.file_url)) {
      map.set(item.file_url, {
        file_url: item.file_url,
        file_name: item.file_name || item.name || 'Documento Anexo',
        file_type: item.file_type || 'application/octet-stream'
      });
    }
  });
  return Array.from(map.values());
}

// Helper para gerar o bloco HTML com TODOS os anexos para e-mails
function buildAnexosHtml(anexosList, titulo = '📎 Anexos e Documentos Vinculados:') {
  if (!anexosList || anexosList.length === 0) return '';
  
  const linksHtml = anexosList.map(a => {
    const nome = a.file_name || 'Documento Anexo';
    const url = a.file_url || '#';
    return `<a href="${url}" target="_blank" style="display:inline-block;margin-right:8px;margin-bottom:8px;background:#ffffff;padding:8px 14px;border-radius:6px;border:1px solid #cbd5e1;color:#2563eb;font-weight:bold;text-decoration:none;font-size:13px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">📄 ${nome}</a>`;
  }).join('');

  return `
    <div style="margin-top:16px;padding:16px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;">
      <p style="margin:0 0 10px 0;font-size:13px;color:#334155;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">${titulo}</p>
      <div>${linksHtml}</div>
    </div>
  `;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper para buscar todos os e-mails de compradores ativos (flag eh_comprador ou área de compras, exceto Desligado)
async function buscarEmailsCompradores(supabase) {
  try {
    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, email, nome_completo, status')
      .or('eh_comprador.eq.true,area.ilike.%compras%')
      .neq('status', 'Desligado');

    if (error) {
      console.error('[buscarEmailsCompradores] Erro ao buscar colaboradores de compras:', error);
      return [];
    }

    const setEmails = new Set();
    (data || []).forEach(c => {
      const em = c?.email?.trim()?.toLowerCase();
      if (em) setEmails.add(em);
    });

    return Array.from(setEmails);
  } catch (err) {
    console.error('[buscarEmailsCompradores] Exceção ao buscar compradores:', err.message);
    return [];
  }
}

// Helper para envio resiliente a múltiplos destinatários, com espaçamento para o Resend (~600ms)
// e try/catch por destinatário para não interromper os demais nem a ação
async function enviarParaTodos(destinatarios, assunto, html) {
  const lista = Array.isArray(destinatarios) ? destinatarios : [destinatarios];
  const emailsUnicos = Array.from(new Set(
    lista.map(e => (typeof e === 'string' ? e.trim().toLowerCase() : '')).filter(Boolean)
  ));

  const enviados = [];
  const falhas = [];

  for (let i = 0; i < emailsUnicos.length; i++) {
    const email = emailsUnicos[i];
    if (i > 0) {
      await sleep(600);
    }

    try {
      await sendEmail(email, assunto, html);
      console.log(`[email] ok ${email} ${assunto}`);
      enviados.push(email);
    } catch (err) {
      const motivo = err?.message || String(err);
      console.error(`[email] falha ${email} ${assunto} ${motivo}`);
      falhas.push({ email, erro: motivo });
    }
  }

  return { enviados, falhas };
}

// Helper para registrar falhas de envio no histórico da requisição
async function registrarFalhasNoHistorico(supabase, requisicaoId, falhas, numeroRequisicao) {
  if (!falhas || falhas.length === 0 || !requisicaoId) return;

  try {
    const { data: current } = await supabase
      .from('requisicao_compras')
      .select('historico')
      .eq('id', requisicaoId)
      .maybeSingle();

    const novosEventos = falhas.map(f => ({
      data_hora: new Date().toISOString(),
      tipo: 'falha_notificacao',
      descricao: `E-mail não enviado para ${f.email}: ${f.erro}`,
      usuario: 'TechControl (Sistema)',
      numero_requisicao: numeroRequisicao
    }));

    const historicoAtualizado = [...(current?.historico || []), ...novosEventos];

    await supabase
      .from('requisicao_compras')
      .update({ historico: historicoAtualizado })
      .eq('id', requisicaoId);
  } catch (err) {
    console.error(`[registrarFalhasNoHistorico] Erro ao registrar falhas no histórico: ${err.message}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createSupabaseAdmin();
    const body = req.body || {};
    const {
      action, requisicao_id, comentario, token, aprovador_email,
      cotacao_valor, cotacao_fornecedor, cotacao_anexos, cotacao_comentario,
      comprador_id, comprador_nome, anexos
    } = body;

    // ── AÇÃO DO APROVADOR GESTOR (1º nível) ──────────────────────────────────────
    if (action === 'aprovador_aprovar' || action === 'aprovador_reprovar') {
      if (!requisicao_id) return res.status(400).json({ error: 'requisicao_id obrigatório' });

      const { data: req_data, error: getError } = await supabase
        .from('requisicao_compras')
        .select('*')
        .eq('id', requisicao_id)
        .maybeSingle();

      if (getError || !req_data) return res.status(404).json({ error: 'Requisição não encontrada' });

      // Validação de aprovador
      if (aprovador_email && req_data.aprovador_email &&
          req_data.aprovador_email.toLowerCase() !== aprovador_email.toLowerCase()) {
        return res.status(403).json({ error: 'Não autorizado para esta requisição' });
      }

      if (req_data.status !== 'Aguardando Aprovador') {
        return res.status(400).json({ error: 'Esta requisição não está aguardando aprovador' });
      }

      const todosAnexosConsolidados = getTodosAnexosConsolidados(req_data, anexos);

      // Reprovar pelo aprovador
      if (action === 'aprovador_reprovar') {
        const { error: updError } = await supabase
          .from('requisicao_compras')
          .update({
            status: 'Reprovada pelo Aprovador',
            aprovador_comentario: comentario || '',
            aprovador_data: new Date().toISOString(),
            anexos: todosAnexosConsolidados,
            historico: [...(req_data.historico || []), {
              data_hora: new Date().toISOString(),
              tipo: 'reprovacao_aprovador',
              descricao: `Reprovado pelo responsável. ${comentario ? 'Motivo: ' + comentario : ''}`,
              usuario: req_data.aprovador_nome || 'Aprovador Responsável',
              numero_requisicao: req_data.numero_requisicao,
              anexos: anexos || []
            }],
          })
          .eq('id', requisicao_id);

        if (updError) throw updError;

        let resEmails = { enviados: [], falhas: [] };
        if (req_data.colaborador_email) {
          resEmails = await enviarParaTodos(
            [req_data.colaborador_email],
            `❌ Requisição ${req_data.numero_requisicao} Reprovada`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
              <div style="background:#ef4444;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0;">❌ Requisição Reprovada</h2>
              </div>
              <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
              <p>Sua requisição de compra foi <strong>reprovada pelo seu responsável</strong>.</p>
              <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                <p><strong>Requisição:</strong> ${req_data.numero_requisicao}</p>
                <p><strong>Item:</strong> ${req_data.item}</p>
                <p><strong>Quantidade:</strong> ${req_data.quantidade || 1} ${req_data.unidade_medida || 'un'}</p>
                ${req_data.data_necessidade ? `<p><strong>Data da Necessidade:</strong> 📅 ${new Date(req_data.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}</p>` : ''}
                <p><strong>Devolutiva:</strong> ${comentario || 'Sem comentário adicional.'}</p>
              </div>
              ${buildAnexosHtml(todosAnexosConsolidados, '📎 Anexos Vinculados:')}
              <p style="color:#64748b;font-size:14px;margin-top:20px;">Em caso de dúvidas, entre em contato com seu gestor.</p>
            </div>`
          );
          await registrarFalhasNoHistorico(supabase, requisicao_id, resEmails.falhas, req_data.numero_requisicao);
        }

        return res.status(200).json({ success: true, action: 'reprovado', numero_requisicao: req_data.numero_requisicao, emails: resEmails });
      }

      // Valida que o e-mail do diretor está configurado
      const { data: configRecord } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'diretor_email')
        .maybeSingle();

      const diretorEmail = configRecord?.valor?.trim();
      if (!diretorEmail) {
        console.error('[requisicaoComprasAction] ERRO: E-mail do diretor não configurado na tabela configuracoes (chave: diretor_email).');
        return res.status(400).json({
          error: 'E-mail do diretor não cadastrado. A aprovação foi paralisada. Defina o e-mail do diretor em Administração > Requisições de Compra > Aprovadores.'
        });
      }

      // Gera UUID para token de aprovação do diretor (1ª fase: liberação para cotação)
      const token_dir = crypto.randomUUID().replace(/-/g, '');

      const { error: updError2 } = await supabase
        .from('requisicao_compras')
        .update({
          status: 'Aguardando Diretor',
          aprovador_comentario: comentario || '',
          aprovador_data: new Date().toISOString(),
          token_aprovacao: token_dir,
          anexos: todosAnexosConsolidados,
          historico: [...(req_data.historico || []), {
            data_hora: new Date().toISOString(),
            tipo: 'aprovacao_aprovador',
            descricao: `Aprovado pelo responsável (${req_data.aprovador_nome || 'Aprovador'}). Aguardando 1ª aprovação do diretor (liberação para cotação). ${comentario ? 'Obs: ' + comentario : ''}`,
            usuario: req_data.aprovador_nome || 'Aprovador Responsável',
            numero_requisicao: req_data.numero_requisicao,
            anexos: anexos || [],
            token_gerado: token_dir
          }],
        })
        .eq('id', requisicao_id);

      if (updError2) throw updError2;

      const linkAprovar = `${SITE_URL}/aprovacao-diretor?token=${token_dir}&acao=aprovar`;
      const linkReprovar = `${SITE_URL}/aprovacao-diretor?token=${token_dir}&acao=reprovar`;

      const valorRangeTotal = req_data.valor_minimo && req_data.valor_maximo
        ? `R$ ${Number(req_data.valor_minimo).toLocaleString('pt-BR')} – R$ ${Number(req_data.valor_maximo).toLocaleString('pt-BR')}`
        : req_data.valor_minimo ? `A partir de R$ ${Number(req_data.valor_minimo).toLocaleString('pt-BR')}`
        : req_data.valor_maximo ? `Até R$ ${Number(req_data.valor_maximo).toLocaleString('pt-BR')}` : 'Não informado';

      const valorRangeUnit = req_data.valor_unitario_minimo && req_data.valor_unitario_maximo
        ? `R$ ${Number(req_data.valor_unitario_minimo).toLocaleString('pt-BR')} – R$ ${Number(req_data.valor_unitario_maximo).toLocaleString('pt-BR')}`
        : req_data.valor_unitario_minimo ? `A partir de R$ ${Number(req_data.valor_unitario_minimo).toLocaleString('pt-BR')}`
        : req_data.valor_unitario_maximo ? `Até R$ ${Number(req_data.valor_unitario_maximo).toLocaleString('pt-BR')}` : null;

      const emailsEnviados = [];
      const emailsFalhas = [];

      const resDir = await enviarParaTodos(
        [diretorEmail],
        `Ação necessária: Requisição ${req_data.numero_requisicao} aguardando sua aprovação para liberar cotação`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
          <div style="background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:20px;">
            <h2 style="margin:0;font-size:20px;">🛒 Requisição de Compra — 1ª Aprovação do Diretor</h2>
            <p style="margin:4px 0 0 0;font-size:14px;opacity:0.9;">Liberação para cotação de fornecedores</p>
          </div>

          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:20px;color:#1e3a8a;line-height:1.6;">
            <p style="margin:0 0 8px 0;"><strong>O que aconteceu até agora:</strong> O colaborador <strong>${req_data.colaborador_nome}</strong> (${req_data.colaborador_area}) solicitou uma compra, que foi analisada e <strong>aprovada pelo responsável ${req_data.aprovador_nome}</strong>.</p>
            <p style="margin:0 0 8px 0;"><strong>O que se pede agora:</strong> Solicitamos a sua autorização inicial para <strong>liberar esta requisição para cotação</strong> de preços com os fornecedores pelo setor de compras.</p>
            <p style="margin:0;"><strong>O que acontecerá depois:</strong> Após o comprador cadastrar os orçamentos, você receberá um novo e-mail para a <strong>aprovação final de valores</strong> antes da efetivação da compra.</p>
          </div>

          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:18px;margin-bottom:24px;">
            <h3 style="margin:0 0 12px 0;font-size:16px;color:#0f172a;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">📋 Dados Completos da Requisição</h3>
            <p style="margin:4px 0;"><strong>Número da Requisição:</strong> ${req_data.numero_requisicao}</p>
            <p style="margin:4px 0;"><strong>Solicitante:</strong> ${req_data.colaborador_nome} (${req_data.colaborador_area}) — <em>${req_data.colaborador_email || ''}</em></p>
            <p style="margin:4px 0;"><strong>Aprovador Responsável:</strong> ${req_data.aprovador_nome} — <em>${req_data.aprovador_email || ''}</em></p>
            ${comentario ? `<p style="margin:6px 0;padding:8px;background:#eff6ff;border-radius:6px;color:#1e40af;"><strong>Comentário do Aprovador (Gestor):</strong> "${comentario}"</p>` : ''}
            <p style="margin:4px 0;"><strong>Item / Produto:</strong> ${req_data.item}</p>
            ${req_data.material ? `<p style="margin:4px 0;"><strong>Material:</strong> ${req_data.material}</p>` : ''}
            ${req_data.cor ? `<p style="margin:4px 0;"><strong>Cor:</strong> ${req_data.cor}</p>` : ''}
            <p style="margin:4px 0;"><strong>Quantidade:</strong> ${req_data.quantidade || 1} ${req_data.unidade_medida || 'un'}</p>
            ${req_data.data_necessidade ? `<p style="margin:4px 0;"><strong>Data da Necessidade:</strong> 📅 ${new Date(req_data.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}</p>` : ''}
            ${req_data.centro_custo_nome ? `<p style="margin:4px 0;"><strong>Centro de Custo:</strong> ${req_data.centro_custo_codigo} — ${req_data.centro_custo_nome}</p>` : ''}
            ${valorRangeUnit ? `<p style="margin:4px 0;"><strong>Valor Unitário Estimado:</strong> ${valorRangeUnit}</p>` : ''}
            <p style="margin:4px 0;"><strong>Valor Total Estimado:</strong> ${valorRangeTotal}</p>
            <p style="margin:4px 0;"><strong>Urgência:</strong> ${req_data.urgencia}</p>
            ${req_data.fornecedor_sugerido ? `<p style="margin:4px 0;"><strong>Fornecedor Sugerido:</strong> ${req_data.fornecedor_sugerido}</p>` : ''}
            <p style="margin:4px 0;"><strong>Justificativa:</strong> ${req_data.justificativa}</p>
          </div>

          ${buildAnexosHtml(todosAnexosConsolidados, '📎 Todos os Anexos da Solicitação Inicial e Parecer do Gestor:')}

          <div style="margin:28px 0 16px 0;text-align:center;">
            <a href="${linkAprovar}" style="display:inline-block;background:#16a34a;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin-right:12px;">✅ LIBERAR COTAÇÃO</a>
            <a href="${linkReprovar}" style="display:inline-block;background:#dc2626;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">❌ REPROVAR</a>
          </div>
        </div>`
      );
      emailsEnviados.push(...resDir.enviados);
      emailsFalhas.push(...resDir.falhas);

      if (req_data.colaborador_email) {
        const resColab = await enviarParaTodos(
          [req_data.colaborador_email],
          `⏳ Requisição ${req_data.numero_requisicao} — Aguardando Diretor`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
            <div style="background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
              <h2 style="margin:0;">⏳ Requisição em Análise pelo Diretor</h2>
            </div>
            <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
            <p>Sua requisição foi <strong>aprovada pelo seu responsável</strong> e aguarda autorização do diretor para cotação.</p>
            ${buildAnexosHtml(todosAnexosConsolidados, '📎 Anexos Anexados no Pedido:')}
          </div>`
        );
        emailsEnviados.push(...resColab.enviados);
        emailsFalhas.push(...resColab.falhas);
      }

      await registrarFalhasNoHistorico(supabase, requisicao_id, emailsFalhas, req_data.numero_requisicao);

      return res.status(200).json({
        success: true,
        action: 'enviado_diretor_1',
        numero_requisicao: req_data.numero_requisicao,
        emails: { enviados: emailsEnviados, falhas: emailsFalhas }
      });
    }

    // ── COTAÇÃO ENVIADA PELO COMPRADOR ───────────────────────────────────────────
    if (action === 'comprador_enviar_cotacao') {
      if (!requisicao_id) return res.status(400).json({ error: 'requisicao_id obrigatório' });
      if (!cotacao_valor || !cotacao_fornecedor) {
        return res.status(400).json({ error: 'Valor da cotação e fornecedor são obrigatórios' });
      }

      const { data: req_data, error: getError } = await supabase
        .from('requisicao_compras')
        .select('*')
        .eq('id', requisicao_id)
        .maybeSingle();

      if (getError || !req_data) return res.status(404).json({ error: 'Requisição não encontrada' });
      if (req_data.status !== 'Aguardando Cotação') {
        return res.status(400).json({ error: 'Esta requisição não está aguardando cotação' });
      }

      const { data: configRecord } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'diretor_email')
        .maybeSingle();

      const diretorEmail = configRecord?.valor?.trim();
      if (!diretorEmail) {
        console.error('[requisicaoComprasAction] ERRO: E-mail do diretor não configurado na tabela configuracoes (chave: diretor_email).');
        return res.status(400).json({
          error: 'E-mail do diretor não cadastrado. A aprovação final foi paralisada. Defina o e-mail do diretor em Administração > Requisições de Compra > Aprovadores.'
        });
      }

      // 1. Calcula o teto estimado aprovado previamente
      const qtdReq = Number(req_data.quantidade) || 1;
      const valorMaximoEstimado = Number(req_data.valor_maximo) || 0;
      const valorUnitarioMaxEstimado = Number(req_data.valor_unitario_maximo) || 0;
      const valorEstimadoTeto = valorMaximoEstimado > 0 ? valorMaximoEstimado : (valorUnitarioMaxEstimado > 0 ? valorUnitarioMaxEstimado * qtdReq : 0);

      const valorCotadoNum = Number(cotacao_valor) || 0;
      const todosAnexosConsolidados = getTodosAnexosConsolidados(req_data, cotacao_anexos);

      // REGRA DO TETO APROVADO:
      // Se a cotação achou um valor igual ou menor que o valor estimado previamente aprovado pelo Diretor:
      // A compra é APROVADA AUTOMATICAMENTE! O Diretor NÃO precisa aprovar de novo!
      const aprovadoAutomaticoPorTeto = (valorEstimadoTeto > 0 && valorCotadoNum <= valorEstimadoTeto);

      if (aprovadoAutomaticoPorTeto) {
        const { error: updAutoError } = await supabase
          .from('requisicao_compras')
          .update({
            status: 'Aprovada',
            etapa_compra: 'Lançar no SAP',
            aprovada_em: new Date().toISOString(),
            cotacao_valor: valorCotadoNum,
            cotacao_fornecedor,
            cotacao_anexos: cotacao_anexos || [],
            cotacao_comentario: cotacao_comentario || '',
            cotacao_data: new Date().toISOString(),
            cotacao_comprador_id: comprador_id || null,
            cotacao_comprador_nome: comprador_nome || 'Comprador',
            token_aprovacao: '',
            anexos: todosAnexosConsolidados,
            historico: [...(req_data.historico || []), {
              data_hora: new Date().toISOString(),
              tipo: 'aprovacao_automatica_teto',
              descricao: `Cotação concluída pelo comprador (${comprador_nome || 'Comprador'}). Valor final de R$ ${valorCotadoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ficou DENTRO do teto estimado autorizado pelo Diretor (R$ ${valorEstimadoTeto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Compra APROVADA AUTOMATICAMENTE pelo sistema sem necessidade de nova intervenção da Diretoria.`,
              usuario: 'TechControl (Automático)',
              numero_requisicao: req_data.numero_requisicao,
              anexos: cotacao_anexos || []
            }]
          })
          .eq('id', requisicao_id);

        if (updAutoError) throw updAutoError;

        const emailsEnviados = [];
        const emailsFalhas = [];

        // Notifica compradores confirmando liberação imediata para lançar no SAP
        const emailsCompradores = await buscarEmailsCompradores(supabase);

        const resCompradores = await enviarParaTodos(
          emailsCompradores,
          `✅ COMPRA APROVADA AUTOMATICAMENTE — ${req_data.numero_requisicao} (Dentro do Teto)`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
            <div style="background:#16a34a;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
              <h2 style="margin:0;">✅ Compra Aprovada para Emissão</h2>
            </div>
            <p>A requisição <strong>${req_data.numero_requisicao}</strong> foi finalizada e <strong>aprovada automaticamente</strong> pois o valor cotado (R$ ${valorCotadoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) atendeu ao teto pré-autorizado pelo Diretor (R$ ${valorEstimadoTeto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).</p>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
              <p><strong>Item:</strong> ${req_data.item}</p>
              <p><strong>Quantidade:</strong> ${req_data.quantidade || 1} ${req_data.unidade_medida || 'un'}</p>
              <p><strong>Fornecedor Escolhido:</strong> ${cotacao_fornecedor}</p>
              <p><strong>Valor Final:</strong> R$ ${valorCotadoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p><strong>Solicitante:</strong> ${req_data.colaborador_nome} (${req_data.colaborador_area})</p>
            </div>
            ${buildAnexosHtml(todosAnexosConsolidados, '📎 Documentos e Propostas Anexadas:')}
            <p style="color:#16a34a;font-weight:bold;margin-top:20px;">Você já pode emitir o pedido de compra no SAP e prosseguir com o faturamento.</p>
            <div style="text-align:center;margin-top:24px;">
              <a href="${SITE_URL}/portal-requisicoes?aba=pedidos" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">Abrir pedidos para lançar no SAP</a>
            </div>
          </div>`
        );
        emailsEnviados.push(...resCompradores.enviados);
        emailsFalhas.push(...resCompradores.falhas);

        // Notifica solicitante
        if (req_data.colaborador_email) {
          const resColab = await enviarParaTodos(
            [req_data.colaborador_email],
            `🎉 Requisição ${req_data.numero_requisicao} Aprovada para Compra!`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
              <div style="background:#16a34a;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0;">🎉 Compra Aprovada!</h2>
              </div>
              <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
              <p>Sua requisição <strong>${req_data.numero_requisicao}</strong> (${req_data.item}) teve a cotação concluída e a compra foi <strong>aprovada</strong>.</p>
              <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                <p><strong>Fornecedor:</strong> ${cotacao_fornecedor}</p>
                <p><strong>Valor Final:</strong> R$ ${valorCotadoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p><strong>Comprador Responsável:</strong> ${comprador_nome || 'Setor de Compras'}</p>
              </div>
              <p style="color:#64748b;font-size:14px;margin-top:20px;">O setor de compras já está processando o pedido.</p>
            </div>`
          );
          emailsEnviados.push(...resColab.enviados);
          emailsFalhas.push(...resColab.falhas);
        }

        await registrarFalhasNoHistorico(supabase, requisicao_id, emailsFalhas, req_data.numero_requisicao);

        return res.status(200).json({
          success: true,
          action: 'aprovado_automatico',
          numero_requisicao: req_data.numero_requisicao,
          emails: { enviados: emailsEnviados, falhas: emailsFalhas }
        });
      }

      // SE O VALOR COTADO SUPEROU O ESTIMADO (OU SEM ESTIMATIVA):
      // Aciona o Diretor para a 2ª aprovação com destaque claro do excedente
      const token_dir = crypto.randomUUID().replace(/-/g, '');
      const diferencaExcedente = valorEstimadoTeto > 0 ? (valorCotadoNum - valorEstimadoTeto) : 0;

      const { error: updError } = await supabase
        .from('requisicao_compras')
        .update({
          status: 'Aguardando Aprovação Final',
          cotacao_valor: valorCotadoNum,
          cotacao_fornecedor,
          cotacao_anexos: cotacao_anexos || [],
          cotacao_comentario: cotacao_comentario || '',
          cotacao_data: new Date().toISOString(),
          cotacao_comprador_id: comprador_id || null,
          cotacao_comprador_nome: comprador_nome || 'Comprador',
          token_aprovacao: token_dir,
          anexos: todosAnexosConsolidados,
          historico: [...(req_data.historico || []), {
            data_hora: new Date().toISOString(),
            tipo: 'cotacao_enviada',
            descricao: `Cotação finalizada pelo comprador (${comprador_nome || 'Comprador'}). Valor: R$ ${valorCotadoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — Fornecedor: ${cotacao_fornecedor}. ${diferencaExcedente > 0 ? `Valor superou a estimativa inicial em +R$ ${diferencaExcedente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.` : ''} Aguardando aprovação final do diretor.`,
            usuario: comprador_nome || 'Comprador',
            numero_requisicao: req_data.numero_requisicao,
            anexos: cotacao_anexos || [],
            token_gerado: token_dir
          }],
        })
        .eq('id', requisicao_id);

      if (updError) throw updError;

      const linkAprovar = `${SITE_URL}/aprovacao-diretor?token=${token_dir}&acao=aprovar`;
      const linkReprovar = `${SITE_URL}/aprovacao-diretor?token=${token_dir}&acao=reprovar`;

      const emailsEnviados = [];
      const emailsFalhas = [];

      const resDir = await enviarParaTodos(
        [diretorEmail],
        `${diferencaExcedente > 0 ? '⚠️ Cotação Excedeu Estimativa' : '💰 Aprovação Final'}: Requisição ${req_data.numero_requisicao}`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
          <div style="background:${diferencaExcedente > 0 ? '#b45309' : '#047857'};color:white;padding:20px;border-radius:8px;margin-bottom:20px;">
            <h2 style="margin:0;font-size:20px;">${diferencaExcedente > 0 ? '⚠️ Cotação Superou a Estimativa' : '💰 Aprovação Final da Compra'}</h2>
            <p style="margin:4px 0 0 0;font-size:14px;opacity:0.9;">Etapa de autorização financeira da Diretoria</p>
          </div>

          ${diferencaExcedente > 0 ? `
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-bottom:20px;color:#92400e;">
            <p style="margin:0 0 6px 0;font-weight:bold;font-size:15px;">⚠️ Atenção: O preço cotado ficou acima da estimativa inicial</p>
            <p style="margin:0;font-size:13px;">Estimativa inicial aprovada: <strong>R$ ${valorEstimadoTeto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong><br/>
            Valor cotado no mercado: <strong>R$ ${valorCotadoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> (+R$ ${diferencaExcedente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</p>
          </div>` : ''}

          <!-- CARD 1: DADOS DA COTAÇÃO EM DESTAQUE -->
          <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:20px;margin-bottom:24px;box-shadow:0 2px 4px rgba(0,0,0,0.04);">
            <div style="border-bottom:2px solid #bbf7d0;padding-bottom:10px;margin-bottom:12px;">
              <span style="background:#16a34a;color:white;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">💵 Valor da Cotação Realizada</span>
            </div>
            <div style="background:white;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-bottom:12px;">
              <p style="margin:0 0 2px 0;font-size:12px;color:#15803d;font-weight:bold;text-transform:uppercase;">Valor Final da Cotação</p>
              <p style="margin:0;font-size:26px;font-weight:800;color:#15803d;font-family:monospace;">R$ ${valorCotadoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Fornecedor Cotado:</strong> <span style="color:#15803d;font-weight:bold;">${cotacao_fornecedor}</span></p>
            <p style="margin:6px 0;font-size:14px;color:#374151;"><strong>Comprador Responsável:</strong> ${comprador_nome || 'Comprador'}</p>
            ${cotacao_comentario ? `<p style="margin:8px 0 4px 0;font-size:13px;color:#166534;background:#ffffff;padding:8px 12px;border-radius:6px;border:1px solid #dcfce7;"><strong>Obs. Comprador:</strong> "${cotacao_comentario}"</p>` : ''}
            ${buildAnexosHtml(cotacao_anexos, '📄 Orçamentos / Propostas Anexadas pelo Comprador:')}
          </div>

          <!-- CARD 2: DADOS ORIGINAIS DA REQUISIÇÃO -->
          <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:10px;padding:20px;margin-bottom:24px;">
            <div style="border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:12px;">
              <span style="background:#475569;color:white;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:bold;text-transform:uppercase;">📋 Dados Originais da Requisição & Histórico de Aprovação</span>
            </div>
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Número da Requisição:</strong> ${req_data.numero_requisicao}</p>
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Solicitante:</strong> ${req_data.colaborador_nome} (${req_data.colaborador_area}) — <em>${req_data.colaborador_email || ''}</em></p>
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Aprovador Responsável:</strong> ${req_data.aprovador_nome} — <em>${req_data.aprovador_email || ''}</em></p>
            ${req_data.aprovador_comentario ? `<p style="margin:6px 0;padding:6px 10px;background:#f1f5f9;border-radius:4px;font-size:12px;color:#1e3a8a;"><strong>Comentário do Aprovador (Gestor):</strong> "${req_data.aprovador_comentario}"</p>` : ''}
            ${req_data.diretor_comentario ? `<p style="margin:6px 0;padding:6px 10px;background:#f1f5f9;border-radius:4px;font-size:12px;color:#1e3a8a;"><strong>Comentário do Diretor (1ª Fase):</strong> "${req_data.diretor_comentario}"</p>` : ''}
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Item / Produto:</strong> ${req_data.item}</p>
            ${req_data.material ? `<p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Material:</strong> ${req_data.material}</p>` : ''}
            ${req_data.cor ? `<p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Cor:</strong> ${req_data.cor}</p>` : ''}
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Quantidade:</strong> ${req_data.quantidade || 1} ${req_data.unidade_medida || 'un'}</p>
            ${req_data.data_necessidade ? `<p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Data da Necessidade:</strong> 📅 ${new Date(req_data.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}</p>` : ''}
            ${req_data.centro_custo_nome ? `<p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Centro de Custo:</strong> ${req_data.centro_custo_codigo} — ${req_data.centro_custo_nome}</p>` : ''}
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Justificativa Original:</strong> ${req_data.justificativa}</p>
          </div>

          <!-- CARD 3: TODOS OS ANEXOS CONSOLIDADOS DO PEDIDO -->
          ${buildAnexosHtml(todosAnexosConsolidados, '📎 TODOS OS ANEXOS DA REQUISIÇÃO (Solicitante, Gestor, Diretor e Comprador):')}

          <div style="margin:28px 0 16px 0;text-align:center;">
            <a href="${linkAprovar}" style="display:inline-block;background:#16a34a;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin-right:12px;">✅ APROVAR COMPRA DEFINITIVA</a>
            <a href="${linkReprovar}" style="display:inline-block;background:#dc2626;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">❌ REPROVAR</a>
          </div>
        </div>`
      );
      emailsEnviados.push(...resDir.enviados);
      emailsFalhas.push(...resDir.falhas);

      if (req_data.colaborador_email) {
        const resColab = await enviarParaTodos(
          [req_data.colaborador_email],
          `⏳ Requisição ${req_data.numero_requisicao} — Cotação Concluída`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
            <div style="background:#059669;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
              <h2 style="margin:0;">⏳ Cotação Realizada</h2>
            </div>
            <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
            <p>A cotação para sua requisição foi finalizada pelo setor de compras (Valor: <strong>R$ ${Number(cotacao_valor).toLocaleString('pt-BR')}</strong>) e enviada para autorização final do diretor.</p>
            ${buildAnexosHtml(todosAnexosConsolidados, '📎 Anexos e Orçamentos Vinculados:')}
          </div>`
        );
        emailsEnviados.push(...resColab.enviados);
        emailsFalhas.push(...resColab.falhas);
      }

      await registrarFalhasNoHistorico(supabase, requisicao_id, emailsFalhas, req_data.numero_requisicao);

      return res.status(200).json({
        success: true,
        action: 'cotacao_enviada',
        numero_requisicao: req_data.numero_requisicao,
        emails: { enviados: emailsEnviados, falhas: emailsFalhas }
      });
    }

    // ── SOLICITANTE EDITA E REENVIA ────────────────────────────────────────────────
    if (action === 'requisicao_editar') {
      if (!requisicao_id) return res.status(400).json({ error: 'requisicao_id obrigatório' });

      const { data: req_data } = await supabase
        .from('requisicao_compras')
        .select('*')
        .eq('id', requisicao_id)
        .maybeSingle();

      if (!req_data) return res.status(404).json({ error: 'Requisição não encontrada' });

      const {
        item, material, cor, quantidade, unidade_medida, data_necessidade,
        centro_custo_codigo, centro_custo_nome,
        valor_unitario_minimo, valor_unitario_maximo,
        valor_minimo, valor_maximo,
        justificativa, urgencia, fornecedor_sugerido
      } = body;

      const parseNullableNumber = (val) => {
        if (val === "" || val === null || val === undefined) return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
      };

      const todosAnexosConsolidados = getTodosAnexosConsolidados(req_data, anexos);

      const { data: configRecord } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'diretor_email')
        .maybeSingle();
      const diretorEmail = configRecord?.valor?.trim() || 'vtorres@interlub.com';

      const token_dir = crypto.randomUUID().replace(/-/g, '');
      const motivoAnterior = req_data.diretor_comentario || req_data.aprovador_comentario || 'Sem motivo registrado';

      const { error: editError } = await supabase
        .from('requisicao_compras')
        .update({
          item: item?.trim(),
          material: material?.trim() || null,
          cor: cor?.trim() || null,
          quantidade: Number(quantidade) || 1,
          unidade_medida: unidade_medida?.trim() || null,
          data_necessidade: data_necessidade || null,
          centro_custo_codigo,
          centro_custo_nome,
          valor_unitario_minimo: parseNullableNumber(valor_unitario_minimo),
          valor_unitario_maximo: parseNullableNumber(valor_unitario_maximo),
          valor_minimo: parseNullableNumber(valor_minimo),
          valor_maximo: parseNullableNumber(valor_maximo),
          justificativa: justificativa?.trim(),
          urgencia: urgencia || 'Média',
          fornecedor_sugerido: fornecedor_sugerido?.trim() || null,
          anexos: todosAnexosConsolidados,
          status: 'Aguardando Diretor',
          token_aprovacao: token_dir,
          historico: [...(req_data.historico || []), {
            data_hora: new Date().toISOString(),
            tipo: 'reenvio_apos_ajuste',
            descricao: `Requisição reajustada e reenviada pelo colaborador para nova análise da Diretoria.`,
            motivo_anterior: motivoAnterior,
            usuario: req_data.colaborador_nome,
            numero_requisicao: req_data.numero_requisicao,
            anexos: anexos || [],
            token_gerado: token_dir
          }],
        })
        .eq('id', requisicao_id);

      if (editError) throw editError;

      const linkAprovar = `${SITE_URL}/aprovacao-diretor?token=${token_dir}&acao=aprovar`;
      const linkReprovar = `${SITE_URL}/aprovacao-diretor?token=${token_dir}&acao=reprovar`;

      const resDir = await enviarParaTodos(
        [diretorEmail],
        `⚠️ Requisição Reenviada após Ajustes: ${req_data.numero_requisicao} (${item?.trim()})`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
          <div style="background:#d97706;color:white;padding:20px;border-radius:8px;margin-bottom:20px;">
            <h2 style="margin:0;font-size:20px;">⚠️ Requisição Reenviada após Ajustes</h2>
            <p style="margin:4px 0 0 0;font-size:14px;opacity:0.9;">O solicitante revisou as informações e reenviou para sua avaliação</p>
          </div>

          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:20px;color:#92400e;line-height:1.5;">
            <p style="margin:0 0 6px 0;font-weight:bold;">Motivo da sua reprovação anterior:</p>
            <p style="margin:0;font-style:italic;background:#ffffff;padding:8px 12px;border-radius:6px;border:1px solid #fef3c7;">"${motivoAnterior}"</p>
          </div>

          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Requisição:</strong> ${req_data.numero_requisicao}</p>
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Solicitante:</strong> ${req_data.colaborador_nome} (${req_data.colaborador_area})</p>
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Item Atualizado:</strong> ${item?.trim()}</p>
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Quantidade:</strong> ${Number(quantidade) || 1} ${unidade_medida || 'un'}</p>
            ${data_necessidade ? `<p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Data da Necessidade:</strong> 📅 ${new Date(data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}</p>` : ''}
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Nova Justificativa:</strong> ${justificativa?.trim() || 'Sem alteração'}</p>
          </div>

          ${buildAnexosHtml(todosAnexosConsolidados, '📎 Anexos Vinculados:')}

          <div style="margin:28px 0 16px 0;text-align:center;">
            <a href="${linkAprovar}" style="display:inline-block;background:#16a34a;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin-right:12px;">✅ AUTORIZAR COTAÇÃO</a>
            <a href="${linkReprovar}" style="display:inline-block;background:#dc2626;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">❌ RECUSAR</a>
          </div>
        </div>`
      );

      await registrarFalhasNoHistorico(supabase, requisicao_id, resDir.falhas, req_data.numero_requisicao);

      return res.status(200).json({
        success: true,
        action: 'reenviada_diretor',
        numero_requisicao: req_data.numero_requisicao,
        emails: resDir
      });
    }

    // ── AÇÃO DO DIRETOR VIA TOKEN OU PORTAL (Fase 1 ou Fase 2) ─────────────────────
    if (action === 'diretor_aprovar' || action === 'diretor_reprovar') {
      if (!token && !requisicao_id) return res.status(400).json({ error: 'Token ou requisicao_id obrigatório' });

      let req_data = null;

      if (token) {
        const { data: listData } = await supabase
          .from('requisicao_compras')
          .select('*')
          .eq('token_aprovacao', token)
          .limit(1);

        req_data = listData?.[0];
      }

      // Se não encontrou por token mas tem requisicao_id (aprovação via Portal)
      if (!req_data && requisicao_id) {
        const { data: byId } = await supabase
          .from('requisicao_compras')
          .select('*')
          .eq('id', requisicao_id)
          .maybeSingle();

        req_data = byId;
      }

      // Se o token não estiver no campo token_aprovacao (porque já foi utilizado/limpo)
      if (!req_data && token) {
        const { data: allReqs } = await supabase
          .from('requisicao_compras')
          .select('id, numero_requisicao, status, historico')
          .order('created_date', { ascending: false })
          .limit(100);

        const match = (allReqs || []).find(r => JSON.stringify(r.historico || []).includes(token));
        if (match) {
          return res.status(400).json({
            error: 'token_usado',
            numero_requisicao: match.numero_requisicao,
            status_atual: match.status
          });
        }
      }

      if (!req_data) {
        return res.status(404).json({ error: 'Requisição não encontrada ou token já utilizado' });
      }

      const todosAnexosConsolidados = getTodosAnexosConsolidados(req_data, anexos);

      // ── FASE 1: DIRETOR APROVA 1ª VEZ (LIBERA COTAÇÃO) ──
      if (req_data.status === 'Aguardando Diretor') {
        if (action === 'diretor_aprovar') {
          const { error: f1Error } = await supabase
            .from('requisicao_compras')
            .update({
              status: 'Aguardando Cotação',
              diretor_comentario: comentario || '',
              diretor_data: new Date().toISOString(),
              token_aprovacao: '',
              anexos: todosAnexosConsolidados,
              historico: [...(req_data.historico || []), {
                data_hora: new Date().toISOString(),
                tipo: 'aprovacao_diretor_1',
                descricao: `Aprovado pelo diretor (1ª fase). Liberado para cotação pelo comprador. ${comentario ? 'Obs: ' + comentario : ''}`,
                usuario: 'Diretor',
                numero_requisicao: req_data.numero_requisicao,
                anexos: anexos || [],
                token_utilizado: token
              }],
            })
            .eq('id', req_data.id);

          if (f1Error) throw f1Error;

          const emailsEnviados = [];
          const emailsFalhas = [];

          // Busca compradores com a regra completa
          const emailsCompradores = await buscarEmailsCompradores(supabase);

          const resCompradores = await enviarParaTodos(
            emailsCompradores,
            `🛒 Nova Requisição Liberada para Cotação — ${req_data.numero_requisicao}`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
              <div style="background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0;">🛒 Requisição Liberada para Cotação</h2>
              </div>
              <p>A requisição <strong>${req_data.numero_requisicao}</strong> foi autorizada pelo diretor e aguarda elaboração de cotação.</p>
              <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                <p><strong>Item:</strong> ${req_data.item}</p>
                ${req_data.material ? `<p><strong>Material:</strong> ${req_data.material}</p>` : ''}
                ${req_data.cor ? `<p><strong>Cor:</strong> ${req_data.cor}</p>` : ''}
                <p><strong>Quantidade:</strong> ${req_data.quantidade || 1} ${req_data.unidade_medida || 'un'}</p>
                ${req_data.data_necessidade ? `<p><strong>Data da Necessidade:</strong> 📅 ${new Date(req_data.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}</p>` : ''}
                <p><strong>Solicitante:</strong> ${req_data.colaborador_nome} (${req_data.colaborador_area})</p>
                <p><strong>Aprovador Responsável:</strong> ${req_data.aprovador_nome}</p>
                ${req_data.aprovador_comentario ? `<p><strong>Obs. Gestor:</strong> ${req_data.aprovador_comentario}</p>` : ''}
                ${comentario ? `<p><strong>Obs. Diretor:</strong> ${comentario}</p>` : ''}
              </div>
              ${buildAnexosHtml(todosAnexosConsolidados, '📎 Todos os Anexos para Elaboração da Cotação:')}
              <div style="text-align:center;margin-top:24px;">
                <a href="${SITE_URL}/portal-requisicoes" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Acessar Aba de Cotações</a>
              </div>
            </div>`
          );
          emailsEnviados.push(...resCompradores.enviados);
          emailsFalhas.push(...resCompradores.falhas);

          if (req_data.colaborador_email) {
            const resColab = await enviarParaTodos(
              [req_data.colaborador_email],
              `⏳ Requisição ${req_data.numero_requisicao} — Liberada para Cotação`,
              `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
                <div style="background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                  <h2 style="margin:0;">⏳ Em Cotação com Compras</h2>
                </div>
                <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
                <p>Sua requisição foi autorizada pelo diretor e está sendo cotada pelo setor de compras.</p>
                ${buildAnexosHtml(todosAnexosConsolidados, '📎 Anexos Vinculados:')}
              </div>`
            );
            emailsEnviados.push(...resColab.enviados);
            emailsFalhas.push(...resColab.falhas);
          }

          await registrarFalhasNoHistorico(supabase, req_data.id, emailsFalhas, req_data.numero_requisicao);

          return res.status(200).json({
            success: true,
            action: 'liberado_cotacao',
            numero_requisicao: req_data.numero_requisicao,
            emails: { enviados: emailsEnviados, falhas: emailsFalhas }
          });
        }

        // Diretor reprova na 1ª fase
        const { error: rejectError } = await supabase
          .from('requisicao_compras')
          .update({
            status: 'Reprovada pelo Diretor',
            diretor_comentario: comentario || '',
            diretor_data: new Date().toISOString(),
            token_aprovacao: '',
            anexos: todosAnexosConsolidados,
            historico: [...(req_data.historico || []), {
              data_hora: new Date().toISOString(),
              tipo: 'reprovacao_diretor_1',
              descricao: `Reprovado pelo diretor na 1ª fase. ${comentario ? 'Motivo: ' + comentario : ''}`,
              usuario: 'Diretor',
              numero_requisicao: req_data.numero_requisicao,
              anexos: anexos || [],
              token_utilizado: token
            }],
          })
          .eq('id', req_data.id);

        if (rejectError) throw rejectError;

        const emailsEnviadosReprova1 = [];
        const emailsFalhasReprova1 = [];

        // Notifica apenas o solicitante (aprovador_email removido conforme diretriz)
        if (req_data.colaborador_email) {
          const resColab = await enviarParaTodos(
            [req_data.colaborador_email],
            `❌ Requisição ${req_data.numero_requisicao} Reprovada pelo Diretor`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
              <div style="background:#ef4444;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0;">❌ Requisição Reprovada</h2>
              </div>
              <p>A requisição <strong>${req_data.numero_requisicao}</strong> foi reprovada pelo diretor.</p>
              <p><strong>Motivo:</strong> ${comentario || 'Sem motivo adicional.'}</p>
              ${buildAnexosHtml(todosAnexosConsolidados, '📎 Anexos Vinculados:')}
            </div>`
          );
          emailsEnviadosReprova1.push(...resColab.enviados);
          emailsFalhasReprova1.push(...resColab.falhas);
        }

        await registrarFalhasNoHistorico(supabase, req_data.id, emailsFalhasReprova1, req_data.numero_requisicao);

        return res.status(200).json({
          success: true,
          action: 'reprovado',
          numero_requisicao: req_data.numero_requisicao,
          emails: { enviados: emailsEnviadosReprova1, falhas: emailsFalhasReprova1 }
        });
      }

      // ── FASE 2: DIRETOR APROVA FINAL ──
      if (req_data.status === 'Aguardando Aprovação Final') {
        if (action === 'diretor_aprovar') {
          const { error: finishError } = await supabase
            .from('requisicao_compras')
            .update({
              status: 'Aprovada',
              etapa_compra: 'Lançar no SAP',
              aprovada_em: new Date().toISOString(),
              diretor_comentario: comentario || '',
              diretor_data: new Date().toISOString(),
              token_aprovacao: '',
              anexos: todosAnexosConsolidados,
              historico: [...(req_data.historico || []), {
                data_hora: new Date().toISOString(),
                tipo: 'aprovacao_diretor_final',
                descricao: `Aprovado definitivamente pelo diretor. Compra autorizada. ${comentario ? 'Obs: ' + comentario : ''}`,
                usuario: 'Diretor',
                numero_requisicao: req_data.numero_requisicao,
                anexos: anexos || [],
                token_utilizado: token
              }],
            })
            .eq('id', req_data.id);

          if (finishError) throw finishError;

          const emailsEnviadosFase2 = [];
          const emailsFalhasFase2 = [];

          // 1. Notifica compradores com o chamado para lançar no SAP
          const emailsCompradores = await buscarEmailsCompradores(supabase);
          const resCompradores = await enviarParaTodos(
            emailsCompradores,
            `Compra aprovada pelo Diretor: lançar no SAP · ${req_data.numero_requisicao}`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
              <div style="background:#16a34a;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0;font-size:20px;">✅ Compra Aprovada pelo Diretor</h2>
                <p style="margin:4px 0 0 0;font-size:14px;opacity:0.9;">Pronta para lançamento de pedido no SAP</p>
              </div>
              <p>A requisição <strong>${req_data.numero_requisicao}</strong> foi <strong>aprovada em definitivo</strong> pelo Diretor.</p>
              <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:4px 0;"><strong>Item:</strong> ${req_data.item}</p>
                <p style="margin:4px 0;"><strong>Quantidade:</strong> ${req_data.quantidade || 1} ${req_data.unidade_medida || 'un'}</p>
                <p style="margin:4px 0;"><strong>Fornecedor:</strong> ${req_data.cotacao_fornecedor || '-'}</p>
                <p style="margin:4px 0;"><strong>Valor Aprovado:</strong> R$ ${Number(req_data.cotacao_valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p style="margin:4px 0;"><strong>Solicitante:</strong> ${req_data.colaborador_nome} (${req_data.colaborador_area || 'Geral'})</p>
                ${req_data.data_necessidade ? `<p style="margin:4px 0;"><strong>Data da Necessidade:</strong> 📅 ${new Date(req_data.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}</p>` : ''}
                ${comentario ? `<p style="margin:6px 0;padding:6px 10px;background:#f1f5f9;border-radius:4px;font-size:13px;color:#1e3a8a;"><strong>Obs. Diretor:</strong> "${comentario}"</p>` : ''}
              </div>
              ${buildAnexosHtml(todosAnexosConsolidados, '📎 Todos os Anexos e Orçamentos da Requisição:')}
              <div style="text-align:center;margin-top:24px;">
                <a href="${SITE_URL}/portal-requisicoes?aba=pedidos" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">Abrir pedidos para lançar no SAP</a>
              </div>
            </div>`
          );
          emailsEnviadosFase2.push(...resCompradores.enviados);
          emailsFalhasFase2.push(...resCompradores.falhas);

          // 2. Notifica solicitante (aprovador_email removido conforme diretriz)
          if (req_data.colaborador_email) {
            const resColab = await enviarParaTodos(
              [req_data.colaborador_email],
              `✅ Requisição ${req_data.numero_requisicao} Aprovada Definitivamente`,
              `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
                <div style="background:#16a34a;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                  <h2 style="margin:0;">✅ Requisição Totalmente Aprovada!</h2>
                </div>
                <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
                <p>A requisição <strong>${req_data.numero_requisicao}</strong> teve a cotação aprovada definitivamente pelo diretor.</p>
                <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                  <p><strong>Item:</strong> ${req_data.item}</p>
                  <p><strong>Quantidade:</strong> ${req_data.quantidade || 1} ${req_data.unidade_medida || 'un'}</p>
                  ${req_data.data_necessidade ? `<p><strong>Data da Necessidade:</strong> 📅 ${new Date(req_data.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}</p>` : ''}
                  <p><strong>Valor Cotado:</strong> R$ ${Number(req_data.cotacao_valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p><strong>Fornecedor:</strong> ${req_data.cotacao_fornecedor || '-'}</p>
                  <p><strong>Comprador Responsável:</strong> ${req_data.cotacao_comprador_nome || '-'}</p>
                  ${comentario ? `<p><strong>Obs. Diretor:</strong> ${comentario}</p>` : ''}
                </div>
                ${buildAnexosHtml(todosAnexosConsolidados, '📎 Todos os Anexos e Orçamentos da Requisição:')}
              </div>`
            );
            emailsEnviadosFase2.push(...resColab.enviados);
            emailsFalhasFase2.push(...resColab.falhas);
          }

          await registrarFalhasNoHistorico(supabase, req_data.id, emailsFalhasFase2, req_data.numero_requisicao);

          return res.status(200).json({
            success: true,
            action: 'aprovado',
            numero_requisicao: req_data.numero_requisicao,
            emails: { enviados: emailsEnviadosFase2, falhas: emailsFalhasFase2 }
          });
        }

        // Diretor reprova na 2ª fase
        const { error: rejectError } = await supabase
          .from('requisicao_compras')
          .update({
            status: 'Reprovada pelo Diretor',
            diretor_comentario: comentario || '',
            diretor_data: new Date().toISOString(),
            token_aprovacao: '',
            anexos: todosAnexosConsolidados,
            historico: [...(req_data.historico || []), {
              data_hora: new Date().toISOString(),
              tipo: 'reprovacao_diretor_final',
              descricao: `Reprovada a cotação pelo diretor. ${comentario ? 'Motivo: ' + comentario : ''}`,
              usuario: 'Diretor',
              numero_requisicao: req_data.numero_requisicao,
              anexos: anexos || [],
              token_utilizado: token
            }],
          })
          .eq('id', req_data.id);

        if (rejectError) throw rejectError;

        const emailsEnviadosReprova2 = [];
        const emailsFalhasReprova2 = [];

        // Notifica apenas solicitante (aprovador_email removido conforme diretriz)
        if (req_data.colaborador_email) {
          const resColab = await enviarParaTodos(
            [req_data.colaborador_email],
            `❌ Requisição ${req_data.numero_requisicao} Reprovada na Fase Final`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
              <div style="background:#ef4444;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0;">❌ Requisição Reprovada</h2>
              </div>
              <p>A requisição <strong>${req_data.numero_requisicao}</strong> foi reprovada na avaliação da cotação pelo diretor.</p>
              <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                <p><strong>Item:</strong> ${req_data.item}</p>
                <p><strong>Quantidade:</strong> ${req_data.quantidade || 1} ${req_data.unidade_medida || 'un'}</p>
                ${req_data.data_necessidade ? `<p><strong>Data da Necessidade:</strong> 📅 ${new Date(req_data.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}</p>` : ''}
                <p><strong>Motivo:</strong> ${comentario || 'Sem motivo adicional.'}</p>
              </div>
              ${buildAnexosHtml(todosAnexosConsolidados, '📎 Anexos Vinculados:')}
            </div>`
          );
          emailsEnviadosReprova2.push(...resColab.enviados);
          emailsFalhasReprova2.push(...resColab.falhas);
        }

        await registrarFalhasNoHistorico(supabase, req_data.id, emailsFalhasReprova2, req_data.numero_requisicao);

        return res.status(200).json({
          success: true,
          action: 'reprovado',
          numero_requisicao: req_data.numero_requisicao,
          emails: { enviados: emailsEnviadosReprova2, falhas: emailsFalhasReprova2 }
        });
      }

      return res.status(400).json({
        error: 'token_usado',
        numero_requisicao: req_data.numero_requisicao,
        status_atual: req_data.status
      });
    }

    // ── GESTÃO PÓS-APROVAÇÃO: COMPRADOR (SAP, PREVISÃO, ENTREGA, CANCELAMENTO) ────
    const ACOES_POS_APROVACAO = [
      'comprador_lancar_sap',
      'comprador_atualizar_previsao',
      'comprador_registrar_entrega',
      'comprador_cancelar_compra',
      'comprador_desfazer_etapa',
      'solicitante_confirmar_recebimento'
    ];

    if (ACOES_POS_APROVACAO.includes(action)) {
      if (!requisicao_id) return res.status(400).json({ error: 'requisicao_id obrigatório' });

      const { data: req_data, error: getError } = await supabase
        .from('requisicao_compras')
        .select('*')
        .eq('id', requisicao_id)
        .maybeSingle();

      if (getError || !req_data) return res.status(404).json({ error: 'Requisição não encontrada' });

      if (req_data.status !== 'Aprovada') {
        return res.status(400).json({ error: 'Esta requisição não está no status Aprovada' });
      }

      // Validação de permissão: Comprador ou Solicitante (para confirmar entrega)
      let compradorColab = null;

      if (action === 'solicitante_confirmar_recebimento') {
        const usuario_id = body.solicitante_id || body.comprador_id;
        if (!usuario_id) return res.status(400).json({ error: 'Identificação do solicitante obrigatória' });
        if (req_data.colaborador_id && req_data.colaborador_id !== usuario_id) {
          return res.status(403).json({ error: 'Apenas o solicitante desta requisição pode confirmar o recebimento direto' });
        }
      } else {
        if (!comprador_id) return res.status(400).json({ error: 'comprador_id obrigatório' });

        const { data: colabData, error: colabErr } = await supabase
          .from('colaboradores')
          .select('id, nome_completo, email, area, eh_comprador, status')
          .eq('id', comprador_id)
          .maybeSingle();

        if (colabErr || !colabData) {
          return res.status(404).json({ error: 'Colaborador não encontrado' });
        }

        const isCompradorValido = colabData.status !== 'Desligado' && (
          colabData.eh_comprador === true ||
          (colabData.area && colabData.area.toLowerCase().includes('compras'))
        );

        if (!isCompradorValido) {
          return res.status(403).json({ error: 'Não autorizado: usuário não possui perfil de comprador' });
        }

        compradorColab = colabData;
      }

      const nomeOperador = compradorColab?.nome_completo || comprador_nome || req_data.colaborador_nome || 'Comprador';

      // 1. Lançar no SAP
      if (action === 'comprador_lancar_sap') {
        const { sap_pedido_numero, previsao_entrega, observacao } = body;
        if (!sap_pedido_numero || !sap_pedido_numero.trim()) {
          return res.status(400).json({ error: 'Número do pedido SAP é obrigatório' });
        }

        const sapNumeroLimpo = sap_pedido_numero.trim();

        // Checar duplicidade (sem bloquear)
        let aviso_duplicado = null;
        const { data: duplicadas } = await supabase
          .from('requisicao_compras')
          .select('id, numero_requisicao')
          .eq('sap_pedido_numero', sapNumeroLimpo)
          .neq('id', requisicao_id)
          .limit(1);

        if (duplicadas && duplicadas.length > 0) {
          aviso_duplicado = `O pedido SAP nº ${sapNumeroLimpo} já está registrado na requisição ${duplicadas[0].numero_requisicao}.`;
        }

        const dataPrevisaoFormatada = previsao_entrega
          ? new Date(previsao_entrega + 'T00:00:00').toLocaleDateString('pt-BR')
          : null;

        const novoEvento = {
          data_hora: new Date().toISOString(),
          tipo: 'pedido_sap_lancado',
          descricao: `Pedido lançado no SAP nº ${sapNumeroLimpo}. ${dataPrevisaoFormatada ? 'Previsão de entrega: ' + dataPrevisaoFormatada + '.' : 'Sem previsão informada.'}${observacao ? ' Obs: ' + observacao : ''}`,
          usuario: nomeOperador,
          numero_requisicao: req_data.numero_requisicao,
          sap_pedido_numero: sapNumeroLimpo,
          previsao_entrega: previsao_entrega || null
        };

        const { error: updErr } = await supabase
          .from('requisicao_compras')
          .update({
            etapa_compra: 'Aguardando entrega',
            sap_pedido_numero: sapNumeroLimpo,
            sap_lancado_em: new Date().toISOString(),
            sap_lancado_por_id: compradorColab?.id || null,
            sap_lancado_por_nome: nomeOperador,
            previsao_entrega: previsao_entrega || null,
            historico: [...(req_data.historico || []), novoEvento]
          })
          .eq('id', requisicao_id);

        if (updErr) throw updErr;

        // Notifica solicitante por e-mail com a previsão
        let emailsResultado = { enviados: [], falhas: [] };
        if (req_data.colaborador_email) {
          emailsResultado = await enviarParaTodos(
            [req_data.colaborador_email],
            `📦 Pedido SAP Gerado: Requisição ${req_data.numero_requisicao} (${req_data.item})`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
              <div style="background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0;">📦 Pedido Lançado no SAP</h2>
              </div>
              <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
              <p>O setor de compras efetuou o lançamento do pedido da sua requisição no sistema SAP.</p>
              <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                <p><strong>Requisição:</strong> ${req_data.numero_requisicao}</p>
                <p><strong>Item:</strong> ${req_data.item}</p>
                <p><strong>Nº do Pedido SAP:</strong> <code style="font-size:16px;font-weight:bold;color:#2563eb;">${sapNumeroLimpo}</code></p>
                <p><strong>Previsão de Entrega:</strong> ${dataPrevisaoFormatada ? `📅 ${dataPrevisaoFormatada}` : 'A definir'}</p>
                <p><strong>Fornecedor:</strong> ${req_data.cotacao_fornecedor || '-'}</p>
                <p><strong>Comprador Responsável:</strong> ${nomeOperador}</p>
                ${observacao ? `<p><strong>Observações:</strong> ${observacao}</p>` : ''}
              </div>
              <p style="color:#64748b;font-size:14px;margin-top:20px;">Você será notificado assim que a entrega for confirmada.</p>
            </div>`
          );
          await registrarFalhasNoHistorico(supabase, requisicao_id, emailsResultado.falhas, req_data.numero_requisicao);
        }

        return res.status(200).json({
          success: true,
          action: 'pedido_sap_lancado',
          numero_requisicao: req_data.numero_requisicao,
          aviso_duplicado,
          emails: emailsResultado
        });
      }

      // 2. Atualizar previsão de entrega
      if (action === 'comprador_atualizar_previsao') {
        const { previsao_entrega, observacao } = body;
        const dataPrevisaoFormatada = previsao_entrega
          ? new Date(previsao_entrega + 'T00:00:00').toLocaleDateString('pt-BR')
          : 'a definir';

        const novoEvento = {
          data_hora: new Date().toISOString(),
          tipo: 'previsao_entrega_atualizada',
          descricao: `Previsão de entrega alterada para ${dataPrevisaoFormatada}.${observacao ? ' Motivo: ' + observacao : ''}`,
          usuario: nomeOperador,
          numero_requisicao: req_data.numero_requisicao,
          previsao_entrega: previsao_entrega || null
        };

        const { error: updErr } = await supabase
          .from('requisicao_compras')
          .update({
            previsao_entrega: previsao_entrega || null,
            historico: [...(req_data.historico || []), novoEvento]
          })
          .eq('id', requisicao_id);

        if (updErr) throw updErr;

        return res.status(200).json({
          success: true,
          action: 'previsao_entrega_atualizada',
          numero_requisicao: req_data.numero_requisicao
        });
      }

      // 3. Registrar Entrega
      if (action === 'comprador_registrar_entrega' || action === 'solicitante_confirmar_recebimento') {
        const { entrega_data, entrega_nf, entrega_observacao } = body;
        const dataEfetiva = entrega_data || new Date().toISOString().split('T')[0];
        const dataFormatada = new Date(dataEfetiva + 'T00:00:00').toLocaleDateString('pt-BR');

        const novoEvento = {
          data_hora: new Date().toISOString(),
          tipo: 'entrega_registrada',
          descricao: `Entrega confirmada em ${dataFormatada}.${entrega_nf ? ' NF: ' + entrega_nf + '.' : ''}${entrega_observacao ? ' Obs: ' + entrega_observacao : ''}`,
          usuario: nomeOperador,
          numero_requisicao: req_data.numero_requisicao,
          entrega_data: dataEfetiva,
          entrega_nf: entrega_nf || null
        };

        const { error: updErr } = await supabase
          .from('requisicao_compras')
          .update({
            etapa_compra: 'Entregue',
            entrega_data: dataEfetiva,
            entrega_nf: entrega_nf || null,
            entrega_registrada_por_nome: nomeOperador,
            entrega_observacao: entrega_observacao || null,
            historico: [...(req_data.historico || []), novoEvento]
          })
          .eq('id', requisicao_id);

        if (updErr) throw updErr;

        // Notifica solicitante confirmando a entrega (se registrado pelo comprador)
        let emailsResultado = { enviados: [], falhas: [] };
        if (action === 'comprador_registrar_entrega' && req_data.colaborador_email) {
          emailsResultado = await enviarParaTodos(
            [req_data.colaborador_email],
            `🎉 Pedido Entregue: Requisição ${req_data.numero_requisicao} (${req_data.item})`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
              <div style="background:#16a34a;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0;">🎉 Material / Serviço Entregue!</h2>
              </div>
              <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
              <p>A entrega referente à sua requisição de compra foi confirmada pelo setor de compras.</p>
              <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                <p><strong>Requisição:</strong> ${req_data.numero_requisicao}</p>
                <p><strong>Item:</strong> ${req_data.item}</p>
                <p><strong>Data da Entrega:</strong> 📅 ${dataFormatada}</p>
                ${entrega_nf ? `<p><strong>Nota Fiscal (NF):</strong> ${entrega_nf}</p>` : ''}
                <p><strong>Fornecedor:</strong> ${req_data.cotacao_fornecedor || '-'}</p>
                <p><strong>Confirmado por:</strong> ${nomeOperador}</p>
                ${entrega_observacao ? `<p><strong>Observações:</strong> ${entrega_observacao}</p>` : ''}
              </div>
              <p style="color:#64748b;font-size:14px;margin-top:20px;">O processo da compra foi 100% concluído no TechControl.</p>
            </div>`
          );
          await registrarFalhasNoHistorico(supabase, requisicao_id, emailsResultado.falhas, req_data.numero_requisicao);
        }

        return res.status(200).json({
          success: true,
          action: 'entrega_registrada',
          numero_requisicao: req_data.numero_requisicao,
          emails: emailsResultado
        });
      }

      // 4. Cancelar compra
      if (action === 'comprador_cancelar_compra') {
        const { motivo } = body;
        if (!motivo || !motivo.trim()) {
          return res.status(400).json({ error: 'Motivo do cancelamento é obrigatório' });
        }

        const novoEvento = {
          data_hora: new Date().toISOString(),
          tipo: 'compra_cancelada',
          descricao: `Compra cancelada pelo comprador. Motivo: ${motivo.trim()}`,
          usuario: nomeOperador,
          numero_requisicao: req_data.numero_requisicao,
          motivo: motivo.trim()
        };

        const { error: updErr } = await supabase
          .from('requisicao_compras')
          .update({
            etapa_compra: 'Cancelada',
            compra_cancelada_motivo: motivo.trim(),
            historico: [...(req_data.historico || []), novoEvento]
          })
          .eq('id', requisicao_id);

        if (updErr) throw updErr;

        return res.status(200).json({
          success: true,
          action: 'compra_cancelada',
          numero_requisicao: req_data.numero_requisicao
        });
      }

      // 5. Desfazer etapa
      if (action === 'comprador_desfazer_etapa') {
        const etapaAtual = req_data.etapa_compra || 'Lançar no SAP';
        let updateFields = {};
        let etapaDestino = 'Lançar no SAP';

        if (etapaAtual === 'Entregue') {
          etapaDestino = 'Aguardando entrega';
          updateFields = {
            etapa_compra: 'Aguardando entrega',
            entrega_data: null,
            entrega_nf: null,
            entrega_registrada_por_nome: null,
            entrega_observacao: null
          };
        } else if (etapaAtual === 'Aguardando entrega') {
          etapaDestino = 'Lançar no SAP';
          updateFields = {
            etapa_compra: 'Lançar no SAP',
            sap_pedido_numero: null,
            sap_lancado_em: null,
            sap_lancado_por_id: null,
            sap_lancado_por_nome: null,
            previsao_entrega: null
          };
        } else if (etapaAtual === 'Cancelada') {
          etapaDestino = req_data.sap_pedido_numero ? 'Aguardando entrega' : 'Lançar no SAP';
          updateFields = {
            etapa_compra: etapaDestino,
            compra_cancelada_motivo: null
          };
        } else {
          return res.status(400).json({ error: 'A requisição já está na etapa inicial de lançamento' });
        }

        const novoEvento = {
          data_hora: new Date().toISOString(),
          tipo: 'etapa_desfeita',
          descricao: `Etapa da compra revertida de "${etapaAtual}" para "${etapaDestino}" para correção de dados.`,
          usuario: nomeOperador,
          numero_requisicao: req_data.numero_requisicao
        };

        const { error: updErr } = await supabase
          .from('requisicao_compras')
          .update({
            ...updateFields,
            historico: [...(req_data.historico || []), novoEvento]
          })
          .eq('id', requisicao_id);

        if (updErr) throw updErr;

        return res.status(200).json({
          success: true,
          action: 'etapa_desfeita',
          etapa_destino: etapaDestino,
          numero_requisicao: req_data.numero_requisicao
        });
      }
    }

    return res.status(400).json({ error: 'Ação inválida' });
  } catch (err) {
    console.error('[requisicaoComprasAction] Erro fatal:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
