import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, TrendingUp, AlertTriangle, XCircle, Save, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const problemasOpcoes = [
  "Demora para ligar",
  "Programas travam",
  "Internet lenta (somente neste computador)",
  "Tela piscando ou apagando",
  "Teclado ou mouse com defeito",
  "Barulho excessivo",
  "Aquecimento"
];

// Passos de instrução para perguntas que precisam de guia
const instrucoes = {
  memoria_ram: {
    titulo: "Como verificar o uso de memória RAM",
    passos: [
      "Pressione Ctrl + Shift + Esc",
      "Clique na aba \"Desempenho\"",
      "Clique em \"Memória\"",
      "Veja o percentual de uso"
    ]
  },
  tipo_armazenamento: {
    titulo: "Como identificar o tipo de armazenamento",
    passos: [
      "Pressione Ctrl + Shift + Esc",
      "Clique na aba \"Desempenho\"",
      "Clique em \"Disco\"",
      "Logo abaixo do nome do disco aparecerá: SSD ou HDD"
    ]
  },
  espaco_disco: {
    titulo: "Como verificar o espaço livre em disco",
    passos: [
      "Abra o Explorador de Arquivos",
      "Clique em \"Este Computador\"",
      "Observe o Disco Local (C:)",
      "Veja quanto espaço está livre"
    ]
  },
  versao_windows: {
    titulo: "Como verificar a versão do Windows",
    passos: [
      "Pressione Windows + R",
      "Digite: winver",
      "Clique em OK"
    ]
  },
  antivirus: {
    titulo: "Como verificar o antivírus",
    passos: [
      "Clique no menu Iniciar",
      "Digite: Segurança do Windows",
      "Clique em \"Proteção contra vírus e ameaças\"",
      "Verifique se está \"Ativo\""
    ]
  }
};

