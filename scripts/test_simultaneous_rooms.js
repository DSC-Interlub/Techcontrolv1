import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  const k = parts[0];
  const v = parts.slice(1).join('=');
  if (k && v) env[k.trim()] = v.trim().replace(/^['"]|['"]$/g, '');
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testSimultaneousBookings() {
  const { data: salas, error: sErr } = await supabase.from('salas').select('*').order('nome');
  if (sErr) throw sErr;
  console.log('Salas:', salas.map(s => ({ id: s.id, nome: s.nome })));

  const sala1 = salas.find(s => s.nome.includes('Treinamento'));
  const sala2 = salas.find(s => s.nome.includes('Recepção'));

  const testDate = '2026-10-25';
  const horaInicio = '14:00';
  const horaFim = '15:00';

  // Reserva 1: Sala de Treinamento
  const { data: res1, error: err1 } = await supabase.from('reservas_sala').insert({
    sala_id: sala1.id,
    data: testDate,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    solicitante_nome: 'Teste Automação Sala 1',
    solicitante_email: 'teste.simultaneo@interlub.com',
    solicitante_area: 'TI',
    motivo: 'Teste Simultâneo Sala 1',
    status: 'Confirmada'
  }).select().single();

  if (err1) throw err1;
  console.log('Reserva 1 criada com sucesso na Sala 1:', res1.id, res1.data, res1.hora_inicio, res1.hora_fim);

  // Reserva 2: Sala de Reunião Recepção (EXATAMENTE NO MESMO DIA E HORÁRIO)
  const { data: res2, error: err2 } = await supabase.from('reservas_sala').insert({
    sala_id: sala2.id,
    data: testDate,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    solicitante_nome: 'Teste Automação Sala 2',
    solicitante_email: 'teste.simultaneo@interlub.com',
    solicitante_area: 'TI',
    motivo: 'Teste Simultâneo Sala 2',
    status: 'Confirmada'
  }).select().single();

  if (err2) throw err2;
  console.log('Reserva 2 criada com sucesso na Sala 2:', res2.id, res2.data, res2.hora_inicio, res2.hora_fim);

  // Consulta ambas simultaneamente no banco
  const { data: ambas } = await supabase.from('reservas_sala').select('id, sala_id, data, hora_inicio, hora_fim, motivo').in('id', [res1.id, res2.id]);
  console.log('Ambas as reservas coexistindo no banco:', JSON.stringify(ambas, null, 2));

  // Limpeza
  await supabase.from('reservas_sala').delete().in('id', [res1.id, res2.id]);
  console.log('Limpeza concluída com sucesso!');
}

testSimultaneousBookings().catch(console.error);
