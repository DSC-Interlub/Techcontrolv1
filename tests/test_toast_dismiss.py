import os
import sys
import json
import time

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

MOCK_REQUISICOES = [
    {
        "id": "req-001",
        "numero_requisicao": "REQ-2026-089",
        "item": "Licenças Anuais Software CAD / SolidWorks (5 licenças)",
        "quantidade": 5,
        "valor_estimado": 15000.00,
        "valor_teto": 15000.00,
        "status": "Aguardando Diretor",
        "urgencia": "Alta",
        "centro_custo": "Engenharia / P&D",
        "finalidade": "Renovação das licenças de engenharia.",
        "colaborador_id": "colab-eng-01",
        "colaborador_nome": "Carlos Eduardo Silva",
        "colaborador_area": "Engenharia",
        "created_date": "2026-11-09T14:30:00Z"
    }
]

def run_toast_test():
    console_logs = []
    page_errors = []

    print("[1/4] Iniciando navegador com Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1400, "height": 900}
        )
        page = context.new_page()

        def handle_console(msg):
            safe = msg.text.encode('ascii', errors='replace').decode('ascii')
            console_logs.append(f"[{msg.type}] {safe}")

        def handle_page_error(err):
            safe = str(err).encode('ascii', errors='replace').decode('ascii')
            page_errors.append(safe)

        page.on("console", handle_console)
        page.on("pageerror", handle_page_error)

        def route_interceptor(route):
            url = route.request.url
            if "rest/v1/colaboradores" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps([MOCK_COLABORADOR]))
                return
            if "rest/v1/requisicao_compras" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_REQUISICOES))
                return
            if "requisicaoComprasAction" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"success": True}))
                return
            route.continue_()

        page.route("**/rest/v1/**", route_interceptor)
        page.route("**/functions/v1/**", route_interceptor)
        page.route("**/api/requisicaoComprasAction*", route_interceptor)

        print("[2/4] Carregando portal da diretoria...")
        page.goto("http://localhost:5173/portal-requisicoes", wait_until="domcontentloaded")
        page.evaluate(f"""() => {{
            sessionStorage.setItem('portal_colaborador', JSON.stringify({json.dumps(MOCK_COLABORADOR)}));
        }}""")
        page.reload(wait_until="networkidle")
        time.sleep(1.5)

        # Dispara ação de aprovar cotação para emitir o Toast
        print("[3/4] Clicando em 'Autorizar cotação' para gerar notificação...")
        btn_autorizar = page.locator("button:has-text('Autorizar cotação')").first
        assert btn_autorizar.is_visible(), "Botão 'Autorizar cotação' não visível!"
        btn_autorizar.click()

        # Aguarda o Toast aparecer
        toast_desc = page.locator("text=O Compras já pode buscar fornecedores").first
        toast_desc.wait_for(state="visible", timeout=5000)
        print("Toast exibido com sucesso no canto inferior direito!")

        screenshot_toast_aberto = os.path.join(ARTIFACT_DIR, "teste_07_toast_notificacao_aberto.png")
        page.screenshot(path=screenshot_toast_aberto)
        print(f"Screenshot salvo: {screenshot_toast_aberto}")

        # Localiza o botão "X" do Toast
        print("Localizando botão 'X' de fechar...")
        btn_x = page.locator("button[toast-close]").or_(page.locator("button[aria-label='Fechar aviso']")).first
        assert btn_x.is_visible(), "Botão 'X' não está visível no Toast!"

        # Clica no "X" para fechar
        print("Clicando no 'X' para fechar a notificação...")
        btn_x.click()

        # Aguarda o Toast fechar
        time.sleep(0.8)
        screenshot_toast_fechado = os.path.join(ARTIFACT_DIR, "teste_08_toast_notificacao_fechado.png")
        page.screenshot(path=screenshot_toast_fechado)
        print(f"Screenshot salvo: {screenshot_toast_fechado}")

        # Verifica se a notificação sumiu (tanto a descrição quanto o botão X)
        is_toast_desc_visible = page.locator("text=O Compras já pode buscar fornecedores").is_visible()
        is_btn_x_visible = page.locator("button[aria-label='Fechar aviso']").is_visible()
        print(f"Descrição do Toast visível após clicar no X? {is_toast_desc_visible}")
        print(f"Botão X do Toast visível após clicar no X? {is_btn_x_visible}")
        assert not is_toast_desc_visible, "A notificação NÃO sumiu após clicar no 'X'!"
        assert not is_btn_x_visible, "O botão 'X' da notificação ainda está na tela!"

        # [4/4] Testa auto-dismiss
        print("[4/4] Testando auto-dismiss automático de aviso...")
        btn_autorizar.click()
        toast_desc2 = page.locator("text=O Compras já pode buscar fornecedores").first
        toast_desc2.wait_for(state="visible", timeout=3000)
        print("Aguardando auto-dismiss automático (5.5s)...")
        time.sleep(5.8)
        assert not page.locator("text=O Compras já pode buscar fornecedores").is_visible(), "Toast não sumiu automaticamente após o timeout!"
        print("Auto-dismiss funcionou perfeitamente!")

        browser.close()
        print("\n>>> TESTE DE FECHAMENTO DO TOAST: 100% SUCESSO! ZERO FALHAS! <<<")

if __name__ == "__main__":
    run_toast_test()
