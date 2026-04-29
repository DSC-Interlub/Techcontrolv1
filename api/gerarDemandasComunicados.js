import { createSupabaseAdmin } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createSupabaseAdmin();

    const body = req.body || {};
    const today = new Date();
    const anoAtual = today.getFullYear();

    const usarMesAtual = !!body.mes_atual;
    const mesAlvo = usarMesAtual ? today.getMonth() : (today.getMonth() + 1) % 12;
    const anoAlvo = (today.getMonth() === 11 && !usarMesAtual) ? anoAtual + 1 : anoAtual;

    const { data: colaboradores } = await supabase.from('colaboradores').select('*').eq('incluir_comunicados', true);
    const colaboradoresAtivos = (colaboradores || []).filter(c => c.status !== 'Desligado');

    const { data: demandasExistentes } = await supabase.from('comunicados_artes').select('*').eq('ano_referencia', anoAlvo);

    const jaExiste = (colaboradorId, tipo, dataEvento) =>
      (demandasExistentes || []).some(d =>
        d.colaborador_id === colaboradorId && d.tipo_comunicado === tipo && d.data_evento === dataEvento
      );

    const novasDemandas = [];

    for (const c of colaboradoresAtivos) {
      if (c.data_nascimento) {
        const dt = new Date(c.data_nascimento + 'T00:00:00');
        if (dt.getMonth() === mesAlvo) {
          const dataEvento = `${anoAlvo}-${String(mesAlvo + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          if (!jaExiste(c.id, 'aniversario_colaborador', dataEvento)) {
            novasDemandas.push({
              colaborador_id: c.id, colaborador_nome: c.nome_completo,
              tipo_comunicado: 'aniversario_colaborador', data_evento: dataEvento,
              descricao_evento: `${c.nome_completo} — Aniversário em ${dt.getDate()}/${mesAlvo + 1}/${anoAlvo}`,
              imagem_url: '', status_arte: 'sem_arte', ano_referencia: anoAlvo, criado_por: 'Sistema',
            });
          }
        }
      }

      if (c.conjuge_data_nascimento) {
        const dt = new Date(c.conjuge_data_nascimento + 'T00:00:00');
        if (dt.getMonth() === mesAlvo) {
          const dataEvento = `${anoAlvo}-${String(mesAlvo + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          if (!jaExiste(c.id, 'aniversario_conjuge', dataEvento)) {
            novasDemandas.push({
              colaborador_id: c.id, colaborador_nome: c.nome_completo,
              tipo_comunicado: 'aniversario_conjuge', data_evento: dataEvento,
              descricao_evento: `${c.nome_completo} — Aniversário do cônjuge ${c.conjuge_nome || ''} em ${dt.getDate()}/${mesAlvo + 1}/${anoAlvo}`,
              imagem_url: '', status_arte: 'sem_arte', ano_referencia: anoAlvo, criado_por: 'Sistema',
            });
          }
        }
      }

      for (const filho of (c.filhos || [])) {
        if (!filho.filho_data_nascimento) continue;
        const dt = new Date(filho.filho_data_nascimento + 'T00:00:00');
        if (dt.getFullYear() === anoAlvo - 1 && dt.getMonth() === mesAlvo) {
          const dataEvento = `${anoAlvo}-${String(mesAlvo + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          if (!jaExiste(c.id, 'aniversario_filho_1ano', dataEvento)) {
            novasDemandas.push({
              colaborador_id: c.id, colaborador_nome: c.nome_completo,
              tipo_comunicado: 'aniversario_filho_1ano', data_evento: dataEvento,
              descricao_evento: `${c.nome_completo} — 1 aninho de ${filho.filho_nome || 'filho(a)'} em ${dt.getDate()}/${mesAlvo + 1}/${anoAlvo}`,
              imagem_url: '', status_arte: 'sem_arte', ano_referencia: anoAlvo,
              filho_nome: filho.filho_nome || '', criado_por: 'Sistema',
            });
          }
        }
      }

      if (c.data_admissao) {
        const dtAdm = new Date(c.data_admissao + 'T00:00:00');
        if (dtAdm.getMonth() === mesAlvo) {
          const anosEmpresa = anoAlvo - dtAdm.getFullYear();
          if ([1, 2, 3, 5, 10, 15, 20].includes(anosEmpresa)) {
            const dataEvento = `${anoAlvo}-${String(mesAlvo + 1).padStart(2, '0')}-${String(dtAdm.getDate()).padStart(2, '0')}`;
            if (!jaExiste(c.id, 'tempo_empresa', dataEvento)) {
              novasDemandas.push({
                colaborador_id: c.id, colaborador_nome: c.nome_completo,
                tipo_comunicado: 'tempo_empresa', data_evento: dataEvento,
                descricao_evento: `${c.nome_completo} — ${anosEmpresa} ano${anosEmpresa > 1 ? 's' : ''} de empresa`,
                imagem_url: '', status_arte: 'sem_arte', ano_referencia: anoAlvo,
                anos_empresa: anosEmpresa, criado_por: 'Sistema',
              });
            }
          }
        }
      }
    }

    let criadas = 0;
    for (const d of novasDemandas) {
      await supabase.from('comunicados_artes').insert(d);
      criadas++;
    }

    return res.status(200).json({
      ok: true,
      mes_gerado: `${String(mesAlvo + 1).padStart(2, '0')}/${anoAlvo}`,
      criadas,
      ja_existiam: (demandasExistentes || []).length,
      msg: `${criadas} demanda(s) criada(s) para ${String(mesAlvo + 1).padStart(2, '0')}/${anoAlvo}.`,
    });
  } catch (err) {
    console.error('[gerarDemandasComunicados] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
