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
  const { data: linkData } = await sbAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'adm.sp1@interlub.com'
  });

  const { data: sessionData } = await sbAnon.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((sess) => {
    localStorage.setItem('techcontrol_supabase_auth_v1', JSON.stringify(sess));
  }, sessionData.session);

  await page.goto('http://localhost:5173/ConformidadeTI', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const btnImportar = page.locator('button:has-text("Importação em Lote")').first();
  await btnImportar.click();
  await page.waitForTimeout(1000);

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(EXCEL_PATH);
  await page.waitForTimeout(2000);

  // Scroll dentro do container da tabela do modal para a linha de Barbara
  const scrollContainer = page.locator('div.max-h-\\[350px\\]');
  await scrollContainer.evaluate(el => el.scrollTop = 1550);
  await page.waitForTimeout(1000);

  const screenshot = path.join(ARTIFACTS_DIR, '26_modal_importacao_barbara_reconciliada.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  console.log('Screenshot 26 salvo:', screenshot);

  await browser.close();
}

run();
