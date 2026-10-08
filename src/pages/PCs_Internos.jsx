import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Plus, Pencil, Trash2, Monitor, Search, Users, List, UserPlus, UserMinus,
  Laptop, Cpu, ShieldAlert, AlertTriangle, RefreshCw, Box, CheckCircle2,
  Building2, LayoutGrid, SlidersHorizontal, ArrowRightLeft, FileSpreadsheet, ChevronDown, Filter, RotateCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EquipamentoForm from "../components/equipamentos/EquipamentoForm";
import EquipamentoDetalhes from "../components/equipamentos/EquipamentoDetalhes";
import { useAuth } from "@/lib/AuthContext";
import { extrairAnyDesk } from "@/utils/eval";
import { formatarDataSemFuso, formatarDataHoraSemFuso } from "@/utils/date";
import * as XLSX from "xlsx";

function calcTempoUso(acquisitionDate) {
  if (!acquisitionDate) return "—";
  const today = new Date();
  const acquisition = new Date(acquisitionDate);
  if (isNaN(acquisition.getTime())) return "—";
  const diffDays = Math.ceil(Math.abs(today - acquisition) / (1000 * 60 * 60 * 24));
  if (diffDays < 30) return diffDays === 1 ? "1 dia" : `${diffDays} dias`;
  if (diffDays < 365) { const m = Math.floor(diffDays / 30); return m === 1 ? "1 mês" : `${m} meses`; }
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  return months === 0 ? `${years} ano${years > 1 ? 's' : ''}` : `${years} ano${years > 1 ? 's' : ''} e ${months} mês${months > 1 ? 'es' : ''}`;
}

function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getTypeIcon(tipo) {
  const t = tipo?.toLowerCase() || "";
  if (t.includes("notebook") || t.includes("laptop")) {
    return <Laptop className="w-4 h-4 text-indigo-600" />;
  }
  if (t.includes("monitor") || t.includes("tela")) {
    return <Monitor className="w-4 h-4 text-blue-600" />;
  }
  return <Cpu className="w-4 h-4 text-emerald-600" />;
}

