import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Clock, CheckCircle, XCircle, Users } from "lucide-react";

export default function IndicadoresRequisicao({ requisicoes, pendentesAprovador, isAprovador, todasRequisicoes }) {
  const pendentes = requisicoes.filter(r => r.status === 'Aguardando Aprovador' || r.status === 'Aguardando Diretor').length;
  const aprovadas = requisicoes.filter(r => r.status === 'Aprovada').length;
  const reprovadas = requisicoes.filter(r => r.status?.startsWith('Reprovada')).length;

  if (isAprovador) {
    const totalGerenciados = todasRequisicoes.length;
    const pendentesGestor = todasRequisicoes.filter(r => r.status === 'Aguardando Aprovador').length;
    const aprovadasGestor = todasRequisicoes.filter(r => r.status === 'Aprovada').length;
    const reprovadasGestor = todasRequisicoes.filter(r => r.status?.startsWith('Reprovada')).length;

    return (
      <div className="mb-6 space-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Minhas Requisições</p>
          <div className="grid grid-cols-3 gap-3">
            <Card className={pendentes > 0 ? "border-yellow-300 bg-yellow-50" : ""}>
              <CardContent className="pt-4 pb-4 text-center">
                <Clock className={`w-5 h-5 mx-auto mb-1 ${pendentes > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
                <p className={`text-xl font-bold ${pendentes > 0 ? "text-yellow-700" : "text-foreground"}`}>{pendentes}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <p className="text-xl font-bold text-green-700">{aprovadas}</p>
                <p className="text-xs text-muted-foreground">Aprovadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <XCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
                <p className="text-xl font-bold text-red-600">{reprovadas}</p>
                <p className="text-xs text-muted-foreground">Reprovadas</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Equipe (você é aprovador)</p>
          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <p className="text-xl font-bold text-blue-700">{totalGerenciados}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card className={pendentesGestor > 0 ? "border-amber-300 bg-amber-50" : ""}>
              <CardContent className="pt-4 pb-4 text-center">
                <Clock className={`w-5 h-5 mx-auto mb-1 ${pendentesGestor > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
                <p className={`text-xl font-bold ${pendentesGestor > 0 ? "text-amber-700" : "text-foreground"}`}>{pendentesGestor}</p>
                <p className="text-xs text-muted-foreground">Aguardando</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <p className="text-xl font-bold text-green-700">{aprovadasGestor}</p>
                <p className="text-xs text-muted-foreground">Aprovadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <XCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
                <p className="text-xl font-bold text-red-600">{reprovadasGestor}</p>
                <p className="text-xs text-muted-foreground">Reprovadas</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <Card className={pendentes > 0 ? "border-yellow-300 bg-yellow-50" : ""}>
        <CardContent className="pt-4 pb-4 text-center">
          <Clock className={`w-5 h-5 mx-auto mb-1 ${pendentes > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
          <p className={`text-xl font-bold ${pendentes > 0 ? "text-yellow-700" : "text-foreground"}`}>{pendentes}</p>
          <p className="text-xs text-muted-foreground">Em Andamento</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
          <p className="text-xl font-bold text-green-700">{aprovadas}</p>
          <p className="text-xs text-muted-foreground">Aprovadas</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <XCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
          <p className="text-xl font-bold text-red-600">{reprovadas}</p>
          <p className="text-xs text-muted-foreground">Reprovadas</p>
        </CardContent>
      </Card>
    </div>
  );
}