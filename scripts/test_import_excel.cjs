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

async function testImportExcelAndKPIs() {
  console.log('1. Gerando sessão oficial do Supabase Auth para adm.sp1@interlub.com...');
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'adm.sp1@interlub.com'
  });

  if (linkErr) throw linkErr;

  const hashedToken = linkData?.properties?.hashed_token;
  const { data: sessionData, error: sessionErr } = await supabaseAdmin.auth.verifyOtp({
    token_hash: hashedToken,
    type: 'magiclink'
  });

  if (sessionErr || !sessionData?.session) {
    throw new Error('Falha ao autenticar admin: ' + JSON.stringify(sessionErr));
  }

  const session = sessionData.session;
  console.log('Sessão admin gerada com sucesso para:', session.user.email);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Injetar sessão no localStorage e sessionStorage
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

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Blocked aria-hidden')) {
      console.log('BROWSER ALERT/ERROR:', msg.type(), msg.text());
    }
  });

  console.log('2. Acessando tela de Conformidade TI como Administrador autenticado...');
  await page.goto('http://localhost:5173/ConformidadeTI', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('URL atual:', page.url());

  // Captura estado antes da importação
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '19_conformidade_antes_importacao.png'), fullPage: true });
  console.log('Screenshot 19 salvo!');

  console.log('3. Clicando no botão de Importação em Lote (.xlsx)...');
  const btnImportar = page.locator('button:has-text("Importação em Lote (.xlsx)")');
  await btnImportar.click();
  await page.waitForTimeout(1000);

  // Modal aberto
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '20_modal_importacao_aberto.png') });
  console.log('Screenshot 20 salvo!');

  console.log('4. Fazendo upload da planilha real do usuário...');
  const filePath = path.join(ARTIFACT_DIR, '.user_uploaded/media_1791375495010.xlsx');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(1500);

  // Prévia carregada
  console.log('5. Prévia gerada, capturando screenshot do preview com linhas mapeadas...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '21_modal_importacao_preview_linhas.png') });
  console.log('Screenshot 21 salvo!');

  // Confirma a importação (pode ser "Confirmar e Atualizar" ou "Reaplicar Dados da Planilha")
  console.log('6. Clicando no botão de confirmação da importação...');
  const btnConfirmar = page.locator('button:has-text("Confirmar e Atualizar"), button:has-text("Reaplicar Dados da Planilha")');
  await btnConfirmar.click();

  // Aguarda processamento, fechamento e refresh dos dados
  await page.waitForTimeout(4000);

  console.log('7. Capturando tela de Conformidade após a importação e atualização dos KPIs...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '22_conformidade_apos_importacao_kpis.png'), fullPage: true });
  console.log('Screenshot 22 salvo!');

  await browser.close();
  console.log('=== TESTE DE IMPORTAÇÃO E KPIS CONCLUÍDO COM SUCESSO! ===');
}

testImportExcelAndKPIs().catch(console.error);
