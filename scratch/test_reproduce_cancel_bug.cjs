const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://oskuejukhcnuhvcivcsr.supabase.co';
// Anon key used in the portal
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9za3VlanVraGNudWh2Y2l2Y3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NDgzNTksImV4cCI6MjEwMDEyNDM1OX0.HHy0JPVn0VHjzQ7B8ildXWiNzgnVF_xD0QE2D4ulndU';

const supabaseAnon = createClient(url, anonKey);

async function testCancelFlow() {
  console.log('=== TESTE DE REPRODUÇÃO DO BUG DE CANCELAMENTO VIA ANON (PORTAL) ===');
  
  // 1. Testar UPDATE em reservas_sala com status 'Confirmada'
  console.log('\n--- Teste 1: Tentando cancelar uma reserva de sala (status Confirmada) como anon ---');
  // Buscar uma reserva confirmada existente
  const { data: reservasSala, error: errSelectSala } = await supabaseAnon
    .from('reservas_sala')
    .select('id, solicitante_nome, solicitante_email, status, data')
    .eq('status', 'Confirmada')
    .limit(1);

  console.log('Reserva de sala selecionada:', reservasSala, errSelectSala);

  if (reservasSala && reservasSala.length > 0) {
    const rSala = reservasSala[0];
    console.log(`Tentando UPDATE status = 'Cancelada' no id ${rSala.id} via anon...`);
    const { data: updatedSala, error: errUpdateSala } = await supabaseAnon
      .from('reservas_sala')
      .update({ status: 'Cancelada' })
      .eq('id', rSala.id)
      .select();

    console.log('Resultado do UPDATE sala:', { updatedSala, error: errUpdateSala });
    if (!errUpdateSala && (!updatedSala || updatedSala.length === 0)) {
      console.log('🚨 FALHA SILENCIOSA IDENTIFICADA! O UPDATE retornou 0 linhas afetadas devido à policy RLS: qual = (status = "Pendente") enquanto a reserva está "Confirmada"!');
    }
  }

  // 2. Testar UPDATE em reservas (notebooks) com status 'Confirmada'
  console.log('\n--- Teste 2: Tentando cancelar uma reserva de notebook (status Confirmada) como anon ---');
  const { data: reservasNb, error: errSelectNb } = await supabaseAnon
    .from('reservas')
    .select('id, solicitante_nome, solicitante_email, status')
    .eq('status', 'Confirmada')
    .limit(1);

  console.log('Reserva de notebook selecionada:', reservasNb, errSelectNb);
  if (reservasNb && reservasNb.length > 0) {
    const rNb = reservasNb[0];
    const { data: updatedNb, error: errUpdateNb } = await supabaseAnon
      .from('reservas')
      .update({ status: 'Cancelada' })
      .eq('id', rNb.id)
      .select();

    console.log('Resultado do UPDATE notebook Confirmada:', { updatedNb, error: errUpdateNb });
    if (!errUpdateNb && (!updatedNb || updatedNb.length === 0)) {
      console.log('🚨 FALHA SILENCIOSA IDENTIFICADA EM NOTEBOOK! RLS bloqueia UPDATE em reservas com status "Confirmada"!');
    }
  }

  // 3. Testar se o email tem problemas de case / espaços
  console.log('\n--- Teste 3: Verificando disparidade de casing / espaços entre solicitante_email e colaboradores.email ---');
  const { data: colabsComEspacos } = await supabaseAnon
    .from('colaboradores')
    .select('id, nome_completo, email')
    .ilike('email', '% %');
  console.log('Colaboradores com espaços no email:', colabsComEspacos);
}

testCancelFlow().catch(console.error);
