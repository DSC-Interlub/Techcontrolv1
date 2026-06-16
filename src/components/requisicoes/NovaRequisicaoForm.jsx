import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Loader2, Paperclip, X, CheckCircle } from "lucide-react";

export default function NovaRequisicaoForm({ colaborador, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    item: "",
    quantidade: 1,
    valor_minimo: "",
    valor_maximo: "",
    justificativa: "",
    urgencia: "Média",
    fornecedor_sugerido: "",
  });
  const [anexos, setAnexos] = useState([]);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  // Busca o aprovador vinculado ao colaborador
  const { data: aprovador } = useQuery({
    queryKey: ['aprovador_data', colaborador?.responsavel_id],
    queryFn: async () => {
      if (!colaborador?.responsavel_id) return null;
      const results = await base44.entities.Colaboradores.filter({ id: colaborador.responsavel_id });
      return results?.[0] || null;
    },
    enabled: !!colaborador?.responsavel_id,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const numeroRequisicao = `REQ${Date.now().toString().slice(-8)}`;

      if (!colaborador?.responsavel_id) {
        throw new Error('Você não possui um responsável/aprovador vinculado. Solicite ao administrador que configure seu cadastro.');
      }

      const requisicao = await base44.entities.RequisicaoCompras.create({
        ...data,
        numero_requisicao: numeroRequisicao,
        colaborador_id: colaborador.id,
        colaborador_nome: colaborador.nome_completo,
        colaborador_email: colaborador.email,
        colaborador_area: colaborador.area,
        aprovador_id: colaborador.responsavel_id,
        aprovador_nome: colaborador.responsavel_nome || aprovador?.nome_completo || '',
        aprovador_email: colaborador.responsavel_email || aprovador?.email || '',
        status: 'Aguardando Aprovador',
        anexos: anexos,
        historico: [{
          data_hora: new Date().toISOString(),
          tipo: 'abertura',
          descricao: 'Requisição aberta pelo colaborador.',
          usuario: colaborador.nome_completo,
        }],
      });

      // Notifica aprovador por e-mail
      const aprovadorEmail = colaborador.responsavel_email || aprovador?.email;
      if (aprovadorEmail) {
        base44.functions.invoke('notificarAprovadorRequisicao', {
          aprovador_email: aprovadorEmail,
          aprovador_nome: colaborador.responsavel_nome || aprovador?.nome_completo || '',
          requisicao_id: requisicao.id,
          numero: numeroRequisicao,
          colaborador_nome: colaborador.nome_completo,
          colaborador_email: colaborador.email,
          item: data.item,
          urgencia: data.urgencia,
          justificativa: data.justificativa,
          valor_minimo: data.valor_minimo,
          valor_maximo: data.valor_maximo,
        }).catch(() => {});
      }

      return numeroRequisicao;
    },
    onSuccess: (numero) => {
      setSubmitted(numero);
    },
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.item.trim() || !formData.justificativa.trim()) return;
    createMutation.mutate(formData);
  };

  if (submitted) {
    return (
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Requisição Enviada!</h2>
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 my-4">
          <p className="text-sm text-yellow-800 mb-1 font-semibold">Número da Requisição:</p>
          <p className="text-3xl font-bold font-mono">{submitted}</p>
        </div>
        <p className="text-muted-foreground text-sm mb-6">Sua requisição foi enviada para aprovação do seu responsável.</p>
        <Button onClick={onSuccess} className="bg-emerald-600 hover:bg-emerald-700 w-full">Ver Minhas Requisições</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
          <ShoppingCart className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Nova Requisição de Compra</h1>
          <p className="text-muted-foreground text-sm">Solicitante: {colaborador.nome_completo}</p>
        </div>
      </div>

      {!colaborador?.responsavel_id && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-amber-800 text-sm font-medium">⚠️ Atenção: você não possui um responsável/aprovador vinculado ao seu cadastro. Solicite ao administrador que configure isso antes de abrir uma requisição.</p>
        </div>
      )}

      {colaborador?.responsavel_id && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
          <strong>Aprovador responsável:</strong> {colaborador.responsavel_nome || aprovador?.nome_completo || 'Carregando...'}
        </div>
      )}

      <Card className="shadow-xl">
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-6 space-y-5">
            <div>
              <Label>Item / Produto <span className="text-red-500">*</span></Label>
              <Input
                required
                className="mt-1"
                placeholder="Ex: Notebook Dell Inspiron 15, Cadeira Ergonômica"
                value={formData.item}
                onChange={e => set('item', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantidade <span className="text-red-500">*</span></Label>
                <Input
                  required
                  type="number"
                  min="1"
                  className="mt-1"
                  value={formData.quantidade}
                  onChange={e => set('quantidade', Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Urgência</Label>
                <Select value={formData.urgencia} onValueChange={v => set('urgencia', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Baixa", "Média", "Alta", "Urgente"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Valor Estimado (Range)</Label>
              <p className="text-xs text-muted-foreground mb-2">Informe um valor mínimo e máximo estimado para a compra</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 pl-9"
                    placeholder="Mínimo"
                    value={formData.valor_minimo}
                    onChange={e => set('valor_minimo', e.target.value)}
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 pl-9"
                    placeholder="Máximo"
                    value={formData.valor_maximo}
                    onChange={e => set('valor_maximo', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Justificativa <span className="text-red-500">*</span></Label>
              <Textarea
                required
                rows={4}
                className="mt-1"
                placeholder="Explique por que este item é necessário e como será utilizado..."
                value={formData.justificativa}
                onChange={e => set('justificativa', e.target.value)}
              />
            </div>

            <div>
              <Label>Fornecedor Sugerido (opcional)</Label>
              <Input
                className="mt-1"
                placeholder="Ex: Amazon, Magazine Luiza, fornecedor específico"
                value={formData.fornecedor_sugerido}
                onChange={e => set('fornecedor_sugerido', e.target.value)}
              />
            </div>

            <div>
              <Label className="flex items-center gap-2"><Paperclip className="w-4 h-4" />Anexos (opcional)</Label>
              <p className="text-xs text-muted-foreground mb-2">Cotações, referências ou documentos relevantes</p>
              <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-lg p-4 hover:border-emerald-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  disabled={uploadingAnexo}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files);
                    if (!files.length) return;
                    setUploadingAnexo(true);
                    const novos = [...anexos];
                    for (const file of files) {
                      const { file_url } = await base44.integrations.Core.UploadFile({ file });
                      novos.push({ file_url, file_name: file.name, file_type: file.type });
                    }
                    setAnexos(novos);
                    setUploadingAnexo(false);
                    e.target.value = "";
                  }}
                />
                {uploadingAnexo
                  ? <><Loader2 className="w-4 h-4 animate-spin text-emerald-600" /><span className="text-sm text-emerald-600">Enviando...</span></>
                  : <><Paperclip className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Clique para anexar arquivos</span></>
                }
              </label>
              {anexos.length > 0 && (
                <div className="mt-2 space-y-1">
                  {anexos.map((a, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded px-3 py-1.5 text-sm">
                      <span className="truncate">📎 {a.file_name}</span>
                      <button type="button" onClick={() => setAnexos(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive ml-2">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <div className="border-t p-5 flex justify-between">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={createMutation.isPending || !colaborador?.responsavel_id}
            >
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : "Enviar Requisição"}
            </Button>
          </div>
        </form>
      </Card>

      {createMutation.isError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
          {createMutation.error?.message}
        </div>
      )}
    </div>
  );
}