function InstrucoesBox({ campo }) {
  const [aberto, setAberto] = useState(false);
  const info = instrucoes[campo];
  if (!info) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        <Info className="w-3.5 h-3.5" />
        Como verificar isso no meu computador?
        {aberto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {aberto && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-900 mb-2">{info.titulo}:</p>
          <ol className="space-y-1">
            {info.passos.map((passo, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-blue-800">
                <span className="bg-blue-200 text-blue-900 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 font-bold text-[10px] mt-0.5">{i + 1}</span>
                <span>{passo}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function AvaliacaoEquipamento({ equipamento, entityType, avaliacaoExistente, onSalvar, somenteLeitura = false }) {
  const [avaliacao, setAvaliacao] = useState({
    memoria_ram: avaliacaoExistente?.memoria_ram || "",
    tipo_armazenamento: avaliacaoExistente?.tipo_armazenamento || "",
    espaco_disco: avaliacaoExistente?.espaco_disco || "",
    versao_windows: avaliacaoExistente?.versao_windows || "",
    antivirus: avaliacaoExistente?.antivirus || "",
    desempenho: avaliacaoExistente?.desempenho || "",
    problemas: avaliacaoExistente?.problemas || [],
    atende_trabalho: avaliacaoExistente?.atende_trabalho || "",
    recomendacao_usuario: avaliacaoExistente?.recomendacao_usuario || "",
    satisfacao: avaliacaoExistente?.satisfacao || "",
  });
  const [problemas, setProblemas] = useState(avaliacaoExistente?.problemas || []);
  const [salvando, setSalvando] = useState(false);

  const calcularPontuacao = (dados) => {
    let pontos = 0;

    if (dados.memoria_ram === "Menos de 50%") pontos += 0;
    else if (dados.memoria_ram === "Entre 50% e 70%") pontos += 3;
    else if (dados.memoria_ram === "Entre 70% e 90%") pontos += 6;
    else if (dados.memoria_ram === "Acima de 90%") pontos += 10;

    if (dados.tipo_armazenamento === "HD") pontos += 5;
    else if (dados.tipo_armazenamento === "SSD") pontos += 0;

    if (dados.espaco_disco === "Mais de 100 GB livres") pontos += 0;
    else if (dados.espaco_disco === "Entre 50 e 100 GB livres") pontos += 3;
    else if (dados.espaco_disco === "Entre 20 e 50 GB livres") pontos += 6;
    else if (dados.espaco_disco === "Menos de 20 GB livres") pontos += 10;

    if (dados.versao_windows === "Windows 10") pontos += 5;
    else if (dados.versao_windows === "Windows 11") pontos += 0;

    if (dados.antivirus === "Sim, está ativo") pontos += 0;
    else if (dados.antivirus === "Aparece aviso de desativado") pontos += 5;
    else if (dados.antivirus === "Não tem antivírus") pontos += 10;

    if (dados.desempenho === "Muito rápido") pontos += 0;
    else if (dados.desempenho === "Bom") pontos += 3;
    else if (dados.desempenho === "Normal") pontos += 6;
    else if (dados.desempenho === "Lento") pontos += 8;
    else if (dados.desempenho === "Muito lento") pontos += 10;

    const numProblemas = dados.problemas?.length || 0;
    pontos += numProblemas * 1.25;

    if (dados.atende_trabalho === "Sim") pontos += 0;
    else if (dados.atende_trabalho === "Parcialmente") pontos += 5;
    else if (dados.atende_trabalho === "Não") pontos += 10;

    if (dados.recomendacao_usuario === "Continuar como está") pontos += 0;
    else if (dados.recomendacao_usuario === "Receber melhorias (upgrade)") pontos += 3;
    else if (dados.recomendacao_usuario === "Ser substituído") pontos += 5;

    if (dados.satisfacao === "Nota 8 a 10") pontos += 0;
    else if (dados.satisfacao === "Nota 5 a 7") pontos += 3;
    else if (dados.satisfacao === "Nota 0 a 4") pontos += 5;

    let tempoUsoAnos = 0;
    if (equipamento?.data_aquisicao) {
      const hoje = new Date();
      const aquisicao = new Date(equipamento.data_aquisicao);
      tempoUsoAnos = (hoje - aquisicao) / (1000 * 60 * 60 * 24 * 365);
    }

    let pontosTempoUso = 0;
    if (tempoUsoAnos < 2) pontosTempoUso = 0;
    else if (tempoUsoAnos < 3) pontosTempoUso = 5;
    else if (tempoUsoAnos < 4) pontosTempoUso = 10;
    else if (tempoUsoAnos < 5) pontosTempoUso = 15;
    else pontosTempoUso = 20;

    pontos += pontosTempoUso;
    pontos = Math.min(100, Math.round(pontos * 10) / 10);

    let classificacao;
    if (pontos <= 39) classificacao = "Manter";
    else if (pontos <= 69) classificacao = "Upgrade";
    else classificacao = "Substituir";

    return { pontuacao_total: pontos, classificacao, tempo_uso_anos: tempoUsoAnos, pontosTempoUso };
  };

  const resultado = calcularPontuacao(avaliacao);

  const handleChange = (campo, valor) => {
    if (somenteLeitura) return;
    setAvaliacao(prev => ({ ...prev, [campo]: valor }));
  };

  const handleProblemaChange = (problema, checked) => {
    if (somenteLeitura) return;
    const novosProblemas = checked
      ? [...problemas, problema]
      : problemas.filter(p => p !== problema);
    setProblemas(novosProblemas);
    setAvaliacao(prev => ({ ...prev, problemas: novosProblemas }));
  };

  const handleSalvar = async () => {
    setSalvando(true);
    await onSalvar({ ...avaliacao, ...resultado });
    setSalvando(false);
  };

  const getClassificacaoColor = () => {
    if (resultado.classificacao === "Manter") return "bg-green-100 text-green-800 border-green-300";
    if (resultado.classificacao === "Upgrade") return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const getClassificacaoIcon = () => {
    if (resultado.classificacao === "Manter") return <TrendingUp className="w-5 h-5" />;
    if (resultado.classificacao === "Upgrade") return <AlertTriangle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  // Calcular pontos sem tempo de uso para mostrar na explicação
  const pontosTempoUso = resultado.pontosTempoUso;

  return (
    <div className="space-y-6">
      <Card className={`border-2 ${getClassificacaoColor()}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {somenteLeitura ? "Resultado desta Avaliação" : "Resultado da Avaliação"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Pontuação Total</p>
              <p className="text-5xl font-bold">{resultado.pontuacao_total}</p>
              <p className="text-xs text-gray-500 mt-1">de 100 pontos</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Classificação</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                {getClassificacaoIcon()}
                <Badge className={`text-xl px-4 py-2 ${getClassificacaoColor()}`}>
                  {resultado.classificacao}
                </Badge>
              </div>
            </div>
          </div>

          {/* Explicação da pontuação de tempo de uso */}
          {pontosTempoUso > 0 && equipamento?.data_aquisicao && (
            <Alert className="mt-4 bg-amber-50 border-amber-200">
              <Info className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>{pontosTempoUso} pontos</strong> foram adicionados automaticamente por conta do <strong>tempo de uso</strong>:{" "}
                este equipamento foi adquirido em {new Date(equipamento.data_aquisicao).toLocaleDateString('pt-BR')},{" "}
                há aproximadamente <strong>{Math.floor(resultado.tempo_uso_anos)} ano(s)</strong>.
                Equipamentos mais antigos recebem pontuação maior, indicando maior necessidade de avaliação.
                {resultado.tempo_uso_anos >= 5 && " (5+ anos: +20 pts)"}
                {resultado.tempo_uso_anos >= 4 && resultado.tempo_uso_anos < 5 && " (4-5 anos: +15 pts)"}
                {resultado.tempo_uso_anos >= 3 && resultado.tempo_uso_anos < 4 && " (3-4 anos: +10 pts)"}
                {resultado.tempo_uso_anos >= 2 && resultado.tempo_uso_anos < 3 && " (2-3 anos: +5 pts)"}
              </AlertDescription>
            </Alert>
          )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{somenteLeitura ? "Respostas da Avaliação" : "Questionário de Avaliação"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-base font-semibold">1. Análise de Memória (RAM)</Label>
            {somenteLeitura ? (
              <p className="text-sm bg-gray-50 rounded p-2 border">{avaliacao.memoria_ram || "—"}</p>
            ) : (
              <Select value={avaliacao.memoria_ram} onValueChange={(v) => handleChange("memoria_ram", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Menos de 50%">Menos de 50% (0 pontos)</SelectItem>
                  <SelectItem value="Entre 50% e 70%">Entre 50% e 70% (3 pontos)</SelectItem>
                  <SelectItem value="Entre 70% e 90%">Entre 70% e 90% (6 pontos)</SelectItem>
                  <SelectItem value="Acima de 90%">Acima de 90% (10 pontos)</SelectItem>
                </SelectContent>
              </Select>
            )}
            {!somenteLeitura && <InstrucoesBox campo="memoria_ram" />}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">2. Tipo de Armazenamento</Label>
            {somenteLeitura ? (
              <p className="text-sm bg-gray-50 rounded p-2 border">{avaliacao.tipo_armazenamento || "—"}</p>
            ) : (
              <Select value={avaliacao.tipo_armazenamento} onValueChange={(v) => handleChange("tipo_armazenamento", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HD">HD (5 pontos)</SelectItem>
                  <SelectItem value="SSD">SSD (0 pontos)</SelectItem>
                </SelectContent>
              </Select>
            )}
            {!somenteLeitura && <InstrucoesBox campo="tipo_armazenamento" />}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">3. Espaço Livre em Disco</Label>
            {somenteLeitura ? (
              <p className="text-sm bg-gray-50 rounded p-2 border">{avaliacao.espaco_disco || "—"}</p>
            ) : (
              <Select value={avaliacao.espaco_disco} onValueChange={(v) => handleChange("espaco_disco", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mais de 100 GB livres">Mais de 100 GB livres (0 pontos)</SelectItem>
                  <SelectItem value="Entre 50 e 100 GB livres">Entre 50 e 100 GB livres (3 pontos)</SelectItem>
                  <SelectItem value="Entre 20 e 50 GB livres">Entre 20 e 50 GB livres (6 pontos)</SelectItem>
                  <SelectItem value="Menos de 20 GB livres">Menos de 20 GB livres (10 pontos)</SelectItem>
                </SelectContent>
              </Select>
            )}
            {!somenteLeitura && <InstrucoesBox campo="espaco_disco" />}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">4. Versão do Windows</Label>
            {somenteLeitura ? (
              <p className="text-sm bg-gray-50 rounded p-2 border">{avaliacao.versao_windows || "—"}</p>
            ) : (
              <Select value={avaliacao.versao_windows} onValueChange={(v) => handleChange("versao_windows", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Windows 10">Windows 10 (5 pontos)</SelectItem>
                  <SelectItem value="Windows 11">Windows 11 (0 pontos)</SelectItem>
                </SelectContent>
              </Select>
            )}
            {!somenteLeitura && <InstrucoesBox campo="versao_windows" />}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">5. Antivírus</Label>
            {somenteLeitura ? (
              <p className="text-sm bg-gray-50 rounded p-2 border">{avaliacao.antivirus || "—"}</p>
            ) : (
              <Select value={avaliacao.antivirus} onValueChange={(v) => handleChange("antivirus", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim, está ativo">Sim, está ativo (0 pontos)</SelectItem>
                  <SelectItem value="Aparece aviso de desativado">Aparece aviso de desativado (5 pontos)</SelectItem>
                  <SelectItem value="Não tem antivírus">Não tem antivírus (10 pontos)</SelectItem>
                </SelectContent>
              </Select>
            )}
            {!somenteLeitura && <InstrucoesBox campo="antivirus" />}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">6. Desempenho Geral Percebido</Label>
            {somenteLeitura ? (
              <p className="text-sm bg-gray-50 rounded p-2 border">{avaliacao.desempenho || "—"}</p>
            ) : (
              <Select value={avaliacao.desempenho} onValueChange={(v) => handleChange("desempenho", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Muito rápido">Muito rápido (0 pontos)</SelectItem>
                  <SelectItem value="Bom">Bom (3 pontos)</SelectItem>
                  <SelectItem value="Normal">Normal (6 pontos)</SelectItem>
                  <SelectItem value="Lento">Lento (8 pontos)</SelectItem>
                  <SelectItem value="Muito lento">Muito lento (10 pontos)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">7. Problemas Percebidos</Label>
            {somenteLeitura ? (
              <div className="bg-gray-50 rounded p-3 border">
                {problemas.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum problema reportado</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {problemas.map(p => <Badge key={p} variant="outline" className="text-red-700 border-red-200">{p}</Badge>)}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border">
                {problemasOpcoes.map((problema) => (
                  <div key={problema} className="flex items-center space-x-2">
                    <Checkbox
                      id={problema}
                      checked={problemas.includes(problema)}
                      onCheckedChange={(c) => handleProblemaChange(problema, c)}
                    />
                    <label htmlFor={problema} className="text-sm cursor-pointer">{problema}</label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">8. Equipamento Atende Seu Trabalho?</Label>
            {somenteLeitura ? (
              <p className="text-sm bg-gray-50 rounded p-2 border">{avaliacao.atende_trabalho || "—"}</p>
            ) : (
              <Select value={avaliacao.atende_trabalho} onValueChange={(v) => handleChange("atende_trabalho", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim (0 pontos)</SelectItem>
                  <SelectItem value="Parcialmente">Parcialmente (5 pontos)</SelectItem>
                  <SelectItem value="Não">Não (10 pontos)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">9. Na Sua Opinião, o Computador Deveria:</Label>
            {somenteLeitura ? (
              <p className="text-sm bg-gray-50 rounded p-2 border">{avaliacao.recomendacao_usuario || "—"}</p>
            ) : (
              <Select value={avaliacao.recomendacao_usuario} onValueChange={(v) => handleChange("recomendacao_usuario", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Continuar como está">Continuar como está (0 pontos)</SelectItem>
                  <SelectItem value="Receber melhorias (upgrade)">Receber melhorias (upgrade) (3 pontos)</SelectItem>
                  <SelectItem value="Ser substituído">Ser substituído (5 pontos)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">10. Satisfação Geral (0 a 10)</Label>
            {somenteLeitura ? (
              <p className="text-sm bg-gray-50 rounded p-2 border">{avaliacao.satisfacao || "—"}</p>
            ) : (
              <Select value={avaliacao.satisfacao} onValueChange={(v) => handleChange("satisfacao", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nota 8 a 10">Nota 8 a 10 (0 pontos)</SelectItem>
                  <SelectItem value="Nota 5 a 7">Nota 5 a 7 (3 pontos)</SelectItem>
                  <SelectItem value="Nota 0 a 4">Nota 0 a 4 (5 pontos)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}