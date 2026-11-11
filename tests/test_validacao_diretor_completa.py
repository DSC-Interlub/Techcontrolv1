import os
import sys
import json
import time
import http.server
import threading

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\kauan.pereira\.gemini\antigravity\brain\f22aadd9-4f99-4be7-b477-82e7a8f04bfb"

MOCK_COLABORADOR = {
    "id": "colab-valter-torres",
    "nome_completo": "Valter Alves Torres",
    "email": "vtorres@interlub.com",
    "cargo": "Diretor Geral",
    "area": "Diretoria",
    "status": "Ativo",
    "eh_comprador": False,
    "is_aprovador": True
}

INITIAL_REQUISICOES = [
    {
        "id": "req-final-001",
        "numero_requisicao": "REQ-2026-101",
        "item": "Dell Optiplex 7090 i7 32GB RAM",
        "quantidade": 2,
        "valor_estimado": 12800.00,
        "valor_teto": 12800.00,
        "valor_aprovado": 11950.00,
        "status": "Aguardando Aprovação Final",
        "urgencia": "Alta",
        "centro_custo": "TI / Operações",
        "finalidade": "Workstations para os novos analistas de infraestrutura.",
        "colaborador_id": "colab-ti-01",
        "colaborador_nome": "Carlos TI",
        "colaborador_area": "TI",
        "token_aprovacao": "tok-final-101",
        "cotacao_fornecedor": "Dell Computadores do Brasil",
        "created_date": "2026-11-10T10:00:00Z"
    },
    {
        "id": "req-diretor-002",
        "numero_requisicao": "REQ-2026-102",
        "item": "Cadeira Ergonômica NR17 Premium",
        "quantidade": 10,
        "valor_estimado": 8500.00,
        "valor_teto": 8500.00,
        "status": "Aguardando Diretor",
        "urgencia": "Média",
        "centro_custo": "Administrativo",
        "finalidade": "Substituição das cadeiras da equipe de atendimento.",
        "colaborador_id": "colab-adm-02",
        "colaborador_nome": "Ana Administrativo",
        "colaborador_area": "Administração",
        "token_aprovacao": "tok-diretor-102",
        "created_date": "2026-11-10T11:00:00Z"
    }
]

# Variáveis compartilhadas com o MockServer HTTP
delay_seconds = 0
should_fail = False

class MockHttpHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        global delay_seconds, should_fail
        print(f"  [MockServer-Thread] Recebeu POST, aplicando delay={delay_seconds}s, fail={should_fail}")
        if delay_seconds > 0:
            time.sleep(delay_seconds)
        if should_fail:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Erro simulado 500 do servidor ao processar ação"}).encode())
        else:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "Operação concluída com sucesso"}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def log_message(self, format, *args):
        pass

def start_mock_server():
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 8009), MockHttpHandler)
    server.serve_forever()

