import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Headset, CheckCircle, Loader2, Laptop, AlertCircle, Search, Upload, X, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ChamadoPublico() {
  // Configura o título da página
  React.useEffect(() => {
    document.title = "Abrir Chamado de Suporte - TechControl";
  }, []);
  const [formData, setFormData] = useState({
    tipo_solicitacao: "",
    sistema_tipo: "",
    sistema_subtipo: "",
    impressora_subtipo: "",
    equipamento_subtipo: "",
    equipamento_selecionado: "",
    equipamento_outros_detalhes: "",
    melhorias_detalhes: "",
    desenvolvimento_detalhes: "",
    servidor_subtipo: "",
    solicitante_nome: "",
    solicitante_email: "",
    solicitante_area: "",
    solicitante_telefone: "",
    equipamento_atual: "",
    descricao_problema: "",
    urgencia: "Média",
  });
  const [success, setSuccess] = useState(false);
  const [numeroChamado, setNumeroChamado] = useState("");
  const [countdown, setCountdown] = useState(15);
  const [equipamentosUsuario, setEquipamentosUsuario] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setSuccess(false);
      setNumeroChamado("");
      setCountdown(15);
      setFormData({
        tipo_solicitacao: "",
        sistema_tipo: "",
        sistema_subtipo: "",
        impressora_subtipo: "",
        equipamento_subtipo: "",
        equipamento_selecionado: "",
        equipamento_outros_detalhes: "",
        melhorias_detalhes: "",
        desenvolvimento_detalhes: "",
        servidor_subtipo: "",
        solicitante_nome: "",
        solicitante_email: "",
        solicitante_area: "",
        solicitante_telefone: "",
        equipamento_atual: "",
        descricao_problema: "",
        urgencia: "Média",
      });
      setEquipamentosUsuario([]);
    }
  }, [success, countdown]);

  const queryOptions = { retry: false, throwOnError: false };

  const { data: colaboradores = [] } = useQuery({
    ...queryOptions,
    queryKey: ['colaboradores_chamado'],
    queryFn: async () => {
      try { return await base44.entities.Colaboradores.list(); } catch { return []; }
    },
  });

  // Buscar todos os equipamentos
  const { data: pcsInternos = [] } = useQuery({
    ...queryOptions,
    queryKey: ['pcs_internos_publico'],
    queryFn: async () => {
      try { return await base44.entities.PCs_Internos.list(); } catch { return []; }
    },
  });

  const { data: notebooksExternos = [] } = useQuery({
    ...queryOptions,
    queryKey: ['notebooks_externos_publico'],
    queryFn: async () => {
      try { return await base44.entities.Notebooks_Externos.list(); } catch { return []; }
    },
  });

  const { data: smartphones = [] } = useQuery({
    ...queryOptions,
    queryKey: ['smartphones_publico'],
    queryFn: async () => {
      try { return await base44.entities.Smartphones.list(); } catch { return []; }
    },
  });

  const { data: cameras = [] } = useQuery({
    ...queryOptions,
    queryKey: ['cameras_publico'],
    queryFn: async () => {
      try { return await base44.entities.Cameras.list(); } catch { return []; }
    },
  });

  const { data: coletores = [] } = useQuery({
    ...queryOptions,
    queryKey: ['coletores_publico'],
    queryFn: async () => {
      try { return await base44.entities.Coletores.list(); } catch { return []; }
    },
  });

  const { data: canetasVibracao = [] } = useQuery({
    ...queryOptions,
    queryKey: ['canetas_vibracao_publico'],
    queryFn: async () => {
      try { return await base44.entities.Canetas_Vibracao.list(); } catch { return []; }
    },
  });

  const buscarEquipamentosUsuario = (nomeUsuario) => {
    const normalizeString = (str) => {
      if (!str) return '';
      return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    };
    const equipamentos = [];

    const addEquipamento = (eq, tipo, entityId) => {
      if (eq.usuario_atual && normalizeString(eq.usuario_atual) === normalizeString(nomeUsuario)) {
        equipamentos.push({
          id: entityId,
          tipo: tipo,
          marca: eq.marca || "",
          modelo: eq.modelo || "",
          etiqueta: eq.etiqueta_interna || eq.numero_sequencial || "",
          displayName: `${tipo} - ${eq.marca} ${eq.modelo}${eq.etiqueta_interna ? ` (${eq.etiqueta_interna})` : ''}`
        });
      }
    };

    pcsInternos.forEach(eq => addEquipamento(eq, eq.tipo || "PC", eq.id));
    notebooksExternos.forEach(eq => addEquipamento(eq, "Notebook Externo", eq.id));
    smartphones.forEach(eq => addEquipamento(eq, "Smartphone", eq.id));
    cameras.forEach(eq => addEquipamento(eq, "Câmera", eq.id));
    coletores.forEach(eq => addEquipamento(eq, "Coletor", eq.id));
    canetasVibracao.forEach(eq => addEquipamento(eq, "Caneta Vibração", eq.id));

    return equipamentos;
  };

  const handleSelectUsuario = (nome) => {
    const colab = colaboradores.find(c => c.nome_completo === nome);
    setFormData({ 
      ...formData, 
      solicitante_nome: nome, 
      solicitante_email: colab?.email || "",
      solicitante_area: colab?.area || "",
      solicitante_telefone: colab?.telefone || "",
      equipamento_selecionado: "" 
    });
    
    const equipamentos = buscarEquipamentosUsuario(nome);
    setEquipamentosUsuario(equipamentos);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const uploadedFiles = [];

    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedFiles.push({
          file_url,
          file_name: file.name,
          file_type: file.type.startsWith('image/') ? 'image' : 'video'
        });
      }
      setAnexos([...anexos, ...uploadedFiles]);
    } catch (error) {
      alert("Erro ao fazer upload dos arquivos");
    } finally {
      setUploading(false);
    }
  };

  const removeAnexo = (index) => {
    setAnexos(anexos.filter((_, i) => i !== index));
  };

  const createChamadoMutation = useMutation({
    mutationFn: async (data) => {
      const numeroChamado = `CH${Date.now().toString().slice(-8)}`;
      
      const emailHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#eef2f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7;padding:32px 16px;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;"><tr><td align="center" style="padding-bottom:20px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#1e40af;border-radius:12px;padding:10px 22px;"><span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px;">⚙ TechControl</span></td></tr></table></td></tr><tr><td style="background:#ea580c;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;"><p style="margin:0;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">📋&nbsp;&nbsp;Chamado Aberto</p></td></tr><tr><td style="background:#ffffff;border-radius:0 0 10px 10px;padding:36px 40px;box-shadow:0 4px 24px rgba(0,0,0,0.07);"><p style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Olá, ${data.solicitante_nome}!</p><p style="margin:0 0 28px 0;font-size:15px;color:#6b7280;line-height:1.6;">Seu chamado foi registrado com sucesso. Nossa equipe irá analisar e entrar em contato em breve.</p><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;"><tr><td style="padding:20px 24px 12px 24px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;">Número do Chamado</p><p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:'Courier New',Courier,monospace;letter-spacing:1px;">${numeroChamado}</p></td></tr><tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Tipo:</strong> ${data.tipo_solicitacao}<br><strong>Urgência:</strong> ${data.urgencia}</td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding-bottom:20px;"><a href="https://techcontrol.site/chamado-publico" style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(30,64,175,0.3);">🔍 Acompanhar Chamado</a></td></tr></table></td></tr><tr><td align="center" style="padding:24px 0 8px 0;"><p style="margin:0;font-size:12px;color:#9ca3af;">Este e-mail foi gerado automaticamente pelo sistema <strong style="color:#6b7280;">TechControl</strong>. Por favor, não responda.</p><p style="margin:6px 0 0 0;font-size:11px;color:#d1d5db;">© 2026 TechControl · Todos os direitos reservados</p></td></tr></table></td></tr></table></body></html>`;

      const [chamado] = await Promise.all([
        base44.entities.Chamados.create({
          ...data,
          numero_chamado: numeroChamado,
          status: "Aberto",
          data_abertura: new Date().toISOString().split('T')[0],
          equipamentos_usuario: equipamentosUsuario,
          anexos: anexos,
        }),
        data.solicitante_email
          ? base44.functions.invoke('sendEmail', {
              to: data.solicitante_email,
              subject: `[TechControl] Chamado ${numeroChamado} aberto com sucesso`,
              html: emailHtml
            })
          : Promise.resolve()
      ]);

      return { chamado, numeroChamado };
    },
    onSuccess: (data) => {
      setNumeroChamado(data.numeroChamado);
      setSuccess(true);
      setCountdown(15);
      setAnexos([]);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createChamadoMutation.mutate(formData);
  };

  const handleTipoChange = (value) => {
    setFormData({
      ...formData,
      tipo_solicitacao: value,
      sistema_tipo: "",
      sistema_subtipo: "",
      impressora_subtipo: "",
      equipamento_subtipo: "",
      equipamento_selecionado: "",
      equipamento_outros_detalhes: "",
      melhorias_detalhes: "",
      desenvolvimento_detalhes: "",
      servidor_subtipo: "",
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="pt-12 pb-12">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Chamado Aberto!</h2>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
              <p className="text-sm text-yellow-800 mb-3 text-center font-semibold">
                ⚠️ IMPORTANTE: Guarde este número!
              </p>
              <div className="bg-white rounded-lg p-4 border-2 border-yellow-400">
                <p className="text-xs text-gray-600 mb-1 text-center">Número do Chamado:</p>
                <p className="text-3xl font-bold text-gray-900 text-center font-mono tracking-wider">
                  {numeroChamado}
                </p>
              </div>
              <p className="text-xs text-yellow-700 mt-3 text-center">
                Use este número para acompanhar seu chamado
              </p>
            </div>

            <Alert className="bg-blue-50 border-blue-200 mb-4">
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Como acompanhar:</strong><br/>
                Clique no botão abaixo para acessar a página de acompanhamento e cole o número do seu chamado.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3">
              <Link to={createPageUrl("acompanhar-chamado")}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Search className="w-4 h-4 mr-2" />
                  Acompanhar Chamado
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSuccess(false);
                  setCountdown(15);
                }}
              >
                Abrir Novo Chamado
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Esta tela fechará automaticamente em <strong className="text-orange-600">{countdown}s</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Headset className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Abrir Chamado de Suporte
          </h1>
          <p className="text-gray-600 mb-4">
            Descreva seu problema ou solicitação e nossa equipe irá atendê-lo
          </p>
          <Link to={createPageUrl("acompanhar-chamado")}>
            <Button variant="outline" className="gap-2">
              <Search className="w-4 h-4" />
              Acompanhar Chamado Existente
            </Button>
          </Link>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="border-b bg-white">
            <CardTitle>Formulário de Chamado</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-5">
              <div>
                <Label>Tipo de Solicitação *</Label>
                <Select required value={formData.tipo_solicitacao} onValueChange={handleTipoChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo de solicitação" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sistema">Sistema</SelectItem>
                    <SelectItem value="Impressora">Impressora</SelectItem>
                    <SelectItem value="Equipamento">Equipamento</SelectItem>
                    <SelectItem value="Melhorias">Melhorias</SelectItem>
                    <SelectItem value="Desenvolvimento">Desenvolvimento</SelectItem>
                    <SelectItem value="Servidor">Servidor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo_solicitacao === "Sistema" && (
                <>
                  <div>
                    <Label>Qual Sistema? *</Label>
                    <Select required value={formData.sistema_tipo} onValueChange={(value) => setFormData({ ...formData, sistema_tipo: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o sistema" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WMS">WMS</SelectItem>
                        <SelectItem value="Portal de Vendas">Portal de Vendas</SelectItem>
                        <SelectItem value="SAP">SAP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.sistema_tipo && (
                    <div>
                      <Label>Tipo de Problema *</Label>
                      <Select required value={formData.sistema_subtipo} onValueChange={(value) => setFormData({ ...formData, sistema_subtipo: value })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Problema no Sistema">Problema no Sistema</SelectItem>
                          <SelectItem value="Nova Implementação no Sistema">Nova Implementação no Sistema</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {formData.tipo_solicitacao === "Impressora" && (
                <div>
                  <Label>Problema com Impressora *</Label>
                  <Select required value={formData.impressora_subtipo} onValueChange={(value) => setFormData({ ...formData, impressora_subtipo: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o problema" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Troca de Cartucho ou Toner">Troca de Cartucho ou Toner</SelectItem>
                      <SelectItem value="Problema na Impressora">Problema na Impressora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.tipo_solicitacao === "Equipamento" && (
                <>
                  <div>
                    <Label>Problema com Equipamento *</Label>
                    <Select required value={formData.equipamento_subtipo} onValueChange={(value) => setFormData({ ...formData, equipamento_subtipo: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o problema" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lentidão no Computador">Lentidão no Computador</SelectItem>
                        <SelectItem value="Problema no Monitor, Mouse ou Teclado">Problema no Monitor, Mouse ou Teclado</SelectItem>
                        <SelectItem value="Problema na Máquina">Problema na Máquina</SelectItem>
                        <SelectItem value="Formatação">Formatação</SelectItem>
                        <SelectItem value="Solicitar Troca de Equipamento">Solicitar Troca de Equipamento</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.equipamento_subtipo === "Outros" && (
                    <div>
                      <Label>Descreva o Problema *</Label>
                      <Textarea required placeholder="Descreva detalhadamente o problema..." value={formData.equipamento_outros_detalhes} onChange={(e) => setFormData({ ...formData, equipamento_outros_detalhes: e.target.value })} rows={3} />
                    </div>
                  )}
                </>
              )}

              {formData.tipo_solicitacao === "Melhorias" && (
                <div>
                  <Label>Descreva a Melhoria Desejada *</Label>
                  <Textarea required placeholder="Descreva detalhadamente a melhoria que você gostaria de ver implementada..." value={formData.melhorias_detalhes} onChange={(e) => setFormData({ ...formData, melhorias_detalhes: e.target.value })} rows={4} />
                </div>
              )}

              {formData.tipo_solicitacao === "Desenvolvimento" && (
                <div>
                  <Label>Descreva o Desenvolvimento Necessário *</Label>
                  <Textarea required placeholder="Descreva detalhadamente o desenvolvimento ou funcionalidade que você precisa..." value={formData.desenvolvimento_detalhes} onChange={(e) => setFormData({ ...formData, desenvolvimento_detalhes: e.target.value })} rows={4} />
                </div>
              )}

              {formData.tipo_solicitacao === "Servidor" && (
                <div>
                  <Label>Problema com Servidor *</Label>
                  <Select required value={formData.servidor_subtipo} onValueChange={(value) => setFormData({ ...formData, servidor_subtipo: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o problema" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rede">Rede</SelectItem>
                      <SelectItem value="Internet">Internet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="border-t pt-5 mt-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Seus Dados</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Nome Completo *</Label>
                    <Combobox
                      value={formData.solicitante_nome}
                      onValueChange={handleSelectUsuario}
                      options={colaboradores
                        .filter(c => c.status === "Ativo")
                        .map(c => ({
                          value: c.nome_completo,
                          label: `${c.nome_completo} - ${c.area}`
                        }))}
                      placeholder="Selecione seu nome"
                      searchPlaceholder="Buscar colaborador..."
                      emptyText="Nenhum colaborador encontrado"
                    />
                    <p className="text-xs text-gray-500 mt-1">Seus dados de contato serão preenchidos automaticamente</p>
                  </div>
                  {formData.solicitante_nome && (
                    <div>
                      <Label>E-mail para notificações *</Label>
                      <Input
                        type="email"
                        required
                        placeholder="seu@email.com"
                        value={formData.solicitante_email}
                        onChange={(e) => setFormData({ ...formData, solicitante_email: e.target.value })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Você receberá atualizações do chamado neste e-mail</p>
                    </div>
                  )}
                </div>
              </div>

              {equipamentosUsuario.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Laptop className="w-4 h-4" />
                    Seus Equipamentos Cadastrados
                  </h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {equipamentosUsuario.map((eq, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-blue-100">
                        <Badge variant="outline" className="text-xs mb-1">{eq.tipo}</Badge>
                        <p className="text-sm font-medium text-gray-900">{eq.marca} {eq.modelo}</p>
                        {eq.etiqueta && <p className="text-xs text-gray-500 mt-1">Etiqueta: {eq.etiqueta}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.tipo_solicitacao === "Equipamento" && equipamentosUsuario.length > 0 && (
                <div>
                  <Label>Selecione o Equipamento com Problema *</Label>
                  <Select required value={formData.equipamento_selecionado} onValueChange={(value) => setFormData({ ...formData, equipamento_selecionado: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione qual equipamento está com problema" /></SelectTrigger>
                    <SelectContent>
                      {equipamentosUsuario.map((eq) => (
                        <SelectItem key={eq.id} value={eq.displayName}>{eq.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!formData.equipamento_selecionado && formData.equipamento_subtipo && (
                    <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">Por favor, selecione qual equipamento está com problema</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {formData.tipo_solicitacao === "Equipamento" && equipamentosUsuario.length === 0 && formData.solicitante_nome && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Nenhum equipamento cadastrado</strong> em seu nome. Você pode descrever o equipamento no campo "Equipamento Atual" abaixo.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label>Equipamento Atual (opcional)</Label>
                <Input placeholder="Ex: Notebook Dell Latitude, Desktop HP" value={formData.equipamento_atual} onChange={(e) => setFormData({ ...formData, equipamento_atual: e.target.value })} />
                <p className="text-xs text-gray-500 mt-1">Se o equipamento não estiver na lista acima, descreva aqui</p>
              </div>

              <div>
                <Label>Urgência *</Label>
                <Select required value={formData.urgencia} onValueChange={(value) => setFormData({ ...formData, urgencia: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Descrição Adicional do Problema *</Label>
                <Textarea required placeholder="Descreva detalhadamente seu problema ou solicitação..." value={formData.descricao_problema} onChange={(e) => setFormData({ ...formData, descricao_problema: e.target.value })} rows={5} />
              </div>

              <div>
                <Label>Anexar Fotos, Imagens ou Vídeos (opcional)</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={uploading}
                    onClick={() => document.getElementById('file-upload').click()}
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fazendo upload...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" />Adicionar Arquivos</>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">Imagens e vídeos que ajudem a entender o problema</p>
                </div>

                {anexos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {anexos.map((anexo, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700 truncate max-w-xs">{anexo.file_name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAnexo(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Importante:</strong> Após enviar, guarde o número do chamado que aparecerá na tela. Use-o para acompanhar o status.
                </p>
              </div>
            </CardContent>

            <div className="border-t p-6 bg-gray-50 flex justify-end">
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={createChamadoMutation.isLoading}>
                {createChamadoMutation.isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
                ) : (
                  "Abrir Chamado"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}