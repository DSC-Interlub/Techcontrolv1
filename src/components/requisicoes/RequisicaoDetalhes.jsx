import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

const statusColors = {
  "Aguardando Aprovador": "bg-yellow-100 text-yellow-800",
  "Aguardando Diretor": "bg-blue-100 text-blue-800",
  "Aprovada": "bg-green-100 text-green-800",
  "Reprovada pelo Aprovador": "bg-red-100 text-red-800",
  "Reprovada pelo Diretor": "bg-red-100 text-red-800",
};

export default function RequisicaoDetalhes({ requisicao, colaboradorAtual, isAdmin, onAcao }) {
  const [comentario, setComentario] = useState("");
  const [acao, setAcao] = useState(null); // "aprovar" | "reprovar"

  const isAprovador = colaboradorAtual?.id === requisicao.aprovador_id;
  const podeAtuar = isAprovador && requisicao.status === 'Aguardando Aprovador';
  // Admin pode agir como diretor quando status é Aguardando Diretor
  const podeAtuarDiretor = isAdmin && requisicao.status === 'Aguardando Diretor';

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

  const valorRangeUnit = requisicao.valor_unitario_minimo && requisicao.valor_unitario_maximo
    ? `R$ ${Number(requisicao.valor_unitario_minimo).toLocaleString('pt-BR')} – R$ ${Number(requisicao.valor_unitario_maximo).toLocaleString('pt-BR')}`
    : requisicao.valor_unitario_minimo ? `A partir de R$ ${Number(requisicao.valor_unitario_minimo).toLocaleString('pt-BR')}` : null;

  const valorRangeTotal = requisicao.valor_minimo && requisicao.valor_maximo
    ? `R$ ${Number(requisicao.valor_minimo).toLocaleString('pt-BR')} – R$ ${Number(requisicao.valor_maximo).toLocaleString('pt-BR')}`
    : requisicao.valor_minimo ? `A partir de R$ ${Number(requisicao.valor_minimo).toLocaleString('pt-BR')}` : null;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Badge className={statusColors[requisicao.status]}>{requisicao.status}</Badge>
        <Badge variant="outline">{requisicao.urgencia}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><p className="text-muted-foreground">Solicitante</p><p className="font-medium">{requisicao.colaborador_nome}</p></div>
        <div><p className="text-muted-foreground">Área</p><p className="font-medium">{requisicao.colaborador_area}</p></div>
        <div><p className="text-muted-foreground">Aprovador</p><p className="font-medium">{requisicao.aprovador_nome || '—'}</p></div>
        <div><p className="text-muted-foreground">Data</p><p className="font-medium">{new Date(requisicao.created_date).toLocaleDateString('pt-BR')}</p></div>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
        <div><p className="text-muted-foreground text-xs uppercase tracking-wide">Item</p><p className="font-semibold text-foreground">{requisicao.item}</p></div>
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
          <div><p className="text-muted-foreground text-xs">Valor Unitário</p><p className="font-medium">{valorRangeUnit || "Não informado"}</p></div>
          <div><p className="text-muted-foreground text-xs">Valor Total</p><p className="font-medium">{valorRangeTotal || "Não informado"}</p></div>
        </div>
        {requisicao.fornecedor_sugerido && (
          <div><p className="text-muted-foreground text-xs">Fornecedor Sugerido</p><p className="font-medium">{requisicao.fornecedor_sugerido}</p></div>
        )}
      </div>

      <div>
        <p className="text-muted-foreground font-semibold mb-1">Justificativa</p>
        <p className="bg-muted/50 rounded p-3 text-foreground">{requisicao.justificativa}</p>
      </div>

      {requisicao.aprovador_comentario && (
        <div>
          <p className="text-muted-foreground font-semibold mb-1">Comentário do Aprovador</p>
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
          <p className="text-muted-foreground font-semibold mb-2">Anexos</p>
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
          <p className="text-muted-foreground font-semibold mb-2">Histórico</p>
          <div className="space-y-2">
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

      {/* Ações do aprovador (1º nível) */}
      {podeAtuar && (
        <div className="border-t pt-4 space-y-3">
          <p className="font-semibold text-foreground">Sua Análise</p>
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
                {acao === 'aprovar' ? '✅ Aprovar — a requisição será enviada ao diretor para aprovação final.' : '❌ Reprovar — o colaborador será notificado com sua devolutiva.'}
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

      {/* Ações do diretor (admin) */}
      {podeAtuarDiretor && (
        <div className="border-t pt-4 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-semibold text-blue-900 text-sm">⬆️ Aprovação do Diretor</p>
            <p className="text-xs text-blue-700 mt-0.5">Esta requisição foi aprovada pelo responsável e aguarda sua decisão final.</p>
          </div>
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
                {acao === 'aprovar' ? '✅ Aprovação final — aprovador e colaborador serão notificados.' : '❌ Reprovar — aprovador e colaborador serão notificados com a devolutiva.'}
              </div>
              <div>
                <Label>Comentário {acao === 'reprovar' ? '(obrigatório)' : '(opcional)'}</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  placeholder={acao === 'aprovar' ? 'Observação final (opcional)...' : 'Explique o motivo da reprovação...'}
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
                  {acaoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (acao === 'aprovar' ? 'Confirmar Aprovação Final' : 'Confirmar Reprovação')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}