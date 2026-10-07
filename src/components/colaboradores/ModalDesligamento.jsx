import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UserMinus, AlertTriangle, ShieldAlert, Monitor, Laptop, 
  Smartphone, Camera, Barcode, Pen, ShoppingCart, Calendar, 
  CheckCircle2, Loader2, ArrowRight
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ModalDesligamento({ colaborador, open, onClose, onSucesso }) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const [novoCompradorId, setNovoCompradorId] = useState("");
  const [novoAprovadorId, setNovoAprovadorId] = useState("");

  // 1. Consultar todos os equipamentos vinculados ao colaborador (por id ou por nome)
  const { data: pcs = [], isLoading: loadPcs } = useQuery({
    queryKey: ['pcs_desligamento', colaborador?.id],
    queryFn: () => base44.entities.PCs_Internos.list(),
    enabled: !!colaborador,
  });

  const { data: notebooks = [], isLoading: loadNbs } = useQuery({
    queryKey: ['notebooks_desligamento', colaborador?.id],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
    enabled: !!colaborador,
  });

  const { data: tablets = [] } = useQuery({
    queryKey: ['tablets_desligamento', colaborador?.id],
    queryFn: () => base44.entities.Tablets.list(),
    enabled: !!colaborador,
  });

  const { data: smartphones = [] } = useQuery({
    queryKey: ['smartphones_desligamento', colaborador?.id],
    queryFn: () => base44.entities.Smartphones.list(),
    enabled: !!colaborador,
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras_desligamento', colaborador?.id],
    queryFn: () => base44.entities.Cameras.list(),
    enabled: !!colaborador,
  });

  const { data: coletores = [] } = useQuery({
    queryKey: ['coletores_desligamento', colaborador?.id],
    queryFn: () => base44.entities.Coletores.list(),
    enabled: !!colaborador,
  });

  const { data: canetas = [] } = useQuery({
    queryKey: ['canetas_desligamento', colaborador?.id],
    queryFn: () => base44.entities.Canetas_Vibracao.list(),
    enabled: !!colaborador,
  });

  // 2. Requisições de Compras pendentes
  const { data: requisicoes = [], isLoading: loadReqs } = useQuery({
    queryKey: ['requisicoes_desligamento'],
    queryFn: () => base44.entities.RequisicaoCompras.list(),
    enabled: !!colaborador,
  });

  // 3. Chamados em aberto onde o responsável é o colaborador
  const { data: chamados = [], isLoading: loadChams } = useQuery({
    queryKey: ['chamados_desligamento'],
    queryFn: () => base44.entities.Chamados.list(),
    enabled: !!colaborador,
  });

  // 4. Reservas futuras (veículos e salas)
  const { data: reservasVeiculos = [] } = useQuery({
    queryKey: ['reservas_veic_desligamento'],
    queryFn: () => base44.entities.Reservas.list(),
    enabled: !!colaborador,
  });

  const { data: reservasSalas = [] } = useQuery({
    queryKey: ['reservas_salas_desligamento'],
    queryFn: () => base44.entities.ReservasSala.list(),
    enabled: !!colaborador,
  });

  // 5. Configurações de Diretor
  const { data: configs = [] } = useQuery({
    queryKey: ['configs_diretor'],
    queryFn: () => base44.entities.Configuracoes.list(),
    enabled: !!colaborador,
  });

  // 6. Lista geral de colaboradores ativos para reatribuição e verificação de login compartilhado
  const { data: todosColaboradores = [] } = useQuery({
    queryKey: ['todos_colabs_desligamento'],
    queryFn: () => base44.entities.Colaboradores.list(),
    enabled: !!colaborador,
  });

  if (!colaborador) return null;

  const nomeNorm = colaborador.nome_completo?.trim().toLowerCase() || "";
  const emailNorm = colaborador.email?.trim().toLowerCase() || "";

  // Filtra equipamentos do colaborador
  const matchEq = (e) => e.colaborador_id === colaborador.id || (e.usuario_atual && e.usuario_atual.trim().toLowerCase() === nomeNorm);

  const meusPcs = pcs.filter(matchEq);
  const meusNotebooks = notebooks.filter(matchEq);
  const meusTablets = tablets.filter(matchEq);
  const meusSmartphones = smartphones.filter(matchEq);
  const minhasCameras = cameras.filter(matchEq);
  const meusColetores = coletores.filter(matchEq);
  const minhasCanetas = canetas.filter(matchEq);

  const totalEquipamentos = meusPcs.length + meusNotebooks.length + meusTablets.length + 
    meusSmartphones.length + minhasCameras.length + meusColetores.length + minhasCanetas.length;

  // Requisições como Comprador
  const STATUS_PENDENTES_COMPRADOR = ['Aguardando Cotação'];
  const reqsComoComprador = requisicoes.filter(r => 
    r.cotacao_comprador_id === colaborador.id && STATUS_PENDENTES_COMPRADOR.includes(r.status)
  );

  // Requisições como Aprovador
  const STATUS_PENDENTES_APROVADOR = ['Aguardando Aprovador'];
  const reqsComoAprovador = requisicoes.filter(r => 
    r.aprovador_id === colaborador.id && STATUS_PENDENTES_APROVADOR.includes(r.status)
  );

  // Verificação de Diretor em configuracoes
  const cfgDiretor = configs.find(c => c.chave === 'diretor_email');
  const ehDiretorCadastrado = cfgDiretor && cfgDiretor.valor?.trim().toLowerCase() === emailNorm;

  // Chamados abertos
  const chamadosAbertos = chamados.filter(c => 
    c.status !== 'Concluído' && c.status !== 'Cancelado' &&
    c.responsavel && c.responsavel.trim().toLowerCase() === nomeNorm
  );

  // Reservas futuras
  const hojeStr = new Date().toISOString().split('T')[0];
  const reservasVeiculosFuturas = reservasVeiculos.filter(r => 
    r.status !== 'Cancelada' && r.status !== 'Concluída' &&
    (r.solicitante_email?.trim().toLowerCase() === emailNorm || (r.solicitante_nome && r.solicitante_nome.trim().toLowerCase() === nomeNorm)) &&
    (r.data_fim >= hojeStr || r.data_inicio >= hojeStr)
  );

  const reservasSalasFuturas = reservasSalas.filter(r => 
    r.status !== 'Cancelada' && r.status !== 'Concluída' &&
    (r.solicitante_email?.trim().toLowerCase() === emailNorm || (r.solicitante_nome && r.solicitante_nome.trim().toLowerCase() === nomeNorm)) &&
    r.data >= hojeStr
  );

  // Login compartilhado: outros colaboradores ativos com o mesmo email
  const outrosComMesmoEmail = todosColaboradores.filter(c => 
    c.id !== colaborador.id && c.status === 'Ativo' && c.email?.trim().toLowerCase() === emailNorm
  );

  // Outros compradores ativos
  const outrosCompradores = todosColaboradores.filter(c => 
    c.id !== colaborador.id && c.status === 'Ativo' && c.eh_comprador
  );

  // Outros aprovadores/gestores ativos
  const outrosAprovadores = todosColaboradores.filter(c => 
    c.id !== colaborador.id && c.status === 'Ativo' && c.tipo_funcionario === 'Interno'
  );

  // Bloqueios de confirmação
  const pendenciaCompradorBloqueante = reqsComoComprador.length > 0 && !novoCompradorId;
  const pendenciaAprovadorBloqueante = reqsComoAprovador.length > 0 && !novoAprovadorId;
  const podeConfirmar = !pendenciaCompradorBloqueante && !pendenciaAprovadorBloqueante && motivo.trim().length > 0;

  // Mutação para executar desligamento
  const desligamentoMutation = useMutation({
    mutationFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];

      // A) Se necessário reatribuir cotações de comprador
      if (reqsComoComprador.length > 0 && novoCompradorId) {
        const compradorAlvo = outrosCompradores.find(c => c.id === novoCompradorId);
        for (const req of reqsComoComprador) {
          await supabase.from('requisicao_compras').update({
            cotacao_comprador_id: novoCompradorId,
            cotacao_comprador_nome: compradorAlvo?.nome_completo || null
          }).eq('id', req.id);
        }
      }

      // B) Se necessário reatribuir requisições de aprovador
      if (reqsComoAprovador.length > 0 && novoAprovadorId) {
        const aprovadorAlvo = outrosAprovadores.find(c => c.id === novoAprovadorId);
        for (const req of reqsComoAprovador) {
          await supabase.from('requisicao_compras').update({
            aprovador_id: novoAprovadorId,
            aprovador_nome: aprovadorAlvo?.nome_completo || null,
            aprovador_email: aprovadorAlvo?.email || null
          }).eq('id', req.id);
        }
      }

      // C) Equipamentos: alterar status para 'Aguardando Devolução'
      for (const p of meusPcs) {
        await supabase.from('pcs_internos').update({ status: 'Aguardando Devolução' }).eq('id', p.id);
      }
      for (const n of meusNotebooks) {
        await supabase.from('notebooks_externos').update({ status: 'Aguardando Devolução' }).eq('id', n.id);
      }
      for (const t of meusTablets) {
        await supabase.from('tablets').update({ status: 'Aguardando Devolução' }).eq('id', t.id);
      }
      for (const s of meusSmartphones) {
        await supabase.from('smartphones').update({ status: 'Aguardando Devolução' }).eq('id', s.id);
      }
      for (const c of minhasCameras) {
        await supabase.from('cameras').update({ status: 'Aguardando Devolução' }).eq('id', c.id);
      }
      for (const col of meusColetores) {
        await supabase.from('coletores').update({ status: 'Aguardando Devolução' }).eq('id', col.id);
      }
      for (const pen of minhasCanetas) {
        await supabase.from('canetas_vibracao').update({ status: 'Aguardando Devolução' }).eq('id', pen.id);
      }

      // D) Cancelar reservas futuras
      for (const r of reservasVeiculosFuturas) {
        await supabase.from('reservas').update({
          status: 'Cancelada',
          motivo_cancelamento: 'Cancelada automaticamente por desligamento do colaborador'
        }).eq('id', r.id);
      }
      for (const rs of reservasSalasFuturas) {
        await supabase.from('reservas_sala').update({
          status: 'Cancelada',
          observacoes: (rs.observacoes ? rs.observacoes + ' | ' : '') + 'Cancelada automaticamente por desligamento do colaborador'
        }).eq('id', rs.id);
      }

      // E) Atualizar histórico de status
      const historicoAtual = Array.isArray(colaborador.historico_status) ? colaborador.historico_status : [];
      const novoHistorico = [
        ...historicoAtual,
        {
          status_anterior: colaborador.status,
          status_novo: 'Desligado',
          data: hoje,
          motivo: motivo.trim(),
          timestamp: new Date().toISOString()
        }
      ];

      // F) Atualizar colaborador
      const { error: errColab } = await supabase.from('colaboradores').update({
        status: 'Desligado',
        data_desligamento: hoje,
        motivo_desligamento: motivo.trim(),
        acesso_portal_bloqueado: true,
        historico_status: novoHistorico
      }).eq('id', colaborador.id);

      if (errColab) throw errColab;

      // G) Se possui conta de acesso ao sistema interno (Supabase Auth / profiles), banir a conta via Admin API
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch('/api/manageUserStatus', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ email: emailNorm, ban: true })
          });
        }
      } catch (authErr) {
        console.warn('Erro ao banir usuário interno no Supabase Auth:', authErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['reservas_sala'] });
      toast({
        title: "Colaborador desligado com sucesso",
        description: `${colaborador.nome_completo} teve seu desligamento registrado e o offboarding aplicado.`,
      });
      onSucesso?.();
      onClose();
    },
    onError: (err) => {
      console.error('Erro no desligamento:', err);
      toast({
        variant: "destructive",
        title: "Erro no desligamento",
        description: err.message || "Ocorreu um erro ao processar o desligamento.",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Desligar Colaborador</DialogTitle>
              <DialogDescription>
                Checklist de offboarding e encerramento de vínculo de <strong>{colaborador.nome_completo}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Motivo do Desligamento */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Motivo do Desligamento *</Label>
            <Textarea
              placeholder="Descreva o motivo (ex: Pedido de demissão, Término de contrato, Decisão da empresa...)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          {/* CHECKLIST AO VIVO */}
          <div className="border rounded-xl p-4 bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              Checklist de Offboarding ao Vivo
            </h4>

            {/* 1. Equipamentos */}
            <div className="bg-white border rounded-lg p-3 text-sm flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-600" />
                  Equipamentos em posse: <span className="text-rose-600 font-bold">{totalEquipamentos}</span>
                </p>
                {totalEquipamentos > 0 ? (
                  <p className="text-xs text-slate-500 mt-1">
                    Serão alterados automaticamente para <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">Aguardando Devolução</Badge> mantendo o vínculo com o colaborador até a confirmação física.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Nenhum equipamento vinculado no sistema.
                  </p>
                )}
              </div>
              <Badge className={totalEquipamentos > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                {totalEquipamentos} itens
              </Badge>
            </div>

            {/* 2. Cotações de Comprador (Bloqueante) */}
            {colaborador.eh_comprador && (
              <div className={`border rounded-lg p-3 text-sm ${reqsComoComprador.length > 0 ? "bg-rose-50 border-rose-200" : "bg-white"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-purple-600" />
                      Requisições de Compra sob cotação: <span className={reqsComoComprador.length > 0 ? "text-rose-600 font-bold" : "text-slate-600"}>{reqsComoComprador.length}</span>
                    </p>
                    {reqsComoComprador.length > 0 ? (
                      <p className="text-xs text-rose-700 mt-1 font-medium">
                        Bloqueante: É obrigatório transferir as cotações pendentes para outro comprador antes de prosseguir.
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Nenhuma cotação pendente vinculada.
                      </p>
                    )}
                  </div>
                  <Badge className={reqsComoComprador.length > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}>
                    {reqsComoComprador.length} pendentes
                  </Badge>
                </div>

                {reqsComoComprador.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-rose-200">
                    <Label className="text-xs font-semibold text-rose-900">Transferir cotações pendentes para:</Label>
                    <Select value={novoCompradorId} onValueChange={setNovoCompradorId}>
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue placeholder="Selecione o novo comprador responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {outrosCompradores.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nome_completo} ({c.area})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* 3. Aprovador de Compras (Bloqueante se houver pendências) */}
            {reqsComoAprovador.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-rose-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Requisições aguardando aprovação deste gestor: <span className="font-bold">{reqsComoAprovador.length}</span>
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      Bloqueante: Reatribua o aprovador das requisições em aberto.
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-rose-200">
                  <Label className="text-xs font-semibold text-rose-900">Transferir aprovações pendentes para:</Label>
                  <Select value={novoAprovadorId} onValueChange={setNovoAprovadorId}>
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue placeholder="Selecione o novo gestor aprovador" />
                    </SelectTrigger>
                    <SelectContent>
                      {outrosAprovadores.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome_completo} ({c.area})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* 4. Alerta Diretor de Compras */}
            {ehDiretorCadastrado && (
              <Alert className="bg-amber-50 border-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <AlertDescription className="text-xs text-amber-900">
                  <strong>Atenção:</strong> O e-mail deste colaborador está configurado como Diretor de Compras nas configurações do sistema. Lembre-se de atualizar o e-mail do Diretor em Requisição de Compras &gt; Configurações.
                </AlertDescription>
              </Alert>
            )}

            {/* 5. Chamados Abertos (Aviso) */}
            <div className="bg-white border rounded-lg p-3 text-sm flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">
                  Chamados abertos atribuídos: <span className={chamadosAbertos.length > 0 ? "text-amber-600 font-bold" : "text-slate-600"}>{chamadosAbertos.length}</span>
                </p>
                {chamadosAbertos.length > 0 ? (
                  <p className="text-xs text-amber-700 mt-1">
                    Aviso: Existem chamados não concluídos atribuídos ao nome deste colaborador. Reatribua-os na tela de Chamados.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Nenhum chamado aberto atribuído.
                  </p>
                )}
              </div>
              <Badge className={chamadosAbertos.length > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                {chamadosAbertos.length}
              </Badge>
            </div>

            {/* 6. Reservas Futuras (Cancelamento Automático) */}
            <div className="bg-white border rounded-lg p-3 text-sm flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Reservas futuras ativas: <span className="font-bold">{reservasVeiculosFuturas.length + reservasSalasFuturas.length}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {reservasVeiculosFuturas.length} de veículo(s) e {reservasSalasFuturas.length} de sala(s) serão canceladas automaticamente.
                </p>
              </div>
              <Badge variant="outline">
                {reservasVeiculosFuturas.length + reservasSalasFuturas.length} reservas
              </Badge>
            </div>

            {/* 7. Login Compartilhado */}
            {outrosComMesmoEmail.length > 0 && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-xs text-blue-900">
                  <strong>Login Compartilhado detectado:</strong> O e-mail <code>{colaborador.email}</code> também é usado por outros {outrosComMesmoEmail.length} colaborador(es) ativo(s): {outrosComMesmoEmail.map(c => c.nome_completo).join(', ')}. A conta institucional permanecerá ativa para os demais.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={desligamentoMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => desligamentoMutation.mutate()}
            disabled={!podeConfirmar || desligamentoMutation.isPending}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {desligamentoMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando Desligamento...
              </>
            ) : (
              "Confirmar Desligamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
