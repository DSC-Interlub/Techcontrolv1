/**
 * PlantaInterativa.jsx — Mapeamento Espacial das Salas Físicas (Vetorial SVG 8K & Hi-Res)
 * Integrado perfeitamente à interface clara do TechControl.
 * 
 * Oferece renderização dupla:
 * 1. 📐 Desenho Vetorial SVG (0% pixelação / Resolução 8K matemática infinita)
 * 2. 🖼️ Imagem Hi-Res Padronizada (3840x2160 Ultra HD)
 */
import React, { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { SVG_ROOMS } from "./floorplanRooms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Monitor, Laptop, Eye, Plus, Pencil, Trash2, MapPin,
  Move, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, CheckCircle, User, Loader2,
  DollarSign, Briefcase, Building, Package, Activity, Sparkles, Image as ImageIcon
} from "lucide-react";

export const SALAS = [
  {
    id: "sala_financeiro",
    nome: "Sala Financeiro",
    descricao: "Escritório do Departamento Financeiro",
    imagem: "/plantas/sala_financeiro.png",
    icon: DollarSign,
    corBadge: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
  },
  {
    id: "adm_1andar",
    nome: "ADM 1º Andar (Área Aberta)",
    descricao: "Bancadas abertas da Administração no 1º Andar",
    imagem: "/plantas/adm_1andar.png",
    icon: Briefcase,
    corBadge: "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
  },
  {
    id: "mezanino_bsm_drc",
    nome: "Mezanino (BSM & DRC)",
    descricao: "Salas BSM e DRC no Mezanino",
    imagem: "/plantas/mezanino_bsm_drc.png",
    icon: Building,
    corBadge: "bg-purple-50 text-purple-700 border-purple-200 font-semibold"
  },
  {
    id: "galpao_bio_reenvase_checkout",
    nome: "Galpão (BIO, Reenvase & Check-out)",
    descricao: "Área de BIO, Reenvase e Check-out",
    imagem: "/plantas/galpao_bio_reenvase_checkout.png",
    icon: Package,
    corBadge: "bg-amber-50 text-amber-700 border-amber-200 font-semibold"
  },
  {
    id: "galpao_centro_controle_operacional",
    nome: "Centro de Controle Operacional (CCO)",
    descricao: "Central de Operações e Monitoramento Operacional",
    imagem: "/plantas/galpao_centro_controle_operacional.png",
    icon: Activity,
    corBadge: "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold"
  }
];

