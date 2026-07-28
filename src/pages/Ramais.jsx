import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Plus, Pencil, Search, Users, User, Download, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Ramais() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAtribuirModal, setShowAtribuirModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [selectedColab, setSelectedColab] = useState(null);
  const [novoRamalInput, setNovoRamalInput] = useState("");
  const [colabIdInput, setColabIdInput] = useState("");

  const queryClient = useQueryClient();

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list(),
    staleTime: 30000,
  });

  const updateColabMutation = useMutation({
    mutationFn: ({ id, telefone }) => base44.entities.Colaboradores.update(id, { telefone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      setShowAtribuirModal(false);
      setShowEditarModal(false);
      setSelectedColab(null);
      setNovoRamalInput("");
      setColabIdInput("");
    },
    onError: (err) => {
      alert("Erro ao atualizar ramal: " + (err.message || "Erro desconhecido"));
    }
  });

  // Consolidação dos ramais derivados dos colaboradores
  const ramaisConsolidados = useMemo(() => {
    const mapaRamais = {};

    colaboradores.forEach(c => {
      if (c.status !== "Ativo" || !c.telefone || !c.telefone.trim()) return;

      const numRamal = c.telefone.trim();
      if (!mapaRamais[numRamal]) {
        mapaRamais[numRamal] = [];
      }
      mapaRamais[numRamal].push(c);
    });

    const lista = [];

    Object.keys(mapaRamais).forEach(numRamal => {
      const colabs = mapaRamais[numRamal];
      const areas = Array.from(new Set(colabs.map(c => c.area).filter(Boolean)));
      const areaTexto = areas.join(", ") || "Sem setor definido";

      if (colabs.length === 1) {
        lista.push({
          id: numRamal,
          ramal: numRamal,
          titular: colabs[0].nome_completo,
          area: areaTexto,
          tipo: "Individual",
          colaboradores: colabs,
          status: "Em uso"
        });
      } else {
        lista.push({
          id: numRamal,
          ramal: numRamal,
          titular: areaTexto || "Compartilhado",
          area: areaTexto,
          tipo: "Compartilhado por Setor",
          colaboradores: colabs,
          status: "Em uso"
        });
      }
    });

    return lista.sort((a, b) => a.ramal.localeCompare(b.ramal, undefined, { numeric: true }));
  }, [colaboradores]);

  // Filtro de Pesquisa
  const filteredRamais = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return ramaisConsolidados.filter(r =>
      r.ramal.toLowerCase().includes(query) ||
      r.titular.toLowerCase().includes(query) ||
      r.area.toLowerCase().includes(query) ||
      r.colaboradores.some(c => c.nome_completo.toLowerCase().includes(query))
    );
  }, [ramaisConsolidados, searchTerm]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalRamais = ramaisConsolidados.length;
    const individuais = ramaisConsolidados.filter(r => r.tipo === "Individual").length;
    const compartilhados = ramaisConsolidados.filter(r => r.tipo === "Compartilhado por Setor").length;
    return { totalRamais, individuais, compartilhados };
  }, [ramaisConsolidados]);

  const handleExportarExcel = () => {
    const header = "RAMAL\tTITULAR / SETOR\tÁREA\tTIPO\tCOLABORADORES\n";
    const rows = filteredRamais.map(r => {
      const colabsNomes = r.colaboradores.map(c => c.nome_completo).join("; ");
      return [
        r.ramal,
        r.titular,
        r.area,
        r.tipo,
        colabsNomes
      ].join("\t");
    }).join("\n");

    const blob = new Blob(["\ufeff" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ramais_techcontrol_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center border border-green-200 shadow-sm">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Controle de Ramais</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Ramais corporativos sincronizados dinamicamente com o cadastro dos colaboradores.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <Button
              onClick={handleExportarExcel}
              variant="outline"
              className="gap-2 text-xs font-semibold bg-white"
            >
              <Download className="w-4 h-4 text-slate-600" />
              Exportar CSV
            </Button>
            <Button
              onClick={() => {
                setColabIdInput("");
                setNovoRamalInput("");
                setShowAtribuirModal(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-xs font-semibold gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Atribuir Ramal a Colaborador
            </Button>
          </div>
        </div>

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Ramais Ativos</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalRamais}</p>
              </div>
              <Phone className="w-8 h-8 text-green-500 opacity-80" />
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ramais Pessoais</p>
                <p className="text-3xl font-extrabold text-blue-600 mt-1">{stats.individuais}</p>
              </div>
              <User className="w-8 h-8 text-blue-500 opacity-80" />
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ramais de Setor</p>
                <p className="text-3xl font-extrabold text-teal-600 mt-1">{stats.compartilhados}</p>
              </div>
              <Building2 className="w-8 h-8 text-teal-500 opacity-80" />
            </CardContent>
          </Card>
        </div>

        {/* TABELA DE RAMAIS */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="border-b bg-white rounded-t-xl py-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle className="text-base font-bold text-slate-800">
                Lista de Ramais Registrados ({filteredRamais.length})
              </CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar ramal, nome, área..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Ramal</TableHead>
                    <TableHead className="font-bold text-slate-700">Titular / Identificação</TableHead>
                    <TableHead className="font-bold text-slate-700">Área / Departamento</TableHead>
                    <TableHead className="font-bold text-slate-700">Tipo de Atribuição</TableHead>
                    <TableHead className="font-bold text-slate-700">Integrantes</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500 text-xs">
                        Carregando ramais...
                      </TableCell>
                    </TableRow>
                  ) : filteredRamais.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500 text-xs">
                        Nenhum ramal encontrado com o filtro aplicado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRamais.map((r) => (
                      <TableRow key={r.id} className="hover:bg-slate-50/80 transition">
                        <TableCell className="font-mono font-bold text-base text-green-700">
                          {r.ramal}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 text-xs">
                          {r.titular}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium">
                          {r.area}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            r.tipo === "Individual"
                              ? "bg-blue-50 text-blue-700 border-blue-200 text-[11px]"
                              : "bg-teal-50 text-teal-700 border-teal-200 text-[11px]"
                          }>
                            {r.tipo === "Individual" ? <User className="w-3 h-3 mr-1 inline" /> : <Building2 className="w-3 h-3 mr-1 inline" />}
                            {r.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {r.tipo === "Compartilhado por Setor" ? (
                            <span className="font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100" title={r.colaboradores.map(c => c.nome_completo).join(", ")}>
                              <Users className="w-3 h-3 inline mr-1" />
                              {r.colaboradores.length} colaboradores ({r.colaboradores.map(c => c.nome_completo.split(" ")[0]).join(", ")})
                            </span>
                          ) : (
                            <span>1 colaborador</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedColab(r.colaboradores[0]);
                              setNovoRamalInput(r.ramal);
                              setShowEditarModal(true);
                            }}
                            className="h-8 text-xs gap-1 font-semibold text-indigo-600 hover:bg-indigo-50"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar Ramal
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* MODAL: ATRIBUIR RAMAL A COLABORADOR */}
        <Dialog open={showAtribuirModal} onOpenChange={setShowAtribuirModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir Ramal a Colaborador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div>
                <Label className="text-xs font-semibold">Selecione o Colaborador *</Label>
                <Combobox
                  value={colabIdInput}
                  onValueChange={(val) => setColabIdInput(val)}
                  options={colaboradores
                    .filter(c => c.status === "Ativo")
                    .map(c => ({
                      value: c.id,
                      label: `${c.nome_completo} - ${c.area}`
                    }))}
                  placeholder="Buscar colaborador..."
                  searchPlaceholder="Pesquisar..."
                  emptyText="Nenhum colaborador encontrado"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Número do Ramal *</Label>
                <Input
                  placeholder="Ex: 1009"
                  value={novoRamalInput}
                  onChange={(e) => setNovoRamalInput(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAtribuirModal(false)} className="text-xs">
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!colabIdInput || !novoRamalInput) return;
                  updateColabMutation.mutate({ id: colabIdInput, telefone: novoRamalInput.trim() });
                }}
                disabled={!colabIdInput || !novoRamalInput}
                className="bg-green-600 hover:bg-green-700 text-xs font-semibold"
              >
                Salvar Atribuição
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: EDITAR RAMAL DO COLABORADOR */}
        <Dialog open={showEditarModal} onOpenChange={setShowEditarModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Ramal de {selectedColab?.nome_completo}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <p className="text-xs text-slate-500">
                Altere o número do ramal associado ao colaborador <strong>{selectedColab?.nome_completo}</strong> ({selectedColab?.area}).
              </p>
              <div>
                <Label className="text-xs font-semibold">Número do Ramal</Label>
                <Input
                  placeholder="Ex: 1009"
                  value={novoRamalInput}
                  onChange={(e) => setNovoRamalInput(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditarModal(false)} className="text-xs">
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!selectedColab) return;
                  updateColabMutation.mutate({ id: selectedColab.id, telefone: novoRamalInput.trim() });
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold"
              >
                Atualizar Ramal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}