/**
 * PlantaInterativa.jsx — Controle Único de Máquinas em Vetor SVG Real (100% Pure SVG Vector)
 * 
 * Recria a planta inteira como desenho vetorial SVG com precisão matemática (0% raster/imagem).
 * Segue o padrão de design visual v0:
 * - Preenchimento de móveis em cinza-azulado suave (#F1F5F9)
 * - Contorno fino e consistente (#64748B, strokeWidth=1.5)
 * - Cantos arredondados suavizados (rx=4)
 * - Rótulos de salas nítidos em maiúsculas
 * - 38 Assentos e estações com avatares/fotos flutuantes e botão +
 * - Responsivo e escalável em qualquer nível de zoom sem perda de nitidez
 */

import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { UNIFIED_FLOORPLAN } from "./floorplanRooms";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  ZoomIn, ZoomOut, Maximize2, Pencil, Trash2, AlertTriangle
} from "lucide-react";

function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "#4F46E5", "#2563EB", "#059669", "#D97706", "#7C3AED", "#DB2777", "#0284C7"
];

function getColabColor(colabId) {
  if (!colabId) return "#4F46E5";
  let hash = 0;
  for (let i = 0; i < colabId.length; i++) {
    hash = colabId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── COMPONENTE DE DESENHO VETORIAL DOS MÓVEIS (STYLE V0) ──────────────────────
function FurnitureVectorShape({ f }) {
  const common = {
    fill: "#F1F5F9",
    stroke: "#64748B",
    strokeWidth: 1.5,
    rx: 4,
  };

  if (f.kind === "round") {
    return <circle cx={f.cx} cy={f.cy} r={f.r} {...common} />;
  }

  if (f.kind === "tv") {
    return (
      <g>
        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={2} fill="#0F172A" stroke="#334155" strokeWidth={1.2} />
        <rect x={f.x + 2} y={f.y + 2} width={f.w - 4} height={f.h - 4} rx={1} fill="#38BDF8" opacity={0.4} />
      </g>
    );
  }

  if (f.kind === "desk_l") {
    const cutW = f.w * 0.35;
    const cutH = f.h * 0.35;
    const pathD = `M ${f.x} ${f.y} h ${f.w} v ${f.h} h -${cutW} v -${cutH} h -${f.w - cutW} Z`;
    return <path d={pathD} fill="#F1F5F9" stroke="#64748B" strokeWidth={1.5} strokeLinejoin="round" />;
  }

  if (f.kind === "cabinet" || f.kind === "cabinet_top") {
    return (
      <g>
        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={3} {...common} />
        <line x1={f.x} y1={f.y + f.h / 2} x2={f.x + f.w} y2={f.y + f.h / 2} stroke="#CBD5E1" strokeWidth={1} />
      </g>
    );
  }

  if (f.kind === "shelves_grid") {
    const cols = 3;
    const rows = 3;
    const itemW = (f.w - 8) / cols;
    const itemH = (f.h - 8) / rows;
    const items = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        items.push(
          <rect
            key={`${r}-${c}`}
            x={f.x + 2 + c * (itemW + 2)}
            y={f.y + 2 + r * (itemH + 2)}
            width={itemW}
            height={itemH}
            rx={2}
            fill="#F1F5F9"
            stroke="#94A3B8"
            strokeWidth={1}
          />
        );
      }
    }
    return <g>{items}</g>;
  }

  if (f.kind === "sink") {
    return (
      <g>
        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={4} fill="#E2E8F0" stroke="#64748B" strokeWidth={1.5} />
        <circle cx={f.x + f.w / 2} cy={f.y + f.h / 2} r={8} fill="#CBD5E1" stroke="#64748B" strokeWidth={1} />
      </g>
    );
  }

  return (
    <g>
      <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.rx ?? 4} {...common} />
      {f.hasGadgets && (
        <g opacity={0.55}>
          {/* Monitor Minimalista Widescreen */}
          <rect x={f.x + f.w / 2 - 12} y={f.y + 4} width={24} height={3} rx={1} fill="#1E293B" />
          {/* Teclado Minimalista */}
          <rect x={f.x + f.w / 2 - 10} y={f.y + 11} width={20} height={6} rx={1} fill="#CBD5E1" />
        </g>
      )}
    </g>
  );
}

