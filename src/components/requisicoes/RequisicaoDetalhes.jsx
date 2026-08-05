import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, Loader2, Pencil, ShoppingBag, Paperclip, X } from "lucide-react";
import EditarRequisicaoForm from "./EditarRequisicaoForm";

const statusColors = {
  "Aguardando Aprovador": "bg-yellow-100 text-yellow-800",
  "Aguardando Diretor": "bg-blue-100 text-blue-800",
  "Aguardando Cotação": "bg-amber-100 text-amber-800 border-amber-300",
  "Aguardando Aprovação Final": "bg-purple-100 text-purple-800 border-purple-300",
  "Aprovada": "bg-green-100 text-green-800",
  "Reprovada pelo Aprovador": "bg-red-100 text-red-800",
  "Reprovada pelo Diretor": "bg-red-100 text-red-800",
};

export default function RequisicaoDetalhes({ requisicao, colaboradorAtual, isAdmin, onAcao }) {
  const [comentario, setComentario] = useState("");
  const [acao, setAcao] = useState(null); // "aprovar" | "reprovar"
  const [editando, setEditando] = useState(false);

  // Estados para formulário de cotação (comprador)
  const [cotacaoValor, setCotacaoValor] = useState(requisicao.cotacao_valor || "");
  const [cotacaoFornecedor, setCotacaoFornecedor] = useState(requisicao.cotacao_fornecedor || "");
  const [cotacaoAnexos, setCotacaoAnexos] = useState(requisicao.cotacao_anexos || []);
  const [cotacaoComentario, setCotacaoComentario] = useState(requisicao.cotacao_comentario || "");
  const [uploadingCotacaoAnexo, setUploadingCotacaoAnexo] = useState(false);

  const isAprovador = colaboradorAtual?.id === requisicao.aprovador_id;
  const isSolicitante = colaboradorAtual?.id === requisicao.colaborador_id;
  const isComprador = !!(colaboradorAtual?.eh_comprador || isAdmin);

  const podeAtuarAprovador = isAprovador && requisicao.status === 'Aguardando Aprovador';
  const podeAtuarDiretor = isAdmin && (requisicao.status === 'Aguardando Diretor' || requisicao.status === 'Aguardando Aprovação Final');
  const podeAtuarComprador = isComprador && requisicao.status === 'Aguardando Cotação';

  // Solicitante ou admin podem editar se a requisição foi reprovada
  const podeEditar = (isSolicitante || isAdmin) &&
    ['Reprovada pelo Aprovador', 'Reprovada pelo Diretor'].includes(requisicao.status);

  const acaoMutation = useMutation({
    mutationFn: async (tipo) => {
      if (podeAtuarDiretor) {
        return base44.functions.invoke('requisicaoComprasAction', {
          action: tipo === 'aprovar' ? 'diretor_aprovar' : 'diretor_reprovar',
          token: requisicao.token_aprovacao,
          comentario,
        });
      }
      return base44.functions.invoke('requisicaoComprasAction', {
        action: tipo === 'aprovar' ? 'aprovador_aprovar' : 'aprovador_reprovar',
        requisicao_id: requisicao.id,
        comentario,
        aprovador_email: colaboradorAtual?.email || requisicao.aprovador_email,
      });
    },
    onSuccess: () => {
      onAcao();
    },
  });

  const cotacaoMutation = useMutation({
    mutationFn: async () => {
      if (!cotacaoValor || !cotacaoFornecedor) {
        throw new Error('Valor da cotação e fornecedor são obrigatórios.');
      }
      return base44.functions.invoke('requisicaoComprasAction', {
        action: 'comprador_enviar_cotacao',
        requisicao_id: requisicao.id,
        cotacao_valor: cotacaoValor,
        cotacao_fornecedor: cotacaoFornecedor,
        cotacao_anexos: cotacaoAnexos,
        cotacao_comentario: cotacaoComentario,
        comprador_id: colaboradorAtual?.id,
        comprador_nome: colaboradorAtual?.nome_completo || 'Comprador',
      });
    },
    onSuccess: () => {
      onAcao();
    },
  });

  const valorRangeUnit = requisicao.valor_unitario_minimo && requisicao.valor_unitario_maximo
    ? `R$ ${Number(requisicao.valor_unitario_minimo).toLocaleString('pt-BR')} – R$ ${Number(requisicao.valor_unitario_maximo).toLocaleString('pt-BR')}`
    : requisicao.valor_unitario_minimo ? `A partir de R$ ${Number(requisicao.valor_unitario_minimo).toLocaleString('pt-BR')}` : null;

  const valorRangeTotal = requisicao.valor_minimo && requisicao.valor_maximo
    ? `R$ ${Number(requisicao.valor_minimo).toLocaleString('pt-BR')} – R$ ${Number(requisicao.valor_maximo).toLocaleString('pt-BR')}`
    : requisicao.valor_minimo ? `A partir de R$ ${Number(requisicao.valor_minimo).toLocaleString('pt-BR')}` : null;

  if (editando) {
    return (
      <EditarRequisicaoForm
        requisicao={requisicao}
        onCancel={() => setEditando(false)}
        onSuccess={() => { setEditando(false); onAcao(); }}
      />
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={statusColors[requisicao.status] || "bg-gray-100 text-gray-800"}>{requisicao.status}</Badge>
          <Badge variant="outline">{requisicao.urgencia}</Badge>
        </div>
        {podeEditar && (
          <Button size="sm" variant="outline" className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => setEditando(true)}>
            <Pencil className="w-3.5 h-3.5" />Editar e Reenviar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><p className="text-muted-foreground">Solicitante</p><p className="font-medium">{requisicao.colaborador_nome}</p></div>
        <div><p className="text-muted-foreground">Área</p><p className="font-medium">{requisicao.colaborador_area}</p></div>
        <div><p className="text-muted-foreground">Aprovador Responsável</p><p className="font-medium">{requisicao.aprovador_nome || '—'}</p></div>
        <div><p className="text-muted-foreground">Data da Solicitação</p><p className="font-medium">{new Date(requisicao.created_date).toLocaleDateString('pt-BR')}</p></div>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
        <div><p className="text-muted-foreground text-xs uppercase tracking-wide">Item / Produto</p><p className="font-semibold text-foreground text-base">{requisicao.item}</p></div>

        {(requisicao.material || requisicao.cor) && (
          <div className="grid grid-cols-2 gap-3 border-t pt-2 mt-2">
            {requisicao.material && <div><p className="text-muted-foreground text-xs">Material</p><p className="font-medium">{requisicao.material}</p></div>}
            {requisicao.cor && <div><p className="text-muted-foreground text-xs">Cor</p><p className="font-medium">{requisicao.cor}</p></div>}
          </div>
        )}

        {requisicao.centro_custo_nome && (
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-muted-foreground text-xs">Centro de Custo</p><p className="font-medium">{requisicao.centro_custo_codigo} — {requisicao.centro_custo_nome}</p></div>
            <div><p className="text-muted-foreground text-xs">Quantidade</p><p className="font-medium">{requisicao.quantidade}</p></div>
          </div>
        )}
        {!requisicao.centro_custo_nome && (
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-muted-foreground text-xs">Quantidade</p><p className="font-medium">{requisicao.quantidade}</p></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-muted-foreground text-xs">Valor Unitário Estimado</p><p className="font-medium">{valorRangeUnit || "Não informado"}</p></div>
          <div><p className="text-muted-foreground text-xs">Valor Total Estimado</p><p className="font-medium">{valorRangeTotal || "Não informado"}</p></div>
        </div>
        {requisicao.fornecedor_sugerido && (
          <div><p className="text-muted-foreground text-xs">Fornecedor Sugerido</p><p className="font-medium">{requisicao.fornecedor_sugerido}</p></div>
        )}
      </div>

      <div>
        <p className="text-muted-foreground font-semibold mb-1">Justificativa</p>
        <p className="bg-muted/50 rounded p-3 text-foreground">{requisicao.justificativa}</p>
      </div>

      {/* BLOCO DE COTAÇÃO REALIZADA (se houver dados salvos) */}
      {(requisicao.cotacao_valor || requisicao.cotacao_fornecedor) && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-900 font-bold border-b border-emerald-200 pb-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>Dados da Cotação (Setor de Compras)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-emerald-800">Valor Cotado (R$)</p>
              <p className="text-lg font-bold text-emerald-900">R$ {Number(requisicao.cotacao_valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-800">Fornecedor Cotado</p>
              <p className="font-semibold text-emerald-950">{requisicao.cotacao_fornecedor}</p>
            </div>
          </div>
          {requisicao.cotacao_comprador_nome && (
            <p className="text-xs text-emerald-800">
              Comprador: <strong>{requisicao.cotacao_comprador_nome}</strong>
              {requisicao.cotacao_data ? ` em ${new Date(requisicao.cotacao_data).toLocaleDateString('pt-BR')}` : ''}
            </p>
          )}
          {requisicao.cotacao_comentario && (
            <div>
              <p className="text-xs text-emerald-800 font-medium">Comentário do Comprador</p>
              <p className="bg-white/80 rounded p-2.5 text-emerald-950 text-xs mt-1 border border-emerald-100">{requisicao.cotacao_comentario}</p>
            </div>
          )}
          {requisicao.cotacao_anexos?.length > 0 && (
            <div>
              <p className="text-xs text-emerald-800 font-medium mb-1">Orçamentos / Anexos da Cotação</p>
              <div className="space-y-1">
                {requisicao.cotacao_anexos.map((a, i) => (
                  <a key={i} href={a.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-emerald-700 hover:underline text-xs bg-white px-2.5 py-1 rounded border border-emerald-200 w-fit">
                    📎 {a.file_name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {requisicao.aprovador_comentario && (
        <div>
          <p className="text-muted-foreground font-semibold mb-1">Comentário do Aprovador Responsável</p>
          <p className="bg-blue-50 rounded p-3 text-blue-900">{requisicao.aprovador_comentario}</p>
        </div>
      )}

      {requisicao.diretor_comentario && (
        <div>
          <p className="text-muted-foreground font-semibold mb-1">Comentário do Diretor</p>
          <p className={`rounded p-3 ${requisicao.status === 'Aprovada' ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>{requisicao.diretor_comentario}</p>
        </div>
      )}

      {requisicao.anexos?.length > 0 && (
        <div>
          <p className="text-muted-foreground font-semibold mb-2">Anexos da Solicitação</p>
          <div className="space-y-1">
            {requisicao.anexos.map((a, i) => (
              <a key={i} href={a.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline text-sm">
                📎 {a.file_name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Histórico */}
      {requisicao.historico?.length > 0 && (
        <div>
          <p className="text-muted-foreground font-semibold mb-2">Histórico da Requisição</p>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3 bg-muted/20">
            {requisicao.historico.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                <div>
                  <span className="text-foreground font-medium">{new Date(h.data_hora).toLocaleString('pt-BR')}</span>
                  {' — '}{h.descricao}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AÇÕES DO COMPRADOR: Cadastrar Cotação */}
      {podeAtuarComprador && (
        <div className="border-t pt-4 space-y-4 bg-amber-50/50 p-4 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <ShoppingBag className="w-5 h-5 text-amber-600" />
            <span>Elaborar Cotação / Orçamento (Setor de Compras)</span>
          </div>
          <p className="text-xs text-amber-800">
            Esta requisição foi autorizada pelo diretor para cotação. Preencha os valores e o fornecedor cotado e envie para a aprovação final.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Valor da Cotação (R$) <span className="text-red-500">*</span></Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-9 bg-white"
                  placeholder="0,00"
                  value={cotacaoValor}
                  onChange={e => setCotacaoValor(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Fornecedor Cotado <span className="text-red-500">*</span></Label>
              <Input
                className="mt-1 bg-white"
                placeholder="Ex: Kalunga, Dell, Kabum, Fornecedor X"
                value={cotacaoFornecedor}
                onChange={e => setCotacaoFornecedor(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Comentários / Observações do Comprador</Label>
            <Textarea
              className="mt-1 bg-white"
              rows={3}
              placeholder="Descreva detalhes da cotação, prazos de entrega ou condições comerciais..."
              value={cotacaoComentario}
              onChange={e => setCotacaoComentario(e.target.value)}
            />
          </div>

          <div>
            <Label className="flex items-center gap-2"><Paperclip className="w-4 h-4" />Anexar Orçamentos / Propostas (PDF/Docs)</Label>
            <label className="mt-1 flex items-center gap-2 cursor-pointer border-2 border-dashed border-amber-300 bg-white rounded-lg p-3 hover:border-amber-500 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                disabled={uploadingCotacaoAnexo}
                onChange={async (e) => {
                  const files = Array.from(e.target.files);
                  if (!files.length) return;
                  setUploadingCotacaoAnexo(true);
                  const novos = [...cotacaoAnexos];
                  for (const file of files) {
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    novos.push({ file_url, file_name: file.name, file_type: file.type });
                  }
                  setCotacaoAnexos(novos);
                  setUploadingCotacaoAnexo(false);
                  e.target.value = "";
                }}
              />
              {uploadingCotacaoAnexo
                ? <><Loader2 className="w-4 h-4 animate-spin text-amber-600" /><span className="text-xs text-amber-700">Enviando arquivos...</span></>
                : <><Paperclip className="w-4 h-4 text-amber-600" /><span className="text-xs text-amber-800 font-medium">Clique para anexar PDF do orçamento / proposta</span></>
              }
            </label>
            {cotacaoAnexos.length > 0 && (
              <div className="mt-2 space-y-1">
                {cotacaoAnexos.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-white rounded px-3 py-1.5 text-xs border border-amber-200">
                    <span className="truncate font-medium">📎 {a.file_name}</span>
                    <button type="button" onClick={() => setCotacaoAnexos(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive ml-2">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 py-5"
            disabled={cotacaoMutation.isPending || !cotacaoValor || !cotacaoFornecedor}
            onClick={() => cotacaoMutation.mutate()}
          >
            {cotacaoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar para Aprovação Final do Diretor"}
          </Button>

          {cotacaoMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs">
              {cotacaoMutation.error?.message}
            </div>
          )}
        </div>
      )}

      {/* Ações do aprovador (1º nível) */}
      {podeAtuarAprovador && (
        <div className="border-t pt-4 space-y-3">
          <p className="font-semibold text-foreground">Sua Análise como Aprovador Responsável</p>
          {!acao ? (
            <div className="flex gap-3">
              <Button className="flex-1 bg-green-600 hover:bg-green-700 gap-2" onClick={() => setAcao('aprovar')}>
                <CheckCircle className="w-4 h-4" />Aprovar
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 gap-2" onClick={() => setAcao('reprovar')}>
                <XCircle className="w-4 h-4" />Reprovar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`rounded-lg p-3 text-sm font-medium ${acao === 'aprovar' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {acao === 'aprovar' ? '✅ Aprovar — a requisição será enviada ao diretor para autorizar a cotação.' : '❌ Reprovar — o colaborador será notificado com sua devolutiva.'}
              </div>
              <div>
                <Label>Comentário {acao === 'reprovar' ? '(obrigatório)' : '(opcional)'}</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  placeholder={acao === 'aprovar' ? 'Adicione um comentário para o diretor (opcional)...' : 'Explique o motivo da reprovação...'}
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setAcao(null); setComentario(""); }}>
                  Cancelar
                </Button>
                <Button
                  className={`flex-1 ${acao === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  disabled={acaoMutation.isPending || (acao === 'reprovar' && !comentario.trim())}
                  onClick={() => acaoMutation.mutate(acao)}
                >
                  {acaoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (acao === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Reprovação')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ações do diretor (admin) - Fase 1 ou Fase 2 */}
      {podeAtuarDiretor && (
        <div className="border-t pt-4 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-semibold text-blue-900 text-sm">
              {requisicao.status === 'Aguardando Diretor' ? '⬆️ 1ª Aprovação do Diretor (Liberar para Cotação)' : '💰 2ª Aprovação do Diretor (Aprovação Final da Cotação)'}
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              {requisicao.status === 'Aguardando Diretor'
                ? 'Ao aprovar nesta fase, a requisição é liberada para o comprador realizar os orçamentos.'
                : 'Esta requisição já possui a cotação final e aguarda sua autorização definitiva de compra.'}
            </p>
          </div>
          {!acao ? (
            <div className="flex gap-3">
              <Button className="flex-1 bg-green-600 hover:bg-green-700 gap-2" onClick={() => setAcao('aprovar')}>
                <CheckCircle className="w-4 h-4" />
                {requisicao.status === 'Aguardando Diretor' ? 'Liberar para Cotação' : 'Aprovar Compra Final'}
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 gap-2" onClick={() => setAcao('reprovar')}>
                <XCircle className="w-4 h-4" />Reprovar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`rounded-lg p-3 text-sm font-medium ${acao === 'aprovar' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {acao === 'aprovar'
                  ? (requisicao.status === 'Aguardando Diretor' ? '✅ Liberar para cotação — o comprador será avisado.' : '✅ Aprovação final — compra totalmente autorizada!')
                  : '❌ Reprovar — solicitante e aprovador serão notificados.'}
              </div>
              <div>
                <Label>Comentário {acao === 'reprovar' ? '(obrigatório)' : '(opcional)'}</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  placeholder={acao === 'aprovar' ? 'Observação (opcional)...' : 'Explique o motivo da reprovação...'}
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setAcao(null); setComentario(""); }}>
                  Cancelar
                </Button>
                <Button
                  className={`flex-1 ${acao === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  disabled={acaoMutation.isPending || (acao === 'reprovar' && !comentario.trim())}
                  onClick={() => acaoMutation.mutate(acao)}
                >
                  {acaoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (acao === 'aprovar' ? 'Confirmar' : 'Confirmar Reprovação')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}