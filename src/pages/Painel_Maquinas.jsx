import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatarDataSemFuso } from "@/utils/date";
import { calcularPontuacaoEquipamento } from "@/utils/eval";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Monitor, 
  Laptop, 
  Cpu, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  History, 
  Clock, 
  Search, 
  ArrowUpDown,
  ShieldAlert,
  ArrowRight,
  TrendingDown
} from "lucide-react";

export default function Painel_Maquinas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("pontuacao"); // "pontuacao" | "tempo_uso"
  const [filterTipo, setFilterTipo] = useState("todos"); // "todos" | "Desktop" | "Notebook" | "Monitor"
  const [filterClassificacao, setFilterClassificacao] = useState("todos"); // "todos" | "Manter" | "Upgrade" | "Substituir" | "sem_avaliacao"

  // Queries
  const { data: pcsInternos = [], isLoading: isLoadingPcs } = useQuery({
    queryKey: ['pcs_internos'],
    queryFn: () => base44.entities.PCs_Internos.list(),
  });

  const { data: notebooksExternos = [], isLoading: isLoadingNbs } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
  });

  const { data: avaliacoes = [], isLoading: isLoadingEvals } = useQuery({
    queryKey: ['portal_avaliacoes'],
    queryFn: () => base44.entities.Avaliacoes.list('-data_avaliacao'),
  });

  const isLoading = isLoadingPcs || isLoadingNbs || isLoadingEvals;

  // Consolidação de Máquinas (Desktop, Notebook, Monitor)
  const maquinasConsolidadas = useMemo(() => {
    const lista = [];

    // Processa PCs Internos
    pcsInternos.forEach(p => {
      if (["Desktop", "Notebook", "Monitor"].includes(p.tipo)) {
        // Encontra a avaliação mais recente
        const evs = avaliacoes.filter(a => a.equipamento_id === p.id);
        const ultimaEval = evs.length > 0 ? evs[0] : null;

        // Calcula a pontuação e classificação usando a avaliação mais recente ou apenas tempo de uso
        let pontuacao = 0;
        let classificacao = "Ainda não avaliado";
        let dataAvaliacao = null;
        let avaliacaoDesatualizada = false;

        if (ultimaEval) {
          const resultado = calcularPontuacaoEquipamento(ultimaEval, p.data_aquisicao);
          pontuacao = resultado.pontuacao_total;
          classificacao = resultado.classificacao;
          dataAvaliacao = ultimaEval.data_avaliacao;

          // Verifica se a avaliação tem mais de 6 meses (180 dias)
          if (ultimaEval.data_avaliacao) {
            const diffMs = new Date() - new Date(ultimaEval.data_avaliacao);
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (diffDays > 180) {
              avaliacaoDesatualizada = true;
            }
          }
        }

        let tempoUsoAnos = 0;
        if (p.data_aquisicao) {
          tempoUsoAnos = (new Date() - new Date(p.data_aquisicao)) / (1000 * 60 * 60 * 24 * 365);
        }

        lista.push({
          id: p.id,
          tipo: p.tipo,
          marca: p.marca,
          modelo: p.modelo,
          etiqueta_interna: p.etiqueta_interna,
          usuario_atual: p.usuario_atual,
          area: p.area || "Setor não definido",
          status: p.status,
          data_aquisicao: p.data_aquisicao,
          tempo_uso_anos: tempoUsoAnos,
          origem: "interno",
          ultimaEval,
          pontuacao,
          classificacao,
          dataAvaliacao,
          avaliacaoDesatualizada
        });
      }
    });

    // Processa Notebooks Externos
    notebooksExternos.forEach(n => {
      const evs = avaliacoes.filter(a => a.equipamento_id === n.id);
      const ultimaEval = evs.length > 0 ? evs[0] : null;

      let pontuacao = 0;
      let classificacao = "Ainda não avaliado";
      let dataAvaliacao = null;
      let avaliacaoDesatualizada = false;

      if (ultimaEval) {
        const resultado = calcularPontuacaoEquipamento(ultimaEval, n.data_aquisicao);
        pontuacao = resultado.pontuacao_total;
        classificacao = resultado.classificacao;
        dataAvaliacao = ultimaEval.data_avaliacao;

        if (ultimaEval.data_avaliacao) {
          const diffMs = new Date() - new Date(ultimaEval.data_avaliacao);
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays > 180) {
            avaliacaoDesatualizada = true;
          }
        }
      }

      let tempoUsoAnos = 0;
      if (n.data_aquisicao) {
        tempoUsoAnos = (new Date() - new Date(n.data_aquisicao)) / (1000 * 60 * 60 * 24 * 365);
      }

      lista.push({
        id: n.id,
        tipo: "Notebook",
        marca: n.marca,
        modelo: n.modelo,
        etiqueta_interna: n.etiqueta_interna,
        usuario_atual: n.usuario_atual,
        area: n.uf || "Setor não definido",
        status: n.status,
        data_aquisicao: n.data_aquisicao,
        tempo_uso_anos: tempoUsoAnos,
        origem: "externo",
        ultimaEval,
        pontuacao,
        classificacao,
        dataAvaliacao,
        avaliacaoDesatualizada
      });
    });

    return lista;
  }, [pcsInternos, notebooksExternos, avaliacoes]);

  // Estatísticas consolidada
  const stats = useMemo(() => {
    const total = maquinasConsolidadas.length;
    const alocados = maquinasConsolidadas.filter(m => m.status === "Em uso").length;
    const disponiveis = maquinasConsolidadas.filter(m => m.status === "Disponível").length;

    const manter = maquinasConsolidadas.filter(m => m.ultimaEval && m.classificacao === "Manter").length;
    const upgrade = maquinasConsolidadas.filter(m => m.ultimaEval && m.classificacao === "Upgrade").length;
    const substituir = maquinasConsolidadas.filter(m => m.ultimaEval && m.classificacao === "Substituir").length;
    const semAvaliacao = maquinasConsolidadas.filter(m => !m.ultimaEval).length;

    // 5 Equipamentos mais antigos em uso
    const maisAntigos = [...maquinasConsolidadas]
      .filter(m => m.status === "Em uso" && m.data_aquisicao)
      .sort((a, b) => new Date(a.data_aquisicao) - new Date(b.data_aquisicao))
      .slice(0, 5);

    return { total, alocados, disponiveis, manter, upgrade, substituir, semAvaliacao, maisAntigos };
  }, [maquinasConsolidadas]);

  // Sugestões de Movimentação Inteligente
  const sugestoesMovimentacao = useMemo(() => {
    const sugestoes = [];
    
    // Filtra máquinas ativas e que precisam de atenção (Substituir ou Upgrade)
    // E cuja avaliação NÃO está desatualizada (há menos de 6 meses)
    const maquinasRuins = maquinasConsolidadas.filter(m => 
      m.status === "Em uso" && 
      m.ultimaEval && 
      (m.classificacao === "Substituir" || m.classificacao === "Upgrade") &&
      !m.avaliacaoDesatualizada
    );

    // Máquinas disponíveis para troca (em estoque)
    const maquinasDisponiveis = maquinasConsolidadas.filter(m => 
      m.status === "Disponível"
    );

    maquinasRuins.forEach(ruim => {
      // Procura equivalentes do mesmo tipo disponíveis em estoque
      const equivalentes = maquinasDisponiveis.filter(disp => disp.tipo === ruim.tipo);

      if (equivalentes.length > 0) {
        // Encontra o melhor equivalente em estoque (menor pontuação de saúde, ou seja, mais saudável)
        // Se um equipamento disponível não tem avaliação (pontuacao === 0), consideramos que ele é novo/zerado e excelente.
        let melhorEquivalente = equivalentes[0];
        equivalentes.forEach(eq => {
          if (eq.pontuacao < melhorEquivalente.pontuacao) {
            melhorEquivalente = eq;
          }
        });

        // Só sugere se a pontuação do disponível for significativamente melhor que a do atual
        // (Ou se o atual é "Substituir" e o disponível é "Manter" ou sem avaliação)
        const diffNotas = ruim.pontuacao - melhorEquivalente.pontuacao;
        
        if (diffNotas > 10 || ruim.classificacao === "Substituir") {
          sugestoes.push({
            urgencia: diffNotas,
            ruim,
            disponivel: melhorEquivalente,
            diffNotas
          });
        }
      }
    });

    // Ordenar sugestões por urgência (maior diferença de notas primeiro)
    return sugestoes.sort((a, b) => b.urgencia - a.urgencia);
  }, [maquinasConsolidadas]);

  // Filtro e Ordenação da Listagem
  const maquinasFiltradas = useMemo(() => {
    return maquinasConsolidadas
      .filter(m => {
        // Busca termo
        const query = searchTerm.toLowerCase();
        const matchSearch = 
          (m.marca || "").toLowerCase().includes(query) ||
          (m.modelo || "").toLowerCase().includes(query) ||
          (m.etiqueta_interna || "").toLowerCase().includes(query) ||
          (m.usuario_atual || "").toLowerCase().includes(query) ||
          (m.area || "").toLowerCase().includes(query);

        // Filtro de Tipo
        const matchTipo = filterTipo === "todos" || m.tipo === filterTipo;

        // Filtro de Classificação
        let matchClass = true;
        if (filterClassificacao !== "todos") {
          if (filterClassificacao === "sem_avaliacao") {
            matchClass = !m.ultimaEval;
          } else {
            matchClass = m.ultimaEval && m.classificacao === filterClassificacao;
          }
        }

        return matchSearch && matchTipo && matchClass;
      })
      .sort((a, b) => {
        if (sortBy === "pontuacao") {
          return b.pontuacao - a.pontuacao; // pior primeiro (maior pontuação = pior saúde)
        } else if (sortBy === "tempo_uso") {
          return b.tempo_uso_anos - a.tempo_uso_anos; // mais antigo primeiro
        }
        return 0;
      });
  }, [maquinasConsolidadas, searchTerm, filterTipo, filterClassificacao, sortBy]);

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-500 to-indigo-600 bg-clip-text text-transparent">
          Painel Geral Inteligente de Máquinas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão unificada do parque de desktops, notebooks e monitores com diagnósticos automáticos e recomendações de troca.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-teal-500" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Carregando dados consolidando do parque...</p>
        </div>
      ) : (
        <>
          {/* CARDS DE KPIS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-xl border-slate-800">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider">Total de Máquinas</p>
                    <p className="text-3xl font-extrabold mt-1">{stats.total}</p>
                  </div>
                  <Cpu className="w-10 h-10 text-teal-500 opacity-80" />
                </div>
                <div className="flex gap-4 mt-4 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <div>
                    <span className="font-semibold text-white">{stats.alocados}</span> Alocados
                  </div>
                  <div>
                    <span className="font-semibold text-white">{stats.disponiveis}</span> Disponíveis
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-emerald-100 bg-emerald-50/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Classificados "Manter"</p>
                    <p className="text-3xl font-bold text-emerald-800 mt-1">{stats.manter}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-emerald-500 opacity-80" />
                </div>
                <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
                  Equipamentos saudáveis e de bom desempenho.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-amber-100 bg-amber-50/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Classificados "Upgrade"</p>
                    <p className="text-3xl font-bold text-amber-800 mt-1">{stats.upgrade}</p>
                  </div>
                  <History className="w-10 h-10 text-amber-500 opacity-80" />
                </div>
                <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
                  Requerem atenção (RAM, SSD ou limpeza).
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-red-100 bg-red-50/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Classificados "Substituir"</p>
                    <p className="text-3xl font-bold text-red-800 mt-1">{stats.substituir}</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-red-500 opacity-80" />
                </div>
                <p className="text-xs text-muted-foreground mt-4 border-t pt-3 flex items-center gap-1">
                  <span className="text-red-600 font-bold">{stats.semAvaliacao}</span> sem avaliação registrada.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* EQUIPAMENTOS MAIS ANTIGOS & SUGESTÕES DE TROCA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* MAIS ANTIGOS */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Mais Antigos em Uso
                </CardTitle>
                <CardDescription className="text-xs">Máquinas prioritárias para modernização ou troca preventiva</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {stats.maisAntigos.map(m => (
                    <div key={m.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 border border-slate-100 transition">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1.5">
                          {m.tipo === "Notebook" ? <Laptop className="w-3.5 h-3.5 text-indigo-500" /> : <Monitor className="w-3.5 h-3.5 text-teal-500" />}
                          {m.marca} {m.modelo}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          Etiqueta: {m.etiqueta_interna || "-"} | Usa: {m.usuario_atual} ({m.area})
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {m.tempo_uso_anos.toFixed(1)} anos
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {stats.maisAntigos.length === 0 && (
                    <p className="text-xs text-center text-slate-400 py-6">Nenhum equipamento em uso encontrado.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SUGESTÕES INTELIGENTES */}
            <Card className="lg:col-span-2 shadow-lg border-teal-100 bg-teal-50/5">
              <CardHeader className="pb-3 border-b border-teal-100/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-teal-900">
                  <TrendingDown className="w-4 h-4 text-teal-600" />
                  Sugestões Inteligentes de Movimentação
                </CardTitle>
                <CardDescription className="text-xs text-teal-700/80">Recomendações automáticas baseadas em avaliações vs. estoque disponível</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 max-h-[340px] overflow-y-auto">
                <div className="space-y-3">
                  {sugestoesMovimentacao.map((sug, i) => (
                    <div key={i} className="p-3 border border-teal-100 rounded-xl bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow transition">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                            {sug.ruim.classificacao} (Nota: {sug.ruim.pontuacao})
                          </Badge>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                            Estoque (Nota: {sug.disponivel.pontuacao})
                          </Badge>
                          <Badge variant="outline" className="ml-auto text-[10px] bg-teal-50/50 border-teal-200 text-teal-700 font-bold">
                            Ganho: +{sug.diffNotas.toFixed(0)} pontos
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-700 font-medium">
                          Substituir o <span className="font-bold">{sug.ruim.tipo}</span> de <span className="font-bold">{sug.ruim.usuario_atual} ({sug.ruim.area})</span> pelo modelo <span className="font-bold">{sug.disponivel.marca} {sug.disponivel.modelo}</span> (Etiqueta: {sug.disponivel.etiqueta_interna}) disponível em estoque.
                        </p>
                      </div>
                    </div>
                  ))}
                  {sugestoesMovimentacao.length === 0 && (
                    <div className="text-center py-10">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto opacity-70 mb-2" />
                      <p className="text-xs text-slate-500 font-medium">Parque de máquinas otimizado! Nenhuma movimentação pendente.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* LISTAGEM CONSOLIDADA */}
          <Card className="shadow-lg">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-base font-bold">Listagem Geral do Parque</CardTitle>
                  <CardDescription className="text-xs">Visualize, filtre e ordene todos os desktops, notebooks e monitores consolidados</CardDescription>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {/* Busca */}
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar marca, modelo, etiqueta..."
                      className="pl-8 text-xs h-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Tipo */}
                  <Select value={filterTipo} onValueChange={setFilterTipo}>
                    <SelectTrigger className="w-[120px] text-xs h-9">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Tipos</SelectItem>
                      <SelectItem value="Desktop">Desktop</SelectItem>
                      <SelectItem value="Notebook">Notebook</SelectItem>
                      <SelectItem value="Monitor">Monitor</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Classificação */}
                  <Select value={filterClassificacao} onValueChange={setFilterClassificacao}>
                    <SelectTrigger className="w-[150px] text-xs h-9">
                      <SelectValue placeholder="Classificação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas Classes</SelectItem>
                      <SelectItem value="Manter">Manter</SelectItem>
                      <SelectItem value="Upgrade">Upgrade</SelectItem>
                      <SelectItem value="Substituir">Substituir</SelectItem>
                      <SelectItem value="sem_avaliacao">Não avaliados</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Ordenação */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px] text-xs h-9">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pontuacao">Pior Pontuação</SelectItem>
                      <SelectItem value="tempo_uso">Mais Antigos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-4">Equipamento</th>
                      <th className="p-4">Etiqueta / Origem</th>
                      <th className="p-4">Uso / Setor</th>
                      <th className="p-4">Tempo de Uso</th>
                      <th className="p-4 text-center">Saúde</th>
                      <th className="p-4">Classificação</th>
                      <th className="p-4">Última Avaliação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {maquinasFiltradas.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-2">
                            {m.tipo === "Notebook" ? <Laptop className="w-4 h-4 text-indigo-500" /> : m.tipo === "Desktop" ? <Cpu className="w-4 h-4 text-slate-500" /> : <Monitor className="w-4 h-4 text-teal-500" />}
                            {m.marca} {m.modelo}
                          </div>
                          <span className="text-[10px] text-slate-400 capitalize">{m.tipo}</span>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-700">{m.etiqueta_interna || "—"}</div>
                          <Badge variant="outline" className="text-[9px] uppercase tracking-wider mt-0.5">
                            {m.origem}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {m.status === "Em uso" ? (
                            <>
                              <div className="font-medium text-slate-800">{m.usuario_atual}</div>
                              <div className="text-[10px] text-slate-400">{m.area}</div>
                            </>
                          ) : (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold">
                              {m.status}
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-700">
                            {m.tempo_uso_anos ? `${m.tempo_uso_anos.toFixed(1)} anos` : "—"}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Adquirido: {m.data_aquisicao ? formatarDataSemFuso(m.data_aquisicao) : "—"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {m.ultimaEval ? (
                            <div className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-800 font-bold border">
                              {m.pontuacao.toFixed(0)}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          {m.ultimaEval ? (
                            <Badge className={
                              m.classificacao === "Manter" ? "bg-green-50 text-green-700 border-green-200" :
                              m.classificacao === "Upgrade" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-red-50 text-red-700 border-red-200"
                            }>
                              {m.classificacao}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 italic">Não avaliado</span>
                          )}
                        </td>
                        <td className="p-4">
                          {m.ultimaEval ? (
                            <div className="space-y-1">
                              <span className="font-medium text-slate-700">
                                {formatarDataSemFuso(m.dataAvaliacao)}
                              </span>
                              {m.avaliacaoDesatualizada && (
                                <div className="flex items-center gap-1 text-[9px] text-red-500 font-bold">
                                  <ShieldAlert className="w-3 h-3" />
                                  Avaliação desatualizada
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {maquinasFiltradas.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                          Nenhum equipamento correspondente aos filtros foi encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