export default function PlantaInterativa({
  isAdmin = true,
  equipamentos = [],
  colaboradores = [],
  onEditEquipamento
}) {
  const queryClient = useQueryClient();
  const svgRef = useRef(null);

  // Estados de Navegação e Zoom
  const [activeSectionId, setActiveSectionId] = useState("all");
  const [currentViewBox, setCurrentViewBox] = useState("0 0 688 1024");
  const [zoomScale, setZoomScale] = useState(1);

  // Modo de Edição e Reposicionamento
  const [isEditMode, setIsEditMode] = useState(false);

  // Modal de Atribuição de Estação
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalStationCodigo, setModalStationCodigo] = useState("");
  const [modalColaboradorId, setModalColaboradorId] = useState("__none__");
  const [selectedEquipmentsToAssign, setSelectedEquipmentsToAssign] = useState([]);

  // Buscar estações salvas no DB
  const { data: estacoesDb = [] } = useQuery({
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
            ...(modalColaboradorId !== "__none__" ? {
              colaborador_id: modalColaboradorId,
              usuario_atual: colaboradores.find(c => c.id === modalColaboradorId)?.nome_completo || "",
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
      setSelectedSeat(null);
      setShowCreateModal(false);
    }
  });

  // Mapeamento dos Assentos Predefinidos + DB
  const mappedSeats = useMemo(() => {
    const baseSeats = UNIFIED_FLOORPLAN.seats;
    
    return baseSeats.map(presetSeat => {
      const dbEst = estacoesDb.find(e => 
        e.codigo === presetSeat.codigo || e.id === presetSeat.id
      );

      let x = presetSeat.x;
      let y = presetSeat.y;

      if (dbEst) {
        if (typeof dbEst.pos_x === 'number' && dbEst.pos_x > 0) {
          x = dbEst.pos_x <= 100 ? (dbEst.pos_x / 100) * 688 : dbEst.pos_x;
        }
        if (typeof dbEst.pos_y === 'number' && dbEst.pos_y > 0) {
          y = dbEst.pos_y <= 100 ? (dbEst.pos_y / 100) * 1024 : dbEst.pos_y;
        }
      }

      const colab = dbEst?.colaborador_id ? colaboradores.find(c => c.id === dbEst.colaborador_id) : null;
      const eqVinculados = dbEst?.id
        ? equipamentos.filter(eq => eq.estacao_id === dbEst.id)
        : colab ? equipamentos.filter(eq => eq.colaborador_id === colab.id) : [];

      return {
        ...presetSeat,
        x,
        y,
        dbId: dbEst?.id || null,
        colaborador: colab,
        colaborador_id: dbEst?.colaborador_id || null,
        eqVinculados,
        isOcupado: !!colab || eqVinculados.length > 0
      };
    });
  }, [estacoesDb, colaboradores, equipamentos]);

  // Estatísticas Gerais
  const stats = useMemo(() => {
    const total = mappedSeats.length;
    const occupied = mappedSeats.filter(s => s.isOcupado).length;
    const free = total - occupied;
    return { total, occupied, free };
  }, [mappedSeats]);

  // Troca de Seção / Atalhos Rápidos
  const handleSelectSection = (sec) => {
    setActiveSectionId(sec.id);
    setCurrentViewBox(sec.viewBox);
    setZoomScale(1);
    if (sec.id === "cco") {
      setIsEditMode(true);
    }
  };

  // Zoom
  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => {
    setZoomScale(1);
    setActiveSectionId("all");
    setCurrentViewBox("0 0 688 1024");
  };

  // Clique no Assento
  const handleSeatClick = (seat) => {
    if (isEditMode) return;
    setSelectedSeat(seat);
    setModalStationCodigo(seat.codigo || seat.id);
    setModalColaboradorId(seat.colaborador_id || "__none__");
    setSelectedEquipmentsToAssign([]);
    setShowCreateModal(true);
  };

  // Salvar Modal
  const handleAssignSubmit = (e) => {
    e.preventDefault();
    const colabVal = modalColaboradorId === "__none__" ? null : modalColaboradorId;

    if (selectedSeat?.dbId) {
      updateEstacaoMut.mutate({
        id: selectedSeat.dbId,
        data: { colaborador_id: colabVal }
      });
      setShowCreateModal(false);
    } else {
      createEstacaoMut.mutate({
        andar: selectedSeat.sala || "Geral",
        sala: selectedSeat.sala || "Geral",
        imagem_planta: "planta_padronizada",
        codigo: modalStationCodigo,
        pos_x: Math.round((selectedSeat.x / 688) * 1000) / 10,
        pos_y: Math.round((selectedSeat.y / 1024) * 1000) / 10,
        colaborador_id: colabVal
      });
    }
  };

  // Equipamentos pendentes
  const equipamentosSemEstacao = useMemo(() => {
    return equipamentos.filter(e => !e.estacao_id);
  }, [equipamentos]);

  return (
    <div className="space-y-5">
      {/* ── ATALHOS RÁPIDOS DE SEÇÃO DA PLANTA ───────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 mr-1 uppercase tracking-wider hidden sm:inline">Ir para:</span>
          {UNIFIED_FLOORPLAN.sections.map(sec => {
            const isActive = activeSectionId === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => handleSelectSection(sec)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150 shadow-2xs flex items-center gap-1.5 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "bg-slate-100/80 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {sec.label}
              </button>
            );
          })}
        </div>

        {/* Controles de Zoom & Edição */}
        <div className="flex items-center gap-1 ml-auto shrink-0 border-l border-slate-200 pl-3">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 border-slate-200"
            onClick={handleZoomIn}
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-4 h-4 text-slate-700" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 border-slate-200"
            onClick={handleZoomOut}
            title="Reduzir Zoom"
          >
            <ZoomOut className="w-4 h-4 text-slate-700" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 border-slate-200"
            onClick={handleResetZoom}
            title="Resetar Visão"
          >
            <Maximize2 className="w-4 h-4 text-slate-700" />
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              variant={isEditMode ? "default" : "outline"}
              className={`h-8 ml-2 text-xs font-bold px-3 ${
                isEditMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-slate-200 text-slate-700"
              }`}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              {isEditMode ? "Modo Edição Ativo" : "Modo Edição"}
            </Button>
          )}
        </div>
      </div>

      {/* ── CARD PRINCIPAL DO MAPA VETORIAL SVG (0% PIXELAÇÃO) ────────────── */}
      <Card className="shadow-xs border-slate-200/80 bg-white rounded-2xl overflow-hidden">
        {/* Cabeçalho do Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Layout Geral de Salas (Desenho Vetorial SVG)</span>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                Vetor 100% Nítido (Estilo v0)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Clique sobre a foto ou botão <strong className="text-blue-600 font-bold">+</strong> para atribuir colaborador e equipamentos
            </p>
          </div>

          {/* Capacidade */}
          <div className="flex items-center gap-4 text-xs font-medium bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-sm">{stats.total}</span>
              <span className="text-slate-500">Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-blue-600 text-sm">{stats.occupied}</span>
              <span className="text-slate-500">Ocupados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-emerald-600 text-sm">{stats.free}</span>
              <span className="text-slate-500">Livres</span>
            </div>
          </div>
        </div>

        <CardContent className="p-3 sm:p-6 bg-slate-50/40">
          {/* Container Responsivo sem Scroll Horizontal com Fundo Limpo */}
          <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 sm:p-4 shadow-2xs flex justify-center items-center relative">
            <div
              className="w-full transition-transform duration-300 ease-out origin-top flex justify-center"
              style={{ transform: `scale(${zoomScale})` }}
            >
              <svg
                ref={svgRef}
                viewBox={currentViewBox}
                className="w-full h-auto max-h-[82vh] block select-none rounded-lg"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* 1. PAREDES EXTERNAS & OUTLINES DAS SALAS (Estilo v0) */}
                {UNIFIED_FLOORPLAN.rooms.map((room) => (
                  <g key={room.id}>
                    {/* Fundo de cada sala (Cinza-azulado muito suave) */}
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.w}
                      height={room.h}
                      rx={room.rx ?? 6}
                      fill="#F8FAFC"
                      stroke="#1E293B"
                      strokeWidth={3.5}
                    />

                    {/* Divisória interna única */}
                    {room.divider && (
                      <line
                        x1={room.divider.x1}
                        y1={room.divider.y1}
                        x2={room.divider.x2}
                        y2={room.divider.y2}
                        stroke="#334155"
                        strokeWidth={3}
                      />
                    )}

                    {/* Divisórias múltiplas */}
                    {room.dividers?.map((d, idx) => (
                      <line
                        key={idx}
                        x1={d.x1}
                        y1={d.y1}
                        x2={d.x2}
                        y2={d.y2}
                        stroke="#334155"
                        strokeWidth={3}
                      />
                    ))}

                    {/* Rótulo de Texto Principal */}
                    {room.textX && (
                      <text
                        x={room.textX}
                        y={room.textY}
                        fill="#94A3B8"
                        className="font-bold tracking-widest font-sans uppercase opacity-65 select-none"
                        fontSize={11}
                      >
                        {room.name}
                      </text>
                    )}

                    {/* Rótulos múltiplos */}
                    {room.textLabels?.map((t, idx) => (
                      <text
                        key={idx}
                        x={t.x}
                        y={t.y}
                        fill="#94A3B8"
                        className="font-bold tracking-widest font-sans uppercase opacity-65 select-none"
                        fontSize={11}
                      >
                        {t.text}
                      </text>
                    ))}
                  </g>
                ))}

                {/* 2. MÓVEIS VETORIAIS (Mesas, Baias, Armários, TVs, Balcões) */}
                {UNIFIED_FLOORPLAN.furniture.map((f, i) => (
                  <FurnitureVectorShape key={i} f={f} />
                ))}

                {/* 3. ASSENTOS INTERATIVOS & WORKSTATIONS (FOTO OU BOTÃO + FLUTUANTE) */}
                {mappedSeats.map((seat) => {
                  const size = 36;
                  const half = size / 2;
                  const occupied = seat.isOcupado;
                  const colab = seat.colaborador;
                  const seatColor = occupied ? getColabColor(seat.colaborador_id) : "#2563EB";

                  const photoUrl = colab?.foto_url || colab?.avatar_url || colab?.foto || (
                    colab?.nome_completo
                      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(colab.nome_completo)}&background=${seatColor.replace('#', '')}&color=fff&bold=true`
                      : null
                  );

                  return (
                    <g
                      key={seat.id}
                      transform={`translate(${seat.x} ${seat.y})`}
                      onClick={() => handleSeatClick(seat)}
                      className="cursor-pointer group"
                      role="button"
                    >
                      <defs>
                        <clipPath id={`avatar-clip-v2-${seat.id}`}>
                          <circle cx={0} cy={0} r={13} />
                        </clipPath>
                      </defs>

                      {/* Sombra no chão */}
                      <ellipse cx={0} cy={4} rx={14} ry={4} fill="#000000" opacity={0.15} className="transition-opacity group-hover:opacity-25" />

                      {/* Base da Cadeira */}
                      <rect
                        x={-half}
                        y={-half}
                        width={size}
                        height={size}
                        rx={7}
                        fill={occupied ? "rgba(15, 23, 42, 0.05)" : "rgba(37, 99, 235, 0.04)"}
                        stroke={occupied ? "#0F172A" : "#3B82F6"}
                        strokeWidth={occupied ? 1.5 : 1}
                        strokeDasharray={occupied ? undefined : "3 2"}
                        className="transition-all duration-150 group-hover:stroke-blue-600 group-hover:stroke-2"
                      />

                      {/* ELEMENTO FLUTUANTE (FOTO OU BOTÃO +) */}
                      <g
                        transform="translate(0, -6)"
                        className="transition-transform duration-200 group-hover:translate-y-[-10px]"
                      >
                        {occupied && colab ? (
                          <g>
                            <circle cx={0} cy={0} r={15} fill="#FFFFFF" stroke={seatColor} strokeWidth={2.2} className="shadow-md" />
                            {photoUrl ? (
                              <image
                                href={photoUrl}
                                x={-13}
                                y={-13}
                                width={26}
                                height={26}
                                clipPath={`url(#avatar-clip-v2-${seat.id})`}
                                preserveAspectRatio="xMidYMid slice"
                              />
                            ) : (
                              <circle cx={0} cy={0} r={13} fill={seatColor} />
                            )}
                            {!photoUrl && (
                              <text
                                x={0}
                                y={4}
                                textAnchor="middle"
                                style={{ fontSize: 10, fill: "white", fontWeight: "bold" }}
                              >
                                {getInitials(colab.nome_completo)}
                              </text>
                            )}
                          </g>
                        ) : (
                          <g>
                            <circle
                              cx={0}
                              cy={0}
                              r={12}
                              fill="#2563EB"
                              stroke="#FFFFFF"
                              strokeWidth={2}
                              className="shadow-md transition-colors group-hover:fill-blue-700"
                            />
                            <text
                              x={0}
                              y={4}
                              textAnchor="middle"
                              style={{ fontSize: 15, fill: "white", fontWeight: "bold" }}
                            >
                              +
                            </text>
                          </g>
                        )}
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── GAVETA DE EQUIPAMENTOS NÃO POSICIONADOS ────────────────────────── */}
      {equipamentosSemEstacao.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30 shadow-xs rounded-2xl">
          <div className="p-4 border-b border-amber-100 flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold text-amber-900 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Equipamentos Pendentes de Posicionamento ({equipamentosSemEstacao.length})
            </span>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-40 overflow-y-auto">
              {equipamentosSemEstacao.map(eq => (
                <div key={eq.id} className="bg-white border border-amber-200 rounded-xl p-2.5 text-xs flex items-center justify-between shadow-2xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-bold text-slate-900 truncate">{eq.tipo} — {eq.marca} {eq.modelo}</p>
                    <p className="text-slate-500 text-[11px] truncate">Usuário: {eq.usuario_atual || "Sem usuário"}</p>
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] shrink-0 border-amber-300 hover:bg-amber-100 text-amber-900" onClick={() => onEditEquipamento?.(eq)}>
                      Vincular
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── MODAL DE ATRIBUIÇÃO DE ASSENTO ─────────────────────────────────── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Estação {modalStationCodigo} — {selectedSeat?.sala || "Planta Geral"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione o colaborador ocupante e atribua os equipamentos de TI desta mesa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Colaborador Ocupante</Label>
              <Select value={modalColaboradorId} onValueChange={setModalColaboradorId}>
                <SelectTrigger className="mt-1 h-9 text-xs rounded-xl"><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs font-semibold text-slate-500">
                    — Assento Vago (Ninguém alocado) —
                  </SelectItem>
                  {colaboradores.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.nome_completo} ({c.area})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Equipamentos para Atribuir a esta Mesa</Label>
              <div className="mt-1 border border-slate-200 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1.5 bg-slate-50">
                {equipamentosSemEstacao.length === 0 ? (
                  <p className="text-slate-400 text-[11px] italic">Não há equipamentos sem estação disponível.</p>
                ) : (
                  equipamentosSemEstacao.map(eq => {
                    const isChecked = selectedEquipmentsToAssign.includes(eq.id);
                    const toggleEq = () => {
                      setSelectedEquipmentsToAssign(prev =>
                        isChecked ? prev.filter(id => id !== eq.id) : [...prev, eq.id]
                      );
                    };
                    return (
                      <div key={eq.id} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg text-[11px] cursor-pointer" onClick={toggleEq}>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={isChecked} onChange={() => {}} className="w-3.5 h-3.5 accent-blue-600 rounded" />
                          <span className="font-semibold text-slate-900">{eq.tipo}: {eq.marca} {eq.modelo}</span>
                        </div>
                        <span className="font-mono text-slate-400">{eq.etiqueta_interna}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex items-center justify-between">
              {selectedSeat?.dbId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:bg-red-50 text-xs rounded-xl"
                  onClick={() => deleteEstacaoMut.mutate(selectedSeat.dbId)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Desvincular Mesa
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-white">
                  Salvar Alterações
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
