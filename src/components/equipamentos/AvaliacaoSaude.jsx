import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

const problemasOpcoes = [
  "Travamentos frequentes",
  "Aplicativos não abrem",
  "Superaquecimento",
  "Lentidão ao iniciar",
  "Tela azul (BSOD)",
  "Ruídos estranhos",
  "Bateria com problema",
  "Conexão Wi-Fi instável"
];

export default function AvaliacaoSaude({ formData, setFormData }) {
  const [problemasSelecionados, setProblemasSelecionados] = useState(
    formData.saude_problemas || []
  );

  const handleProblemaChange = (problema, checked) => {
    let novosProblemas;
    if (checked) {
      novosProblemas = [...problemasSelecionados, problema];
    } else {
      novosProblemas = problemasSelecionados.filter(p => p !== problema);
    }
    setProblemasSelecionados(novosProblemas);
    setFormData({ ...formData, saude_problemas: novosProblemas });
  };

  const handleAvaliacaoChange = (campo, valor) => {
    const novosDados = { ...formData, [campo]: valor };
    
    // Calcular score e recomendação automaticamente
    const resultado = calcularSaude(novosDados);
    
    setFormData({
      ...novosDados,
      saude_score: resultado.score,
      saude_status: resultado.status,
      saude_recomendacao: resultado.recomendacao,
      saude_data_avaliacao: new Date().toISOString()
    });
  };

  const calcularSaude = (dados) => {
    let score = 100;

    // Idade do equipamento (até -30 pontos)
    if (dados.data_aquisicao) {
      const anos = (new Date() - new Date(dados.data_aquisicao)) / (1000 * 60 * 60 * 24 * 365);
      if (anos > 5) score -= 30;
      else if (anos > 3) score -= 20;
      else if (anos > 2) score -= 10;
    }

    // Tipo de disco (até -20 pontos)
    if (dados.saude_tipo_disco === "HD") score -= 20;

    // Espaço livre (até -15 pontos)
    if (dados.saude_espaco_livre === "Menos de 10GB") score -= 15;
    else if (dados.saude_espaco_livre === "10-20GB") score -= 10;
    else if (dados.saude_espaco_livre === "20-50GB") score -= 5;

    // Uso de RAM (até -15 pontos)
    if (dados.saude_uso_ram === "Mais de 90%") score -= 15;
    else if (dados.saude_uso_ram === "70-90%") score -= 10;
    else if (dados.saude_uso_ram === "50-70%") score -= 5;

    // Windows (até -10 pontos)
    if (dados.saude_windows === "Windows 8.1 ou anterior") score -= 10;
    else if (dados.saude_windows === "Windows 10") score -= 5;

    // Desempenho (até -15 pontos)
    if (dados.saude_desempenho === "Muito lento") score -= 15;
    else if (dados.saude_desempenho === "Lento") score -= 10;
    else if (dados.saude_desempenho === "Normal") score -= 5;

    // Satisfação (até -10 pontos)
    if (dados.saude_satisfacao === "Muito insatisfeito") score -= 10;
    else if (dados.saude_satisfacao === "Insatisfeito") score -= 7;
    else if (dados.saude_satisfacao === "Neutro") score -= 3;

    // Problemas (até -15 pontos)
    const numProblemas = (dados.saude_problemas || []).length;
    score -= Math.min(numProblemas * 3, 15);

    // Garantir score entre 0 e 100
    score = Math.max(0, Math.min(100, score));

    // Determinar status e recomendação
    let status, recomendacao;
    if (score >= 80) {
      status = "Ótimo";
      recomendacao = "Manter";
    } else if (score >= 60) {
      status = "Bom";
      recomendacao = "Manter";
    } else if (score >= 40) {
      status = "Regular";
      recomendacao = "Upgrade";
    } else {
      status = "Crítico";
      recomendacao = "Substituir";
    }

    return { score, status, recomendacao };
  };

  const getScoreColor = () => {
    const score = formData.saude_score || 0;
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = () => {
    const score = formData.saude_score || 0;
    if (score >= 60) return <TrendingUp className="w-5 h-5" />;
    if (score >= 40) return <Minus className="w-5 h-5" />;
    return <TrendingDown className="w-5 h-5" />;
  };

  const getRecomendacaoColor = () => {
    if (formData.saude_recomendacao === "Manter") return "bg-green-100 text-green-800";
    if (formData.saude_recomendacao === "Upgrade") return "bg-yellow-100 text-yellow-800";
    if (formData.saude_recomendacao === "Substituir") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Resultado da Avaliação */}
      {formData.saude_score !== undefined && (
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Resultado da Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Score de Saúde</p>
                <div className={`flex items-center justify-center gap-2 ${getScoreColor()}`}>
                  {getScoreIcon()}
                  <p className="text-3xl font-bold">{formData.saude_score}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">de 100</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Status</p>
                <Badge className="text-lg px-4 py-1">
                  {formData.saude_status}
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Recomendação</p>
                <Badge className={`text-lg px-4 py-1 ${getRecomendacaoColor()}`}>
                  {formData.saude_recomendacao}
                </Badge>
              </div>
            </div>
            {formData.saude_data_avaliacao && (
              <p className="text-xs text-gray-500 text-center mt-4">
                Última avaliação: {new Date(formData.saude_data_avaliacao).toLocaleString('pt-BR')}
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
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Uso de Memória RAM</Label>
              <Select 
                value={formData.saude_uso_ram || ""} 
                onValueChange={(value) => handleAvaliacaoChange("saude_uso_ram", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Menos de 50%">Menos de 50%</SelectItem>
                  <SelectItem value="50-70%">50-70%</SelectItem>
                  <SelectItem value="70-90%">70-90%</SelectItem>
                  <SelectItem value="Mais de 90%">Mais de 90%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Armazenamento</Label>
              <Select 
                value={formData.saude_tipo_disco || ""} 
                onValueChange={(value) => handleAvaliacaoChange("saude_tipo_disco", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SSD">SSD</SelectItem>
                  <SelectItem value="HD">HD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Espaço Livre em Disco</Label>
              <Select 
                value={formData.saude_espaco_livre || ""} 
                onValueChange={(value) => handleAvaliacaoChange("saude_espaco_livre", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mais de 50GB">Mais de 50GB</SelectItem>
                  <SelectItem value="20-50GB">20-50GB</SelectItem>
                  <SelectItem value="10-20GB">10-20GB</SelectItem>
                  <SelectItem value="Menos de 10GB">Menos de 10GB</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Versão do Windows</Label>
              <Select 
                value={formData.saude_windows || ""} 
                onValueChange={(value) => handleAvaliacaoChange("saude_windows", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Windows 11">Windows 11</SelectItem>
                  <SelectItem value="Windows 10">Windows 10</SelectItem>
                  <SelectItem value="Windows 8.1 ou anterior">Windows 8.1 ou anterior</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Desempenho Percebido</Label>
              <Select 
                value={formData.saude_desempenho || ""} 
                onValueChange={(value) => handleAvaliacaoChange("saude_desempenho", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Muito rápido">Muito rápido</SelectItem>
                  <SelectItem value="Rápido">Rápido</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Lento">Lento</SelectItem>
                  <SelectItem value="Muito lento">Muito lento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nível de Satisfação</Label>
              <Select 
                value={formData.saude_satisfacao || ""} 
                onValueChange={(value) => handleAvaliacaoChange("saude_satisfacao", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Muito satisfeito">Muito satisfeito</SelectItem>
                  <SelectItem value="Satisfeito">Satisfeito</SelectItem>
                  <SelectItem value="Neutro">Neutro</SelectItem>
                  <SelectItem value="Insatisfeito">Insatisfeito</SelectItem>
                  <SelectItem value="Muito insatisfeito">Muito insatisfeito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Problemas Identificados (selecione todos que se aplicam)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
              {problemasOpcoes.map((problema) => (
                <div key={problema} className="flex items-center space-x-2">
                  <Checkbox
                    id={problema}
                    checked={problemasSelecionados.includes(problema)}
                    onCheckedChange={(checked) => handleProblemaChange(problema, checked)}
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

          <div className="space-y-2">
            <Label>Observações Adicionais</Label>
            <Textarea
              value={formData.saude_observacoes || ""}
              onChange={(e) => handleAvaliacaoChange("saude_observacoes", e.target.value)}
              placeholder="Descreva qualquer problema adicional ou informação relevante..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}