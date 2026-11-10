import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle2 } from "lucide-react";

import CartaoDecisao from "./CartaoDecisao";
import ListaEmAndamento from "./ListaEmAndamento";
import TabelaHistorico from "./TabelaHistorico";
import FichaRequisicao from "./FichaRequisicao";
import ModalRecusa from "./ModalRecusa";
import VisualizadorAnexo from "./VisualizadorAnexo";

export default function PainelDiretoria({
  requisicoes = [],
  isLoading,
  colaboradorFull,
  onNovaRequisicao,
  onAprovar,
  onRecusar,
  pendingReqId
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Lê a aba da URL (?aba=decidir|andamento|historico)
  const abaParam = searchParams.get("aba");
  const [abaAtiva, setAbaAtiva] = useState(
    abaParam && ["decidir", "andamento", "historico"].includes(abaParam)
      ? abaParam
      : "decidir"
  );

  // Estados dos modais e ficha lateral
  const [sheetReq, setSheetReq] = useState(null);
  const [modalRecusaReq, setModalRecusaReq] = useState(null);
  const [modalAnexo, setModalAnexo] = useState(null);
  const [anexoReqPai, setAnexoReqPai] = useState(null);

  // Atualiza query param ao mudar de aba
  const handleTrocarAba = (novaAba) => {
    setAbaAtiva(novaAba);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("aba", novaAba);
      return p;
    }, { replace: true });
  };

  // Separação dos dados
  const { paraDecidir, emAndamento, historico } = useMemo(() => {
    const decidir = [];
    const andamento = [];
    const hist = [];

    requisicoes.forEach((r) => {
      const st = r.status;
      if (st === "Aguardando Diretor" || st === "Aguardando Aprovação Final") {
        decidir.push(r);
      } else if (st === "Aguardando Cotação") {
        andamento.push(r);
      } else if (st === "Aprovada") {
        hist.push(r);
      } else if (st?.startsWith("Reprovada")) {
        // Se foi reprovada recentemente pode estar no andamento se o usuário considerar, ou no histórico
        hist.push(r);
      }
    });

    return {
      paraDecidir: decidir,
      emAndamento: andamento,
      historico: hist
    };
  }, [requisicoes]);

  // Se tiver requisições para decidir e nenhuma aba na URL, abre em 'decidir'
  useEffect(() => {
    if (!abaParam && paraDecidir.length > 0 && abaAtiva !== "decidir") {
      setAbaAtiva("decidir");
    }
  }, [paraDecidir.length, abaParam]);

  // Handler para abrir visualizador de anexo com a requisição pai
  const handleOpenAnexo = (arq, req) => {
    setModalAnexo(arq);
    setAnexoReqPai(req || sheetReq);
  };

  const totalDecidir = paraDecidir.length;
  const totalAndamento = emAndamento.length;
  const totalHistorico = historico.length;

  return (
    <div className="max-w-[960px] mx-auto py-4 sm:py-6 px-4 sm:px-6 space-y-6">
      {/* 1. Cabeçalho Corporativo Limpo */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-foreground">
            Requisições de compra
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalDecidir > 0
              ? `Diretoria · ${totalDecidir} ${totalDecidir > 1 ? "compras aguardam" : "compra aguarda"} sua decisão`
              : "Diretoria · Nenhuma compra aguardando sua decisão"}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={onNovaRequisicao}
          className="gap-2 h-10 px-4 text-sm font-semibold shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova requisição
        </Button>
      </header>

      {/* 2. Abas com Estilo Sublinhado */}
      <nav className="flex items-center gap-1 border-b overflow-x-auto" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === "decidir"}
          onClick={() => handleTrocarAba("decidir")}
          className={`relative inline-flex items-center gap-2 py-3 px-3 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
            abaAtiva === "decidir"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Para decidir</span>
          <span
            className={`min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-semibold ${
              totalDecidir > 0
                ? "bg-blue-600 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {totalDecidir}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === "andamento"}
          onClick={() => handleTrocarAba("andamento")}
          className={`relative inline-flex items-center gap-2 py-3 px-3 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
            abaAtiva === "andamento"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Em andamento</span>
          <span className="min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-semibold bg-muted text-muted-foreground">
            {totalAndamento}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === "historico"}
          onClick={() => handleTrocarAba("historico")}
          className={`relative inline-flex items-center gap-2 py-3 px-3 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
            abaAtiva === "historico"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Histórico</span>
          <span className="min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-semibold bg-muted text-muted-foreground">
            {totalHistorico}
          </span>
        </button>
      </nav>

      {/* 3. Conteúdo das Abas */}
      <main>
        {/* ABA: PARA DECIDIR */}
        {abaAtiva === "decidir" && (
          <section className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : paraDecidir.length === 0 ? (
              <div className="text-center py-16 px-4 border rounded-xl bg-card shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground">
                  Nenhuma compra aguardando você
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Quando chegar algo novo, aparece aqui e no resumo das 9h e 15h.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {paraDecidir.map((req) => (
                  <CartaoDecisao
                    key={req.id}
                    requisicao={req}
                    onOpenFicha={(r) => setSheetReq(r)}
                    onAprovar={(r) => onAprovar(r)}
                    onRecusar={(r) => setModalRecusaReq(r)}
                    onSelectAnexo={(arq) => handleOpenAnexo(arq, req)}
                    isPending={pendingReqId === req.id}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ABA: EM ANDAMENTO */}
        {abaAtiva === "andamento" && (
          <section>
            <ListaEmAndamento
              lista={emAndamento}
              onOpenFicha={(r) => setSheetReq(r)}
            />
          </section>
        )}

        {/* ABA: HISTÓRICO */}
        {abaAtiva === "historico" && (
          <section>
            <TabelaHistorico
              lista={historico}
              onOpenFicha={(r) => setSheetReq(r)}
            />
          </section>
        )}
      </main>

      {/* 4. Ficha Lateral da Requisição (Sheet) */}
      <FichaRequisicao
        requisicao={sheetReq}
        open={!!sheetReq}
        onClose={() => setSheetReq(null)}
        onAprovar={(r) => {
          onAprovar(r);
          setSheetReq(null);
        }}
        onRecusar={(r) => {
          setModalRecusaReq(r);
        }}
        onSelectAnexo={(arq) => handleOpenAnexo(arq, sheetReq)}
        isPending={pendingReqId === sheetReq?.id}
      />

      {/* 5. Modal de Recusa */}
      <ModalRecusa
        requisicao={modalRecusaReq}
        open={!!modalRecusaReq}
        onClose={() => setModalRecusaReq(null)}
        onConfirmar={(r, motivo) => {
          onRecusar(r, motivo);
          setModalRecusaReq(null);
          setSheetReq(null);
        }}
        isPending={pendingReqId === modalRecusaReq?.id}
      />

      {/* 6. Visualizador de Anexo Integrado */}
      <VisualizadorAnexo
        anexo={modalAnexo}
        requisicao={anexoReqPai}
        onClose={() => {
          setModalAnexo(null);
          setAnexoReqPai(null);
        }}
      />
    </div>
  );
}
