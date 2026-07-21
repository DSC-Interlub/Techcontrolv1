/**
 * PlantaInterativa.jsx — Réplica 100% Fiel do Projeto v0 (Planta Vetorial SVG + Assentos com "+")
 * 
 * 1. Visual 100% idêntico às imagens do v0 (Paredes pretas de 5px, móveis com stroke escuro, assentos tracejados com "+", encosto de cadeira e iniciais coloridas).
 * 2. Contador no topo direito: "X Lugares  Y Ocupados  Z Livres".
 * 3. Assentos Vagos: Retângulo tracejado com encosto + símbolo "+" no centro. Ao clicar, abre atribuição de colaborador/máquinas.
 * 4. Assentos Ocupados: Preenchimento com cor sólida (ex: Azul/Roxo #4F46E5) + Iniciais do colaborador em branco (ex: "AS").
 */
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { SVG_ROOMS } from "./floorplanRooms";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Monitor, Laptop, Pencil, Trash2, AlertTriangle, UserPlus,
  DollarSign, Briefcase, Building, Package, Activity, Sparkles, Image as ImageIcon
} from "lucide-react";

export const SALAS = [
  {
    id: "sala_financeiro",
    nome: "Sala Financeiro",
    descricao: "4 Lugares",
    icon: DollarSign,
  },
  {
    id: "adm_1andar",
    nome: "ADM — 1º Andar",
    descricao: "20 Lugares",
    icon: Briefcase,
  },
  {
    id: "mezanino_bsm_drc",
    nome: "Mezanino — Sala BSM / Sala DRC",
    descricao: "12 Lugares",
    icon: Building,
  },
  {
    id: "galpao_bio_reenvase_checkout",
    nome: "Galpão — Bio / Reenvase / Check Out",
    descricao: "3 Lugares",
    icon: Package,
  },
  {
    id: "galpao_centro_controle_operacional",
    nome: "Centro de Controle Operacional",
    descricao: "2 Lugares",
    icon: Activity,
  }
];

// Helper para obter as iniciais (ex: "Ana Silva" -> "AS")
function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// CORES DE ATRIBUIÇÃO ESTILO V0 (#4F46E5, #2563EB, #059669, #D97706, #7C3AED)
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

