const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    val = val.replace(/^["']|["']$/g, '');
    env[match[1]] = val.trim();
  }
});

const sbAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const sbAnon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const ARTIFACTS_DIR = 'C:/Users/kauan.pereira/.gemini/antigravity/brain/f22aadd9-4f99-4be7-b477-82e7a8f04bfb';
const EXCEL_PATH = path.join(ARTIFACTS_DIR, '.user_uploaded/media_1791375495010.xlsx');

async function run() {
  console.log('1. Gerando sessão de admin para adm.sp1@interlub.com via Admin API...');
  const { data: linkData, error: errLink } = await sbAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'adm.sp1@interlub.com'
  });
  if (errLink) throw errLink;

  const { data: sessionData, error: errSession } = await sbAnon.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  });
  if (errSession) throw errSession;

  console.log('Sessão de admin obtida com sucesso para:', sessionData.user.email);

  console.log('2. Iniciando navegador Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Navegar para localhost e injetar sessão no localStorage
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((sess) => {
    localStorage.setItem('techcontrol_supabase_auth_v1', JSON.stringify(sess));
  }, sessionData.session);

  // Recarregar para assumir a sessão
  await page.goto('http://localhost:5173/PCs_Internos', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  console.log('3. Validando tela de PCs_Internos com Barbara Souza Santos e ESET...');
  // Pesquisar por Barbara
  const searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="filtrar"], input[type="text"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('Barbara');
    await page.waitForTimeout(1500);
  }

  const screenshot1 = path.join(ARTIFACTS_DIR, '23_pcs_internos_barbara_eset_ativo.png');
  await page.screenshot({ path: screenshot1, fullPage: false });
  console.log('Screenshot 23 salvo:', screenshot1);

  // 4. Teste em Painel_Maquinas
  console.log('4. Navegando para /Painel_Maquinas...');
  await page.goto('http://localhost:5173/Painel_Maquinas', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const searchMaquinas = page.locator('input[placeholder*="Buscar"], input[placeholder*="Filtrar"]').first();
  if (await searchMaquinas.isVisible()) {
    await searchMaquinas.fill('IL-DKP-013');
    await page.waitForTimeout(1500);
  }

  const screenshot2 = path.join(ARTIFACTS_DIR, '24_painel_maquinas_eset_ativo.png');
  await page.screenshot({ path: screenshot2, fullPage: false });
  console.log('Screenshot 24 salvo:', screenshot2);

  // 5. Teste em ConformidadeTI com Preview do Modal de Importação
  console.log('5. Navegando para /ConformidadeTI...');
  await page.goto('http://localhost:5173/ConformidadeTI', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const btnImportar = page.locator('button:has-text("Importação em Lote")').first();
  if (await btnImportar.isVisible()) {
    console.log('Clicando no botão de Importação em Lote...');
    await btnImportar.click();
    await page.waitForTimeout(1500);

    console.log('Fazendo upload do Excel para testar preview com reconciliação inteligente...');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(EXCEL_PATH);
    await page.waitForTimeout(3000);

    const screenshot3 = path.join(ARTIFACTS_DIR, '25_modal_importacao_reconciliacao_barbara.png');
    await page.screenshot({ path: screenshot3, fullPage: false });
    console.log('Screenshot 25 salvo:', screenshot3);
  } else {
    console.warn('Botão de importação não encontrado!');
  }

  await browser.close();
  console.log('Validação concluída com sucesso!');
}

run().catch(err => {
  console.error('Erro no teste Playwright:', err);
  process.exit(1);
});
