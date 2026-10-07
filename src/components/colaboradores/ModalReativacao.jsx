import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserCheck, UserPlus, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ModalReativacao({ colaborador, open, onClose, onCriarNovo }) {
  const queryClient = useQueryClient();
  const [opcao, setOpcao] = useState("reativar"); // 'reativar' | 'novo'

  if (!colaborador) return null;

  const reativarMutation = useMutation({
    mutationFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];

      if (opcao === "reativar") {
        // 1. Reativar o mesmo colaborador
        const historicoAtual = Array.isArray(colaborador.historico_status) ? colaborador.historico_status : [];
        const novoHistorico = [
          ...historicoAtual,
          {
            status_anterior: 'Desligado',
            status_novo: 'Ativo',
            data: hoje,
            timestamp: new Date().toISOString()
          }
        ];

        const { error } = await supabase.from('colaboradores').update({
          status: 'Ativo',
          data_reativacao: hoje,
          acesso_portal_bloqueado: false,
          historico_status: novoHistorico
        }).eq('id', colaborador.id);

        if (error) throw error;

        // Se possui usuário interno no Supabase Auth, remover banimento (ban_duration: 'none')
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch('/api/manageUserStatus', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ email: colaborador.email?.trim().toLowerCase(), ban: false })
            });
          }
        } catch (authErr) {
          console.warn('Erro ao remover ban de usuário interno no Supabase Auth:', authErr);
        }
      } else {
        // 2. Renomear e-mail do registro inativo para liberar o e-mail original para um novo colaborador
        // Formato correto de plus-addressing: usuario+inativo_<timestamp>@dominio.com
        const timestamp = Date.now();
        const emailAntigo = (colaborador.email || "").trim();
        let emailRenomeado = `inativo_${timestamp}@inativo.local`;

        if (emailAntigo && emailAntigo.includes('@')) {
          const [userPart, domainPart] = emailAntigo.split('@');
          emailRenomeado = `${userPart}+inativo_${timestamp}@${domainPart}`;
        }

        const { error } = await supabase.from('colaboradores').update({
          email: emailRenomeado
        }).eq('id', colaborador.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      if (opcao === "reativar") {
        toast({
          title: "Colaborador reativado",
          description: `${colaborador.nome_completo} foi reativado com status Ativo.`,
        });
        onClose();
      } else {
        toast({
          title: "E-mail liberado",
          description: `O registro anterior foi arquivado. Criando novo colaborador com ${colaborador.email}.`,
        });
        onClose();
        onCriarNovo?.(colaborador.email);
      }
    },
    onError: (err) => {
      console.error('Erro na reativação:', err);
      toast({
        variant: "destructive",
        title: "Erro na reativação",
        description: err.message || "Ocorreu um erro ao processar a operação.",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Reativação de Colaborador</DialogTitle>
              <DialogDescription>
                Selecione o fluxo desejado para <strong>{colaborador.nome_completo}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3">
          <RadioGroup value={opcao} onValueChange={setOpcao} className="space-y-3">
            <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
              opcao === "reativar" ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200 hover:bg-slate-50"
            }`}>
              <RadioGroupItem value="reativar" id="op-reativar" className="mt-1" />
              <div>
                <p className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Reativar esta mesma pessoa
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Retorna o status para <strong>Ativo</strong>, define data de reativação para hoje e restaura o acesso ao portal.
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
              opcao === "novo" ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:bg-slate-50"
            }`}>
              <RadioGroupItem value="novo" id="op-novo" className="mt-1" />
              <div>
                <p className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  Criar novo colaborador com este e-mail
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Mantém a linha desta pessoa como Desligada no histórico, renomeia o e-mail dela para preservar a integridade e abre o formulário de cadastro para a nova pessoa usando o e-mail original <code>{colaborador.email}</code>.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={reativarMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => reativarMutation.mutate()}
            disabled={reativarMutation.isPending}
            className={opcao === "reativar" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}
          >
            {reativarMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : opcao === "reativar" ? (
              "Confirmar Reativação"
            ) : (
              "Prosseguir para Cadastro"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