def run_tests():
    global delay_seconds, should_fail
    requisicoes_db = [dict(r) for r in INITIAL_REQUISICOES]

    # Inicia o servidor mock em background thread
    server_thread = threading.Thread(target=start_mock_server, daemon=True)
    server_thread.start()
    time.sleep(0.3)

    with sync_playwright() as p:
        print("[SETUP] Inicializando Chromium no Playwright...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 960})
        page = context.new_page()

        def route_colaboradores(route):
            accept = route.request.headers.get("accept", "")
            if "application/vnd.pgrst.object+json" in accept:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_COLABORADOR))
            else:
                route.fulfill(status=200, content_type="application/json", body=json.dumps([MOCK_COLABORADOR]))

        def route_requisicoes(route):
            route.fulfill(status=200, content_type="application/json", body=json.dumps(requisicoes_db))

        def route_action(route):
            # Redireciona o POST para o nosso MockServer HTTP na porta 8009
            route.continue_(url="http://127.0.0.1:8009/api/requisicaoComprasAction")

        page.route("**/rest/v1/colaboradores*", route_colaboradores)
        page.route("**/rest/v1/requisicao_compras*", route_requisicoes)
        page.route("http://127.0.0.1:5173/api/requisicaoComprasAction*", route_action)
        page.route("http://localhost:5173/api/requisicaoComprasAction*", route_action)

        print("[SETUP] Acessando http://127.0.0.1:5173/portal-requisicoes...")
        page.goto("http://127.0.0.1:5173/portal-requisicoes", wait_until="domcontentloaded")
        page.evaluate(f"""() => {{
            sessionStorage.setItem('portal_colaborador', JSON.stringify({json.dumps(MOCK_COLABORADOR)}));
        }}""")
        page.reload(wait_until="networkidle")
        time.sleep(1.0)

        # -------------------------------------------------------------
        # ESTADO INICIAL
        # -------------------------------------------------------------
        print("\n=== VERIFICANDO ESTADO INICIAL DO PAINEL DA DIRETORIA ===")
        aba_para_decidir = page.locator("button:has-text('Para Decidir')").first
        assert aba_para_decidir.is_visible(), "Aba 'Para Decidir' não encontrada!"
        badge_count = aba_para_decidir.locator("span.rounded-full").text_content()
        print(f"  Badge inicial 'Para Decidir': {badge_count}")
        assert "2" in badge_count, f"Esperado 2 requisições na aba 'Para Decidir', obtido '{badge_count}'"

        card_101 = page.locator("article:has-text('REQ-2026-101')").first
        card_102 = page.locator("article:has-text('REQ-2026-102')").first
        assert card_101.is_visible(), "Card REQ-2026-101 não visível inicialmente!"
        assert card_102.is_visible(), "Card REQ-2026-102 não visível inicialmente!"
        print("  [OK] Os 2 cartões de requisição estão visíveis.")

        # =========================================================================
        # CENÁRIO 1: LENTO (6 segundos de delay no servidor)
        # =========================================================================
        print("\n=== CENÁRIO 1: SERVIDOR LENTO (6 SEGUNDOS) ===")
        print("  Configurando delay de 6s em /api/requisicaoComprasAction.")
        print("  Durante esse tempo, o banco (GET /rest/v1/requisicao_compras) continuará retornando o status ANTIGO.")
        delay_seconds = 6
        should_fail = False

        btn_aprovar = card_101.locator("button:has-text('Autorizar compra')")
        assert btn_aprovar.is_visible(), "Botão 'Autorizar compra' não visível na REQ-2026-101!"

        # Registra cronômetro de precisão dentro do navegador
        page.evaluate("""() => {
            window.__clique_timestamp = null;
            window.__sumiu_timestamp = null;
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Autorizar compra'));
            if (btn) {
                btn.addEventListener('click', () => {
                    window.__clique_timestamp = performance.now();
                });
            }
            const obs = new MutationObserver(() => {
                if (window.__clique_timestamp && !window.__sumiu_timestamp) {
                    if (!document.body.innerText.includes('REQ-2026-101')) {
                        window.__sumiu_timestamp = performance.now();
                        obs.disconnect();
                    }
                }
            });
            obs.observe(document.body, { childList: true, subtree: true, characterData: true });
        }""")

        print("  [AÇÃO] Clicando em 'Autorizar compra'...")
        btn_aprovar.click()

        # Mede quanto tempo real o React levou entre o evento de clique e o sumiço do card no DOM
        tempo_browser = page.evaluate("""() => {
            if (window.__clique_timestamp && window.__sumiu_timestamp) {
                return (window.__sumiu_timestamp - window.__clique_timestamp) / 1000;
            }
            return null;
        }""")

        print(f"  [RESULTADO OTIMISTA NO NAVEGADOR] Cartão sumiu em: {tempo_browser}s (esperado < 0.5s)")
        if tempo_browser is not None:
            assert tempo_browser < 0.5, f"Cartão demorou demais para sumir no navegador: {tempo_browser}s"
        else:
            # Fallback checando se não está mais visível
            assert not card_101.is_visible(), "Cartão ainda está visível!"

        # Verifica contagem da aba
        badge_count_depois = aba_para_decidir.locator("span.rounded-full").text_content()
        print(f"  Badge após clique: '{badge_count_depois}' (esperado 1)")
        assert "1" in badge_count_depois, f"Esperado 1 na aba 'Para Decidir', obtido '{badge_count_depois}'"

        # Verifica que NENHUM toast de sucesso apareceu
        toasts_visiveis = page.locator("button[aria-label='Fechar']").all()
        print(f"  Toasts de notificação visíveis durante a aprovação: {len(toasts_visiveis)} (esperado 0)")
        assert len(toasts_visiveis) == 0, "Nenhum toast de sucesso deveria aparecer para o Diretor!"

        # Durante os 6 segundos do delay do servidor, simula que múltiplos pollings ocorrem
        # e o banco continua com o status antigo. O cartão NÃO DEVE voltar!
        print("  Aguardando 4 segundos de polling contínuo para garantir que o cartão NÃO volta à tela...")
        for i in range(4):
            time.sleep(1.0)
            assert not card_101.is_visible(), f"FALHA: Cartão REQ-2026-101 reapareceu na checagem {i+1}s!"

        print("  [OK] Cartão permaneceu oculto de forma estável durante todo o processamento lento.")

        # Atualiza o banco simulado para refletir a aprovação no término dos 6s
        requisicoes_db[0]["status"] = "Aprovada"
        time.sleep(2.5) # Aguarda o término dos 6s da thread do mock server
        delay_seconds = 0

        # Garante que após o término da mutation o cartão continua fora de 'Para Decidir'
        assert not card_101.is_visible(), "Cartão não deveria estar em 'Para Decidir' após aprovação concluída!"
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "teste_validacao_cenario1_lento_ok.png"))
        print("  [CENÁRIO 1 CONCLUÍDO COM SUCESSO]")

        # =========================================================================
        # CENÁRIO 2: FALHA (Erro 500 do servidor ao reprovar/aprovar)
        # =========================================================================
        print("\n=== CENÁRIO 2: SERVIDOR RESPONDE ERRO 500 ===")
        delay_seconds = 0
        should_fail = True

        assert card_102.is_visible(), "Card REQ-2026-102 deve estar visível para o teste de erro!"
        btn_autorizar = card_102.locator("button:has-text('Autorizar cotação')")
        assert btn_autorizar.is_visible(), "Botão 'Autorizar cotação' não visível na REQ-2026-102!"

        print("  [AÇÃO] Clicando em 'Autorizar cotação' com servidor configurado para falhar 500...")
        btn_autorizar.click()

        # O servidor responde 500 imediatamente -> deve reverter e o cartão voltar!
        print("  Aguardando rollback do onError...")
        page.wait_for_selector("article:has-text('REQ-2026-102')", timeout=4000)
        assert card_102.is_visible(), "Cartão REQ-2026-102 deveria ter retornado à tela após erro 500!"
        print("  [OK] Cartão retornou para a tela com sucesso após o erro.")

        # Deve haver EXATAMENTE 1 toast de erro (sem duplicação global + local)
        toasts_erro = page.locator("button[aria-label='Fechar']")
        page.wait_for_selector("button[aria-label='Fechar']", timeout=3000)
        count_toasts = toasts_erro.count()
        print(f"  Quantidade de toasts de erro exibidos: {count_toasts} (esperado exatamente 1)")
        assert count_toasts == 1, f"Esperado exatamente 1 toast de erro, mas foram encontrados {count_toasts}!"

        # Verifica texto do toast
        toast_texto = page.locator("text=Erro ao autorizar").or_(page.locator("text=500"))
        assert toast_texto.first.is_visible(), "Mensagem de erro não visível no toast!"
        print("  [OK] Exatamente 1 toast de erro foi exibido com a mensagem correta.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "teste_validacao_cenario2_toast_erro_aberto.png"))

        # Teste de fechamento: Clicar no botão 'X' (aria-label="Fechar") deve fechar o toast na hora
        print("  [AÇÃO] Clicando no 'X' (ToastClose)...")
        btn_close_toast = toasts_erro.first
        btn_close_toast.click()

        time.sleep(0.4)
        count_apos_click = page.locator("button[aria-label='Fechar']").count()
        print(f"  Quantidade de toasts após clicar no 'X': {count_apos_click} (esperado 0)")
        assert count_apos_click == 0, "O toast deveria ter fechado imediatamente após clicar no 'X'!"
        print("  [OK] Toast fechou com sucesso ao clicar no 'X'.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "teste_validacao_cenario2_toast_erro_fechado.png"))

        # =========================================================================
        # CENÁRIO 2B: AUTO-DISMISS DO TOAST DE ERRO
        # =========================================================================
        print("\n=== CENÁRIO 2B: AUTO-DISMISS AUTOMÁTICO DO TOAST (sem clique) ===")
        # Dispara novamente o erro para testar que fecha sozinho
        btn_autorizar.click()
        page.wait_for_selector("button[aria-label='Fechar']", timeout=3000)
        print("  Toast de erro reaberto. Aguardando timeout de auto-fechamento (~8s)...")

        toast_sumiu_sozinho = False
        t_espera = time.time()
        while time.time() - t_espera < 10.5:
            if page.locator("button[aria-label='Fechar']").count() == 0:
                toast_sumiu_sozinho = True
                break
            time.sleep(0.4)

        duracao_auto = time.time() - t_espera
        print(f"  Toast fechou sozinho em: {duracao_auto:.2f}s (esperado ~8s)")
        assert toast_sumiu_sozinho, "Toast não fechou sozinho no tempo esperado de auto-dismiss!"
        print("  [OK] Auto-dismiss do toast funcionou perfeitamente sem necessidade de clique.")

        # =========================================================================
        # CENÁRIO 3: RECUSA DO DIRETOR (COM MOTIVO)
        # =========================================================================
        print("\n=== CENÁRIO 3: FLUXO DE RECUSA PELO DIRETOR ===")
        should_fail = False
        delay_seconds = 0

        btn_recusar = card_102.locator("button:has-text('Recusar')")
        assert btn_recusar.is_visible(), "Botão 'Recusar' não encontrado!"
        btn_recusar.click()

        # Modal de recusa deve abrir
        modal_recusa = page.locator("text=Recusar requisição")
        page.wait_for_selector("text=Recusar requisição", timeout=3000)
        assert modal_recusa.first.is_visible(), "Modal de recusa não abriu!"

        textarea_motivo = page.locator("textarea#motivo-recusa")
        textarea_motivo.fill("Valores acima do orçamento previsto para este trimestre.")

        btn_confirmar_recusa = page.locator("button:has-text('Confirmar recusa')")
        btn_confirmar_recusa.click()

        # O cartão deve sumir imediatamente
        time.sleep(0.3)
        assert not card_102.is_visible(), "Cartão REQ-2026-102 deveria ter sumido após confirmação de recusa!"

        # Nenhum toast de sucesso deve aparecer
        toasts_apos_recusa = page.locator("button[aria-label='Fechar']").count()
        assert toasts_apos_recusa == 0, "Nenhum toast de sucesso deve ser exibido após recusar!"
        print("  [OK] Recusa realizada com sucesso, cartão sumiu instantaneamente e nenhum toast perturbador apareceu.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "teste_validacao_cenario3_recusa_ok.png"))

        browser.close()
        print("\n=======================================================")
        print("TODOS OS TESTES FORAM EXECUTADOS E PASSARAM COM SUCESSO!")
        print("=======================================================")

if __name__ == "__main__":
    run_tests()
