import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet, Search, User, ExternalLink, Package } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [viewTab, setViewTab] = useState("users");

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
    const normalizedToOriginal = new Map();

    const addEquipment = (equipment, type, entityPage) => {
      if (!equipment.usuario_atual || equipment.usuario_atual.trim() === "") return;
      
      const originalName = equipment.usuario_atual.trim();
      const normalizedName = normalizeUserName(originalName);
      
      if (!normalizedName) return;

      if (!normalizedToOriginal.has(normalizedName)) {
        normalizedToOriginal.set(normalizedName, []);
      }
      normalizedToOriginal.get(normalizedName).push(originalName);

      if (!userMap.has(normalizedName)) {
        userMap.set(normalizedName, {
          usuario: originalName,
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

      const equipmentWithPage = { ...equipment, _page: entityPage };

      if (type === 'pc_interno') {
        if (equipment.tipo === "Desktop") {
          user.desktops.push(equipmentWithPage);
        } else if (equipment.tipo === "Monitor") {
          user.monitores.push(equipmentWithPage);
        } else if (equipment.tipo === "Notebook") {
          user.notebooks.push(equipmentWithPage);
        }
      } else if (type === 'notebook_externo') {
        user.notebooks.push(equipmentWithPage);
      } else if (type === 'smartphone') {
        user.smartphones.push(equipmentWithPage);
        user.valorSmartphones += equipment.valor || 0;
      } else if (type === 'camera') {
        user.cameras.push(equipmentWithPage);
      } else if (type === 'coletor') {
        user.coletores.push(equipmentWithPage);
      } else if (type === 'caneta') {
        user.canetas.push(equipmentWithPage);
      }

      if (user.area === "-" && (equipment.area || equipment.uf)) {
        user.area = equipment.area || equipment.uf;
      }
    };

    pcsInternos.forEach(pc => addEquipment(pc, 'pc_interno', 'PCs_Internos'));
    notebooksExternos.forEach(nb => addEquipment(nb, 'notebook_externo', 'Notebooks_Externos'));
    smartphones.forEach(sm => addEquipment(sm, 'smartphone', 'Smartphones'));
    cameras.forEach(cam => addEquipment(cam, 'camera', 'Cameras'));
    coletores.forEach(col => addEquipment(col, 'coletor', 'Coletores'));
    canetasVibracao.forEach(can => addEquipment(can, 'caneta', 'Canetas_Vibracao'));

    normalizedToOriginal.forEach((originalNames, normalizedName) => {
      if (userMap.has(normalizedName)) {
        const user = userMap.get(normalizedName);
        user.usuario = findBestUserName([...new Set(originalNames)]);
      }
    });

    return Array.from(userMap.values());
  };

  // Obter equipamentos disponíveis
  const getAvailableEquipments = () => {
    const available = [];
    
    pcsInternos.filter(e => !e.usuario_atual || e.status === "Disponível").forEach(e => 
      available.push({ ...e, _type: 'PCs Internos', _page: 'PCs_Internos' })
    );
    notebooksExternos.filter(e => !e.usuario_atual || e.status === "Disponível").forEach(e => 
      available.push({ ...e, _type: 'Notebook Externo', _page: 'Notebooks_Externos' })
    );
    smartphones.filter(e => !e.usuario_atual || e.status === "Disponível").forEach(e => 
      available.push({ ...e, _type: 'Smartphone', _page: 'Smartphones' })
    );
    cameras.filter(e => !e.usuario_atual || e.status === "Disponível").forEach(e => 
      available.push({ ...e, _type: 'Câmera', _page: 'Cameras' })
    );
    coletores.filter(e => !e.usuario_atual || e.status === "Disponível").forEach(e => 
      available.push({ ...e, _type: 'Coletor', _page: 'Coletores' })
    );
    canetasVibracao.filter(e => !e.usuario_atual || e.status === "Disponível").forEach(e => 
      available.push({ ...e, _type: 'Caneta', _page: 'Canetas_Vibracao' })
    );

    return available;
  };

  const userEquipments = getUserEquipments();
  const availableEquipments = getAvailableEquipments();

  const filteredUsers = userEquipments.filter(user =>
    normalizeUserName(user.usuario).includes(normalizeUserName(searchTerm)) ||
    normalizeUserName(user.area).includes(normalizeUserName(searchTerm))
  );

  const filteredAvailable = availableEquipments.filter(eq =>
    eq.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq._type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalUsuarios: userEquipments.length,
    totalDisponiveis: availableEquipments.length,
    comDesktop: userEquipments.filter(u => u.desktops.length > 0).length,
    comNotebook: userEquipments.filter(u => u.notebooks.length > 0).length,
    comMonitor: userEquipments.filter(u => u.monitores.length > 0).length,
    comSmartphone: userEquipments.filter(u => u.smartphones.length > 0).length,
    comCamera: userEquipments.filter(u => u.cameras.length > 0).length,
    comColetor: userEquipments.filter(u => u.coletores.length > 0).length,
    comCaneta: userEquipments.filter(u => u.canetas.length > 0).length,
  };

  const renderEquipmentBadges = (equipments, label) => {
    if (equipments.length === 0) return <span className="text-gray-400">-</span>;
    
    return (
      <div className="flex flex-col gap-1">
        {equipments.map((eq, idx) => (
          <Link 
            key={idx} 
            to={`${createPageUrl(eq._page)}?edit=${eq.id}`}
            className="w-fit"
          >
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-blue-50 transition-colors">
              {eq.modelo || eq.marca}
              <ExternalLink className="w-3 h-3 ml-1" />
            </Badge>
          </Link>
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Resumo Completo</h1>
            <p className="text-gray-500 mt-1">Visão geral de todos os equipamentos</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-4 mb-6">
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
                <p className="text-sm text-gray-600">Disponíveis</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.totalDisponiveis}</p>
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
            <div className="flex flex-col gap-4">
              <Tabs value={viewTab} onValueChange={setViewTab} className="w-full">
                <TabsList>
                  <TabsTrigger value="users" className="gap-2">
                    <User className="w-4 h-4" />
                    Por Usuário ({filteredUsers.length})
                  </TabsTrigger>
                  <TabsTrigger value="available" className="gap-2">
                    <Package className="w-4 h-4" />
                    Disponíveis ({filteredAvailable.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={viewTab === "users" ? "Buscar usuário..." : "Buscar equipamento..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {viewTab === "users" ? (
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
                                  <Link 
                                    key={idx} 
                                    to={`${createPageUrl(sm._page)}?edit=${sm.id}`}
                                    className="w-fit"
                                  >
                                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-blue-50 transition-colors">
                                      {sm.modelo || sm.marca}
                                      <ExternalLink className="w-3 h-3 ml-1" />
                                    </Badge>
                                  </Link>
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
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Etiqueta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAvailable.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          Nenhum equipamento disponível encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAvailable.map((eq, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{eq._type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{eq.marca}</p>
                              <p className="text-sm text-gray-500">{eq.modelo}</p>
                            </div>
                          </TableCell>
                          <TableCell>{eq.etiqueta_interna || eq.numero_sequencial || "-"}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">
                              {eq.status || "Disponível"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link to={`${createPageUrl(eq._page)}?edit=${eq.id}`}>
                              <Button variant="outline" size="sm" className="gap-2">
                                <ExternalLink className="w-4 h-4" />
                                Ver Detalhes
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}