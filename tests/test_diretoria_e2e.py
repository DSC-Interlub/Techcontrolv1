import os
import sys
import json
import time

# Configura encoding do terminal para UTF-8 sem falhas
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\kauan.pereira\.gemini\antigravity\brain\f22aadd9-4f99-4be7-b477-82e7a8f04bfb"

# Dados simulados para teste seguro (SEM TOCAR EM PRODUÇÃO)
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
        "finalidade": "Renovação das licenças de engenharia para projetos de lubrificantes especiais e embalagens 2026.",
        "colaborador_id": "colab-eng-01",
        "colaborador_nome": "Carlos Eduardo Silva",
        "colaborador_area": "Engenharia",
        "created_date": "2026-11-09T14:30:00Z",
        "link_referencia": "https://www.solidworks.com/pricing",
        "links_cotacao": ["https://www.solidworks.com/pricing"],
        "anexos": [],
        "historico": [
            {
                "data": "2026-11-09T14:30:00Z",
                "tipo": "criada",
                "autor": "Carlos Eduardo Silva",
                "descricao": "Requisição cadastrada no portal."
            },
            {
                "data": "2026-11-09T15:00:00Z",
                "tipo": "aprovada_gestor",
                "autor": "Mariana Souza (Gerente)",
                "descricao": "Aprovada pelo gestor direto da Engenharia."
            }
        ]
    },
    {
        "id": "req-002",
        "numero_requisicao": "REQ-2026-092",
        "item": "Lote 3 Notebooks Dell Latitude 3440 i7 16GB",
        "quantidade": 3,
        "valor_estimado": 16500.00,
        "valor_teto": 16500.00,
        "cotacao_valor": 14750.00,
        "cotacao_fornecedor": "Dell Computadores do Brasil",
        "status": "Aguardando Aprovação Final",
        "urgencia": "Média",
        "centro_custo": "Tecnologia da Informação",
        "finalidade": "Substituição preventiva de máquinas depreciadas do laboratório de controle de qualidade.",
        "colaborador_id": "colab-ti-02",
        "colaborador_nome": "Lucas Ferreira",
        "colaborador_area": "TI",
        "created_date": "2026-11-05T10:15:00Z",
        "anexos": [
            {
                "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                "nome": "Proposta_Comercial_Dell_092.pdf",
                "tipo": "pdf"
            },
            {
                "url": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800",
                "nome": "Especificacao_Notebook.png",
                "tipo": "imagem"
            }
        ],
        "historico": [
            {
                "data": "2026-11-05T10:15:00Z",
                "tipo": "criada",
                "autor": "Lucas Ferreira",
                "descricao": "Requisição iniciada para renovação do parque fabril."
            },
            {
                "data": "2026-11-06T11:00:00Z",
                "tipo": "aprovada_diretor",
                "autor": "Valter Alves Torres",
                "descricao": "Cotação autorizada com teto de R$ 16.500,00."
            },
            {
                "data": "2026-11-08T16:20:00Z",
                "tipo": "cotacao_anexada",
                "autor": "Equipe de Compras",
                "descricao": "3 orçamentos obtidos. Menor preço negociado com Dell (R$ 14.750,00 - economia de R$ 1.750,00)."
            }
        ]
    },
    {
        "id": "req-003",
        "numero_requisicao": "REQ-2026-085",
        "item": "Revisão e Calibração dos Viscosímetros Anton Paar",
        "quantidade": 2,
        "valor_estimado": 8200.00,
        "valor_teto": 8200.00,
        "status": "Aguardando Cotação",
        "urgencia": "Alta",
        "centro_custo": "Laboratório Químico",
        "finalidade": "Manutenção periódica obrigatória para certificação ISO 9001.",
        "colaborador_id": "colab-lab-01",
        "colaborador_nome": "Beatriz Ramos",
        "colaborador_area": "Qualidade",
        "created_date": "2026-11-07T09:00:00Z"
    },
    {
        "id": "req-004",
        "numero_requisicao": "REQ-2026-081",
        "item": "Material de Limpeza Industrial e Tambores de Descarte",
        "quantidade": 10,
        "valor_estimado": 3400.00,
        "valor_teto": 3400.00,
        "status": "Aguardando Ajuste",
        "urgencia": "Baixa",
        "centro_custo": "Operações / Fábrica",
        "finalidade": "Reposição de estoque de tambores homologados para coleta seletiva.",
        "colaborador_id": "colab-op-03",
        "colaborador_nome": "Marcos Oliveira",
        "colaborador_area": "Operações",
        "created_date": "2026-11-04T16:00:00Z"
    },
    {
        "id": "req-005",
        "numero_requisicao": "REQ-2026-070",
        "item": "Compressor de Ar Industrial Schulz 60 PCM",
        "quantidade": 1,
        "valor_estimado": 28000.00,
        "valor_teto": 28000.00,
        "cotacao_valor": 26500.00,
        "cotacao_fornecedor": "Schulz Compressores SP",
        "status": "Aprovada",
        "urgencia": "Alta",
        "centro_custo": "Manutenção Geral",
        "finalidade": "Substituição do compressor principal da linha 2.",
        "colaborador_id": "colab-man-01",
        "colaborador_nome": "José Roberto",
        "colaborador_area": "Manutenção",
        "created_date": "2026-10-25T11:00:00Z"
    },
    {
        "id": "req-006",
        "numero_requisicao": "REQ-2026-068",
        "item": "Assinatura Software de Monitoramento em Nuvem",
        "quantidade": 1,
        "valor_estimado": 9500.00,
        "valor_teto": 9500.00,
        "status": "Reprovada pelo Diretor",
        "urgencia": "Média",
        "centro_custo": "Tecnologia da Informação",
        "finalidade": "Ferramenta externa de APM.",
        "colaborador_id": "colab-ti-01",
        "colaborador_nome": "Lucas Ferreira",
        "colaborador_area": "TI",
        "created_date": "2026-10-20T15:00:00Z",
        "historico": [
            {
                "data": "2026-10-21T10:00:00Z",
                "tipo": "reprovada_diretor",
                "autor": "Valter Alves Torres",
                "descricao": "Recusado: Já possuímos solução interna similar contratada."
            }
        ]
    }
]

