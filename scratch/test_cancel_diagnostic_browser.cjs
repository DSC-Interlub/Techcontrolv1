const { chromium } = require('c:/techcontrol/Techcontrolv1-main/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/kauan.pereira/.gemini/antigravity/brain/f22aadd9-4f99-4be7-b477-82e7a8f04bfb';

async function run() {
  console.log('=== TESTE DE HOMOLOGAÇÃO: DIAGNÓSTICO DO BUG DE CANCELAMENTO ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Colaborador real: Elder de Almeida Amorim (operacoes@interlub.com)
  const mockColab = {
    id: '57016840-78b4-4e42-be5e-f06fc9a4289d',
    nome_completo: 'Elder de Almeida Amorim',
    email: 'operacoes@interlub.com',
    area: 'Operações',
    tipo_funcionario: 'Interno',
    status: 'Ativo',
    eh_facilities: true,
    eh_comprador: false
  };

  await context.addInitScript(({ colab }) => {
    window.sessionStorage.setItem('portal_colaborador', JSON.stringify(colab));
  }, { colab: mockColab });

  const page = await context.newPage();

  const networkLogs = [];
  page.on('request', req => {
    if (req.url().includes('/rest/v1/reservas')) {
      networkLogs.push({
        method: req.method(),
        url: req.url(),
        postData: req.postData()
      });
      console.log(`[NETWORK REQ] ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', async resp => {
    if (resp.url().includes('/rest/v1/reservas')) {
      let body = '';
      try { body = await resp.text(); } catch(e) {}
      networkLogs.push({
        status: resp.status(),
        url: resp.url(),
        body: body
      });
      console.log(`[NETWORK RESP] ${resp.status()} ${resp.url()} -> Body: ${body}`);
    }
  });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // 1. Criar uma nova reserva na Sala de Treinamento
  console.log('\n1. Navegando para /portal-sala e criando reserva...');
  await page.goto('http://localhost:5173/portal-sala', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Clicar em um slot disponível (ex: Quarta-feira 12:00)
  // Encontrar célula clicável
  const slots = await page.$$('div[class*="hover:bg-teal-50 cursor-pointer"]');
  if (slots.length > 0) {
    console.log('Slots disponíveis encontrados:', slots.length);
    await slots[0].click();
    await page.waitForTimeout(1000);

    // Preencher formulário de reserva
    const pautaInput = await page.locator('textarea[placeholder*="Objetivo da reunião"]');
    if (await pautaInput.isVisible()) {
      await pautaInput.fill('Alinhamento Operacional Teste Cancelamento');
      const submitBtn = await page.locator('button:has-text("Confirmar Reserva")');
      await submitBtn.click();
      await page.waitForTimeout(2500);
      console.log('Reserva criada com sucesso!');
    }
  }

  // 2. Ir na aba "Minhas Reservas"
  console.log('\n2. Abrindo aba Minhas Reservas...');
  const tabMinhas = await page.locator('button[role="tab"]:has-text("Minhas Reservas")');
  await tabMinhas.click();
  await page.waitForTimeout(1500);

  const shotMinhas = path.join(ARTIFACT_DIR, '01_portal_sala_tentativa_cancelamento.png');
  await page.screenshot({ path: shotMinhas, fullPage: true });

  // 3. Tentar cancelar a reserva recém criada
  const btnCancelar = await page.locator('button:has-text("Cancelar")').first();
  if (await btnCancelar.isVisible()) {
    console.log('3. Clicando no botão Cancelar da reserva...');
    await btnCancelar.click();
    await page.waitForTimeout(1500);

    // Capturar a tela com o erro/toast exibido
    const shotErro = path.join(ARTIFACT_DIR, '02_portal_sala_erro_cancelamento_toast.png');
    await page.screenshot({ path: shotErro, fullPage: false });
    console.log('Screenshot com toast de feedback capturado!');
  }

  // Salvar logs de rede
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'network_cancel_diagnostic.json'), JSON.stringify(networkLogs, null, 2));

  await browser.close();
  console.log('=== TESTE CONCLUÍDO ===');
}

run().catch(e => {
  console.error('Erro no teste:', e);
  process.exit(1);
});
