import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, AlertTriangle, AlertCircle } from "lucide-react";

const problemasOpcoes = [
  "Demora para ligar",
  "Programas travam",
  "Internet lenta (somente neste computador)",
  "Tela piscando ou apagando",
  "Teclado ou mouse com defeito",
  "Barulho excessivo",
  "Aquecimento",
  "Nenhum problema"
];

export default function AvaliacaoSaude({ formData, setFormData }) {
  const [problemasSelecionados, setProblemasSelecionados] = useState(
    formData.avaliacao_problemas || []
  );

  const handleProblemaChange = (problema, checked) => {
    let novosProblemas;
    
    if (problema === "Nenhum problema") {
      if (checked) {
        novosProblemas = ["Nenhum problema"];
      } else {
        novosProblemas = [];
      }
    } else {
      if (checked) {
        novosProblemas = [...problemasSelecionados.filter(p => p !== "Nenhum problema"), problema];
      } else {
        novosProblemas = problemasSelecionados.filter(p => p !== problema);
      }
    }
    
    setProblemasSelecionados(novosProblemas);
    handleAvaliacaoChange("avaliacao_problemas", novosProblemas);
  };

  const handleAvaliacaoChange = (campo, valor) => {
    const novosDados = { ...formData, [campo]: valor };
    
    // Calcular score e recomendação automaticamente
    const resultado = calcularSaude(novosDados);
    
    setFormData({
      ...novosDados,
      avaliacao_score: resultado.score,
      avaliacao_status: resultado.status,
      avaliacao_recomendacao_sistema: resultado.recomendacao,
      avaliacao_data: new Date().toISOString()
    });
  };

  const calcularSaude = (dados) => {
    let score = 0;

    // 1. Uso de Memória RAM (até 10 pontos)
    if (dados.avaliacao_uso_memoria === "Menos de 50%") score += 0;
    else if (dados.avaliacao_uso_memoria === "Entre 50% e 70%") score += 3;
    else if (dados.avaliacao_uso_memoria === "Entre 70% e 90%") score += 6;
    else if (dados.avaliacao_uso_memoria === "Acima de 90%") score += 10;
    else if (dados.avaliacao_uso_memoria === "Não consegui verificar") score += 3;

    // 2. Tipo de armazenamento (até 10 pontos)
    if (dados.avaliacao_tipo_armazenamento === "SSD") score += 0;
    else if (dados.avaliacao_tipo_armazenamento === "HD") score += 10;
    else if (dados.avaliacao_tipo_armazenamento === "Não sei informar") score += 5;

    // 3. Espaço livre em disco (até 10 pontos)
    if (dados.avaliacao_espaco_disco === "Mais de 100 GB livres") score += 0;
    else if (dados.avaliacao_espaco_disco === "Entre 50 e 100 GB livres") score += 3;
    else if (dados.avaliacao_espaco_disco === "Entre 20 e 50 GB livres") score += 6;
    else if (dados.avaliacao_espaco_disco === "Menos de 20 GB livres") score += 10;
    else if (dados.avaliacao_espaco_disco === "Não sei verificar") score += 3;

    // 4. Versão do Windows (até 10 pontos)
    if (dados.avaliacao_versao_windows === "Windows 11") score += 0;
    else if (dados.avaliacao_versao_windows === "Windows 10") score += 5;
    else if (dados.avaliacao_versao_windows === "Outra versão") score += 10;
    else if (dados.avaliacao_versao_windows === "Não sei informar") score += 5;

    // 5. Antivírus (até 10 pontos)
    if (dados.avaliacao_status_antivirus === "Sim, está ativo") score += 0;
    else if (dados.avaliacao_status_antivirus === "Aparece aviso de desativado") score += 5;
    else if (dados.avaliacao_status_antivirus === "Não tem antivírus") score += 10;
    else if (dados.avaliacao_status_antivirus === "Não sei verificar") score += 5;

    // 6. Desempenho geral percebido (até 10 pontos)
    if (dados.avaliacao_desempenho === "Muito rápido") score += 0;
    else if (dados.avaliacao_desempenho === "Bom") score += 3;
    else if (dados.avaliacao_desempenho === "Normal") score += 6;
    else if (dados.avaliacao_desempenho === "Lento") score += 8;
    else if (dados.avaliacao_desempenho === "Muito lento") score += 10;

    // 7. Problemas percebidos (até 10 pontos)
    const problemas = dados.avaliacao_problemas || [];
    if (!problemas.includes("Nenhum problema")) {
      const numProblemas = problemas.length;
      score += Math.min(numProblemas * 2, 10);
    }

    // 8. Equipamento atende seu trabalho (até 10 pontos)
    if (dados.avaliacao_atende_necessidades === "Sim") score += 0;
    else if (dados.avaliacao_atende_necessidades === "Parcialmente") score += 5;
    else if (dados.avaliacao_atende_necessidades === "Não") score += 10;

    // 9. Opinião do usuário (até 5 pontos)
    if (dados.avaliacao_recomendacao_usuario === "Continuar como está") score += 0;
    else if (dados.avaliacao_recomendacao_usuario === "Receber melhorias (upgrade)") score += 3;
    else if (dados.avaliacao_recomendacao_usuario === "Ser substituído") score += 5;

    // 10. Satisfação geral (até 5 pontos)
    if (dados.avaliacao_nota_satisfacao === "Nota 8 a 10") score += 0;
    else if (dados.avaliacao_nota_satisfacao === "Nota 5 a 7") score += 3;
    else if (dados.avaliacao_nota_satisfacao === "Nota 0 a 4") score += 5;

    // 11. Idade do equipamento (até 20 pontos)
    if (dados.data_aquisicao) {
      const anos = (new Date() - new Date(dados.data_aquisicao)) / (1000 * 60 * 60 * 24 * 365);
      if (anos < 2) score += 0;
      else if (anos < 3) score += 5;
      else if (anos < 4) score += 10;
      else if (anos < 5) score += 15;
      else score += 20;
    }

    // Garantir score entre 0 e 100
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Determinar status e recomendação
    let status, recomendacao;
    if (score <= 39) {
      status = "Ótimo";
      recomendacao = "Manter";
    } else if (score <= 69) {
      status = "Regular";
      recomendacao = "Upgrade";
    } else {
      status = "Crítico";
      recomendacao = "Substituir";
    }

    return { score, status, recomendacao };
  };

  const getScoreColor = () => {
    const score = formData.avaliacao_score || 0;
    if (score <= 39) return "text-green-600";
    if (score <= 69) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = () => {
    const score = formData.avaliacao_score || 0;
    if (score <= 39) return <TrendingUp className="w-5 h-5" />;
    if (score <= 69) return <AlertTriangle className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  const getRecomendacaoColor = () => {
    if (formData.avaliacao_recomendacao_sistema === "Manter") return "bg-green-100 text-green-800";
    if (formData.avaliacao_recomendacao_sistema === "Upgrade") return "bg-yellow-100 text-yellow-800";
    if (formData.avaliacao_recomendacao_sistema === "Substituir") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  // Calcular na montagem se já houver dados
  useEffect(() => {
    if (formData.avaliacao_uso_memoria || formData.avaliacao_tipo_armazenamento || formData.avaliacao_score) {
      const resultado = calcularSaude(formData);
      if (resultado.score !== formData.avaliacao_score) {
        setFormData({
          ...formData,
          avaliacao_score: resultado.score,
          avaliacao_status: resultado.status,
          avaliacao_recomendacao_sistema: resultado.recomendacao
        });
      }
    }
    
    // Carregar problemas salvos
    if (formData.avaliacao_problemas && formData.avaliacao_problemas.length > 0) {
      setProblemasSelecionados(formData.avaliacao_problemas);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Resultado da Avaliação */}
      {formData.avaliacao_score !== undefined && (
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Resultado da Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Score</p>
                <div className={`flex items-center justify-center gap-2 ${getScoreColor()}`}>
                  {getScoreIcon()}
                  <p className="text-4xl font-bold">{formData.avaliacao_score}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">de 100 pontos</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Status</p>
                <Badge className="text-lg px-4 py-1 mt-2">
                  {formData.avaliacao_status}
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Recomendação</p>
                <Badge className={`text-lg px-4 py-1 mt-2 ${getRecomendacaoColor()}`}>
                  {formData.avaliacao_recomendacao_sistema}
                </Badge>
              </div>
            </div>
            {formData.avaliacao_data && (
              <p className="text-xs text-gray-500 text-center mt-4">
                Última avaliação: {new Date(formData.avaliacao_data).toLocaleString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulário de Avaliação */}
      <Card>
        <CardHeader>
          <CardTitle>Questionário de Avaliação</CardTitle>
          <p className="text-sm text-gray-600">Preencha as informações abaixo para calcular a saúde do equipamento</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1. Uso de Memória RAM */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">1. Uso de Memória (RAM)</Label>
            <Select 
              value={formData.avaliacao_uso_memoria || ""} 
              onValueChange={(value) => handleAvaliacaoChange("avaliacao_uso_memoria", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Menos de 50%">Menos de 50%</SelectItem>
                <SelectItem value="Entre 50% e 70%">Entre 50% e 70%</SelectItem>
                <SelectItem value="Entre 70% e 90%">Entre 70% e 90%</SelectItem>
                <SelectItem value="Acima de 90%">Acima de 90%</SelectItem>
                <SelectItem value="Não consegui verificar">Não consegui verificar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Tipo de Armazenamento */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">2. Tipo de Armazenamento</Label>
            <Select 
              value={formData.avaliacao_tipo_armazenamento || ""} 
              onValueChange={(value) => handleAvaliacaoChange("avaliacao_tipo_armazenamento", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SSD">SSD</SelectItem>
                <SelectItem value="HD">HD</SelectItem>
                <SelectItem value="Não sei informar">Não sei informar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3. Espaço Livre em Disco */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">3. Espaço Livre em Disco</Label>
            <Select 
              value={formData.avaliacao_espaco_disco || ""} 
              onValueChange={(value) => handleAvaliacaoChange("avaliacao_espaco_disco", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mais de 100 GB livres">Mais de 100 GB livres</SelectItem>
                <SelectItem value="Entre 50 e 100 GB livres">Entre 50 e 100 GB livres</SelectItem>
                <SelectItem value="Entre 20 e 50 GB livres">Entre 20 e 50 GB livres</SelectItem>
                <SelectItem value="Menos de 20 GB livres">Menos de 20 GB livres</SelectItem>
                <SelectItem value="Não sei verificar">Não sei verificar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Versão do Windows */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">4. Versão do Windows</Label>
            <Select 
              value={formData.avaliacao_versao_windows || ""} 
              onValueChange={(value) => handleAvaliacaoChange("avaliacao_versao_windows", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Windows 11">Windows 11</SelectItem>
                <SelectItem value="Windows 10">Windows 10</SelectItem>
                <SelectItem value="Outra versão">Outra versão</SelectItem>
                <SelectItem value="Não sei informar">Não sei informar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 5. Antivírus */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">5. Antivírus</Label>
            <Select 
              value={formData.avaliacao_status_antivirus || ""} 
              onValueChange={(value) => handleAvaliacaoChange("avaliacao_status_antivirus", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim, está ativo">Sim, está ativo</SelectItem>
                <SelectItem value="Aparece aviso de desativado">Aparece aviso de desativado</SelectItem>
                <SelectItem value="Não tem antivírus">Não tem antivírus</SelectItem>
                <SelectItem value="Não sei verificar">Não sei verificar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 6. Desempenho Geral Percebido */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">6. Desempenho Geral Percebido</Label>
            <Select 
              value={formData.avaliacao_desempenho || ""} 
              onValueChange={(value) => handleAvaliacaoChange("avaliacao_desempenho", value)}
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

          {/* 7. Problemas Percebidos */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">7. Problemas Percebidos (marque todos que se aplicam)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border">
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

          {/* 8. Equipamento Atende Seu Trabalho */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">8. O Equipamento Atende Seu Trabalho?</Label>
            <Select 
              value={formData.avaliacao_atende_necessidades || ""} 
              onValueChange={(value) => handleAvaliacaoChange("avaliacao_atende_necessidades", value)}
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

          {/* 9. Opinião do Usuário */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">9. Opinião do Usuário sobre o Equipamento</Label>
            <Select 
              value={formData.avaliacao_recomendacao_usuario || ""} 
              onValueChange={(value) => handleAvaliacaoChange("avaliacao_recomendacao_usuario", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Continuar como está">Continuar como está</SelectItem>
                <SelectItem value="Receber melhorias (upgrade)">Receber melhorias (upgrade)</SelectItem>
                <SelectItem value="Ser substituído">Ser substituído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 10. Satisfação Geral */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">10. Satisfação Geral</Label>
            <Select 
              value={formData.avaliacao_nota_satisfacao || ""} 
              onValueChange={(value) => handleAvaliacaoChange("avaliacao_nota_satisfacao", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nota 8 a 10">Nota 8 a 10</SelectItem>
                <SelectItem value="Nota 5 a 7">Nota 5 a 7</SelectItem>
                <SelectItem value="Nota 0 a 4">Nota 0 a 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}