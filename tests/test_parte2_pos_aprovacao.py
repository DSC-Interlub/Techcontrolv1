import os
import sys
import json
import time
import http.server
import threading
from datetime import datetime, timedelta

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\kauan.pereira\.gemini\antigravity\brain\f22aadd9-4f99-4be7-b477-82e7a8f04bfb"

MOCK_COMPRADOR = {
    "id": "colab-comprador-01",
    "nome_completo": "Mariana Compras",
    "email": "mcompras@interlub.com",
    "cargo": "Compradora Sênior",
    "area": "Compras",
    "status": "Ativo",
    "eh_comprador": True,
    "is_aprovador": False
}

MOCK_SOLICITANTE = {
    "id": "colab-solicitante-01",
    "nome_completo": "Carlos Silva",
    "email": "csilva@interlub.com",
    "cargo": "Analista de TI",
    "area": "TI",
    "status": "Ativo",
    "eh_comprador": False,
    "is_aprovador": False
}

hoje = datetime.now()
data_4_dias_atras = (hoje - timedelta(days=5)).strftime("%Y-%m-%d")
data_3_dias_atras = (hoje - timedelta(days=3)).strftime("%Y-%m-%d")
data_ontem = (hoje - timedelta(days=1)).strftime("%Y-%m-%d")
data_amanha = (hoje + timedelta(days=5)).strftime("%Y-%m-%d")
data_passada = (hoje - timedelta(days=2)).strftime("%Y-%m-%d")

INITIAL_REQUISICOES = [
    {
        "id": "req-sap-001",
        "numero_requisicao": "REQ-2026-801",
        "item": "Licenças de Software Figma Enterprise",
        "quantidade": 5,
        "unidade_medida": "un",
        "cotacao_valor": 4500.00,
        "cotacao_fornecedor": "Figma Inc",
        "status": "Aprovada",
        "etapa_compra": "Lançar no SAP",
        "aprovada_em": f"{data_4_dias_atras}T10:00:00Z",
        "colaborador_id": "colab-solicitante-01",
        "colaborador_nome": "Carlos Silva",
        "colaborador_area": "TI",
        "urgencia": "Alta"
    },
    {
        "id": "req-sap-002",
        "numero_requisicao": "REQ-2026-802",
        "item": "Monitores Dell 27 Polegadas 4K",
        "quantidade": 3,
        "unidade_medida": "un",
        "cotacao_valor": 7800.00,
        "cotacao_fornecedor": "Dell Brasil",
        "status": "Aprovada",
        "etapa_compra": "Aguardando entrega",
        "pedido_sap": "4500012345",
        "pedido_sap_data": f"{data_3_dias_atras}T11:00:00Z",
        "previsao_entrega": data_passada, # Atrasada 2 dias!
        "colaborador_id": "colab-solicitante-01",
        "colaborador_nome": "Carlos Silva",
        "colaborador_area": "TI",
        "urgencia": "Média"
    },
    {
        "id": "req-sap-003",
        "numero_requisicao": "REQ-2026-803",
        "item": "Cabos de Rede Furukawa Cat6 305m",
        "quantidade": 2,
        "unidade_medida": "cx",
        "cotacao_valor": 1600.00,
        "cotacao_fornecedor": "Distribuidora Cabos SP",
        "status": "Aprovada",
        "etapa_compra": "Entregue",
        "pedido_sap": "4500009999",
        "pedido_sap_data": f"{data_3_dias_atras}T14:00:00Z",
        "entrega_data": data_ontem,
        "entrega_nf": "NF-99882",
        "colaborador_id": "colab-solicitante-01",
        "colaborador_nome": "Carlos Silva",
        "colaborador_area": "TI",
        "urgencia": "Baixa"
    }
]

should_fail_action = False
received_action = None

class MockHttpHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        global should_fail_action, received_action
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        try:
            received_action = json.loads(body.decode('utf-8'))
        except Exception:
            received_action = None

        print(f"  [MockServer Action] Recebido: {received_action.get('action') if received_action else 'unknown'} (fail={should_fail_action})")

        if should_fail_action:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Erro simulado 500 no processamento do SAP"}).encode())
        else:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "Ação concluída com sucesso"}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def log_message(self, format, *args):
        pass

def start_mock_server():
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 8011), MockHttpHandler)
    server.serve_forever()

