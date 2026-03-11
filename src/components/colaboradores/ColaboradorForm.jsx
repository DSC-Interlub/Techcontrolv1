import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2, Eye, EyeOff } from "lucide-react";

export default function ColaboradorForm({ colaborador, onClose }) {
  const [formData, setFormData] = useState(colaborador || { senhas_sistemas: [] });
  const [showSenhas, setShowSenhas] = useState({});

  React.useEffect(() => {
    setFormData(colaborador || { senhas_sistemas: [] });
    setShowSenhas({});
  }, [colaborador?.id]);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Colaboradores.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Colaboradores.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (colaborador) {
      updateMutation.mutate({ id: colaborador.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addSistemaSenha = () => {
    const senhas = formData.senhas_sistemas || [];
    setFormData({
      ...formData,
      senhas_sistemas: [...senhas, { sistema: "", usuario: "", senha: "", observacoes: "" }]
    });
  };

  const removeSistemaSenha = (index) => {
    const senhas = [...(formData.senhas_sistemas || [])];
    senhas.splice(index, 1);
    setFormData({ ...formData, senhas_sistemas: senhas });
  };

  const updateSistemaSenha = (index, field, value) => {
    const senhas = [...(formData.senhas_sistemas || [])];
    senhas[index] = { ...senhas[index], [field]: value };
    setFormData({ ...formData, senhas_sistemas: senhas });
  };

  const toggleShowSenha = (field) => {
    setShowSenhas({ ...showSenhas, [field]: !showSenhas[field] });
  };

  return (
    <Card className="mb-6">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>{colaborador ? "Editar Colaborador" : "Novo Colaborador"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-6">
          {/* Dados Básicos */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Básicos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  required
                  placeholder="Nome completo do colaborador"
                  value={formData.nome_completo || ""}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@empresa.com"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Área/Departamento *</Label>
                <Input
                  required
                  placeholder="Ex: Financeiro, TI, Vendas"
                  value={formData.area || ""}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo de Funcionário *</Label>
                <Select
                  value={formData.tipo_funcionario || ""}
                  onValueChange={(value) => setFormData({ ...formData, tipo_funcionario: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interno">Interno</SelectItem>
                    <SelectItem value="Externo">Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Telefone/Ramal</Label>
                <Input
                  placeholder="(00) 00000-0000 ou ramal"
                  value={formData.telefone || ""}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de Admissão</Label>
                <Input
                  type="date"
                  value={formData.data_admissao || ""}
                  onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                />
              </div>
              <div>
                <Label>Status *</Label>
                <Select
                  value={formData.status || "Ativo"}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Férias">Férias</SelectItem>
                    <SelectItem value="Afastado">Afastado</SelectItem>
                    <SelectItem value="Desligado">Desligado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Acesso ao Portal */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Acesso ao Portal do Colaborador</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">O colaborador usará o <strong>e-mail</strong> e a <strong>senha do portal</strong> para acessar o portal.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Senha do Portal</Label>
                <div className="relative">
                  <Input
                    type={showSenhas.portal ? "text" : "password"}
                    placeholder="Definir senha de acesso ao portal"
                    value={formData.senha_portal || ""}
                    onChange={(e) => setFormData({ ...formData, senha_portal: e.target.value })}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => toggleShowSenha('portal')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSenhas.portal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="bloquear_portal"
                    checked={formData.acesso_portal_bloqueado || false}
                    onChange={(e) => setFormData({ ...formData, acesso_portal_bloqueado: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="bloquear_portal" className="text-sm text-gray-700 cursor-pointer">
                    Bloquear acesso ao portal
                  </label>
                </div>
                {colaborador && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-orange-700 mb-2 font-semibold">Reset de Senha</p>
                    <p className="text-xs text-orange-600 mb-3">
                      Defina uma nova senha e marque para forçar o colaborador a trocar no próximo acesso.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="precisa_trocar"
                        checked={formData.senha_precisa_trocar || false}
                        onChange={(e) => setFormData({ ...formData, senha_precisa_trocar: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="precisa_trocar" className="text-sm text-orange-800 cursor-pointer font-medium">
                        Forçar troca de senha no próximo acesso
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Senhas */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Credenciais de Acesso</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Senha Microsoft/Office 365</Label>
                  <div className="relative">
                    <Input
                      type={showSenhas.microsoft ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.senha_microsoft || ""}
                      onChange={(e) => setFormData({ ...formData, senha_microsoft: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowSenha('microsoft')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSenhas.microsoft ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Senha Login Máquina</Label>
                  <div className="relative">
                    <Input
                      type={showSenhas.maquina ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.senha_login_maquina || ""}
                      onChange={(e) => setFormData({ ...formData, senha_login_maquina: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowSenha('maquina')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSenhas.maquina ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Senhas de Sistemas</Label>
                  <Button type="button" onClick={addSistemaSenha} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Sistema
                  </Button>
                </div>
                <div className="space-y-3">
                  {(formData.senhas_sistemas || []).map((sistema, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                          <Input
                            placeholder="Nome do Sistema (SAP, WMS, etc)"
                            value={sistema.sistema || ""}
                            onChange={(e) => updateSistemaSenha(index, 'sistema', e.target.value)}
                          />
                          <Input
                            placeholder="Usuário"
                            value={sistema.usuario || ""}
                            onChange={(e) => updateSistemaSenha(index, 'usuario', e.target.value)}
                          />
                          <div className="relative">
                            <Input
                              type={showSenhas[`sistema_${index}`] ? "text" : "password"}
                              placeholder="Senha"
                              value={sistema.senha || ""}
                              onChange={(e) => updateSistemaSenha(index, 'senha', e.target.value)}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => toggleShowSenha(`sistema_${index}`)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showSenhas[`sistema_${index}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <Input
                            placeholder="Observações"
                            value={sistema.observacoes || ""}
                            onChange={(e) => updateSistemaSenha(index, 'observacoes', e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeSistemaSenha(index)}
                          className="ml-2"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações gerais sobre o colaborador..."
              value={formData.observacoes || ""}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
        <div className="border-t p-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
            {colaborador ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}