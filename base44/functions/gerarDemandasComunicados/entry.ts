import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Permite chamada de automação agendada (sem user) ou por admin autenticado
  let user = null;
  try { user = await base44.auth.me(); } catch (_) { /* agendado */ }

  const today = new Date();
  const anoAtual = today.getFullYear();

  // Determina qual mês gerar: próximo mês (padrão) ou mês atual (se ?mes_atual=1)
  const url = new URL(req.url);
  const usarMesAtual = url.searchParams.get("mes_atual") === "1" || (await req.text().then(t => { try { return JSON.parse(t).mes_atual; } catch { return false; } }).catch(() => false));

  const mesAlvo = usarMesAtual ? today.getMonth() : (today.getMonth() + 1) % 12;
  const anoAlvo = (today.getMonth() === 11 && !usarMesAtual) ? anoAtual + 1 : anoAtual;

  const criador = user?.full_name || user?.email || "Sistema (automação)";

  // Buscar colaboradores ativos com incluir_comunicados = true
  const colaboradores = await base44.asServiceRole.entities.Colaboradores.filter({
    incluir_comunicados: true,
  });
  const colaboradoresAtivos = colaboradores.filter(c => c.status !== "Desligado");

  // Buscar demandas já existentes para o mês alvo
  const demandasExistentes = await base44.asServiceRole.entities.Comunicados_Artes.filter({
    ano_referencia: anoAlvo,
  });

  const jaExiste = (colaboradorId, tipo, dataEvento) => {
    return demandasExistentes.some(d =>
      d.colaborador_id === colaboradorId &&
      d.tipo_comunicado === tipo &&
      d.data_evento === dataEvento
    );
  };

  const novasDemandas = [];

  for (const c of colaboradoresAtivos) {
    // ── Aniversário do colaborador ────────────────────────────
    if (c.data_nascimento) {
      const dt = new Date(c.data_nascimento + "T00:00:00");
      if (dt.getMonth() === mesAlvo) {
        const dataEvento = `${anoAlvo}-${String(mesAlvo + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        if (!jaExiste(c.id, "aniversario_colaborador", dataEvento)) {
          novasDemandas.push({
            colaborador_id: c.id,
            colaborador_nome: c.nome_completo,
            tipo_comunicado: "aniversario_colaborador",
            data_evento: dataEvento,
            descricao_evento: `${c.nome_completo} — Aniversário em ${dt.getDate()}/${mesAlvo + 1}/${anoAlvo}`,
            imagem_url: "",
            status_arte: "sem_arte",
            ano_referencia: anoAlvo,
            criado_por: criador,
          });
        }
      }
    }

    // ── Aniversário do cônjuge ────────────────────────────────
    if (c.conjuge_data_nascimento) {
      const dt = new Date(c.conjuge_data_nascimento + "T00:00:00");
      if (dt.getMonth() === mesAlvo) {
        const dataEvento = `${anoAlvo}-${String(mesAlvo + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        if (!jaExiste(c.id, "aniversario_conjuge", dataEvento)) {
          novasDemandas.push({
            colaborador_id: c.id,
            colaborador_nome: c.nome_completo,
            tipo_comunicado: "aniversario_conjuge",
            data_evento: dataEvento,
            descricao_evento: `${c.nome_completo} — Aniversário do cônjuge ${c.conjuge_nome || ""} em ${dt.getDate()}/${mesAlvo + 1}/${anoAlvo}`,
            imagem_url: "",
            status_arte: "sem_arte",
            ano_referencia: anoAlvo,
            criado_por: criador,
          });
        }
      }
    }

    // ── Filhos completando 1 ano ──────────────────────────────
    for (const filho of (c.filhos || [])) {
      if (!filho.filho_data_nascimento) continue;
      const dt = new Date(filho.filho_data_nascimento + "T00:00:00");
      const anoNasc = dt.getFullYear();
      const mesNasc = dt.getMonth();
      // Completa 1 ano: nasceu no ano anterior ao ano alvo, no mesmo mês
      if (anoNasc === anoAlvo - 1 && mesNasc === mesAlvo) {
        const dataEvento = `${anoAlvo}-${String(mesAlvo + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        if (!jaExiste(c.id, "aniversario_filho_1ano", dataEvento)) {
          novasDemandas.push({
            colaborador_id: c.id,
            colaborador_nome: c.nome_completo,
            tipo_comunicado: "aniversario_filho_1ano",
            data_evento: dataEvento,
            descricao_evento: `${c.nome_completo} — 1 aninho de ${filho.filho_nome || "filho(a)"} em ${dt.getDate()}/${mesAlvo + 1}/${anoAlvo}`,
            imagem_url: "",
            status_arte: "sem_arte",
            ano_referencia: anoAlvo,
            filho_nome: filho.filho_nome || "",
            criado_por: criador,
          });
        }
      }
    }

    // ── Tempo de empresa (marcos) ─────────────────────────────
    if (c.data_admissao) {
      const dtAdm = new Date(c.data_admissao + "T00:00:00");
      const mesAdm = dtAdm.getMonth();
      if (mesAdm === mesAlvo) {
        const anosEmpresa = anoAlvo - dtAdm.getFullYear();
        if ([1, 2, 3, 5, 10, 15, 20].includes(anosEmpresa)) {
          const dataEvento = `${anoAlvo}-${String(mesAlvo + 1).padStart(2, "0")}-${String(dtAdm.getDate()).padStart(2, "0")}`;
          if (!jaExiste(c.id, "tempo_empresa", dataEvento)) {
            novasDemandas.push({
              colaborador_id: c.id,
              colaborador_nome: c.nome_completo,
              tipo_comunicado: "tempo_empresa",
              data_evento: dataEvento,
              descricao_evento: `${c.nome_completo} — ${anosEmpresa} ano${anosEmpresa > 1 ? "s" : ""} de empresa em ${dtAdm.getDate()}/${mesAlvo + 1}/${anoAlvo}`,
              imagem_url: "",
              status_arte: "sem_arte",
              ano_referencia: anoAlvo,
              anos_empresa: anosEmpresa,
              criado_por: criador,
            });
          }
        }
      }
    }
  }

  // Criar demandas em batch
  let criadas = 0;
  for (const d of novasDemandas) {
    await base44.asServiceRole.entities.Comunicados_Artes.create(d);
    criadas++;
  }

  const jaExistiam = demandasExistentes.filter(d => d.ano_referencia === anoAlvo).length;

  return Response.json({
    ok: true,
    mes_gerado: `${String(mesAlvo + 1).padStart(2, "0")}/${anoAlvo}`,
    criadas,
    ja_existiam: jaExistiam,
    total_colaboradores: colaboradoresAtivos.length,
    msg: `${criadas} demanda${criadas !== 1 ? "s" : ""} criada${criadas !== 1 ? "s" : ""} para ${String(mesAlvo + 1).padStart(2, "0")}/${anoAlvo}. ${jaExistiam} já existiam.`,
  });
});