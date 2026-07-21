/**
 * PlantaInterativa.jsx — Mapeamento Espacial das Estações de Trabalho (Opção B)
 * Permite visualizar e editar o posicionamento físico de colaboradores e equipamentos sobre as plantas baixas da empresa.
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
  Monitor, Laptop, Smartphone, Eye, Plus, Pencil, Trash2, MapPin,
  Move, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, CheckCircle, User, Loader2, Info
} from "lucide-react";

export const ANDARES = ["ADM Térreo", "ADM 1º Andar", "Galpão", "Mezanino"];

export const SALAS_POR_ANDAR = {
  "ADM Térreo": [
    "Sala BSM", "Sala DRC", "Sala BIO", "Sala de Reenvase", "Check-out", "Centro de Controle Operacional"
  ],
  "ADM 1º Andar": [
    "ADM 1º Andar (Área Aberta)", "Sala Financeiro"
  ],
  "Galpão": [
    "Área Galpão"
  ],
  "Mezanino": [
    "Área Mezanino"
  ]
};

export const PLANTAS_IMAGENS = {
  "ADM Térreo": "/plantas/planta_adm_terreo.png",
  "ADM 1º Andar": "/plantas/planta_adm_1andar.png",
  "Galpão": "/plantas/planta_galpao.png",
  "Mezanino": "/plantas/planta_mezanino.png",
};

export default function PlantaInterativa({
  isAdmin = true,
  equipamentos = [],
  colaboradores = [],
  chamados = [],
  onEditEquipamento
}) {
  const queryClient = useQueryClient();
  const [andarAtual, setAndarAtual] = useState("ADM Térreo");
  const [modoEdicao, setModoEdicao] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [draggingStation, setDraggingStation] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStationPos, setNewStationPos] = useState({ x: 50, y: 50 });
  const [newStationSala, setNewStationSala] = useState("");
  const [newStationCodigo, setNewStationCodigo] = useState("");
  const [newStationColaborador, setNewStationColaborador] = useState("");

  const mapContainerRef = useRef(null);
  const imgRef = useRef(null);

  // Queries
  const { data: estacoes = [], isLoading: loadEstacoes } = useQuery({
    queryKey: ['estacoes_trabalho'],
    queryFn: () => base44.entities.Estacoes_Trabalho.list(),
    staleTime: 10_000,
  });

  // Mutations
  const createEstacaoMut = useMutation({
    mutationFn: (data) => base44.entities.Estacoes_Trabalho.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estacoes_trabalho'] });
      setShowCreateModal(false);
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
      setSelectedStation(null);
    }
  });

  const updatePcsMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PCs_Internos.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
    }
  });

  // Estações do Andar selecionado
  const estacoesDoAndar = useMemo(() => {
    return estacoes.filter(e => e.andar === andarAtual);
  }, [estacoes, andarAtual]);

  // Equipamentos sem estação vinculada
  const equipamentosSemEstacao = useMemo(() => {
    return equipamentos.filter(e => !e.estacao_id);
  }, [equipamentos]);

  // Handler para início do arrasto de Pin (Modo Edição)
  const handlePinMouseDown = (e, estacao) => {
    if (!modoEdicao) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingStation(estacao);
  };

  // Handler para movimentação no container da planta
  const handleMouseMove = (e) => {
    if (!modoEdicao || !draggingStation || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
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

  // Clique na imagem para criar nova estação no modo edição
  const handleImageClick = (e) => {
    if (!modoEdicao || draggingStation || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const posX = Math.max(2, Math.min(98, parseFloat(x.toFixed(2))));
    const posY = Math.max(2, Math.min(98, parseFloat(y.toFixed(2))));

    const salasDisponiveis = SALAS_POR_ANDAR[andarAtual] || [];
    setNewStationPos({ x: posX, y: posY });
    setNewStationSala(salasDisponiveis[0] || "");
    const num = estacoesDoAndar.length + 1;
    setNewStationCodigo(`M-${num < 10 ? '0' + num : num}`);
    setNewStationColaborador("");
    setShowCreateModal(true);
  };

  const handleCreateStationSubmit = (e) => {
    e.preventDefault();
    createEstacaoMut.mutate({
      andar: andarAtual,
      sala: newStationSala,
      codigo: newStationCodigo,
      pos_x: newStationPos.x,
      pos_y: newStationPos.y,
      colaborador_id: newStationColaborador === "__none__" ? null : (newStationColaborador || null),
    });
  };

  // Calcular status do Pin da Estação
  const getEstacaoStatus = (estacao) => {
    const colab = colaboradores.find(c => c.id === estacao.colaborador_id);
    const eqVinculados = equipamentos.filter(eq => eq.estacao_id === estacao.id || (colab && eq.colaborador_id === colab.id));

    if (!estacao.colaborador_id && eqVinculados.length === 0) {
      return { cor: "bg-slate-400 text-white border-slate-500", label: "Vaga", tipo: "vaga", colab, eqVinculados };
    }

    // Verificar se há chamados abertos para o colaborador
    const temChamadoAberto = colab ? chamados.some(c =>
      (c.solicitante_nome === colab.nome_completo || c.solicitante_email === colab.email) &&
      !['Resolvido', 'Cancelado'].includes(c.status)
    ) : false;

    // Verificar se algum equipamento está com status de problema/manutenção
    const temEquipManutencao = eqVinculados.some(eq => ['Manutenção', 'Formatação', 'Danificado'].includes(eq.status));

    if (temChamadoAberto || temEquipManutencao) {
      return { cor: "bg-amber-500 text-white border-amber-600 animate-pulse", label: "Alerta / Manutenção", tipo: "alerta", colab, eqVinculados, temChamadoAberto, temEquipManutencao };
    }

    return { cor: "bg-emerald-600 text-white border-emerald-700", label: "Operacional", tipo: "operacional", colab, eqVinculados };
  };

  return (
    <div className="space-y-4">
      {/* ── BARRA SUPERIOR DE CONTROLE E ANDARES ─────────────────────────── */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Abas por Andar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {ANDARES.map(andar => (
            <Button
              key={andar}
              size="sm"
              variant={andarAtual === andar ? "default" : "outline"}
              className={`text-xs font-semibold shrink-0 ${
                andarAtual === andar ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-gray-700"
              }`}
              onClick={() => setAndarAtual(andar)}
            >
              🏢 {andar}
            </Button>
          ))}
        </div>

        {/* Botões de Ação e Zoom */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Controles de Zoom */}
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-gray-50">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(z => Math.max(0.8, z - 0.2))} title="Diminuir Zoom">
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[11px] font-mono font-medium px-1 text-gray-600">{Math.round(zoomLevel * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.2))} title="Aumentar Zoom">
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(1)} title="Resetar">
              <RotateCcw className="w-3 h-3 text-gray-500" />
            </Button>
          </div>

          {/* Toggle Modo Edição Admin */}
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

      {/* Banner Informativo no Modo Edição */}
      {modoEdicao && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Modo de Edição Ativo:</strong> Arraste qualquer Pin para reposicioná-lo sobre a planta ou clique em uma área vazia para criar uma nova estação de trabalho.
            </span>
          </div>
        </div>
      )}

      {/* ── ÁREA PRINCIPAL DO MAPA DA PLANTA (CONTAINER ZOOM/PAN) ──────────── */}
      <Card className="shadow-sm overflow-hidden border-gray-200">
        <CardContent className="p-0 relative bg-slate-900 min-h-[500px] overflow-auto">
          <div
            ref={mapContainerRef}
            className="relative transition-transform duration-150 origin-top-left inline-block min-w-full"
            style={{ transform: `scale(${zoomLevel})` }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Imagem da Planta Baixa */}
            <img
              ref={imgRef}
              src={PLANTAS_IMAGENS[andarAtual]}
              alt={`Planta ${andarAtual}`}
              className="w-full h-auto max-w-none block select-none cursor-pointer"
              onClick={handleImageClick}
              draggable={false}
            />

            {/* PINS DAS ESTAÇÕES SOBRE A PLANTA */}
            {estacoesDoAndar.map(estacao => {
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
                      {/* Pin Circle */}
                      <div className={`w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center font-black text-xs ${statusInfo.cor}`}>
                        {estacao.codigo}
                      </div>

                      {/* Nome do Colaborador (Rótulo abaixo do Pin) */}
                      <div className="bg-slate-900/90 text-white text-[10px] px-1.5 py-0.5 rounded shadow mt-0.5 whitespace-nowrap font-medium border border-slate-700">
                        {statusInfo.colab?.nome_completo ? statusInfo.colab.nome_completo.split(" ")[0] : "Vaga"}
                      </div>
                    </div>
                  </PopoverTrigger>

                  {/* Popover com Detalhes da Estação / Colaborador */}
                  <PopoverContent className="w-80 p-4 shadow-xl border-gray-200">
                    <div className="space-y-3 text-xs">
                      {/* Cabeçalho da Estação */}
                      <div className="flex items-start justify-between border-b pb-2">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{estacao.codigo} • {estacao.sala}</p>
                          <p className="text-[11px] text-gray-500">{estacao.andar}</p>
                        </div>
                        <Badge className={
                          statusInfo.tipo === "vaga" ? "bg-slate-100 text-slate-700" :
                          statusInfo.tipo === "alerta" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }>
                          {statusInfo.label}
                        </Badge>
                      </div>

                      {/* Info do Colaborador Alocado */}
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

                      {/* Alerta de Chamado Aberto */}
                      {statusInfo.temChamadoAberto && (
                        <div className="bg-amber-50 border border-amber-200 p-2 rounded text-amber-900 text-[11px] flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Colaborador possui chamado aberto em atendimento!</span>
                        </div>
                      )}

                      {/* Lista de Equipamentos Vinculados */}
                      <div>
                        <p className="font-semibold text-gray-700 mb-1.5 uppercase text-[10px] tracking-wider">
                          Equipamentos nesta mesa ({statusInfo.eqVinculados.length})
                        </p>

                        {statusInfo.eqVinculados.length === 0 ? (
                          <p className="text-gray-400 italic text-[11px]">Nenhum computador ou monitor vinculado.</p>
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

                      {/* Botões de Ação Admin */}
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
        </CardContent>
      </Card>

      {/* ── GAVETA DE EQUIPAMENTOS NÃO POSICIONADOS (ESTAÇÃO NULL) ────────── */}
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
              Estes equipamentos estão cadastrados no sistema, mas ainda não foram vinculados a uma estação física no mapa.
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

      {/* ── MODAL: CRIAR NOVA ESTAÇÃO NA PLANTA ───────────────────────────── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Criar Nova Estação na Planta</DialogTitle>
            <DialogDescription className="text-xs">
              Posição selecionada: X: {newStationPos.x}%, Y: {newStationPos.y}% ({andarAtual})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateStationSubmit} className="space-y-3 text-xs">
            <div>
              <Label className="text-xs">Sala Física <span className="text-red-500">*</span></Label>
              <Select value={newStationSala} onValueChange={setNewStationSala}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(SALAS_POR_ANDAR[andarAtual] || []).map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Código da Estação / Mesa <span className="text-red-500">*</span></Label>
              <Input
                className="mt-1 h-8 text-xs font-mono"
                placeholder="Ex: M-01, M-02"
                value={newStationCodigo}
                onChange={e => setNewStationCodigo(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-xs">Colaborador Alocado (Opcional)</Label>
              <Select value={newStationColaborador} onValueChange={setNewStationColaborador}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Nenhum (Mesa vaga)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">— Mesa Vaga —</SelectItem>
                  {colaboradores.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.nome_completo} ({c.area})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <DialogTitle className="text-sm">Gerenciar Estação: {selectedStation.codigo} ({selectedStation.sala})</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div>
                <Label className="text-xs">Colaborador Vinculado a esta Mesa</Label>
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
                    <SelectItem value="__none__" className="text-xs">— Mesa Vaga (Nenhum) —</SelectItem>
                    {colaboradores.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.nome_completo} ({c.area})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-3">
                <p className="font-bold text-gray-800 mb-2">Equipamentos alocados nesta estação</p>
                {equipamentos.filter(eq => eq.estacao_id === selectedStation.id).length === 0 ? (
                  <p className="text-gray-400 italic">Nenhum equipamento vinculado a este ID de estação.</p>
                ) : (
                  <div className="space-y-2">
                    {equipamentos.filter(eq => eq.estacao_id === selectedStation.id).map(eq => (
                      <div key={eq.id} className="flex items-center justify-between bg-gray-50 border p-2 rounded">
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
