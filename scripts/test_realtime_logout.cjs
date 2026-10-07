const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
const supabase = createClient(url, key);

async function testRealtimeLogout() {
  console.log('1. Buscando ou criando colaborador para teste de logout...');
  let { data: colabs } = await supabase.from('colaboradores').select('*').eq('email', 'teste_realtime_logout@interlub.com');
  let colab = colabs?.[0];
  if (!colab) {
    const { data: novo, error } = await supabase.from('colaboradores').insert([{
      nome_completo: 'Teste Realtime Logout',
      email: 'teste_realtime_logout@interlub.com',
      senha_portal: '123456',
      status: 'Ativo',
      acesso_portal_bloqueado: false,
      area: 'TI'
    }]).select().single();
    if (error) throw error;
    colab = novo;
  } else {
    await supabase.from('colaboradores').update({ status: 'Ativo', acesso_portal_bloqueado: false }).eq('id', colab.id);
  }

  console.log('Colaborador de teste pronto:', colab.id, colab.nome_completo);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Login via sessionStorage
  await page.goto('http://localhost:5173/portal-login');
  await page.evaluate((c) => {
    sessionStorage.setItem('portal_colaborador', JSON.stringify({
      id: c.id,
      nome_completo: c.nome_completo,
      email: c.email,
      area: c.area,
      tipo_funcionario: 'CLT',
      eh_comprador: false,
      eh_facilities: false,
      eh_comunicacao_branding: false,
      eh_conexao_humana: false,
      permissoes_comunicados: []
    }));
  }, colab);

  console.log('2. Navegando para /portal...');
  await page.goto('http://localhost:5173/portal');
  await page.waitForTimeout(2000);
  console.log('URL atual:', page.url());
  await page.screenshot({ path: 'C:/Users/kauan.pereira/.gemini/antigravity/brain/f22aadd9-4f99-4be7-b477-82e7a8f04bfb/17_portal_antes_desligamento.png' });

  console.log('3. Disparando UPDATE no banco: status = Desligado, acesso_portal_bloqueado = true...');
  const { error: updErr } = await supabase.from('colaboradores').update({
    status: 'Desligado',
    acesso_portal_bloqueado: true
  }).eq('id', colab.id);
  if (updErr) throw updErr;

  console.log('4. Aguardando reação automática em tempo real do portal (max 8s)...');
  const start = Date.now();
  let redirected = false;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(500);
    const currUrl = page.url();
    if (currUrl.includes('portal-login')) {
      redirected = true;
      const elapsed = Date.now() - start;
      console.log('Sucesso! Redirecionado para portal-login em ' + elapsed + 'ms! URL: ' + currUrl);
      break;
    }
  }

  await page.screenshot({ path: 'C:/Users/kauan.pereira/.gemini/antigravity/brain/f22aadd9-4f99-4be7-b477-82e7a8f04bfb/18_portal_apos_desligamento_autologout.png' });

  const sessionStored = await page.evaluate(() => sessionStorage.getItem('portal_colaborador'));
  console.log('sessionStorage apos autologout:', sessionStored);

  await browser.close();
  console.log('Resultado Final:', redirected && !sessionStored ? 'APROVADO' : 'REPROVADO');
}

testRealtimeLogout().catch(console.error);
