import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, TrendingUp, AlertTriangle, XCircle, Save, Info, ChevronDown, ChevronUp, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarDataSemFuso } from "@/utils/date";
import { calcularPontuacaoEquipamento } from "@/utils/eval";
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

const POWERSHELL_SCRIPT = `$ErrorActionPreference = "SilentlyContinue"; $os = Get-CimInstance Win32_OperatingSystem; $windowsVersion = $os.Caption + " (" + $os.Version + ")"; $totalRAM = $os.TotalVisibleMemorySize; $freeRAM = $os.FreePhysicalMemory; $usedRAM = $totalRAM - $freeRAM; $totalRAM_GB = [math]::Round($totalRAM / 1MB, 1); $freeRAM_GB = [math]::Round($freeRAM / 1MB, 1); $usedRAM_GB = [math]::Round($usedRAM / 1MB, 1); $ramUsagePct = [math]::Round(($usedRAM / $totalRAM) * 100, 1); $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"; $totalSpaceGB = [math]::Round($disk.Size / 1GB, 1); $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 1); $freeSpacePct = [math]::Round(($disk.FreeSpace / $disk.Size) * 100, 1); $mediaType = "Não detectado"; try { $physicalDisk = Get-PhysicalDisk | Where-Object { $_.DeviceId -eq 0 -or $_.MediaType -ne $null } | Select-Object -First 1; if ($physicalDisk) { $mediaType = $physicalDisk.MediaType.ToString() } } catch {}; $antivirusList = @(); $antivirusAtivo = $false; try { $avProducts = Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct; if ($avProducts) { foreach ($av in $avProducts) { $stateHex = "{0:x}" -f $av.productState; $isActive = $false; if ($stateHex.Length -ge 4) { $isActive = $stateHex -match "1[0-9a-f]{3}$" -or $stateHex -match "1[0-9a-f]{1}$" }; if ($isActive -or $av.productState -eq 397568 -or $av.productState -eq 266240) { $antivirusAtivo = $true }; $antivirusList += $av.displayName } } } catch {}; $avStatus = "Inativo"; if ($antivirusAtivo) { $avStatus = "Ativo" }; $detectedAVs = if ($antivirusList.Count -gt 0) { $antivirusList -join ", " } else { "Não detectado" }; $cpu = Get-CimInstance Win32_Processor; $cpuModel = $cpu.Name.Trim(); $uptimeDays = 0; $uptimeHours = 0; try { $bootTime = $os.LastBootUpTime; $uptimeSpan = (Get-Date) - $bootTime; $uptimeDays = [math]::Floor($uptimeSpan.TotalDays); $uptimeHours = [math]::Floor($uptimeSpan.Hours) } catch {}; $result = @{ data_coleta = (Get-Date -Format "yyyy-MM-dd HH:mm:ss"); windows_versao = $windowsVersion; ram_uso_percentual = $ramUsagePct; ram_total_gb = $totalRAM_GB; ram_utilizada_gb = $usedRAM_GB; ram_livre_gb = $freeRAM_GB; disco_capacidade_gb = $totalSpaceGB; disco_livre_gb = $freeSpaceGB; disco_livre_percentual = $freeSpacePct; disco_tipo = $mediaType; antivirus_nome = $detectedAVs; antivirus_ativo = $avStatus; processador_modelo = $cpuModel; uptime_dias = $uptimeDays; uptime_horas = $uptimeHours }; $jsonResult = $result | ConvertTo-Json -Compress; Write-Host ":::START_JSON:::"; Write-Host $jsonResult; Write-Host ":::END_JSON:::"`;

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

  const [coletaModoManual, setColetaModoManual] = useState(false);
  const [jsonColado, setJsonColado] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [jsonPreview, setJsonPreview] = useState(null);
  const [problemas, setProblemas] = useState(avaliacaoExistente?.problemas || []);
  const [salvando, setSalvando] = useState(false);
  const ehMonitor = equipamento?.tipo === "Monitor";

  const calcularPontuacao = (dados) => {
    return calcularPontuacaoEquipamento(dados, equipamento?.data_aquisicao);
  };

  const resultado = calcularPontuacao(avaliacao);

  const handleChange = (campo, valor) => {
    if (somenteLeitura) return;
    setAvaliacao(prev => ({ ...prev, [campo]: valor }));
  };

  const handleJsonPaste = (val) => {
    setJsonColado(val);
    setJsonError("");
    setJsonPreview(null);
    if (!val.trim()) return;

    try {
      let jsonStr = val;
      const startIdx = val.indexOf(":::START_JSON:::");
      const endIdx = val.indexOf(":::END_JSON:::");

      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = val.substring(startIdx + 16, endIdx).trim();
      }

      const parsed = JSON.parse(jsonStr);
      
      const requiredKeys = ["ram_uso_percentual", "disco_tipo", "disco_livre_gb", "windows_versao", "antivirus_ativo"];
      const hasKeys = requiredKeys.every(k => parsed[k] !== undefined);

      if (!hasKeys) {
        setJsonError("O JSON colado não contém todos os dados de hardware esperados.");
        return;
      }

      setJsonPreview(parsed);
    } catch (e) {
      setJsonError("Formato inválido. Certifique-se de copiar a saída do script inteira.");
    }
  };

  const aplicarDadosColetados = () => {
    if (!jsonPreview) return;
    
    const ramFormatada = `${jsonPreview.ram_uso_percentual}% em uso (Total: ${jsonPreview.ram_total_gb} GB | Utilizada: ${jsonPreview.ram_utilizada_gb} GB | Livre: ${jsonPreview.ram_livre_gb} GB)`;
    const discoFormatado = `${jsonPreview.disco_livre_gb} GB livres (Capacidade: ${jsonPreview.disco_capacidade_gb} GB | Tipo: ${jsonPreview.disco_tipo})`;
    const antivirusFormatado = `${jsonPreview.antivirus_ativo} (${jsonPreview.antivirus_nome})`;

    setAvaliacao(prev => ({
      ...prev,
      memoria_ram: ramFormatada,
      tipo_armazenamento: jsonPreview.disco_tipo,
      espaco_disco: discoFormatado,
      versao_windows: jsonPreview.windows_versao,
      antivirus: antivirusFormatado
    }));

    setJsonColado("");
    setJsonPreview(null);
    alert("Dados técnicos aplicados com sucesso! Revise os valores gerados no questionário abaixo.");
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
                este equipamento foi adquirido em {formatarDataSemFuso(equipamento.data_aquisicao)},{" "}
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
          {/* Perguntas Técnicas (1 a 5) - Ocultadas para Monitor */}
          {!ehMonitor && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Dados Técnicos do Hardware
                  </h3>
                  {!somenteLeitura && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setColetaModoManual(v => !v)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {coletaModoManual ? "Usar Coleta Automática (Recomendado)" : "Desejo preencher manualmente"}
                    </Button>
                  )}
                </div>

                {!somenteLeitura && !coletaModoManual && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Recomendamos o uso da coleta automática para maior precisão das métricas e para evitar o preenchimento manual incorreto.
                    </p>
                    <div className="flex flex-col md:flex-row gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(POWERSHELL_SCRIPT);
                          alert("Script copiado! Abra o PowerShell, cole (Ctrl+V) e pressione Enter.");
                        }}
                        className="gap-2 shrink-0 text-xs h-9"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        1. Copiar Script PowerShell
                      </Button>
                      
                      <div className="flex-1">
                        <textarea
                          placeholder="2. Cole aqui todo o resultado gerado no PowerShell..."
                          value={jsonColado}
                          onChange={(e) => handleJsonPaste(e.target.value)}
                          className="w-full text-xs p-2.5 border rounded-lg h-9 min-h-[36px] max-h-40 focus:ring-1 focus:ring-blue-500 font-mono resize-y"
                        />
                      </div>
                    </div>

                    {jsonError && (
                      <p className="text-xs text-red-600 font-medium">{jsonError}</p>
                    )}

                    {jsonPreview && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-lg p-3 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          Dados de Hardware Detectados com Sucesso!
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                          <p>💻 <strong>Sistema:</strong> {jsonPreview.windows_versao}</p>
                          <p>⚙️ <strong>Processador:</strong> {jsonPreview.processador_modelo}</p>
                          <p>🧠 <strong>RAM:</strong> {jsonPreview.ram_uso_percentual}% em uso (Total: {jsonPreview.ram_total_gb} GB | Utilizada: {jsonPreview.ram_utilizada_gb} GB | Livre: {jsonPreview.ram_livre_gb} GB)</p>
                          <p>💾 <strong>Disco C:</strong> {jsonPreview.disco_tipo} ({jsonPreview.disco_livre_gb} GB livres de {jsonPreview.disco_capacidade_gb} GB)</p>
                          <p>🛡️ <strong>Antivírus:</strong> {jsonPreview.antivirus_ativo} ({jsonPreview.antivirus_nome})</p>
                          <p>🕒 <strong>Uptime:</strong> {jsonPreview.uptime_dias}d {jsonPreview.uptime_horas}h</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={aplicarDadosColetados}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-8 text-xs font-semibold"
                        >
                          Confirmar e Aplicar Dados
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Exibição dos dados técnicos salvos/coletados */}
                {(somenteLeitura || !coletaModoManual) && (avaliacao.memoria_ram || avaliacao.tipo_armazenamento || avaliacao.espaco_disco) && (
                  <div className="bg-white dark:bg-slate-800 border rounded-lg p-3.5 space-y-2 text-xs">
                    <p className="font-semibold text-slate-700 dark:text-slate-300 border-b pb-1.5 mb-2">Dados Técnicos Carregados:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-slate-600 dark:text-slate-400">
                      <p>🧠 <strong>Memória RAM:</strong> {avaliacao.memoria_ram || "Não informado"}</p>
                      <p>💾 <strong>Tipo de Disco:</strong> {avaliacao.tipo_armazenamento || "Não informado"}</p>
                      <p>💽 <strong>Espaço Livre:</strong> {avaliacao.espaco_disco || "Não informado"}</p>
                      <p>💻 <strong>Sistema Operacional:</strong> {avaliacao.versao_windows || "Não informado"}</p>
                      <p>🛡️ <strong>Antivírus:</strong> {avaliacao.antivirus || "Não informado"}</p>
                    </div>
                  </div>
                )}

                {/* Questionário Manual Tradicional (Fallback) */}
                {!somenteLeitura && coletaModoManual && (
                  <div className="border border-dashed border-amber-300 bg-amber-50/30 rounded-lg p-4 space-y-4">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      ⚠️ Atenção: Recomendamos usar a coleta automática para maior precisão das métricas e rapidez.
                    </p>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">1. Análise de Memória (RAM)</Label>
                      <Select value={avaliacao.memoria_ram} onValueChange={(v) => handleChange("memoria_ram", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Menos de 50%">Menos de 50% (0 pontos)</SelectItem>
                          <SelectItem value="Entre 50% e 70%">Entre 50% e 70% (3 pontos)</SelectItem>
                          <SelectItem value="Entre 70% e 90%">Entre 70% e 90% (6 pontos)</SelectItem>
                          <SelectItem value="Acima de 90%">Acima de 90% (10 pontos)</SelectItem>
                        </SelectContent>
                      </Select>
                      <InstrucoesBox campo="memoria_ram" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">2. Tipo de Armazenamento</Label>
                      <Select value={avaliacao.tipo_armazenamento} onValueChange={(v) => handleChange("tipo_armazenamento", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HD">HD (5 pontos)</SelectItem>
                          <SelectItem value="SSD">SSD (0 pontos)</SelectItem>
                        </SelectContent>
                      </Select>
                      <InstrucoesBox campo="tipo_armazenamento" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">3. Espaço Livre em Disco</Label>
                      <Select value={avaliacao.espaco_disco} onValueChange={(v) => handleChange("espaco_disco", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mais de 100 GB livres">Mais de 100 GB livres (0 pontos)</SelectItem>
                          <SelectItem value="Entre 50 e 100 GB livres">Entre 50 e 100 GB livres (3 pontos)</SelectItem>
                          <SelectItem value="Entre 20 e 50 GB livres">Entre 20 e 50 GB livres (6 pontos)</SelectItem>
                          <SelectItem value="Menos de 20 GB livres">Menos de 20 GB livres (10 pontos)</SelectItem>
                        </SelectContent>
                      </Select>
                      <InstrucoesBox campo="espaco_disco" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">4. Versão do Windows</Label>
                      <Select value={avaliacao.versao_windows} onValueChange={(v) => handleChange("versao_windows", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Windows 10">Windows 10 (5 pontos)</SelectItem>
                          <SelectItem value="Windows 11">Windows 11 (0 pontos)</SelectItem>
                        </SelectContent>
                      </Select>
                      <InstrucoesBox campo="versao_windows" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">5. Antivírus</Label>
                      <Select value={avaliacao.antivirus} onValueChange={(v) => handleChange("antivirus", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sim, está ativo">Sim, está ativo (0 pontos)</SelectItem>
                          <SelectItem value="Aparece aviso de desativado">Aparece aviso de desativado (5 pontos)</SelectItem>
                          <SelectItem value="Não tem antivírus">Não tem antivírus (10 pontos)</SelectItem>
                        </SelectContent>
                      </Select>
                      <InstrucoesBox campo="antivirus" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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

          {!somenteLeitura && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSalvar} disabled={salvando} className="gap-2">
                <Save className="w-4 h-4" />
                {salvando ? "Salvando..." : "Salvar Avaliação"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}