export default function PlantaInterativa({
  isAdmin = true,
  equipamentos = [],
  colaboradores = [],
  chamados = [],
  onEditEquipamento
}) {
  const queryClient = useQueryClient();
  const [salaAtivaId, setSalaAtivaId] = useState("sala_financeiro");
  const [renderMode, setRenderMode] = useState("svg"); // "svg" ou "image"
  const [selectedSeat, setSelectedSeat] = useState(null);

  // Modal de Criação / Atribuição
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalStationCodigo, setModalStationCodigo] = useState("");
  const [modalColaboradorId, setModalColaboradorId] = useState("__none__");
  const [selectedEquipmentsToAssign, setSelectedEquipmentsToAssign] = useState([]);

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
    }
  });

  const updatePcsMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PCs_Internos.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
    }
  });

  // Estações salvas no DB para a sala ativa
  const estacoesDaSala = useMemo(() => {
    return estacoes.filter(e => e.sala === salaAtual.nome || e.imagem_planta === salaAtual.id);
  }, [estacoes, salaAtual]);

  // Lista de assentos mapeando o SVG e o DB
  const mappedSeats = useMemo(() => {
    if (!svgRoom?.seats) return [];
    return svgRoom.seats.map(seat => {
      const dbEst = estacoesDaSala.find(e => e.codigo === seat.codigo || e.codigo === seat.id);
      const colab = dbEst?.colaborador_id ? colaboradores.find(c => c.id === dbEst.colaborador_id) : null;
      const eqVinculados = dbEst?.id
        ? equipamentos.filter(eq => eq.estacao_id === dbEst.id)
        : colab ? equipamentos.filter(eq => eq.colaborador_id === colab.id) : [];

      return {
        ...seat,
        dbId: dbEst?.id || null,
        colaborador: colab,
        colaborador_id: dbEst?.colaborador_id || null,
        eqVinculados,
        isOcupado: !!colab || eqVinculados.length > 0
      };
    });
  }, [svgRoom, estacoesDaSala, colaboradores, equipamentos]);

  // Estatísticas v0
  const roomStats = useMemo(() => {
    const total = mappedSeats.length;
    const occupied = mappedSeats.filter(s => s.isOcupado).length;
    const free = total - occupied;
    return { total, occupied, free };
  }, [mappedSeats]);

  // Abrir Modal de Atribuição
  const handleSeatClick = (seat) => {
    setSelectedSeat(seat);
    setModalStationCodigo(seat.codigo || seat.id);
    setModalColaboradorId(seat.colaborador_id || "__none__");
    setSelectedEquipmentsToAssign([]);
    setShowCreateModal(true);
  };

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
        andar: salaAtual.nome,
        sala: salaAtual.nome,
        imagem_planta: salaAtual.id,
        codigo: modalStationCodigo,
        pos_x: selectedSeat.x,
        pos_y: selectedSeat.y,
        colaborador_id: colabVal
      });
    }
  };

  // Equipamentos sem estação
  const equipamentosSemEstacao = useMemo(() => {
    return equipamentos.filter(e => !e.estacao_id);
  }, [equipamentos]);

  return (
    <div className="space-y-6">
      {/* ── BARRA DE SELEÇÃO DAS SALAS (ESTILO ABAS V0) ────────────────── */}
      <div className="flex flex-wrap gap-2">
        {SALAS.map(sala => {
          const isSelected = salaAtivaId === sala.id;
          return (
            <button
              key={sala.id}
              onClick={() => {
                setSalaAtivaId(sala.id);
                setSelectedSeat(null);
              }}
              className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-150 shadow-2xs ${
                isSelected
                  ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              {sala.nome}
            </button>
          );
        })}
      </div>

      {/* ── PAINEL PRINCIPAL DA PLANTA (MOLDURA E CABEÇALHO IDÊNTICO AO V0) ─ */}
      <Card className="shadow-xs border-gray-200 bg-white rounded-2xl overflow-hidden">
        {/* Cabeçalho do v0: Título à esquerda, Estatísticas à direita */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-gray-100 bg-gray-50/30">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{salaAtual.nome}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Clique em qualquer cadeira com <strong className="text-slate-600 font-bold">+</strong> para atribuir ou alterar uma pessoa</p>
          </div>

          {/* Estatísticas numéricas idênticas ao v0 */}
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-gray-900">{roomStats.total}</span>
              <span className="text-gray-500 text-xs">Lugares</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-indigo-600">{roomStats.occupied}</span>
              <span className="text-gray-500 text-xs">Ocupados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-slate-500">{roomStats.free}</span>
              <span className="text-gray-500 text-xs">Livres</span>
            </div>

            {/* Alternador de Renderização */}
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5 bg-white ml-2">
              <Button
                size="sm"
                variant={renderMode === "svg" ? "default" : "ghost"}
                className={`h-7 text-[11px] px-2 font-bold ${renderMode === "svg" ? "bg-indigo-600 text-white" : "text-gray-600"}`}
                onClick={() => setRenderMode("svg")}
              >
                <Sparkles className="w-3 h-3 mr-1" /> Vetorial v0
              </Button>
              <Button
                size="sm"
                variant={renderMode === "image" ? "default" : "ghost"}
                className={`h-7 text-[11px] px-2 font-bold ${renderMode === "image" ? "bg-indigo-600 text-white" : "text-gray-600"}`}
                onClick={() => setRenderMode("image")}
              >
                <ImageIcon className="w-3 h-3 mr-1" /> Imagem
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-4 sm:p-8 bg-gray-50/20">
          {/* MOLDURA EXTERNA DA PLANTA EM SVG (IDÊNTICA AO V0) */}
          <div className="w-full overflow-auto rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-2xs flex justify-center items-center">
            {renderMode === "svg" && svgRoom ? (
              <svg
                viewBox={`0 0 ${svgRoom.width} ${svgRoom.height}`}
                className="w-full h-auto block select-none"
                style={{ maxHeight: "75vh" }}
              >
                {/* 1. Contorno externo das paredes (Paredes Grossas #0F172A) */}
                <rect
                  x={svgRoom.outline.x}
                  y={svgRoom.outline.y}
                  width={svgRoom.outline.w}
                  height={svgRoom.outline.h}
                  rx={svgRoom.outline.rx ?? 4}
                  fill="#FFFFFF"
                  stroke="#0F172A"
                  strokeWidth={5}
                />

                {/* 2. Divisórias de paredes internas */}
                {svgRoom.walls?.map((w, i) => (
                  <line
                    key={i}
                    x1={w.x1}
                    y1={w.y1}
                    x2={w.x2}
                    y2={w.y2}
                    stroke="#0F172A"
                    strokeWidth={5}
                  />
                ))}

                {/* 3. Móveis (Mesas, TVs, Armários, Mesas Redondas) */}
                {svgRoom.furniture?.map((f, i) => {
                  if (f.kind === "round") {
                    return (
                      <circle
                        key={i}
                        cx={f.x + f.w / 2}
                        cy={f.y + f.h / 2}
                        r={f.w / 2}
                        fill="#F8FAFC"
                        stroke="#334155"
                        strokeWidth={2}
                      />
                    );
                  }
                  if (f.kind === "tv") {
                    return (
                      <g key={i}>
                        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={3} fill="#0F172A" stroke="#020617" strokeWidth={2} />
                        <rect x={f.x + 4} y={f.y + 4} width={f.w - 8} height={f.h - 8} rx={2} fill="#F1F5F9" />
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
                      rx={f.kind === "desk" ? 2 : 3}
                      fill="#F8FAFC"
                      stroke="#475569"
                      strokeWidth={2}
                    />
                  );
                })}

                {/* 4. Rótulos de Texto Arquitetônicos v0 */}
                {svgRoom.textLabels?.map((t, i) => (
                  <text
                    key={i}
                    x={t.x}
                    y={t.y}
                    transform={t.rotate ? `rotate(${t.rotate} ${t.x} ${t.y})` : undefined}
                    fill="#CBD5E1"
                    className="font-bold tracking-wider font-sans uppercase"
                    fontSize={t.size ?? 18}
                  >
                    {t.text}
                  </text>
                ))}

                {/* 5. CADEIRAS / ASSENTOS INTERATIVOS DO V0 (CADEIRA COM ENCOSTO + '+' OU INICIAIS) */}
                {mappedSeats.map((seat) => {
                  const size = 40;
                  const half = size / 2;
                  const occupied = seat.isOcupado;
                  const seatColor = occupied ? getColabColor(seat.colaborador_id) : "#FFFFFF";

                  return (
                    <g
                      key={seat.id}
                      transform={`translate(${seat.x} ${seat.y}) rotate(${seat.rotate ?? 0})`}
                      onClick={() => handleSeatClick(seat)}
                      className="cursor-pointer group"
                      role="button"
                    >
                      {/* Encosto da cadeira v0 */}
                      <rect
                        x={-half}
                        y={-half - 6}
                        width={size}
                        height={10}
                        rx={3}
                        fill="#94A3B8"
                        opacity={0.7}
                      />

                      {/* Base do assento v0 (Tracejado se livre, Sólido se ocupado) */}
                      <rect
                        x={-half}
                        y={-half + 2}
                        width={size}
                        height={size}
                        rx={8}
                        fill={seatColor}
                        stroke={occupied ? "#1E293B" : "#94A3B8"}
                        strokeDasharray={occupied ? undefined : "4 3"}
                        strokeWidth={2}
                        className="transition-all duration-150 group-hover:stroke-blue-600 group-hover:stroke-2"
                      />

                      {/* Conteúdo: Iniciais do Colaborador (ex: "AS") ou Símbolo "+" */}
                      <g transform={`rotate(${-(seat.rotate ?? 0)})`}>
                        {occupied && seat.colaborador ? (
                          <text
                            x={0}
                            y={half - 10}
                            textAnchor="middle"
                            style={{ fontSize: 14, fill: "white", fontWeight: "bold" }}
                          >
                            {getInitials(seat.colaborador.nome_completo)}
                          </text>
                        ) : (
                          <text
                            x={0}
                            y={half - 6}
                            textAnchor="middle"
                            style={{ fontSize: 20, fill: "#64748B" }}
                          >
                            +
                          </text>
                        )}
                      </g>
                    </g>
                  );
                })}
              </svg>
            ) : (
              /* MODO IMAGEM HI-RES */
              <img
                src={salaAtual.imagem}
                alt={salaAtual.nome}
                className="w-full h-auto block rounded-lg select-none border border-gray-100 shadow-2xs"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── GAVETA DE EQUIPAMENTOS NÃO POSICIONADOS ────────────────────────── */}
      {equipamentosSemEstacao.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/20 shadow-xs rounded-2xl">
          <div className="p-4 border-b border-amber-100 flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold text-amber-900 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              ⚠️ Equipamentos pendentes de atribuição ({equipamentosSemEstacao.length})
            </span>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
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

      {/* ── MODAL DE ATRIBUIÇÃO DE ASSENTO ─────────────────────────────────── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              Gerenciar Assento {modalStationCodigo} — {salaAtual.nome}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Selecione o colaborador que ocupará este lugar e atribua os equipamentos de TI.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Colaborador Ocupante</Label>
              <Select value={modalColaboradorId} onValueChange={setModalColaboradorId}>
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs font-semibold text-gray-500">
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

            {/* Equipamentos alocados / disponíveis */}
            <div>
              <Label className="text-xs font-semibold text-gray-700">Equipamentos para Atribuir a esta Mesa</Label>
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

            <DialogFooter className="pt-3 border-t flex items-center justify-between">
              {selectedSeat?.dbId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:bg-red-50 text-xs"
                  onClick={() => deleteEstacaoMut.mutate(selectedSeat.dbId)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Desvincular Mesa
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-bold">
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
