import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Search, Loader2, User, Building2 } from "lucide-react";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";

export default function PortalRamais() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!loading) requireAuth();
  }, [loading]);

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ['portal_colaboradores_ramais'],
    queryFn: () => base44.entities.Colaboradores.list(),
    enabled: !!colaborador,
    staleTime: 30000,
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
      const areaTexto = areas.join(", ") || "Sem área definida";

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

  const filtered = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return ramaisConsolidados.filter(r =>
      r.ramal.toLowerCase().includes(query) ||
      r.titular.toLowerCase().includes(query) ||
      r.area.toLowerCase().includes(query)
    );
  }, [ramaisConsolidados, searchTerm]);

  if (loading || !colaborador) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout}>
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center border border-green-200">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Lista de Ramais Corporativos</h1>
              <p className="text-muted-foreground mt-0.5 text-xs">Consulta rápida dos ramais dos colaboradores e setores</p>
            </div>
          </div>

          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-base font-bold">Ramais Em Uso ({filtered.length})</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por ramal, nome, área..."
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
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">Ramal</TableHead>
                      <TableHead className="font-bold">Titular / Identificação</TableHead>
                      <TableHead className="font-bold">Área / Departamento</TableHead>
                      <TableHead className="font-bold">Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs">Carregando ramais...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs text-gray-500">Nenhum ramal encontrado com a busca.</TableCell></TableRow>
                    ) : (
                      filtered.map(r => (
                        <TableRow key={r.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono font-bold text-base text-green-700">{r.ramal}</TableCell>
                          <TableCell className="font-bold text-slate-800 text-xs">{r.titular}</TableCell>
                          <TableCell className="text-xs text-slate-600">{r.area}</TableCell>
                          <TableCell>
                            <Badge className={r.tipo === "Individual" ? "bg-blue-50 text-blue-700 border-blue-200 text-[11px]" : "bg-teal-50 text-teal-700 border-teal-200 text-[11px]"}>
                              {r.tipo === "Individual" ? <User className="w-3 h-3 mr-1 inline" /> : <Building2 className="w-3 h-3 mr-1 inline" />}
                              {r.tipo}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalLayout>
  );
}