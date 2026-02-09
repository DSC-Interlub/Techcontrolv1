import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const pesosIniciais = [
  // Uso de Memória
  { campo: "avaliacao_uso_memoria", opcao: "Menos de 50%", peso: 0, descricao: "Uso ideal de memória" },
  { campo: "avaliacao_uso_memoria", opcao: "50-70%", peso: 3, descricao: "Uso moderado" },
  { campo: "avaliacao_uso_memoria", opcao: "70-90%", peso: 7, descricao: "Uso elevado" },
  { campo: "avaliacao_uso_memoria", opcao: "Acima de 90%", peso: 12, descricao: "Uso crítico" },
  { campo: "avaliacao_uso_memoria", opcao: "Não verificado", peso: 5, descricao: "Não verificado" },
  
  // Tipo de Armazenamento
  { campo: "avaliacao_tipo_armazenamento", opcao: "SSD", peso: 0, descricao: "Armazenamento moderno" },
  { campo: "avaliacao_tipo_armazenamento", opcao: "HD", peso: 10, descricao: "Tecnologia antiga" },
  { campo: "avaliacao_tipo_armazenamento", opcao: "Não informado", peso: 5, descricao: "Não informado" },
  
  // Espaço Livre em Disco
  { campo: "avaliacao_espaco_disco", opcao: "Mais de 100 GB", peso: 0, descricao: "Espaço suficiente" },
  { campo: "avaliacao_espaco_disco", opcao: "50-100 GB", peso: 3, descricao: "Espaço moderado" },
  { campo: "avaliacao_espaco_disco", opcao: "20-50 GB", peso: 7, descricao: "Espaço baixo" },
  { campo: "avaliacao_espaco_disco", opcao: "Menos de 20 GB", peso: 12, descricao: "Espaço crítico" },
  { campo: "avaliacao_espaco_disco", opcao: "Não verificado", peso: 5, descricao: "Não verificado" },
  
  // Versão do Windows
  { campo: "avaliacao_versao_windows", opcao: "Windows 11", peso: 0, descricao: "Versão atual" },
  { campo: "avaliacao_versao_windows", opcao: "Windows 10", peso: 3, descricao: "Versão anterior" },
  { campo: "avaliacao_versao_windows", opcao: "Outra", peso: 10, descricao: "Versão desatualizada" },
  { campo: "avaliacao_versao_windows", opcao: "Não informado", peso: 5, descricao: "Não informado" },
  
  // Status do Antivírus
  { campo: "avaliacao_status_antivirus", opcao: "Ativo", peso: 0, descricao: "Protegido" },
  { campo: "avaliacao_status_antivirus", opcao: "Desativado", peso: 15, descricao: "Risco de segurança" },
  { campo: "avaliacao_status_antivirus", opcao: "Não possui", peso: 20, descricao: "Sem proteção" },
  { campo: "avaliacao_status_antivirus", opcao: "Não verificado", peso: 10, descricao: "Não verificado" },
  
  // Desempenho Percebido
  { campo: "avaliacao_desempenho", opcao: "Muito rápido", peso: 0, descricao: "Excelente desempenho" },
  { campo: "avaliacao_desempenho", opcao: "Bom", peso: 2, descricao: "Bom desempenho" },
  { campo: "avaliacao_desempenho", opcao: "Normal", peso: 5, descricao: "Desempenho adequado" },
  { campo: "avaliacao_desempenho", opcao: "Lento", peso: 12, descricao: "Desempenho ruim" },
  { campo: "avaliacao_desempenho", opcao: "Muito lento", peso: 20, descricao: "Desempenho crítico" },
  
  // Atende Necessidades
  { campo: "avaliacao_atende_necessidades", opcao: "Sim", peso: 0, descricao: "Totalmente adequado" },
  { campo: "avaliacao_atende_necessidades", opcao: "Parcialmente", peso: 8, descricao: "Parcialmente adequado" },
  { campo: "avaliacao_atende_necessidades", opcao: "Não", peso: 15, descricao: "Inadequado" },
  
  // Recomendação do Usuário
  { campo: "avaliacao_recomendacao_usuario", opcao: "Manter", peso: 0, descricao: "Usuário satisfeito" },
  { campo: "avaliacao_recomendacao_usuario", opcao: "Upgrade", peso: 10, descricao: "Necessita melhorias" },
  { campo: "avaliacao_recomendacao_usuario", opcao: "Substituir", peso: 20, descricao: "Necessita troca" },
];

