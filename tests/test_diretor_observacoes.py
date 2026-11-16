import json
import time
import os
import re
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\kauan.pereira\.gemini\antigravity\brain\f22aadd9-4f99-4be7-b477-82e7a8f04bfb"

MOCK_DIRETOR = {
    "id": "colab-diretor-01",
    "email": "vtorres@interlub.com",
    "nome_completo": "Valter Alves Torres",
    "cargo": "Diretor Geral",
    "area": "Diretoria",
    "status": "Ativo"
}

INITIAL_REQUISICOES = [
    {
        "id": "req-fase1-001",
        "numero_requisicao": "REQ-2026-901",
        "created_date": "2026-11-16T10:00:00Z",
        "status": "Aguardando Diretor",
        "item": "Kit de Ferramentas de Precisão",
        "quantidade": 2,
        "unidade_medida": "jogos",
        "valor_maximo": 450.00,
        "colaborador_id": "colab-solic-01",
        "colaborador_nome": "Marcos Silva",
        "colaborador_area": "Manutenção",
        "justificativa": "Necessário para calibração preventiva dos equipamentos.",
        "token_aprovacao": "tok-901"
    },
    {
        "id": "req-fase2-002",
        "numero_requisicao": "REQ-2026-902",
        "created_date": "2026-11-15T14:00:00Z",
        "status": "Aguardando Aprovação Final",
        "item": "Servidor Dell PowerEdge R650",
        "quantidade": 1,
        "unidade_medida": "un",
        "valor_maximo": 18000.00,
        "cotacao_valor": 21500.00,
        "cotacao_fornecedor": "Dell Computadores do Brasil",
        "colaborador_id": "colab-solic-02",
        "colaborador_nome": "Carlos TI",
        "colaborador_area": "TI",
        "justificativa": "Substituição do host de virtualização.",
        "token_aprovacao": "tok-902"
    }
]

received_actions = []

