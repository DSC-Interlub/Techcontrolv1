import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, Settings } from "lucide-react";

export default function ConfiguracoesDiretor() {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [salvo, setSalvo] = useState(false);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["config_diretor_email"],
    queryFn: () => base44.entities.Configuracoes.filter({ chave: "diretor_email" }),
  });

  const config = configs[0];

  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (config?.id) {
        await base44.entities.Configuracoes.update(config.id, { valor: emailInput });
      } else {
        await base44.entities.Configuracoes.create({
          chave: "diretor_email",
          valor: emailInput,
          descricao: "E-mail do diretor que recebe e aprova requisições de compra",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_diretor_email"] });
      setEditando(false);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    },
  });

  const iniciarEdicao = () => {
    setEmailInput(config?.valor || "");
    setEditando(true);
    setSalvo(false);
  };

  if (isLoading) return <p className="text-muted-foreground text-sm py-2"><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Carregando...</p>;

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <p className="font-semibold text-sm">Configurações de Aprovação</p>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">E-mail do Diretor (aprovação final)</Label>
          {!editando ? (
            <div className="flex items-center gap-3 mt-1">
              <p className="flex-1 text-sm font-medium bg-muted/40 rounded px-3 py-2 border">
                {config?.valor || <span className="text-muted-foreground italic">Não configurado</span>}
              </p>
              <Button variant="outline" size="sm" onClick={iniciarEdicao}>Editar</Button>
              {salvo && <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Salvo!</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="email"
                className="flex-1"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="diretor@empresa.com"
                autoFocus
              />
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                disabled={salvarMutation.isPending || !emailInput.trim()}
                onClick={() => salvarMutation.mutate()}
              >
                {salvarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditando(false)}>Cancelar</Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Este e-mail receberá o link de aprovação quando um aprovador aprovar uma requisição.</p>
        </div>
      </CardContent>
    </Card>
  );
}