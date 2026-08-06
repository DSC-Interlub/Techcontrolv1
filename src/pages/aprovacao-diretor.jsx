import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, ShoppingCart, Paperclip, X, AlertCircle } from "lucide-react";

export default function AprovacaoDiretor() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const acaoParam = params.get('acao'); // "aprovar" | "reprovar"

  const [comentario, setComentario] = useState("");
  const [anexos, setAnexos] = useState([]);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);

  const [resultado, setResultado] = useState(null); // "liberado_cotacao" | "aprovado" | "reprovado" | "token_usado" | "erro" | "desconhecido"
  const [numeroReq, setNumeroReq] = useState("");
  const [statusAtual, setStatusAtual] = useState("");
  const [erroMsg, setErroMsg] = useState("");

  const acaoMutation = useMutation({
    mutationFn: async ({ acao, comentario, anexos }) => {
      const res = await base44.functions.invoke('requisicaoComprasAction', {
        action: acao === 'aprovar' ? 'diretor_aprovar' : 'diretor_reprovar',
        token,
        comentario,
        anexos
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.numero_requisicao) {
        setNumeroReq(data.numero_requisicao);
      }
      if (data?.status_atual) {
        setStatusAtual(data.status_atual);
      }

      if (data?.error === 'token_usado') {
        setResultado('token_usado');
        return;
      }

      if (data?.success) {
        if (data.action === 'liberado_cotacao') {
          setResultado('liberado_cotacao');
        } else if (data.action === 'aprovado') {
          setResultado('aprovado');
        } else if (data.action === 'reprovado') {
          setResultado('reprovado');
        } else {
          setResultado('desconhecido');
        }
      } else {
        setErroMsg(data?.error || 'Erro ao processar a requisição.');
        setResultado('erro');
      }
    },
    onError: (err) => {
      const respData = err?.response?.data;
      if (respData?.numero_requisicao) setNumeroReq(respData.numero_requisicao);
      if (respData?.status_atual) setStatusAtual(respData.status_atual);

      if (respData?.error === 'token_usado') {
        setResultado('token_usado');
        return;
      }

      setErroMsg(respData?.error || err.message || 'Erro ao processar a requisição.');
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
            <p className="text-muted-foreground mt-2 text-sm">Este link de aprovação não é válido ou está incompleto.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 1ª APROVAÇÃO DO DIRETOR -> LIBERADO PARA COTAÇÃO
  if (resultado === 'liberado_cotacao') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            {numeroReq && (
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-sm font-semibold">
                {numeroReq}
              </Badge>
            )}
            <h2 className="text-xl font-bold text-blue-900">1ª Aprovação Confirmada — Liberado para Cotação</h2>
            <p className="text-muted-foreground text-sm">
              A requisição foi autorizada para o setor de compras realizar a cotação de preços com fornecedores.
            </p>
            <p className="text-xs text-muted-foreground bg-gray-100 p-3 rounded-lg border">
              Você receberá um novo e-mail para a <strong>aprovação final</strong> assim que o comprador cadastrar o orçamento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2ª APROVAÇÃO DO DIRETOR -> APROVADO DEFINITIVAMENTE
  if (resultado === 'aprovado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            {numeroReq && (
              <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200 text-sm font-semibold">
                {numeroReq}
              </Badge>
            )}
            <h2 className="text-2xl font-bold text-green-800">Compra Aprovada Definitivamente</h2>
            <p className="text-muted-foreground text-sm">
              A requisição foi totalmente autorizada. O setor de compras e o solicitante foram notificados por e-mail.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // REPROVADO
  if (resultado === 'reprovado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            {numeroReq && (
              <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200 text-sm font-semibold">
                {numeroReq}
              </Badge>
            )}
            <h2 className="text-2xl font-bold text-red-800">Requisição Reprovada</h2>
            <p className="text-muted-foreground text-sm">
              O solicitante e o aprovador responsável foram notificados com a devolutiva.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // TOKEN JÁ USADO ANTERIORMENTE
  if (resultado === 'token_usado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-amber-900">Requisição Já Processada</h2>
            <p className="text-muted-foreground text-sm">
              Esta requisição {numeroReq ? <strong className="text-foreground">({numeroReq})</strong> : ''} já foi processada anteriormente.
            </p>
            {statusAtual && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-900">
                Status atual: <Badge className="ml-1 bg-amber-200 text-amber-900 font-bold">{statusAtual}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // AÇÃO DESCONHECIDA
  if (resultado === 'desconhecido') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <XCircle className="w-12 h-12 text-amber-500 mx-auto" />
            {numeroReq && (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-sm font-semibold">
                {numeroReq}
              </Badge>
            )}
            <h2 className="text-xl font-bold text-amber-900">Resposta Não Reconhecida</h2>
            <p className="text-muted-foreground text-sm">
              Não foi possível identificar o resultado desta ação. Por favor, verifique a situação com o administrador de TI.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ERRO GENÉRICO
  if (resultado === 'erro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            {numeroReq && (
              <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200 text-sm font-semibold">
                {numeroReq}
              </Badge>
            )}
            <h2 className="text-xl font-bold text-red-800">Não foi possível processar</h2>
            <p className="text-muted-foreground text-sm">{erroMsg || "Verifique as informações ou entre em contato com o administrador de TI."}</p>
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
              rows={3}
              placeholder={acaoParam === 'aprovar' ? 'Adicione um comentário se desejar...' : 'Explique o motivo da reprovação...'}
              value={comentario}
              onChange={e => setComentario(e.target.value)}
            />
          </div>

          {/* CAMPO DE ANEXOS OPCIONAIS DO DIRETOR */}
          <div>
            <Label className="flex items-center gap-2"><Paperclip className="w-4 h-4" />Anexos / Documentos de Apoio (opcional)</Label>
            <label className="mt-1 flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 bg-white rounded-lg p-3 hover:border-blue-500 transition-colors">
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
                ? <><Loader2 className="w-4 h-4 animate-spin text-blue-600" /><span className="text-xs text-blue-700">Enviando arquivos...</span></>
                : <><Paperclip className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-700 font-medium">Anexar documento / parecer (opcional)</span></>
              }
            </label>
            {anexos.length > 0 && (
              <div className="mt-2 space-y-1">
                {anexos.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-white rounded px-3 py-1.5 text-xs border">
                    <span className="truncate font-medium">📎 {a.file_name}</span>
                    <button type="button" onClick={() => setAnexos(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive ml-2">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            className={`w-full py-6 text-base font-bold ${acaoParam === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            disabled={acaoMutation.isPending || uploadingAnexo || (acaoParam === 'reprovar' && !comentario.trim())}
            onClick={() => acaoMutation.mutate({ acao: acaoParam, comentario, anexos })}
          >
            {acaoMutation.isPending
              ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processando...</>
              : acaoParam === 'aprovar' ? '✅ Confirmar Aprovação' : '❌ Confirmar Reprovação'
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}