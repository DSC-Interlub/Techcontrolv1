import { createSupabaseAdmin } from './_supabase.js';
import { sendEmail as sendEmailUnified } from './_email.js';

async function sendEmail(to, subject, html) {
  return sendEmailUnified({ to, subject, html });
}

const SITE_URL = 'https://techcontrol.site';

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

      // Reprovar pelo aprovador
      if (action === 'aprovador_reprovar') {
        const { error: updError } = await supabase
          .from('requisicao_compras')
          .update({
            status: 'Reprovada pelo Aprovador',
            aprovador_comentario: comentario || '',
            aprovador_data: new Date().toISOString(),
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

        if (req_data.colaborador_email) {
          await sendEmail(
            req_data.colaborador_email,
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
                <p><strong>Devolutiva:</strong> ${comentario || 'Sem comentário adicional.'}</p>
              </div>
              <p style="color:#64748b;font-size:14px;">Em caso de dúvidas, entre em contato com seu gestor.</p>
            </div>`
          );
        }

        return res.status(200).json({ success: true, action: 'reprovado', numero_requisicao: req_data.numero_requisicao });
      }

      // Aprovar: enviar para a 1ª aprovação do diretor (liberação para cotação)
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

      // Gera UUID para token de aprovação do diretor
      const token_dir = crypto.randomUUID().replace(/-/g, '');

      const { error: updError2 } = await supabase
        .from('requisicao_compras')
        .update({
          status: 'Aguardando Diretor',
          aprovador_comentario: comentario || '',
          aprovador_data: new Date().toISOString(),
          token_aprovacao: token_dir,
          historico: [...(req_data.historico || []), {
            data_hora: new Date().toISOString(),
            tipo: 'aprovacao_aprovador',
            descricao: 'Aprovado pelo responsável. Aguardando 1ª aprovação do diretor (liberação para cotação).',
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
        : req_data.valor_minimo ? `A partir de R$ ${Number(req_data.valor_minimo).toLocaleString('pt-BR')}` : 'Não informado';

      await sendEmail(
        diretorEmail,
        `Ação necessária: Requisição ${req_data.numero_requisicao} aguardando sua aprovação para liberar cotação`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
          <div style="background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:20px;">
            <h2 style="margin:0;font-size:20px;">🛒 Requisição de Compra — 1ª Aprovação do Diretor</h2>
            <p style="margin:4px 0 0 0;font-size:14px;opacity:0.9;">Liberação para cotação de fornecedores</p>
          </div>

          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:20px;color:#1e3a8a;line-height:1.6;">
            <p style="margin:0 0 8px 0;"><strong>O que aconteceu até agora:</strong> O colaborador <strong>${req_data.colaborador_nome}</strong> (${req_data.colaborador_area}) solicitou uma compra, que já foi analisada e <strong>aprovada pelo responsável ${req_data.aprovador_nome}</strong>.</p>
            <p style="margin:0 0 8px 0;"><strong>O que se pede agora:</strong> Solicitamos a sua autorização inicial para <strong>liberar esta requisição para cotação</strong> de preços com os fornecedores pelo setor de compras.</p>
            <p style="margin:0;"><strong>O que acontecerá depois:</strong> Após o comprador cadastrar os orçamentos, você receberá um novo e-mail para a <strong>aprovação final de valores</strong> antes da efetivação da compra.</p>
          </div>

          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:18px;margin-bottom:24px;">
            <h3 style="margin:0 0 12px 0;font-size:16px;color:#0f172a;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">📋 Dados da Requisição</h3>
            <p style="margin:4px 0;"><strong>Número da Requisição:</strong> ${req_data.numero_requisicao}</p>
            <p style="margin:4px 0;"><strong>Solicitante:</strong> ${req_data.colaborador_nome} (${req_data.colaborador_area})</p>
            <p style="margin:4px 0;"><strong>Aprovador Responsável:</strong> ${req_data.aprovador_nome}</p>
            <p style="margin:4px 0;"><strong>Item / Produto:</strong> ${req_data.item}</p>
            ${req_data.material ? `<p style="margin:4px 0;"><strong>Material:</strong> ${req_data.material}</p>` : ''}
            ${req_data.cor ? `<p style="margin:4px 0;"><strong>Cor:</strong> ${req_data.cor}</p>` : ''}
            <p style="margin:4px 0;"><strong>Quantidade:</strong> ${req_data.quantidade}</p>
            ${req_data.centro_custo_nome ? `<p style="margin:4px 0;"><strong>Centro de Custo:</strong> ${req_data.centro_custo_codigo} — ${req_data.centro_custo_nome}</p>` : ''}
            <p style="margin:4px 0;"><strong>Valor Total Estimado:</strong> ${valorRangeTotal}</p>
            <p style="margin:4px 0;"><strong>Urgência:</strong> ${req_data.urgencia}</p>
            <p style="margin:4px 0;"><strong>Justificativa:</strong> ${req_data.justificativa}</p>
            ${comentario ? `<p style="margin:4px 0;color:#1e40af;"><strong>Comentário do Aprovador:</strong> ${comentario}</p>` : ''}
          </div>

          <div style="margin:24px 0;text-align:center;">
            <a href="${linkAprovar}" style="display:inline-block;background:#16a34a;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin-right:12px;">✅ LIBERAR COTAÇÃO</a>
            <a href="${linkReprovar}" style="display:inline-block;background:#dc2626;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">❌ REPROVAR</a>
          </div>
        </div>`
      );

      if (req_data.colaborador_email) {
        await sendEmail(
          req_data.colaborador_email,
          `⏳ Requisição ${req_data.numero_requisicao} — Aguardando Diretor`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
            <div style="background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
              <h2 style="margin:0;">⏳ Requisição em Análise pelo Diretor</h2>
            </div>
            <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
            <p>Sua requisição foi <strong>aprovada pelo seu responsável</strong> e aguarda autorização do diretor para cotação.</p>
          </div>`
        );
      }

      return res.status(200).json({ success: true, action: 'enviado_diretor_1', numero_requisicao: req_data.numero_requisicao });
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

      // Novo token para a 2ª aprovação do diretor
      const token_dir = crypto.randomUUID().replace(/-/g, '');

      const { error: updError } = await supabase
        .from('requisicao_compras')
        .update({
          status: 'Aguardando Aprovação Final',
          cotacao_valor: Number(cotacao_valor),
          cotacao_fornecedor,
          cotacao_anexos: cotacao_anexos || [],
          cotacao_comentario: cotacao_comentario || '',
          cotacao_data: new Date().toISOString(),
          cotacao_comprador_id: comprador_id || null,
          cotacao_comprador_nome: comprador_nome || 'Comprador',
          token_aprovacao: token_dir,
          historico: [...(req_data.historico || []), {
            data_hora: new Date().toISOString(),
            tipo: 'cotacao_enviada',
            descricao: `Cotação finalizada pelo comprador (${comprador_nome || 'Comprador'}). Valor: R$ ${Number(cotacao_valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — Fornecedor: ${cotacao_fornecedor}. Aguardando aprovação final do diretor.`,
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

      const anexosHtml = cotacao_anexos?.length > 0
        ? `<div style="margin-top:10px;padding-top:8px;border-top:1px dashed #a7f3d0;"><p style="margin:0 0 4px 0;font-size:13px;color:#047857;font-weight:bold;">📎 Orçamentos / Anexos da Cotação:</p>${cotacao_anexos.map(a => `<a href="${a.file_url}" target="_blank" style="display:inline-block;margin-right:8px;margin-bottom:4px;background:#ffffff;padding:4px 10px;border-radius:4px;border:1px solid #a7f3d0;color:#047857;font-weight:bold;text-decoration:none;font-size:12px;">📄 ${a.file_name}</a>`).join('')}</div>`
        : '';

      await sendEmail(
        diretorEmail,
        `Ação necessária: Requisição ${req_data.numero_requisicao} aguardando sua aprovação final (Cotação Concluída)`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
          <div style="background:#047857;color:white;padding:20px;border-radius:8px;margin-bottom:20px;">
            <h2 style="margin:0;font-size:20px;">💰 Cotação Concluída — Aprovação Final do Diretor</h2>
            <p style="margin:4px 0 0 0;font-size:14px;opacity:0.9;">Etapa final de autorização de compra</p>
          </div>

          <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px;margin-bottom:24px;color:#065f46;line-height:1.6;">
            <p style="margin:0 0 8px 0;"><strong>O que aconteceu até agora:</strong> O comprador <strong>${comprador_nome || 'responsável'}</strong> finalizou a cotação de preços e cadastrou o orçamento para a requisição <strong>${req_data.numero_requisicao}</strong> (Solicitante: <strong>${req_data.colaborador_nome}</strong>).</p>
            <p style="margin:0 0 8px 0;"><strong>O que se pede agora:</strong> Esta é a <strong>ÚLTIMA ETAPA</strong> do processo. Solicitamos sua aprovação final do valor e fornecedor selecionado para autorizar a compra.</p>
            <p style="margin:0;"><strong>O que acontecerá depois:</strong> Ao aprovar, a compra fica <strong>definitivamente autorizada</strong> e o setor de compras prosseguirá com o pedido e faturamento.</p>
          </div>

          <!-- CARD 1: DADOS DA COTAÇÃO EM DESTAQUE (VERDE) -->
          <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:20px;margin-bottom:24px;box-shadow:0 2px 4px rgba(0,0,0,0.04);">
            <div style="border-bottom:2px solid #bbf7d0;padding-bottom:10px;margin-bottom:12px;">
              <span style="background:#16a34a;color:white;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">💵 Dados da Cotação Realizada</span>
            </div>
            <div style="background:white;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-bottom:12px;">
              <p style="margin:0 0 2px 0;font-size:12px;color:#15803d;font-weight:bold;text-transform:uppercase;">Valor Final da Cotação</p>
              <p style="margin:0;font-size:26px;font-weight:800;color:#15803d;font-family:monospace;">R$ ${Number(cotacao_valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Fornecedor Cotado:</strong> <span style="color:#15803d;font-weight:bold;">${cotacao_fornecedor}</span></p>
            <p style="margin:6px 0;font-size:14px;color:#374151;"><strong>Comprador Responsável:</strong> ${comprador_nome || 'Comprador'}</p>
            ${cotacao_comentario ? `<p style="margin:8px 0 4px 0;font-size:13px;color:#166534;background:#ffffff;padding:8px 12px;border-radius:6px;border:1px solid #dcfce7;"><strong>Obs. Comprador:</strong> "${cotacao_comentario}"</p>` : ''}
            ${anexosHtml}
          </div>

          <!-- CARD 2: DADOS ORIGINAIS DA REQUISIÇÃO (SLATE/AZUL) -->
          <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:10px;padding:20px;margin-bottom:24px;">
            <div style="border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:12px;">
              <span style="background:#475569;color:white;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:bold;text-transform:uppercase;">📋 Dados Originais da Requisição</span>
            </div>
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Número:</strong> ${req_data.numero_requisicao}</p>
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Solicitante:</strong> ${req_data.colaborador_nome} (${req_data.colaborador_area})</p>
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Item / Produto:</strong> ${req_data.item}</p>
            ${req_data.material ? `<p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Material:</strong> ${req_data.material}</p>` : ''}
            ${req_data.cor ? `<p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Cor:</strong> ${req_data.cor}</p>` : ''}
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Quantidade:</strong> ${req_data.quantidade}</p>
            ${req_data.centro_custo_nome ? `<p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Centro de Custo:</strong> ${req_data.centro_custo_codigo} — ${req_data.centro_custo_nome}</p>` : ''}
            <p style="margin:4px 0;font-size:13px;color:#334155;"><strong>Justificativa Original:</strong> ${req_data.justificativa}</p>
          </div>

          <div style="margin:24px 0;text-align:center;">
            <a href="${linkAprovar}" style="display:inline-block;background:#16a34a;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin-right:12px;">✅ APROVAR COMPRA DEFINITIVA</a>
            <a href="${linkReprovar}" style="display:inline-block;background:#dc2626;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">❌ REPROVAR</a>
          </div>
        </div>`
      );

      if (req_data.colaborador_email) {
        await sendEmail(
          req_data.colaborador_email,
          `⏳ Requisição ${req_data.numero_requisicao} — Cotação Concluída`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
            <div style="background:#059669;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
              <h2 style="margin:0;">⏳ Cotação Realizada</h2>
            </div>
            <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
            <p>A cotação para sua requisição foi finalizada pelo setor de compras (Valor: <strong>R$ ${Number(cotacao_valor).toLocaleString('pt-BR')}</strong>) e enviada para autorização final do diretor.</p>
          </div>`
        );
      }

      return res.status(200).json({ success: true, action: 'cotacao_enviada', numero_requisicao: req_data.numero_requisicao });
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
        item, material, cor, quantidade, centro_custo_codigo, centro_custo_nome,
        valor_unitario_minimo, valor_unitario_maximo,
        valor_minimo, valor_maximo,
        justificativa, urgencia, fornecedor_sugerido
      } = body;

      const novosAnexos = anexos || req_data.anexos || [];

      const { error: editError } = await supabase
        .from('requisicao_compras')
        .update({
          item, material, cor, quantidade, centro_custo_codigo, centro_custo_nome,
          valor_unitario_minimo, valor_unitario_maximo,
          valor_minimo, valor_maximo,
          justificativa, urgencia, fornecedor_sugerido,
          anexos: novosAnexos,
          status: 'Aguardando Aprovador',
          aprovador_comentario: '',
          aprovador_data: null,
          diretor_comentario: '',
          diretor_data: null,
          token_aprovacao: '',
          historico: [...(req_data.historico || []), {
            data_hora: new Date().toISOString(),
            tipo: 'edicao_reenvio',
            descricao: 'Requisição editada e reenviada para aprovação do responsável.',
            usuario: req_data.colaborador_nome,
            numero_requisicao: req_data.numero_requisicao,
            anexos: novosAnexos
          }],
        })
        .eq('id', requisicao_id);

      if (editError) throw editError;

      return res.status(200).json({ success: true, action: 'editada', numero_requisicao: req_data.numero_requisicao });
    }

    // ── AÇÃO DO DIRETOR VIA TOKEN (Fase 1 ou Fase 2) ─────────────────────────────
    if (action === 'diretor_aprovar' || action === 'diretor_reprovar') {
      if (!token) return res.status(400).json({ error: 'Token inválido' });

      const { data: listData } = await supabase
        .from('requisicao_compras')
        .select('*')
        .eq('token_aprovacao', token)
        .limit(1);

      let req_data = listData?.[0];

      // Se o token não estiver no campo token_aprovacao (porque já foi utilizado/limpo)
      if (!req_data) {
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
        return res.status(404).json({ error: 'Token não encontrado ou já utilizado' });
      }

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

          // Busca compradores
          const { data: compradores } = await supabase
            .from('colaboradores')
            .select('email, nome_completo')
            .eq('eh_comprador', true);

          const emailsCompradores = (compradores || []).map(c => c.email).filter(Boolean);

          for (const buyerEmail of emailsCompradores) {
            await sendEmail(
              buyerEmail,
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
                  <p><strong>Quantidade:</strong> ${req_data.quantidade}</p>
                  <p><strong>Solicitante:</strong> ${req_data.colaborador_nome}</p>
                </div>
                <a href="${SITE_URL}/portal-requisicoes" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Acessar Aba de Cotações</a>
              </div>`
            );
          }

          if (req_data.colaborador_email) {
            await sendEmail(
              req_data.colaborador_email,
              `⏳ Requisição ${req_data.numero_requisicao} — Liberada para Cotação`,
              `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
                <div style="background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                  <h2 style="margin:0;">⏳ Em Cotação com Compras</h2>
                </div>
                <p>Olá, <strong>${req_data.colaborador_nome}</strong>!</p>
                <p>Sua requisição foi autorizada pelo diretor e está sendo cotada pelo setor de compras.</p>
              </div>`
            );
          }

          return res.status(200).json({ success: true, action: 'liberado_cotacao', numero_requisicao: req_data.numero_requisicao });
        }

        // Diretor reprova na 1ª fase
        const { error: rejectError } = await supabase
          .from('requisicao_compras')
          .update({
            status: 'Reprovada pelo Diretor',
            diretor_comentario: comentario || '',
            diretor_data: new Date().toISOString(),
            token_aprovacao: '',
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

        const emails = [req_data.aprovador_email, req_data.colaborador_email].filter(Boolean);
        for (const targetEmail of emails) {
          await sendEmail(
            targetEmail,
            `❌ Requisição ${req_data.numero_requisicao} Reprovada pelo Diretor`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
              <div style="background:#ef4444;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0;">❌ Requisição Reprovada</h2>
              </div>
              <p>A requisição <strong>${req_data.numero_requisicao}</strong> foi reprovada pelo diretor.</p>
              <p><strong>Motivo:</strong> ${comentario || 'Sem motivo adicional.'}</p>
            </div>`
          );
        }
        return res.status(200).json({ success: true, action: 'reprovado', numero_requisicao: req_data.numero_requisicao });
      }

      // ── FASE 2: DIRETOR APROVA FINAL ──
      if (req_data.status === 'Aguardando Aprovação Final') {
        if (action === 'diretor_aprovar') {
          const { error: finishError } = await supabase
            .from('requisicao_compras')
            .update({
              status: 'Aprovada',
              diretor_comentario: comentario || '',
              diretor_data: new Date().toISOString(),
              token_aprovacao: '',
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

          const emails = [req_data.aprovador_email, req_data.colaborador_email].filter(Boolean);
          for (const targetEmail of emails) {
            const nome = targetEmail === req_data.colaborador_email ? req_data.colaborador_nome : req_data.aprovador_nome;
            await sendEmail(
              targetEmail,
              `✅ Requisição ${req_data.numero_requisicao} Aprovada Definitivamente`,
              `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
                <div style="background:#16a34a;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                  <h2 style="margin:0;">✅ Requisição Totalmente Aprovada!</h2>
                </div>
                <p>Olá, <strong>${nome}</strong>!</p>
                <p>A requisição <strong>${req_data.numero_requisicao}</strong> teve a cotação aprovada definitivamente pelo diretor.</p>
                <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                  <p><strong>Item:</strong> ${req_data.item}</p>
                  <p><strong>Valor Cotado:</strong> R$ ${Number(req_data.cotacao_valor || 0).toLocaleString('pt-BR')}</p>
                  <p><strong>Fornecedor:</strong> ${req_data.cotacao_fornecedor || '-'}</p>
                  ${comentario ? `<p><strong>Obs. Diretor:</strong> ${comentario}</p>` : ''}
                </div>
              </div>`
            );
          }
          return res.status(200).json({ success: true, action: 'aprovado', numero_requisicao: req_data.numero_requisicao });
        }

        // Diretor reprova na 2ª fase
        const { error: rejectError } = await supabase
          .from('requisicao_compras')
          .update({
            status: 'Reprovada pelo Diretor',
            diretor_comentario: comentario || '',
            diretor_data: new Date().toISOString(),
            token_aprovacao: '',
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

        const emails = [req_data.aprovador_email, req_data.colaborador_email].filter(Boolean);
        for (const targetEmail of emails) {
          await sendEmail(
            targetEmail,
            `❌ Requisição ${req_data.numero_requisicao} Reprovada na Fase Final`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
              <div style="background:#ef4444;color:white;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0;">❌ Requisição Reprovada</h2>
              </div>
              <p>A requisição <strong>${req_data.numero_requisicao}</strong> foi reprovada na avaliação da cotação pelo diretor.</p>
              <p><strong>Motivo:</strong> ${comentario || 'Sem motivo adicional.'}</p>
            </div>`
          );
        }
        return res.status(200).json({ success: true, action: 'reprovado', numero_requisicao: req_data.numero_requisicao });
      }

      return res.status(400).json({
        error: 'token_usado',
        numero_requisicao: req_data.numero_requisicao,
        status_atual: req_data.status
      });
    }

    return res.status(400).json({ error: 'Ação inválida' });
  } catch (err) {
    console.error('[requisicaoComprasAction] Erro fatal:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