export function calcFormatacaoInfo(eq) {
  const isMonitor = (eq.tipo || "").toLowerCase().includes("monitor") || (eq.modelo || "").toLowerCase().includes("monitor");
  if (isMonitor) {
    return { status: "nao_se_aplica", label: "Não se aplica", badgeClass: "text-slate-400 italic", diasRestantes: null, data: null };
  }

  const dataFormat = eq.data_formatacao || (Array.isArray(eq.historico_formatacoes) && eq.historico_formatacoes[0]?.data_formatacao) || null;
  if (!dataFormat) {
    return { status: "sem_registro", label: "Sem registro", badgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-bold", diasRestantes: null, data: null };
  }

  const dt = new Date(dataFormat);
  if (isNaN(dt.getTime())) {
    return { status: "sem_registro", label: "Data inválida", badgeClass: "bg-rose-100 text-rose-800 border-rose-300", diasRestantes: null, data: null };
  }

  const proxima = new Date(dt);
  proxima.setMonth(proxima.getMonth() + 30);
  const diffDays = Math.round((proxima - new Date()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: "atrasado",
      label: `Vencida há ${Math.abs(diffDays)}d`,
      badgeClass: "bg-red-100 text-red-800 border-red-300 font-bold",
      diasRestantes: diffDays,
      data: dataFormat,
      proximaData: proxima.toISOString().split("T")[0]
    };
  }
  if (diffDays <= 60) {
    return {
      status: "atencao",
      label: `Vence em ${diffDays}d`,
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
      diasRestantes: diffDays,
      data: dataFormat,
      proximaData: proxima.toISOString().split("T")[0]
    };
  }
  return {
    status: "ok",
    label: `Em dia (${diffDays}d)`,
    badgeClass: "bg-emerald-100 text-emerald-800",
    diasRestantes: diffDays,
    data: dataFormat,
    proximaData: proxima.toISOString().split("T")[0]
  };
}

export function calcVidaUtilInfo(eq) {
  if (!eq.data_aquisicao) {
    return { status: "sem_registro", label: "Sem aquisição", badgeClass: "bg-slate-100 text-slate-600", diasRestantes: null, data: null };
  }

  const dt = new Date(eq.data_aquisicao);
  if (isNaN(dt.getTime())) {
    return { status: "sem_registro", label: "Data inválida", badgeClass: "bg-slate-100 text-slate-600", diasRestantes: null, data: null };
  }

  const fimVida = new Date(dt);
  fimVida.setFullYear(fimVida.getFullYear() + 5);
  const diffDays = Math.round((fimVida - new Date()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: "atrasado",
      label: `Vencida há ${Math.abs(diffDays)}d`,
      badgeClass: "bg-purple-100 text-purple-800 border-purple-300 font-bold",
      diasRestantes: diffDays,
      data: eq.data_aquisicao,
      fimVidaData: fimVida.toISOString().split("T")[0]
    };
  }
  if (diffDays <= 90) {
    return {
      status: "atencao",
      label: `Vence em ${diffDays}d`,
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
      diasRestantes: diffDays,
      data: eq.data_aquisicao,
      fimVidaData: fimVida.toISOString().split("T")[0]
    };
  }
  return {
    status: "ok",
    label: `OK (${diffDays}d rest.)`,
    badgeClass: "bg-emerald-100 text-emerald-800",
    diasRestantes: diffDays,
    data: eq.data_aquisicao,
    fimVidaData: fimVida.toISOString().split("T")[0]
  };
}

function getAttentionAlerts(eq) {
  const alerts = [];
  const statusStr = (eq.status || "").toLowerCase();
  const condicaoStr = (eq.condicao || "").toLowerCase();
  const antivirusStr = (eq.antivirus_status || eq.antivirus || "").toLowerCase();

  // 1. Condição / Manutenção
  if (condicaoStr.includes("problema") || condicaoStr.includes("danificado") || statusStr.includes("danificado")) {
    alerts.push({ key: "danificado", label: "Equipamento Com Problema", color: "bg-red-100 text-red-800 border-red-200" });
  } else if (statusStr.includes("manutenção") || statusStr.includes("manutencao")) {
    alerts.push({ key: "manutencao", label: "Em Manutenção", color: "bg-amber-100 text-amber-800 border-amber-200" });
  }

  // 2. Antivírus (ESET é o oficial; Monitores não possuem SO)
  const isMonitor = (eq.tipo || "").toLowerCase().includes("monitor") || (eq.modelo || "").toLowerCase().includes("monitor");
  const hasEset = (eq.antivirus_nome || "").toLowerCase().includes("eset") || eq.antivirus === "Sim";
  if (!isMonitor && !hasEset) {
    if (antivirusStr.includes("desatualizado") || antivirusStr.includes("vencido") || antivirusStr.includes("inativo") || eq.antivirus === "Não") {
      alerts.push({ key: "antivirus", label: "Sem Antivírus", color: "bg-rose-100 text-rose-900 border-rose-200" });
    }
  }

  // 3. Formatação Periódica (30 meses)
  const fmt = calcFormatacaoInfo(eq);
  if (fmt.status === "atrasado") {
    alerts.push({ key: "formatacao_vencida", label: `Formatação Vencida (${Math.abs(fmt.diasRestantes)}d)`, color: "bg-red-100 text-red-800 border-red-300 font-bold" });
  } else if (fmt.status === "atencao") {
    alerts.push({ key: "formatacao_breve", label: `Formatar em Breve (${fmt.diasRestantes}d)`, color: "bg-amber-100 text-amber-800 border-amber-300 font-bold" });
  } else if (fmt.status === "sem_registro") {
    alerts.push({ key: "formatacao_sem_reg", label: "Formatação Não Registrada", color: "bg-orange-100 text-orange-900 border-orange-200" });
  }

  // 4. Vida Útil (5 anos)
  const vu = calcVidaUtilInfo(eq);
  if (vu.status === "atrasado") {
    alerts.push({ key: "vida_util_vencida", label: `Vida Útil Vencida (${Math.abs(vu.diasRestantes)}d)`, color: "bg-purple-100 text-purple-800 border-purple-300 font-bold" });
  } else if (vu.status === "atencao") {
    alerts.push({ key: "vida_util_breve", label: `Vida Útil a Vencer (${vu.diasRestantes}d)`, color: "bg-amber-100 text-amber-800 border-amber-300 font-bold" });
  }

  return alerts;
}

export default function PCs_Internos() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // Modos de Exibição
  const [viewMode, setViewMode] = useState("grouped"); // "grouped" | "table" | "cards"

  // Filtros Rápido & Busca
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [filterFormatacao, setFilterFormatacao] = useState("all");
  const [filterVidaUtil, setFilterVidaUtil] = useState("all");
  const [filterAntivirus, setFilterAntivirus] = useState("all");

  // Modais
  const [showForm, setShowForm] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState(null);
  const [selectedEquipamento, setSelectedEquipamento] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [equipmentToTransfer, setEquipmentToTransfer] = useState(null);
  const [newUserName, setNewUserName] = useState("");
  const [selectedAvailableEquipment, setSelectedAvailableEquipment] = useState("");

  const queryClient = useQueryClient();

  // Queries
  const { data: equipamentos = [], isLoading } = useQuery({
    queryKey: ['pcs_internos'],
    queryFn: () => base44.entities.PCs_Internos.list('-created_date'),
    staleTime: 30000,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list(),
    staleTime: 30000,
  });

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['avaliacoes'],
    queryFn: () => base44.entities.Avaliacoes.list('-data_avaliacao'),
    staleTime: 30000,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PCs_Internos.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      setShowForm(false);
      setEditingEquipamento(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PCs_Internos.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      setShowForm(false);
      setEditingEquipamento(null);
      setShowTransferModal(false);
      setShowAssignModal(false);
      setEquipmentToTransfer(null);
      setSelectedUser(null);
      setNewUserName("");
      setSelectedAvailableEquipment("");
    },
    onError: (error) => {
      console.error("❌ Erro ao atualizar equipamento:", error);
      alert("Erro ao salvar equipamento: " + (error.message || "Erro desconhecido"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PCs_Internos.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
    },
  });

  const handleSubmit = (data) => {
    if (editingEquipamento) {
      updateMutation.mutate({ id: editingEquipamento.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (equipamento) => {
    setEditingEquipamento(equipamento);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm("Tem certeza que deseja excluir este equipamento?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleConfirmarDevolucao = async (equipment) => {
    if (!confirm(`Confirmar devolução do equipamento ${equipment.marca} ${equipment.modelo} (${equipment.etiqueta_interna || 'sem etiqueta'}) de ${equipment.usuario_atual || 'usuário atual'}? O equipamento retornará ao estoque como "Disponível".`)) {
      return;
    }

    const usuariosAnteriores = [...(equipment.usuarios_anteriores || [])];
    if (equipment.usuario_atual) {
      usuariosAnteriores.push({
        nome: equipment.usuario_atual,
        data_inicio: (equipment.usuario_desde && String(equipment.usuario_desde).trim()) || (equipment.data_aquisicao && String(equipment.data_aquisicao).trim()) || null,
        data_fim: new Date().toISOString().split('T')[0]
      });
    }

    updateMutation.mutate({
      id: equipment.id,
      data: {
        usuario_atual: "",
        colaborador_id: null,
        usuario_desde: null,
        area: "",
        status: "Disponível",
        usuarios_anteriores: usuariosAnteriores
      }
    });
  };

  const handleTransferEquipment = (equipment, currentUser) => {
    setEquipmentToTransfer(equipment);
    setSelectedUser(currentUser);
    setNewUserName("");
    setShowTransferModal(true);
  };

  const handleAssignEquipment = (userName) => {
    setSelectedUser(userName);
    setShowAssignModal(true);
  };

  const executeTransfer = async () => {
    if (!newUserName || !equipmentToTransfer) return;

    const usuariosAnteriores = [...(equipmentToTransfer.usuarios_anteriores || [])];
    
    if (equipmentToTransfer.usuario_atual) {
      usuariosAnteriores.push({
        nome: equipmentToTransfer.usuario_atual,
        data_inicio: (equipmentToTransfer.usuario_desde && String(equipmentToTransfer.usuario_desde).trim()) || (equipmentToTransfer.data_aquisicao && String(equipmentToTransfer.data_aquisicao).trim()) || null, 
        data_fim: new Date().toISOString().split('T')[0]
      });
    }

    const isDisponivel = newUserName === "Disponível";
    const novoColaborador = colaboradores.find(c => c.nome_completo === newUserName);

    const dadosAtualizados = isDisponivel ? {
      usuario_atual: "",
      colaborador_id: null,
      usuario_desde: null,
      area: "",
      status: "Disponível",
      usuarios_anteriores: usuariosAnteriores
    } : {
      usuario_atual: newUserName,
      colaborador_id: novoColaborador?.id || null,
      usuario_desde: new Date().toISOString().split('T')[0],
      area: novoColaborador?.area || "",
      status: "Em uso",
      usuarios_anteriores: usuariosAnteriores
    };

    updateMutation.mutate({
      id: equipmentToTransfer.id,
      data: dadosAtualizados
    });
  };

  const executeAssign = () => {
    if (!selectedAvailableEquipment || !selectedUser) return;

    const equipment = equipamentos.find(e => e.id === selectedAvailableEquipment);
    if (!equipment) return;

    const usuariosAnteriores = equipment.usuarios_anteriores || [];
    if (equipment.usuario_atual) {
      usuariosAnteriores.push({
        nome: equipment.usuario_atual,
        data_inicio: (equipment.usuario_desde && String(equipment.usuario_desde).trim()) || (equipment.data_aquisicao && String(equipment.data_aquisicao).trim()) || null,
        data_fim: new Date().toISOString().split('T')[0]
      });
    }

    const colaborador = colaboradores.find(c => c.nome_completo === selectedUser);

    updateMutation.mutate({
      id: selectedAvailableEquipment,
      data: {
        usuario_atual: selectedUser,
        colaborador_id: colaborador?.id || null,
        usuario_desde: new Date().toISOString().split('T')[0],
        area: colaborador?.area || "",
        status: "Em uso",
        usuarios_anteriores: usuariosAnteriores
      }
    });
  };

  // Áreas Dinâmicas para Filtro
  const areasList = useMemo(() => {
    const set = new Set();
    equipamentos.forEach(e => e.area && set.add(e.area));
    colaboradores.forEach(c => c.area && set.add(c.area));
    return Array.from(set).sort();
  }, [equipamentos, colaboradores]);

  // Filtragem Geral de Equipamentos
  const filteredEquipamentos = useMemo(() => {
    return equipamentos.filter(eq => {
      // Busca
      const matchSearch =
        !searchTerm ||
        eq.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.usuario_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.etiqueta_interna?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.numero_serie?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "em_uso" && eq.status === "Em uso") ||
        (filterStatus === "disponivel" && (eq.status === "Disponível" || !eq.usuario_atual)) ||
        (filterStatus === "manutencao" && eq.status === "Manutenção") ||
        (filterStatus === "aguardando_devolucao" && eq.status === "Aguardando Devolução") ||
        (filterStatus === "danificado" && (eq.condicao === "Com Problema" || eq.status === "Danificado"));

      // Tipo
      const matchTipo = filterTipo === "all" || eq.tipo === filterTipo;

      // Área
      const matchArea = filterArea === "all" || eq.area === filterArea;

      // Antivírus
      const isMonitor = (eq.tipo || "").toLowerCase().includes("monitor") || (eq.modelo || "").toLowerCase().includes("monitor");
      const hasEsetEq = eq.antivirus === "Sim" || (eq.antivirus_nome || "").toLowerCase().includes("eset");
      const matchAntivirus =
        filterAntivirus === "all" ||
        (filterAntivirus === "com_antivirus" && hasEsetEq) ||
        (filterAntivirus === "sem_antivirus" && !isMonitor && !hasEsetEq);

      // Formatação (30 meses)
      const fmt = calcFormatacaoInfo(eq);
      const matchFormatacao =
        filterFormatacao === "all" ||
        (filterFormatacao === "ok" && fmt.status === "ok") ||
        (filterFormatacao === "atencao" && fmt.status === "atencao") ||
        (filterFormatacao === "atrasado" && fmt.status === "atrasado") ||
        (filterFormatacao === "sem_registro" && fmt.status === "sem_registro");

      // Vida Útil (5 anos)
      const vu = calcVidaUtilInfo(eq);
      const matchVidaUtil =
        filterVidaUtil === "all" ||
        (filterVidaUtil === "ok" && vu.status === "ok") ||
        (filterVidaUtil === "atencao" && vu.status === "atencao") ||
        (filterVidaUtil === "atrasado" && vu.status === "atrasado") ||
        (filterVidaUtil === "sem_registro" && vu.status === "sem_registro");

      return matchSearch && matchStatus && matchTipo && matchArea && matchAntivirus && matchFormatacao && matchVidaUtil;
    });
  }, [equipamentos, searchTerm, filterStatus, filterTipo, filterArea, filterAntivirus, filterFormatacao, filterVidaUtil]);

  // Agrupamento por Usuário
  const userGroups = useMemo(() => {
    const groupsMap = new Map();

    filteredEquipamentos.forEach(eq => {
      let uName;
      if (!eq.colaborador_id && eq.area) {
        uName = `Compartilhado — ${eq.area}`;
      } else {
        uName = eq.usuario_atual?.trim() || "Estoque / Sem Usuário";
      }

      if (!groupsMap.has(uName)) {
        const isCompartilhado = uName.startsWith("Compartilhado — ");
        const colabObj = !isCompartilhado ? colaboradores.find(c => c.nome_completo === uName) : null;
        groupsMap.set(uName, {
          usuario: uName,
          colaborador: colabObj,
          area: isCompartilhado ? eq.area : (colabObj?.area || eq.area || "-"),
          cargo: isCompartilhado ? "Equipamento Compartilhado" : (colabObj?.cargo || "Colaborador"),
          items: [],
          desktops: [],
          monitores: [],
          notebooks: [],
          outros: []
        });
      }

      const g = groupsMap.get(uName);
      g.items.push(eq);
      const t = (eq.tipo || "").toLowerCase();
      if (t.includes("desktop")) g.desktops.push(eq);
      else if (t.includes("monitor")) g.monitores.push(eq);
      else if (t.includes("notebook")) g.notebooks.push(eq);
      else g.outros.push(eq);
    });

    return Array.from(groupsMap.values()).sort((a, b) => {
      if (a.usuario === "Estoque / Sem Usuário") return 1;
      if (b.usuario === "Estoque / Sem Usuário") return -1;
      return a.usuario.localeCompare(b.usuario);
    });
  }, [filteredEquipamentos, colaboradores]);

  // Equipamentos Disponíveis no Estoque
  const availableEquipments = useMemo(() => {
    return equipamentos.filter(e => (!e.usuario_atual || e.usuario_atual.trim() === "" || e.status === "Disponível") && !(!e.colaborador_id && e.area));
  }, [equipamentos]);

  // KPIs
  const stats = useMemo(() => {
    const computadores = equipamentos.filter(e => {
      const t = (e.tipo || "").toLowerCase();
      return !t.includes("monitor");
    });

    const formatacaoAtrasada = computadores.filter(e => calcFormatacaoInfo(e).status === "atrasado" || calcFormatacaoInfo(e).status === "sem_registro").length;
    const formatacaoAtencao = computadores.filter(e => calcFormatacaoInfo(e).status === "atencao").length;
    const vidaUtilVencida = equipamentos.filter(e => calcVidaUtilInfo(e).status === "atrasado").length;
    const vidaUtilAtencao = equipamentos.filter(e => calcVidaUtilInfo(e).status === "atencao").length;
    const semAntivirus = computadores.filter(e => e.antivirus !== "Sim" && !(e.antivirus_nome || "").toLowerCase().includes("eset")).length;

    return {
      total: equipamentos.length,
      emUso: equipamentos.filter(e => e.status === "Em uso" && e.usuario_atual).length,
      disponiveis: equipamentos.filter(e => e.status === "Disponível" || !e.usuario_atual).length,
      manutencaoEProblema: equipamentos.filter(e => e.status === "Manutenção" || e.condicao === "Com Problema" || e.condicao === "Danificado").length,
      totalComputadores: computadores.length,
      semAntivirus,
      formatacaoAtrasada,
      formatacaoAtencao,
      vidaUtilVencida,
      vidaUtilAtencao,
    };
  }, [equipamentos]);

  // Exportação para Excel (.xlsx) com TODOS os campos cadastrados e enriquecidos
  const mapEquipamentoParaExcel = (eq) => {
    const colab = colaboradores.find(c => c.id === eq.colaborador_id || (eq.usuario_atual && c.nome_completo === eq.usuario_atual));
    const ultimaAvaliacao = avaliacoes.find(a => a.equipamento_id === eq.id);

    const isCompartilhado = !eq.colaborador_id && eq.area;
    const modoAtribuicao = isCompartilhado
      ? 'Setor Compartilhado'
      : (eq.usuario_atual?.trim() ? 'Colaborador Específico' : 'Disponível / Estoque');

    const dataFormatacao = eq.data_formatacao ||
      (Array.isArray(eq.historico_formatacoes) && eq.historico_formatacoes[0]?.data_formatacao) || null;

    const histFormat = Array.isArray(eq.historico_formatacoes) && eq.historico_formatacoes.length > 0
      ? eq.historico_formatacoes.map(f => `${formatarDataSemFuso(f.data_formatacao)}${f.observacoes ? ' (' + f.observacoes + ')' : ''}`).join('; ')
      : 'Nenhuma';

    const histUsuarios = Array.isArray(eq.usuarios_anteriores) && eq.usuarios_anteriores.length > 0
      ? eq.usuarios_anteriores.map(u => `${u.nome || 'Usuário'} (${formatarDataSemFuso(u.data_inicio)} → ${u.data_fim ? formatarDataSemFuso(u.data_fim) : 'Atual'})`).join('; ')
      : 'Nenhum';

    const anydeskVal = extrairAnyDesk(eq) || extrairAnyDesk(ultimaAvaliacao) || 'Não informado';
    
    let soVal = '—';
    if (eq.versao_windows) {
      soVal = eq.versao_windows.split('|')[0].trim();
    } else if (ultimaAvaliacao?.versao_windows) {
      soVal = ultimaAvaliacao.versao_windows.split('|')[0].trim();
    }

    return {
      "Tipo": eq.tipo || '—',
      "Etiqueta Interna": eq.etiqueta_interna || '—',
      "Service Tag / Serial Number": eq.service_tag || eq.numero_serie || '—',
      "Marca": eq.marca || '—',
      "Modelo": eq.modelo || '—',
      "Processador": eq.processador || '—',
      "Nota Fiscal": eq.nota_fiscal || '—',
      "Valor (R$)": eq.valor != null && !isNaN(Number(eq.valor)) ? Number(eq.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—',
      "Data de Aquisição": eq.data_aquisicao ? formatarDataSemFuso(eq.data_aquisicao) : '—',
      "Tempo de Uso": calcTempoUso(eq.data_aquisicao) || eq.tempo_uso || '—',
      "Status": eq.status || 'Disponível',
      "Modo de Atribuição": modoAtribuicao,
      "Usuário / Responsável Atual": eq.usuario_atual || (isCompartilhado ? `Compartilhado — ${eq.area}` : 'Estoque / Sem Usuário'),
      "Usuário Desde": eq.usuario_desde ? formatarDataSemFuso(eq.usuario_desde) : '—',
      "Área / Setor": eq.area || colab?.area || '—',
      "E-mail do Colaborador": colab?.email || '—',
      "Cargo do Colaborador": colab?.cargo || '—',
      "Status do Colaborador": colab?.status || '—',
      "AnyDesk ID": anydeskVal,
      "Memória RAM": eq.memoria_ram || ultimaAvaliacao?.memoria_ram || '—',
      "Sistema Operacional": soVal,
      "Tipo de Armazenamento (SSD/HD)": ultimaAvaliacao?.tipo_armazenamento || '—',
      "Espaço em Disco": ultimaAvaliacao?.espaco_disco || '—',
      "Office": eq.office || '—',
      "Antivírus": (eq.antivirus === "Sim" || (eq.antivirus_nome || '').toLowerCase().includes("eset")) ? "Ativo (ESET)" : (eq.antivirus || (ultimaAvaliacao?.antivirus && !ultimaAvaliacao.antivirus.includes("Inativo") ? ultimaAvaliacao.antivirus : 'Não')),
      "Condição / Desempenho": eq.condicao || ultimaAvaliacao?.desempenho || '—',
      "Última Formatação": dataFormatacao ? formatarDataSemFuso(dataFormatacao) : 'Não registrada',
      "Histórico de Formatações": histFormat,
      "Histórico de Usuários Anteriores": histUsuarios,
      "Avaliação Técnica - Data": ultimaAvaliacao?.data_avaliacao ? formatarDataSemFuso(ultimaAvaliacao.data_avaliacao) : 'Não avaliada',
      "Avaliação Técnica - Pontuação": ultimaAvaliacao?.pontuacao_total != null ? `${ultimaAvaliacao.pontuacao_total} pts` : '—',
      "Avaliação Técnica - Classificação": ultimaAvaliacao?.classificacao || '—',
      "Avaliação Técnica - Atende ao Trabalho?": ultimaAvaliacao?.atende_trabalho || '—',
      "Avaliação Técnica - Recomendação Usuário": ultimaAvaliacao?.recomendacao_usuario || '—',
      "Disponível p/ Reserva?": eq.disponivel_para_reserva ? 'Sim' : 'Não',
      "Observações Gerais": eq.observacoes || '—',
      "Data de Cadastro": eq.created_date ? formatarDataHoraSemFuso(eq.created_date) : '—'
    };
  };

  const handleExportarExcel = (apenasFiltrados = false) => {
    const listaParaExportar = apenasFiltrados ? filteredEquipamentos : equipamentos;
    
    if (listaParaExportar.length === 0) {
      alert("Nenhum equipamento encontrado para exportação.");
      return;
    }

    const todosDados = listaParaExportar.map(mapEquipamentoParaExcel);
    const desktopsDados = listaParaExportar.filter(e => (e.tipo || '').toLowerCase().includes('desktop')).map(mapEquipamentoParaExcel);
    const notebooksDados = listaParaExportar.filter(e => (e.tipo || '').toLowerCase().includes('notebook')).map(mapEquipamentoParaExcel);
    const monitoresDados = listaParaExportar.filter(e => (e.tipo || '').toLowerCase().includes('monitor')).map(mapEquipamentoParaExcel);

    // Resumo por Usuário
    const resumoDados = userGroups.map(g => ({
      "Usuário / Setor": g.usuario,
      "Área / Departamento": g.area,
      "Cargo": g.cargo,
      "Total Desktops": g.desktops.length,
      "Total Notebooks": g.notebooks.length,
      "Total Monitores": g.monitores.length,
      "Outros Equipamentos": g.outros.length,
      "Total Geral": g.items.length
    }));

    const wb = XLSX.utils.book_new();

    const autoWidth = (ws, data) => {
      if (!data || data.length === 0) return;
      const keys = Object.keys(data[0]);
      ws['!cols'] = keys.map(k => ({
        wch: Math.max(k.length + 4, ...data.map(row => (row[k] ? String(row[k]).length : 0)))
      }));
    };

    const wsTodos = XLSX.utils.json_to_sheet(todosDados);
    autoWidth(wsTodos, todosDados);
    XLSX.utils.book_append_sheet(wb, wsTodos, apenasFiltrados ? "Equipamentos Filtrados" : "Todos os Equipamentos");

    if (desktopsDados.length > 0) {
      const wsDesktops = XLSX.utils.json_to_sheet(desktopsDados);
      autoWidth(wsDesktops, desktopsDados);
      XLSX.utils.book_append_sheet(wb, wsDesktops, "Desktops");
    }

    if (notebooksDados.length > 0) {
      const wsNotebooks = XLSX.utils.json_to_sheet(notebooksDados);
      autoWidth(wsNotebooks, notebooksDados);
      XLSX.utils.book_append_sheet(wb, wsNotebooks, "Notebooks");
    }

    if (monitoresDados.length > 0) {
      const wsMonitores = XLSX.utils.json_to_sheet(monitoresDados);
      autoWidth(wsMonitores, monitoresDados);
      XLSX.utils.book_append_sheet(wb, wsMonitores, "Monitores");
    }

    if (resumoDados.length > 0) {
      const wsResumo = XLSX.utils.json_to_sheet(resumoDados);
      autoWidth(wsResumo, resumoDados);
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo por Usuário");
    }

    const dataHoje = new Date().toISOString().split('T')[0];
    const suf = apenasFiltrados ? '_filtrados' : '_todos';
    const fileName = `relatorio_pcs_internos${suf}_${dataHoje}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── CABEÇALHO DA PÁGINA ─────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-xs">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">PCs Internos</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Controle completo de desktops, notebooks e monitores corporativos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-bold rounded-xl shadow-xs gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Exportar Excel (.xlsx)</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">Relatórios em Excel</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExportarExcel(false)} className="cursor-pointer font-medium">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 mr-2" />
                  Exportar Todos ({equipamentos.length} equipamentos)
                </DropdownMenuItem>
                {filteredEquipamentos.length !== equipamentos.length && (
                  <DropdownMenuItem onClick={() => handleExportarExcel(true)} className="cursor-pointer font-medium">
                    <Filter className="w-4 h-4 text-blue-600 mr-2" />
                    Exportar Apenas Filtrados ({filteredEquipamentos.length} equipamentos)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {isAdmin && (
              <Button
                onClick={() => {
                  setEditingEquipamento(null);
                  setShowForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-white shadow-xs"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Equipamento
              </Button>
            )}
          </div>
        </div>

        {/* ── 1. CARTÕES DE RESUMO KPI NO TOPO ────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          <Card className="border-slate-200 bg-white shadow-2xs rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Equipamentos</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{stats.emUso} em uso • {stats.disponiveis} livres</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Monitor className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Formatação Vencida (> 30 meses ou sem registro) */}
          <Card className="border-red-200 bg-red-50/40 shadow-2xs rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-800 uppercase tracking-wider">Formatação Vencida</p>
                <p className="text-2xl font-extrabold text-red-700 mt-1">{stats.formatacaoAtrasada}</p>
                <p className="text-[10px] text-red-600 mt-0.5">&gt; 30m ou sem registro</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Formatar em Breve (≤ 60 dias) */}
          <Card className="border-amber-200 bg-amber-50/40 shadow-2xs rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Formatar em Breve</p>
                <p className="text-2xl font-extrabold text-amber-700 mt-1">{stats.formatacaoAtencao}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Vence em até 60 dias</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <RotateCcw className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Vida Útil Vencida (> 5 anos) */}
          <Card className="border-purple-200 bg-purple-50/40 shadow-2xs rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Vida Útil Vencida</p>
                <p className="text-2xl font-extrabold text-purple-700 mt-1">{stats.vidaUtilVencida}</p>
                <p className="text-[10px] text-purple-600 mt-0.5">&gt; 5 anos de aquisição</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                <Box className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Vida Útil a Vencer (≤ 90 dias) */}
          <Card className="border-violet-200 bg-violet-50/40 shadow-2xs rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-violet-800 uppercase tracking-wider">Vida Útil Próxima</p>
                <p className="text-2xl font-extrabold text-violet-700 mt-1">{stats.vidaUtilAtencao}</p>
                <p className="text-[10px] text-violet-600 mt-0.5">Vence em até 90 dias</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700">
                <Cpu className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Sem Antivírus Corporativo */}
          <Card className="border-rose-200 bg-rose-50/40 shadow-2xs rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Sem Antivírus</p>
                <p className="text-2xl font-extrabold text-rose-700 mt-1">{stats.semAntivirus}</p>
                <p className="text-[10px] text-rose-600 mt-0.5">de {stats.totalComputadores} computadores</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── MODAL DE FORMULÁRIO DE EDICÃO/CRIAÇÃO ────────────────────────── */}
        {showForm && (
          <EquipamentoForm
            equipamento={editingEquipamento}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingEquipamento(null);
            }}
            entityType="PCs_Internos"
          />
        )}

        {/* ── 2. BARRA DE BUSCA, FILTROS RÁPIDOS & MODO DE EXIBIÇÃO ───────── */}
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Campo de Busca em Destaque */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por etiqueta, serial, marca, modelo ou colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 text-xs rounded-xl border-slate-200"
              />
            </div>

            {/* Filtros Rápido */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Status */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-10 text-xs rounded-xl w-36 border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos os Status</SelectItem>
                  <SelectItem value="em_uso" className="text-xs">Em Uso</SelectItem>
                  <SelectItem value="disponivel" className="text-xs">Disponível / Estoque</SelectItem>
                  <SelectItem value="manutencao" className="text-xs">Em Manutenção</SelectItem>
                  <SelectItem value="danificado" className="text-xs">Com Problema / Danificado</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Tipo */}
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-10 text-xs rounded-xl w-36 border-slate-200">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos os Tipos</SelectItem>
                  <SelectItem value="Desktop" className="text-xs">Desktop</SelectItem>
                  <SelectItem value="Monitor" className="text-xs">Monitor</SelectItem>
                  <SelectItem value="Notebook" className="text-xs">Notebook</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Antivírus */}
              <Select value={filterAntivirus} onValueChange={setFilterAntivirus}>
                <SelectTrigger className="h-10 text-xs rounded-xl w-36 border-slate-200">
                  <SelectValue placeholder="Antivírus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos Antivírus</SelectItem>
                  <SelectItem value="com_antivirus" className="text-xs">Com Antivírus (ESET)</SelectItem>
                  <SelectItem value="sem_antivirus" className="text-xs">Sem Antivírus</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Formatação */}
              <Select value={filterFormatacao} onValueChange={setFilterFormatacao}>
                <SelectTrigger className="h-10 text-xs rounded-xl w-36 border-slate-200">
                  <SelectValue placeholder="Formatação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todas Formatações</SelectItem>
                  <SelectItem value="ok" className="text-xs">Em dia (OK)</SelectItem>
                  <SelectItem value="atencao" className="text-xs">Atenção (≤ 60d)</SelectItem>
                  <SelectItem value="atrasado" className="text-xs">Vencida (&gt; 30m)</SelectItem>
                  <SelectItem value="sem_registro" className="text-xs">Sem Registro</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Vida Útil */}
              <Select value={filterVidaUtil} onValueChange={setFilterVidaUtil}>
                <SelectTrigger className="h-10 text-xs rounded-xl w-36 border-slate-200">
                  <SelectValue placeholder="Vida Útil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Toda Vida Útil</SelectItem>
                  <SelectItem value="ok" className="text-xs">Em dia (&lt; 5 anos)</SelectItem>
                  <SelectItem value="atencao" className="text-xs">Atenção (≤ 90d)</SelectItem>
                  <SelectItem value="atrasado" className="text-xs">Vencida (&gt; 5 anos)</SelectItem>
                  <SelectItem value="sem_registro" className="text-xs">Sem Aquisição</SelectItem>
                </SelectContent>
              </Select>

              {/* ── 3. TOGGLE MODO DE VISÃO (GRUPO x TABELA x CARDS) ───────── */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode("grouped")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    viewMode === "grouped" ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Agrupado por Usuário"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Por Usuário</span>
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    viewMode === "table" ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Tabela Detalhada"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tabela</span>
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    viewMode === "cards" ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Cards Compactos"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* ── EXIBIÇÃO DA LISTA DE ACORDO COM O MODO SELECIONADO ─────────── */}
        {isLoading ? (
          <Card className="p-8 text-center text-slate-500">Carregando equipamentos...</Card>
        ) : filteredEquipamentos.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">Nenhum equipamento encontrado com os filtros selecionados.</Card>
        ) : (
          <>
            {/* MODO 1: AGRUPADO POR USUÁRIO */}
            {viewMode === "grouped" && (
              <div className="space-y-4">
                {userGroups.map((group, idx) => (
                  <Card key={idx} className="border-slate-200/80 bg-white shadow-xs rounded-2xl overflow-hidden">
                    {/* Cabeçalho Rico do Grupo de Usuário */}
                    <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                          {getInitials(group.usuario)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">{group.usuario}</h3>
                            <Badge variant="outline" className="text-[10px] bg-white border-slate-200">
                              {group.area}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">{group.cargo}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-white px-3 py-1 rounded-xl border border-slate-200/60">
                          <span>{group.items.length} equipamento(s)</span>
                        </div>
                        {isAdmin && !group.usuario.startsWith("Compartilhado — ") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-semibold rounded-xl border-slate-200"
                            onClick={() => handleAssignEquipment(group.usuario)}
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            Atribuir
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Tabela Interna de Equipamentos do Colaborador */}
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-slate-50/30">
                          <TableRow className="text-[11px]">
                            <TableHead className="w-10">Tipo</TableHead>
                            <TableHead>Marca / Modelo</TableHead>
                            <TableHead>Etiqueta / Serial</TableHead>
                            <TableHead>AnyDesk (Remoto)</TableHead>
                            <TableHead>Antivírus</TableHead>
                            <TableHead>Última Formatação (30m)</TableHead>
                            <TableHead>Vida Útil (5 anos)</TableHead>
                            <TableHead>Alertas de Atenção</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((eq) => {
                            const alerts = getAttentionAlerts(eq);
                            const anydeskVal = extrairAnyDesk(eq);
                            const fmtInfo = calcFormatacaoInfo(eq);
                            const vuInfo = calcVidaUtilInfo(eq);

                            return (
                              <TableRow
                                key={eq.id}
                                className="cursor-pointer hover:bg-slate-50/80 text-xs"
                                onClick={() => setSelectedEquipamento(eq)}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                                    {getTypeIcon(eq.tipo)}
                                    <span>{eq.tipo}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <p className="font-bold text-slate-900">{eq.marca} {eq.modelo}</p>
                                </TableCell>
                                <TableCell className="font-mono text-slate-600">
                                  {eq.etiqueta_interna || eq.numero_serie || "—"}
                                </TableCell>
                                <TableCell>
                                  {anydeskVal ? (
                                    <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                      {anydeskVal}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {(eq.tipo || '').toLowerCase().includes('monitor') ? (
                                    <span className="text-slate-400 italic text-[11px]">N/A</span>
                                  ) : eq.antivirus === "Sim" || (eq.antivirus_nome || '').toLowerCase().includes('eset') ? (
                                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                      {eq.antivirus_nome || "ESET"}
                                    </span>
                                  ) : eq.antivirus === "Não" ? (
                                    <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                                      Não
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">{eq.antivirus || "—"}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {fmtInfo.status === "nao_se_aplica" ? (
                                    <span className="text-slate-400 italic text-[11px]">N/A</span>
                                  ) : (
                                    <div>
                                      <p className="font-medium text-slate-800 text-[11px]">
                                        {fmtInfo.data ? formatarDataSemFuso(fmtInfo.data) : "Não registrada"}
                                      </p>
                                      <div className="mt-0.5">
                                        <Badge className={`text-[10px] ${fmtInfo.badgeClass}`}>
                                          {fmtInfo.label}
                                        </Badge>
                                      </div>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-slate-800 text-[11px]">
                                      {vuInfo.data ? formatarDataSemFuso(vuInfo.data) : "Sem aquisição"}
                                    </p>
                                    <div className="mt-0.5">
                                      <Badge className={`text-[10px] ${vuInfo.badgeClass}`}>
                                        {vuInfo.label}
                                      </Badge>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {alerts.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {alerts.map((al, aIdx) => (
                                        <Badge key={aIdx} className={`text-[10px] font-bold px-2 py-0.5 border ${al.color}`}>
                                          {al.label}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">Normal</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge className={
                                    eq.status === "Disponível" ? "bg-emerald-100 text-emerald-800" :
                                    eq.status === "Em uso" ? "bg-blue-100 text-blue-800" :
                                    eq.status === "Aguardando Devolução" ? "bg-purple-100 text-purple-800 border border-purple-300 font-semibold" :
                                    "bg-amber-100 text-amber-800"
                                  }>
                                    {eq.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex justify-end gap-1">
                                    {(eq.status === "Aguardando Devolução" || eq.usuario_atual) && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-purple-700 hover:bg-purple-50"
                                        onClick={() => handleConfirmarDevolucao(eq)}
                                        title="Confirmar Devolução de Equipamento (Retornar ao Estoque)"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                    {eq.usuario_atual && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleTransferEquipment(eq, eq.usuario_atual)}
                                        title="Transferir Equipamento"
                                      >
                                        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                                      </Button>
                                    )}
                                    {isAdmin && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handleEdit(eq)}
                                        >
                                          <Pencil className="w-3.5 h-3.5 text-slate-600" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-red-600 hover:bg-red-50"
                                          onClick={() => handleDelete(eq.id)}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* MODO 2: TABELA INDIVIDUAL DETALHADA */}
            {viewMode === "table" && (
              <Card className="border-slate-200/80 bg-white shadow-xs rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow className="text-xs">
                      <TableHead>Tipo</TableHead>
                      <TableHead>Marca / Modelo</TableHead>
                      <TableHead>Etiqueta / Serial</TableHead>
                      <TableHead>AnyDesk (Remoto)</TableHead>
                      <TableHead>Última Formatação (30m)</TableHead>
                      <TableHead>Vida Útil (5 anos)</TableHead>
                      <TableHead>Usuário & Área</TableHead>
                      <TableHead>Indicadores de Atenção</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquipamentos.map((eq) => {
                      const alerts = getAttentionAlerts(eq);
                      const anydeskVal = extrairAnyDesk(eq);
                      const fmtInfo = calcFormatacaoInfo(eq);
                      const vuInfo = calcVidaUtilInfo(eq);

                      return (
                        <TableRow
                          key={eq.id}
                          className="cursor-pointer hover:bg-slate-50/80 text-xs"
                          onClick={() => setSelectedEquipamento(eq)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                              {getTypeIcon(eq.tipo)}
                              <span>{eq.tipo}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-bold text-slate-900">{eq.marca} {eq.modelo}</p>
                          </TableCell>
                          <TableCell className="font-mono text-slate-600">
                            {eq.etiqueta_interna || eq.numero_serie || "—"}
                          </TableCell>
                          <TableCell>
                            {anydeskVal ? (
                              <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                {anydeskVal}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {fmtInfo.status === "nao_se_aplica" ? (
                              <span className="text-slate-400 italic text-[11px]">N/A</span>
                            ) : (
                              <div>
                                <p className="font-medium text-slate-800 text-[11px]">
                                  {fmtInfo.data ? formatarDataSemFuso(fmtInfo.data) : "Não registrada"}
                                </p>
                                <div className="mt-0.5">
                                  <Badge className={`text-[10px] ${fmtInfo.badgeClass}`}>
                                    {fmtInfo.label}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-800 text-[11px]">
                                {vuInfo.data ? formatarDataSemFuso(vuInfo.data) : "Sem aquisição"}
                              </p>
                              <div className="mt-0.5">
                                <Badge className={`text-[10px] ${vuInfo.badgeClass}`}>
                                  {vuInfo.label}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-bold text-slate-900">{eq.usuario_atual || "Estoque / Livre"}</p>
                              {eq.area && <p className="text-[11px] text-slate-500">{eq.area}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {alerts.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {alerts.map((al, aIdx) => (
                                  <Badge key={aIdx} className={`text-[10px] font-bold px-2 py-0.5 border ${al.color}`}>
                                    {al.label}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Normal</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              eq.status === "Disponível" ? "bg-emerald-100 text-emerald-800" :
                              eq.status === "Em uso" ? "bg-blue-100 text-blue-800" :
                              "bg-amber-100 text-amber-800"
                            }>
                              {eq.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              {(eq.status === "Aguardando Devolução" || eq.usuario_atual) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-purple-700 hover:bg-purple-50"
                                  onClick={() => handleConfirmarDevolucao(eq)}
                                  title="Confirmar Devolução de Equipamento (Retornar ao Estoque)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {eq.usuario_atual && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleTransferEquipment(eq, eq.usuario_atual)}
                                  title="Transferir Equipamento"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                                </Button>
                              )}
                              {isAdmin && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleEdit(eq)}
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-slate-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-600 hover:bg-red-50"
                                    onClick={() => handleDelete(eq.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* MODO 3: CARDS COMPACTOS */}
            {viewMode === "cards" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredEquipamentos.map((eq) => {
                  const alerts = getAttentionAlerts(eq);
                  return (
                    <Card
                      key={eq.id}
                      className="border-slate-200/80 bg-white hover:border-blue-400/80 transition-all cursor-pointer shadow-2xs rounded-2xl flex flex-col justify-between"
                      onClick={() => setSelectedEquipamento(eq)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-slate-100">
                              {getTypeIcon(eq.tipo)}
                            </div>
                            <span className="text-xs font-bold text-slate-700">{eq.tipo}</span>
                          </div>
                          <Badge className={
                            eq.status === "Disponível" ? "bg-emerald-100 text-emerald-800" :
                            eq.status === "Em uso" ? "bg-blue-100 text-blue-800" :
                            "bg-amber-100 text-amber-800"
                          }>
                            {eq.status}
                          </Badge>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{eq.marca} {eq.modelo}</h4>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            Etiqueta: {eq.etiqueta_interna || eq.numero_serie || "—"}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Usuário:</span>
                            <span className="font-bold text-slate-800 truncate max-w-[120px]">{eq.usuario_atual || "Estoque"}</span>
                          </div>
                          {(() => {
                            const anydeskVal = extrairAnyDesk(eq);
                            const fmtInfo = calcFormatacaoInfo(eq);
                            const vuInfo = calcVidaUtilInfo(eq);
                            return (
                              <>
                                {anydeskVal && (
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400">AnyDesk:</span>
                                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1 rounded">{anydeskVal}</span>
                                  </div>
                                )}
                                {fmtInfo.status !== "nao_se_aplica" && (
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400">Formatação:</span>
                                    <Badge className={`text-[9px] px-1.5 py-0 h-4 ${fmtInfo.badgeClass}`}>
                                      {fmtInfo.label}
                                    </Badge>
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-slate-400">Vida Útil:</span>
                                  <Badge className={`text-[9px] px-1.5 py-0 h-4 ${vuInfo.badgeClass}`}>
                                    {vuInfo.label}
                                  </Badge>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {alerts.length > 0 && (
                          <div className="space-y-1 pt-1">
                            {alerts.map((al, aIdx) => (
                              <Badge key={aIdx} className={`text-[10px] font-bold block w-full text-center border ${al.color}`}>
                                {al.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>

                      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {eq.usuario_atual && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-amber-700 hover:bg-amber-50"
                            onClick={() => handleTransferEquipment(eq, eq.usuario_atual)}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Transferir
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(eq)}
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-600" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── MODAL DETALHES COMPLETO ───────────────────────────────────────── */}
        {selectedEquipamento && (
          <EquipamentoDetalhes
            equipamento={selectedEquipamento}
            onClose={() => setSelectedEquipamento(null)}
          />
        )}

        {/* ── MODAL DE TRANSFERÊNCIA ────────────────────────────────────────── */}
        <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Transferir ou Liberar Equipamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-slate-700">
                  <strong>Equipamento:</strong> {equipmentToTransfer?.tipo} — {equipmentToTransfer?.marca} {equipmentToTransfer?.modelo}
                </p>
                <p className="text-slate-700">
                  <strong>Usuário Atual:</strong> {selectedUser}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Transferir para:</Label>
                <Select value={newUserName} onValueChange={setNewUserName}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Selecione o novo responsável ou 'Disponível'" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Disponível" className="text-xs font-bold text-emerald-700">
                      — Liberar para Estoque (Disponível) —
                    </SelectItem>
                    {colaboradores
                      .filter(c => c.status === "Ativo")
                      .map((colab) => (
                        <SelectItem key={colab.id} value={colab.nome_completo} className="text-xs">
                          {colab.nome_completo} ({colab.area})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="border-t pt-3 flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowTransferModal(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={executeTransfer}
                disabled={!newUserName}
                className={newUserName === "Disponível" ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl" : "bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"}
              >
                {newUserName === "Disponível" ? "Liberar Equipamento" : "Confirmar Transferência"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL DE ATRIBUIÇÃO ───────────────────────────────────────────── */}
        <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Atribuir Equipamento Disponível</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-slate-700">
                  <strong>Atribuir para:</strong> {selectedUser}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Equipamento Disponível no Estoque:</Label>
                <Select value={selectedAvailableEquipment} onValueChange={setSelectedAvailableEquipment}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Selecione o equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEquipments.length === 0 ? (
                      <SelectItem value="none" disabled className="text-xs text-slate-400">
                        Nenhum equipamento disponível
                      </SelectItem>
                    ) : (
                      availableEquipments.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id} className="text-xs">
                          {eq.tipo} — {eq.marca} {eq.modelo} ({eq.etiqueta_interna || "Sem etiqueta"})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="border-t pt-3 flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowAssignModal(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={executeAssign}
                disabled={!selectedAvailableEquipment}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-xl"
              >
                Confirmar Atribuição
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}