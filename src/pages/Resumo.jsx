import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet, Search, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Função para normalizar nomes de usuários
const normalizeUserName = (name) => {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
};

// Função para encontrar o nome original mais completo
const findBestUserName = (names) => {
  if (!names || names.length === 0) return '';
  
  // Retorna o nome mais longo (geralmente o mais completo)
  return names.reduce((best, current) => {
    return current.length > best.length ? current : best;
  }, names[0]);
};

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

  const { data: smartphones = [] } = useQuery({
    queryKey: ['smartphones'],
    queryFn: () => base44.entities.Smartphones.list(),
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => base44.entities.Cameras.list(),
  });

  const { data: coletores = [] } = useQuery({
    queryKey: ['coletores'],
    queryFn: () => base44.entities.Coletores.list(),
  });

  const { data: canetasVibracao = [] } = useQuery({
    queryKey: ['canetas_vibracao'],
    queryFn: () => base44.entities.Canetas_Vibracao.list(),
  });

  // Agrupar equipamentos por usuário (com normalização de nomes)
  const getUserEquipments = () => {
    const userMap = new Map();
    const normalizedToOriginal = new Map(); // Mapeia nome normalizado para nomes originais

    const addEquipment = (equipment, type) => {
      if (!equipment.usuario_atual || equipment.usuario_atual.trim() === "") return;
      
      const originalName = equipment.usuario_atual.trim();
      const normalizedName = normalizeUserName(originalName);
      
      if (!normalizedName) return;

      // Mapeia nome normalizado para original
      if (!normalizedToOriginal.has(normalizedName)) {
        normalizedToOriginal.set(normalizedName, []);
      }
      normalizedToOriginal.get(normalizedName).push(originalName);

      if (!userMap.has(normalizedName)) {
        userMap.set(normalizedName, {
          usuario: originalName, // Será atualizado depois com o melhor nome
          area: equipment.area || equipment.uf || "-",
          desktops: [],
          monitores: [],
          notebooks: [],
          smartphones: [],
          cameras: [],
          coletores: [],
          canetas: [],
          valorSmartphones: 0
        });
      }
      const user = userMap.get(normalizedName);

      // Adiciona o equipamento ao tipo correto
      if (type === 'pc_interno') {
        if (equipment.tipo === "Desktop") {
          user.desktops.push(equipment);
        } else if (equipment.tipo === "Monitor") {
          user.monitores.push(equipment);
        } else if (equipment.tipo === "Notebook") {
          user.notebooks.push(equipment);
        }
      } else if (type === 'notebook_externo') {
        user.notebooks.push(equipment);
      } else if (type === 'smartphone') {
        user.smartphones.push(equipment);
        user.valorSmartphones += equipment.valor || 0;
      } else if (type === 'camera') {
        user.cameras.push(equipment);
      } else if (type === 'coletor') {
        user.coletores.push(equipment);
      } else if (type === 'caneta') {
        user.canetas.push(equipment);
      }

      // Atualiza a área se não estava definida
      if (user.area === "-" && (equipment.area || equipment.uf)) {
        user.area = equipment.area || equipment.uf;
      }
    };

    // Processar todos os equipamentos
    pcsInternos.forEach(pc => addEquipment(pc, 'pc_interno'));
    notebooksExternos.forEach(nb => addEquipment(nb, 'notebook_externo'));
    smartphones.forEach(sm => addEquipment(sm, 'smartphone'));
    cameras.forEach(cam => addEquipment(cam, 'camera'));
    coletores.forEach(col => addEquipment(col, 'coletor'));
    canetasVibracao.forEach(can => addEquipment(can, 'caneta'));

    // Atualizar com o melhor nome original para cada usuário normalizado
    normalizedToOriginal.forEach((originalNames, normalizedName) => {
      if (userMap.has(normalizedName)) {
        const user = userMap.get(normalizedName);
        user.usuario = findBestUserName([...new Set(originalNames)]); // Remove duplicatas
      }
    });

    return Array.from(userMap.values());
  };

  const userEquipments = getUserEquipments();

  const filteredUsers = userEquipments.filter(user =>
    normalizeUserName(user.usuario).includes(normalizeUserName(searchTerm)) ||
    normalizeUserName(user.area).includes(normalizeUserName(searchTerm))
  );

  const stats = {
    totalUsuarios: userEquipments.length,
    comDesktop: userEquipments.filter(u => u.desktops.length > 0).length,
    comNotebook: userEquipments.filter(u => u.notebooks.length > 0).length,
    comMonitor: userEquipments.filter(u => u.monitores.length > 0).length,
    comSmartphone: userEquipments.filter(u => u.smartphones.length > 0).length,
    comCamera: userEquipments.filter(u => u.cameras.length > 0).length,
    comColetor: userEquipments.filter(u => u.coletores.length > 0).length,
    comCaneta: userEquipments.filter(u => u.canetas.length > 0).length,
  };

  const renderEquipmentBadges = (equipments, label, color = "outline") => {
    if (equipments.length === 0) return <span className="text-gray-400">-</span>;
    
    return (
      <div className="flex flex-col gap-1">
        {equipments.map((eq, idx) => (
          <Badge key={idx} variant={color} className="text-xs w-fit">
            {eq.modelo || eq.marca}
          </Badge>
        ))}
        {equipments.length > 1 && (
          <span className="text-xs text-blue-600 font-medium">
            ({equipments.length} {label})
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Resumo Completo por Usuário</h1>
            <p className="text-gray-500 mt-1">Todos os equipamentos alocados para cada usuário</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Usuários</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsuarios}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Desktops</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.comDesktop}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Notebooks</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.comNotebook}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Monitores</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.comMonitor}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Smartphones</p>
                <p className="text-3xl font-bold text-pink-600 mt-1">{stats.comSmartphone}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Câmeras</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.comCamera}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Coletores</p>
                <p className="text-3xl font-bold text-cyan-600 mt-1">{stats.comColetor}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Canetas</p>
                <p className="text-3xl font-bold text-rose-600 mt-1">{stats.comCaneta}</p>
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
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[150px]">Usuário</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Desktops</TableHead>
                    <TableHead>Monitores</TableHead>
                    <TableHead>Notebooks</TableHead>
                    <TableHead>Smartphones</TableHead>
                    <TableHead>Câmeras</TableHead>
                    <TableHead>Coletores</TableHead>
                    <TableHead>Canetas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
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
                          {renderEquipmentBadges(user.desktops, "desktops")}
                        </TableCell>
                        <TableCell>
                          {renderEquipmentBadges(user.monitores, "monitores")}
                        </TableCell>
                        <TableCell>
                          {renderEquipmentBadges(user.notebooks, "notebooks")}
                        </TableCell>
                        <TableCell>
                          {user.smartphones.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {user.smartphones.map((sm, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs w-fit">
                                  {sm.modelo || sm.marca}
                                </Badge>
                              ))}
                              {user.smartphones.length > 1 && (
                                <span className="text-xs text-pink-600 font-medium">
                                  ({user.smartphones.length} smartphones)
                                </span>
                              )}
                              {user.valorSmartphones > 0 && (
                                <span className="text-xs text-purple-600 font-semibold">
                                  R$ {user.valorSmartphones.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEquipmentBadges(user.cameras, "câmeras")}
                        </TableCell>
                        <TableCell>
                          {renderEquipmentBadges(user.coletores, "coletores")}
                        </TableCell>
                        <TableCell>
                          {renderEquipmentBadges(user.canetas, "canetas")}
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