/**
 * SCRIPT DE MIGRAÇÃO — Executar UMA ÚNICA VEZ.
 *
 * Marca comunicado_boas_vindas_enviado = true para todos os colaboradores
 * com data_admissao anterior a 30 dias atrás que ainda têm o campo false.
 *
 * Isso evita que a automação diária de enviarBoasVindas (modo automático,
 * restrito a admissões dos últimos 7 dias) trate colaboradores antigos como
 * "pendentes" na fila — o que geraria spam em massa caso o filtro seja removido.
 *
 * Após rodar, desative ou delete esta função via painel Base44.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Apenas admin pode executar
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Apenas admin pode executar esta migração." }, { status: 403 });
  }

  const limiteData = new Date();
  limiteData.setDate(limiteData.getDate() - 30);
  const limiteDateStr = limiteData.toISOString().split("T")[0];

  // Buscar todos com comunicado_boas_vindas_enviado = false
  const pendentes = await base44.asServiceRole.entities.Colaboradores.filter({
    comunicado_boas_vindas_enviado: false,
  });

  // Filtrar apenas os antigos (admissão anterior a 30 dias)
  const antigos = pendentes.filter(c => !c.data_admissao || c.data_admissao < limiteDateStr);

  console.log(`[migrarBoasVindasAntigos] Total pendentes: ${pendentes.length}, antigos a migrar: ${antigos.length}`);

  let atualizados = 0;
  for (const colab of antigos) {
    await base44.asServiceRole.entities.Colaboradores.update(colab.id, {
      comunicado_boas_vindas_enviado: true,
    });
    atualizados++;
    console.log(`[migrarBoasVindasAntigos] Marcado: ${colab.nome_completo} (admissão: ${colab.data_admissao || "sem data"})`);
  }

  return Response.json({
    ok: true,
    total_pendentes: pendentes.length,
    antigos_migrados: atualizados,
    msg: `Migração concluída. ${atualizados} colaborador(es) marcado(s) como boas_vindas_enviado = true sem envio de e-mail.`,
  });
});