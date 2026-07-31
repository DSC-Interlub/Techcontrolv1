const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://oskuejukhcnuhvcivcsr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9za3VlanVraGNudWh2Y2l2Y3NyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU0ODM1OSwiZXhwIjoyMTAwMTI0MzU5fQ.bXGcU5D4OVOqK-bmYWOGK14xlzu0c_MY52Noyf1rvr8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function extrairAnyDeskDaString(str) {
  if (!str || typeof str !== 'string') return '';
  const match = str.match(/AnyDesk:\s*([^|;\n\r]+)/i);
  return match ? match[1].trim() : '';
}

async function main() {
  console.log("=== VERIFICANDO E SINCRONIZANDO ANYDESK DE AVALIAÇÕES PARA EQUIPAMENTOS ===");

  // 1. Buscar todas as avaliações
  const { data: avaliacoes, error: errAv } = await supabase.from('avaliacoes').select('*');
  if (errAv) {
    console.error("Erro ao buscar avaliações:", errAv);
    return;
  }
  console.log(`Encontradas ${avaliacoes?.length || 0} avaliações.`);

  // 2. Buscar pcs_internos e notebooks_externos
  const { data: pcs, error: errPcs } = await supabase.from('pcs_internos').select('*');
  const { data: nbs, error: errNbs } = await supabase.from('notebooks_externos').select('*');

  console.log(`Encontrados ${pcs?.length || 0} PCs e ${nbs?.length || 0} Notebooks Externos.`);

  // Procurar IL-DKP-022 especificamente para logar
  const pcIL = pcs?.find(p => p.etiqueta_interna === 'IL-DKP-022' || (p.observacoes && p.observacoes.includes('IL-DKP-022')));
  console.log("Status atual da máquina IL-DKP-022:", pcIL ? { id: pcIL.id, etiqueta: pcIL.etiqueta_interna, observacoes: pcIL.observacoes } : "Não encontrada pelo filtro direto");

  let atualizados = 0;

  // Percorrer cada avaliação para extrair AnyDesk e sincronizar com a máquina
  for (const av of (avaliacoes || [])) {
    const anydeskNaAv = extrairAnyDeskDaString(av.versao_windows) || extrairAnyDeskDaString(av.observacoes);
    if (!anydeskNaAv) continue;

    const eqId = av.equipamento_id;
    if (!eqId) continue;

    // Tentar achar no pcs_internos
    const pc = pcs?.find(p => p.id === eqId);
    if (pc) {
      const anydeskAtual = extrairAnyDeskDaString(pc.observacoes);
      if (!anydeskAtual || anydeskAtual !== anydeskNaAv) {
        console.log(`Atualizando PC ${pc.etiqueta_interna || pc.id} com AnyDesk: ${anydeskNaAv}`);
        let obsNova = pc.observacoes || "";
        if (!obsNova.toLowerCase().includes("anydesk:")) {
          obsNova = obsNova ? `AnyDesk: ${anydeskNaAv} | ${obsNova}` : `AnyDesk: ${anydeskNaAv}`;
        } else {
          obsNova = obsNova.replace(/AnyDesk:\s*([^|;\n\r]+)/i, `AnyDesk: ${anydeskNaAv}`);
        }

        const { error: errUp } = await supabase
          .from('pcs_internos')
          .update({ observacoes: obsNova })
          .eq('id', pc.id);

        if (errUp) console.error(`Erro ao atualizar PC ${pc.id}:`, errUp);
        else atualizados++;
      }
    }

    // Tentar achar no notebooks_externos
    const nb = nbs?.find(n => n.id === eqId);
    if (nb) {
      const anydeskAtual = extrairAnyDeskDaString(nb.observacoes);
      if (!anydeskAtual || anydeskAtual !== anydeskNaAv) {
        console.log(`Atualizando Notebook ${nb.etiqueta_interna || nb.id} com AnyDesk: ${anydeskNaAv}`);
        let obsNova = nb.observacoes || "";
        if (!obsNova.toLowerCase().includes("anydesk:")) {
          obsNova = obsNova ? `AnyDesk: ${anydeskNaAv} | ${obsNova}` : `AnyDesk: ${anydeskNaAv}`;
        } else {
          obsNova = obsNova.replace(/AnyDesk:\s*([^|;\n\r]+)/i, `AnyDesk: ${anydeskNaAv}`);
        }

        const { error: errUp } = await supabase
          .from('notebooks_externos')
          .update({ observacoes: obsNova })
          .eq('id', nb.id);

        if (errUp) console.error(`Erro ao atualizar Notebook ${nb.id}:`, errUp);
        else atualizados++;
      }
    }
  }

  console.log(`=== SINCRONIZAÇÃO CONCLUÍDA: ${atualizados} equipamentos atualizados. ===`);
}

main();
