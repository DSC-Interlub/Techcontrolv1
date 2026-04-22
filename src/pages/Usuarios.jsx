import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users, UserPlus, Edit, Search, Shield, User, CheckCircle, XCircle,
  Info, Lock, Palette, ClipboardList, Mail,
} from "lucide-react";

// ─── Mapeamento de roles ───────────────────────────────────────────────────────
const ROLES = [
  {
    value: "admin",
    label: "Administrador",
    badgeClass: "bg-blue-900 text-white",
    description: "Acesso total a todos os módulos",
    filterLabel: "Administradores",
    icon: Shield,
  },
  {
    value: "user",
    label: "TI / Operacional",
    badgeClass: "bg-blue-100 text-blue-800",
    description: "Acesso total exceto gerenciar usuários",
    filterLabel: "TI / Operacional",
    icon: User,
  },
  {
    value: "comunicados_arte",
    label: "Marketing — Artes",
    badgeClass: "bg-purple-100 text-purple-800",
    description: "Apenas /Comunicados → aba Artes e Programação",
    filterLabel: "Marketing",
    icon: Palette,
  },
  {
    value: "comunicados_gestao",
    label: "RH / DHO — Gestão",
    badgeClass: "bg-green-100 text-green-800",
    description: "Comunicados (visão geral) + Colaboradores (somente leitura, sem senhas)",
    filterLabel: "RH / DHO",
    icon: ClipboardList,
  },
  {
    value: "comunicados_dp",
    label: "DP — Comunicados",
    badgeClass: "bg-amber-100 text-amber-800",
    description: "Comunicados completo + Colaboradores leitura + envio de Boas-Vindas e Despedida",
    filterLabel: "DP",
    icon: Mail,
  },
];

const getRoleInfo = (roleValue) => ROLES.find(r => r.value === roleValue) || {
  value: roleValue, label: roleValue, badgeClass: "bg-gray-100 text-gray-800",
  description: "Role desconhecida", filterLabel: roleValue, icon: User,
};

const FILTER_TABS = [
  { value: "all", label: "Todos" },
  ...ROLES.map(r => ({ value: r.value, label: r.filterLabel })),
];

