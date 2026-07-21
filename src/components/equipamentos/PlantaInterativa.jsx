/**
 * PlantaInterativa.jsx — Mapeamento Espacial das Salas Físicas
 * Integrado visualmente ao TechControl com suporte às 5 plantas recortadas de salas:
 * 1. Sala Financeiro
 * 2. ADM 1º Andar (Área Aberta)
 * 3. Mezanino (BSM & DRC)
 * 4. Galpão (BIO, Reenvase & Check-out)
 * 5. Centro de Controle Operacional (CCO)
 */
import React, { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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
  DollarSign, Briefcase, Building, Package, Activity, RefreshCw, Check
} from "lucide-react";

export const SALAS = [
  {
    id: "sala_financeiro",
    nome: "Sala Financeiro",
    descricao: "Escritório do Departamento Financeiro",
    imagem: "/plantas/sala_financeiro.png",
    icon: DollarSign,
    corBadge: "bg-emerald-100 text-emerald-800 border-emerald-200"
  },
  {
    id: "adm_1andar",
    nome: "ADM 1º Andar (Área Aberta)",
    descricao: "Bancadas abertas da Administração no 1º Andar",
    imagem: "/plantas/adm_1andar.png",
    icon: Briefcase,
    corBadge: "bg-blue-100 text-blue-800 border-blue-200"
  },
  {
    id: "mezanino_bsm_drc",
    nome: "Mezanino (BSM & DRC)",
    descricao: "Salas BSM e DRC localizadas no Mezanino",
    imagem: "/plantas/mezanino_bsm_drc.png",
    icon: Building,
    corBadge: "bg-purple-100 text-purple-800 border-purple-200"
  },
  {
    id: "galpao_bio_reenvase_checkout",
    nome: "Galpão (BIO, Reenvase & Check-out)",
    descricao: "Área operacional de BIO, Reenvase e Check-out",
    imagem: "/plantas/galpao_bio_reenvase_checkout.png",
    icon: Package,
    corBadge: "bg-amber-100 text-amber-800 border-amber-200"
  },
  {
    id: "galpao_centro_controle_operacional",
    nome: "Centro de Controle Operacional (CCO)",
    descricao: "Central de Operações e Monitoramento Operacional",
    imagem: "/plantas/galpao_centro_controle_operacional.png",
    icon: Activity,
    corBadge: "bg-indigo-100 text-indigo-800 border-indigo-200"
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
  const [modoEdicao, setModoEdicao] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [draggingStation, setDraggingStation] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);

  // Estados do Modal de Criação de Estação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStationPos, setNewStationPos] = useState({ x: 50, y: 50 });
  const [newStationCodigo, setNewStationCodigo] = useState("");
  const [newStationColaborador, setNewStationColaborador] = useState("__none__");
  const [selectedEquipmentsToAssign, setSelectedEquipmentsToAssign] = useState([]);

  const imgRef = useRef(null);
  const salaAtual = useMemo(() => SALAS.find(s => s.id === salaAtivaId) || SALAS[0], [salaAtivaId]);

  // Queries de Estações de Trabalho
  const { data: estacoes = [], isLoading: loadEstacoes } = useQuery({
    queryKey: ['estacoes_trabalho'],
    queryFn: () => base44.entities.Estacoes_Trabalho.list(),
    staleTime: 10_000,
  });

  // Mutations
  const createEstacaoMut = useMutation({
    mutationFn: (data) => base44.entities.Estacoes_Trabalho.create(data),
    onSuccess: async (novaEstacao) => {
      // Se selecionou equipamentos para atribuir no momento da criação
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
    if (!modoEdicao || !draggingStation || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const posX = Math.max(3, Math.min(97, parseFloat(x.toFixed(2))));
    const posY = Math.max(3, Math.min(97, parseFloat(y.toFixed(2))));

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

  // Clique na planta para criar nova estação (Modo Edição)
  const handleImageClick = (e) => {
    if (!modoEdicao || draggingStation || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const posX = Math.max(3, Math.min(97, parseFloat(x.toFixed(2))));
    const posY = Math.max(3, Math.min(97, parseFloat(y.toFixed(2))));

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

  // Calcular status do Pin da Estação
  const getEstacaoStatus = (estacao) => {
    const colab = colaboradores.find(c => c.id === estacao.colaborador_id);
    const eqVinculados = equipamentos.filter(eq => eq.estacao_id === estacao.id || (colab && eq.colaborador_id === colab.id));

    if (!estacao.colaborador_id && eqVinculados.length === 0) {
      return { cor: "bg-slate-400 text-white border-slate-600", label: "Vaga", tipo: "vaga", colab, eqVinculados };
    }

    const temChamadoAberto = colab ? chamados.some(c =>
      (c.solicitante_nome === colab.nome_completo || c.solicitante_email === colab.email) &&
      !['Resolvido', 'Cancelado'].includes(c.status)
    ) : false;

    const temEquipManutencao = eqVinculados.some(eq => ['Manutenção', 'Formatação', 'Danificado'].includes(eq.status));

    if (temChamadoAberto || temEquipManutencao) {
      return { cor: "bg-amber-500 text-white border-amber-600 animate-pulse", label: "Alerta / Manutenção", tipo: "alerta", colab, eqVinculados, temChamadoAberto, temEquipManutencao };
    }

    return { cor: "bg-emerald-600 text-white border-emerald-700", label: "Operacional", tipo: "operacional", colab, eqVinculados };
  };

  // Stats da Sala Ativa
  const statsSala = useMemo(() => {
    const totalMesas = estacoesDaSala.length;
    const ocupadas = estacoesDaSala.filter(e => e.colaborador_id).length;
    const vagas = totalMesas - ocupadas;
    const alertas = estacoesDaSala.filter(e => getEstacaoStatus(e).tipo === "alerta").length;
    const totalEquips = equipamentos.filter(eq => estacoesDaSala.some(es => es.id === eq.estacao_id)).length;
    return { totalMesas, ocupadas, vagas, alertas, totalEquips };
  }, [estacoesDaSala, equipamentos, colaboradores, chamados]);

  const SalaIcon = salaAtual.icon;

  return (
    <div className="space-y-6">
      {/* ── BARRA DE SELEÇÃO DAS 5 SALAS (NAVEGAÇÃO POR SALA) ──────────────── */}
      <div className="bg-white border rounded-2xl p-3 shadow-sm">
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
                    ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge className={`text-[10px] ${sala.corBadge}`}>
                    {qtdMesas} mesa{qtdMesas !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div>
                  <p className={`font-bold text-xs ${isSelected ? "text-indigo-950" : "text-gray-900"}`}>{sala.nome}</p>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">{sala.descricao}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CABEÇALHO DO CARD DA SALA SELECIONADA (SISTEMA LOOK & FEEL) ────── */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-4 border-b bg-gray-50/50 rounded-t-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                <SalaIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold text-gray-900">{salaAtual.nome}</CardTitle>
                  <Badge className={salaAtual.corBadge}>{salaAtual.descricao}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Mapeamento físico em tempo real dos computadores e colaboradores</p>
              </div>
            </div>

            {/* Ações: Zoom + Toggle Edição */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 border rounded-lg p-1 bg-white shadow-xs">
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
                  className="text-xs font-medium"
                  onClick={() => setModoEdicao(!modoEdicao)}
                >
                  {modoEdicao ? "✓ Concluir Edição" : "✏️ Editar Posicionamento das Mesas"}
                </Button>
              )}
            </div>
          </div>

          {/* Quick Stats Bar da Sala */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t mt-4">
            <div className="bg-white border rounded-lg p-2.5 text-center">
              <p className="text-[11px] text-gray-500">Total de Mesas</p>
              <p className="text-base font-black text-gray-900">{statsSala.totalMesas}</p>
            </div>
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-2.5 text-center">
              <p className="text-[11px] text-emerald-700 font-medium">Ocupadas / Operacionais</p>
              <p className="text-base font-black text-emerald-950">{statsSala.ocupadas}</p>
            </div>
            <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-2.5 text-center">
              <p className="text-[11px] text-amber-700 font-medium">Em Alerta / Manutenção</p>
              <p className="text-base font-black text-amber-950">{statsSala.alertas}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
              <p className="text-[11px] text-slate-600">Mesas Vagas</p>
              <p className="text-base font-black text-slate-800">{statsSala.vagas}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 bg-slate-900/95 overflow-hidden">
          {modoEdicao && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 text-xs text-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Modo de Edição Ativo:</strong> Arraste os Pins sobre a planta para definir posições exatas. Clique em uma área vazia da imagem para adicionar uma nova mesa.
                </span>
              </div>
            </div>
          )}

          {/* ── CONTAINER DA IMAGEM DA PLANTA DA SALA ────────────────────── */}
          <div className="rounded-xl border border-slate-800 overflow-auto bg-slate-950 p-4 shadow-inner relative flex justify-center">
            <div
              className="relative transition-transform duration-150 origin-top-left inline-block"
              style={{ transform: `scale(${zoomLevel})` }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* Imagem da Planta da Sala */}
              <img
                ref={imgRef}
                src={salaAtual.imagem}
                alt={salaAtual.nome}
                className="max-w-none w-auto h-auto rounded-lg block select-none cursor-pointer shadow-2xl"
                onClick={handleImageClick}
                draggable={false}
              />

              {/* PINS DAS MESAS / ESTAÇÕES */}
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
                        {/* Pin Visual */}
                        <div className={`w-8 h-8 rounded-full border-2 shadow-xl flex items-center justify-center font-black text-xs ${statusInfo.cor}`}>
                          {estacao.codigo}
                        </div>

                        {/* Rótulo Colaborador abaixo do Pin */}
                        <div className="bg-slate-900/95 text-white text-[10px] px-2 py-0.5 rounded shadow mt-1 whitespace-nowrap font-medium border border-slate-700">
                          {statusInfo.colab?.nome_completo ? statusInfo.colab.nome_completo.split(" ")[0] : "Vaga"}
                        </div>
                      </div>
                    </PopoverTrigger>

                    {/* Popover com Detalhes da Mesa */}
                    <PopoverContent className="w-80 p-4 shadow-xl border-gray-200">
                      <div className="space-y-3 text-xs">
                        <div className="flex items-start justify-between border-b pb-2">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{estacao.codigo} • {salaAtual.nome}</p>
                            <p className="text-[11px] text-gray-500">Mapeamento Físico de TI</p>
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
                          <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-lg border">
                            {statusInfo.colab.foto_url ? (
                              <img src={statusInfo.colab.foto_url} alt="" className="w-10 h-10 rounded-full object-cover border" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
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

                        {/* Alertas */}
                        {statusInfo.temChamadoAberto && (
                          <div className="bg-amber-50 border border-amber-200 p-2 rounded text-amber-900 text-[11px] flex items-center gap-1.5 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Possui chamado aberto no Helpdesk!</span>
                          </div>
                        )}

                        {/* Equipamentos */}
                        <div>
                          <p className="font-semibold text-gray-700 mb-1.5 uppercase text-[10px] tracking-wider">
                            Equipamentos nesta bancada ({statusInfo.eqVinculados.length})
                          </p>
                          {statusInfo.eqVinculados.length === 0 ? (
                            <p className="text-gray-400 italic text-[11px]">Nenhum equipamento atribuído.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                              {statusInfo.eqVinculados.map(eq => (
                                <div key={eq.id} className="flex items-center justify-between bg-white border p-2 rounded text-[11px]">
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
        <Card className="border-amber-200 bg-amber-50/20 shadow-sm">
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
                    <Button size="sm" variant="outline" className="h-7 text-[10px] shrink-0" onClick={() => onEditEquipamento?.(eq)}>
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
              Posição percentual no mapa: X: {newStationPos.x}%, Y: {newStationPos.y}%
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

            {/* Seleção de Equipamentos Disponíveis no ato da criação */}
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
                          <input type="checkbox" checked={isChecked} onChange={() => {}} className="w-3.5 h-3.5 accent-indigo-600" />
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
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={createEstacaoMut.isPending}>
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
