import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Pencil, Monitor, Laptop, Smartphone, Camera, Barcode, Pen, Phone, Headset, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ColaboradorDetalhes({ colaborador, onClose, onEdit }) {
  const [showSenhas, setShowSenhas] = useState({});
  const [copied, setCopied] = useState({});

  // Buscar todos os equipamentos
  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['pcs_internos_colaborador'],
    queryFn: () => base44.entities.PCs_Internos.list(),
  });

  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['notebooks_externos_colaborador'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
  });

  const { data: smartphones = [] } = useQuery({
    queryKey: ['smartphones_colaborador'],
    queryFn: () => base44.entities.Smartphones.list(),
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras_colaborador'],
    queryFn: () => base44.entities.Cameras.list(),
  });

  const { data: coletores = [] } = useQuery({
    queryKey: ['coletores_colaborador'],
    queryFn: () => base44.entities.Coletores.list(),
  });

  const { data: canetasVibracao = [] } = useQuery({
    queryKey: ['canetas_vibracao_colaborador'],
    queryFn: () => base44.entities.Canetas_Vibracao.list(),
  });

  const { data: ramais = [] } = useQuery({
    queryKey: ['ramais_colaborador'],
    queryFn: () => base44.entities.Ramais.list(),
  });

  const { data: chamados = [] } = useQuery({
    queryKey: ['chamados_colaborador'],
    queryFn: () => base44.entities.Chamados.list(),
  });

  // Normalizar nome para comparação
  const normalizeNome = (nome) => {
    if (!nome) return '';
    return nome.toLowerCase().trim();
  };

  const nomeColaborador = normalizeNome(colaborador.nome_completo);

  // Filtrar equipamentos do colaborador
  const equipamentosColaborador = {
    pcs: pcsInternos.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
    notebooks: notebooksExternos.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
    smartphones: smartphones.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
    cameras: cameras.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
    coletores: coletores.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
    canetas: canetasVibracao.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
    ramais: ramais.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
  };

  const totalEquipamentos = Object.values(equipamentosColaborador).reduce((sum, arr) => sum + arr.length, 0);

  // Filtrar chamados do colaborador
  const chamadosColaborador = chamados.filter(c => 
    normalizeNome(c.solicitante_nome) === nomeColaborador && 
    c.status !== "Resolvido" && 
    c.status !== "Cancelado"
  );

  const toggleShowSenha = (field) => {
    setShowSenhas({ ...showSenhas, [field]: !showSenhas[field] });
  };

  const copySenha = (field, value) => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied({ ...copied, [field]: true });
      setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
    }
  };

  const EquipamentoIcon = ({ tipo }) => {
    const icons = {
      pcs: Monitor,
      notebooks: Laptop,
      smartphones: Smartphone,
      cameras: Camera,
      coletores: Barcode,
      canetas: Pen,
      ramais: Phone,
    };
    const Icon = icons[tipo] || Monitor;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button onClick={onClose} variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600">
                    {colaborador.nome_completo?.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{colaborador.nome_completo}</h1>
                    <p className="text-gray-600 mt-1">{colaborador.cargo || "Sem cargo definido"}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-indigo-100 text-indigo-800">{colaborador.area}</Badge>
                      <Badge className={
                        colaborador.status === "Ativo" ? "bg-green-100 text-green-800" :
                        colaborador.status === "Férias" ? "bg-blue-100 text-blue-800" :
                        "bg-orange-100 text-orange-800"
                      }>
                        {colaborador.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button onClick={() => onEdit(colaborador)} className="bg-indigo-600 hover:bg-indigo-700">
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{colaborador.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Telefone/Ramal</p>
                  <p className="font-medium">{colaborador.telefone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data de Admissão</p>
                  <p className="font-medium">{colaborador.data_admissao || "-"}</p>
                </div>
              </div>
              {colaborador.observacoes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-1">Observações</p>
                  <p className="text-gray-800">{colaborador.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="senhas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="senhas">Senhas e Acessos</TabsTrigger>
            <TabsTrigger value="equipamentos">Equipamentos ({totalEquipamentos})</TabsTrigger>
            <TabsTrigger value="chamados">Chamados ({chamadosColaborador.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="senhas">
            <Card>
              <CardHeader>
                <CardTitle>Credenciais de Acesso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-700">Senha Microsoft/Office 365</p>
                      <div className="flex gap-1">
                        {colaborador.senha_microsoft && (
                          <button
                            onClick={() => copySenha('microsoft', colaborador.senha_microsoft)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {copied.microsoft ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                          </button>
                        )}
                        <button
                          onClick={() => toggleShowSenha('microsoft')}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {showSenhas.microsoft ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                    <p className="font-mono text-sm">
                      {colaborador.senha_microsoft ? (showSenhas.microsoft ? colaborador.senha_microsoft : "••••••••") : "-"}
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-700">Senha Login Máquina</p>
                      <div className="flex gap-1">
                        {colaborador.senha_login_maquina && (
                          <button
                            onClick={() => copySenha('maquina', colaborador.senha_login_maquina)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {copied.maquina ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                          </button>
                        )}
                        <button
                          onClick={() => toggleShowSenha('maquina')}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {showSenhas.maquina ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                    <p className="font-mono text-sm">
                      {colaborador.senha_login_maquina ? (showSenhas.maquina ? colaborador.senha_login_maquina : "••••••••") : "-"}
                    </p>
                  </div>
                </div>

                {colaborador.senhas_sistemas && colaborador.senhas_sistemas.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold text-gray-900 mb-3">Senhas de Sistemas</h4>
                    <div className="space-y-2">
                      {colaborador.senhas_sistemas.map((sistema, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <p className="text-xs text-gray-600">Sistema</p>
                                <p className="font-semibold text-gray-900">{sistema.sistema}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Usuário</p>
                                <p className="font-mono text-sm">{sistema.usuario || "-"}</p>
                              </div>
                              <div>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-600">Senha</p>
                                  <div className="flex gap-1">
                                    {sistema.senha && (
                                      <button
                                        onClick={() => copySenha(`sistema_${index}`, sistema.senha)}
                                        className="p-1 hover:bg-gray-200 rounded"
                                      >
                                        {copied[`sistema_${index}`] ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => toggleShowSenha(`sistema_${index}`)}
                                      className="p-1 hover:bg-gray-200 rounded"
                                    >
                                      {showSenhas[`sistema_${index}`] ? <EyeOff className="w-3 h-3 text-gray-400" /> : <Eye className="w-3 h-3 text-gray-400" />}
                                    </button>
                                  </div>
                                </div>
                                <p className="font-mono text-sm">
                                  {sistema.senha ? (showSenhas[`sistema_${index}`] ? sistema.senha : "••••••••") : "-"}
                                </p>
                              </div>
                            </div>
                          </div>
                          {sistema.observacoes && (
                            <p className="text-xs text-gray-600 mt-2">{sistema.observacoes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipamentos">
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(equipamentosColaborador).map(([tipo, equipamentos]) => {
                if (equipamentos.length === 0) return null;
                
                const labels = {
                  pcs: "PCs Internos",
                  notebooks: "Notebooks Externos",
                  smartphones: "Smartphones",
                  cameras: "Câmeras",
                  coletores: "Coletores",
                  canetas: "Canetas de Vibração",
                  ramais: "Ramais",
                };

                return (
                  <Card key={tipo}>
                    <CardHeader className="border-b">
                      <CardTitle className="flex items-center gap-2">
                        <EquipamentoIcon tipo={tipo} />
                        {labels[tipo]} ({equipamentos.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {tipo === 'ramais' ? (
                              <>
                                <TableHead>Ramal</TableHead>
                                <TableHead>Área</TableHead>
                                <TableHead>Data Atribuição</TableHead>
                              </>
                            ) : (
                              <>
                                <TableHead>Marca/Modelo</TableHead>
                                <TableHead>Etiqueta/Serial</TableHead>
                                <TableHead>Status</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {equipamentos.map((eq) => (
                            <TableRow key={eq.id}>
                              {tipo === 'ramais' ? (
                                <>
                                  <TableCell className="font-mono font-bold">{eq.ramal}</TableCell>
                                  <TableCell>{eq.area}</TableCell>
                                  <TableCell>{eq.data_atribuicao || "-"}</TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{eq.marca || "-"}</p>
                                      <p className="text-sm text-gray-500">{eq.modelo || "-"}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {eq.etiqueta_interna || eq.service_tag || eq.imei || eq.numero_sequencial || "-"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={
                                      eq.status === "Em uso" ? "bg-blue-100 text-blue-800" :
                                      eq.status === "Disponível" ? "bg-green-100 text-green-800" :
                                      "bg-orange-100 text-orange-800"
                                    }>
                                      {eq.status}
                                    </Badge>
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}

              {totalEquipamentos === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    Nenhum equipamento atribuído a este colaborador
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="chamados">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headset className="w-5 h-5" />
                  Chamados em Aberto ({chamadosColaborador.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {chamadosColaborador.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    Nenhum chamado em aberto
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Chamado</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data Abertura</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Urgência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chamadosColaborador.map((chamado) => (
                        <TableRow key={chamado.id}>
                          <TableCell className="font-mono">{chamado.numero_chamado}</TableCell>
                          <TableCell>{chamado.tipo_solicitacao}</TableCell>
                          <TableCell>{chamado.data_abertura || "-"}</TableCell>
                          <TableCell>
                            <Badge className={
                              chamado.status === "Aberto" ? "bg-red-100 text-red-800" :
                              chamado.status === "Em Andamento" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            }>
                              {chamado.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              chamado.urgencia === "Urgente" ? "bg-red-100 text-red-800" :
                              chamado.urgencia === "Alta" ? "bg-orange-100 text-orange-800" :
                              "bg-yellow-100 text-yellow-800"
                            }>
                              {chamado.urgencia}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}