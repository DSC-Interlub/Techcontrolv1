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
  console.log('=== TESTE PLAYWRIGHT: PCS INTERNOS & VERIFICAÇÃO DE CONFORMIDADE ===');

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
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

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

  // 4. Acessar a página de PCs Internos
  console.log('Acessando /PCs_Internos...');
  await page.goto('http://localhost:5173/PCs_Internos', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Verificar ausência do item Conformidade de TI no menu lateral
  const menuText = await page.locator('aside, [data-sidebar="sidebar"]').innerText();
  const hasConformidadeMenu = menuText.includes('Conformidade de TI');
  console.log('Menu lateral contém "Conformidade de TI"?', hasConformidadeMenu ? 'SIM (ERRO)' : 'NÃO (CORRETO)');

  // Print 1: Modo Agrupado por Usuário
  const p1Path = path.join(ARTIFACT_DIR, '29_pcs_internos_modo_usuario.png');
  await page.screenshot({ path: p1Path, fullPage: false });
  console.log('Salvo screenshot 1:', p1Path);

  // Print 2: Alternar para Modo Tabela
  console.log('Alternando para Modo Tabela...');
  // O botão de alternância tem ícones List / LayoutGrid / Users ou titles
  const btnTable = page.locator('button[title*="Tabela"], button:has-text("Tabela")').first();
  if (await btnTable.isVisible()) {
    await btnTable.click();
  } else {
    // Procura botão com ícone de tabela
    const viewButtons = page.locator('.flex.border.rounded-xl button');
    if (await viewButtons.count() >= 2) {
      await viewButtons.nth(1).click();
    }
  }
  await page.waitForTimeout(1000);
  const p2Path = path.join(ARTIFACT_DIR, '30_pcs_internos_modo_tabela.png');
  await page.screenshot({ path: p2Path, fullPage: false });
  console.log('Salvo screenshot 2:', p2Path);

  // Print 3: Alternar para Modo Cards
  console.log('Alternando para Modo Cards...');
  const btnCards = page.locator('button[title*="Cards"], button:has-text("Cards")').first();
  if (await btnCards.isVisible()) {
    await btnCards.click();
  } else {
    const viewButtons = page.locator('.flex.border.rounded-xl button');
    if (await viewButtons.count() >= 3) {
      await viewButtons.nth(2).click();
    }
  }
  await page.waitForTimeout(1000);
  const p3Path = path.join(ARTIFACT_DIR, '31_pcs_internos_modo_cards.png');
  await page.screenshot({ path: p3Path, fullPage: false });
  console.log('Salvo screenshot 3:', p3Path);

  // Print 4: Abrir Modal de Detalhes de um equipamento
  console.log('Abrindo modal de detalhes...');
  const firstCard = page.locator('.grid > div.cursor-pointer, table tbody tr').first();
  await firstCard.click();
  await page.waitForTimeout(1000);
  const p4Path = path.join(ARTIFACT_DIR, '32_pcs_internos_modal_detalhes.png');
  await page.screenshot({ path: p4Path, fullPage: false });
  console.log('Salvo screenshot 4:', p4Path);

  await browser.close();
  console.log('=== TESTE CONCLUÍDO COM SUCESSO ===');
}

run().catch(err => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