def run_tests():
    global received_actions
    requisicoes_db = [dict(r) for r in INITIAL_REQUISICOES]

    with sync_playwright() as p:
        print("\n========================================================")
        print("  INICIANDO TESTES E2E: MODAL DE OBSERVAÇÕES DA DIRETORIA")
        print("========================================================\n")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 960})
        page = context.new_page()

        page.on("console", lambda msg: print(f"  [BROWSER {msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: print(f"  [PAGE ERROR] {err}"))
        page.on("request", lambda req: print(f"  [REQUEST] {req.method} {req.url}"))

        def route_colaboradores(route):
            accept = route.request.headers.get("accept", "")
            if "application/vnd.pgrst.object+json" in accept:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_DIRETOR))
            else:
                route.fulfill(status=200, content_type="application/json", body=json.dumps([MOCK_DIRETOR]))

        def route_requisicoes(route):
            route.fulfill(status=200, content_type="application/json", body=json.dumps(requisicoes_db))

        def route_action(route):
            req = route.request
            try:
                body = req.post_data_json
            except Exception:
                body = None
            if not body and req.post_data:
                try:
                    body = json.loads(req.post_data)
                except Exception:
                    body = {}
            received_actions.append(body or {})
            print(f"  [Action Interceptada] {body.get('action') if body else 'unknown'} | Comentário: '{body.get('comentario') if body else ''}'")
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"success": True}))

        page.route("**/rest/v1/colaboradores*", route_colaboradores)
        page.route("**/rest/v1/requisicao_compras*", route_requisicoes)
        page.route("http://localhost:5173/api/requisicaoComprasAction*", route_action)
        page.route("http://127.0.0.1:5173/api/requisicaoComprasAction*", route_action)

        page.add_init_script(f"""
            sessionStorage.setItem('portal_colaborador', JSON.stringify({json.dumps(MOCK_DIRETOR)}));
        """)

        page.goto("http://localhost:5173/portal-requisicoes", wait_until="networkidle")
        time.sleep(1.0)

        # -------------------------------------------------------------
        # TESTE 1: APROVAR FASE 1 COM OBSERVAÇÃO
        # -------------------------------------------------------------
        print("--- TESTE 1: Autorizar Cotação (1ª Fase) com Observação ---")
        card_fase1 = page.locator("article:has-text('REQ-2026-901')").first
        assert card_fase1.is_visible(), "Card REQ-2026-901 não visível!"

        btn_autorizar1 = card_fase1.locator("button:has-text('Autorizar cotação')").first
        btn_autorizar1.click()
        time.sleep(0.4)

        modal_aprov1 = page.locator("div[role='dialog']:has-text('Autorizar Cotação')").first
        assert modal_aprov1.is_visible(), "Modal de Autorização (1ª Fase) não abriu!"
        print("  [OK] Modal de Autorização da 1ª Fase abriu com sucesso.")

        # Verifica label de observação
        label_obs = modal_aprov1.locator("label:has-text('Observação da Diretoria')").first
        assert label_obs.is_visible(), "Label de observação não visível no modal de aprovação!"

        # Digita observação personalizada
        textarea_obs = modal_aprov1.locator("textarea#obs-aprovacao").first
        textarea_obs.fill("Autorizado. Por favor pesquisar fornecedor com entrega expressa.")

        btn_confirmar1 = modal_aprov1.locator("button:has-text('Confirmar Autorização de Cotação')").first
        btn_confirmar1.click()
        
        # Espera a interceptação da ação
        for _ in range(30):
            if len(received_actions) >= 1:
                break
            time.sleep(0.2)

        assert len(received_actions) >= 1, "Nenhuma ação recebida pelo mock server!"
        last_action = received_actions[-1]
        assert last_action.get('action') == 'diretor_aprovar', "Ação diretor_aprovar não disparada!"
        assert "entrega expressa" in last_action.get('comentario', ''), f"Comentário não enviado: {last_action}"
        print(f"  [OK] 1ª Fase aprovada com a observação registrada: '{last_action.get('comentario')}'")

        # -------------------------------------------------------------
        # TESTE 2: RECUSAR FASE 2 COM MOTIVO / OBSERVAÇÃO
        # -------------------------------------------------------------
        print("\n--- TESTE 2: Recusar Compra (2ª Fase) com Observação ---")
        card_fase2 = page.locator("article:has-text('REQ-2026-902')").first
        assert card_fase2.is_visible(), "Card REQ-2026-902 não visível!"

        btn_recusar2 = card_fase2.locator("button:has-text('Recusar')").first
        btn_recusar2.click()
        time.sleep(0.4)

        modal_recusa = page.locator("div[role='dialog']:has-text('Recusar Compra Final')").first
        assert modal_recusa.is_visible(), "Modal de Recusa (2ª Fase) não abriu!"
        print("  [OK] Modal de Recusa da 2ª Fase abriu com sucesso.")

        textarea_recusa = modal_recusa.locator("textarea#motivo-recusa").first
        textarea_recusa.fill("Valor da cotação muito alto. Favor buscar outros fornecedores com menor valor.")

        btn_confirmar_recusa = modal_recusa.locator("button:has-text('Confirmar Recusa')").first
        btn_confirmar_recusa.click()

        # Espera a interceptação da segunda ação
        for _ in range(30):
            if len(received_actions) >= 2:
                break
            time.sleep(0.2)

        assert len(received_actions) >= 2, "Segunda ação não recebida pelo mock server!"
        last_action2 = received_actions[-1]
        assert last_action2.get('action') == 'diretor_reprovar', "Ação diretor_reprovar não disparada!"
        assert "Valor da cotação muito alto" in last_action2.get('comentario', ''), f"Motivo não enviado: {last_action2}"
        print(f"  [OK] 2ª Fase recusada com a observação registrada: '{last_action2.get('comentario')}'")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "teste_diretor_observacoes_sucesso.png"))
        browser.close()
        print("\n========================================================")
        print("  TESTES DE OBSERVAÇÃO DA DIRETORIA CONCLUÍDOS COM SUCESSO!")
        print("========================================================\n")

if __name__ == "__main__":
    run_tests()
