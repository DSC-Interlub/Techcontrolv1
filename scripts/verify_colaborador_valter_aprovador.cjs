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
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'adm.sp1@interlub.com'
  });

  const { data: sessionData } = await supabaseAdmin.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  });

  const session = sessionData.session;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

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
  await page.goto('http://localhost:5173/Colaboradores', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const firstRow = page.locator('table tbody tr').first();
  await firstRow.click();
  await page.waitForTimeout(1000);

  // Clicar na aba Aprovador Compras
  const abaAprovador = page.locator('button:has-text("Aprovador Compras")');
  await abaAprovador.click();
  await page.waitForTimeout(800);

  const pPath = path.join(ARTIFACT_DIR, '35_colaborador_aba_aprovador_valter.png');
  await page.screenshot({ path: pPath });
  console.log('Screenshot salva:', pPath);

  await browser.close();
}

run().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
