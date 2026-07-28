import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Monitor, 
  Laptop, 
  Cpu, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Search, 
  ArrowRightLeft,
  ArrowRight,
  TrendingDown,
  User,
  ShieldAlert,
  ArrowDown,
  ArrowUp,
  Clock,
  ChevronDown,
  Wrench,
  Copy,
  LayoutGrid,
  ListFilter,
  SlidersHorizontal,
  ClipboardList,
  CheckSquare,
  Layers
} from "lucide-react";

// Função para gerar iniciais do avatar
function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Retorna cores com base no nome para criar avatares aleatórios harmoniosos
function getAvatarBgColor(name) {
  if (!name) return "bg-slate-200 text-slate-700";
  const colors = [
    "bg-indigo-100 text-indigo-800 border-indigo-200",
    "bg-teal-100 text-teal-800 border-teal-200",
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-blue-100 text-blue-800 border-blue-200",
    "bg-rose-100 text-rose-800 border-rose-200",
    "bg-amber-100 text-amber-800 border-amber-200"
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
}

const COMANDOS_RESOLUCAO_TAREFAS = {
  "Liberar espaço em disco (arquivos temporários, downloads antigos)": {
    tipo: "PowerShell",
    comando: `Remove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue; Clear-RecycleBin -Force -ErrorAction SilentlyContinue`,
    desc: "Limpa pasta TEMP e esvazia Lixeira do Windows silenciosamente."
  },
  "Limpar arquivos temporários do sistema e verificar integridade de arquivos (%temp% e sfc /scannow)": {
    tipo: "CMD (Admin)",
    comando: `sfc /scannow & DISM /Online /Cleanup-Image /RestoreHealth`,
    desc: "Varre e repara arquivos de sistema corrompidos no Windows."
  },
  "Verificar processos consumindo memória RAM em excesso / considerar upgrade de memória": {
    tipo: "PowerShell",
    comando: `Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 -Property Name, @{Name="RAM_MB";Expression={[math]::round($_.WorkingSet64 / 1MB, 1)}}`,
    desc: "Identifica os 10 processos com maior consumo de memória RAM."
  },
  "Investigar consumo de RAM por processos em segundo plano / executar diagnóstico de integridade": {
    tipo: "PowerShell",
    comando: `Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 -Property Name, @{Name="RAM_MB";Expression={[math]::round($_.WorkingSet64 / 1MB, 1)}}`,
    desc: "Exibe top 10 processos em consumo de memória para diagnóstico."
  },
  "Verificar e solicitar instalação/ativação do antivírus corporativo via filial do México": {
    tipo: "Ação de TI",
    comando: `SOLICITACAO_ANTIVIRUS_MEXICO`,
    desc: "Solicitar instalação / ativação do antivírus corporativo à filial do México."
  },
  "Reiniciar a máquina regularmente (uptime muito alto detectado)": {
    tipo: "CMD / PowerShell",
    comando: `shutdown /r /t 60 /c "Reinicializacao programada de manutencao TI"`,
    desc: "Programa o reinício da máquina em 60 segundos com aviso ao usuário."
  },
  "Atualizar para Windows 11 (ou avaliar compatibilidade de hardware)": {
    tipo: "PowerShell",
    comando: `usoclient StartInteractiveScan`,
    desc: "Inicia a busca por atualizações pendentes para o Windows 11."
  },
  "Investigar causa da lentidão ao ligar (inicialização pesada, muitos programas no boot)": {
    tipo: "PowerShell",
    comando: `Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, User`,
    desc: "Lista todos os aplicativos configurados para iniciar com o Windows."
  },
  "Testar placa de rede / atualizar drivers / redefinir pilha TCP/IP e DNS": {
    tipo: "CMD (Admin)",
    comando: `ipconfig /flushdns & netsh int ip reset & netsh winsock reset`,
    desc: "Reseta o cache DNS, protocolo TCP/IP e biblioteca Winsock da rede."
  }
};

export default function Painel_Maquinas() {
  const [activeTab, setActiveTab] = useState("parque"); // "parque" | "demandas"
  const [subFilterDemandas, setSubFilterDemandas] = useState("em_aberto"); // "em_aberto" | "historico"
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos"); // "todos" | "Desktop" | "Notebook"
  const [filterClassificacao, setFilterClassificacao] = useState("todos"); // "todos" | "Manter" | "Upgrade" | "Substituir" | "sem_avaliacao"
  const [criterioOrdenacao, setCriterioOrdenacao] = useState("piores_primeiro");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Modal de confirmação de troca
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null); // { ruim, disponivel }

  const queryClient = useQueryClient();

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

  const { data: colaboradores = [], isLoading: isLoadingColabs } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  const { data: tarefas = [], refetch: refetchTarefas } = useQuery({
    queryKey: ['tarefas_manutencao'],
    queryFn: () => base44.entities.TarefasManutencao.list(),
  });

  const [expandedEquipamentos, setExpandedEquipamentos] = useState({});

  const toggleTarefaMutation = useMutation({
    mutationFn: async ({ id, status, tarefa, maquina }) => {
      await base44.entities.TarefasManutencao.update(id, { status });

      // Sincronização dinâmica no cadastro do ativo
      if (status === "Concluída" && maquina) {
        const descLower = (tarefa?.descricao || "").toLowerCase();
        const payloadUpdate = {};

        if (descLower.includes("antivírus") || descLower.includes("antivirus")) {
          payloadUpdate.antivirus_status = "Ativo";
          payloadUpdate.antivirus = "Ativo (Windows Defender)";
        }

        if (Object.keys(payloadUpdate).length > 0) {
          if (maquina.origem === "interno") {
            await base44.entities.PCs_Internos.update(maquina.id, payloadUpdate);
          } else {
            await base44.entities.Notebooks_Externos.update(maquina.id, payloadUpdate);
          }
        }
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas_manutencao'] });
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
    },
    onError: (err) => {
      console.error("Erro ao atualizar status da tarefa:", err);
      alert("Não foi possível atualizar o status da tarefa. Tente novamente.");
    }
  });

  // Mutação para registrar formatação concluída no histórico do ativo
  const formatarEquipamentoMutation = useMutation({
    mutationFn: async ({ maquina, observacoes }) => {
      const novoHistorico = [...(maquina.historico_formatacoes || [])];
      novoHistorico.push({
        data_formatacao: new Date().toISOString().split('T')[0],
        responsavel: "TI / Administrador",
        observacoes: observacoes || "Formatação preventiva concluída via Painel de Máquinas"
      });

      const payload = {
        data_formatacao: new Date().toISOString().split('T')[0],
        status: maquina.usuario_atual ? "Em uso" : "Disponível",
        condicao: "Excelente",
        antivirus_status: "Ativo",
        historico_formatacoes: novoHistorico
      };

      if (maquina.origem === "interno") {
        await base44.entities.PCs_Internos.update(maquina.id, payload);
      } else {
        await base44.entities.Notebooks_Externos.update(maquina.id, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
      alert("Formatação registrada com sucesso no histórico da máquina!");
    },
    onError: (err) => {
      alert("Erro ao registrar formatação: " + err.message);
    }
  });

  // Mutação para executar a troca direta
  const swapMutation = useMutation({
    mutationFn: async ({ ruim, disponivel }) => {
      // 1. Preparar histórico de usuários anteriores da máquina antiga (ruim)
      const histRuim = [...(ruim.usuarios_anteriores || [])];
      if (ruim.usuario_atual) {
        histRuim.push({
          nome: ruim.usuario_atual,
          data_inicio: ruim.usuario_desde || ruim.data_aquisicao || "",
          data_fim: new Date().toISOString().split('T')[0]
        });
      }

      // 2. Liberar máquina ruim (mudar status para "Formatando" / Disponível e zerar usuário)
      const dataUpdateRuim = {
        status: "Formatando",
        usuario_atual: "",
        colaborador_id: null,
        usuario_desde: "",
        area: "",
        usuarios_anteriores: histRuim
      };

      // 3. Preparar histórico da máquina disponível sugerida
      const histDisp = [...(disponivel.usuarios_anteriores || [])];
      if (disponivel.usuario_atual) {
        histDisp.push({
          nome: disponivel.usuario_atual,
          data_inicio: disponivel.usuario_desde || disponivel.data_aquisicao || "",
          data_fim: new Date().toISOString().split('T')[0]
        });
      }

      // 4. Atribuir máquina disponível ao colaborador anterior do equipamento ruim
      const dataUpdateDisp = {
        status: "Em uso",
        usuario_atual: ruim.usuario_atual,
        colaborador_id: ruim.colaborador_id,
        usuario_desde: new Date().toISOString().split('T')[0],
        area: ruim.area,
        usuarios_anteriores: histDisp
      };

      // Salvar atualizações no Supabase de acordo com as origens
      if (ruim.origem === "interno") {
        await base44.entities.PCs_Internos.update(ruim.id, dataUpdateRuim);
      } else {
        await base44.entities.Notebooks_Externos.update(ruim.id, dataUpdateRuim);
      }

      if (disponivel.origem === "interno") {
        await base44.entities.PCs_Internos.update(disponivel.id, dataUpdateDisp);
      } else {
        await base44.entities.Notebooks_Externos.update(disponivel.id, dataUpdateDisp);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
      queryClient.invalidateQueries({ queryKey: ['portal_avaliacoes'] });
      setShowSwapModal(false);
      setSwapTarget(null);
    },
    onError: (error) => {
      console.error("Erro ao realizar a troca:", error);
      alert("Erro ao realizar a troca: " + (error.message || "Erro desconhecido"));
    }
  });

  const isLoading = isLoadingPcs || isLoadingNbs || isLoadingEvals || isLoadingColabs;

  // Consolidação de Máquinas (Somente Desktop e Notebook, excluindo Monitor)
  const maquinasConsolidadas = useMemo(() => {
    const lista = [];

    // Processa PCs Internos
    pcsInternos.forEach(p => {
      if (["Desktop", "Notebook"].includes(p.tipo)) {
        const evs = avaliacoes.filter(a => a.equipamento_id === p.id);
        const ultimaEval = evs.length > 0 ? evs[0] : null;

        let pontuacao = 0;
        let classificacao = "Ainda não avaliado";
        let dataAvaliacao = null;
        let avaliacaoDesatualizada = false;

        if (ultimaEval) {
          const resultado = calcularPontuacaoEquipamento(ultimaEval, p.data_aquisicao);
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
        if (p.data_aquisicao) {
          tempoUsoAnos = (new Date() - new Date(p.data_aquisicao)) / (1000 * 60 * 60 * 24 * 365);
        }

        const colabInfo = colaboradores.find(c => c.id === p.colaborador_id);

        lista.push({
          id: p.id,
          tipo: p.tipo,
          marca: p.marca,
          modelo: p.modelo,
          etiqueta_interna: p.etiqueta_interna,
          usuario_atual: p.usuario_atual,
          colaborador_id: p.colaborador_id,
          colabInfo,
          area: p.area || colabInfo?.area || "Setor não definido",
          status: p.status,
          data_aquisicao: p.data_aquisicao,
          tempo_uso_anos: tempoUsoAnos,
          usuarios_anteriores: p.usuarios_anteriores || [],
          usuario_desde: p.usuario_desde,
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

      const colabInfo = colaboradores.find(c => c.id === n.colaborador_id);

      lista.push({
        id: n.id,
        tipo: "Notebook",
        marca: n.marca,
        modelo: n.modelo,
        etiqueta_interna: n.etiqueta_interna,
        usuario_atual: n.usuario_atual,
        colaborador_id: n.colaborador_id,
        colabInfo,
        area: n.uf || colabInfo?.area || "Setor não definido",
        status: n.status,
        data_aquisicao: n.data_aquisicao,
        tempo_uso_anos: tempoUsoAnos,
        usuarios_anteriores: n.usuarios_anteriores || [],
        usuario_desde: n.usuario_desde,
        origem: "externo",
        ultimaEval,
        pontuacao,
        classificacao,
        dataAvaliacao,
        avaliacaoDesatualizada
      });
    });

    return lista;
  }, [pcsInternos, notebooksExternos, avaliacoes, colaboradores]);

  // Estatísticas do cabeçalho
  const stats = useMemo(() => {
    // Apenas máquinas em uso
    const emUso = maquinasConsolidadas.filter(m => m.status === "Em uso");
    const total = emUso.length;

    const manter = emUso.filter(m => m.ultimaEval && m.classificacao === "Manter").length;
    const upgrade = emUso.filter(m => m.ultimaEval && m.classificacao === "Upgrade").length;
    const substituir = emUso.filter(m => m.ultimaEval && m.classificacao === "Substituir").length;
    const semAvaliacao = emUso.filter(m => !m.ultimaEval).length;

    return { total, manter, upgrade, substituir, semAvaliacao };
  }, [maquinasConsolidadas]);

  // Disponíveis em Estoque ordenadas pelo critério (mais novo - menor tempo de uso)
  const disponiveisEmEstoque = useMemo(() => {
    return maquinasConsolidadas
      .filter(m => m.status === "Disponível")
      .sort((a, b) => {
        // Sem data de aquisição vai para o fim
        if (!a.data_aquisicao) return 1;
        if (!b.data_aquisicao) return -1;
        return new Date(b.data_aquisicao) - new Date(a.data_aquisicao); // Data mais recente primeiro (mais novo)
      });
  }, [maquinasConsolidadas]);

  // Algoritmo de Sugestão de Troca por item
  const obterMelhorDisponivel = (tipo) => {
    if (tipo === "Monitor") return null; // Monitores não entram na regra de hardware complexo
    return disponiveisEmEstoque.find(d => d.tipo === tipo) || null;
  };

  // Ranking de Máquinas em Uso com Filtros e Ordenação Multi-critério
  const rankingMaquinas = useMemo(() => {
    return maquinasConsolidadas
      .filter(m => {
        if (m.status !== "Em uso") return false;

        const query = searchTerm.toLowerCase();
        const matchSearch = 
          (m.marca || "").toLowerCase().includes(query) ||
          (m.modelo || "").toLowerCase().includes(query) ||
          (m.etiqueta_interna || "").toLowerCase().includes(query) ||
          (m.usuario_atual || "").toLowerCase().includes(query) ||
          (m.area || "").toLowerCase().includes(query);

        const matchTipo = filterTipo === "todos" || m.tipo === filterTipo;

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
        if (criterioOrdenacao === "piores_primeiro") {
          const orderWeight = { "Substituir": 4, "Upgrade": 3, "Manter": 2, "Ainda não avaliado": 1 };
          const weightA = orderWeight[a.classificacao] || 1;
          const weightB = orderWeight[b.classificacao] || 1;
          if (weightA !== weightB) return weightB - weightA;
          return b.pontuacao - a.pontuacao;
        }

        if (criterioOrdenacao === "melhores_primeiro") {
          const orderWeight = { "Manter": 4, "Upgrade": 3, "Substituir": 2, "Ainda não avaliado": 1 };
          const weightA = orderWeight[a.classificacao] || 1;
          const weightB = orderWeight[b.classificacao] || 1;
          if (weightA !== weightB) return weightB - weightA;
          return a.pontuacao - b.pontuacao;
        }

        if (criterioOrdenacao === "avaliacao_antiga_primeiro") {
          if (!a.dataAvaliacao) return 1;
          if (!b.dataAvaliacao) return -1;
          return new Date(a.dataAvaliacao) - new Date(b.dataAvaliacao);
        }

        if (criterioOrdenacao === "avaliacao_recente_primeiro") {
          if (!a.dataAvaliacao) return 1;
          if (!b.dataAvaliacao) return -1;
          return new Date(b.dataAvaliacao) - new Date(a.dataAvaliacao);
        }

        if (criterioOrdenacao === "idade_antiga_primeiro") {
          if (!a.data_aquisicao) return 1;
          if (!b.data_aquisicao) return -1;
          return new Date(a.data_aquisicao) - new Date(b.data_aquisicao);
        }

        return 0;
      });
  }, [maquinasConsolidadas, searchTerm, filterTipo, filterClassificacao, criterioOrdenacao]);

  // Consolidação de Demandas por Avaliação Realizada
  const demandasAvaliacao = useMemo(() => {
    return avaliacoes.map(evalItem => {
      const tarefasDaEval = tarefas.filter(t => t.avaliacao_id === evalItem.id);
      const pendentes = tarefasDaEval.filter(t => t.status === 'Pendente');
      const concluidas = tarefasDaEval.filter(t => t.status === 'Concluída');

      const eq = maquinasConsolidadas.find(m => m.id === evalItem.equipamento_id);
      const colabInfo = colaboradores.find(c => c.id === evalItem.colaborador_id || c.nome_completo === evalItem.usuario_equipamento);

      let pontuacao = 0;
      let classificacao = "Manter";
      if (evalItem) {
        const res = calcularPontuacaoEquipamento(evalItem, eq?.data_aquisicao);
        pontuacao = res.pontuacao_total;
        classificacao = res.classificacao;
      }

      // Demanda em aberto se tiver pelo menos 1 tarefa pendente
      const emAberto = pendentes.length > 0;

      return {
        evalId: evalItem.id,
        evalItem,
        equipamento: eq,
        colaborador: colabInfo,
        usuarioNome: evalItem.usuario_equipamento || colabInfo?.nome_completo || "Colaborador",
        equipamentoNome: evalItem.equipamento_nome || (eq ? `${eq.marca} ${eq.modelo}` : "Equipamento"),
        area: eq?.area || colabInfo?.area || "Setor não informado",
        dataAvaliacao: evalItem.data_avaliacao,
        pontuacao,
        classificacao,
        tarefasDaEval,
        pendentes,
        concluidas,
        emAberto
      };
    }).filter(d => d.tarefasDaEval.length > 0); // Exibe demandas que geraram checklist
  }, [avaliacoes, tarefas, maquinasConsolidadas, colaboradores]);

  // Sugestões Inteligentes de Movimentação do Sistema
  const sugestoesMovimentacao = useMemo(() => {
    const sugestoes = [];

    // 1. Sugestões de Troca de Máquinas (Máquinas com Windows 10 descontinuado ou saúde ruim)
    const maquinasParaTrocar = rankingMaquinas.filter(m => m.classificacao === "Substituir" || (m.versao_windows && m.versao_windows.toLowerCase().includes("windows 10")));

    const maquinasLivresEmEstoque = maquinasConsolidadas.filter(m => m.status === 'Disponível');

    maquinasParaTrocar.forEach(mRuim => {
      // Encontrar máquina disponível do mesmo tipo ou notebook com melhor pontuação técnica
      const melhorEmEstoque = [...maquinasLivresEmEstoque].sort((a, b) => {
        const scoreA = a.pontuacao || 0;
        const scoreB = b.pontuacao || 0;
        return scoreA - scoreB;
      })[0];

      sugestoes.push({
        id: `troca-${mRuim.id}`,
        tipo: 'Troca Recomendada',
        nivel: mRuim.classificacao === "Substituir" ? 'Crítico' : 'Recomendado',
        titulo: `Substituir equipamento de ${mRuim.usuario_atual}`,
        motivo: mRuim.classificacao === "Substituir" 
          ? `Pontuação de saúde técnica baixa (Nota ${mRuim.pontuacao}).`
          : `Equipamento rodando Windows 10 descontinuado.`,
        colaborador: mRuim.usuario_atual,
        area: mRuim.area,
        maquinaAtual: mRuim,
        maquinaSugerida: melhorEmEstoque || null
      });
    });

    // 2. Sugestões de Formatação (Máquinas com queixas de lentidão na avaliação)
    const demandasComLentidao = demandasAvaliacao.filter(d => 
      d.emAberto && d.evalItem?.desempenho && (d.evalItem.desempenho.includes("lento") || d.evalItem.desempenho.includes("Com Problema"))
    );

    demandasComLentidao.forEach(d => {
      sugestoes.push({
        id: `formatar-${d.evalId}`,
        tipo: 'Formatação Recomendada',
        nivel: 'Atenção',
        titulo: `Agendar formatação técnica para ${d.usuarioNome}`,
        motivo: `Usuário relatou desempenho '${d.evalItem.desempenho}' na avaliação. Limpeza de arquivos temporários e reinstalação do SO recomendada.`,
        colaborador: d.usuarioNome,
        area: d.area,
        maquinaAtual: d.equipamento,
        dataAvaliacao: d.dataAvaliacao
      });
    });

    return sugestoes;
  }, [rankingMaquinas, maquinasConsolidadas, demandasAvaliacao]);

  // Função para retornar badge de saúde formatado
  const renderSaudeBadge = (classificacao, pontuacao) => {
    if (classificacao === "Manter") {
      return (
        <div className="flex flex-col items-center">
          <Badge className="bg-green-500 hover:bg-green-600 text-white font-bold text-xs px-2.5 py-0.5">
            Manter
          </Badge>
          <span className="text-[10px] text-slate-500 font-semibold mt-1">Nota {pontuacao}</span>
        </div>
      );
    }
    if (classificacao === "Upgrade") {
      return (
        <div className="flex flex-col items-center">
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-2.5 py-0.5">
            Upgrade
          </Badge>
          <span className="text-[10px] text-slate-500 font-semibold mt-1">Nota {pontuacao}</span>
        </div>
      );
    }
    if (classificacao === "Substituir") {
      return (
        <div className="flex flex-col items-center">
          <Badge className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-2.5 py-0.5">
            Substituir
          </Badge>
          <span className="text-[10px] text-slate-500 font-semibold mt-1">Nota {pontuacao}</span>
        </div>
      );
    }
    return (
      <Badge variant="outline" className="text-slate-400 font-medium text-xs">
        Não Avaliado
      </Badge>
    );
  };

  const handleSugestaoTroca = (ruim, disponivel) => {
    setSwapTarget({ ruim, disponivel });
    setShowSwapModal(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 space-y-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Sincronizando painel consolidado...</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-500 to-indigo-600 bg-clip-text text-transparent">
                Painel de Máquinas & Manutenções
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestão preventiva de saúde do parque técnico e resolução de checklists por demandas de avaliação.
              </p>
            </div>

            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl h-auto flex gap-1 border">
              <TabsTrigger value="parque" className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 transition">
                <Laptop className="w-4 h-4 text-teal-600" />
                Parque de Máquinas ({maquinasConsolidadas.filter(m => m.status === 'Em uso').length})
              </TabsTrigger>
              <TabsTrigger value="demandas" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 transition">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                Demandas por Avaliação ({demandasAvaliacao.filter(d => d.emAberto).length} em aberto)
              </TabsTrigger>
              <TabsTrigger value="sugestoes" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 transition">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                💡 Sugestões Inteligentes ({sugestoesMovimentacao.length})
              </TabsTrigger>
            </TabsList>
          </div>
        <>
          <TabsContent value="parque" className="space-y-6 m-0">
          {/* RESUMO COMPACTO DE SAÚDE (KPIs) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card
              onClick={() => setFilterClassificacao("todos")}
              className={`bg-slate-950 text-white shadow-md border-none flex items-center justify-between p-4 cursor-pointer transition-all hover:scale-[1.02] ${filterClassificacao === "todos" ? "ring-2 ring-indigo-400" : "opacity-90 hover:opacity-100"}`}
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Máquinas Ativas</p>
                <p className="text-2xl font-extrabold mt-0.5">{stats.total}</p>
              </div>
              <Cpu className="w-7 h-7 text-slate-500 opacity-60" />
            </Card>

            <Card
              onClick={() => setFilterClassificacao(v => v === "Substituir" ? "todos" : "Substituir")}
              className={`shadow-sm border-red-100 bg-red-50/10 p-4 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] ${filterClassificacao === "Substituir" ? "ring-2 ring-red-500 bg-red-100/40" : "hover:bg-red-50/30"}`}
            >
              <div>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Substituir</p>
                <p className="text-2xl font-bold text-red-800 mt-0.5">{stats.substituir}</p>
              </div>
              <AlertTriangle className="w-7 h-7 text-red-500 opacity-70" />
            </Card>

            <Card
              onClick={() => setFilterClassificacao(v => v === "Upgrade" ? "todos" : "Upgrade")}
              className={`shadow-sm border-amber-100 bg-amber-50/10 p-4 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] ${filterClassificacao === "Upgrade" ? "ring-2 ring-amber-500 bg-amber-100/40" : "hover:bg-amber-50/30"}`}
            >
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Upgrade</p>
                <p className="text-2xl font-bold text-amber-800 mt-0.5">{stats.upgrade}</p>
              </div>
              <Clock className="w-7 h-7 text-amber-500 opacity-70" />
            </Card>

            <Card
              onClick={() => setFilterClassificacao(v => v === "Manter" ? "todos" : "Manter")}
              className={`shadow-sm border-emerald-100 bg-emerald-50/10 p-4 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] ${filterClassificacao === "Manter" ? "ring-2 ring-emerald-500 bg-emerald-100/40" : "hover:bg-emerald-50/30"}`}
            >
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Manter</p>
                <p className="text-2xl font-bold text-emerald-800 mt-0.5">{stats.manter}</p>
              </div>
              <CheckCircle className="w-7 h-7 text-emerald-500 opacity-70" />
            </Card>

            <Card
              onClick={() => setFilterClassificacao(v => v === "sem_avaliacao" ? "todos" : "sem_avaliacao")}
              className={`shadow-sm border-slate-200 bg-slate-50/50 p-4 flex items-center justify-between col-span-2 md:col-span-1 cursor-pointer transition-all hover:scale-[1.02] ${filterClassificacao === "sem_avaliacao" ? "ring-2 ring-slate-400 bg-slate-200/60" : "hover:bg-slate-100/50"}`}
            >
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sem Avaliação</p>
                <p className="text-2xl font-bold text-slate-700 mt-0.5">{stats.semAvaliacao}</p>
              </div>
              <ShieldAlert className="w-7 h-7 text-slate-400 opacity-70" />
            </Card>
          </div>

          {/* FILTROS E PESQUISA */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por usuário, setor, modelo..."
                  className="pl-8 text-xs h-9 rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex rounded-lg border p-0.5 bg-slate-50 gap-0.5 text-xs">
                <button
                  onClick={() => setFilterTipo("todos")}
                  className={`px-3 py-1 rounded-md transition font-medium ${filterTipo === "todos" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterTipo("Notebook")}
                  className={`px-3 py-1 rounded-md transition font-medium ${filterTipo === "Notebook" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Notebooks
                </button>
                <button
                  onClick={() => setFilterTipo("Desktop")}
                  className={`px-3 py-1 rounded-md transition font-medium ${filterTipo === "Desktop" ? "bg-white shadow-sm text-teal-700" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Desktops
                </button>
              </div>
            </div>

            {/* ORDENAÇÃO E MODO DE EXIBIÇÃO */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Ordenar:</span>
                <select
                  value={criterioOrdenacao}
                  onChange={(e) => setCriterioOrdenacao(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs font-semibold rounded-md border-0 py-1 px-2 focus:ring-1 focus:ring-teal-500 text-slate-800 dark:text-slate-200 cursor-pointer shadow-sm"
                >
                  <option value="piores_primeiro">⚠️ Piores Máquinas Primeiro (Saúde)</option>
                  <option value="melhores_primeiro">✨ Melhores Máquinas Primeiro (Saúde)</option>
                  <option value="avaliacao_antiga_primeiro">🕒 Avaliação Mais Antiga Primeiro</option>
                  <option value="avaliacao_recente_primeiro">📅 Avaliação Mais Recente Primeiro</option>
                  <option value="idade_antiga_primeiro">🖥️ Tempo de Uso (Mais Antigos Primeiro)</option>
                </select>
              </div>

              <div className="flex rounded-lg border p-0.5 bg-slate-50 dark:bg-slate-800 gap-0.5 text-xs">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1.5 ${
                    viewMode === "grid" ? "bg-white shadow-sm text-teal-700 dark:bg-slate-900 dark:text-teal-400" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Exibir em Grid de Cards Visual"
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Cards
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1.5 ${
                    viewMode === "table" ? "bg-white shadow-sm text-teal-700 dark:bg-slate-900 dark:text-teal-400" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Exibir em Tabela Estruturada Densa"
                >
                  <ListFilter className="w-3.5 h-3.5" /> Tabela
                </button>
              </div>
            </div>
          </div>

          {/* RANKING CENTRAL */}
          <div className="space-y-4">
            {rankingMaquinas.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-700">Nenhum equipamento correspondente aos filtros.</p>
                <p className="text-xs text-slate-400 mt-1">Tente ajustar a busca ou os filtros de tipo de hardware.</p>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" : "grid grid-cols-1 gap-4"}>
                {rankingMaquinas.map((m, index) => {
                  const dispSugerido = obterMelhorDisponivel(m.tipo);
                  const tarefasDoEq = tarefas.filter(t => t.equipamento_id === m.id);
                  const tarefasPendentes = tarefasDoEq.filter(t => t.status === 'Pendente');
                  const totalPendentes = tarefasPendentes.length;
                  const isExpanded = !!expandedEquipamentos[m.id];
                  
                  return (
                    <Card key={m.id} className="shadow-sm hover:shadow-md border-slate-200 transition-all duration-200 overflow-hidden flex flex-col justify-between">
                      <div className={viewMode === "grid" ? "p-5 flex flex-col justify-between gap-4 h-full" : "p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"}>
                        {/* Colaborador */}
                        <div className="flex items-center gap-3">
                          {m.colabInfo?.foto_url ? (
                            <img
                              src={m.colabInfo.foto_url}
                              alt={m.usuario_atual}
                              className="w-10 h-10 rounded-full object-cover border"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-xs ${getAvatarBgColor(m.usuario_atual)}`}>
                              {getInitials(m.usuario_atual)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                              {m.usuario_atual || "Compartilhado"}
                            </p>
                            <p className="text-xs text-slate-500 font-medium truncate">
                              {m.area}
                            </p>
                          </div>
                        </div>

                        {/* Ativo */}
                        <div className={`flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 ${viewMode === "grid" ? "w-full" : "max-w-sm"}`}>
                          <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm border flex-shrink-0">
                            {m.tipo === "Notebook" ? (
                              <Laptop className="w-5 h-5 text-indigo-500" />
                            ) : m.tipo === "Desktop" ? (
                              <Cpu className="w-5 h-5 text-teal-500" />
                            ) : (
                              <Monitor className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0 text-xs flex-1">
                            <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {m.marca} {m.modelo}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                              Etiqueta: <span className="font-mono">{m.etiqueta_interna || "—"}</span>
                              {m.tempo_uso_anos ? ` | ${m.tempo_uso_anos.toFixed(1)} anos` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Avaliação e Saúde */}
                        <div className={viewMode === "grid" ? "flex items-center justify-between pt-2 border-t mt-1" : "text-right flex items-center gap-5 md:ml-auto"}>
                          <div className="text-xs text-slate-500 text-left">
                            {m.ultimaEval ? (
                              <>
                                <p className="font-semibold text-slate-700">
                                  Avaliado em {formatarDataSemFuso(m.dataAvaliacao)}
                                </p>
                                {m.avaliacaoDesatualizada && (
                                  <span className="inline-flex items-center gap-1 text-[9px] text-red-500 font-bold mt-0.5">
                                    <ShieldAlert className="w-2.5 h-2.5" />
                                    Mais de 6 meses
                                  </span>
                                )}
                              </>
                            ) : (
                              <p className="text-slate-400 italic">Nunca avaliado</p>
                            )}
                          </div>
                          
                          {/* Badges de Tarefas Pendentes */}
                          {totalPendentes > 0 ? (
                            <Badge className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 text-[10px] px-2 py-0.5 border font-bold flex items-center gap-1 shadow-sm shrink-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                              {totalPendentes} {totalPendentes === 1 ? 'pendência' : 'pendências'}
                            </Badge>
                          ) : tarefasDoEq.length > 0 ? (
                            <Badge className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0.5 border font-bold flex items-center gap-0.5 shadow-sm shrink-0">
                              ✓ Resolvido
                            </Badge>
                          ) : null}

                          {renderSaudeBadge(m.classificacao, m.pontuacao)}

                          {/* Botão de Toggle da Sanfona */}
                          {tarefasDoEq.length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpandedEquipamentos(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                              className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 transition flex items-center justify-center shrink-0 border"
                              title={isExpanded ? "Ocultar checklist" : "Ver checklist de tarefas"}
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-teal-600' : ''}`} />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* CHECKLIST DE TAREFAS (SANFONA EXPANSÍVEL & HISTÓRICO DE MANUTENÇÃO) */}
                      {isExpanded && tarefasDoEq.length > 0 && (
                        <div className="border-t bg-slate-50/50 dark:bg-slate-900/10 p-4 space-y-4">
                          {/* Cabeçalho do Checklist */}
                          <div className="flex items-center justify-between border-b pb-2">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 text-teal-600" />
                              Checklist de Manutenção & Histórico de Resoluções
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Deseja registrar que o equipamento ${m.marca} ${m.modelo} foi formatado hoje? Isso salvará o evento no histórico e restaurará a condição para Excelente.`)) {
                                    formatarEquipamentoMutation.mutate({ maquina: m });
                                  }
                                }}
                                className="h-6 text-[10px] bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold gap-1"
                              >
                                💻 Registrar Formatação Concluída
                              </Button>
                              <span className="text-[10px] text-slate-400 font-semibold font-mono">
                                {tarefasDoEq.filter(t => t.status === 'Concluída').length}/{tarefasDoEq.length} RESOLVIDAS
                              </span>
                            </div>
                          </div>
                          
                          {/* 1. TAREFAS PENDENTES (ATIVAS) */}
                          {(() => {
                            const pendentes = tarefasDoEq.filter(t => t.status === 'Pendente');
                            const concluidas = tarefasDoEq.filter(t => t.status === 'Concluída');

                            return (
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <span>📋 Pendências Ativas no Checklist ({pendentes.length})</span>
                                  </p>

                                  {pendentes.length === 0 ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                                      <p className="text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5">
                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        Nenhuma pendência ativa! Todas as tarefas deste checklist foram resolvidas.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {pendentes.map(t => {
                                        const infoCmd = COMANDOS_RESOLUCAO_TAREFAS[t.descricao];

                                        return (
                                          <div
                                            key={t.id}
                                            className="flex flex-col justify-between p-3 rounded-xl border text-xs bg-white dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-200 hover:border-slate-300 hover:shadow-sm transition"
                                          >
                                            <div className="flex items-start gap-3">
                                              <input
                                                type="checkbox"
                                                checked={false}
                                                onChange={() => {
                                                  toggleTarefaMutation.mutate({
                                                    id: t.id,
                                                    status: 'Concluída',
                                                    tarefa: t,
                                                    maquina: m
                                                  });
                                                }}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                              />
                                              <div className="flex-1 min-w-0">
                                                <p className="font-semibold leading-normal">{t.descricao}</p>
                                                <div className="flex items-center gap-1.5 mt-1.5 text-[9px] font-semibold tracking-wide uppercase">
                                                  <span className={`px-1.5 py-0.5 rounded ${
                                                    t.origem === 'Regra automática' 
                                                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400' 
                                                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                                                  }`}>
                                                    {t.origem}
                                                  </span>
                                                  {t.created_date && (
                                                    <span className="text-slate-400 lowercase">
                                                      gerada em {new Date(t.created_date).toLocaleDateString('pt-BR')}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Botão de Comando Rápido para Resolução Técnica */}
                                            {infoCmd && (
                                              <div className="mt-2 pt-2 border-t flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg">
                                                <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]" title={infoCmd.desc}>
                                                  💡 {infoCmd.desc}
                                                </p>
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(infoCmd.comando);
                                                    alert(`Comando de resolução (${infoCmd.tipo}) copiado:\n\n${infoCmd.comando}\n\nCole no Terminal/PowerShell do computador para executar.`);
                                                  }}
                                                  className="h-6 text-[10px] gap-1 font-semibold border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50"
                                                >
                                                  <Copy className="w-3 h-3" /> Copiar Comando ({infoCmd.tipo})
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* 2. HISTÓRICO DE TAREFAS CONCLUÍDAS / RESOLVIDAS */}
                                {concluidas.length > 0 && (
                                  <div className="border-t pt-3">
                                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                      <span>📜 Histórico de Manutenções & Checklist Resolvidos ({concluidas.length})</span>
                                    </p>
                                    <div className="space-y-2">
                                      {concluidas.map(t => (
                                        <div
                                          key={t.id}
                                          className="flex items-center justify-between p-2.5 rounded-lg border bg-slate-100/60 dark:bg-slate-800/30 border-slate-200 text-xs text-slate-600"
                                        >
                                          <div className="flex items-center gap-2.5">
                                            <input
                                              type="checkbox"
                                              checked={true}
                                              onChange={() => {
                                                toggleTarefaMutation.mutate({
                                                  id: t.id,
                                                  status: 'Pendente',
                                                  tarefa: t,
                                                  maquina: m
                                                });
                                              }}
                                              className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                              title="Desmarcar para reabrir tarefa"
                                            />
                                            <span className="font-medium line-through text-slate-500">{t.descricao}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] px-2 py-0">
                                              ✓ Resolvida
                                            </Badge>
                                            {t.created_date && (
                                              <span className="text-[10px] text-slate-400">
                                                {new Date(t.created_date).toLocaleDateString('pt-BR')}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Seção de Histórico de Formatações da Máquina */}
                          {m.usuarios_anteriores && m.usuarios_anteriores.length > 0 && (
                            <div className="border-t pt-2 mt-2">
                              <p className="text-[11px] font-bold text-slate-500 mb-1">📜 Histórico de Usuários Anteriores:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {m.usuarios_anteriores.map((h, idx) => (
                                  <span key={idx} className="text-[10px] bg-white border px-2 py-0.5 rounded text-slate-600 font-medium">
                                    {h.nome} ({h.data_inicio || '—'} a {h.data_fim || 'Atual'})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* INDICADOR INTELIGENTE DE REAVALIAÇÃO PARA MÁQUINAS UPGRADE COM TAREFAS ZERADAS */}
                      {m.classificacao === "Upgrade" && tarefasDoEq.length > 0 && totalPendentes === 0 && (
                        <div className="border-t bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3 flex items-center gap-2.5 border-emerald-100">
                          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse animate-duration-1000" />
                          <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex-1">
                            💡 Todas as tarefas de manutenção recomendadas foram resolvidas. Sugerimos reavaliar este equipamento para verificar se a nota técnica foi restaurada a "Manter" antes de decidir pelo upgrade físico definitivo.
                          </p>
                        </div>
                      )}

                      {/* SUB-BLOCO DE SUGESTÃO DE TROCA */}
                      {(m.classificacao === "Substituir" || m.classificacao === "Upgrade") && dispSugerido && (
                        <div className="border-t bg-gradient-to-r from-blue-50/50 to-indigo-50/20 dark:from-slate-800/30 dark:to-slate-800/10 px-4 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                              <strong>Sugestão de Upgrade:</strong> {dispSugerido.marca} {dispSugerido.modelo}{" "}
                              <span className="text-[10px] bg-white border px-1.5 py-0.5 rounded font-mono font-medium text-slate-600">
                                {dispSugerido.etiqueta_interna || "Sem etiqueta"}
                              </span>{" "}
                              disponível no estoque (Adquirido em {formatarDataSemFuso(dispSugerido.data_aquisicao)})
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSugestaoTroca(m, dispSugerido)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 h-8 rounded-lg gap-1 flex-shrink-0"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            Sugerir troca com {m.usuario_atual?.split(" ")[0]}
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA 2: DEMANDAS & CHECKLISTS POR AVALIAÇÃO (POR DEMANDA) */}
        <TabsContent value="demandas" className="space-y-6 m-0">
          {/* BARRA DE FILTROS E PESQUISA DE DEMANDAS */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filtrar Status da Demanda:</span>
              <div className="flex rounded-lg border p-0.5 bg-slate-50 dark:bg-slate-800 gap-0.5 text-xs">
                <button
                  onClick={() => setSubFilterDemandas("em_aberto")}
                  className={`px-3 py-1.5 rounded-md transition font-semibold flex items-center gap-1.5 ${
                    subFilterDemandas === "em_aberto" ? "bg-white shadow-sm text-indigo-700 dark:bg-slate-900 dark:text-indigo-400" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  🟢 Checklists Em Aberto ({demandasAvaliacao.filter(d => d.emAberto).length})
                </button>
                <button
                  onClick={() => setSubFilterDemandas("historico")}
                  className={`px-3 py-1.5 rounded-md transition font-semibold flex items-center gap-1.5 ${
                    subFilterDemandas === "historico" ? "bg-white shadow-sm text-emerald-700 dark:bg-slate-900 dark:text-emerald-400" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📜 Histórico de Concluídos ({demandasAvaliacao.filter(d => !d.emAberto).length})
                </button>
              </div>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Pesquisar colaborador ou máquina..."
                className="pl-8 text-xs h-9 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* LISTA DAS DEMANDAS DE AVALIAÇÃO */}
          {(() => {
            const demandasFiltradas = demandasAvaliacao.filter(d => {
              const matchesSub = subFilterDemandas === "em_aberto" ? d.emAberto : !d.emAberto;
              const q = searchTerm.toLowerCase();
              const matchesSearch = !q || d.usuarioNome.toLowerCase().includes(q) || d.equipamentoNome.toLowerCase().includes(q) || d.area.toLowerCase().includes(q);
              return matchesSub && matchesSearch;
            });

            if (demandasFiltradas.length === 0) {
              return (
                <div className="text-center py-16 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-slate-700">
                    {subFilterDemandas === "em_aberto" ? "Nenhuma demanda de checklist em aberto!" : "Nenhum histórico de checklist concluído encontrado."}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Todas as avaliações deste filtro estão com manutenção em dia.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-5">
                {demandasFiltradas.map(d => (
                  <Card key={d.evalId} className="shadow-sm hover:shadow border-slate-200 overflow-hidden rounded-xl">
                    <CardHeader className="bg-slate-50/80 dark:bg-slate-800/40 border-b py-3 px-5">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="flex items-center gap-3">
                          {d.colaborador?.foto_url ? (
                            <img src={d.colaborador.foto_url} alt={d.usuarioNome} className="w-10 h-10 rounded-full object-cover border" />
                          ) : (
                            <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-xs ${getAvatarBgColor(d.usuarioNome)}`}>
                              {getInitials(d.usuarioNome)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-800 dark:text-white">{d.usuarioNome}</p>
                              <Badge variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-600 font-mono">
                                {d.area}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              Equipamento: <strong>{d.equipamentoNome}</strong>
                              {d.dataAvaliacao && ` | Avaliado em ${new Date(d.dataAvaliacao).toLocaleDateString('pt-BR')}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {renderSaudeBadge(d.classificacao, d.pontuacao)}
                          <Badge className={d.emAberto ? "bg-amber-100 text-amber-800 border-amber-200 text-xs px-2.5 py-0.5" : "bg-emerald-100 text-emerald-800 border-emerald-200 text-xs px-2.5 py-0.5"}>
                            {d.emAberto ? `🟢 ${d.pendentes.length} Tarefa(s) Pendente(s)` : `✓ Demanda Concluída (${d.concluidas.length} resolvidas)`}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      {/* PAINEL DE DADOS TÉCNICOS & ANYDESK DA MÁQUINA */}
                      <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Código / Etiqueta</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-200 mt-0.5 block">
                            🏷️ {d.equipamento?.etiqueta_interna || "Sem Etiqueta"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AnyDesk (Acesso Remoto)</span>
                          {d.equipamento?.anydesk_id || d.evalItem?.anydesk_id ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                💻 {d.equipamento?.anydesk_id || d.evalItem?.anydesk_id}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const code = d.equipamento?.anydesk_id || d.evalItem?.anydesk_id;
                                  navigator.clipboard.writeText(code);
                                  alert(`AnyDesk ${code} copiado para a área de transferência!`);
                                }}
                                className="h-5 px-1 text-[10px] text-indigo-700 hover:bg-indigo-100"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Não informado</span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Última Formatação</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                            📅 {d.equipamento?.data_ultima_formatacao ? new Date(d.equipamento.data_ultima_formatacao).toLocaleDateString('pt-BR') : "Não informada"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tempo de Uso do Ativo</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                            ⏳ {d.equipamento?.data_aquisicao ? `${Math.floor((new Date() - new Date(d.equipamento.data_aquisicao))/(1000*60*60*24*365))} ano(s)` : "Não informado"}
                          </span>
                        </div>
                      </div>

                      {/* RESPOSTAS DO QUESTIONÁRIO DA AVALIAÇÃO */}
                      {d.evalItem && (
                        <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 rounded-xl p-3.5 space-y-2 text-xs">
                          <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                            🔍 Respostas Relatadas pelo Colaborador:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                            <p><strong>Desempenho:</strong> {d.evalItem.desempenho || "N/I"}</p>
                            <p><strong>Atende ao trabalho:</strong> {d.evalItem.atende_trabalho || "N/I"}</p>
                            <p><strong>Recomendação:</strong> {d.evalItem.recomendacao_usuario || "N/I"}</p>
                          </div>
                          {d.evalItem.problemas && d.evalItem.problemas.length > 0 && (
                            <div className="pt-1.5 border-t border-amber-200/40">
                              <span className="font-bold text-red-700 dark:text-red-400">Problemas relatados: </span>
                              <span className="text-slate-700 dark:text-slate-300">{d.evalItem.problemas.join(", ")}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* LISTA DE TAREFAS DO CHECKLIST */}
                      <div className="space-y-2 pt-1">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-teal-600" />
                          Checklist de Manutenção & Ações de TI ({d.tarefasDaEval.length}):
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {d.tarefasDaEval.map(t => {
                            const infoCmd = COMANDOS_RESOLUCAO_TAREFAS[t.descricao];

                            return (
                              <div
                                key={t.id}
                                className={`flex flex-col justify-between p-3.5 rounded-xl border text-xs transition ${
                                  t.status === 'Concluída'
                                    ? 'bg-slate-100/60 dark:bg-slate-900/10 border-slate-200/60 opacity-60 line-through text-slate-400'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-200 shadow-sm'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={t.status === 'Concluída'}
                                    onChange={(e) => {
                                      toggleTarefaMutation.mutate({
                                        id: t.id,
                                        status: e.target.checked ? 'Concluída' : 'Pendente',
                                        tarefa: t,
                                        maquina: d.equipamento || { id: d.evalItem.equipamento_id, origem: 'interno' }
                                      });
                                    }}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold leading-relaxed break-words">{t.descricao}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[9px] font-semibold uppercase text-slate-500">
                                        {t.origem}
                                      </span>
                                      {t.created_date && (
                                        <span className="text-[9px] text-slate-400">
                                          • gerada em {new Date(t.created_date).toLocaleDateString('pt-BR')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {infoCmd && t.status !== 'Concluída' && (
                                  <div className="mt-2.5 pt-2 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg gap-2">
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-normal break-words flex-1">
                                      💡 {infoCmd.desc}
                                    </p>
                                    {infoCmd.comando !== 'SOLICITACAO_ANTIVIRUS_MEXICO' ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          navigator.clipboard.writeText(infoCmd.comando);
                                          alert(`Comando copiado (${infoCmd.tipo}):\n\n${infoCmd.comando}`);
                                        }}
                                        className="h-7 text-[10px] gap-1 font-semibold border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 shrink-0"
                                      >
                                        <Copy className="w-3 h-3" /> Copiar ({infoCmd.tipo})
                                      </Button>
                                    ) : (
                                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] shrink-0">
                                        Solicitar à Filial México
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </TabsContent>

        {/* ABA 3: 💡 SUGESTÕES INTELIGENTES DE MOVIMENTAÇÃO */}
        <TabsContent value="sugestoes" className="space-y-6 m-0">
          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-lg">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  Sugestões Inteligentes de Movimentação & Manutenção
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Análises automáticas baseadas em tempo de uso, pontuação técnica de saúde e queixas relatadas.
                </p>
              </div>
            </div>
            <Badge className="bg-amber-200 text-amber-900 border-amber-300 font-bold text-xs">
              {sugestoesMovimentacao.length} Recomendações
            </Badge>
          </div>

          {sugestoesMovimentacao.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-700">Parque técnico em perfeito estado!</p>
              <p className="text-xs text-slate-400 mt-1">Nenhuma necessidade urgente de troca ou formatação identificada no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sugestoesMovimentacao.map(s => (
                <Card key={s.id} className="shadow-sm hover:shadow border-slate-200 overflow-hidden">
                  <CardHeader className="bg-slate-50 dark:bg-slate-800/40 py-3 px-4 border-b">
                    <div className="flex items-center justify-between">
                      <Badge className={s.nivel === 'Crítico' ? "bg-red-100 text-red-800 border-red-200" : "bg-amber-100 text-amber-800 border-amber-200"}>
                        {s.tipo} • {s.nivel}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-mono font-medium">{s.area}</span>
                    </div>
                    <CardTitle className="text-sm font-bold mt-2 text-slate-800 dark:text-white">
                      {s.titulo}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 text-xs">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      💡 <strong>Motivo da Análise:</strong> {s.motivo}
                    </p>

                    {s.tipo === 'Troca Recomendada' && s.maquinaSugerida && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
                          <span>📦 Ativo em Estoque Recomendado para Atribuir:</span>
                          <Badge className="bg-emerald-600 text-white text-[10px]">
                            Disponível
                          </Badge>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          <strong>Modelo:</strong> {s.maquinaSugerida.marca} {s.maquinaSugerida.modelo} (Etiqueta: {s.maquinaSugerida.etiqueta_interna || "—"})
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleSugestaoTroca(s.maquinaAtual, s.maquinaSugerida)}
                          className="w-full mt-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-lg gap-1.5"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Efetuar Troca Direta com {s.colaborador?.split(" ")[0]}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        </>
      </Tabs>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE TROCA */}
      <Dialog open={showSwapModal} onOpenChange={setShowSwapModal}>
        <DialogContent className="rounded-2xl max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-600 animate-spin" style={{ animationDuration: '4s' }} />
              Confirmar Substituição de Equipamento
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-xs text-slate-500">
              Você está prestes a transferir o colaborador <strong>{swapTarget?.ruim.usuario_atual}</strong> para uma máquina com melhor pontuação técnica em estoque. Os históricos de ambos os equipamentos serão atualizados automaticamente.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-9 gap-2 items-center text-xs">
              {/* Máquina Antiga */}
              <div className="md:col-span-4 border border-red-200 bg-red-50/10 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-red-700">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Máquina Antiga (Liberar)
                </div>
                <div className="space-y-1 text-slate-700">
                  <p><strong>Tipo:</strong> {swapTarget?.ruim.tipo}</p>
                  <p><strong>Modelo:</strong> {swapTarget?.ruim.marca} {swapTarget?.ruim.modelo}</p>
                  <p><strong>Etiqueta:</strong> {swapTarget?.ruim.etiqueta_interna || "—"}</p>
                  <p><strong>Nota de Saúde:</strong> <span className="font-bold text-red-600">{swapTarget?.ruim.pontuacao}</span> ({swapTarget?.ruim.classificacao})</p>
                </div>
              </div>

              {/* Ícone de Direção */}
              <div className="md:col-span-1 flex justify-center text-slate-400">
                <ArrowRight className="w-6 h-6 hidden md:block" />
                <ArrowDown className="w-6 h-6 md:hidden" />
              </div>

              {/* Máquina Nova */}
              <div className="md:col-span-4 border border-emerald-200 bg-emerald-50/10 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Máquina Nova (Atribuir)
                </div>
                <div className="space-y-1 text-slate-700">
                  <p><strong>Tipo:</strong> {swapTarget?.disponivel.tipo}</p>
                  <p><strong>Modelo:</strong> {swapTarget?.disponivel.marca} {swapTarget?.disponivel.modelo}</p>
                  <p><strong>Etiqueta:</strong> {swapTarget?.disponivel.etiqueta_interna || "—"}</p>
                  <p><strong>Uso Anterior:</strong> {swapTarget?.disponivel.usuarios_anteriores.length} colaboradores</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-3 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <p>📍 <strong>Destino do Colaborador:</strong> {swapTarget?.ruim.usuario_atual} ({swapTarget?.ruim.area})</p>
              <p>📦 <strong>Status da Máquina Antiga:</strong> Será liberada para estoque como <strong>"Disponível"</strong>.</p>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                setShowSwapModal(false);
                setSwapTarget(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={swapMutation.isPending}
              onClick={() => swapMutation.mutate({ ruim: swapTarget.ruim, disponivel: swapTarget.disponivel })}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5"
            >
              {swapMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirmar Substituição
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Icone Check que faltou no import acima
function Check(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