def run_e2e_test():
    console_logs = []
    page_errors = []

    print("[1/6] Iniciando navegador com Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1400, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        # Monitor de console e erros JS
        def handle_console(msg):
            safe_text = msg.text.encode('ascii', errors='replace').decode('ascii')
            console_logs.append(f"[{msg.type}] {safe_text}")
            if msg.type in ["error", "warning"]:
                try:
                    print(f"Browser Console {msg.type.upper()}: {safe_text}")
                except Exception:
                    pass

        def handle_page_error(err):
            safe_err = str(err).encode('ascii', errors='replace').decode('ascii')
            page_errors.append(safe_err)
            try:
                print(f"CRITICAL PAGE ERROR: {safe_err}")
            except Exception:
                pass

        page.on("console", handle_console)
        page.on("pageerror", handle_page_error)

        # Interceptação de segurança: ZERO alterações em produção
        def route_interceptor(route):
            url = route.request.url
            # Se for buscar colaboradores
            if "rest/v1/colaboradores" in url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps([MOCK_COLABORADOR])
                )
                return

            # Se for requisições de compras
            if "rest/v1/requisicao_compras" in url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps(MOCK_REQUISICOES)
                )
                return

            # Se for RPC ou Functions
            if "functions/v1/requisicaoComprasAction" in url or "requisicaoComprasAction" in url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps({"success": True, "message": "Simulado com segurança"})
                )
                return

            # Mock de PDF dummy
            if "dummy.pdf" in url or "w3.org" in url:
                route.fulfill(
                    status=200,
                    content_type="application/pdf",
                    body=b"%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF"
                )
                return

            route.continue_()

        page.route("**/rest/v1/**", route_interceptor)
        page.route("**/functions/v1/**", route_interceptor)
        page.route("**/api/requisicaoComprasAction*", route_interceptor)
        page.route("**/*dummy.pdf*", route_interceptor)
        page.route("**/*w3.org*", route_interceptor)

        print("[2/6] Injetando sessão do Diretor no sessionStorage e navegando...")
        page.goto("http://localhost:5173/portal-requisicoes", wait_until="domcontentloaded")
        page.evaluate(f"""() => {{
            sessionStorage.setItem('portal_colaborador', JSON.stringify({json.dumps(MOCK_COLABORADOR)}));
        }}""")
        page.reload(wait_until="networkidle")

        time.sleep(2)

        # Captura screenshot 1: Aba "Para decidir"
        screenshot_1 = os.path.join(ARTIFACT_DIR, "teste_01_aba_para_decidir.png")
        page.screenshot(path=screenshot_1, full_page=True)
        print(f"Screenshot salvo: {screenshot_1}")

        # Validações essenciais na aba "Para decidir"
        print("[3/6] Validando Aba 'Para decidir'...")
        assert page.locator("h1:has-text('Requisições de compra')").is_visible(), "Título principal não encontrado!"
        assert page.locator("text=Diretoria").first.is_visible(), "Subtítulo com Diretoria não encontrado!"
        assert page.locator("button[role='tab']:has-text('Para decidir')").is_visible(), "Aba 'Para decidir' não encontrada!"
        assert page.locator("button[role='tab']:has-text('Em andamento')").is_visible(), "Aba 'Em andamento' não encontrada!"
        assert page.locator("button[role='tab']:has-text('Histórico')").is_visible(), "Aba 'Histórico' não encontrada!"

        # Verifica os dois cards
        cad_visible = page.locator("text=Licenças Anuais Software CAD").is_visible()
        dell_visible = page.locator("text=Lote 3 Notebooks Dell Latitude").is_visible()
        print(f"Card Fase 1 visível: {cad_visible}")
        print(f"Card Fase 2 visível: {dell_visible}")
        assert cad_visible and dell_visible, "Os cards de decisão não foram renderizados!"

        # Verifica quadro de valores de 3 colunas no card Dell
        assert page.locator("text=Teto autorizado").first.is_visible(), "Quadro de valores 'Teto autorizado' não encontrado!"
        assert page.locator("text=Cotação do Compras").first.is_visible(), "Quadro de valores 'Cotação do Compras' não encontrado!"
        assert page.locator("text=R$ 14.750,00").first.is_visible(), "Valor cotado R$ 14.750,00 não encontrado!"

        # Teste 3.1: Abrir Visualizador de Anexo (Modal)
        print("Testando abertura de anexo no modal...")
        anexo_btn = page.locator("button:has-text('Proposta_Comercial_Dell_092.pdf')").first
        if anexo_btn.is_visible():
            anexo_btn.click()
            time.sleep(1)
            screenshot_anexo = os.path.join(ARTIFACT_DIR, "teste_02_visualizador_anexo.png")
            page.screenshot(path=screenshot_anexo)
            print(f"Screenshot anexo salvo: {screenshot_anexo}")
            # Fechar modal de anexo pelo botão explícito Fechar
            btn_fechar_anexo = page.locator("div[role='dialog'] button:has-text('Fechar')").first
            if btn_fechar_anexo.is_visible():
                btn_fechar_anexo.click()
            else:
                page.keyboard.press("Escape")
            page.locator("div[role='dialog']").wait_for(state="hidden", timeout=5000)
            time.sleep(1)

        # Teste 3.2: Abrir Ficha lateral (Sheet) com linha do tempo
        print("Testando abertura da Ficha Completa lateral (Sheet)...")
        btn_ficha = page.locator("button:has-text('Ver histórico completo')").first
        if btn_ficha.is_visible():
            btn_ficha.click()
            time.sleep(1)
            screenshot_ficha = os.path.join(ARTIFACT_DIR, "teste_03_ficha_lateral_sheet.png")
            page.screenshot(path=screenshot_ficha)
            print(f"Screenshot ficha salvo: {screenshot_ficha}")
            assert page.locator("h4:has-text('Histórico da Requisição')").is_visible(), "Linha do tempo na ficha lateral não encontrada!"
            # Fechar sheet
            btn_close_sheet = page.locator("button.absolute.right-4.top-4").or_(page.locator("div[role='dialog'] button:has-text('Close')")).first
            if btn_close_sheet.is_visible():
                btn_close_sheet.click()
            else:
                page.keyboard.press("Escape")
            time.sleep(1)

        # Teste 3.3: Abrir Modal de Recusa
        print("Testando abertura do Modal de Recusa e chips rápidos...")
        btn_recusar = page.locator("button:has-text('Recusar...')").first
        if btn_recusar.is_visible():
            btn_recusar.click()
            time.sleep(1)
            screenshot_recusa = os.path.join(ARTIFACT_DIR, "teste_04_modal_recusa.png")
            page.screenshot(path=screenshot_recusa)
            print(f"Screenshot recusa salvo: {screenshot_recusa}")
            # Clicar em um chip
            chip_valor = page.locator("button:has-text('Valor acima do esperado')").first
            if chip_valor.is_visible():
                chip_valor.click()
                time.sleep(0.5)
                # Verifica se o textarea recebeu o texto
                textarea_val = page.locator("textarea#motivo-recusa").input_value()
                print(f"Valor preenchido no textarea via chip: '{textarea_val}'")
                assert "Valor acima do esperado" in textarea_val, "Chip rápido não preencheu o textarea!"
            
            # Cancelar modal de recusa
            btn_cancelar = page.locator("button:has-text('Cancelar')").first
            if btn_cancelar.is_visible():
                btn_cancelar.click()
                time.sleep(1)
            else:
                page.keyboard.press("Escape")
                time.sleep(1)

        # Teste 3.4: Testar clique em Autorizar cotação com Mock Seguro (ZERO impacto em prod)
        print("Testando clique em 'Autorizar cotação' com mutation mockada...")
        btn_autorizar_cotacao = page.locator("button:has-text('Autorizar cotação')").first
        if btn_autorizar_cotacao.is_visible():
            btn_autorizar_cotacao.click()
            time.sleep(1)
            screenshot_toast = os.path.join(ARTIFACT_DIR, "teste_04b_toast_autorizacao.png")
            page.screenshot(path=screenshot_toast)
            print(f"Screenshot toast salvo: {screenshot_toast}")
            assert page.locator("text=Cotação autorizada").or_(page.locator("text=autorizada")).first.is_visible(), "Toast de autorização não exibido!"

        # [4/6] Testar Aba "Em andamento"
        print("[4/6] Validando Aba 'Em andamento'...")
        tab_andamento = page.locator("button[role='tab']:has-text('Em andamento')").or_(page.locator("text=Em andamento")).first
        tab_andamento.click()
        time.sleep(1)
        screenshot_andamento = os.path.join(ARTIFACT_DIR, "teste_05_aba_em_andamento.png")
        page.screenshot(path=screenshot_andamento, full_page=True)
        print(f"Screenshot andamento salvo: {screenshot_andamento}")
        assert page.locator("text=Revisão e Calibração dos Viscosímetros").is_visible(), "Item em andamento não encontrado!"
        assert page.locator("text=Material de Limpeza Industrial").is_visible(), "Item devolvido não encontrado!"

        # [5/6] Testar Aba "Histórico"
        print("[5/6] Validando Aba 'Histórico'...")
        tab_historico = page.locator("button[role='tab']:has-text('Histórico')").or_(page.locator("text=Histórico")).first
        tab_historico.click()
        time.sleep(1)
        screenshot_historico = os.path.join(ARTIFACT_DIR, "teste_06_aba_historico.png")
        page.screenshot(path=screenshot_historico, full_page=True)
        print(f"Screenshot histórico salvo: {screenshot_historico}")
        assert page.locator("text=Compressor de Ar Industrial Schulz").is_visible(), "Item aprovado no histórico não encontrado!"
        assert page.locator("text=Assinatura Software de Monitoramento").is_visible(), "Item reprovado no histórico não encontrado!"

        # Testar filtro por busca no Histórico
        print("Testando busca no Histórico...")
        input_busca = page.locator("input[placeholder*='Buscar por número, item']").first
        if input_busca.is_visible():
            input_busca.fill("Compressor")
            time.sleep(0.5)
            assert page.locator("text=Compressor de Ar Industrial Schulz").is_visible(), "Resultado de busca não visível!"
            assert not page.locator("text=Assinatura Software de Monitoramento").is_visible(), "Item não filtrado ainda aparece!"
            # Limpa busca
            input_busca.fill("")
            time.sleep(0.5)

        # [6/6] Verificar erros no console
        print("[6/6] Verificando integridade e logs do console...")
        ignored_patterns = ["favicon", "w3.org", "x-frame-options", "failed to load resource"]
        severe_errors = [e for e in page_errors if not any(p in e.lower() for p in ignored_patterns)]
        severe_console_errors = [c for c in console_logs if "[error]" in c.lower() and not any(p in c.lower() for p in ignored_patterns)]

        print("Page Errors detectados:", severe_errors)
        print("Console Errors detectados:", severe_console_errors)

        assert len(severe_errors) == 0, f"Erros graves na página: {severe_errors}"
        assert len(severe_console_errors) == 0, f"Erros graves no console: {severe_console_errors}"

        browser.close()
        print("\n>>> TODOS OS TESTES PASSARAM COM SUCESSO! ZERO ERROS! <<<")

if __name__ == "__main__":
    run_e2e_test()
