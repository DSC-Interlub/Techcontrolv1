import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { X, Plus, Trash2, Eye, EyeOff, Upload, User, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PERMISSOES_COMUNICADOS = [
  { value: "ver_visao_geral", label: "Ver Visão Geral", desc: "Acesso à visão geral de aniversariantes, tempo de empresa e eventos pendentes" },
  { value: "cadastrar_artes", label: "Cadastrar Artes", desc: "Pode fazer upload das artes de comunicado para cada colaborador" },
  { value: "enviar_boas_vindas", label: "Enviar Boas-Vindas", desc: "Pode disparar manualmente o e-mail de boas-vindas" },
  { value: "enviar_despedida", label: "Enviar Despedida", desc: "Pode confirmar saída e disparar o e-mail de despedida" },
  { value: "gerir_colaboradores", label: "Gerir Colaboradores", desc: "Pode cadastrar novos colaboradores e registrar desligamentos pelo portal" },
];

const hoje = new Date().toISOString().split("T")[0];

export default function ColaboradorForm({ colaborador, onClose, currentUserRole }) {
  const [formData, setFormData] = useState(() => colaborador || {
    senhas_sistemas: [], filhos: [], incluir_comunicados: true, permissoes_comunicados: [], status: "Ativo"
  });
  const [showSenhas, setShowSenhas] = useState({});
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [errors, setErrors] = useState({});
  const fotoRef = useRef();

  useEffect(() => {
    setFormData(colaborador || { senhas_sistemas: [], filhos: [], incluir_comunicados: true, permissoes_comunicados: [], status: "Ativo" });
    setShowSenhas({});
    setErrors({});
  }, [colaborador?.id]);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Colaboradores.create(data),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] }); 
      onClose(); 
    },
    onError: (error) => {
      console.error("Erro ao criar colaborador:", error);
      setErrors(prev => ({ ...prev, _form: error.message || "Erro ao salvar colaborador. Tente novamente." }));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Colaboradores.update(id, data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      queryClient.invalidateQueries({ queryKey: ['portal_colab_full'] });

      // Se o aprovador mudou, atualiza as requisições pendentes para o novo aprovador
      const oldId = colaborador?.responsavel_id;
      const newId = variables.data.responsavel_id;
      if (oldId !== newId) {
        try {
          const pendentes = await base44.entities.RequisicaoCompras.filter({
            colaborador_id: variables.id,
            status: 'Aguardando Aprovador',
          });
          if (pendentes.length > 0) {
            await base44.entities.RequisicaoCompras.bulkUpdate(
              pendentes.map(r => ({
                id: r.id,
                aprovador_id: variables.data.responsavel_id || '',
                aprovador_nome: variables.data.responsavel_nome || '',
                aprovador_email: variables.data.responsavel_email || '',
              }))
            );
          }
        } catch (e) {
          console.error('Erro ao atualizar requisições pendentes:', e);
        }
        queryClient.invalidateQueries({ queryKey: ['admin_requisicoes'] });
        queryClient.invalidateQueries({ queryKey: ['portal_requisicoes'] });
      }
      onClose();
    },
    onError: (error) => {
      console.error("Erro ao atualizar colaborador:", error);
      setErrors(prev => ({ ...prev, _form: error.message || "Erro ao atualizar colaborador. Tente novamente." }));
    }
  });

  const validate = () => {
    const e = {};
    if (!formData.nome_completo?.trim() || formData.nome_completo.trim().length < 3) e.nome_completo = "Nome obrigatório (mín. 3 caracteres)";
    if (!formData.area?.trim()) e.area = "Área/Departamento é obrigatório";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "E-mail inválido";
    if (formData.data_nascimento && formData.data_nascimento > hoje) e.data_nascimento = "Data não pode ser futura";
    if (formData.conjuge_data_nascimento && formData.conjuge_data_nascimento > hoje) e.conjuge_data_nascimento = "Data não pode ser futura";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      // Mostra alerta no topo do formulário para erros em abas invisíveis
      if (v.nome_completo || v.area) {
        setErrors(prev => ({
          ...prev,
          _form: 'Preencha os campos obrigatórios na aba "Profissional": Nome e Área.',
        }));
      }
      return;
    }
    if (colaborador) {
      updateMutation.mutate({ id: colaborador.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const set = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const handleFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('foto_url', file_url);
    setUploadingFoto(false);
  };

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
  const isComunicadosRole = ['comunicados_arte', 'comunicados_gestao', 'comunicados_dp'].includes(currentUserRole);

  // Busca todos colaboradores ativos para o select de aprovador
  const { data: todosColaboradores = [] } = useQuery({
    queryKey: ['colaboradores_aprovadores'],
    queryFn: () => base44.entities.Colaboradores.filter({ status: 'Ativo' }),
    staleTime: 5 * 60 * 1000,
  });

  const handleAprovadorChange = (colaboradorId) => {
    if (!colaboradorId || colaboradorId === '__none__') {
      set('responsavel_id', '');
      set('responsavel_nome', '');
      set('responsavel_email', '');
      return;
    }
    const colab = todosColaboradores.find(c => c.id === colaboradorId);
    if (colab) {
      set('responsavel_id', colab.id);
      set('responsavel_nome', colab.nome_completo);
      set('responsavel_email', colab.email || '');
    }
  };

  const ErrMsg = ({ field }) => errors[field] ? <p className="text-xs text-red-500 mt-1">{errors[field]}</p> : null;

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
          {errors._form && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors._form}</AlertDescription>
            </Alert>
          )}
          <Tabs defaultValue="profissional" className="w-full">
            <TabsList className={`grid w-full mb-6 ${isComunicadosRole ? "grid-cols-3" : "grid-cols-4"}`}>
              <TabsTrigger value="profissional">Profissional</TabsTrigger>
              <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
              <TabsTrigger value="familia">Família</TabsTrigger>
              {!isComunicadosRole && <TabsTrigger value="acesso">Acesso e Segurança</TabsTrigger>}
            </TabsList>

            {/* ── ABA 1: PROFISSIONAL ── */}
            <TabsContent value="profissional" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Nome Completo <span className="text-red-500">*</span></Label>
                  <Input
                    className="mt-1"
                    placeholder="Nome completo do colaborador"
                    value={formData.nome_completo || ""}
                    onChange={e => set('nome_completo', e.target.value)}
                  />
                  <ErrMsg field="nome_completo" />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input className="mt-1" type="email" placeholder="email@empresa.com" value={formData.email || ""} onChange={e => set('email', e.target.value)} />
                  <ErrMsg field="email" />
                </div>
                <div>
                  <Label>Área / Departamento <span className="text-red-500">*</span></Label>
                  <Input className="mt-1" placeholder="Ex: Financeiro, TI, Vendas" value={formData.area || ""} onChange={e => set('area', e.target.value)} />
                  <ErrMsg field="area" />
                </div>
                <div>
                  <Label>Cargo</Label>
                  <Input className="mt-1" placeholder="Ex: Analista, Gerente" value={formData.cargo || ""} onChange={e => set('cargo', e.target.value)} />
                </div>
                <div>
                  <Label>Telefone / Ramal</Label>
                  <Input className="mt-1" placeholder="(00) 00000-0000 ou ramal" value={formData.telefone || ""} onChange={e => set('telefone', e.target.value)} />
                </div>
                <div>
                  <Label>Tipo de Funcionário</Label>
                  <Select value={formData.tipo_funcionario || ""} onValueChange={v => set('tipo_funcionario', v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Interno">Interno</SelectItem>
                      <SelectItem value="Externo">Externo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Local / Unidade</Label>
                  <Input className="mt-1" placeholder="Ex: Matriz SP, Filial RJ" value={formData.local_trabalho || ""} onChange={e => set('local_trabalho', e.target.value)} />
                </div>
                <div>
                  <Label>Data de Admissão</Label>
                  <Input className="mt-1" type="date" value={formData.data_admissao || ""} onChange={e => set('data_admissao', e.target.value)} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status || "Ativo"} onValueChange={v => set('status', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Férias">Férias</SelectItem>
                      <SelectItem value="Afastado">Afastado</SelectItem>
                      <SelectItem value="Desligado">Desligado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Aprovador para Requisições de Compra */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-2 space-y-2">
                <h4 className="text-sm font-semibold text-emerald-900">Aprovador de Requisições de Compra</h4>
                <p className="text-xs text-emerald-700">Selecione o colaborador responsável por aprovar as requisições de compra deste colaborador.</p>
                <Select
                  value={formData.responsavel_id || '__none__'}
                  onValueChange={handleAprovadorChange}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione o aprovador..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhum aprovador definido —</SelectItem>
                    {todosColaboradores
                      .filter(c => c.id !== colaborador?.id)
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_completo} {c.cargo ? `— ${c.cargo}` : ''} {c.area ? `(${c.area})` : ''}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                {formData.responsavel_nome && (
                  <p className="text-xs text-emerald-800">✅ Aprovador: <strong>{formData.responsavel_nome}</strong> · {formData.responsavel_email}</p>
                )}
              </div>

              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
                <Switch
                  id="incluir_comunicados"
                  checked={formData.incluir_comunicados !== false}
                  onCheckedChange={v => set('incluir_comunicados', v)}
                />
                <label htmlFor="incluir_comunicados" className="text-sm text-blue-900 cursor-pointer">
                  <span className="font-medium">Incluir nos Comunicados Automáticos</span>
                  <p className="text-xs text-blue-700 mt-0.5">Quando ativo, o colaborador recebe e-mails automáticos de boas-vindas, aniversário e outros eventos.</p>
                </label>
              </div>
            </TabsContent>

            {/* ── ABA 2: PESSOAL ── */}
            <TabsContent value="pessoal" className="space-y-5">
              {/* Foto */}
              <div>
                <Label>Foto do Colaborador</Label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                    {formData.foto_url
                      ? <img src={formData.foto_url} alt="Foto" className="w-full h-full object-cover" />
                      : <User className="w-8 h-8 text-gray-300" />}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
                    <Button type="button" size="sm" variant="outline" onClick={() => fotoRef.current?.click()} disabled={uploadingFoto}>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      {uploadingFoto ? "Enviando..." : (formData.foto_url ? "Trocar Foto" : "Carregar Foto")}
                    </Button>
                    {formData.foto_url && (
                      <Button type="button" size="sm" variant="ghost" className="text-red-500 text-xs" onClick={() => set('foto_url', '')}>
                        Remover foto
                      </Button>
                    )}
                    <p className="text-xs text-gray-400">JPG, PNG, WEBP — máx. 5MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <Label>Data de Nascimento</Label>
                  <Input className="mt-1" type="date" max={hoje} value={formData.data_nascimento || ""} onChange={e => set('data_nascimento', e.target.value)} />
                  <ErrMsg field="data_nascimento" />
                </div>
                <div>
                  <Label>Graduação / Formação</Label>
                  <Input className="mt-1" placeholder="Ex: Administração, Ciência da Computação" value={formData.graduacao || ""} onChange={e => set('graduacao', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Resumo de Experiência</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Descreva brevemente a experiência profissional..."
                    rows={3}
                    maxLength={500}
                    value={formData.resumo_experiencia || ""}
                    onChange={e => set('resumo_experiencia', e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{(formData.resumo_experiencia || "").length}/500</p>
                </div>
                <div>
                  <Label>Nome do Responsável / Gestor</Label>
                  <Input className="mt-1" placeholder="Nome do gestor direto" value={formData.contato_responsavel_nome || ""} onChange={e => set('contato_responsavel_nome', e.target.value)} />
                </div>
                <div>
                  <Label>E-mail do Responsável / Gestor</Label>
                  <Input className="mt-1" type="email" placeholder="gestor@empresa.com" value={formData.contato_responsavel_email || ""} onChange={e => set('contato_responsavel_email', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* ── ABA 3: FAMÍLIA ── */}
            <TabsContent value="familia" className="space-y-6">
              {/* Cônjuge */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Cônjuge</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Nome do Cônjuge</Label>
                    <Input className="mt-1" placeholder="Nome completo" value={formData.conjuge_nome || ""} onChange={e => set('conjuge_nome', e.target.value)} />
                  </div>
                  <div>
                    <Label>E-mail do Cônjuge</Label>
                    <Input className="mt-1" type="email" placeholder="conjuge@email.com" value={formData.conjuge_email || ""} onChange={e => set('conjuge_email', e.target.value)} />
                  </div>
                  <div>
                    <Label>Data de Nascimento do Cônjuge</Label>
                    <Input className="mt-1" type="date" max={hoje} value={formData.conjuge_data_nascimento || ""} onChange={e => set('conjuge_data_nascimento', e.target.value)} />
                    <ErrMsg field="conjuge_data_nascimento" />
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
                          max={hoje}
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
            </TabsContent>

            {/* ── ABA 4: ACESSO E SEGURANÇA (apenas não-comunicados) ── */}
            {!isComunicadosRole && (
              <TabsContent value="acesso" className="space-y-6">
                {/* Acesso ao Portal */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Acesso ao Portal do Colaborador</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">O colaborador usará o <strong>e-mail</strong> e a <strong>senha do portal</strong> para acessar o portal.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Senha do Portal</Label>
                      <div className="relative mt-1">
                        <Input
                          type={showSenhas.portal ? "text" : "password"}
                          placeholder="Definir senha de acesso"
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
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="precisa_trocar" checked={formData.senha_precisa_trocar || false} onChange={e => set('senha_precisa_trocar', e.target.checked)} className="w-4 h-4" />
                        <label htmlFor="precisa_trocar" className="text-sm text-gray-700 cursor-pointer">Forçar troca de senha no próximo acesso</label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Credenciais corporativas */}
                <div className="border-t pt-5">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Credenciais Corporativas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Senha Microsoft / Office 365</Label>
                      <div className="relative mt-1">
                        <Input type={showSenhas.microsoft ? "text" : "password"} placeholder="••••••••" value={formData.senha_microsoft || ""} onChange={e => set('senha_microsoft', e.target.value)} className="pr-10" />
                        <button type="button" onClick={() => toggleShowSenha('microsoft')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showSenhas.microsoft ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label>Senha Login Máquina</Label>
                      <div className="relative mt-1">
                        <Input type={showSenhas.maquina ? "text" : "password"} placeholder="••••••••" value={formData.senha_login_maquina || ""} onChange={e => set('senha_login_maquina', e.target.value)} className="pr-10" />
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
                              <Input placeholder="Sistema (SAP, WMS, etc)" value={sistema.sistema || ""} onChange={e => updateSistemaSenha(index, 'sistema', e.target.value)} />
                              <Input placeholder="Usuário" value={sistema.usuario || ""} onChange={e => updateSistemaSenha(index, 'usuario', e.target.value)} />
                              <div className="relative">
                                <Input type={showSenhas[`s${index}`] ? "text" : "password"} placeholder="Senha" value={sistema.senha || ""} onChange={e => updateSistemaSenha(index, 'senha', e.target.value)} className="pr-10" />
                                <button type="button" onClick={() => toggleShowSenha(`s${index}`)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                  {showSenhas[`s${index}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

                {/* Permissões de Comunicados — apenas admin */}
                {currentUserRole === 'admin' && (
                  <div className="border-t pt-5">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Permissões de Comunicados no Portal</h4>
                    <p className="text-xs text-gray-500 mb-3">Define o que este colaborador pode acessar na seção "Comunicados" do portal.</p>
                    <div className="space-y-3">
                      {PERMISSOES_COMUNICADOS.map(p => {
                        const checked = (formData.permissoes_comunicados || []).includes(p.value);
                        const toggle = () => {
                          const atual = formData.permissoes_comunicados || [];
                          set('permissoes_comunicados', checked ? atual.filter(v => v !== p.value) : [...atual, p.value]);
                        };
                        return (
                          <div key={p.value} className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                            <input type="checkbox" id={`perm_${p.value}`} checked={checked} onChange={toggle} className="w-4 h-4 mt-0.5 accent-indigo-600" />
                            <label htmlFor={`perm_${p.value}`} className="cursor-pointer">
                              <p className="text-sm font-medium text-indigo-900">{p.label}</p>
                              <p className="text-xs text-indigo-700 mt-0.5">{p.desc}</p>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Observações */}
                <div className="border-t pt-5">
                  <Label>Observações Gerais</Label>
                  <Textarea className="mt-1" placeholder="Observações sobre o colaborador..." value={formData.observacoes || ""} onChange={e => set('observacoes', e.target.value)} rows={3} />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>

        <div className="border-t p-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isPending}>
            {isPending ? "Salvando..." : (colaborador ? "Salvar Alterações" : "Criar Colaborador")}
          </Button>
        </div>
      </form>
    </Card>
  );
}