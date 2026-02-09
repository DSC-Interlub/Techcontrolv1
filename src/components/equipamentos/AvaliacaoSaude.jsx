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
  const [problemas, setProblemas] = useState(formData.avaliacao_problemas || []);

  const calcularScore = (dados) => {
    let pontos = 0;

    // Memória (0-10 pontos)
    if (dados.avaliacao_uso_memoria === "Acima de 90%") pontos += 10;
    else if (dados.avaliacao_uso_memoria === "Entre 70% e 90%") pontos += 6;
    else if (dados.avaliacao_uso_memoria === "Entre 50% e 70%") pontos += 3;
    else if (dados.avaliacao_uso_memoria === "Não consegui verificar") pontos += 3;

    // Armazenamento (0-10 pontos)
    if (dados.avaliacao_tipo_armazenamento === "HD") pontos += 10;
    else if (dados.avaliacao_tipo_armazenamento === "Não sei informar") pontos += 5;

    // Espaço em disco (0-10 pontos)
    if (dados.avaliacao_espaco_disco === "Menos de 20 GB livres") pontos += 10;
    else if (dados.avaliacao_espaco_disco === "Entre 20 e 50 GB livres") pontos += 6;
    else if (dados.avaliacao_espaco_disco === "Entre 50 e 100 GB livres") pontos += 3;
    else if (dados.avaliacao_espaco_disco === "Não sei verificar") pontos += 3;

    // Windows (0-10 pontos)
    if (dados.avaliacao_versao_windows === "Outra versão") pontos += 10;
    else if (dados.avaliacao_versao_windows === "Windows 10") pontos += 5;
    else if (dados.avaliacao_versao_windows === "Não sei informar") pontos += 5;

    // Antivírus (0-10 pontos)
    if (dados.avaliacao_status_antivirus === "Não tem antivírus") pontos += 10;
    else if (dados.avaliacao_status_antivirus === "Aparece aviso de desativado") pontos += 5;
    else if (dados.avaliacao_status_antivirus === "Não sei verificar") pontos += 5;

    // Desempenho (0-10 pontos)
    if (dados.avaliacao_desempenho === "Muito lento") pontos += 10;
    else if (dados.avaliacao_desempenho === "Lento") pontos += 8;
    else if (dados.avaliacao_desempenho === "Normal") pontos += 6;
    else if (dados.avaliacao_desempenho === "Bom") pontos += 3;

    // Problemas (0-10 pontos)
    const problemasAtivos = dados.avaliacao_problemas || [];
    if (!problemasAtivos.includes("Nenhum problema") && problemasAtivos.length > 0) {
      pontos += Math.min(problemasAtivos.length * 2, 10);
    }

    // Atende necessidades (0-10 pontos)
    if (dados.avaliacao_atende_necessidades === "Não") pontos += 10;
    else if (dados.avaliacao_atende_necessidades === "Parcialmente") pontos += 5;

    // Recomendação usuário (0-5 pontos)
    if (dados.avaliacao_recomendacao_usuario === "Ser substituído") pontos += 5;
    else if (dados.avaliacao_recomendacao_usuario === "Receber melhorias (upgrade)") pontos += 3;

    // Satisfação (0-5 pontos)
    if (dados.avaliacao_nota_satisfacao === "Nota 0 a 4") pontos += 5;
    else if (dados.avaliacao_nota_satisfacao === "Nota 5 a 7") pontos += 3;

    // Idade do equipamento (0-20 pontos)
    if (dados.data_aquisicao) {
      const anos = (new Date() - new Date(dados.data_aquisicao)) / (1000 * 60 * 60 * 24 * 365);
      if (anos >= 5) pontos += 20;
      else if (anos >= 4) pontos += 15;
      else if (anos >= 3) pontos += 10;
      else if (anos >= 2) pontos += 5;
    }

    const score = Math.min(100, Math.max(0, Math.round(pontos)));
    
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

  const atualizarAvaliacao = (campo, valor) => {
    const novosDados = { ...formData, [campo]: valor };
    const resultado = calcularScore(novosDados);
    
    setFormData({
      ...novosDados,
      avaliacao_score: resultado.score,
      avaliacao_status: resultado.status,
      avaliacao_recomendacao_sistema: resultado.recomendacao,
      avaliacao_data: new Date().toISOString()
    });
  };

  const handleProblemaChange = (problema, checked) => {
    let novosProblemas;
    
    if (problema === "Nenhum problema") {
      novosProblemas = checked ? ["Nenhum problema"] : [];
    } else {
      if (checked) {
        novosProblemas = [...problemas.filter(p => p !== "Nenhum problema"), problema];
      } else {
        novosProblemas = problemas.filter(p => p !== problema);
      }
    }
    
    setProblemas(novosProblemas);
    atualizarAvaliacao("avaliacao_problemas", novosProblemas);
  };

  useEffect(() => {
    if (formData.avaliacao_problemas) {
      setProblemas(formData.avaliacao_problemas);
    }
  }, []);

  const getScoreColor = () => {
    const s = formData.avaliacao_score || 0;
    if (s <= 39) return "text-green-600";
    if (s <= 69) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = () => {
    const s = formData.avaliacao_score || 0;
    if (s <= 39) return <TrendingUp className="w-5 h-5" />;
    if (s <= 69) return <AlertTriangle className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  const getRecomendacaoColor = () => {
    if (formData.avaliacao_recomendacao_sistema === "Manter") return "bg-green-100 text-green-800";
    if (formData.avaliacao_recomendacao_sistema === "Upgrade") return "bg-yellow-100 text-yellow-800";
    if (formData.avaliacao_recomendacao_sistema === "Substituir") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {formData.avaliacao_score !== undefined && formData.avaliacao_score !== null && (
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

      <Card>
        <CardHeader>
          <CardTitle>Questionário de Avaliação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-base font-semibold">1. Uso de Memória RAM</Label>
            <Select 
              value={formData.avaliacao_uso_memoria || ""} 
              onValueChange={(v) => atualizarAvaliacao("avaliacao_uso_memoria", v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Menos de 50%">Menos de 50%</SelectItem>
                <SelectItem value="Entre 50% e 70%">Entre 50% e 70%</SelectItem>
                <SelectItem value="Entre 70% e 90%">Entre 70% e 90%</SelectItem>
                <SelectItem value="Acima de 90%">Acima de 90%</SelectItem>
                <SelectItem value="Não consegui verificar">Não consegui verificar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">2. Tipo de Armazenamento</Label>
            <Select 
              value={formData.avaliacao_tipo_armazenamento || ""} 
              onValueChange={(v) => atualizarAvaliacao("avaliacao_tipo_armazenamento", v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SSD">SSD</SelectItem>
                <SelectItem value="HD">HD</SelectItem>
                <SelectItem value="Não sei informar">Não sei informar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">3. Espaço Livre em Disco</Label>
            <Select 
              value={formData.avaliacao_espaco_disco || ""} 
              onValueChange={(v) => atualizarAvaliacao("avaliacao_espaco_disco", v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Mais de 100 GB livres">Mais de 100 GB livres</SelectItem>
                <SelectItem value="Entre 50 e 100 GB livres">Entre 50 e 100 GB livres</SelectItem>
                <SelectItem value="Entre 20 e 50 GB livres">Entre 20 e 50 GB livres</SelectItem>
                <SelectItem value="Menos de 20 GB livres">Menos de 20 GB livres</SelectItem>
                <SelectItem value="Não sei verificar">Não sei verificar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">4. Versão do Windows</Label>
            <Select 
              value={formData.avaliacao_versao_windows || ""} 
              onValueChange={(v) => atualizarAvaliacao("avaliacao_versao_windows", v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Windows 11">Windows 11</SelectItem>
                <SelectItem value="Windows 10">Windows 10</SelectItem>
                <SelectItem value="Outra versão">Outra versão</SelectItem>
                <SelectItem value="Não sei informar">Não sei informar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">5. Status do Antivírus</Label>
            <Select 
              value={formData.avaliacao_status_antivirus || ""} 
              onValueChange={(v) => atualizarAvaliacao("avaliacao_status_antivirus", v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim, está ativo">Sim, está ativo</SelectItem>
                <SelectItem value="Aparece aviso de desativado">Aparece aviso de desativado</SelectItem>
                <SelectItem value="Não tem antivírus">Não tem antivírus</SelectItem>
                <SelectItem value="Não sei verificar">Não sei verificar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">6. Desempenho Geral</Label>
            <Select 
              value={formData.avaliacao_desempenho || ""} 
              onValueChange={(v) => atualizarAvaliacao("avaliacao_desempenho", v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Muito rápido">Muito rápido</SelectItem>
                <SelectItem value="Bom">Bom</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Lento">Lento</SelectItem>
                <SelectItem value="Muito lento">Muito lento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">7. Problemas Identificados</Label>
            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border">
              {problemasOpcoes.map((problema) => (
                <div key={problema} className="flex items-center space-x-2">
                  <Checkbox
                    id={problema}
                    checked={problemas.includes(problema)}
                    onCheckedChange={(c) => handleProblemaChange(problema, c)}
                  />
                  <label htmlFor={problema} className="text-sm cursor-pointer">
                    {problema}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">8. Atende às Necessidades?</Label>
            <Select 
              value={formData.avaliacao_atende_necessidades || ""} 
              onValueChange={(v) => atualizarAvaliacao("avaliacao_atende_necessidades", v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim</SelectItem>
                <SelectItem value="Parcialmente">Parcialmente</SelectItem>
                <SelectItem value="Não">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">9. Recomendação do Usuário</Label>
            <Select 
              value={formData.avaliacao_recomendacao_usuario || ""} 
              onValueChange={(v) => atualizarAvaliacao("avaliacao_recomendacao_usuario", v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Continuar como está">Continuar como está</SelectItem>
                <SelectItem value="Receber melhorias (upgrade)">Receber melhorias (upgrade)</SelectItem>
                <SelectItem value="Ser substituído">Ser substituído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">10. Nota de Satisfação</Label>
            <Select 
              value={formData.avaliacao_nota_satisfacao || ""} 
              onValueChange={(v) => atualizarAvaliacao("avaliacao_nota_satisfacao", v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
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