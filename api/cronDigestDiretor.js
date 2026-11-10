import { createSupabaseAdmin } from './_supabase.js';
import { sendEmail } from './_email.js';

export default async function handler(req, res) {
  try {
    const supabase = createSupabaseAdmin();

    // 1. Busca e-mail do Diretor Geral configurado no sistema
    const { data: configRecord } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'diretor_email')
      .maybeSingle();

    const diretorEmail = configRecord?.valor?.trim() || 'vtorres@interlub.com';

    // 2. Busca todas as requisições pendentes de autorização da Diretoria
    const { data: pendencias, error } = await supabase
      .from('requisicao_compras')
      .select('id, numero_requisicao, item, quantidade, unidade_medida, colaborador_nome, colaborador_area, status, valor_maximo, valor_unitario_maximo, cotacao_valor, cotacao_fornecedor, created_date, historico')
      .in('status', ['Aguardando Diretor', 'Aguardando Aprovação Final'])
      .order('created_date', { ascending: true });

    if (error) {
      console.error('[cronDigestDiretor] Erro ao consultar pendências:', error);
      return res.status(500).json({ error: error.message });
    }

    const totalPendencias = (pendencias || []).length;

    // REGRA DE OURO: Se NÃO houver pendências, NÃO envia nada para não fazer spam!
    if (totalPendencias === 0) {
      console.log('[cronDigestDiretor] Nenhuma pendência para a Diretoria. E-mail não enviado.');
      return res.status(200).json({
        success: true,
        pendencias: 0,
        emailEnviado: false,
        message: 'Nenhuma pendência para o diretor. Zero spam.'
      });
    }

    console.log(`[cronDigestDiretor] Encontradas ${totalPendencias} pendências para ${diretorEmail}. Montando resumo...`);

    // 3. Monta os cards limpos das requisições pendentes
    const itensHtml = pendencias.map((req, index) => {
      const isFase1 = req.status === 'Aguardando Diretor';
      const faseTexto = isFase1 
        ? '🟢 1ª Etapa: Autorizar Cotação de Preço' 
        : '⚠️ 2ª Etapa: Avaliação de Preço (Cotação Realizada)';
      
      const qtdTexto = `${req.quantidade || 1} ${req.unidade_medida || 'un'}`;
      
      const valorEstimado = Number(req.valor_maximo) || (Number(req.valor_unitario_maximo) ? Number(req.valor_unitario_maximo) * (Number(req.quantidade) || 1) : 0);
      const valorCotado = Number(req.cotacao_valor) || 0;

      // Verifica se é item reenviado após reprovação
      const reenvio = (req.historico || []).slice().reverse().find(h => h.tipo === 'reenvio_apos_ajuste');
      const motivoAnterior = reenvio?.motivo_anterior;

      return `
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          ${motivoAnterior ? `
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;margin-bottom:10px;color:#92400e;font-size:12px;">
              <strong>⚠️ Item reenviado pelo solicitante</strong> (Recusa anterior: "<em>${motivoAnterior}</em>")
            </div>
          ` : ''}
          <div style="margin-bottom:6px;">
            <span style="background:#f1f5f9;color:#475569;padding:3px 8px;border-radius:4px;font-size:11px;font-family:monospace;font-weight:bold;">${req.numero_requisicao}</span>
            <span style="background:${isFase1 ? '#dcfce7' : '#f3e8ff'};color:${isFase1 ? '#166534' : '#6b21a8'};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;margin-left:6px;">${faseTexto}</span>
          </div>
          <p style="margin:0 0 6px 0;font-size:16px;font-weight:bold;color:#0f172a;">${index + 1}. ${req.item}</p>
          <p style="margin:0 0 4px 0;font-size:13px;color:#475569;">
            Solicitante: <strong>${req.colaborador_nome}</strong> (${req.colaborador_area || 'Geral'}) · Quantidade: <strong>${qtdTexto}</strong>
          </p>
          ${isFase1 ? `
            <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;">
              Estimativa máxima prevista: <strong style="color:#0f172a;">R$ ${valorEstimado > 0 ? valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'Não informada'}</strong>
            </p>
          ` : `
            <p style="margin:0 0 8px 0;font-size:14px;color:#15803d;font-weight:bold;">
              Valor Cotado: R$ ${valorCotado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Fornecedor: ${req.cotacao_fornecedor || 'Fornecedor'})
            </p>
          `}
          <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">
            <a href="https://www.techcontrol.site/portal-requisicoes" style="display:inline-block;background:#4338ca;color:#ffffff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:bold;">
              👉 Decidir sobre este pedido no TechControl
            </a>
          </div>
        </div>
      `;
    }).join('');

    const htmlEmail = `
      <div style="font-family:sans-serif;max-width:620px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:14px;color:#1e293b;">
        <div style="background:#1e1b4b;color:white;padding:22px;border-radius:10px;margin-bottom:20px;">
          <h2 style="margin:0;font-size:22px;font-weight:bold;">📋 TechControl — Diretoria</h2>
          <p style="margin:6px 0 0 0;font-size:14px;opacity:0.9;">Relatório de autorizações pendentes de compras</p>
        </div>

        <p style="font-size:16px;margin:0 0 14px 0;">
          Olá, <strong>Valter</strong>!
        </p>
        <p style="font-size:15px;color:#475569;margin:0 0 18px 0;line-height:1.5;">
          Você possui <strong>${totalPendencias} compra(s)</strong> aguardando sua autorização no sistema. Clique no botão abaixo para abrir diretamente a sua tela:
        </p>

        <!-- BOTÃO PRINCIPAL NO TOPO -->
        <div style="text-align:center;margin:20px 0 24px 0;">
          <a href="https://www.techcontrol.site/portal-requisicoes" style="display:block;background:#16a34a;color:white;padding:16px 24px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:17px;box-shadow:0 4px 6px rgba(0,0,0,0.12);">
            👉 CLIQUE AQUI PARA ABRIR O SISTEMA E AUTORIZAR
          </a>
          <p style="margin:6px 0 0 0;font-size:12px;color:#64748b;">
            Link direto: <a href="https://www.techcontrol.site/portal-requisicoes" style="color:#2563eb;text-decoration:underline;">https://www.techcontrol.site/portal-requisicoes</a>
          </p>
        </div>

        <div style="margin-bottom:24px;">
          ${itensHtml}
        </div>

        <!-- BOTÃO SECUNDÁRIO NO RODAPÉ -->
        <div style="text-align:center;margin:28px 0 20px 0;padding-top:16px;border-top:1px solid #e2e8f0;">
          <a href="https://www.techcontrol.site/portal-requisicoes" style="display:inline-block;background:#16a34a;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            👉 Acessar Portal de Requisições
          </a>
          <p style="margin:8px 0 0 0;font-size:12px;color:#64748b;">
            Ou copie e cole no seu navegador: https://www.techcontrol.site/portal-requisicoes
          </p>
        </div>

        <p style="text-align:center;font-size:11px;color:#94a3b8;margin:20px 0 0 0;">
          Este resumo automático é enviado apenas quando há compras pendentes de sua decisão (às 09h e 15h, de segunda a sexta).
        </p>
      </div>
    `;

    // 4. Dispara o e-mail consolidado
    await sendEmail({
      to: diretorEmail,
      subject: `📋 TechControl: Você tem ${totalPendencias} compra(s) aguardando sua autorização`,
      html: htmlEmail
    });

    console.log(`[cronDigestDiretor] Resumo com ${totalPendencias} requisições enviado com sucesso para ${diretorEmail}!`);

    return res.status(200).json({
      success: true,
      pendencias: totalPendencias,
      emailEnviado: true,
      destinatario: diretorEmail
    });
  } catch (err) {
    console.error('[cronDigestDiretor] Erro inesperado:', err);
    return res.status(500).json({ error: err.message });
  }
}
