import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Headset, Plus, Loader2, CheckCircle, Star, ChevronLeft, Upload, X, Image as ImageIcon, Laptop, Monitor } from "lucide-react";
import PortalLayout from "../components/portal/PortalLayout";
import { usePortalAuth } from "../components/portal/usePortalAuth";

const statusColors = {
  "Aberto": "bg-red-100 text-red-800",
  "Em Análise": "bg-yellow-100 text-yellow-800",
  "Em Andamento": "bg-blue-100 text-blue-800",
  "Aguardando Peça": "bg-orange-100 text-orange-800",
  "Aguardando Avaliação": "bg-purple-100 text-purple-800",
  "Resolvido": "bg-green-100 text-green-800",
  "Cancelado": "bg-gray-100 text-gray-800",
};

function AvaliacaoChamado({ chamado, onAvaliar, loading }) {
  const [show, setShow] = useState(false);
  const [avaliacao, setAvaliacao] = useState({ tempo_resolucao: 0, qualidade_atendimento: 0, qualidade_solucao: 0, comunicacao: 0, comentario: "" });

  const StarRow = ({ label, campo }) => (
    <div>
      <Label className="text-yellow-900 font-semibold text-sm">{label}</Label>
      <div className="flex gap-2 mt-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setAvaliacao(prev => ({ ...prev, [campo]: n }))} className="transition-all hover:scale-125">
            <Star className={`w-7 h-7 ${n <= avaliacao[campo] ? 'fill-yellow-500 text-yellow-500' : 'fill-none text-gray-300'}`} />
          </button>
        ))}
      </div>
    </div>
  );

  const handleEnviar = () => {
    if (!avaliacao.tempo_resolucao || !avaliacao.qualidade_atendimento || !avaliacao.qualidade_solucao || !avaliacao.comunicacao) {
      alert("Avalie todos os critérios antes de enviar.");
      return;
    }
    onAvaliar(avaliacao);
  };

  if (chamado.avaliacao_data) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
        <p className="text-green-800 font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4" />Avaliação enviada · Nota: {chamado.avaliacao_nota_geral?.toFixed(1)} ⭐</p>
        {chamado.avaliacao_comentario && <p className="text-sm text-green-700 mt-1">"{chamado.avaliacao_comentario}"</p>}
      </div>
    );
  }

  if (chamado.status !== "Aguardando Avaliação") return null;

  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mt-4">
      <p className="font-semibold text-yellow-900 mb-3 flex items-center gap-2"><Star className="w-4 h-4" />Avalie nosso atendimento</p>
      {!show ? (
        <Button onClick={() => setShow(true)} className="bg-yellow-600 hover:bg-yellow-700 w-full">Avaliar Atendimento</Button>
      ) : (
        <div className="space-y-4">
          <StarRow label="Tempo de Resolução" campo="tempo_resolucao" />
          <StarRow label="Qualidade do Atendimento" campo="qualidade_atendimento" />
          <StarRow label="Qualidade da Solução" campo="qualidade_solucao" />
          <StarRow label="Comunicação" campo="comunicacao" />
          <div>
            <Label className="text-yellow-900">Comentários (opcional)</Label>
            <Textarea placeholder="Sua experiência..." rows={2} value={avaliacao.comentario} onChange={e => setAvaliacao(prev => ({ ...prev, comentario: e.target.value }))} className="mt-1" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShow(false)}>Cancelar</Button>
            <Button className="bg-yellow-600 hover:bg-yellow-700 flex-1" onClick={handleEnviar} disabled={loading}>
              {loading ? "Enviando..." : "Enviar Avaliação"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortalChamados() {
  const { colaborador, loading, logout, requireAuth } = usePortalAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState("lista"); // "lista" | "novo"
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [formData, setFormData] = useState({
    tipo_solicitacao: "", sistema_tipo: "", sistema_subtipo: "", impressora_subtipo: "",
    equipamento_subtipo: "", equipamento_selecionado: "", equipamento_outros_detalhes: "",
    melhorias_detalhes: "", desenvolvimento_detalhes: "", servidor_subtipo: "",
    titulo_chamado: "", descricao_problema: "", urgencia: "Média",
  });
  const [anexos, setAnexos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [equipamentosUsuario, setEquipamentosUsuario] = useState([]);

  useEffect(() => {
    if (!loading) requireAuth();
  }, [loading]);

  const { data: chamados = [], isLoading } = useQuery({
    queryKey: ['portal_chamados_list'],
    queryFn: () => base44.entities.Chamados.list('-created_date'),
    enabled: !!colaborador,
  });

  // Buscar equipamentos SEMPRE (não só quando view === "novo")
  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['portal_pcs_cham'],
    queryFn: () => base44.entities.PCs_Internos.list(),
    enabled: !!colaborador,
  });
  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['portal_nbs_cham'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
    enabled: !!colaborador,
  });
  const { data: smartphones = [] } = useQuery({
    queryKey: ['portal_smartphones_cham'],
    queryFn: () => base44.entities.Smartphones.list(),
    enabled: !!colaborador,
  });
  const { data: cameras = [] } = useQuery({
    queryKey: ['portal_cameras_cham'],
    queryFn: () => base44.entities.Cameras.list(),
    enabled: !!colaborador,
  });
  const { data: coletores = [] } = useQuery({
    queryKey: ['portal_coletores_cham'],
    queryFn: () => base44.entities.Coletores.list(),
    enabled: !!colaborador,
  });
  const { data: canetas = [] } = useQuery({
    queryKey: ['portal_canetas_cham'],
    queryFn: () => base44.entities.Canetas_Vibracao.list(),
    enabled: !!colaborador,
  });

  // Atualiza equipamentos do usuário quando dados chegam
  useEffect(() => {
    if (!colaborador) return;
    const nomeNorm = colaborador.nome_completo?.toLowerCase().trim();
    const lista = [];
    const add = (arr, tipo) => arr.forEach(e => {
      if (e.usuario_atual?.toLowerCase().trim() === nomeNorm) {
        lista.push({ id: e.id, tipo: tipo || e.tipo || "Equipamento", marca: e.marca || "", modelo: e.modelo || "", etiqueta: e.etiqueta_interna || e.numero_sequencial || "", displayName: `${tipo || e.tipo || "Equipamento"} - ${e.marca || ""} ${e.modelo || ""}${e.etiqueta_interna ? ` (${e.etiqueta_interna})` : ""}` });
      }
    });
    add(pcsInternos, null);
    add(notebooksExternos, "Notebook Externo");
    add(smartphones, "Smartphone");
    add(cameras, "Câmera");
    add(coletores, "Coletor");
    add(canetas, "Caneta Vibração");
    setEquipamentosUsuario(lista);
  }, [colaborador, pcsInternos, notebooksExternos, smartphones, cameras, coletores, canetas]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      uploaded.push({ file_url, file_name: file.name, file_type: isImage ? 'image' : isVideo ? 'video' : 'document', mime_type: file.type });
    }
    setAnexos(prev => [...prev, ...uploaded]);
    setUploading(false);
    e.target.value = "";
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const numeroChamado = `CH${Date.now().toString().slice(-8)}`;
      const equipamentosParaChamado = equipamentosUsuario.map(e => ({ tipo: e.tipo, marca: e.marca, modelo: e.modelo, etiqueta: e.etiqueta }));

      const chamado = await base44.entities.Chamados.create({
        ...data,
        numero_chamado: numeroChamado,
        solicitante_nome: colaborador.nome_completo,
        solicitante_email: colaborador.email,
        solicitante_area: colaborador.area,
        solicitante_telefone: colaborador.telefone || "",
        status: "Aberto",
        data_abertura: new Date().toISOString().split('T')[0],
        equipamentos_usuario: equipamentosParaChamado,
        anexos: anexos,
      });

      await base44.functions.invoke('notificarNovoChamado', {
        chamadoData: { numeroChamado, solicitante_nome: colaborador.nome_completo, tipo_solicitacao: data.tipo_solicitacao, titulo_chamado: data.titulo_chamado, urgencia: data.urgencia },
        solicitanteEmail: colaborador.email,
        acompanharUrl: window.location.origin,
      });

      return { chamado, numeroChamado };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal_chamados_list'] });
      setSubmitSuccess(data.numeroChamado);
      setAnexos([]);
      setFormData({ tipo_solicitacao: "", sistema_tipo: "", sistema_subtipo: "", impressora_subtipo: "", equipamento_subtipo: "", equipamento_selecionado: "", equipamento_outros_detalhes: "", melhorias_detalhes: "", desenvolvimento_detalhes: "", servidor_subtipo: "", titulo_chamado: "", descricao_problema: "", urgencia: "Média" });
    },
  });

  const avaliacaoMutation = useMutation({
    mutationFn: async ({ id, av }) => {
      const nota = (av.tempo_resolucao + av.qualidade_atendimento + av.qualidade_solucao + av.comunicacao) / 4;
      return base44.entities.Chamados.update(id, {
        avaliacao_tempo_resolucao: av.tempo_resolucao,
        avaliacao_qualidade_atendimento: av.qualidade_atendimento,
        avaliacao_qualidade_solucao: av.qualidade_solucao,
        avaliacao_comunicacao: av.comunicacao,
        avaliacao_nota_geral: Math.round(nota * 10) / 10,
        avaliacao_comentario: av.comentario,
        avaliacao_data: new Date().toISOString(),
        status: "Resolvido",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_chamados_list'] });
      setSelectedChamado(null);
    },
  });

  if (loading || !colaborador) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const nomeNorm = colaborador.nome_completo?.toLowerCase().trim();
  const meusChamados = chamados.filter(c => c.solicitante_nome?.toLowerCase().trim() === nomeNorm);

  // 4 categorias conforme solicitado
  const naoIniciados = meusChamados.filter(c => c.status === "Aberto" || c.status === "Em Análise");
  const emAndamento = meusChamados.filter(c => c.status === "Em Andamento" || c.status === "Aguardando Peça");
  const aguardandoAvaliacao = meusChamados.filter(c => c.status === "Aguardando Avaliação");
  const fechados = meusChamados.filter(c => c.status === "Resolvido" || c.status === "Cancelado");

  const handleTipoChange = (v) => setFormData(prev => ({ ...prev, tipo_solicitacao: v, sistema_tipo: "", sistema_subtipo: "", impressora_subtipo: "", equipamento_subtipo: "", equipamento_selecionado: "", equipamento_outros_detalhes: "", servidor_subtipo: "" }));

  // Tela de sucesso após abrir chamado
  if (view === "novo" && submitSuccess) {
    return (
      <PortalLayout colaborador={colaborador} onLogout={logout}>
        <div className="p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Chamado Aberto!</h2>
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 my-4">
            <p className="text-sm text-yellow-800 mb-1 font-semibold">Número do Chamado:</p>
            <p className="text-3xl font-bold font-mono">{submitSuccess}</p>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => { setSubmitSuccess(null); setView("lista"); }} className="bg-blue-600 hover:bg-blue-700 w-full">Ver Meus Chamados</Button>
            <Button variant="outline" onClick={() => setSubmitSuccess(null)} className="w-full">Abrir Outro Chamado</Button>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // Tela de abertura de chamado
  if (view === "novo") {
    return (
      <PortalLayout colaborador={colaborador} onLogout={logout}>
        <div className="p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            <Button variant="outline" className="mb-6 gap-2" onClick={() => setView("lista")}>
              <ChevronLeft className="w-4 h-4" />Voltar
            </Button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Headset className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Abrir Chamado de Suporte</h1>
                <p className="text-gray-500 text-sm">Solicitante: {colaborador.nome_completo}</p>
              </div>
            </div>

            {/* Equipamentos vinculados */}
            {equipamentosUsuario.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Laptop className="w-4 h-4" />
                  Seus Equipamentos Cadastrados
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {equipamentosUsuario.map((eq, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-blue-100">
                      <Badge variant="outline" className="text-xs mb-1">{eq.tipo}</Badge>
                      <p className="text-sm font-medium text-gray-900">{eq.marca} {eq.modelo}</p>
                      {eq.etiqueta && <p className="text-xs text-gray-500 mt-0.5">Etiqueta: {eq.etiqueta}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Card className="shadow-xl">
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
                <CardContent className="pt-6 space-y-5">
                  <div>
                    <Label>Tipo de Solicitação *</Label>
                    <Select required value={formData.tipo_solicitacao} onValueChange={handleTipoChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      <SelectContent>
                        {["Sistema","Impressora","Equipamento","Melhorias","Desenvolvimento","Servidor","Outros"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.tipo_solicitacao === "Sistema" && (
                    <>
                      <div>
                        <Label>Sistema *</Label>
                        <Select required value={formData.sistema_tipo} onValueChange={v => setFormData(p => ({ ...p, sistema_tipo: v, sistema_subtipo: "" }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione o sistema" /></SelectTrigger>
                          <SelectContent>
                            {["WMS","Portal de Vendas","SAP"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.sistema_tipo && (
                        <div>
                          <Label>Tipo de Problema *</Label>
                          <Select required value={formData.sistema_subtipo} onValueChange={v => setFormData(p => ({ ...p, sistema_subtipo: v }))}>
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
                      <Label>Tipo de Problema *</Label>
                      <Select required value={formData.impressora_subtipo} onValueChange={v => setFormData(p => ({ ...p, impressora_subtipo: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Troca de Cartucho ou Toner">Troca de Cartucho ou Toner</SelectItem>
                          <SelectItem value="Problema na Impressora">Problema na Impressora</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.tipo_solicitacao === "Equipamento" && (
                    <div>
                      <Label>Tipo de Problema *</Label>
                      <Select required value={formData.equipamento_subtipo} onValueChange={v => setFormData(p => ({ ...p, equipamento_subtipo: v, equipamento_outros_detalhes: "" }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {["Lentidão no Computador","Problema no Monitor, Mouse ou Teclado","Problema na Máquina","Formatação","Solicitar Troca de Equipamento","Outros"].map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.equipamento_subtipo === "Outros" && (
                        <Input className="mt-2" placeholder="Descreva o problema" value={formData.equipamento_outros_detalhes} onChange={e => setFormData(p => ({ ...p, equipamento_outros_detalhes: e.target.value }))} />
                      )}
                      {equipamentosUsuario.length > 0 && (
                        <div className="mt-3">
                          <Label>Selecione o Equipamento com Problema</Label>
                          <Select value={formData.equipamento_selecionado} onValueChange={v => setFormData(p => ({ ...p, equipamento_selecionado: v }))}>
                            <SelectTrigger><SelectValue placeholder="Qual equipamento está com problema?" /></SelectTrigger>
                            <SelectContent>
                              {equipamentosUsuario.map(eq => <SelectItem key={eq.id} value={eq.displayName}>{eq.displayName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  {formData.tipo_solicitacao === "Servidor" && (
                    <div>
                      <Label>Tipo de Problema *</Label>
                      <Select required value={formData.servidor_subtipo} onValueChange={v => setFormData(p => ({ ...p, servidor_subtipo: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rede">Rede</SelectItem>
                          <SelectItem value="Internet">Internet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.tipo_solicitacao && (
                    <div>
                      <Label>Título do Chamado *</Label>
                      <Input required placeholder="Resumo curto do problema" value={formData.titulo_chamado} onChange={e => setFormData(p => ({ ...p, titulo_chamado: e.target.value }))} />
                    </div>
                  )}

                  <div>
                    <Label>Urgência *</Label>
                    <Select required value={formData.urgencia} onValueChange={v => setFormData(p => ({ ...p, urgencia: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Baixa","Média","Alta","Urgente"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Descrição do Problema *</Label>
                    <Textarea required placeholder="Descreva com detalhes: o que aconteceu, quando começou, mensagens de erro, etc." rows={4} value={formData.descricao_problema} onChange={e => setFormData(p => ({ ...p, descricao_problema: e.target.value }))} />
                  </div>

                  {/* Upload de anexos */}
                  <div>
                    <Label>Anexar Fotos, Imagens, Vídeos ou Documentos (opcional)</Label>
                    <div className="mt-2">
                      <input type="file" id="portal-file-upload" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileUpload} className="hidden" />
                      <Button type="button" variant="outline" className="w-full gap-2" disabled={uploading} onClick={() => document.getElementById('portal-file-upload').click()}>
                        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Fazendo upload...</> : <><Upload className="w-4 h-4" />Adicionar Arquivos</>}
                      </Button>
                    </div>
                    {anexos.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {anexos.map((a, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-50 border rounded-lg p-2">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700 truncate max-w-xs">{a.file_name}</span>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setAnexos(prev => prev.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
                <div className="border-t p-5 flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setView("lista")}>Cancelar</Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : "Abrir Chamado"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // Lista principal com 4 categorias
  const ChamadoCard = ({ chamado, showAvaliarBtn = false }) => (
    <div
      className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm cursor-pointer transition-all"
      onClick={() => setSelectedChamado(chamado)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-gray-500">{chamado.numero_chamado}</span>
          <Badge className={statusColors[chamado.status] || "bg-gray-100 text-gray-800"} >{chamado.status}</Badge>
          <Badge className={chamado.urgencia === "Urgente" ? "bg-red-100 text-red-800" : chamado.urgencia === "Alta" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-700"}>{chamado.urgencia}</Badge>
        </div>
        <p className="font-medium text-gray-900 truncate">{chamado.titulo_chamado || chamado.descricao_problema?.slice(0, 60)}</p>
        <p className="text-xs text-gray-500">{chamado.tipo_solicitacao} · {chamado.data_abertura}</p>
      </div>
      {showAvaliarBtn && (
        <Button
          size="sm"
          className="ml-3 bg-purple-600 hover:bg-purple-700 shrink-0"
          onClick={(e) => { e.stopPropagation(); setSelectedChamado(chamado); }}
        >
          <Star className="w-3 h-3 mr-1" />
          Avaliar
        </Button>
      )}
    </div>
  );

  const TabContent = ({ lista, empty, showAvaliarBtn = false }) => (
    <div className="space-y-2">
      {isLoading ? <p className="text-center py-8 text-gray-500">Carregando...</p>
      : lista.length === 0 ? <p className="text-center py-8 text-gray-500">{empty}</p>
      : lista.map(c => <ChamadoCard key={c.id} chamado={c} showAvaliarBtn={showAvaliarBtn} />)}
    </div>
  );

  return (
    <PortalLayout colaborador={colaborador} onLogout={logout}>
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Headset className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Meus Chamados</h1>
                <p className="text-gray-500 mt-1">Acompanhe e abra chamados de suporte</p>
              </div>
            </div>
            <Button onClick={() => setView("novo")} className="bg-orange-600 hover:bg-orange-700 gap-2">
              <Plus className="w-4 h-4" />
              Abrir Chamado
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-red-600">{naoIniciados.length}</p><p className="text-xs text-gray-600">Em Aberto</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-blue-600">{emAndamento.length}</p><p className="text-xs text-gray-600">Em Andamento</p></CardContent></Card>
            <Card className={aguardandoAvaliacao.length > 0 ? "border-purple-300 bg-purple-50" : ""}><CardContent className="pt-4 pb-4 text-center"><p className={`text-2xl font-bold ${aguardandoAvaliacao.length > 0 ? "text-purple-700" : "text-gray-600"}`}>{aguardandoAvaliacao.length}</p><p className="text-xs text-gray-600">Aguard. Avaliação</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-green-600">{fechados.length}</p><p className="text-xs text-gray-600">Fechados</p></CardContent></Card>
          </div>

          <Tabs defaultValue="abertos">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="abertos" className="text-xs">Em Aberto ({naoIniciados.length})</TabsTrigger>
              <TabsTrigger value="andamento" className="text-xs">Em Andamento ({emAndamento.length})</TabsTrigger>
              <TabsTrigger value="avaliacao" className="text-xs">Aguard. Avaliação ({aguardandoAvaliacao.length})</TabsTrigger>
              <TabsTrigger value="fechados" className="text-xs">Fechados ({fechados.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="abertos">
              <TabContent lista={naoIniciados} empty="Nenhum chamado em aberto" />
            </TabsContent>
            <TabsContent value="andamento">
              <TabContent lista={emAndamento} empty="Nenhum chamado em andamento" />
            </TabsContent>
            <TabsContent value="avaliacao">
              {aguardandoAvaliacao.length > 0 && (
                <Alert className="mb-4 bg-purple-50 border-purple-200">
                  <Star className="w-4 h-4 text-purple-600" />
                  <AlertDescription className="text-purple-800">Você tem chamados aguardando sua avaliação. Clique em "Avaliar" para finalizar.</AlertDescription>
                </Alert>
              )}
              <TabContent lista={aguardandoAvaliacao} empty="Nenhum chamado aguardando avaliação" showAvaliarBtn />
            </TabsContent>
            <TabsContent value="fechados">
              <TabContent lista={fechados} empty="Nenhum chamado fechado" />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal detalhes */}
      <Dialog open={!!selectedChamado} onOpenChange={() => setSelectedChamado(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chamado {selectedChamado?.numero_chamado}</DialogTitle>
          </DialogHeader>
          {selectedChamado && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Badge className={statusColors[selectedChamado.status]}>{selectedChamado.status}</Badge>
                <Badge className={selectedChamado.urgencia === "Urgente" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>{selectedChamado.urgencia}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-gray-500">Tipo</p><p className="font-medium">{selectedChamado.tipo_solicitacao}</p></div>
                <div><p className="text-gray-500">Data Abertura</p><p className="font-medium">{selectedChamado.data_abertura || "—"}</p></div>
                <div><p className="text-gray-500">Responsável</p><p className="font-medium">{selectedChamado.responsavel || "Não atribuído"}</p></div>
                {selectedChamado.data_conclusao && <div><p className="text-gray-500">Data Conclusão</p><p className="font-medium">{new Date(selectedChamado.data_conclusao).toLocaleDateString('pt-BR')}</p></div>}
              </div>
              {selectedChamado.descricao_problema && (
                <div><p className="text-gray-500 font-semibold mb-1">Descrição</p><p className="bg-gray-50 rounded p-3">{selectedChamado.descricao_problema}</p></div>
              )}
              {selectedChamado.solucao && (
                <div><p className="text-gray-500 font-semibold mb-1">Solução</p><p className="bg-green-50 rounded p-3 text-green-800">{selectedChamado.solucao}</p></div>
              )}
              {/* Anexos */}
              {selectedChamado.anexos?.length > 0 && (
                <div>
                  <p className="text-gray-500 font-semibold mb-2">Anexos</p>
                  <div className="space-y-1">
                    {selectedChamado.anexos.map((a, i) => (
                      <a key={i} href={a.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline text-sm">
                        <ImageIcon className="w-4 h-4" />{a.file_name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <AvaliacaoChamado
                chamado={selectedChamado}
                loading={avaliacaoMutation.isPending}
                onAvaliar={(av) => avaliacaoMutation.mutate({ id: selectedChamado.id, av })}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}