export default function ConfigurarPesosAvaliacao() {
  const queryClient = useQueryClient();
  const [mensagem, setMensagem] = useState(null);

  const { data: pesos = [] } = useQuery({
    queryKey: ['pesos_avaliacao'],
    queryFn: () => base44.entities.PesosAvaliacao.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PesosAvaliacao.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesos_avaliacao'] });
      setMensagem({ tipo: "sucesso", texto: "Pesos configurados com sucesso!" });
      setTimeout(() => setMensagem(null), 3000);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PesosAvaliacao.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesos_avaliacao'] });
    },
  });

  const handleInicializar = () => {
    if (confirm("Isso irá criar os pesos padrão. Continuar?")) {
      createMutation.mutate(pesosIniciais);
    }
  };

  const handleRestaurar = () => {
    if (confirm("Isso irá restaurar todos os pesos para os valores padrão. Continuar?")) {
      const updates = pesos.map((peso) => {
        const pesoInicial = pesosIniciais.find(p => p.campo === peso.campo && p.opcao === peso.opcao);
        if (pesoInicial) {
          return updateMutation.mutateAsync({ id: peso.id, data: { peso: pesoInicial.peso } });
        }
      });
      Promise.all(updates).then(() => {
        setMensagem({ tipo: "sucesso", texto: "Pesos restaurados com sucesso!" });
        setTimeout(() => setMensagem(null), 3000);
      });
    }
  };

  const handlePesoChange = (id, novoPeso) => {
    updateMutation.mutate({ id, data: { peso: parseFloat(novoPeso) || 0 } });
  };

  const agruparPorCampo = () => {
    const grupos = {};
    pesos.forEach(peso => {
      if (!grupos[peso.campo]) grupos[peso.campo] = [];
      grupos[peso.campo].push(peso);
    });
    return grupos;
  };

  const getNomeCampo = (campo) => {
    const nomes = {
      "avaliacao_uso_memoria": "Uso de Memória",
      "avaliacao_tipo_armazenamento": "Tipo de Armazenamento",
      "avaliacao_espaco_disco": "Espaço Livre em Disco",
      "avaliacao_versao_windows": "Versão do Windows",
      "avaliacao_status_antivirus": "Status do Antivírus",
      "avaliacao_desempenho": "Desempenho Percebido",
      "avaliacao_atende_necessidades": "Atende Necessidades",
      "avaliacao_recomendacao_usuario": "Recomendação do Usuário",
    };
    return nomes[campo] || campo;
  };

  const grupos = agruparPorCampo();

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Configurar Pesos de Avaliação
              </h1>
              <p className="text-gray-500 mt-1">
                Configure os pesos para cálculo do score de saúde dos equipamentos
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {pesos.length === 0 ? (
              <Button onClick={handleInicializar} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Inicializar Pesos
              </Button>
            ) : (
              <Button onClick={handleRestaurar} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar Padrão
              </Button>
            )}
          </div>
        </div>

        {mensagem && (
          <Alert className={mensagem.tipo === "sucesso" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
            <AlertDescription>{mensagem.texto}</AlertDescription>
          </Alert>
        )}

        {pesos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">
                Nenhum peso configurado. Clique em "Inicializar Pesos" para criar a configuração padrão.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="font-semibold text-blue-900">Como funciona o sistema de pesos:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Quanto <strong>maior o peso</strong>, pior é a situação do equipamento</li>
                    <li>• O score final é a soma de todos os pesos das respostas selecionadas</li>
                    <li>• Score &lt; 30: Recomendação = <strong>Manter</strong></li>
                    <li>• Score 30-60: Recomendação = <strong>Upgrade</strong></li>
                    <li>• Score &gt; 60: Recomendação = <strong>Substituir</strong></li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {Object.entries(grupos).map(([campo, pesosCampo]) => (
              <Card key={campo}>
                <CardHeader className="bg-gray-50">
                  <CardTitle className="text-lg">{getNomeCampo(campo)}</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {pesosCampo.map((peso) => (
                      <div key={peso.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div>
                          <Label className="font-medium">{peso.opcao}</Label>
                          <p className="text-xs text-gray-500">{peso.descricao}</p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex items-center gap-4">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={peso.peso}
                              onChange={(e) => handlePesoChange(peso.id, e.target.value)}
                              className="w-32"
                            />
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  peso.peso < 5 ? "bg-green-500" :
                                  peso.peso < 10 ? "bg-yellow-500" :
                                  peso.peso < 15 ? "bg-orange-500" :
                                  "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(peso.peso * 5, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}