const fs = require('fs');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const XLSX = require('xlsx');

const ARTIFACT_DIR = 'C:/Users/kauan.pereira/.gemini/antigravity/brain/f22aadd9-4f99-4be7-b477-82e7a8f04bfb';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
  const p = l.split('=');
  if (p.length >= 2) env[p[0].trim()] = p.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabaseAdmin = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('=== TESTE PLAYWRIGHT: EXPORTAÇÃO EXCEL EM PCS INTERNOS ===');

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
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    acceptDownloads: true
  });

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

  console.log('Acessando /PCs_Internos...');
  await page.goto('http://localhost:5173/PCs_Internos', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Abrir o menu de exportação
  console.log('Clicando no botão de Exportar Excel...');
  const btnExport = page.locator('button:has-text("Exportar Excel")');
  await btnExport.click();
  await page.waitForTimeout(500);

  // Configurar listener para download
  const downloadPromise = page.waitForEvent('download');
  const optExportAll = page.locator('[role="menuitem"]:has-text("Exportar Todos")');
  await optExportAll.click();

  const download = await downloadPromise;
  const downloadPath = path.join(ARTIFACT_DIR, 'relatorio_pcs_internos_teste.xlsx');
  await download.saveAs(downloadPath);
  console.log('Arquivo Excel salvo em:', downloadPath);

  // Inspecionar o Excel baixado
  const workbook = XLSX.readFile(downloadPath);
  console.log('Abas encontradas no Excel:', workbook.SheetNames);

  const sheetTodos = workbook.Sheets[workbook.SheetNames[0]];
  const dataTodos = XLSX.utils.sheet_to_json(sheetTodos);

  console.log(`Total de linhas na aba "${workbook.SheetNames[0]}":`, dataTodos.length);
  if (dataTodos.length > 0) {
    const primeiraLinha = dataTodos[0];
    console.log('Colunas presentes no Excel:');
    console.log(Object.keys(primeiraLinha));

    console.log('\n--- Exemplo de Linha Exportada (Campos de Vida Útil e Formatação) ---');
    console.log({
      Tipo: primeiraLinha['Tipo'],
      MarcaModelo: `${primeiraLinha['Marca']} ${primeiraLinha['Modelo']}`,
      DataAquisicao: primeiraLinha['Data de Aquisição'],
      VidaUtilStatus: primeiraLinha['Vida Útil (5 anos) - Status'],
      VidaUtilVencimento: primeiraLinha['Vida Útil - Vencimento (5 anos)'],
      VidaUtilTempo: primeiraLinha['Vida Útil - Tempo Restante/Vencido'],
      UltimaFormatacaoData: primeiraLinha['Última Formatação (Data)'],
      FormatacaoStatus: primeiraLinha['Formatação (Ciclo 30m) - Status'],
      FormatacaoVencimento: primeiraLinha['Próxima Formatação - Vencimento (30m)'],
      FormatacaoTempo: primeiraLinha['Formatação - Tempo Restante/Vencido']
    });

    // Validar se as colunas obrigatórias existem
    const colsEsperadas = [
      'Vida Útil (5 anos) - Status',
      'Vida Útil - Vencimento (5 anos)',
      'Vida Útil - Tempo Restante/Vencido',
      'Última Formatação (Data)',
      'Formatação (Ciclo 30m) - Status',
      'Próxima Formatação - Vencimento (30m)',
      'Formatação - Tempo Restante/Vencido'
    ];

    for (const c of colsEsperadas) {
      if (!(c in primeiraLinha)) {
        throw new Error(`Coluna obrigatória ausente no Excel: "${c}"`);
      }
    }
    console.log('\nTODAS as colunas de Vida Útil e Formatação estão 100% presentes no arquivo Excel!');
  }

  // Verificar aba de Resumo por Usuário
  if (workbook.SheetNames.includes('Resumo por Usuário')) {
    const sheetResumo = workbook.Sheets['Resumo por Usuário'];
    const dataResumo = XLSX.utils.sheet_to_json(sheetResumo);
    if (dataResumo.length > 0) {
      console.log('\n--- Exemplo da aba "Resumo por Usuário" ---');
      console.log(dataResumo[0]);
    }
  }

  // Tirar print do dropdown aberto para registro visual
  await btnExport.click();
  await page.waitForTimeout(500);
  const pPath = path.join(ARTIFACT_DIR, '33_pcs_internos_exportacao_excel.png');
  await page.screenshot({ path: pPath });
  console.log('Salvo screenshot:', pPath);

  await browser.close();
  console.log('=== TESTE CONCLUÍDO COM SUCESSO ===');
}

run().catch(err => {
  console.error('Erro no teste de exportação:', err);
  process.exit(1);
});
