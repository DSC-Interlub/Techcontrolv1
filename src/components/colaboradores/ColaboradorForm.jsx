import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { X, Plus, Trash2, Eye, EyeOff } from "lucide-react";

export default function ColaboradorForm({ colaborador, onClose }) {
  const [formData, setFormData] = useState(colaborador || { senhas_sistemas: [], filhos: [], incluir_comunicados: true });
  const [showSenhas, setShowSenhas] = useState({});

  useEffect(() => {
    setFormData(colaborador || { senhas_sistemas: [], filhos: [], incluir_comunicados: true });
    setShowSenhas({});
  }, [colaborador?.id]);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Colaboradores.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['colaboradores'] }); onClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Colaboradores.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['colaboradores'] }); onClose(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (colaborador) {
      updateMutation.mutate({ id: colaborador.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  // Sistemas
  const addSistemaSenha = () => set('senhas_sistemas', [...(formData.senhas_sistemas || []), { sistema: "", usuario: "", senha: "", observacoes: "" }]);
  const removeSistemaSenha = (i) => { const arr = [...(formData.senhas_sistemas || [])]; arr.splice(i, 1); set('senhas_sistemas', arr); };
  const updateSistemaSenha = (i, field, value) => { const arr = [...(formData.senhas_sistemas || [])]; arr[i] = { ...arr[i], [field]: value }; set('senhas_sistemas', arr); };

  // Filhos
  const addFilho = () => set('filhos', [...(formData.filhos || []), { filho_nome: "", filho_data_nascimento: "" }]);
  const removeFilho = (i) => { const arr = [...(formData.filhos || [])]; arr.splice(i, 1); set('filhos', arr); };
  const updateFilho = (i, field, value) => { const arr = [...(formData.filhos || [])]; arr[i] = { ...arr[i], [field]: value }; set('filhos', arr); };

  const toggleShowSenha = (field) => setShowSenhas(prev => ({ ...prev, [field]: !prev[field] }));

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="mb-6">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>{colaborador ? "Editar Colaborador" : "Novo Colaborador"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-4">
          <Tabs defaultValue="profissional" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="profissional">Dados Profissionais</TabsTrigger>
              <TabsTrigger value="pessoal">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="senhas">Senhas e Acessos</TabsTrigger>
              <TabsTrigger value="obs">Observações</TabsTrigger>
            </TabsList>

            {/* ── SEÇÃO 1: DADOS PROFISSIONAIS ── */}
            <TabsContent value="profissional" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input required placeholder="Nome completo do colaborador" value={formData.nome_completo || ""} onChange={e => set('nome_completo', e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" placeholder="email@empresa.com" value={formData.email || ""} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <Label>Área/Departamento *</Label>
                  <Input required placeholder="Ex: Financeiro, TI, Vendas" value={formData.area || ""} onChange={e => set('area', e.target.value)} />
                </div>
                <div>
                  <Label>Cargo</Label>
                  <Input placeholder="Ex: Analista de TI, Gerente Comercial" value={formData.cargo || ""} onChange={e => set('cargo', e.target.value)} />
                </div>
                <div>
                  <Label>Tipo de Funcionário</Label>
                  <Select value={formData.tipo_funcionario || ""} onValueChange={v => set('tipo_funcionario', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Interno">Interno</SelectItem>
                      <SelectItem value="Externo">Externo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Local / Unidade</Label>
                  <Input placeholder="Ex: Matriz SP, Filial RJ" value={formData.local_trabalho || ""} onChange={e => set('local_trabalho', e.target.value)} />
                </div>
                <div>
                  <Label>Telefone/Ramal</Label>
                  <Input placeholder="(00) 00000-0000 ou ramal" value={formData.telefone || ""} onChange={e => set('telefone', e.target.value)} />
                </div>
                <div>
                  <Label>Data de Admissão</Label>
                  <Input type="date" value={formData.data_admissao || ""} onChange={e => set('data_admissao', e.target.value)} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status || "Ativo"} onValueChange={v => set('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Férias">Férias</SelectItem>
                      <SelectItem value="Afastado">Afastado</SelectItem>
                      <SelectItem value="Desligado">Desligado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Foto URL</Label>
                  <Input placeholder="https://..." value={formData.foto_url || ""} onChange={e => set('foto_url', e.target.value)} />
                </div>
                <div>
                  <Label>Nome do Responsável / Gestor</Label>
                  <Input placeholder="Nome do gestor direto" value={formData.contato_responsavel_nome || ""} onChange={e => set('contato_responsavel_nome', e.target.value)} />
                </div>
                <div>
                  <Label>E-mail do Responsável / Gestor</Label>
                  <Input type="email" placeholder="gestor@empresa.com" value={formData.contato_responsavel_email || ""} onChange={e => set('contato_responsavel_email', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* ── SEÇÃO 2: DADOS PESSOAIS E COMUNICADOS ── */}
            <TabsContent value="pessoal" className="space-y-6">

              {/* Dados pessoais */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Dados Pessoais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input type="date" value={formData.data_nascimento || ""} onChange={e => set('data_nascimento', e.target.value)} />
                  </div>
                  <div>
                    <Label>Graduação / Formação</Label>
                    <Input placeholder="Ex: Ciência da Computação, Administração" value={formData.graduacao || ""} onChange={e => set('graduacao', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Resumo de Experiência</Label>
                    <Textarea
                      placeholder="Descreva brevemente a experiência profissional..."
                      rows={3}
                      maxLength={500}
                      value={formData.resumo_experiencia || ""}
                      onChange={e => set('resumo_experiencia', e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{(formData.resumo_experiencia || "").length}/500</p>
                  </div>
                </div>
              </div>

              {/* Dados do cônjuge */}
              <div className="border-t pt-5">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Dados do Cônjuge</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Nome do Cônjuge</Label>
                    <Input placeholder="Nome completo" value={formData.conjuge_nome || ""} onChange={e => set('conjuge_nome', e.target.value)} />
                  </div>
                  <div>
                    <Label>E-mail do Cônjuge</Label>
                    <Input type="email" placeholder="conjuge@email.com" value={formData.conjuge_email || ""} onChange={e => set('conjuge_email', e.target.value)} />
                  </div>
                  <div>
                    <Label>Data de Nascimento do Cônjuge</Label>
                    <Input type="date" value={formData.conjuge_data_nascimento || ""} onChange={e => set('conjuge_data_nascimento', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Filhos */}
              <div className="border-t pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filhos</h4>
                  <Button type="button" size="sm" variant="outline" onClick={addFilho}>
                    <Plus className="w-4 h-4 mr-1" />Adicionar Filho
                  </Button>
                </div>
                {(formData.filhos || []).length === 0 && (
                  <p className="text-sm text-gray-400">Nenhum filho cadastrado.</p>
                )}
                <div className="space-y-2">
                  {(formData.filhos || []).map((filho, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Nome do filho(a)"
                          value={filho.filho_nome || ""}
                          onChange={e => updateFilho(i, 'filho_nome', e.target.value)}
                        />
                        <Input
                          type="date"
                          value={filho.filho_data_nascimento || ""}
                          onChange={e => updateFilho(i, 'filho_data_nascimento', e.target.value)}
                        />
                      </div>
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeFilho(i)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comunicados */}
              <div className="border-t pt-5">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Comunicados Automáticos</h4>
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <Switch
                    id="incluir_comunicados"
                    checked={formData.incluir_comunicados !== false}
                    onCheckedChange={v => set('incluir_comunicados', v)}
                  />
                  <label htmlFor="incluir_comunicados" className="text-sm text-blue-900 cursor-pointer">
                    <span className="font-medium">Incluir nos Comunicados Automáticos</span>
                    <p className="text-xs text-blue-700 mt-0.5">Quando ativo, o colaborador recebe e-mails automáticos de boas-vindas, aniversário e outros comunicados.</p>
                  </label>
                </div>
              </div>
            </TabsContent>

            {/* ── SEÇÃO 3: SENHAS E ACESSOS ── */}
            <TabsContent value="senhas" className="space-y-6">

              {/* Acesso ao Portal */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Acesso ao Portal do Colaborador</h4>
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
                        onChange={e => set('senha_portal', e.target.value)}
                        className="pr-10"
                      />
                      <button type="button" onClick={() => toggleShowSenha('portal')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showSenhas.portal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="bloquear_portal" checked={formData.acesso_portal_bloqueado || false} onChange={e => set('acesso_portal_bloqueado', e.target.checked)} className="w-4 h-4" />
                      <label htmlFor="bloquear_portal" className="text-sm text-gray-700 cursor-pointer">Bloquear acesso ao portal</label>
                    </div>
                    {colaborador && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-xs text-orange-700 mb-1 font-semibold">Reset de Senha</p>
                        <p className="text-xs text-orange-600 mb-3">Defina uma nova senha e marque para forçar o colaborador a trocar no próximo acesso.</p>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="precisa_trocar" checked={formData.senha_precisa_trocar || false} onChange={e => set('senha_precisa_trocar', e.target.checked)} className="w-4 h-4" />
                          <label htmlFor="precisa_trocar" className="text-sm text-orange-800 cursor-pointer font-medium">Forçar troca de senha no próximo acesso</label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Credenciais */}
              <div className="border-t pt-5">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Credenciais de Acesso</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Senha Microsoft/Office 365</Label>
                    <div className="relative">
                      <Input
                        type={showSenhas.microsoft ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.senha_microsoft || ""}
                        onChange={e => set('senha_microsoft', e.target.value)}
                        className="pr-10"
                      />
                      <button type="button" onClick={() => toggleShowSenha('microsoft')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                        onChange={e => set('senha_login_maquina', e.target.value)}
                        className="pr-10"
                      />
                      <button type="button" onClick={() => toggleShowSenha('maquina')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showSenhas.maquina ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Senhas de Sistemas</Label>
                    <Button type="button" onClick={addSistemaSenha} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />Adicionar Sistema
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {(formData.senhas_sistemas || []).map((sistema, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                            <Input placeholder="Nome do Sistema (SAP, WMS, etc)" value={sistema.sistema || ""} onChange={e => updateSistemaSenha(index, 'sistema', e.target.value)} />
                            <Input placeholder="Usuário" value={sistema.usuario || ""} onChange={e => updateSistemaSenha(index, 'usuario', e.target.value)} />
                            <div className="relative">
                              <Input
                                type={showSenhas[`sistema_${index}`] ? "text" : "password"}
                                placeholder="Senha"
                                value={sistema.senha || ""}
                                onChange={e => updateSistemaSenha(index, 'senha', e.target.value)}
                                className="pr-10"
                              />
                              <button type="button" onClick={() => toggleShowSenha(`sistema_${index}`)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showSenhas[`sistema_${index}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <Input placeholder="Observações" value={sistema.observacoes || ""} onChange={e => updateSistemaSenha(index, 'observacoes', e.target.value)} />
                          </div>
                          <Button type="button" size="icon" variant="ghost" onClick={() => removeSistemaSenha(index)} className="shrink-0">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── SEÇÃO 4: OBSERVAÇÕES ── */}
            <TabsContent value="obs">
              <div>
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações gerais sobre o colaborador..."
                  value={formData.observacoes || ""}
                  onChange={e => set('observacoes', e.target.value)}
                  rows={5}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <div className="border-t p-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isPending}>
            {isPending ? "Salvando..." : (colaborador ? "Atualizar" : "Criar")}
          </Button>
        </div>
      </form>
    </Card>
  );
}