export default function PlantaInterativa({
  isAdmin = true,
  equipamentos = [],
  colaboradores = [],
  chamados = [],
  onEditEquipamento
}) {
  const queryClient = useQueryClient();
  const [salaAtivaId, setSalaAtivaId] = useState("sala_financeiro");
  const [renderMode, setRenderMode] = useState("svg"); // "svg" (vetorial 8K) ou "image" (imagem hi-res)
  const [modoEdicao, setModoEdicao] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [draggingStation, setDraggingStation] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);

  // Modal de Criação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStationPos, setNewStationPos] = useState({ x: 50, y: 50 });
  const [newStationCodigo, setNewStationCodigo] = useState("");
  const [newStationColaborador, setNewStationColaborador] = useState("__none__");
  const [selectedEquipmentsToAssign, setSelectedEquipmentsToAssign] = useState([]);

  const imgRef = useRef(null);
  const svgRef = useRef(null);
  const salaAtual = useMemo(() => SALAS.find(s => s.id === salaAtivaId) || SALAS[0], [salaAtivaId]);
  const svgRoom = useMemo(() => SVG_ROOMS[salaAtual.id], [salaAtual]);

  // Queries
  const { data: estacoes = [] } = useQuery({
    queryKey: ['estacoes_trabalho'],
    queryFn: () => base44.entities.Estacoes_Trabalho.list(),
    staleTime: 10_000,
  });

  // Mutations
  const createEstacaoMut = useMutation({
    mutationFn: (data) => base44.entities.Estacoes_Trabalho.create(data),
    onSuccess: async (novaEstacao) => {
      if (selectedEquipmentsToAssign.length > 0 && novaEstacao?.id) {
        for (const eqId of selectedEquipmentsToAssign) {
          await base44.entities.PCs_Internos.update(eqId, {
            estacao_id: novaEstacao.id,
            ...(newStationColaborador !== "__none__" ? {
              colaborador_id: newStationColaborador,
              usuario_atual: colaboradores.find(c => c.id === newStationColaborador)?.nome_completo || "",
              status: "Em uso"
            } : {})
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['estacoes_trabalho'] });
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      setShowCreateModal(false);
      setSelectedEquipmentsToAssign([]);
    }
  });

  const updateEstacaoMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Estacoes_Trabalho.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estacoes_trabalho'] });
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
    }
  });

  const deleteEstacaoMut = useMutation({
    mutationFn: (id) => base44.entities.Estacoes_Trabalho.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estacoes_trabalho'] });
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      setSelectedStation(null);
    }
  });

  const updatePcsMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PCs_Internos.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
    }
  });

  // Estações da Sala Selecionada
  const estacoesDaSala = useMemo(() => {
    return estacoes.filter(e => e.sala === salaAtual.nome || e.imagem_planta === salaAtual.id || e.imagem_planta === salaAtual.imagem);
  }, [estacoes, salaAtual]);

  // Equipamentos sem estação vinculada
  const equipamentosSemEstacao = useMemo(() => {
    return equipamentos.filter(e => !e.estacao_id);
  }, [equipamentos]);

  // Handlers para Drag and Drop de Pins
  const handlePinMouseDown = (e, estacao) => {
    if (!modoEdicao) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingStation(estacao);
  };

  const handleMouseMove = (e) => {
    if (!modoEdicao || !draggingStation) return;
    const refElem = renderMode === "image" ? imgRef.current : svgRef.current;
    if (!refElem) return;

    const rect = refElem.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const posX = Math.max(2, Math.min(98, parseFloat(x.toFixed(2))));
    const posY = Math.max(2, Math.min(98, parseFloat(y.toFixed(2))));

    setDraggingStation(prev => prev ? { ...prev, pos_x: posX, pos_y: posY } : null);
  };

  const handleMouseUp = () => {
    if (draggingStation) {
      updateEstacaoMut.mutate({
        id: draggingStation.id,
        data: { pos_x: draggingStation.pos_x, pos_y: draggingStation.pos_y }
      });
      setDraggingStation(null);
    }
  };

  // Clique na planta para criar nova estação
  const handleContainerClick = (e) => {
    if (!modoEdicao || draggingStation) return;
    const refElem = renderMode === "image" ? imgRef.current : svgRef.current;
    if (!refElem) return;

    const rect = refElem.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const posX = Math.max(2, Math.min(98, parseFloat(x.toFixed(2))));
    const posY = Math.max(2, Math.min(98, parseFloat(y.toFixed(2))));

    setNewStationPos({ x: posX, y: posY });
    const num = estacoesDaSala.length + 1;
    setNewStationCodigo(`M-${num < 10 ? '0' + num : num}`);
    setNewStationColaborador("__none__");
    setSelectedEquipmentsToAssign([]);
    setShowCreateModal(true);
  };

  const handleCreateStationSubmit = (e) => {
    e.preventDefault();
    createEstacaoMut.mutate({
      andar: salaAtual.nome,
      sala: salaAtual.nome,
      imagem_planta: salaAtual.id,
      codigo: newStationCodigo,
      pos_x: newStationPos.x,
      pos_y: newStationPos.y,
      colaborador_id: newStationColaborador === "__none__" ? null : newStationColaborador,
    });
  };

  // Status do Pin da Estação
  const getEstacaoStatus = (estacao) => {
    const colab = colaboradores.find(c => c.id === estacao.colaborador_id);
    const eqVinculados = equipamentos.filter(eq => eq.estacao_id === estacao.id || (colab && eq.colaborador_id === colab.id));

    if (!estacao.colaborador_id && eqVinculados.length === 0) {
      return { cor: "bg-slate-400 text-white border-slate-600 shadow-md", label: "Vaga", tipo: "vaga", colab, eqVinculados };
    }

    const temChamadoAberto = colab ? chamados.some(c =>
      (c.solicitante_nome === colab.nome_completo || c.solicitante_email === colab.email) &&
      !['Resolvido', 'Cancelado'].includes(c.status)
    ) : false;

    const temEquipManutencao = eqVinculados.some(eq => ['Manutenção', 'Formatação', 'Danificado'].includes(eq.status));

    if (temChamadoAberto || temEquipManutencao) {
      return { cor: "bg-amber-500 text-white border-amber-600 shadow-md animate-pulse", label: "Alerta / Manutenção", tipo: "alerta", colab, eqVinculados, temChamadoAberto, temEquipManutencao };
    }

    return { cor: "bg-emerald-600 text-white border-emerald-700 shadow-md", label: "Operacional", tipo: "operacional", colab, eqVinculados };
  };

  // Estatísticas
  const statsSala = useMemo(() => {
    const totalMesas = estacoesDaSala.length;
    const ocupadas = estacoesDaSala.filter(e => e.colaborador_id).length;
    const vagas = totalMesas - ocupadas;
    const alertas = estacoesDaSala.filter(e => getEstacaoStatus(e).tipo === "alerta").length;
    return { totalMesas, ocupadas, vagas, alertas };
  }, [estacoesDaSala, equipamentos, colaboradores, chamados]);

  const SalaIcon = salaAtual.icon;

  return (
    <div className="space-y-6">
      {/* ── BARRA DE SELEÇÃO DAS 5 SALAS ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {SALAS.map(sala => {
            const Icon = sala.icon;
            const isSelected = salaAtivaId === sala.id;
            const qtdMesas = estacoes.filter(e => e.sala === sala.nome || e.imagem_planta === sala.id).length;

            return (
              <button
                key={sala.id}
                onClick={() => setSalaAtivaId(sala.id)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-500"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${isSelected ? "bg-blue-600 text-white shadow-xs" : "bg-gray-100 text-gray-600"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge className={`text-[10px] ${sala.corBadge}`}>
                    {qtdMesas} mesa{qtdMesas !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div>
                  <p className={`font-bold text-xs ${isSelected ? "text-blue-950" : "text-gray-900"}`}>{sala.nome}</p>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">{sala.descricao}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CARD PRINCIPAL DA SALA ────────────────────────────────────────── */}
      <Card className="shadow-xs border-gray-200 bg-white overflow-hidden rounded-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 bg-gray-50/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xs">
                <SalaIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg font-bold text-gray-900">{salaAtual.nome}</CardTitle>
                  <Badge className={salaAtual.corBadge}>{salaAtual.descricao}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Mapeamento vetorial de alta definição sem perda de nitidez</p>
              </div>
            </div>

            {/* Alternador de Renderização + Zoom + Modo Edição */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle SVG Vetorial 8K vs Imagem Hi-Res */}
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white shadow-2xs">
                <Button
                  size="sm"
                  variant={renderMode === "svg" ? "default" : "ghost"}
                  className={`h-7 text-[11px] gap-1 font-bold ${renderMode === "svg" ? "bg-indigo-600 text-white" : "text-gray-600"}`}
                  onClick={() => setRenderMode("svg")}
                  title="Planta Vetorial SVG (0% pixelação / 8K crisp)"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Vetorial 8K SVG
                </Button>
                <Button
                  size="sm"
                  variant={renderMode === "image" ? "default" : "ghost"}
                  className={`h-7 text-[11px] gap-1 font-bold ${renderMode === "image" ? "bg-indigo-600 text-white" : "text-gray-600"}`}
                  onClick={() => setRenderMode("image")}
                  title="Imagem Hi-Res"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Imagem Hi-Res
                </Button>
              </div>

              {/* Controles de Zoom */}
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white shadow-2xs">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(z => Math.max(0.8, z - 0.2))} title="Zoom Out">
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[11px] font-mono font-medium px-1 text-gray-600">{Math.round(zoomLevel * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.2))} title="Zoom In">
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(1)} title="Resetar">
                  <RotateCcw className="w-3 h-3 text-gray-500" />
                </Button>
              </div>

              {isAdmin && (
                <Button
                  size="sm"
                  variant={modoEdicao ? "destructive" : "outline"}
                  className="text-xs font-medium border-gray-300"
                  onClick={() => setModoEdicao(!modoEdicao)}
                >
                  {modoEdicao ? "✓ Concluir Edição" : "✏️ Editar Posicionamento das Mesas"}
                </Button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-200/60 mt-4">
            <div className="bg-white border border-gray-200 rounded-xl p-2.5 text-center shadow-2xs">
              <p className="text-[11px] text-gray-500 font-medium">Total de Mesas</p>
              <p className="text-base font-black text-gray-900 mt-0.5">{statsSala.totalMesas}</p>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 text-center shadow-2xs">
              <p className="text-[11px] text-emerald-700 font-semibold">Ocupadas / Operacionais</p>
              <p className="text-base font-black text-emerald-950 mt-0.5">{statsSala.ocupadas}</p>
            </div>
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 text-center shadow-2xs">
              <p className="text-[11px] text-amber-700 font-semibold">Em Alerta / Manutenção</p>
              <p className="text-base font-black text-amber-950 mt-0.5">{statsSala.alertas}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center shadow-2xs">
              <p className="text-[11px] text-slate-600 font-medium">Mesas Vagas</p>
              <p className="text-base font-black text-slate-800 mt-0.5">{statsSala.vagas}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 bg-gray-50/40">
          {modoEdicao && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-900 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Modo de Edição Ativo:</strong> Arraste os Pins sobre o desenho da sala para posicioná-los. Clique em qualquer ponto da planta para criar uma nova mesa.
                </span>
              </div>
            </div>
          )}

          {/* ── MOLDURA DA PLANTA (SISTEMA LOOK & FEEL) ──────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-xs overflow-hidden flex justify-center items-center min-h-[450px]">
            <div
              className="relative transition-transform duration-150 origin-top-left inline-block w-full max-w-4xl"
              style={{ transform: `scale(${zoomLevel})` }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* OPÇÃO A: DESENHO VETORIAL SVG (0% PIXELAÇÃO / 8K CRISP) */}
              {renderMode === "svg" && svgRoom ? (
                <div ref={svgRef} onClick={handleContainerClick} className="relative w-full cursor-pointer">
                  <svg
                    viewBox={`0 0 ${svgRoom.width} ${svgRoom.height}`}
                    className="w-full h-auto max-w-full block rounded-lg select-none shadow-2xs border border-gray-200 bg-white"
                  >
                    {/* Fundo do piso */}
                    <rect x={0} y={0} width={svgRoom.width} height={svgRoom.height} fill="#FFFFFF" />

                    {/* Paredes perimetrais */}
                    <rect
                      x={svgRoom.outline.x}
                      y={svgRoom.outline.y}
                      width={svgRoom.outline.w}
                      height={svgRoom.outline.h}
                      rx={svgRoom.outline.rx || 4}
                      fill="#FAFAFA"
                      stroke="#0F172A"
                      strokeWidth={6}
                    />

                    {/* Divisórias de paredes internas */}
                    {svgRoom.walls?.map((w, i) => (
                      <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke="#0F172A" strokeWidth={6} />
                    ))}

                    {/* Móveis (Mesas, TVs, Armários, Mesas Redondas) */}
                    {svgRoom.furniture?.map((f, i) => {
                      if (f.kind === "round") {
                        return <circle key={i} cx={f.x + f.w / 2} cy={f.y + f.h / 2} r={f.w / 2} fill="#F1F5F9" stroke="#334155" strokeWidth={2.5} />;
                      }
                      if (f.kind === "tv") {
                        return (
                          <g key={i}>
                            <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={3} fill="#0F172A" stroke="#020617" strokeWidth={2} />
                            <rect x={f.x + 4} y={f.y + 4} width={f.w - 8} height={f.h - 8} rx={2} fill="#0284C7" opacity={0.7} />
                          </g>
                        );
                      }
                      return (
                        <rect
                          key={i}
                          x={f.x}
                          y={f.y}
                          width={f.w}
                          height={f.h}
                          rx={4}
                          fill="#F8FAFC"
                          stroke="#334155"
                          strokeWidth={2.5}
                        />
                      );
                    })}

                    {/* Rótulos de Texto Arquitetônicos */}
                    {svgRoom.textLabels?.map((t, i) => (
                      <text
                        key={i}
                        x={t.x}
                        y={t.y}
                        transform={t.rotate ? `rotate(${t.rotate} ${t.x} ${t.y})` : undefined}
                        fill="#94A3B8"
                        className="font-bold tracking-widest font-sans uppercase"
                        fontSize={t.size || 18}
                      >
                        {t.text}
                      </text>
                    ))}
                  </svg>
                </div>
              ) : (
                /* OPÇÃO B: IMAGEM HI-RES PADRONIZADA */
                <img
                  ref={imgRef}
                  src={salaAtual.imagem}
                  alt={salaAtual.nome}
                  className="w-full h-auto max-w-full block rounded-lg select-none cursor-pointer border border-gray-100 shadow-2xs"
                  onClick={handleContainerClick}
                  draggable={false}
                />
              )}

              {/* PINS DAS ESTAÇÕES DE TRABALHO SOBRE A PLANTA */}
              {estacoesDaSala.map(estacao => {
                const statusInfo = getEstacaoStatus(estacao);
                const isDraggingThis = draggingStation?.id === estacao.id;
                const posX = isDraggingThis ? draggingStation.pos_x : estacao.pos_x;
                const posY = isDraggingThis ? draggingStation.pos_y : estacao.pos_y;

                return (
                  <Popover key={estacao.id}>
                    <PopoverTrigger asChild>
                      <div
                        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 z-10 flex flex-col items-center ${
                          isDraggingThis ? "scale-125 z-30 opacity-90" : ""
                        }`}
                        style={{ left: `${posX}%`, top: `${posY}%` }}
                        onMouseDown={(e) => handlePinMouseDown(e, estacao)}
                      >
                        <div className={`w-8 h-8 rounded-full border-2 shadow-md flex items-center justify-center font-black text-xs ${statusInfo.cor}`}>
                          {estacao.codigo}
                        </div>

                        <div className="bg-gray-900/90 text-white text-[10px] px-2 py-0.5 rounded shadow-sm mt-1 whitespace-nowrap font-medium border border-gray-800">
                          {statusInfo.colab?.nome_completo ? statusInfo.colab.nome_completo.split(" ")[0] : "Vaga"}
                        </div>
                      </div>
                    </PopoverTrigger>

                    {/* Popover Card */}
                    <PopoverContent className="w-80 p-4 shadow-xl border-gray-200">
                      <div className="space-y-3 text-xs">
                        <div className="flex items-start justify-between border-b pb-2">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{estacao.codigo} • {salaAtual.nome}</p>
                            <p className="text-[11px] text-gray-500">Mapeamento Vetorial em Tempo Real</p>
                          </div>
                          <Badge className={
                            statusInfo.tipo === "vaga" ? "bg-slate-100 text-slate-700" :
                            statusInfo.tipo === "alerta" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }>
                            {statusInfo.label}
                          </Badge>
                        </div>

                        {/* Colaborador */}
                        {statusInfo.colab ? (
                          <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                            {statusInfo.colab.foto_url ? (
                              <img src={statusInfo.colab.foto_url} alt="" className="w-10 h-10 rounded-full object-cover border" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                {statusInfo.colab.nome_completo?.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 truncate">{statusInfo.colab.nome_completo}</p>
                              <p className="text-gray-500 text-[11px] truncate">{statusInfo.colab.cargo || "Sem cargo"} • {statusInfo.colab.area}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-2.5 rounded-lg border text-center text-gray-400 italic">
                            Mesa atualmente vaga sem colaborador.
                          </div>
                        )}

                        {/* Alerta de Chamado */}
                        {statusInfo.temChamadoAberto && (
                          <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-amber-900 text-[11px] flex items-center gap-1.5 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Colaborador possui chamado aberto no Helpdesk!</span>
                          </div>
                        )}

                        {/* Equipamentos Vinculados */}
                        <div>
                          <p className="font-semibold text-gray-700 mb-1.5 uppercase text-[10px] tracking-wider">
                            Equipamentos nesta mesa ({statusInfo.eqVinculados.length})
                          </p>
                          {statusInfo.eqVinculados.length === 0 ? (
                            <p className="text-gray-400 italic text-[11px]">Nenhum equipamento atribuído.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                              {statusInfo.eqVinculados.map(eq => (
                                <div key={eq.id} className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded-lg text-[11px]">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {eq.tipo === "Notebook" ? <Laptop className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> : <Monitor className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                    <div className="truncate">
                                      <p className="font-semibold text-gray-900 truncate">{eq.tipo}: {eq.marca} {eq.modelo}</p>
                                      <p className="text-gray-400 text-[10px] font-mono">{eq.etiqueta_interna || eq.service_tag}</p>
                                    </div>
                                  </div>
                                  <Badge className={eq.status === "Em uso" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                                    {eq.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Ações Admin */}
                        {isAdmin && (
                          <div className="flex gap-2 border-t pt-2.5">
                            <Button size="sm" variant="outline" className="flex-1 text-[11px] h-7" onClick={() => setSelectedStation(estacao)}>
                              <Pencil className="w-3 h-3 mr-1" /> Gerenciar Mesa
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500 h-7 w-7 p-0" onClick={() => deleteEstacaoMut.mutate(estacao.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── GAVETA DE EQUIPAMENTOS NÃO POSICIONADOS ────────────────────────── */}
      {equipamentosSemEstacao.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/20 shadow-xs rounded-2xl">
          <CardHeader className="pb-3 border-b border-amber-100">
            <CardTitle className="text-sm font-semibold text-amber-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                ⚠️ Equipamentos ainda não posicionados na planta ({equipamentosSemEstacao.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-xs text-amber-800 mb-3">
              Estes equipamentos estão no sistema, mas ainda não possuem mesa física atribuída no mapa das salas.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {equipamentosSemEstacao.map(eq => (
                <div key={eq.id} className="bg-white border border-amber-200 rounded-lg p-2.5 text-xs flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-bold text-gray-900 truncate">{eq.tipo} - {eq.marca} {eq.modelo}</p>
                    <p className="text-gray-500 text-[11px] truncate">Usuário: {eq.usuario_atual || "Sem usuário"}</p>
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] shrink-0 border-amber-300 hover:bg-amber-100" onClick={() => onEditEquipamento?.(eq)}>
                      Vincular
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── MODAL: CRIAR NOVA ESTAÇÃO NA PLANTA DA SALA ATIVA ──────────────── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Criar Nova Estação — {salaAtual.nome}</DialogTitle>
            <DialogDescription className="text-xs">
              Posição no mapa da sala: X: {newStationPos.x}%, Y: {newStationPos.y}%
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateStationSubmit} className="space-y-4 text-xs">
            <div>
              <Label className="text-xs">Código da Mesa / Estação <span className="text-red-500">*</span></Label>
              <Input
                className="mt-1 h-8 text-xs font-mono"
                placeholder="Ex: M-01, M-02"
                value={newStationCodigo}
                onChange={e => setNewStationCodigo(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-xs">Colaborador Alocado nesta Mesa</Label>
              <Select value={newStationColaborador} onValueChange={setNewStationColaborador}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Nenhum (Mesa vaga)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">— Mesa Vaga (Sem Colaborador) —</SelectItem>
                  {colaboradores.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.nome_completo} ({c.area})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seleção de Equipamentos Disponíveis */}
            <div>
              <Label className="text-xs">Vincular Equipamentos Existentes (Opcional)</Label>
              <div className="mt-1 border rounded-lg p-2 max-h-36 overflow-y-auto space-y-1.5 bg-gray-50">
                {equipamentosSemEstacao.length === 0 ? (
                  <p className="text-gray-400 text-[11px] italic">Não há equipamentos sem estação disponível.</p>
                ) : (
                  equipamentosSemEstacao.map(eq => {
                    const isChecked = selectedEquipmentsToAssign.includes(eq.id);
                    const toggleEq = () => {
                      setSelectedEquipmentsToAssign(prev =>
                        isChecked ? prev.filter(id => id !== eq.id) : [...prev, eq.id]
                      );
                    };
                    return (
                      <div key={eq.id} className="flex items-center justify-between bg-white border p-2 rounded text-[11px] cursor-pointer" onClick={toggleEq}>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={isChecked} onChange={() => {}} className="w-3.5 h-3.5 accent-blue-600" />
                          <span className="font-semibold text-gray-900">{eq.tipo}: {eq.marca} {eq.modelo}</span>
                        </div>
                        <span className="font-mono text-gray-400">{eq.etiqueta_interna}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={createEstacaoMut.isPending}>
                {createEstacaoMut.isPending ? "Salvando..." : "Criar Estação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: GERENCIAR ESTAÇÃO EXISTENTE ────────────────────────────── */}
      {selectedStation && (
        <Dialog open={!!selectedStation} onOpenChange={v => !v && setSelectedStation(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Gerenciar Mesa {selectedStation.codigo} — {salaAtual.nome}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div>
                <Label className="text-xs">Colaborador Vinculado</Label>
                <Select
                  value={selectedStation.colaborador_id || "__none__"}
                  onValueChange={colabId => {
                    const val = colabId === "__none__" ? null : colabId;
                    updateEstacaoMut.mutate({ id: selectedStation.id, data: { colaborador_id: val } });
                    setSelectedStation(prev => prev ? { ...prev, colaborador_id: val } : null);
                  }}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs">— Mesa Vaga (Sem Colaborador) —</SelectItem>
                    {colaboradores.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.nome_completo} ({c.area})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-3">
                <p className="font-bold text-gray-800 mb-2">Equipamentos alocados nesta mesa</p>
                {equipamentos.filter(eq => eq.estacao_id === selectedStation.id).length === 0 ? (
                  <p className="text-gray-400 italic text-[11px]">Nenhum computador ou monitor vinculado.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {equipamentos.filter(eq => eq.estacao_id === selectedStation.id).map(eq => (
                      <div key={eq.id} className="flex items-center justify-between bg-gray-50 border p-2 rounded text-[11px]">
                        <div>
                          <p className="font-bold text-gray-900">{eq.tipo} - {eq.marca} {eq.modelo}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{eq.etiqueta_interna}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 h-6 text-[10px]"
                          onClick={() => updatePcsMut.mutate({ id: eq.id, data: { estacao_id: null } })}
                        >
                          Desvincular
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <Button variant="outline" size="sm" onClick={() => setSelectedStation(null)}>Fechar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
