import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Search, Eye, Pencil, Trash2, X, Download, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ColaboradorDetalhes from "../components/colaboradores/ColaboradorDetalhes";
import ColaboradorForm from "../components/colaboradores/ColaboradorForm";

const COMUNICADOS_READONLY_ROLES = ['comunicados_gestao', 'comunicados_dp'];

export default function Colaboradores() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState(null);
  const [selectedColaborador, setSelectedColaborador] = useState(null);
  const [deletingColaborador, setDeletingColaborador] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const { user: currentUser } = useAuth();

  const isReadonly = currentUser && COMUNICADOS_READONLY_ROLES.includes(currentUser.role);

  const queryClient = useQueryClient();

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list('-created_date'),
  });

  const { data: ramais = [] } = useQuery({
    queryKey: ['ramais'],
    queryFn: () => base44.entities.Ramais.list(),
  });

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

  const { data: canetas = [] } = useQuery({
    queryKey: ['canetas_vibracao'],
    queryFn: () => base44.entities.Canetas_Vibracao.list(),
  });

  const obterPendencias = (colab) => {
    const pendencias = [];

    // 1. Sem E-mail Próprio (Crítico)
    if (!colab.email || !colab.email.trim()) {
      pendencias.push({ tipo: "sem_email", label: "Sem E-mail Próprio", critico: true });
    }

    // 2. Sem Gestor (Nome)
    const respNome = colab.responsavel_nome || '';
    const respEmail = colab.responsavel_email || '';
    
    if (!respNome.trim()) {
      pendencias.push({ tipo: "sem_gestor_nome", label: "Gestor não informado", critico: false });
    } else {
      // 3. Sem E-mail do Gestor (apenas se tem nome de gestor)
      if (!respEmail.trim()) {
        pendencias.push({ tipo: "sem_gestor_email", label: "E-mail do gestor não informado", critico: false });
      }
    }

    // 4. Cônjuge sem E-mail (apenas se tem cônjuge)
    if (colab.conjuge_nome && colab.conjuge_nome.trim() && (!colab.conjuge_email || !colab.conjuge_email.trim())) {
      pendencias.push({ tipo: "conjuge_sem_email", label: "E-mail do cônjuge não informado", critico: false });
    }

    // 5. Sem Ramal (apenas para Interno)
    if (colab.tipo_funcionario === "Interno") {
      const temRamal = ramais.some(r => r.usuario_atual && r.usuario_atual.trim().toLowerCase() === colab.nome_completo.trim().toLowerCase());
      if (!temRamal) {
        pendencias.push({ tipo: "sem_ramal", label: "Ramal não associado", critico: false });
      }
    }

    // 6. Sem Equipamento (apenas para Interno)
    if (colab.tipo_funcionario === "Interno") {
      const nomeLower = colab.nome_completo.trim().toLowerCase();
      const temPc = pcsInternos.some(p => p.usuario_atual && p.usuario_atual.trim().toLowerCase() === nomeLower);
      const temNb = notebooksExternos.some(n => n.usuario_atual && n.usuario_atual.trim().toLowerCase() === nomeLower);
      const temSm = smartphones.some(s => s.usuario_atual && s.usuario_atual.trim().toLowerCase() === nomeLower);
      const temCam = cameras.some(c => c.usuario_atual && c.usuario_atual.trim().toLowerCase() === nomeLower);
      const temCol = coletores.some(c => c.usuario_atual && c.usuario_atual.trim().toLowerCase() === nomeLower);
      const temCan = canetas.some(c => c.usuario_atual && c.usuario_atual.trim().toLowerCase() === nomeLower);

      if (!temPc && !temNb && !temSm && !temCam && !temCol && !temCan) {
        pendencias.push({ tipo: "sem_equipamento", label: "Nenhum equipamento associado", critico: false });
      }
    }

    return pendencias;
  };

  const deleteMutation = useMutation({
    mutationFn: async (colaborador) => {
      // Check for active chamados
      const chamados = await base44.entities.Chamados.list();
      const temChamados = chamados.some(c => 
        c.solicitante_nome === colaborador.nome_completo ||
        c.atribuido_para === colaborador.nome_completo
      );
      if (temChamados) {
        throw new Error(`Não é possível excluir: colaborador possui chamados vinculados.`);
      }
      return base44.entities.Colaboradores.delete(colaborador.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      setDeletingColaborador(null);
    },
    onError: (error) => {
      alert(error.message || 'Erro ao excluir colaborador.');
      setDeletingColaborador(null);
    }
  });

  const handleExportar = () => {
    const header = ["Nome Completo", "Email", "Área", "Tipo", "Telefone", "Data Admissão", "Status"];
    const rows = colaboradores.map(c => [
      c.nome_completo || "",
      c.email || "",
      c.area || "",
      c.tipo_funcionario || "",
      c.telefone || "",
      c.data_admissao || "",
      c.status || ""
    ]);

    // Criar CSV com delimitador ponto e vírgula (;) para Excel
    const csvContent = [
      header.join(";"),
      ...rows.map(row => row.join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `colaboradores_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredColaboradores = colaboradores.filter(c => {
    const matchSearch = c.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       c.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       c.tipo_funcionario?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: colaboradores.length,
    ativos: colaboradores.filter(c => c.status === "Ativo").length,
    ferias: colaboradores.filter(c => c.status === "Férias").length,
    afastados: colaboradores.filter(c => c.status === "Afastado").length,
  };

  const totalSemEmailProprio = colaboradores.filter(c => !c.email || !c.email.trim()).length;
  const totalSemGestorNome = colaboradores.filter(c => !c.responsavel_nome || !c.responsavel_nome.trim()).length;
  const totalSemGestorEmail = colaboradores.filter(c => c.responsavel_nome && c.responsavel_nome.trim() && (!c.responsavel_email || !c.responsavel_email.trim())).length;
  const totalConjugeSemEmail = colaboradores.filter(c => c.conjuge_nome && c.conjuge_nome.trim() && (!c.conjuge_email || !c.conjuge_email.trim())).length;
  
  const totalSemRamal = colaboradores.filter(c => {
    if (c.tipo_funcionario !== "Interno") return false;
    return !ramais.some(r => r.usuario_atual && r.usuario_atual.trim().toLowerCase() === c.nome_completo.trim().toLowerCase());
  }).length;

  const totalSemEquipamento = colaboradores.filter(c => {
    if (c.tipo_funcionario !== "Interno") return false;
    const nomeLower = c.nome_completo.trim().toLowerCase();
    return !pcsInternos.some(p => p.usuario_atual && p.usuario_atual.trim().toLowerCase() === nomeLower) &&
           !notebooksExternos.some(n => n.usuario_atual && n.usuario_atual.trim().toLowerCase() === nomeLower) &&
           !smartphones.some(s => s.usuario_atual && s.usuario_atual.trim().toLowerCase() === nomeLower) &&
           !cameras.some(c => c.usuario_atual && c.usuario_atual.trim().toLowerCase() === nomeLower) &&
           !coletores.some(c => c.usuario_atual && c.usuario_atual.trim().toLowerCase() === nomeLower) &&
           !canetas.some(c => c.usuario_atual && c.usuario_atual.trim().toLowerCase() === nomeLower);
  }).length;

  const temQualquerPendencia = totalSemEmailProprio > 0 || totalSemGestorNome > 0 || totalSemGestorEmail > 0 || totalConjugeSemEmail > 0 || totalSemRamal > 0 || totalSemEquipamento > 0;

  if (selectedColaborador) {
    return (
      <ColaboradorDetalhes
        colaborador={selectedColaborador}
        onClose={() => setSelectedColaborador(null)}
        hideSenhas={isReadonly}
        onEdit={isReadonly ? null : (colaborador) => {
          setEditingColaborador(colaborador);
          setSelectedColaborador(null);
          setShowForm(true);
        }}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Colaboradores</h1>
            <p className="text-muted-foreground mt-1">Gerenciar colaboradores e suas credenciais</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportar} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            {!isReadonly && (
              <Button onClick={() => { setEditingColaborador(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.ativos}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Férias</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.ferias}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Afastados</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.afastados}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {temQualquerPendencia && (
          <Card className="mb-6 border-amber-200 dark:border-amber-900 bg-amber-50/10 dark:bg-amber-950/5">
            <CardHeader className="py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-lg text-amber-800 dark:text-amber-300">Pendências de Cadastro</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {totalSemEmailProprio > 0 && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 p-3 rounded-lg text-center">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">Sem E-mail Próprio</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{totalSemEmailProprio}</p>
                  </div>
                )}
                {totalSemGestorNome > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 p-3 rounded-lg text-center">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Sem Gestor</p>
                    <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">{totalSemGestorNome}</p>
                  </div>
                )}
                {totalSemGestorEmail > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 p-3 rounded-lg text-center">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">E-mail Gestor Vazio</p>
                    <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">{totalSemGestorEmail}</p>
                  </div>
                )}
                {totalConjugeSemEmail > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 p-3 rounded-lg text-center">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Cônjuge Sem E-mail</p>
                    <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">{totalConjugeSemEmail}</p>
                  </div>
                )}
                {totalSemRamal > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 p-3 rounded-lg text-center">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Sem Ramal</p>
                    <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">{totalSemRamal}</p>
                  </div>
                )}
                {totalSemEquipamento > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 p-3 rounded-lg text-center">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Sem Equipamento</p>
                    <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">{totalSemEquipamento}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <ColaboradorForm
            colaborador={editingColaborador}
            onClose={() => { setShowForm(false); setEditingColaborador(null); }}
            currentUserRole={currentUser?.role}
          />
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Lista de Colaboradores</CardTitle>
              <div className="relative md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Colaboradores Internos */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-400">Colaboradores Internos</h3>
                  <Badge className="bg-indigo-100 text-indigo-800">
                    {filteredColaboradores.filter(c => c.tipo_funcionario === "Interno").length}
                  </Badge>
                </div>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : filteredColaboradores.filter(c => c.tipo_funcionario === "Interno").length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum colaborador interno encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredColaboradores.filter(c => c.tipo_funcionario === "Interno").map((colaborador) => (
                          <TableRow key={colaborador.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedColaborador(colaborador)}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{colaborador.nome_completo}</span>
                                {(colaborador.permissoes_comunicados || []).length > 0 && (
                                  <Badge className="bg-indigo-100 text-indigo-700 text-xs">Acesso Comunicados</Badge>
                                )}
                                {obterPendencias(colaborador).map((p, idx) => (
                                  <Badge
                                    key={idx}
                                    className={
                                      p.critico
                                        ? "bg-red-100 text-red-800 hover:bg-red-200 border border-red-200 text-[10px] px-1.5 py-0"
                                        : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[10px] px-1.5 py-0"
                                    }
                                  >
                                    {p.label}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{colaborador.email || "-"}</TableCell>
                            <TableCell>{colaborador.area}</TableCell>
                            <TableCell>
                              <Badge className={
                                colaborador.status === "Ativo" ? "bg-green-100 text-green-800" :
                                colaborador.status === "Férias" ? "bg-blue-100 text-blue-800" :
                                colaborador.status === "Afastado" ? "bg-orange-100 text-orange-800" :
                                "bg-gray-100 text-gray-800"
                              }>
                                {colaborador.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setSelectedColaborador(colaborador)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {!isReadonly && (
                                  <>
                                    <Button size="sm" variant="ghost" onClick={() => { setEditingColaborador(colaborador); setShowForm(true); }}>
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDeletingColaborador(colaborador)}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Colaboradores Externos */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-400">Colaboradores Externos</h3>
                  <Badge className="bg-purple-100 text-purple-800">
                    {filteredColaboradores.filter(c => c.tipo_funcionario === "Externo").length}
                  </Badge>
                </div>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : filteredColaboradores.filter(c => c.tipo_funcionario === "Externo").length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum colaborador externo encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredColaboradores.filter(c => c.tipo_funcionario === "Externo").map((colaborador) => (
                          <TableRow key={colaborador.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedColaborador(colaborador)}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{colaborador.nome_completo}</span>
                                {(colaborador.permissoes_comunicados || []).length > 0 && (
                                  <Badge className="bg-indigo-100 text-indigo-700 text-xs">Acesso Comunicados</Badge>
                                )}
                                {obterPendencias(colaborador).map((p, idx) => (
                                  <Badge
                                    key={idx}
                                    className={
                                      p.critico
                                        ? "bg-red-100 text-red-800 hover:bg-red-200 border border-red-200 text-[10px] px-1.5 py-0"
                                        : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[10px] px-1.5 py-0"
                                    }
                                  >
                                    {p.label}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{colaborador.email || "-"}</TableCell>
                            <TableCell>{colaborador.area}</TableCell>
                            <TableCell>
                              <Badge className={
                                colaborador.status === "Ativo" ? "bg-green-100 text-green-800" :
                                colaborador.status === "Férias" ? "bg-blue-100 text-blue-800" :
                                colaborador.status === "Afastado" ? "bg-orange-100 text-orange-800" :
                                "bg-gray-100 text-gray-800"
                              }>
                                {colaborador.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setSelectedColaborador(colaborador)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {!isReadonly && (
                                  <>
                                    <Button size="sm" variant="ghost" onClick={() => { setEditingColaborador(colaborador); setShowForm(true); }}>
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDeletingColaborador(colaborador)}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingColaborador} onOpenChange={(open) => !open && setDeletingColaborador(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o colaborador <strong>{deletingColaborador?.nome_completo}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => deletingColaborador && deleteMutation.mutate(deletingColaborador)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Sim, Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}