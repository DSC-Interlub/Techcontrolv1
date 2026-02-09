import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const problemasOpcoes = [
  "Travamentos frequentes",
  "Lentidão ao iniciar",
  "Aplicativos não abrem",
  "Tela azul (BSOD)",
  "Superaquecimento",
  "Barulho excessivo",
  "Bateria não segura carga",
  "Problemas com Wi-Fi",
  "Problemas com áudio",
  "Problemas com USB",
  "Sem problemas"
];

export default function AvaliacaoEquipamento({ equipamento, onChange }) {
  const handleCheckboxChange = (problema, checked) => {
    const problemas = equipamento.avaliacao_problemas || [];
    const novosProblemas = checked
      ? [...problemas, problema]
      : problemas.filter(p => p !== problema);
    onChange({ ...equipamento, avaliacao_problemas: novosProblemas });
  };

  const getScoreColor = (score) => {
    if (!score) return "text-gray-400";
    if (score < 30) return "text-green-600";
    if (score < 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score) => {
    if (!score) return null;
    if (score < 30) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score < 60) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  const getRecomendacaoColor = (recomendacao) => {
    if (recomendacao === "Manter") return "bg-green-100 text-green-800";
    if (recomendacao === "Upgrade") return "bg-yellow-100 text-yellow-800";
    if (recomendacao === "Substituir") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Score e Recomendação */}
      {equipamento.avaliacao_score !== undefined && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Resultado da Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                {getScoreIcon(equipamento.avaliacao_score)}
                <div>
                  <p className="text-sm text-gray-600">Score de Saúde</p>
                  <p className={`text-3xl font-bold ${getScoreColor(equipamento.avaliacao_score)}`}>
                    {equipamento.avaliacao_score?.toFixed(1) || "0"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Recomendação do Sistema</p>
                <Badge className={`text-lg px-4 py-2 ${getRecomendacaoColor(equipamento.avaliacao_recomendacao_sistema)}`}>
                  {equipamento.avaliacao_recomendacao_sistema || "Não avaliado"}
                </Badge>
              </div>
            </div>
            {equipamento.avaliacao_data && (
              <p className="text-xs text-gray-500 mt-4">
                Última avaliação: {new Date(equipamento.avaliacao_data).toLocaleString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulário de Avaliação */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Avaliação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Uso de Memória */}
            <div className="space-y-2">
              <Label>Uso de Memória RAM</Label>
              <Select
                value={equipamento.avaliacao_uso_memoria || ""}
                onValueChange={(value) => onChange({ ...equipamento, avaliacao_uso_memoria: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Menos de 50%">Menos de 50%</SelectItem>
                  <SelectItem value="50-70%">50-70%</SelectItem>
                  <SelectItem value="70-90%">70-90%</SelectItem>
                  <SelectItem value="Acima de 90%">Acima de 90%</SelectItem>
                  <SelectItem value="Não verificado">Não verificado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Armazenamento */}
            <div className="space-y-2">
              <Label>Tipo de Armazenamento</Label>
              <Select
                value={equipamento.avaliacao_tipo_armazenamento || ""}
                onValueChange={(value) => onChange({ ...equipamento, avaliacao_tipo_armazenamento: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SSD">SSD</SelectItem>
                  <SelectItem value="HD">HD</SelectItem>
                  <SelectItem value="Não informado">Não informado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Espaço Livre em Disco */}
            <div className="space-y-2">
              <Label>Espaço Livre em Disco</Label>
              <Select
                value={equipamento.avaliacao_espaco_disco || ""}
                onValueChange={(value) => onChange({ ...equipamento, avaliacao_espaco_disco: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mais de 100 GB">Mais de 100 GB</SelectItem>
                  <SelectItem value="50-100 GB">50-100 GB</SelectItem>
                  <SelectItem value="20-50 GB">20-50 GB</SelectItem>
                  <SelectItem value="Menos de 20 GB">Menos de 20 GB</SelectItem>
                  <SelectItem value="Não verificado">Não verificado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Versão do Windows */}
            <div className="space-y-2">
              <Label>Versão do Windows</Label>
              <Select
                value={equipamento.avaliacao_versao_windows || ""}
                onValueChange={(value) => onChange({ ...equipamento, avaliacao_versao_windows: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Windows 10">Windows 10</SelectItem>
                  <SelectItem value="Windows 11">Windows 11</SelectItem>
                  <SelectItem value="Outra">Outra</SelectItem>
                  <SelectItem value="Não informado">Não informado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status do Antivírus */}
            <div className="space-y-2">
              <Label>Status do Antivírus</Label>
              <Select
                value={equipamento.avaliacao_status_antivirus || ""}
                onValueChange={(value) => onChange({ ...equipamento, avaliacao_status_antivirus: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Desativado">Desativado</SelectItem>
                  <SelectItem value="Não possui">Não possui</SelectItem>
                  <SelectItem value="Não verificado">Não verificado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desempenho Percebido */}
            <div className="space-y-2">
              <Label>Desempenho Percebido</Label>
              <Select
                value={equipamento.avaliacao_desempenho || ""}
                onValueChange={(value) => onChange({ ...equipamento, avaliacao_desempenho: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Muito rápido">Muito rápido</SelectItem>
                  <SelectItem value="Bom">Bom</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Lento">Lento</SelectItem>
                  <SelectItem value="Muito lento">Muito lento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Problemas Percebidos */}
          <div className="space-y-2">
            <Label>Problemas Percebidos (múltipla escolha)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg">
              {problemasOpcoes.map((problema) => (
                <div key={problema} className="flex items-center space-x-2">
                  <Checkbox
                    id={problema}
                    checked={(equipamento.avaliacao_problemas || []).includes(problema)}
                    onCheckedChange={(checked) => handleCheckboxChange(problema, checked)}
                  />
                  <label
                    htmlFor={problema}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {problema}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Atende Necessidades */}
            <div className="space-y-2">
              <Label>Equipamento Atende as Necessidades?</Label>
              <Select
                value={equipamento.avaliacao_atende_necessidades || ""}
                onValueChange={(value) => onChange({ ...equipamento, avaliacao_atende_necessidades: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Parcialmente">Parcialmente</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recomendação do Usuário */}
            <div className="space-y-2">
              <Label>Recomendação do Usuário</Label>
              <Select
                value={equipamento.avaliacao_recomendacao_usuario || ""}
                onValueChange={(value) => onChange({ ...equipamento, avaliacao_recomendacao_usuario: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manter">Manter</SelectItem>
                  <SelectItem value="Upgrade">Upgrade</SelectItem>
                  <SelectItem value="Substituir">Substituir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nota de Satisfação */}
            <div className="space-y-2">
              <Label>Nota de Satisfação (0-10)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={equipamento.avaliacao_nota_satisfacao || ""}
                onChange={(e) => onChange({ ...equipamento, avaliacao_nota_satisfacao: parseFloat(e.target.value) || 0 })}
                placeholder="0 a 10"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações Livres</Label>
            <Textarea
              value={equipamento.avaliacao_observacoes || ""}
              onChange={(e) => onChange({ ...equipamento, avaliacao_observacoes: e.target.value })}
              placeholder="Descreva outros detalhes relevantes..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}