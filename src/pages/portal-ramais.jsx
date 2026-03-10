import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Search, Loader2 } from "lucide-react";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";

export default function PortalRamais() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!loading) requireAuth();
  }, [loading]);

  const { data: ramais = [], isLoading } = useQuery({
    queryKey: ['portal_ramais'],
    queryFn: () => base44.entities.Ramais.list(),
    enabled: !!colaborador,
  });

  if (loading || !colaborador) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  const filtered = ramais.filter(r =>
    r.ramal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.usuario_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.area?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: ramais.length,
    emUso: ramais.filter(r => r.status === "Em uso").length,
    disponiveis: ramais.filter(r => r.status === "Disponível").length,
  };

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout}>
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lista de Ramais</h1>
              <p className="text-gray-500 mt-1">Consulta de ramais telefônicos da empresa</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-gray-900">{stats.total}</p><p className="text-sm text-gray-600">Total</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-blue-600">{stats.emUso}</p><p className="text-sm text-gray-600">Em Uso</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-green-600">{stats.disponiveis}</p><p className="text-sm text-gray-600">Disponíveis</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="border-b">
              <div className="flex justify-between items-center gap-4">
                <CardTitle>Ramais ({filtered.length})</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar ramal, usuário ou área..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ramal</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8">Carregando...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">Nenhum ramal encontrado</TableCell></TableRow>
                    ) : (
                      filtered.map(r => (
                        <TableRow key={r.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono font-bold text-lg">{r.ramal}</TableCell>
                          <TableCell>{r.usuario_atual || <span className="text-gray-400">—</span>}</TableCell>
                          <TableCell>{r.area || <span className="text-gray-400">—</span>}</TableCell>
                          <TableCell>
                            <Badge className={r.status === "Em uso" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                              {r.status}
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