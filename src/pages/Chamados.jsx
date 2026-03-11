import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Headset, Copy, Check, Eye, Laptop, Star, Clock, Send } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Chamados() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [originalChamado, setOriginalChamado] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAvaliacao, setShowAvaliacao] = useState(false);
  const [activeTab, setActiveTab] = useState("abertos");
  const [avaliacao, setAvaliacao] = useState({
    tempo_resolucao: 5,
    qualidade_atendimento: 5,
    qualidade_solucao: 5,
    comunicacao: 5,
    comentario: ""
  });
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [novaMsg, setNovaMsg] = useState("");
  const [anexoChat, setAnexoChat] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUserData = await base44.auth.me();
        setCurrentUser(currentUserData);
        setUser(currentUserData);
      } catch (error) {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const publicUrl = `${window.location.origin}${createPageUrl("chamado-publico")}`;

  const { data: chamados = [], isLoading } = useQuery({
    queryKey: ['chamados'],
    queryFn: () => base44.entities.Chamados.list('-created_date'),
    enabled: !!user,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['chamados_chat', selectedChamado?.id],
    queryFn: () => base44.entities.ChamadosChat.filter({ chamado_id: selectedChamado?.id }, 'data_hora'),
    enabled: !!selectedChamado?.id,
    refetchInterval: 2000,
  });

  const enviarMsgMutation = useMutation({
    mutationFn: async ({ msg, anexo }) => {
      let anexoUrl = null;
      if (anexo) {
        const formData = new FormData();
        formData.append('file', anexo);
        const uploadRes = await base44.integrations.Core.UploadFile({ file: anexo });
        anexoUrl = uploadRes.file_url;
      }

      const novaMsg = {
        chamado_id: selectedChamado.id,
        tipo_remetente: "admin",
        remetente_nome: currentUser.nome_exibicao || currentUser.full_name,
        remetente_email: currentUser.email,
        mensagem: msg,
        data_hora: new Date().toISOString(),
      };

      if (anexoUrl) {
        novaMsg.anexo_url = anexoUrl;
        novaMsg.anexo_nome = anexo.name;
      }

      const chatMsg = await base44.entities.ChamadosChat.create(novaMsg);

      // Email via backend — função centralizada
      base44.functions.invoke('sendEmailChatMessage', {
        chamado_id: selectedChamado.id,
        tipo_remetente: 'admin',
        remetente_nome: currentUser.nome_exibicao || currentUser.full_name,
        mensagem: msg
      }).catch(err => console.error("Erro ao enviar email:", err));

      return chatMsg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados_chat', selectedChamado?.id] });
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      setNovaMsg("");
      setAnexoChat(null);
    },
  });

  const updateChamadoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Chamados.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
    },
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDetails = (chamado) => {
    setSelectedChamado(chamado);
    setOriginalChamado(JSON.parse(JSON.stringify(chamado)));
    setShowDetails(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedChamado || !originalChamado || !currentUser) return;

    const historico = selectedChamado.historico || [];
    const dataHora = new Date().toISOString();
    let updateData = { ...selectedChamado, historico };

    const nomeExibicao = currentUser.nome_exibicao || currentUser.full_name;
    
    if (selectedChamado.solucao !== originalChamado.solucao && selectedChamado.solucao) {
      historico.push({
        data_hora: dataHora,
        tipo: "solucao",
        descricao: `Solução registrada por ${nomeExibicao}: ${selectedChamado.solucao}`,
        usuario: nomeExibicao
      });
    }

    if (selectedChamado.responsavel !== originalChamado.responsavel && selectedChamado.responsavel) {
      historico.push({
        data_hora: dataHora,
        tipo: "responsavel",
        descricao: `Responsável alterado para: ${selectedChamado.responsavel}`,
        usuario: nomeExibicao
      });
    }

    const updatePromise = base44.entities.Chamados.update(selectedChamado.id, updateData);

    // Sem email aqui — o envio de email de conclusão ocorre apenas em handleFinalizarAtendimento

    await updatePromise;
    queryClient.invalidateQueries({ queryKey: ['chamados'] });

    setShowDetails(false);
    setSelectedChamado(null);
    setOriginalChamado(null);
  };

  const chamadosAbertos = chamados.filter(c => 
    c.status === "Aberto" || 
    c.status === "Em Análise" ||
    !c.responsavel
  );

  const chamadosGeral = chamados.filter(c => c.status === "Resolvido");

  const responsaveis = [...new Set(chamados
    .filter(c => c.responsavel && c.status !== "Aberto")
    .map(c => c.responsavel)
  )].sort();

  const getChamadosPorResponsavel = (responsavel) => {
    return chamados.filter(c => c.responsavel === responsavel);
  };

  const getChamadosAbaAtiva = () => {
    if (activeTab === "abertos") return chamadosAbertos;
    if (activeTab === "geral") return chamadosGeral;
    return getChamadosPorResponsavel(activeTab);
  };

  const chamadosAbaAtiva = getChamadosAbaAtiva();

  const filteredChamados = filterStatus === "all" 
    ? chamados 
    : chamados.filter(c => c.status === filterStatus);

  const calcularTempoAtendimento = (chamado) => {
    if (!chamado.data_inicio_atendimento) return null;
    
    const inicio = new Date(chamado.data_inicio_atendimento);
    const fim = chamado.data_conclusao ? new Date(chamado.data_conclusao) : new Date();
    const diffMs = fim - inicio;
    const minutos = Math.round(diffMs / (1000 * 60));
    
    if (minutos < 60) {
      return `${minutos}min`;
    } else {
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
    }
  };

  const buildEmailHtml = ({ titulo, corTitulo, corFaixaTexto, icone, nome, numero, mensagem, detalheExtra, linkAcompanhar, rodapeExtra }) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TechControl</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

          <!-- Logo / Brand -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#1e40af;border-radius:12px;padding:10px 22px;">
                    <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px;">⚙ TechControl</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status Banner -->
          <tr>
            <td style="background:${corTitulo};border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${icone}&nbsp;&nbsp;${titulo}</p>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 10px 10px;padding:36px 40px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

              <!-- Greeting -->
              <p style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Olá, ${nome}!</p>
              <p style="margin:0 0 28px 0;font-size:15px;color:#6b7280;line-height:1.6;">${mensagem}</p>

              <!-- Ticket Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px 12px 24px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;">Número do Chamado</p>
                    <p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:'Courier New',Courier,monospace;letter-spacing:1px;">${numero}</p>
                  </td>
                </tr>
                ${detalheExtra ? `<tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;">${detalheExtra}</td></tr>` : ''}
              </table>

              <!-- CTA Button -->
              ${linkAcompanhar ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <a href="${linkAcompanhar}" style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(30,64,175,0.3);">🔍 Acompanhar Chamado</a>
                  </td>
                </tr>
              </table>` : ''}

              ${rodapeExtra ? `<p style="margin:8px 0 0 0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.5;">${rodapeExtra}</p>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 8px 0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">Este e-mail foi gerado automaticamente pelo sistema <strong style="color:#6b7280;">TechControl</strong>. Por favor, não responda.</p>
              <p style="margin:6px 0 0 0;font-size:11px;color:#d1d5db;">© 2026 TechControl · Todos os direitos reservados</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const handleIniciarAtendimento = async (chamado) => {
    if (!currentUser) {
      alert("Erro: usuário não identificado");
      return;
    }

    const agora = new Date().toISOString();
    const historico = [...(chamado.historico || [])];
    const nomeExibicao = currentUser.nome_exibicao || currentUser.full_name;
    
    historico.push({
      data_hora: agora,
      tipo: "inicio_atendimento",
      descricao: `Atendimento iniciado por ${nomeExibicao}`,
      usuario: nomeExibicao
    });

    // Atualizar o selectedChamado também para refletir o responsável imediatamente
    const dataAtualizada = {
      ...chamado,
      data_inicio_atendimento: agora,
      status: "Em Andamento",
      responsavel: nomeExibicao,
      historico
    };

    setSelectedChamado(dataAtualizada);

    const updatePromise = base44.entities.Chamados.update(chamado.id, dataAtualizada);

    // Email via backend — função centralizada
    base44.functions.invoke('sendEmailTicketStarted', {
      chamado_id: chamado.id,
      responsavel: nomeExibicao
    }).catch(err => console.error("Erro ao enviar email:", err));

    await updatePromise;
    queryClient.invalidateQueries({ queryKey: ['chamados'] });
    setShowDetails(false);
  };

  const buildEmailConclusaoComAvaliacao = (chamado, responsavel, portalUrl) => {
    const { numero_chamado, solicitante_nome, solucao } = chamado;
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7;padding:32px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

<tr><td align="center" style="padding-bottom:20px;">
  <table cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#1e40af;border-radius:12px;padding:10px 22px;">
      <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px;">⚙ TechControl</span>
    </td>
  </tr></table>
</td></tr>

<tr><td style="background:#16a34a;border-radius:10px 10px 0 0;padding:18px 32px;text-align:center;">
  <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">✅&nbsp;&nbsp;Chamado Concluído</p>
</td></tr>

<tr><td style="background:#ffffff;border-radius:0 0 10px 10px;padding:36px 40px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
  <p style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Olá, ${solicitante_nome}!</p>
  <p style="margin:0 0 28px 0;font-size:15px;color:#6b7280;line-height:1.6;">Seu chamado foi concluído por <strong>${responsavel}</strong>. Agora precisamos de 30 segundos do seu tempo para avaliar o atendimento!</p>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:28px;">
    <tr><td style="padding:20px 24px 12px 24px;border-bottom:1px solid #e2e8f0;">
      <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;">Número do Chamado</p>
      <p style="margin:0;font-size:28px;font-weight:800;color:#1e40af;font-family:'Courier New',Courier,monospace;letter-spacing:1px;">${numero_chamado}</p>
    </td></tr>
    ${solucao ? `<tr><td style="padding:16px 24px;font-size:14px;color:#374151;line-height:1.7;"><strong>Solução aplicada:</strong><br>${solucao}</td></tr>` : ''}
  </table>

  <div style="background:#fffbeb;border:2px solid #fcd34d;border-radius:10px;padding:24px;margin-bottom:24px;">
    <p style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#92400e;text-align:center;">⭐ Avalie o Atendimento</p>
    <p style="margin:0 0 16px 0;font-size:13px;color:#78350f;text-align:center;">Clique no botão abaixo para avaliar em menos de 1 minuto</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" style="padding-bottom:20px;">
        <a href="${portalUrl}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(217,119,6,0.3);">⭐ Ir para o Portal</a>
      </td></tr>
    </table>
    <p style="margin:0;font-size:12px;color:#92400e;text-align:center;">Use o número <strong>${numero_chamado}</strong> para localizar seu chamado</p>
  </div>

  <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Caso não avalie agora, enviaremos lembretes a cada 6 horas.</p>
</td></tr>

<tr><td align="center" style="padding:24px 0 8px 0;">
  <p style="margin:0;font-size:12px;color:#9ca3af;">Este e-mail foi gerado automaticamente pelo sistema <strong style="color:#6b7280;">TechControl</strong>. Por favor, não responda.</p>
  <p style="margin:6px 0 0 0;font-size:11px;color:#d1d5db;">© 2026 TechControl · Todos os direitos reservados</p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
  };

  const handleFinalizarAtendimento = async (chamado) => {
    if (!currentUser) {
      alert("Erro: usuário não identificado");
      return;
    }

    const agora = new Date().toISOString();
    const historico = chamado.historico || [];
    
    let tempo_resolucao_minutos = null;
    if (chamado.data_inicio_atendimento) {
      const inicio = new Date(chamado.data_inicio_atendimento);
      const fim = new Date(agora);
      const diffMs = fim - inicio;
      tempo_resolucao_minutos = Math.round(diffMs / (1000 * 60));
    }

    const nomeExibicao = currentUser.nome_exibicao || currentUser.full_name;
    
    historico.push({
      data_hora: agora,
      tipo: "conclusao",
      descricao: `Atendimento finalizado por ${nomeExibicao}. Aguardando avaliação do solicitante.`,
      usuario: nomeExibicao
    });

    const updatePromise = base44.entities.Chamados.update(chamado.id, {
      ...chamado,
      data_conclusao: agora,
      status: "Aguardando Avaliação",
      tempo_resolucao_minutos,
      historico
    });

    // Email via backend — função centralizada
    if (chamado.solicitante_email) {
      base44.functions.invoke('sendEmailTicketClosed', {
        chamado_id: chamado.id,
        responsavel: nomeExibicao
      }).catch(err => console.error("Erro ao enviar email:", err));
    }

    await updatePromise;
    queryClient.invalidateQueries({ queryKey: ['chamados'] });
    setShowDetails(false);
  };

  const handleAvaliar = () => {
    setShowAvaliacao(true);
  };

  const handleSalvarAvaliacao = () => {
    if (!selectedChamado) return;

    const nota_geral = (
      avaliacao.tempo_resolucao +
      avaliacao.qualidade_atendimento +
      avaliacao.qualidade_solucao +
      avaliacao.comunicacao
    ) / 4;

    const historico = selectedChamado.historico || [];
    historico.push({
      data_hora: new Date().toISOString(),
      tipo: "avaliacao",
      descricao: `Chamado avaliado com nota ${nota_geral.toFixed(1)}/5`,
      usuario: selectedChamado.solicitante_nome
    });

    updateChamadoMutation.mutate({
      id: selectedChamado.id,
      data: {
        ...selectedChamado,
        avaliacao_tempo_resolucao: avaliacao.tempo_resolucao,
        avaliacao_qualidade_atendimento: avaliacao.qualidade_atendimento,
        avaliacao_qualidade_solucao: avaliacao.qualidade_solucao,
        avaliacao_comunicacao: avaliacao.comunicacao,
        avaliacao_nota_geral: nota_geral,
        avaliacao_comentario: avaliacao.comentario,
        avaliacao_data: new Date().toISOString(),
        status: "Resolvido",
        historico
      }
    });

    setShowAvaliacao(false);
    setAvaliacao({
      tempo_resolucao: 5,
      qualidade_atendimento: 5,
      qualidade_solucao: 5,
      comunicacao: 5,
      comentario: ""
    });
  };

  const chamadosAvaliadosAba = chamadosAbaAtiva.filter(c => c.avaliacao_data);
  
  const mediaAvaliacoes = {
    geral: chamadosAvaliadosAba.length > 0 
      ? chamadosAvaliadosAba.reduce((acc, c) => acc + (c.avaliacao_nota_geral || 0), 0) / chamadosAvaliadosAba.length 
      : 0,
    tempo_resolucao: chamadosAvaliadosAba.length > 0
      ? chamadosAvaliadosAba.reduce((acc, c) => acc + (c.avaliacao_tempo_resolucao || 0), 0) / chamadosAvaliadosAba.length
      : 0,
    qualidade_atendimento: chamadosAvaliadosAba.length > 0
      ? chamadosAvaliadosAba.reduce((acc, c) => acc + (c.avaliacao_qualidade_atendimento || 0), 0) / chamadosAvaliadosAba.length
      : 0,
    qualidade_solucao: chamadosAvaliadosAba.length > 0
      ? chamadosAvaliadosAba.reduce((acc, c) => acc + (c.avaliacao_qualidade_solucao || 0), 0) / chamadosAvaliadosAba.length
      : 0,
    comunicacao: chamadosAvaliadosAba.length > 0
      ? chamadosAvaliadosAba.reduce((acc, c) => acc + (c.avaliacao_comunicacao || 0), 0) / chamadosAvaliadosAba.length
      : 0,
  };

  const stats = {
    total: chamadosAbaAtiva.length,
    abertos: chamadosAbaAtiva.filter(c => c.status === "Aberto").length,
    emAndamento: chamadosAbaAtiva.filter(c => c.status === "Em Andamento").length,
    aguardandoAvaliacao: chamadosAbaAtiva.filter(c => c.status === "Aguardando Avaliação").length,
    resolvidos: chamadosAbaAtiva.filter(c => c.status === "Resolvido").length,
    avaliados: chamadosAvaliadosAba.length,
    tempoMedioResolucao: chamadosAbaAtiva.filter(c => c.status === "Resolvido" && c.tempo_resolucao_minutos)
      .reduce((acc, c) => acc + c.tempo_resolucao_minutos, 0) / 
      (chamadosAbaAtiva.filter(c => c.status === "Resolvido" && c.tempo_resolucao_minutos).length || 1),
  };

  const getTipoCompleto = (chamado) => {
    let detalhes = chamado.tipo_solicitacao || "";
    
    if (chamado.tipo_solicitacao === "Sistema") {
      if (chamado.sistema_tipo) detalhes += ` - ${chamado.sistema_tipo}`;
      if (chamado.sistema_subtipo) detalhes += ` (${chamado.sistema_subtipo})`;
    } else if (chamado.tipo_solicitacao === "Impressora") {
      if (chamado.impressora_subtipo) detalhes += ` - ${chamado.impressora_subtipo}`;
    } else if (chamado.tipo_solicitacao === "Equipamento") {
      if (chamado.equipamento_subtipo) detalhes += ` - ${chamado.equipamento_subtipo}`;
    } else if (chamado.tipo_solicitacao === "Servidor") {
      if (chamado.servidor_subtipo) detalhes += ` - ${chamado.servidor_subtipo}`;
    }
    
    return detalhes;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderChamadosTable = (chamadosList) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº Chamado</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Urgência</TableHead>
            <TableHead>Tempo Atendimento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Avaliação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chamadosList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                Nenhum chamado encontrado
              </TableCell>
            </TableRow>
          ) : (
            chamadosList.map((chamado) => {
              const tempoAtendimento = calcularTempoAtendimento(chamado);
              return (
              <TableRow key={chamado.id}>
                <TableCell className="font-mono text-sm">{chamado.numero_chamado}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{chamado.solicitante_nome}</p>
                    <p className="text-sm text-gray-500">{chamado.solicitante_area}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[220px]">
                    <p className="text-sm font-medium truncate">{chamado.titulo_chamado || getTipoCompleto(chamado)}</p>
                    <p className="text-xs text-gray-500 truncate">{getTipoCompleto(chamado)}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={
                    chamado.urgencia === "Urgente" ? "bg-red-100 text-red-800" :
                    chamado.urgencia === "Alta" ? "bg-orange-100 text-orange-800" :
                    chamado.urgencia === "Média" ? "bg-yellow-100 text-yellow-800" :
                    "bg-blue-100 text-blue-800"
                  }>
                    {chamado.urgencia}
                  </Badge>
                </TableCell>
                <TableCell>
                  {tempoAtendimento !== null ? (
                    <span className="font-medium text-gray-900">
                      {tempoAtendimento}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={
                    chamado.status === "Aberto" ? "bg-red-100 text-red-800" :
                    chamado.status === "Em Andamento" ? "bg-blue-100 text-blue-800" :
                    chamado.status === "Aguardando Avaliação" ? "bg-orange-100 text-orange-800" :
                    chamado.status === "Resolvido" ? "bg-green-100 text-green-800" :
                    "bg-gray-100 text-gray-800"
                  }>
                    {chamado.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {chamado.avaliacao_nota_geral ? (
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-600 font-medium">{chamado.avaliacao_nota_geral.toFixed(1)}</span>
                      <span className="text-yellow-500">⭐</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenDetails(chamado)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Headset className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Chamados de Suporte</h1>
              <p className="text-gray-500 mt-1">Gerenciar solicitações de suporte</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600 font-mono truncate max-w-xs">{publicUrl}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyLink}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">Link público para abrir chamados</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Abertos</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.abertos}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Em Andamento</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.emAndamento}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Aguard. Avaliação</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.aguardandoAvaliacao}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Resolvidos</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.resolvidos}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Tempo Médio</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {stats.tempoMedioResolucao < 60 
                    ? `${Math.round(stats.tempoMedioResolucao)}min`
                    : `${Math.floor(stats.tempoMedioResolucao / 60)}h ${Math.round(stats.tempoMedioResolucao % 60)}min`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Avaliados</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.avaliados}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {chamadosAvaliadosAba.length > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-900">
                <Star className="w-5 h-5" />
                Médias de Avaliação dos Atendimentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg p-4 text-center border border-yellow-200">
                  <p className="text-xs text-gray-600 mb-1">Geral</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl font-bold text-yellow-600">{mediaAvaliacoes.geral.toFixed(1)}</p>
                    <span className="text-yellow-500">⭐</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center border border-yellow-200">
                  <p className="text-xs text-gray-600 mb-1">Tempo</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl font-bold text-blue-600">{mediaAvaliacoes.tempo_resolucao.toFixed(1)}</p>
                    <span className="text-yellow-500">⭐</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center border border-yellow-200">
                  <p className="text-xs text-gray-600 mb-1">Atendimento</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl font-bold text-green-600">{mediaAvaliacoes.qualidade_atendimento.toFixed(1)}</p>
                    <span className="text-yellow-500">⭐</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center border border-yellow-200">
                  <p className="text-xs text-gray-600 mb-1">Solução</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl font-bold text-purple-600">{mediaAvaliacoes.qualidade_solucao.toFixed(1)}</p>
                    <span className="text-yellow-500">⭐</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center border border-yellow-200">
                  <p className="text-xs text-gray-600 mb-1">Comunicação</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl font-bold text-indigo-600">{mediaAvaliacoes.comunicacao.toFixed(1)}</p>
                    <span className="text-yellow-500">⭐</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-yellow-700 mt-3">
                Baseado em {chamadosAvaliadosAba.length} {chamadosAvaliadosAba.length === 1 ? 'avaliação' : 'avaliações'}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Chamados por Responsável</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Carregando...
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto flex-wrap">
                  <TabsTrigger 
                    value="abertos" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-600 data-[state=active]:bg-transparent px-6 py-3"
                  >
                    Em Aberto ({chamadosAbertos.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="geral" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent px-6 py-3"
                  >
                    Geral ({chamadosGeral.length})
                  </TabsTrigger>
                  {responsaveis.map((responsavel) => {
                    const count = getChamadosPorResponsavel(responsavel).length;
                    return (
                      <TabsTrigger 
                        key={responsavel}
                        value={responsavel} 
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3"
                      >
                        {responsavel} ({count})
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value="abertos" className="mt-0">
                  {renderChamadosTable(chamadosAbertos)}
                </TabsContent>

                <TabsContent value="geral" className="mt-0">
                  {renderChamadosTable(chamadosGeral)}
                </TabsContent>

                {responsaveis.map((responsavel) => (
                  <TabsContent key={responsavel} value={responsavel} className="mt-0">
                    {renderChamadosTable(getChamadosPorResponsavel(responsavel))}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>

        <Dialog open={showDetails} onOpenChange={setShowDetails}>
           <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
             <DialogHeader>
               <DialogTitle>Detalhes do Chamado</DialogTitle>
               <p className="text-sm text-gray-500" style={{display: 'none'}}>Detalhes e chat do chamado selecionado</p>
             </DialogHeader>
            {selectedChamado && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-800 text-sm">
                    <strong>Dica:</strong> Todas as alterações que você fizer serão registradas no histórico e ficarão visíveis para o solicitante.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Número do Chamado</Label>
                    <p className="font-mono font-medium">{selectedChamado.numero_chamado}</p>
                  </div>
                  <div>
                    <Label>Status Atual</Label>
                    <Badge className={
                      selectedChamado.status === "Aberto" ? "bg-red-100 text-red-800" :
                      selectedChamado.status === "Em Andamento" ? "bg-blue-100 text-blue-800" :
                      selectedChamado.status === "Resolvido" ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-800"
                    }>
                      {selectedChamado.status}
                    </Badge>
                  </div>
                </div>

                {selectedChamado.data_inicio_atendimento && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-700" />
                      <Label className="text-blue-900">Atendimento Iniciado</Label>
                    </div>
                    <p className="font-medium text-blue-800">
                      {format(new Date(selectedChamado.data_inicio_atendimento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {calcularTempoAtendimento(selectedChamado) !== null && (
                      <p className="text-sm text-blue-700 mt-1">
                        Tempo de atendimento: {calcularTempoAtendimento(selectedChamado)}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  {!selectedChamado.data_inicio_atendimento && selectedChamado.status !== "Aguardando Avaliação" && selectedChamado.status !== "Resolvido" && (
                    <Button
                      onClick={() => handleIniciarAtendimento(selectedChamado)}
                      className="bg-blue-600 hover:bg-blue-700 flex-1"
                    >
                      Iniciar Atendimento
                    </Button>
                  )}
                  {selectedChamado.data_inicio_atendimento && selectedChamado.status !== "Aguardando Avaliação" && selectedChamado.status !== "Resolvido" && (
                    <Button
                      onClick={() => handleFinalizarAtendimento(selectedChamado)}
                      className="bg-green-600 hover:bg-green-700 flex-1"
                    >
                      Finalizar Atendimento
                    </Button>
                  )}
                </div>

                {selectedChamado.status === "Aguardando Avaliação" && !selectedChamado.avaliacao_data && (
                  <div className="space-y-3">
                    <Alert className="bg-orange-50 border-orange-200">
                      <AlertDescription className="text-orange-800 text-sm">
                        <strong>Aguardando:</strong> Este chamado está aguardando avaliação. Clique no botão abaixo para avaliar o atendimento.
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={handleAvaliar}
                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Avaliar Atendimento
                    </Button>
                  </div>
                )}

                {showAvaliacao && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 space-y-4">
                    <h3 className="font-semibold text-yellow-900 text-lg flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Avalie o Atendimento
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <Label>Tempo de Resolução</Label>
                        <div className="flex gap-2 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setAvaliacao({ ...avaliacao, tempo_resolucao: star })}
                              className={`text-2xl transition-colors ${
                                star <= avaliacao.tempo_resolucao ? "text-yellow-500" : "text-gray-300"
                              }`}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Qualidade do Atendimento</Label>
                        <div className="flex gap-2 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setAvaliacao({ ...avaliacao, qualidade_atendimento: star })}
                              className={`text-2xl transition-colors ${
                                star <= avaliacao.qualidade_atendimento ? "text-yellow-500" : "text-gray-300"
                              }`}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Qualidade da Solução</Label>
                        <div className="flex gap-2 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setAvaliacao({ ...avaliacao, qualidade_solucao: star })}
                              className={`text-2xl transition-colors ${
                                star <= avaliacao.qualidade_solucao ? "text-yellow-500" : "text-gray-300"
                              }`}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Comunicação</Label>
                        <div className="flex gap-2 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setAvaliacao({ ...avaliacao, comunicacao: star })}
                              className={`text-2xl transition-colors ${
                                star <= avaliacao.comunicacao ? "text-yellow-500" : "text-gray-300"
                              }`}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Comentário (opcional)</Label>
                        <Textarea
                          value={avaliacao.comentario}
                          onChange={(e) => setAvaliacao({ ...avaliacao, comentario: e.target.value })}
                          placeholder="Deixe seu comentário sobre o atendimento..."
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowAvaliacao(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleSalvarAvaliacao}
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                        >
                          Enviar Avaliação
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-1">Tipo de Solicitação</h3>
                  <p className="text-sm text-blue-800">{getTipoCompleto(selectedChamado)}</p>
                  {selectedChamado.titulo_chamado && (
                    <p className="text-sm font-semibold text-blue-900 mt-2">📌 {selectedChamado.titulo_chamado}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Solicitante</Label>
                    <p className="font-medium">{selectedChamado.solicitante_nome}</p>
                    <p className="text-sm text-gray-600">{selectedChamado.solicitante_email}</p>
                  </div>
                  <div>
                    <Label>Área/Departamento</Label>
                    <p className="font-medium">{selectedChamado.solicitante_area}</p>
                  </div>
                </div>

                {selectedChamado.equipamentos_usuario && selectedChamado.equipamentos_usuario.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Laptop className="w-4 h-4" />
                      Equipamentos do Usuário
                    </h3>
                    <div className="grid md:grid-cols-2 gap-2">
                      {selectedChamado.equipamentos_usuario.map((eq, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-gray-100">
                          <Badge variant="outline" className="text-xs mb-1">{eq.tipo}</Badge>
                          <p className="text-sm font-medium">{eq.marca} {eq.modelo}</p>
                          {eq.etiqueta && (
                            <p className="text-xs text-gray-500 mt-1">Etiqueta: {eq.etiqueta}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedChamado.equipamento_selecionado && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <Label className="text-yellow-900">Equipamento com Problema</Label>
                    <p className="font-medium text-yellow-800 mt-1">{selectedChamado.equipamento_selecionado}</p>
                  </div>
                )}

                <div>
                  <Label>Descrição do Problema</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedChamado.descricao_problema}</p>
                </div>

                {selectedChamado.melhorias_detalhes && (
                  <div>
                    <Label>Detalhes da Melhoria</Label>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedChamado.melhorias_detalhes}</p>
                  </div>
                )}

                {selectedChamado.desenvolvimento_detalhes && (
                  <div>
                    <Label>Detalhes do Desenvolvimento</Label>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedChamado.desenvolvimento_detalhes}</p>
                  </div>
                )}

                {selectedChamado.equipamento_outros_detalhes && (
                  <div>
                    <Label>Outros Detalhes</Label>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedChamado.equipamento_outros_detalhes}</p>
                  </div>
                )}

                {selectedChamado.anexos && selectedChamado.anexos.length > 0 && (
                  <div>
                    <Label>Arquivos Anexados</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {selectedChamado.anexos.map((anexo, idx) => (
                        <a 
                          key={idx} 
                          href={anexo.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                        >
                          {anexo.file_type === 'image' ? (
                            <img src={anexo.file_url} alt={anexo.file_name} className="w-full h-32 object-cover rounded mb-2" />
                          ) : (
                            <video src={anexo.file_url} controls className="w-full h-32 object-cover rounded mb-2" />
                          )}
                          <p className="text-xs text-gray-600 truncate">{anexo.file_name}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Responsável</Label>
                  <Select 
                    value={selectedChamado.responsavel || ""} 
                    onValueChange={(value) => setSelectedChamado({ ...selectedChamado, responsavel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((usr) => (
                        <SelectItem key={usr.id} value={usr.nome_exibicao || usr.full_name}>
                          {usr.nome_exibicao || usr.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                   <Label>Solução Aplicada</Label>
                   <Textarea
                     value={selectedChamado.solucao || ""}
                     onChange={(e) => setSelectedChamado({ ...selectedChamado, solucao: e.target.value })}
                     placeholder="Descreva a solução aplicada..."
                     rows={3}
                   />
                 </div>

                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                   <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                     💬 Chat ao Vivo
                   </h3>
                   <div className="bg-white border border-blue-200 rounded-lg p-3 h-64 overflow-y-auto mb-3 space-y-3">
                     {chatMessages.length === 0 ? (
                       <p className="text-sm text-gray-500 text-center py-8">Nenhuma mensagem ainda. Seja o primeiro a escrever!</p>
                     ) : (
                       chatMessages.map((msg) => {
                         const isAdminMsg = msg.tipo_remetente === "admin" || msg.remetente_email === currentUser?.email;
                         return (
                         <div key={msg.id} className={`flex ${isAdminMsg ? "justify-end" : "justify-start"}`}>
                           <div className={`max-w-[75%] rounded-lg p-3 break-words ${
                             isAdminMsg
                               ? "bg-blue-100 text-blue-900" 
                               : "bg-gray-100 text-gray-900"
                           }`}>
                             <p className="text-xs font-semibold mb-1">{msg.remetente_nome}</p>
                             {msg.mensagem && <p className="text-sm whitespace-pre-wrap break-words">{msg.mensagem}</p>}
                             {msg.anexo_url && (
                               <a 
                                 href={msg.anexo_url} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className={`flex items-center gap-1 mt-2 text-xs underline break-all ${
                                   isAdminMsg
                                     ? "text-blue-700 hover:text-blue-900" 
                                     : "text-gray-700 hover:text-gray-900"
                                 }`}
                               >
                                 📎 {msg.anexo_nome}
                               </a>
                             )}
                             <p className="text-xs mt-1 opacity-70">
                               {format(new Date(msg.data_hora), "HH:mm", { locale: ptBR })}
                             </p>
                           </div>
                         </div>
                       );
                       })
                     )}
                   </div>
                   <div className="space-y-2">
                     {anexoChat && (
                       <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 text-sm flex items-center justify-between">
                         <span className="text-blue-900">📎 {anexoChat.name}</span>
                         <button 
                           onClick={() => setAnexoChat(null)}
                           className="text-blue-700 hover:text-blue-900 font-bold"
                         >
                           ✕
                         </button>
                       </div>
                     )}
                     <div className="flex gap-2">
                       <textarea
                         value={novaMsg}
                         onChange={(e) => setNovaMsg(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === "Enter" && !e.shiftKey) {
                             e.preventDefault();
                             if (novaMsg.trim() || anexoChat) {
                               enviarMsgMutation.mutate({ msg: novaMsg || "📎 Arquivo enviado", anexo: anexoChat });
                             }
                           }
                         }}
                         placeholder="Digite sua mensagem... (Shift+Enter para quebra de linha)"
                         rows={1}
                         className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                         style={{ maxHeight: "100px", minHeight: "40px" }}
                       />
                       <label className="cursor-pointer">
                         <input
                           type="file"
                           onChange={(e) => setAnexoChat(e.target.files?.[0] || null)}
                           className="hidden"
                         />
                         <div className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg px-3 py-2 flex items-center justify-center transition-colors">
                           📎
                         </div>
                       </label>
                       <Button
                         onClick={() => {
                           if (novaMsg.trim() || anexoChat) {
                             enviarMsgMutation.mutate({ msg: novaMsg || "📎 Arquivo enviado", anexo: anexoChat });
                           }
                         }}
                         disabled={enviarMsgMutation.isPending || (!novaMsg.trim() && !anexoChat)}
                         className="bg-blue-600 hover:bg-blue-700"
                         size="sm"
                       >
                         <Send className="w-4 h-4" />
                       </Button>
                     </div>
                   </div>
                 </div>

                {selectedChamado.avaliacao_data && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Avaliação do Usuário
                    </h3>
                    <div className="bg-white rounded-lg p-3 border border-green-200 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-green-900">Nota Geral</p>
                        <div className="flex items-center gap-1">
                          <span className="text-xl font-bold text-green-900">{selectedChamado.avaliacao_nota_geral?.toFixed(1)}</span>
                          <span className="text-lg text-yellow-500">⭐</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Tempo de Resolução:</span>
                          <span className="font-medium">{selectedChamado.avaliacao_tempo_resolucao} ⭐</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Qualidade do Atendimento:</span>
                          <span className="font-medium">{selectedChamado.avaliacao_qualidade_atendimento} ⭐</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Qualidade da Solução:</span>
                          <span className="font-medium">{selectedChamado.avaliacao_qualidade_solucao} ⭐</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Comunicação:</span>
                          <span className="font-medium">{selectedChamado.avaliacao_comunicacao} ⭐</span>
                        </div>
                      </div>
                    </div>
                    
                    {selectedChamado.avaliacao_comentario && (
                      <div>
                        <p className="text-sm text-green-700 mb-1 font-semibold">Comentário:</p>
                        <p className="text-sm text-green-900 bg-white p-3 rounded-lg border border-green-200">
                          {selectedChamado.avaliacao_comentario}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowDetails(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveChanges}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}