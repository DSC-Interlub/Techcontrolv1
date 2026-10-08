const fs = require('fs');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/kauan.pereira/.gemini/antigravity/brain/f22aadd9-4f99-4be7-b477-82e7a8f04bfb';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
  const p = l.split('=');
  if (p.length >= 2) env[p[0].trim()] = p.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabaseAdmin = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('=== TESTE PLAYWRIGHT: INJETANDO SESSAO ADMIN VÁLIDA ===');

  // 1. Obter hashed token do admin
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'adm.sp1@interlub.com'
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error('Falha ao gerar magic link: ' + (linkErr?.message || 'Token vazio'));
  }

  // 2. Trocar token por uma sessão autêntica
  const { data: sessionData, error: sessionErr } = await supabaseAdmin.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  });

  if (sessionErr || !sessionData?.session) {
    throw new Error('Falha no verifyOtp: ' + sessionErr?.message);
  }

  const session = sessionData.session;
  console.log('Sessão Supabase Auth obtida para:', session.user.email);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 3. Injetar a sessão no localStorage antes do carregamento da página
  await context.addInitScript(({ sessionObj }) => {
    window.localStorage.setItem('techcontrol_supabase_auth_v1', JSON.stringify(sessionObj));
    const baseUser = {
      id: sessionObj.user.id,
      email: sessionObj.user.email,
      role: 'admin',
      name: 'Administrador TechControl'
    };
    window.sessionStorage.setItem('techcontrol_user_cache', JSON.stringify(baseUser));
  }, { sessionObj: session });

  const page = await context.newPage();

  // 4. Acessar a página de Conformidade de TI
  console.log('Acessando /ConformidadeTI autenticado...');
  await page.goto('http://localhost:5173/ConformidadeTI', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 5. Capturar screenshot da aba Desktops & Notebooks
  const shotAbaComputadores = path.join(ARTIFACT_DIR, '27_conformidade_aba_computadores.png');
  await page.screenshot({ path: shotAbaComputadores, fullPage: true });
  console.log('Screenshot 27 salvo:', shotAbaComputadores);

  // 6. Clicar na aba Monitores
  console.log('Clicando na aba Monitores...');
  const triggerMonitores = page.locator('button[role="tab"]:has-text("Monitores")');
  await triggerMonitores.click();
  await page.waitForTimeout(1500);

  // 7. Capturar screenshot da aba Monitores
  const shotAbaMonitores = path.join(ARTIFACT_DIR, '28_conformidade_aba_monitores.png');
  await page.screenshot({ path: shotAbaMonitores, fullPage: true });
  console.log('Screenshot 28 salvo:', shotAbaMonitores);

  // 8. Validar cabeçalhos da tabela na aba Monitores
  const colunasMonitores = await page.locator('table thead th').allInnerTexts();
  console.log('Colunas presentes na aba Monitores:', colunasMonitores);

  const temAntivirus = colunasMonitores.some(c => c.toLowerCase().includes('antivírus') || c.toLowerCase().includes('antivirus'));
  const temAnydesk = colunasMonitores.some(c => c.toLowerCase().includes('anydesk'));
  const temFormatacao = colunasMonitores.some(c => c.toLowerCase().includes('formatação') || c.toLowerCase().includes('formatacao'));

  console.log('--- RELATÓRIO DE CONFORMIDADE DE MONITORES ---');
  console.log('Coluna Antivírus presente?:', temAntivirus ? 'SIM (ERRO)' : 'NÃO (CORRETO)');
  console.log('Coluna AnyDesk presente?:', temAnydesk ? 'SIM (ERRO)' : 'NÃO (CORRETO)');
  console.log('Coluna Formatação presente?:', temFormatacao ? 'SIM (ERRO)' : 'NÃO (CORRETO)');

  await browser.close();

  if (temAntivirus || temAnydesk || temFormatacao) {
    throw new Error('A aba de monitores não deveria exibir antivírus, anydesk ou formatação!');
  }

  console.log('=== TESTE FINALIZADO COM SUCESSO ABSOLUTO! ===');
}

run().catch(err => {
  console.error('Falha no teste:', err);
  process.exit(1);
});
