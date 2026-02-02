import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Mail, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Usuarios() {
  const [showForm, setShowForm] = useState(false);
  const [emailConvite, setEmailConvite] = useState("");
  const [roleConvite, setRoleConvite] = useState("user");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const handleInvite = async () => {
    if (!emailConvite) {
      setError("Por favor, insira um email");
      return;
    }

    try {
      setSending(true);
      setError("");
      await base44.users.inviteUser(emailConvite, roleConvite);
      setSuccess(`Convite enviado para ${emailConvite}! O usuário receberá um email para criar sua senha.`);
      setEmailConvite("");
      setRoleConvite("user");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.message || "Erro ao enviar convite");
    } finally {
      setSending(false);
    }
  };

  const filteredUsuarios = usuarios.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === "all" || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: usuarios.length,
    admins: usuarios.filter(u => u.role === "admin").length,
    users: usuarios.filter(u => u.role === "user").length,
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Usuários do Sistema</h1>
              <p className="text-gray-500 mt-1">Gerenciar acesso de administradores e usuários</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar Usuário
          </Button>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total de Usuários</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Administradores</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.admins}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Usuários</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.users}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Lista de Usuários ({filteredUsuarios.length})</CardTitle>
              <div className="flex gap-3 w-full md:w-auto">
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64"
                />
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="user">Usuários</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Data de Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsuarios.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-700 font-semibold">
                                {user.full_name?.charAt(0).toUpperCase() || "?"}
                              </span>
                            </div>
                            <span className="font-medium">{user.full_name || "Sem nome"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            user.role === "admin" 
                              ? "bg-purple-100 text-purple-800" 
                              : "bg-blue-100 text-blue-800"
                          }>
                            {user.role === "admin" ? "Administrador" : "Usuário"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(user.created_date).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800 text-sm">
                  Um email de convite será enviado para o usuário. Ele poderá definir sua própria senha ao aceitar o convite.
                </AlertDescription>
              </Alert>
              
              <div>
                <Label>Email do Usuário</Label>
                <Input
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={emailConvite}
                  onChange={(e) => setEmailConvite(e.target.value)}
                />
              </div>

              <div>
                <Label>Função no Sistema</Label>
                <Select value={roleConvite} onValueChange={setRoleConvite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">
                  Administradores têm acesso completo ao sistema.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleInvite}
                disabled={sending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {sending ? "Enviando..." : "Enviar Convite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}