// ─── Modal: Alterar Permissão ──────────────────────────────────────────────────
function ModalAlterarPermissao({ usuario, onClose, onSuccess }) {
  const [selectedRole, setSelectedRole] = useState(usuario?.role || "user");
  const [saving, setSaving] = useState(false);

  const roleAtual = getRoleInfo(selectedRole);

  const handleSalvar = async () => {
    setSaving(true);
    await base44.entities.User.update(usuario.id, { role: selectedRole });
    setSaving(false);
    onSuccess("Permissão atualizada com sucesso!");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Permissão</DialogTitle>
          <DialogDescription>Defina o nível de acesso deste usuário no sistema</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-lg p-3 border">
            <p className="text-sm font-medium text-gray-900">{usuario?.full_name || usuario?.email}</p>
            <p className="text-xs text-gray-500">{usuario?.email}</p>
          </div>

          <div className="space-y-2">
            <Label>Nível de Acesso</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      <r.icon className="w-3.5 h-3.5" />
                      {r.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-800 mb-0.5">{roleAtual.label}</p>
                <p className="text-xs text-blue-700">{roleAtual.description}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Salvando..." : "Salvar Permissão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal: Editar Nome ────────────────────────────────────────────────────────
function ModalEditarNome({ usuario, onClose, onSuccess }) {
  const [editName, setEditName] = useState(usuario?.nome_exibicao || usuario?.full_name || "");
  const [saving, setSaving] = useState(false);

  const handleSalvar = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    await base44.entities.User.update(usuario.id, { nome_exibicao: editName });
    setSaving(false);
    onSuccess("Nome de exibição atualizado!");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Nome de Exibição</DialogTitle>
          <DialogDescription>Este nome será exibido no sistema e nos chamados</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={usuario?.email || ""} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-1">
            <Label>Nome de Exibição</Label>
            <Input
              placeholder="Digite o nome"
              value={editName}
              onChange={e => setEditName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal: Convidar ──────────────────────────────────────────────────────────
function ModalConvidar({ onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const roleAtual = getRoleInfo(role);

  const handleConvidar = async () => {
    if (!email.trim()) { setError("Digite um e-mail válido"); return; }
    setSending(true);
    await base44.users.inviteUser(email, role);
    setSending(false);
    onSuccess("Usuário convidado com sucesso!");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Novo Usuário</DialogTitle>
          <DialogDescription>Envie um convite por e-mail para adicionar alguém ao sistema</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input
              type="email"
              placeholder="usuario@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Nível de Acesso</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      <r.icon className="w-3.5 h-3.5" />
                      {r.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-800 mb-0.5">{roleAtual.label}</p>
                <p className="text-xs text-blue-700">{roleAtual.description}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConvidar} disabled={sending} className="bg-blue-600 hover:bg-blue-700">
            {sending ? "Enviando..." : "Enviar Convite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Usuarios() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [permissaoUser, setPermissaoUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setLoading(false); }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: usuarios = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const res = await base44.functions.invoke('listarUsuarios', {});
      return res.data?.usuarios || [];
    },
    enabled: !!user && user.role === 'admin',
  });

  const showSuccess = (msg) => {
    setSuccess(msg);
    queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    setTimeout(() => setSuccess(""), 4000);
  };

  const filteredUsers = usuarios.filter(u => {
    const matchesSearch = u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: usuarios.length,
    admins: usuarios.filter(u => u.role === "admin").length,
    comunicados: usuarios.filter(u => ["comunicados_arte","comunicados_gestao","comunicados_dp"].includes(u.role)).length,
    operacional: usuarios.filter(u => u.role === "user").length,
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
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Cabeçalho */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                Gerenciamento de Usuários
              </h1>
              <p className="text-gray-600 mt-1">Controle de acesso e permissões por usuário</p>
            </div>
            <Button onClick={() => setShowInvite(true)} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Convidar Usuário
            </Button>
          </div>

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">Administradores</p>
                <p className="text-3xl font-bold text-blue-700">{stats.admins}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">TI / Operacional</p>
                <p className="text-3xl font-bold text-blue-500">{stats.operacional}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">Comunicados</p>
                <p className="text-3xl font-bold text-purple-600">{stats.comunicados}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>Visualize e gerencie permissões de todos os usuários</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-3 mb-5">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {FILTER_TABS.map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => setRoleFilter(tab.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        roleFilter === tab.value
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Perfil de Acesso</TableHead>
                      <TableHead>O que enxerga</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map(usuario => {
                        const roleInfo = getRoleInfo(usuario.role);
                        const RoleIcon = roleInfo.icon;
                        return (
                          <TableRow key={usuario.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-700 font-semibold text-sm">
                                    {(usuario.nome_exibicao || usuario.full_name || usuario.email)?.charAt(0)?.toUpperCase() || "?"}
                                  </span>
                                </div>
                                <span className="font-medium text-sm">
                                  {usuario.nome_exibicao || usuario.full_name || usuario.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-500 text-sm">{usuario.email}</TableCell>
                            <TableCell>
                              <Badge className={`${roleInfo.badgeClass} gap-1`}>
                                <RoleIcon className="w-3 h-3" />
                                {roleInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                                    <Info className="w-3.5 h-3.5" />
                                    <span className="max-w-[200px] truncate">{roleInfo.description}</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs">
                                  <p className="font-semibold mb-1">{roleInfo.label}</p>
                                  <p>{roleInfo.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => setPermissaoUser(usuario)}>
                                      <Lock className="w-3.5 h-3.5 mr-1" />
                                      Permissão
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Alterar nível de acesso</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => setEditingUser(usuario)}>
                                      <Edit className="w-3.5 h-3.5 mr-1" />
                                      Nome
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar nome de exibição</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modais */}
      {showInvite && (
        <ModalConvidar
          onClose={() => setShowInvite(false)}
          onSuccess={showSuccess}
        />
      )}
      {editingUser && (
        <ModalEditarNome
          usuario={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={showSuccess}
        />
      )}
      {permissaoUser && (
        <ModalAlterarPermissao
          usuario={permissaoUser}
          onClose={() => setPermissaoUser(null)}
          onSuccess={showSuccess}
        />
      )}
    </TooltipProvider>
  );
}