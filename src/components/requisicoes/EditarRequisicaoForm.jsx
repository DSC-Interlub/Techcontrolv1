import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Loader2, Paperclip, X, CheckCircle } from "lucide-react";

export default function EditarRequisicaoForm({ requisicao, onCancel, onSuccess }) {
  const [formData, setFormData] = useState({
    item: requisicao.item || "",
    material: requisicao.material || "",
    cor: requisicao.cor || "",
    quantidade: requisicao.quantidade || 1,
    centro_custo_codigo: requisicao.centro_custo_codigo || "",
    centro_custo_nome: requisicao.centro_custo_nome || "",
    valor_unitario_minimo: requisicao.valor_unitario_minimo || "",
    valor_unitario_maximo: requisicao.valor_unitario_maximo || "",
    valor_minimo: requisicao.valor_minimo || "",
    valor_maximo: requisicao.valor_maximo || "",
    justificativa: requisicao.justificativa || "",
    urgencia: requisicao.urgencia || "Média",
    fornecedor_sugerido: requisicao.fornecedor_sugerido || "",
  });
  const [anexos, setAnexos] = useState(requisicao.anexos || []);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: centrosCusto = [] } = useQuery({
    queryKey: ['centros_custo_ativos'],
    queryFn: () => base44.entities.CentrosCusto.filter({ ativo: true }),
  });

  const editMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke('requisicaoComprasAction', {
        action: 'requisicao_editar',
        requisicao_id: requisicao.id,
        ...data,
        anexos,
      });
      return res;
    },
    onSuccess: () => setSubmitted(true),
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.item.trim() || !formData.justificativa.trim()) return;
    editMutation.mutate(formData);
  };

  if (submitted) {
    return (
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Requisição Reenviada!</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Sua requisição <strong>{requisicao.numero_requisicao}</strong> foi atualizada e enviada novamente para aprovação do seu responsável.
        </p>
        <Button onClick={onSuccess} className="bg-emerald-600 hover:bg-emerald-700 w-full">Voltar</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
          <Pencil className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Editar Requisição</h1>
          <p className="text-muted-foreground text-sm">{requisicao.numero_requisicao} · Ao salvar, a requisição voltará para o aprovador</p>
        </div>
      </div>

      <Card className="shadow-xl">
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-6 space-y-5">
            <div>
              <Label>Item / Produto <span className="text-red-500">*</span></Label>
              <Input required className="mt-1" placeholder="Ex: Notebook Dell Inspiron 15" value={formData.item} onChange={e => set('item', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Material (opcional)</Label>
                <Input className="mt-1" placeholder="Ex: Aço, Plástico, Alumínio, Madeira" value={formData.material} onChange={e => set('material', e.target.value)} />
              </div>
              <div>
                <Label>Cor (opcional)</Label>
                <Input className="mt-1" placeholder="Ex: Preto, Branco, Cinza" value={formData.cor} onChange={e => set('cor', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantidade <span className="text-red-500">*</span></Label>
                <Input required type="number" min="1" className="mt-1" value={formData.quantidade} onChange={e => set('quantidade', Number(e.target.value))} />
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
              <Label>Centro de Custo <span className="text-red-500">*</span></Label>
              <Select
                value={formData.centro_custo_codigo}
                onValueChange={v => {
                  const cc = centrosCusto.find(c => c.codigo === v);
                  set('centro_custo_codigo', v);
                  set('centro_custo_nome', cc?.nome || '');
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o centro de custo..." /></SelectTrigger>
                <SelectContent>
                  {[...centrosCusto].sort((a, b) => String(a.codigo).localeCompare(String(b.codigo))).map(cc => (
                    <SelectItem key={cc.id} value={cc.codigo}>{cc.codigo} — {cc.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor Unitário Estimado</Label>
              <p className="text-xs text-muted-foreground mb-2">Valor de uma unidade do item (range mín–máx)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input type="number" min="0" step="0.01" className="mt-1 pl-9" placeholder="Mín. unit." value={formData.valor_unitario_minimo} onChange={e => set('valor_unitario_minimo', e.target.value)} />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input type="number" min="0" step="0.01" className="mt-1 pl-9" placeholder="Máx. unit." value={formData.valor_unitario_maximo} onChange={e => set('valor_unitario_maximo', e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <Label>Valor Total Estimado</Label>
              <p className="text-xs text-muted-foreground mb-2">Valor total da compra (range mín–máx)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input type="number" min="0" step="0.01" className="mt-1 pl-9" placeholder="Mín. total" value={formData.valor_minimo} onChange={e => set('valor_minimo', e.target.value)} />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input type="number" min="0" step="0.01" className="mt-1 pl-9" placeholder="Máx. total" value={formData.valor_maximo} onChange={e => set('valor_maximo', e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <Label>Justificativa <span className="text-red-500">*</span></Label>
              <Textarea required rows={4} className="mt-1" placeholder="Explique a necessidade e o que mudou..." value={formData.justificativa} onChange={e => set('justificativa', e.target.value)} />
            </div>

            <div>
              <Label>Fornecedor Sugerido (opcional)</Label>
              <Input className="mt-1" placeholder="Ex: Amazon, fornecedor específico" value={formData.fornecedor_sugerido} onChange={e => set('fornecedor_sugerido', e.target.value)} />
            </div>

            <div>
              <Label className="flex items-center gap-2"><Paperclip className="w-4 h-4" />Anexos</Label>
              <p className="text-xs text-muted-foreground mb-2">Cotações, referências ou documentos relevantes</p>
              <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-lg p-4 hover:border-amber-400 transition-colors">
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" disabled={uploadingAnexo}
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
                  ? <><Loader2 className="w-4 h-4 animate-spin text-amber-600" /><span className="text-sm text-amber-600">Enviando...</span></>
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
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={editMutation.isPending}>
              {editMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar e Reenviar para Aprovação"}
            </Button>
          </div>
        </form>
      </Card>

      {editMutation.isError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
          {editMutation.error?.message}
        </div>
      )}
    </div>
  );
}