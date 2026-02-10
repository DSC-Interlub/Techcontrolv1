import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, AlertTriangle, XCircle } from "lucide-react";

const problemasOpcoes = [
  "Demora para ligar",
  "Programas travam",
  "Internet lenta (somente neste computador)",
  "Tela piscando ou apagando",
  "Teclado ou mouse com defeito",
  "Barulho excessivo",
  "Aquecimento"
];

export default function AvaliacaoEquipamento({ avaliacao, onChange }) {
  const [problemas, setProblemas] = useState(avaliacao?.problemas || []);

  const calcularPontuacao = (dados) => {
    let pontos = 0;

    // Pergunta 1: Memória RAM
    if (dados.memoria_ram === "Menos de 50%") pontos += 0;
    else if (dados.memoria_ram === "Entre 50% e 70%") pontos += 3;
    else if (dados.memoria_ram === "Entre 70% e 90%") pontos += 6;
    else if (dados.memoria_ram === "Acima de 90%") pontos += 10;

    // Pergunta 2: Tipo de Armazenamento
    if (dados.tipo_armazenamento === "HD") pontos += 5;
    else if (dados.tipo_armazenamento === "SSD") pontos += 0;

    // Pergunta 3: Espaço em disco
    if (dados.espaco_disco === "Mais de 100 GB livres") pontos += 0;
    else if (dados.espaco_disco === "Entre 50 e 100 GB livres") pontos += 3;
    else if (dados.espaco_disco === "Entre 20 e 50 GB livres") pontos += 6;
    else if (dados.espaco_disco === "Menos de 20 GB livres") pontos += 10;

    // Pergunta 4: Windows
    if (dados.versao_windows === "Windows 10") pontos += 5;
    else if (dados.versao_windows === "Windows 11") pontos += 0;

    // Pergunta 5: Antivírus
    if (dados.antivirus === "Sim, está ativo") pontos += 0;
    else if (dados.antivirus === "Aparece aviso de desativado") pontos += 5;
    else if (dados.antivirus === "Não tem antivírus") pontos += 10;

    // Pergunta 6: Desempenho
    if (dados.desempenho === "Muito rápido") pontos += 0;
    else if (dados.desempenho === "Bom") pontos += 3;
    else if (dados.desempenho === "Normal") pontos += 6;
    else if (dados.desempenho === "Lento") pontos += 8;
    else if (dados.desempenho === "Muito lento") pontos += 10;

    // Pergunta 7: Problemas (1.25 pontos cada, máximo 8.75)
    const numProblemas = dados.problemas?.length || 0;
    pontos += numProblemas * 1.25;

    // Pergunta 8: Atende trabalho
    if (dados.atende_trabalho === "Sim") pontos += 0;
    else if (dados.atende_trabalho === "Parcialmente") pontos += 5;
    else if (dados.atende_trabalho === "Não") pontos += 10;

    // Pergunta 9: Recomendação
    if (dados.recomendacao_usuario === "Continuar como está") pontos += 0;
    else if (dados.recomendacao_usuario === "Receber melhorias (upgrade)") pontos += 3;
    else if (dados.recomendacao_usuario === "Ser substituído") pontos += 5;

    // Pergunta 10: Satisfação
    if (dados.satisfacao === "Nota 8 a 10") pontos += 0;
    else if (dados.satisfacao === "Nota 5 a 7") pontos += 3;
    else if (dados.satisfacao === "Nota 0 a 4") pontos += 5;

    // Tempo de uso (calculado automaticamente)
    const anos = dados.tempo_uso_anos || 0;
    if (anos < 2) pontos += 0;
    else if (anos < 3) pontos += 5;
    else if (anos < 4) pontos += 10;
    else if (anos < 5) pontos += 15;
    else pontos += 20;

    // Garantir que não passe de 100
    pontos = Math.min(100, Math.round(pontos * 10) / 10);

    // Classificação
    let classificacao;
    if (pontos <= 39) classificacao = "Manter";
    else if (pontos <= 69) classificacao = "Upgrade";
    else classificacao = "Substituir";

    return { pontuacao_total: pontos, classificacao };
  };

  const handleChange = (campo, valor) => {
    const novaAvaliacao = { ...avaliacao, [campo]: valor };
    const resultado = calcularPontuacao(novaAvaliacao);
    onChange({
      ...novaAvaliacao,
      ...resultado,
      data_avaliacao: new Date().toISOString()
    });
  };

  const handleProblemaChange = (problema, checked) => {
    const novosProblemas = checked
      ? [...problemas, problema]
      : problemas.filter(p => p !== problema);
    
    setProblemas(novosProblemas);
    handleChange("problemas", novosProblemas);
  };

  const getClassificacaoColor = () => {
    if (avaliacao?.classificacao === "Manter") return "bg-green-100 text-green-800 border-green-300";
    if (avaliacao?.classificacao === "Upgrade") return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const getClassificacaoIcon = () => {
    if (avaliacao?.classificacao === "Manter") return <TrendingUp className="w-5 h-5" />;
    if (avaliacao?.classificacao === "Upgrade") return <AlertTriangle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {avaliacao?.pontuacao_total !== undefined && (
        <Card className={`border-2 ${getClassificacaoColor()}`}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Resultado da Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Pontuação Total</p>
                <p className="text-5xl font-bold">{avaliacao.pontuacao_total}</p>
                <p className="text-xs text-gray-500 mt-1">de 100 pontos</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Classificação</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  {getClassificacaoIcon()}
                  <Badge className={`text-xl px-4 py-2 ${getClassificacaoColor()}`}>
                    {avaliacao.classificacao}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Questionário de Avaliação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-base font-semibold">1. Análise de Memória (RAM)</Label>
            <Select value={avaliacao?.memoria_ram || ""} onValueChange={(v) => handleChange("memoria_ram", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Menos de 50%">Menos de 50% (0 pontos)</SelectItem>
                <SelectItem value="Entre 50% e 70%">Entre 50% e 70% (3 pontos)</SelectItem>
                <SelectItem value="Entre 70% e 90%">Entre 70% e 90% (6 pontos)</SelectItem>
                <SelectItem value="Acima de 90%">Acima de 90% (10 pontos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">2. Tipo de Armazenamento</Label>
            <Select value={avaliacao?.tipo_armazenamento || ""} onValueChange={(v) => handleChange("tipo_armazenamento", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HD">HD (5 pontos)</SelectItem>
                <SelectItem value="SSD">SSD (0 pontos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">3. Espaço Livre em Disco</Label>
            <Select value={avaliacao?.espaco_disco || ""} onValueChange={(v) => handleChange("espaco_disco", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Mais de 100 GB livres">Mais de 100 GB livres (0 pontos)</SelectItem>
                <SelectItem value="Entre 50 e 100 GB livres">Entre 50 e 100 GB livres (3 pontos)</SelectItem>
                <SelectItem value="Entre 20 e 50 GB livres">Entre 20 e 50 GB livres (6 pontos)</SelectItem>
                <SelectItem value="Menos de 20 GB livres">Menos de 20 GB livres (10 pontos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">4. Versão do Windows</Label>
            <Select value={avaliacao?.versao_windows || ""} onValueChange={(v) => handleChange("versao_windows", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Windows 10">Windows 10 (5 pontos)</SelectItem>
                <SelectItem value="Windows 11">Windows 11 (0 pontos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">5. Antivírus</Label>
            <Select value={avaliacao?.antivirus || ""} onValueChange={(v) => handleChange("antivirus", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim, está ativo">Sim, está ativo (0 pontos)</SelectItem>
                <SelectItem value="Aparece aviso de desativado">Aparece aviso de desativado (5 pontos)</SelectItem>
                <SelectItem value="Não tem antivírus">Não tem antivírus (10 pontos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">6. Desempenho Geral Percebido</Label>
            <Select value={avaliacao?.desempenho || ""} onValueChange={(v) => handleChange("desempenho", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Muito rápido">Muito rápido (0 pontos)</SelectItem>
                <SelectItem value="Bom">Bom (3 pontos)</SelectItem>
                <SelectItem value="Normal">Normal (6 pontos)</SelectItem>
                <SelectItem value="Lento">Lento (8 pontos)</SelectItem>
                <SelectItem value="Muito lento">Muito lento (10 pontos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">7. Problemas Percebidos (1.25 pontos cada)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border">
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
            <Label className="text-base font-semibold">8. Equipamento Atende Seu Trabalho?</Label>
            <Select value={avaliacao?.atende_trabalho || ""} onValueChange={(v) => handleChange("atende_trabalho", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim (0 pontos)</SelectItem>
                <SelectItem value="Parcialmente">Parcialmente (5 pontos)</SelectItem>
                <SelectItem value="Não">Não (10 pontos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">9. Na Sua Opinião, o Computador Deveria:</Label>
            <Select value={avaliacao?.recomendacao_usuario || ""} onValueChange={(v) => handleChange("recomendacao_usuario", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Continuar como está">Continuar como está (0 pontos)</SelectItem>
                <SelectItem value="Receber melhorias (upgrade)">Receber melhorias (upgrade) (3 pontos)</SelectItem>
                <SelectItem value="Ser substituído">Ser substituído (5 pontos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">10. Satisfação Geral (0 a 10)</Label>
            <Select value={avaliacao?.satisfacao || ""} onValueChange={(v) => handleChange("satisfacao", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Nota 8 a 10">Nota 8 a 10 (0 pontos)</SelectItem>
                <SelectItem value="Nota 5 a 7">Nota 5 a 7 (3 pontos)</SelectItem>
                <SelectItem value="Nota 0 a 4">Nota 0 a 4 (5 pontos)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}