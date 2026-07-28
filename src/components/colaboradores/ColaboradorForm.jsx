/**
 * ColaboradorForm.jsx — Reorganizado por Assunto (6 Seções Coerentes)
 * 1. Profissional (Dados de cargo, contrato e contato)
 * 2. Pessoal & Gestão (Foto, nascimento, formação e gestor direto)
 * 3. Família & Dependentes (Cônjuge e lista compacta de filhos)
 * 4. Requisições de Compra (Aprovador exclusivo)
 * 5. Comunicados Internos (Toggle de envios automáticos + Permissões do portal)
 * 6. Acesso, Segurança & Observações (Senhas do portal, TI, sistemas e anotações)
 */
import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  X, Plus, Trash2, Eye, EyeOff, Upload, User, AlertCircle,
  Briefcase, UserCheck, Heart, ShoppingCart, Megaphone, Lock, Check, Copy, ArrowRight, ArrowLeft
} from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("profissional");
  const [showSenhas, setShowSenhas] = useState({});
  const [copiedIndex, setCopiedIndex] = useState(null);
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

    // Validação de senha duplicada para e-mail compartilhado
    if (formData.senha_portal && formData.senha_portal !== "demo123" && formData.email) {
      const emailLower = formData.email.trim().toLowerCase();
      
      // Filtra outros colaboradores ATIVOS com o mesmo email
      const outrosComMesmoEmail = todosColaboradores.filter(c => 
        c.email && c.email.trim().toLowerCase() === emailLower && 
        c.id !== colaborador?.id
      );

      // Se houver mais de um colaborador com esse e-mail (ou seja, é um email compartilhado)
      if (outrosComMesmoEmail.length > 0) {
        const senhaJaExiste = outrosComMesmoEmail.some(c => c.senha_portal === formData.senha_portal);
        if (senhaJaExiste) {
          e.senha_portal = "Essa senha não pode ser usada. Escolha outra senha.";
        }
      }
    }

    return e;
  };

  const { data: colaboradoresExistentes = [] } = useQuery({
    queryKey: ['colaboradores'],
    enabled: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      if (v.nome_completo || v.area) {
        setActiveTab("profissional");
        setErrors(prev => ({
          ...prev,
          _form: 'Preencha os campos obrigatórios na aba "Profissional": Nome e Área.',
        }));
      } else if (v.senha_portal) {
        setActiveTab("acesso");
        setErrors(prev => ({
          ...prev,
          _form: v.senha_portal,
        }));
      }
      return;
    }

    const cleanedData = {};
    for (const key in formData) {
      let val = formData[key];
      if (typeof val === 'string' && val.trim() === '') {
        const isUuidField = key.endsWith('_id') || key === 'colaborador_id';
        const isDateField = key.startsWith('data_') || 
                            key.endsWith('_desde') || 
                            key.endsWith('_ate') || 
                            key.endsWith('_nascimento') || 
                            key.endsWith('_admissao') || 
                            key.endsWith('_desligamento') || 
                            key === 'data';
        
        if (isUuidField || isDateField) {
          val = null;
        }
      }
      cleanedData[key] = val;
    }

    if (!cleanedData.responsavel_id) {
      cleanedData.responsavel_id = null;
    }

    if (colaborador) {
      updateMutation.mutate({ id: colaborador.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
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
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('foto_url', file_url);
    } catch (err) {
      alert("Erro ao fazer upload da foto: " + err.message);
    } finally {
      setUploadingFoto(false);
    }
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

  const copyToClipboard = (text, idx) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isComunicadosRole = ['comunicados_arte', 'comunicados_gestao', 'comunicados_dp'].includes(currentUserRole);

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

  // Contagem de preenchimento por aba (badges de progresso)
  const tabCounts = useMemo(() => {
    const prof = [formData.nome_completo, formData.email, formData.area, formData.cargo, formData.telefone, formData.tipo_funcionario, formData.data_admissao].filter(Boolean).length;
    const pess = [formData.foto_url, formData.data_nascimento, formData.graduacao, formData.resumo_experiencia, formData.contato_responsavel_nome].filter(Boolean).length;
    const fam = [formData.conjuge_nome, (formData.filhos || []).length > 0].filter(Boolean).length;
    const comp = formData.responsavel_id ? 1 : 0;
    const coms = (formData.permissoes_comunicados || []).length + (formData.incluir_comunicados ? 1 : 0);
    const sec = [formData.senha_portal, formData.senha_microsoft, formData.senha_login_maquina, (formData.senhas_sistemas || []).length > 0].filter(Boolean).length;

    return { prof, pess, fam, comp, coms, sec };
  }, [formData]);

  const ErrMsg = ({ field }) => errors[field] ? <p className="text-xs text-red-500 mt-1">{errors[field]}</p> : null;

  return (
    <Card className="mb-6 shadow-md border-gray-200">
      <CardHeader className="border-b bg-gray-50/50 py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">
              {colaborador ? `Editar Colaborador: ${colaborador.nome_completo}` : "Novo Colaborador"}
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Organizado em 6 seções para cadastro e governança eficiente.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full"><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="pt-4 space-y-4">
          {errors._form && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors._form}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full mb-6 h-auto p-1 bg-gray-100 gap-1 rounded-xl">
              <TabsTrigger value="profissional" className="text-xs py-2 flex items-center gap-1.5 justify-center">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Profissional</span>
                {tabCounts.prof > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-indigo-100 text-indigo-700">{tabCounts.prof}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="pessoal" className="text-xs py-2 flex items-center gap-1.5 justify-center">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Pessoal</span>
                {tabCounts.pess > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-indigo-100 text-indigo-700">{tabCounts.pess}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="familia" className="text-xs py-2 flex items-center gap-1.5 justify-center">
                <Heart className="w-3.5 h-3.5" />
                <span>Família</span>
                {tabCounts.fam > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-indigo-100 text-indigo-700">{tabCounts.fam}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="compras" className="text-xs py-2 flex items-center gap-1.5 justify-center">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Compras</span>
                {tabCounts.comp > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700">✓</Badge>}
              </TabsTrigger>
              <TabsTrigger value="comunicados" className="text-xs py-2 flex items-center gap-1.5 justify-center">
                <Megaphone className="w-3.5 h-3.5" />
                <span>Comunicados</span>
                {tabCounts.coms > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700">{tabCounts.coms}</Badge>}
              </TabsTrigger>
              {!isComunicadosRole && (
                <TabsTrigger value="acesso" className="text-xs py-2 flex items-center gap-1.5 justify-center">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Segurança</span>
                  {tabCounts.sec > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700">{tabCounts.sec}</Badge>}
                </TabsTrigger>
              )}
            </TabsList>

            {/* ── 1. PROFISSIONAL ── */}
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
                  <Label>E-mail Corporativo</Label>
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
                  <Label>Local / Unidade de Trabalho</Label>
                  <Input className="mt-1" placeholder="Ex: Matriz SP, Filial RJ" value={formData.local_trabalho || ""} onChange={e => set('local_trabalho', e.target.value)} />
                </div>
                <div>
                  <Label>Data de Admissão</Label>
                  <Input className="mt-1" type="date" value={formData.data_admissao || ""} onChange={e => set('data_admissao', e.target.value)} />
                </div>
                <div>
                  <Label>Status no Sistema</Label>
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

                <div className="md:col-span-2 border-t pt-4 mt-2 flex flex-col md:flex-row gap-6 bg-slate-50 p-3 rounded-xl border">
                  <div className="flex items-center gap-2.5">
                    <Switch
                      id="necessita_ramal"
                      checked={formData.necessita_ramal !== false}
                      onCheckedChange={v => set('necessita_ramal', v)}
                    />
                    <label htmlFor="necessita_ramal" className="text-xs font-semibold cursor-pointer text-slate-800">
                      Requer Ramal de Telefone (Pessoal ou do Setor)
                    </label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Switch
                      id="necessita_equipamento"
                      checked={formData.necessita_equipamento !== false}
                      onCheckedChange={v => set('necessita_equipamento', v)}
                    />
                    <label htmlFor="necessita_equipamento" className="text-xs font-semibold cursor-pointer text-slate-800">
                      Requer Equipamento de Trabalho (PC/Notebook)
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── 2. PESSOAL & GESTÃO ── */}
            <TabsContent value="pessoal" className="space-y-5">
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
                    className="mt-1 text-xs"
                    placeholder="Descreva brevemente a experiência profissional..."
                    rows={3}
                    maxLength={500}
                    value={formData.resumo_experiencia || ""}
                    onChange={e => set('resumo_experiencia', e.target.value)}
                  />
                  <p className="text-[11px] text-gray-400 mt-1 text-right">{(formData.resumo_experiencia || "").length}/500</p>
                </div>
                <div>
                  <Label>Nome do Gestor Direto</Label>
                  <Input className="mt-1" placeholder="Nome do gestor direto" value={formData.contato_responsavel_nome || ""} onChange={e => set('contato_responsavel_nome', e.target.value)} />
                </div>
                <div>
                  <Label>E-mail do Gestor Direto</Label>
                  <Input className="mt-1" type="email" placeholder="gestor@empresa.com" value={formData.contato_responsavel_email || ""} onChange={e => set('contato_responsavel_email', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* ── 3. FAMÍLIA & DEPENDENTES ── */}
            <TabsContent value="familia" className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Cônjuge</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50/50 p-4 border rounded-xl">
                  <div>
                    <Label className="text-xs">Nome do Cônjuge</Label>
                    <Input className="mt-1 text-xs" placeholder="Nome completo" value={formData.conjuge_nome || ""} onChange={e => set('conjuge_nome', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">E-mail do Cônjuge</Label>
                    <Input className="mt-1 text-xs" type="email" placeholder="conjuge@email.com" value={formData.conjuge_email || ""} onChange={e => set('conjuge_email', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Data de Nascimento do Cônjuge</Label>
                    <Input className="mt-1 text-xs" type="date" max={hoje} value={formData.conjuge_data_nascimento || ""} onChange={e => set('conjuge_data_nascimento', e.target.value)} />
                    <ErrMsg field="conjuge_data_nascimento" />
                  </div>
                </div>
              </div>

              {/* Tabela Limpa de Filhos */}
              <div className="border-t pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Filhos / Dependentes</h4>
                  <Button type="button" size="sm" variant="outline" className="text-xs h-8" onClick={addFilho}>
                    <Plus className="w-3.5 h-3.5 mr-1" />Adicionar Filho
                  </Button>
                </div>

                {(formData.filhos || []).length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center border border-dashed rounded-lg">Nenhum filho cadastrado.</p>
                ) : (
                  <div className="border rounded-xl overflow-hidden divide-y bg-white">
                    {(formData.filhos || []).map((filho, i) => (
                      <div key={i} className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            className="h-8 text-xs"
                            placeholder="Nome do filho(a)"
                            value={filho.filho_nome || ""}
                            onChange={e => updateFilho(i, 'filho_nome', e.target.value)}
                          />
                          <Input
                            className="h-8 text-xs"
                            type="date"
                            max={hoje}
                            value={filho.filho_data_nascimento || ""}
                            onChange={e => updateFilho(i, 'filho_data_nascimento', e.target.value)}
                          />
                        </div>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => removeFilho(i)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── 4. REQUISIÇÕES DE COMPRA ── */}
            <TabsContent value="compras" className="space-y-4">
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-sm font-bold">Aprovador de Requisições de Compra</h4>
                </div>
                <p className="text-xs text-emerald-700">
                  Selecione o colaborador responsável por aprovar as solicitações de compra abertas por este funcionário.
                </p>

                <Select value={formData.responsavel_id || '__none__'} onValueChange={handleAprovadorChange}>
                  <SelectTrigger className="bg-white text-xs border-emerald-300">
                    <SelectValue placeholder="Selecione o aprovador responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs">— Nenhum aprovador definido —</SelectItem>
                    {todosColaboradores
                      .filter(c => c.id !== colaborador?.id)
                      .map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.nome_completo} {c.cargo ? `— ${c.cargo}` : ''} {c.area ? `(${c.area})` : ''}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>

                {formData.responsavel_nome ? (
                  <div className="bg-white border border-emerald-200 rounded-lg p-3 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-emerald-950">{formData.responsavel_nome}</p>
                      <p className="text-emerald-700 text-[11px]">{formData.responsavel_email || "Sem e-mail cadastrado"}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">Aprovador Ativo</Badge>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">Nenhum aprovador vinculado. As compras deste colaborador requererão aprovação de admin.</p>
                )}
              </div>
            </TabsContent>

            {/* ── 5. COMUNICADOS INTERNOS ── */}
            <TabsContent value="comunicados" className="space-y-6">
              {/* Toggle Envios */}
              <div className="flex items-start gap-4 bg-purple-50/60 border border-purple-200 rounded-xl p-4">
                <Switch
                  id="incluir_comunicados"
                  checked={formData.incluir_comunicados !== false}
                  onCheckedChange={v => set('incluir_comunicados', v)}
                  className="mt-1"
                />
                <label htmlFor="incluir_comunicados" className="text-xs cursor-pointer space-y-0.5">
                  <span className="font-bold text-purple-950 text-sm block">Incluir nos Comunicados Automáticos</span>
                  <p className="text-purple-800">
                    Quando ativo, o colaborador participa das automações de aniversário, tempo de empresa, 1 aninho e despedida.
                  </p>
                </label>
              </div>

              {/* Permissões no Portal */}
              {currentUserRole === 'admin' && (
                <div className="border-t pt-5">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Permissões de Comunicados no Portal</h4>
                  <p className="text-xs text-gray-500 mb-3">Define quais funcionalidades de comunicados este colaborador pode gerenciar no portal.</p>

                  <div className="space-y-2.5">
                    {PERMISSOES_COMUNICADOS.map(p => {
                      const checked = (formData.permissoes_comunicados || []).includes(p.value);
                      const toggle = () => {
                        const atual = formData.permissoes_comunicados || [];
                        set('permissoes_comunicados', checked ? atual.filter(v => v !== p.value) : [...atual, p.value]);
                      };
                      return (
                        <div key={p.value} className="flex items-start gap-3 bg-white border border-gray-200 hover:border-indigo-200 rounded-lg p-3 transition-colors">
                          <input type="checkbox" id={`perm_${p.value}`} checked={checked} onChange={toggle} className="w-4 h-4 mt-0.5 accent-indigo-600 cursor-pointer" />
                          <label htmlFor={`perm_${p.value}`} className="cursor-pointer">
                            <p className="text-xs font-bold text-gray-900">{p.label}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{p.desc}</p>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── 6. ACESSO, SEGURANÇA & OBSERVAÇÕES ── */}
            {!isComunicadosRole && (
              <TabsContent value="acesso" className="space-y-6">
                {/* Acesso Portal */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Acesso ao Portal do Colaborador</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 border rounded-xl">
                    <div>
                      <Label className="text-xs">Senha do Portal</Label>
                      <div className="relative mt-1">
                        <Input
                          type={showSenhas.portal ? "text" : "password"}
                          placeholder="Definir senha de acesso"
                          value={formData.senha_portal || ""}
                          onChange={e => set('senha_portal', e.target.value)}
                          className={`pr-10 text-xs ${errors.senha_portal ? "border-red-500" : ""}`}
                        />
                        <button type="button" onClick={() => toggleShowSenha('portal')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showSenhas.portal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.senha_portal && (
                        <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.senha_portal}</p>
                      )}
                    </div>
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="bloquear_portal" checked={formData.acesso_portal_bloqueado || false} onChange={e => set('acesso_portal_bloqueado', e.target.checked)} className="w-4 h-4" />
                        <label htmlFor="bloquear_portal" className="text-xs text-gray-700 cursor-pointer">Bloquear acesso ao portal</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="precisa_trocar" checked={formData.senha_precisa_trocar || false} onChange={e => set('senha_precisa_trocar', e.target.checked)} className="w-4 h-4" />
                        <label htmlFor="precisa_trocar" className="text-xs text-gray-700 cursor-pointer">Forçar troca de senha no próximo acesso</label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Credenciais Corporativas TI */}
                <div className="border-t pt-5">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Credenciais Corporativas de TI</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Senha Microsoft / Office 365</Label>
                      <div className="relative mt-1">
                        <Input type={showSenhas.microsoft ? "text" : "password"} placeholder="••••••••" value={formData.senha_microsoft || ""} onChange={e => set('senha_microsoft', e.target.value)} className="pr-10 text-xs" />
                        <button type="button" onClick={() => toggleShowSenha('microsoft')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showSenhas.microsoft ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Senha Login Máquina</Label>
                      <div className="relative mt-1">
                        <Input type={showSenhas.maquina ? "text" : "password"} placeholder="••••••••" value={formData.senha_login_maquina || ""} onChange={e => set('senha_login_maquina', e.target.value)} className="pr-10 text-xs" />
                        <button type="button" onClick={() => toggleShowSenha('maquina')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showSenhas.maquina ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabela de Senhas de Sistemas */}
                <div className="border-t pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Senhas de Sistemas (SAP, WMS, CRM)</h4>
                      <p className="text-[11px] text-gray-400">Lista de credenciais de acesso em outros sistemas corporativos.</p>
                    </div>
                    <Button type="button" onClick={addSistemaSenha} size="sm" variant="outline" className="text-xs h-8">
                      <Plus className="w-3.5 h-3.5 mr-1" />Adicionar Sistema
                    </Button>
                  </div>

                  {(formData.senhas_sistemas || []).length === 0 ? (
                    <p className="text-xs text-gray-400 py-3 text-center border border-dashed rounded-lg">Nenhum sistema registrado.</p>
                  ) : (
                    <div className="border rounded-xl overflow-hidden divide-y bg-white">
                      {(formData.senhas_sistemas || []).map((sis, index) => (
                        <div key={index} className="p-3 space-y-2 bg-white hover:bg-gray-50/50">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <Input className="h-8 text-xs" placeholder="Sistema (ex: SAP)" value={sis.sistema || ""} onChange={e => updateSistemaSenha(index, 'sistema', e.target.value)} />
                            <Input className="h-8 text-xs" placeholder="Usuário" value={sis.usuario || ""} onChange={e => updateSistemaSenha(index, 'usuario', e.target.value)} />
                            <div className="relative">
                              <Input
                                type={showSenhas[`s${index}`] ? "text" : "password"}
                                className="h-8 text-xs pr-16"
                                placeholder="Senha"
                                value={sis.senha || ""}
                                onChange={e => updateSistemaSenha(index, 'senha', e.target.value)}
                              />
                              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button type="button" onClick={() => toggleShowSenha(`s${index}`)} className="p-1 text-gray-400 hover:text-gray-600">
                                  {showSenhas[`s${index}`] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button type="button" onClick={() => copyToClipboard(sis.senha, index)} className="p-1 text-gray-400 hover:text-gray-600" title="Copiar">
                                  {copiedIndex === index ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input className="h-8 text-xs flex-1" placeholder="Obs" value={sis.observacoes || ""} onChange={e => updateSistemaSenha(index, 'observacoes', e.target.value)} />
                              <Button type="button" size="icon" variant="ghost" onClick={() => removeSistemaSenha(index)} className="h-8 w-8 text-red-500 shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Observações Gerais RH */}
                <div className="border-t pt-5">
                  <Label className="text-xs">Observações Gerais (RH / TI)</Label>
                  <Textarea
                    className="mt-1 text-xs"
                    placeholder="Anotações gerais sobre o colaborador..."
                    value={formData.observacoes || ""}
                    onChange={e => set('observacoes', e.target.value)}
                    rows={3}
                  />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>

        <div className="border-t p-4 bg-gray-50/50 flex items-center justify-between rounded-b-xl">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs">Cancelar</Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold px-6" disabled={isPending}>
            {isPending ? "Salvando..." : (colaborador ? "Salvar Alterações" : "Criar Colaborador")}
          </Button>
        </div>
      </form>
    </Card>
  );
}