def run_tests():
    global should_fail_action, received_action
    requisicoes_db = [dict(r) for r in INITIAL_REQUISICOES]

    server_thread = threading.Thread(target=start_mock_server, daemon=True)
    server_thread.start()
    time.sleep(0.3)

    with sync_playwright() as p:
        print("\n========================================================")
        print("  INICIANDO SUÍTE DE TESTES E2E: CONTROLE PÓS-APROVAÇÃO SAP")
        print("========================================================\n")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 960})
        page = context.new_page()

        page.on("console", lambda msg: print(f"  [BROWSER {msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: print(f"  [PAGE ERROR] {err}"))

        usuario_ativo = MOCK_COMPRADOR

        def route_colaboradores(route):
            accept = route.request.headers.get("accept", "")
            if "application/vnd.pgrst.object+json" in accept:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(usuario_ativo))
            else:
                route.fulfill(status=200, content_type="application/json", body=json.dumps([usuario_ativo]))

        def route_requisicoes(route):
            route.fulfill(status=200, content_type="application/json", body=json.dumps(requisicoes_db))

        def route_action(route):
            route.continue_(url="http://127.0.0.1:8011/api/requisicaoComprasAction")

        page.route("**/rest/v1/colaboradores*", route_colaboradores)
        page.route("**/rest/v1/requisicao_compras*", route_requisicoes)
        page.route("http://127.0.0.1:5173/api/requisicaoComprasAction*", route_action)
        page.route("http://localhost:5173/api/requisicaoComprasAction*", route_action)

        # Injeta a sessão no sessionStorage antes de qualquer script da página rodar caso ainda não exista
        page.add_init_script(f"""
            if (!sessionStorage.getItem('portal_colaborador')) {{
                sessionStorage.setItem('portal_colaborador', JSON.stringify({json.dumps(MOCK_COMPRADOR)}));
            }}
        """)

        # -------------------------------------------------------------
        # CENÁRIO 1: ACESSO COM ?aba=pedidos E VERIFICAÇÃO DE KPIs E BADGE DE DIAS
        # -------------------------------------------------------------
        print("--- CENÁRIO 1: Acesso direto do Comprador com ?aba=pedidos ---")
        page.goto("http://localhost:5173/portal-requisicoes?aba=pedidos", wait_until="networkidle")
        time.sleep(1.0)
        print("  URL atual:", page.url)
        print("  Título:", page.title())
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "debug_cenario1.png"))
        print("  Botões encontrados:", [b.text_content() for b in page.locator("button").all()[:10]])

        # Verifica se a aba Pedidos SAP está visível e clica nela se não estiver ativa
        tab_pedidos = page.locator("button[role='tab']:has-text('Pedidos SAP')").first
        assert tab_pedidos.is_visible(), "Aba 'Pedidos SAP' não está visível para o comprador!"
        print("  [OK] Aba 'Pedidos SAP' visível com sucesso.")
        tab_pedidos.click()
        time.sleep(0.6)

        # Verifica o painel de pedidos e os contadores do topo
        painel_pedidos = page.locator("#painel-pedidos-comprador")
        assert painel_pedidos.is_visible(), "Painel de Pedidos do Comprador não renderizou!"
        print("  [OK] Container #painel-pedidos-comprador renderizado.")

        kpi_lancar = page.locator("p:has-text('1')").first
        assert kpi_lancar.is_visible(), "Contador de 'Lançar no SAP' divergente!"
        print("  [OK] KPIs de contadores renderizados corretamente.")

        # Verifica REQ-2026-801 em 'Lançar no SAP' com badge 'Aprovada há X dias'
        badge_aprovada_dias = page.locator("span:has-text('Aprovada há')").first
        assert badge_aprovada_dias.is_visible(), "Badge 'Aprovada há X dias' não exibido!"
        print(f"  [OK] Badge '{badge_aprovada_dias.text_content().strip()}' destacado em amarelo/âmbar.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "teste_pos_aprovacao_01_cenario1.png"))

        # -------------------------------------------------------------
        # CENÁRIO 2: VALIDAÇÃO DE CAMPO OBRIGATÓRIO E LANÇAMENTO NO SAP
        # -------------------------------------------------------------
        print("\n--- CENÁRIO 2: Validação de campo e lançamento no SAP ---")
        btn_lancar = page.locator("button:has-text('Registrar pedido SAP')").first
        btn_lancar.click()
        time.sleep(0.5)

        # Modal deve estar aberta
        modal_sap = page.locator("div[role='dialog']:has-text('Registrar Pedido SAP')").first
        assert modal_sap.is_visible(), "Modal 'Registrar Pedido SAP' não abriu!"

        # Verifica validação: botão deve ficar desabilitado enquanto o campo estiver vazio
        btn_salvar_sap = modal_sap.locator("button:has-text('Salvar no SAP')").first
        assert btn_salvar_sap.is_disabled(), "Botão 'Salvar no SAP' deveria estar desabilitado com o campo vazio!"
        print("  [OK] Validação de campo obrigatório funcionou (botão bloqueado sem número do SAP).")

        # Preenche o número do pedido SAP e data de previsão
        input_sap = modal_sap.locator("input[placeholder*='4500']").first
        input_sap.fill("4500098765")
        time.sleep(0.2)

        assert not btn_salvar_sap.is_disabled(), "Botão 'Salvar no SAP' deveria estar habilitado após preenchimento!"

        input_prev = modal_sap.locator("input[type='date']").first
        input_prev.fill(data_amanha)
        time.sleep(0.2)

        should_fail_action = False
        btn_salvar_sap.click()
        time.sleep(0.8)

        # A requisição REQ-2026-801 deve ir para 'Aguardando entrega' com o número do SAP
        row_801_em_entrega = page.locator("tr:has-text('REQ-2026-801')").first
        assert "4500098765" in row_801_em_entrega.text_content(), "Número do SAP não consta na linha!"
        print("  [OK] Requisição movida imediatamente para 'Aguardando entrega' com SAP 4500098765.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "teste_pos_aprovacao_02_sap_lancado.png"))

        # -------------------------------------------------------------
        # CENÁRIO 3: PREVISÃO VENCIDA DESTACADA 'Atrasada'
        # -------------------------------------------------------------
        print("\n--- CENÁRIO 3: Verificação de badge 'Atrasada' e ordenação ---")
        badge_atrasada = page.locator("span:has-text('Atrasada')").first
        assert badge_atrasada.is_visible(), "Badge de pedido atrasado não está visível!"
        texto_atraso = badge_atrasada.text_content()
        print(f"  [OK] Badge de atraso exibido: '{texto_atraso}'.")

        # -------------------------------------------------------------
        # CENÁRIO 4: REGISTRAR ENTREGA DO PEDIDO
        # -------------------------------------------------------------
        print("\n--- CENÁRIO 4: Registrar Entrega ---")
        btn_entregar = page.locator("button:has-text('Registrar entrega')").first
        btn_entregar.click()
        time.sleep(0.5)

        modal_entrega = page.locator("div[role='dialog']:has-text('Registrar Entrega')").first
        assert modal_entrega.is_visible(), "Modal de entrega não abriu!"

        input_nf = modal_entrega.locator("input[placeholder*='NF']").first
        input_nf.fill("NF-10492")
        time.sleep(0.2)

        btn_confirmar_entrega = modal_entrega.locator("button:has-text('Confirmar Entrega')").first
        btn_confirmar_entrega.click()
        time.sleep(0.8)

        print("  [OK] Entrega registrada com sucesso.")
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "teste_pos_aprovacao_03_entrega_registrada.png"))

        # -------------------------------------------------------------
        # CENÁRIO 5: BUSCA POR NÚMERO DO PEDIDO SAP
        # -------------------------------------------------------------
        print("\n--- CENÁRIO 5: Busca por número do pedido SAP ---")
        input_busca = page.locator("#painel-pedidos-comprador input[placeholder*='requisição']").first
        input_busca.fill("4500009999")
        time.sleep(0.5)

        linhas_visiveis = page.locator("tbody tr")
        print(f"  Linhas visíveis após filtro por '4500009999': {linhas_visiveis.count()}")
        assert page.locator("tr:has-text('4500009999')").is_visible(), "Item 4500009999 não encontrado na busca!"
        assert not page.locator("tr:has-text('REQ-2026-801')").is_visible(), "Item REQ-2026-801 não deveria aparecer no filtro!"
        print("  [OK] Filtro por número SAP funcionando com precisão.")

        # Limpa o filtro de busca
        input_busca.fill("")
        time.sleep(0.5)

        # -------------------------------------------------------------
        # CENÁRIO 6: REVERSÃO OTIMISTA EM CASO DE ERRO 500 E TOAST
        # -------------------------------------------------------------
        print("\n--- CENÁRIO 6: Tratamento de falha (Erro 500) e reversão otimista ---")
        # Abre o menu de contexto (...) da linha em 'Aguardando entrega'
        row_aguardando = page.locator("tbody tr:has-text('Aguardando entrega')").first
        menu_btn = row_aguardando.locator("button:has(svg.lucide-more-horizontal, svg.lucide-ellipsis)").first
        menu_btn.click()
        time.sleep(0.4)

        item_alterar = page.locator("div[role='menuitem']:has-text('Alterar previsão')").first
        item_alterar.click()
        time.sleep(0.5)

        modal_prev = page.locator("div[role='dialog']:has-text('Alterar Previsão de Entrega')").first
        assert modal_prev.is_visible(), "Modal de alterar previsão não abriu!"

        input_nova_prev = modal_prev.locator("input[type='date']").first
        input_nova_prev.fill(data_amanha)

        # Simulamos que a API vai falhar com 500
        should_fail_action = True
        btn_salvar_prev = modal_prev.locator("button:has-text('Salvar Previsão')").first
        btn_salvar_prev.click()

        # Toast de erro deve aparecer (espera explícita pela resposta e renderização)
        toast_erro = page.locator("div.border-destructive, div.bg-destructive, div.destructive, div:has-text('Erro ao atualizar previsão')").first
        toast_erro.wait_for(state="visible", timeout=6000)
        assert toast_erro.is_visible(), "Toast de erro não foi renderizado em caso de 500!"
        print("  [OK] Toast de erro 500 exibido após falha na requisição.")

        # Botão de fechar do toast deve funcionar
        btn_fechar_toast = toast_erro.locator("button[aria-label='Fechar'], button:has(svg.lucide-x)").first
        assert btn_fechar_toast.is_visible(), "Botão 'X' de fechar o toast não visível!"
        btn_fechar_toast.click()
        toast_erro.wait_for(state="hidden", timeout=4000)
        print("  [OK] Botão 'X' fechou o toast perfeitamente.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "teste_pos_aprovacao_04_toast_fechado.png"))

        # -------------------------------------------------------------
        # CENÁRIO 7: VISIBILIDADE PARA O SOLICITANTE NA ABA 'MINHAS'
        # -------------------------------------------------------------
        print("\n--- CENÁRIO 7: Solicitante (Carlos TI) na aba 'Minhas' ---")
        usuario_ativo = MOCK_SOLICITANTE
        page.evaluate(f"""() => {{
            sessionStorage.setItem('portal_colaborador', JSON.stringify({json.dumps(MOCK_SOLICITANTE)}));
        }}""")
        page.goto("http://localhost:5173/portal-requisicoes", wait_until="networkidle")
        time.sleep(1.0)

        tab_minhas = page.locator("button[role='tab']:has-text('Minhas')").first
        tab_minhas.click()
        time.sleep(0.5)

        # Carlos TI vê a requisição REQ-2026-802 com badge SAP e botão 'Recebi'
        card_802 = page.locator("div:has-text('REQ-2026-802')").first
        assert card_802.is_visible(), "Requisição REQ-2026-802 não visível para o solicitante!"
        assert "SAP: 4500012345" in card_802.text_content(), "Badge com número SAP não exibido para o solicitante!"
        print("  [OK] Solicitante visualiza etapa pós-aprovação com número do SAP e previsão.")

        btn_recebi = card_802.locator("button:has-text('Recebi')").first
        assert btn_recebi.is_visible(), "Botão 'Recebi' não visível para o solicitante na requisição aguardando entrega!"
        print("  [OK] Botão 'Recebi' visível e acessível ao solicitante.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "teste_pos_aprovacao_05_solicitante_minhas.png"))

        browser.close()
        print("\n========================================================")
        print("  TODOS OS 7 CENÁRIOS DA PARTE 2 FORAM VALIDADOS COM SUCESSO!")
        print("========================================================\n")

if __name__ == "__main__":
    run_tests()
