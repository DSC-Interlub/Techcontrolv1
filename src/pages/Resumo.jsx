import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet, Search, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Resumo() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['pcs_internos'],
    queryFn: () => base44.entities.PCs_Internos.list(),
  });

  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['notebooks_externos'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
  });

  // Agrupar equipamentos por usuário
  const getUserEquipments = () => {
    const userMap = new Map();

    // Processar PCs Internos
    pcsInternos.forEach(pc => {
      if (pc.usuario_atual && pc.usuario_atual.trim() !== "") {
        if (!userMap.has(pc.usuario_atual)) {
          userMap.set(pc.usuario_atual, {
            usuario: pc.usuario_atual,
            area: pc.area || "-",
            desktops: [],
            monitores: [],
            notebooks: [],
          });
        }
        const user = userMap.get(pc.usuario_atual);
        if (pc.tipo === "Desktop") {
          user.desktops.push(pc);
        } else if (pc.tipo === "Monitor") {
          user.monitores.push(pc);
        } else if (pc.tipo === "Notebook") {
          user.notebooks.push(pc);
        }
      }
    });

    // Processar Notebooks Externos
    notebooksExternos.forEach(nb => {
      if (nb.usuario_atual && nb.usuario_atual.trim() !== "") {
        if (!userMap.has(nb.usuario_atual)) {
          userMap.set(nb.usuario_atual, {
            usuario: nb.usuario_atual,
            area: nb.uf || nb.area || "-",
            desktops: [],
            monitores: [],
            notebooks: [],
          });
        }
        const user = userMap.get(nb.usuario_atual);
        user.notebooks.push(nb);
      }
    });

    return Array.from(userMap.values());
  };

  const userEquipments = getUserEquipments();

  const filteredUsers = userEquipments.filter(user =>
    user.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalUsuarios: userEquipments.length,
    comDesktop: userEquipments.filter(u => u.desktops.length > 0).length,
    comNotebook: userEquipments.filter(u => u.notebooks.length > 0).length,
    comMonitor: userEquipments.filter(u => u.monitores.length > 0).length,
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Resumo por Usuário</h1>
            <p className="text-gray-500 mt-1">Equipamentos alocados para cada usuário interno</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total de Usuários</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsuarios}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Com Desktop</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.comDesktop}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Com Notebook</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.comNotebook}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Com Monitor</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.comMonitor}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Equipamentos por Usuário ({filteredUsers.length})</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuário..."
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
                    <TableHead>#</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Desktops</TableHead>
                    <TableHead>Monitores</TableHead>
                    <TableHead>Notebooks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{user.usuario}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.area}</TableCell>
                        <TableCell>
                          {user.desktops.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {user.desktops.map((desktop, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs w-fit">
                                  {desktop.modelo || desktop.marca}
                                </Badge>
                              ))}
                              {user.desktops.length > 1 && (
                                <span className="text-xs text-blue-600 font-medium">
                                  ({user.desktops.length} desktops)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.monitores.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {user.monitores.map((monitor, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs w-fit">
                                  {monitor.modelo || monitor.marca}
                                </Badge>
                              ))}
                              {user.monitores.length > 1 && (
                                <span className="text-xs text-green-600 font-medium">
                                  ({user.monitores.length} monitores)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.notebooks.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {user.notebooks.map((notebook, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs w-fit">
                                  {notebook.modelo || notebook.marca}
                                </Badge>
                              ))}
                              {user.notebooks.length > 1 && (
                                <span className="text-xs text-purple-600 font-medium">
                                  ({user.notebooks.length} notebooks)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
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
  );
}