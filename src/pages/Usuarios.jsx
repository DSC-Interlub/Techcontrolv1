import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, UserPlus, Edit, Search, Shield, User, CheckCircle, XCircle } from "lucide-react";

export default function Usuarios() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados para convidar usuário
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");

  // Estados para editar usuário
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState("");

  // Estados para busca e filtro
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Mensagens
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Carregar usuário atual
  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        console.error("Erro ao carregar usuário:", err);
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Buscar lista de usuários via backend (requer admin)
  const { data: usuarios = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const res = await base44.functions.invoke('listarUsuarios', {});
      return res.data?.usuarios || [];
    },
    enabled: !!user && user.role === 'admin',
  });

  // Mutation para convidar usuário
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      return await base44.users.inviteUser(email, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("user");
      setSuccess("Usuário convidado com sucesso!");
      setTimeout(() => setSuccess(""), 5000);
    },
    onError: (err) => {
      setError(err.message || "Erro ao convidar usuário");
      setTimeout(() => setError(""), 5000);
    },
  });

  // Mutation para atualizar nome
  const updateNameMutation = useMutation({
    mutationFn: async ({ userId, newName }) => {
      return await base44.entities.User.update(userId, { nome_exibicao: newName });
    },
    onSuccess: (data) => {
      console.log("Nome atualizado:", data);
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setShowEditDialog(false);
      setEditingUser(null);
      setEditName("");
      setSuccess("Nome de exibição atualizado com sucesso!");
      setTimeout(() => setSuccess(""), 5000);
    },
    onError: (err) => {
      console.error("Erro ao atualizar:", err);
      setError("Erro ao atualizar nome de exibição.");
      setTimeout(() => setError(""), 5000);
    },
  });

  // Handlers
  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      setError("Digite um email válido");
      setTimeout(() => setError(""), 3000);
      return;
    }
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleEdit = (usuario) => {
    setEditingUser(usuario);
    setEditName(usuario.nome_exibicao || usuario.full_name || "");
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      setError("O nome não pode estar vazio");
      setTimeout(() => setError(""), 3000);
      return;
    }

    updateNameMutation.mutate({
      userId: editingUser.id,
      newName: editName,
    });
  };

  // Filtrar usuários
  const filteredUsers = usuarios.filter((u) => {
    const matchesSearch =
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const ROLE_LABELS = {
    admin: "Admin",
    user: "Usuário",
    comunicados_arte: "Comunicados — Arte",
    comunicados_gestao: "Comunicados — Gestão",
    comunicados_dp: "Comunicados — DP",
  };

  const getRoleBadgeClass = (role) => {
    if (role === "admin") return "bg-blue-100 text-blue-800";
    if (role === "comunicados_arte") return "bg-purple-100 text-purple-800";
    if (role === "comunicados_gestao") return "bg-orange-100 text-orange-800";
    if (role === "comunicados_dp") return "bg-pink-100 text-pink-800";
    return "bg-gray-100 text-gray-800";
  };

  // Estatísticas
  const stats = {
    total: usuarios.length,
    admins: usuarios.filter((u) => u.role === "admin").length,
    users: usuarios.filter((u) => u.role === "user").length,
  };

  if (loading || loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Gerenciamento de Usuários
            </h1>
            <p className="text-gray-600 mt-1">Gerencie os usuários do sistema</p>
          </div>
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar Usuário
          </Button>
        </div>

        {/* Mensagens */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Administradores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.admins}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.users}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>Visualize e gerencie todos os usuários do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                  <SelectItem value="user">Usuários</SelectItem>
                  <SelectItem value="comunicados_arte">Comunicados — Arte</SelectItem>
                  <SelectItem value="comunicados_gestao">Comunicados — Gestão</SelectItem>
                  <SelectItem value="comunicados_dp">Comunicados — DP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-700 font-semibold text-sm">
                                {(usuario.nome_exibicao || usuario.full_name || usuario.email)?.charAt(0)?.toUpperCase() || "?"}
                              </span>
                            </div>
                            <span>{usuario.nome_exibicao || usuario.full_name || usuario.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{usuario.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeClass(usuario.role)}>
                            {usuario.role === "admin" ? <Shield className="w-3 h-3 mr-1 inline" /> : <User className="w-3 h-3 mr-1 inline" />}
                            {ROLE_LABELS[usuario.role] || usuario.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(usuario)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar Nome
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
      </div>

      {/* Dialog: Convidar Usuário */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Novo Usuário</DialogTitle>
            <DialogDescription>
              Envie um convite por email para adicionar um novo usuário ao sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Tipo de Usuário</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário (TI)</SelectItem>
                  <SelectItem value="admin">Administrador (TI)</SelectItem>
                  <SelectItem value="comunicados_arte">Comunicados — Arte (Marketing)</SelectItem>
                  <SelectItem value="comunicados_gestao">Comunicados — Gestão (DP/RH)</SelectItem>
                  <SelectItem value="comunicados_dp">Comunicados — DP (envio boas-vindas/despedida)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviteMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {inviteMutation.isPending ? "Enviando..." : "Enviar Convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Nome */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nome de Exibição</DialogTitle>
            <DialogDescription>
              Este nome será exibido no sistema e nos chamados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-display">Email</Label>
              <Input
                id="email-display"
                value={editingUser?.email || ""}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome de Exibição</Label>
              <Input
                id="name"
                placeholder="Digite o nome de exibição"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateNameMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateNameMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}