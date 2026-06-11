import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader2, ShoppingCart } from "lucide-react";

export default function AprovacaoDiretor() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const acaoParam = params.get('acao'); // "aprovar" | "reprovar"

  const [comentario, setComentario] = useState("");
  const [resultado, setResultado] = useState(null); // "aprovado" | "reprovado" | "erro"
  const [erroMsg, setErroMsg] = useState("");

  const acaoMutation = useMutation({
    mutationFn: async ({ acao, comentario }) => {
      const res = await base44.functions.invoke('requisicaoComprasAction', {
        action: acao === 'aprovar' ? 'diretor_aprovar' : 'diretor_reprovar',
        token,
        comentario,
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        setResultado(data.action === 'aprovado' ? 'aprovado' : 'reprovado');
      } else {
        setErroMsg(data?.error || 'Erro ao processar.');
        setResultado('erro');
      }
    },
    onError: (err) => {
      setErroMsg(err?.response?.data?.error || err.message || 'Erro ao processar a requisição.');
      setResultado('erro');
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-red-800">Link Inválido</h2>
            <p className="text-muted-foreground mt-2">Este link não é válido ou está incompleto.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resultado === 'aprovado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Requisição Aprovada!</h2>
            <p className="text-muted-foreground">O aprovador e o colaborador foram notificados por e-mail.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resultado === 'reprovado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-2">Requisição Reprovada</h2>
            <p className="text-muted-foreground">O aprovador e o colaborador foram notificados com a devolutiva.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resultado === 'erro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-red-800">Erro</h2>
            <p className="text-muted-foreground mt-2">{erroMsg}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">TechControl</h1>
              <p className="text-blue-100 text-sm">Aprovação de Requisição de Compra</p>
            </div>
          </div>
        </div>

        <CardContent className="pt-6 pb-6 space-y-5">
          {acaoParam === 'aprovar' ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Aprovar Requisição</p>
              <p className="text-sm text-green-700 mt-1">Clique no botão abaixo para confirmar a aprovação desta requisição.</p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="font-semibold text-red-800">Reprovar Requisição</p>
              <p className="text-sm text-red-700 mt-1">Informe o motivo da reprovação abaixo.</p>
            </div>
          )}

          <div>
            <Label>
              {acaoParam === 'aprovar' ? 'Observação (opcional)' : 'Motivo da Reprovação *'}
            </Label>
            <Textarea
              className="mt-1"
              rows={4}
              placeholder={acaoParam === 'aprovar' ? 'Adicione um comentário se desejar...' : 'Explique o motivo da reprovação...'}
              value={comentario}
              onChange={e => setComentario(e.target.value)}
            />
          </div>

          <Button
            className={`w-full ${acaoParam === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            disabled={acaoMutation.isPending || (acaoParam === 'reprovar' && !comentario.trim())}
            onClick={() => acaoMutation.mutate({ acao: acaoParam, comentario })}
          >
            {acaoMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</>
              : acaoParam === 'aprovar' ? '✅ Confirmar Aprovação' : '❌ Confirmar Reprovação'
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}