
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Clipboard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Importar() {
  const [selectedEntity, setSelectedEntity] = useState("");
  const [file, setFile] = useState(null);
  const [pastedData, setPastedData] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);

  const queryClient = useQueryClient();

  const entities = [
    { value: "PCs_Internos", label: "PCs Internos" },
    { value: "Notebooks_Externos", label: "Notebooks Externos" },
    { value: "Smartphones", label: "Smartphones" },
    { value: "Cameras", label: "Câmeras" },
    { value: "Coletores", label: "Coletores" },
    { value: "Canetas_Vibracao", label: "Canetas de Vibração" },
  ];

  // Mapeamento de colunas do Excel para campos da entidade
  const columnMapping = {
    PCs_Internos: {
      "AQUISIÇÃO": "data_aquisicao",
      "AQUISICAO": "data_aquisicao",
      "USO EM ANOS": "tempo_uso",
      "TIPO": "tipo",
      "MARCA": "marca",
      "NF": "nota_fiscal",
      "MODELO": "modelo",
      "PROCESSADOR": "processador",
      "ETIQUETA INTERNA": "etiqueta_interna",
      "SERVICE TAG DELL / SERIAL NUMBER": "service_tag",
      "SERVICE TAG": "service_tag",
      "SERIAL NUMBER": "service_tag",
      "USUÁRIO": "usuario_atual",
      "USUARIO": "usuario_atual",
      "USUÁRIO ATUAL": "usuario_atual",
      "USUÁRIO ANTERIOR": "usuario_anterior",
      "USUARIO ANTERIOR": "usuario_anterior",
      "ÁREA": "area",
      "AREA": "area",
      "OFFICE": "office",
      "STATUS": "status_original",
      "CONDIÇÃO": "condicao",
      "CONDICAO": "condicao",
      "ANTIVÍRUS": "antivirus",
      "ANTIVIRUS": "antivirus",
      "DATA FORMATAÇÃO": "data_formatacao",
      "DATA FORMATACAO": "data_formatacao",
      "OBSERVAÇÕES": "observacoes",
      "OBSERVACOES": "observacoes"
    },
    Notebooks_Externos: {
      "AQUISIÇÃO": "data_aquisicao",
      "AQUISICAO": "data_aquisicao",
      "USO EM ANOS": "tempo_uso",
      "TIPO": "tipo",
      "MARCA": "marca",
      "NF": "nota_fiscal",
      "MODELO": "modelo",
      "PROCESSADOR": "processador",
      "ETIQUETA INTERNA": "etiqueta_interna",
      "SERVICE TAG DELL / SERIAL NUMBER": "service_tag",
      "SERVICE TAG": "service_tag",
      "SERIAL NUMBER": "service_tag",
      "USUÁRIO": "usuario_atual",
      "USUARIO": "usuario_atual",
      "USUÁRIO ATUAL": "usuario_atual",
      "USUÁRIO ANTERIOR": "usuario_anterior",
      "USUARIO ANTERIOR": "usuario_anterior",
      "UF": "uf",
      "ÁREA": "area",
      "AREA": "area",
      "OFFICE": "office",
      "STATUS": "status_original",
      "CONDIÇÃO": "condicao",
      "CONDICAO": "condicao",
      "ANTIVÍRUS": "antivirus",
      "ANTIVIRUS": "antivirus",
      "DATA FORMATAÇÃO": "data_formatacao",
      "DATA FORMATACAO": "data_formatacao",
      "OBSERVAÇÕES": "observacoes",
      "OBSERVACOES": "observacoes"
    },
    Smartphones: {
      "AQUISIÇÃO": "data_aquisicao",
      "AQUISICAO": "data_aquisicao",
      "USO EM ANOS": "uso_anos",
      "OPERADORA": "operadora",
      "LINHA CELULAR": "linha_celular",
      "QUANTIDADE": "quantidade",
      "MARCA": "marca",
      "NF": "nota_fiscal",
      "FORNECEDOR": "fornecedor",
      "VALOR": "valor",
      "MODELO": "modelo",
      "COR": "cor",
      "IMEI": "imei",
      "USUÁRIO": "usuario_atual",
      "USUARIO": "usuario_atual",
      "STATUS": "status_original"
    },
    Cameras: {
      "Nº SEQ": "numero_sequencial",
      "N SEQ": "numero_sequencial",
      "AQUISIÇÃO": "data_aquisicao",
      "AQUISICAO": "data_aquisicao",
      "MARCA": "marca",
      "NF": "nota_fiscal",
      "FORNECEDOR": "fornecedor",
      "MODELO": "modelo",
      "ETIQUETA INTERNA": "etiqueta_interna",
      "SERVICE TAG": "service_tag",
      "USUÁRIO": "usuario_atual",
      "USUARIO": "usuario_atual",
      "ÁREA": "area",
      "AREA": "area",
      "STATUS": "status_original"
    },
    Coletores: {
      "Nº SEQ": "numero_sequencial",
      "N SEQ": "numero_sequencial",
      "AQUISIÇÃO": "data_aquisicao",
      "AQUISICAO": "data_aquisicao",
      "TIPO": "tipo",
      "MARCA": "marca",
      "NF": "nota_fiscal",
      "FORNECEDOR": "fornecedor",
      "MODELO": "modelo",
      "ETIQUETA INTERNA": "etiqueta_interna",
      "SERVICE TAG": "service_tag",
      "USUÁRIO": "usuario_atual",
      "USUARIO": "usuario_atual",
      "ÁREA": "area",
      "AREA": "area",
      "STATUS": "status_original"
    },
    Canetas_Vibracao: {
      "Nº SEQ": "numero_sequencial",
      "N SEQ": "numero_sequencial",
      "AQUISIÇÃO": "data_aquisicao",
      "AQUISICAO": "data_aquisicao",
      "TIPO": "tipo",
      "MARCA": "marca",
      "NF": "nota_fiscal",
      "FORNECEDOR": "fornecedor",
      "MODELO": "modelo",
      "ETIQUETA INTERNA": "etiqueta_interna",
      "SERVICE TAG": "service_tag",
      "USUÁRIO": "usuario_atual",
      "USUARIO": "usuario_atual",
      "ÁREA": "area",
      "AREA": "area",
      "STATUS": "status_original"
    }
  };

  const downloadTemplate = () => {
    const templates = {
      PCs_Internos:
        "AQUISIÇÃO\tUSO EM ANOS\tTIPO\tMARCA\tNF\tMODELO\tPROCESSADOR\tETIQUETA INTERNA\tSERVICE TAG DELL / SERIAL NUMBER\tUSUÁRIO\tUSUÁRIO ANTERIOR\tÁREA\tOFFICE\tSTATUS\tCONDIÇÃO\tANTIVÍRUS\n" +
        "18/05/2021\t4 anos\tDesktop\tDell\t3061217\tOptiPlex 7090\tIntel i7\tIL-DKP-001\tABC123\tJoão Silva\tMaria Santos\tTI\tOffice 2021\tEm uso\tRápido\tSim",
      Notebooks_Externos:
        "AQUISIÇÃO\tUSO EM ANOS\tTIPO\tMARCA\tNF\tMODELO\tPROCESSADOR\tETIQUETA INTERNA\tSERVICE TAG DELL / SERIAL NUMBER\tUSUÁRIO\tUSUÁRIO ANTERIOR\tUF\tOFFICE\tSTATUS\tCONDIÇÃO\tANTIVÍRUS\n" +
        "18/05/2021\t2 anos\tNotebook\tDell\t3061217\tLatitude 5520\tIntel i5\tIL-NBK-001\tABC123\tPedro Costa\t\tSP\tOffice 2021\tDisponível\tNormal\tSim",
      Smartphones:
        "AQUISIÇÃO\tUSO EM ANOS\tOPERADORA\tLINHA CELULAR\tQUANTIDADE\tMARCA\tNF\tFORNECEDOR\tVALOR\tMODELO\tCOR\tIMEI\tUSUÁRIO\tSTATUS\n" +
        "18/05/2021\t1\tVivo\t(11) 99999-9999\t1\tSamsung\t3061217\tTech Store\t2500\tGalaxy S23\tPreto\t123456789012345\tAna Lima\tEm uso",
      Cameras:
        "Nº SEQ\tAQUISIÇÃO\tMARCA\tNF\tFORNECEDOR\tMODELO\tETIQUETA INTERNA\tSERVICE TAG\tUSUÁRIO\tÁREA\tSTATUS\n" +
        "CAM001\t18/05/2021\tCanon\t3061217\tPhoto Store\tEOS R6\tCAM001\tABC123\tCarlos Souza\tMarketing\tEm uso",
      Coletores:
        "Nº SEQ\tAQUISIÇÃO\tTIPO\tMARCA\tNF\tFORNECEDOR\tMODELO\tETIQUETA INTERNA\tSERVICE TAG\tUSUÁRIO\tÁREA\tSTATUS\n" +
        "COL001\t18/05/2021\tColetor de dados\tZebra\t3061217\tTech Distribuidor\tMC3300\tCOL001\tABC123\tFernanda Reis\tLogística\tEm uso",
      Canetas_Vibracao:
        "Nº SEQ\tAQUISIÇÃO\tTIPO\tMARCA\tNF\tFORNECEDOR\tMODELO\tETIQUETA INTERNA\tSERVICE TAG\tUSUÁRIO\tÁREA\tSTATUS\n" +
        "CAN001\t18/05/2021\tCaneta Vibratória\tWacom\t3061217\tArt Supplies\tIntuos Pro\tCAN001\tABC123\tLucas Oliveira\tDesign\tEm uso",
    };

    if (!selectedEntity) {
      alert("Selecione um tipo de equipamento primeiro");
      return;
    }

    const content = templates[selectedEntity];
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `template_${selectedEntity}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const convertDateToISO = (dateStr) => {
    if (!dateStr || dateStr.trim() === "") return null;
    
    // Se já está no formato ISO (yyyy-mm-dd)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    // Formato brasileiro (dd/mm/yyyy)
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return null;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      
      // Preview do arquivo
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split("\n").filter(line => line.trim());
        setPreview({
          totalLines: lines.length,
          firstLines: lines.slice(0, 3)
        });
      };
      reader.readAsText(selectedFile);
    }
  };

  const handlePastedDataChange = (value) => {
    setPastedData(value);
    setResult(null);
    
    if (value.trim()) {
      const lines = value.split("\n");
      
      // Filtra linhas válidas: não vazias E que tenham pelo menos uma tabulação ou vírgula
      const validLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        // Verifica se a linha tem pelo menos um separador (tab ou vírgula)
        return trimmed.includes("\t") || trimmed.includes(",");
      });
      
      // Detecta o separador da primeira linha
      const separator = validLines[0]?.includes("\t") ? "\t" : ",";
      
      // Conta quantas colunas o cabeçalho tem
      const headerColumnCount = validLines[0]?.split(separator).length || 0;
      
      // Filtra apenas linhas que tenham o mesmo número de colunas do cabeçalho
      const consistentLines = validLines.filter((line, index) => {
        if (index === 0) return true; // Sempre inclui o cabeçalho
        const columnCount = line.split(separator).length;
        return columnCount === headerColumnCount;
      });
      
      setPreview({
        totalLines: consistentLines.length -1, // Subtract 1 for header
        firstLines: consistentLines.slice(0, 3)
      });
    } else {
      setPreview(null);
    }
  };

  const parseData = (text) => {
    // Divide por quebras de linha
    const allLines = text.split("\n");
    
    // Filtra linhas válidas: não vazias E que tenham pelo menos uma tabulação ou vírgula
    const validLines = allLines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      // Verifica se a linha tem pelo menos um separador (tab ou vírgula)
      return trimmed.includes("\t") || trimmed.includes(",");
    });
    
    if (validLines.length === 0) return [];
    
    // Detecta separador (tab ou vírgula)
    const separator = validLines[0].includes("\t") ? "\t" : ",";
    
    // Primeira linha são os headers
    const headers = validLines[0].split(separator).map(h => h.trim().toUpperCase());
    const headerColumnCount = headers.length;
    const data = [];

    const mapping = columnMapping[selectedEntity] || {};

    // Começar do índice 1 para pular o cabeçalho
    for (let i = 1; i < validLines.length; i++) {
      const line = validLines[i].trim();
      if (!line) continue; // Pula linhas vazias
      
      const values = validLines[i].split(separator);
      
      // IMPORTANTE: Verifica se a linha tem o número correto de colunas
      if (values.length !== headerColumnCount) {
        console.warn(`Linha ${i + 1} tem ${values.length} colunas, esperado ${headerColumnCount}. Pulando.`);
        continue;
      }
      
      // Verifica se a linha não é apenas valores vazios
      const hasData = values.some(v => v.trim() !== "");
      if (!hasData) {
        console.warn(`Linha ${i + 1} não tem dados. Pulando.`);
        continue;
      }
      
      const obj = {};
      let tempUsuarioAtual = null;
      let tempStatusOriginal = null;
      
      headers.forEach((header, index) => {
        let value = values[index].trim();
        
        // Mapeia o nome da coluna
        const fieldName = mapping[header] || header.toLowerCase().replace(/ /g, "_");
        
        // Conversões específicas
        if (fieldName === "data_aquisicao" || fieldName === "data_formatacao") {
          value = convertDateToISO(value);
        } else if (fieldName === "tempo_uso") {
          value = value || "";
        } else if (fieldName === "uso_anos") {
          const parsed = parseFloat(value);
          value = isNaN(parsed) ? 0 : parsed;
        } else if (fieldName === "quantidade") {
          const parsed = parseInt(value);
          value = isNaN(parsed) ? 0 : parsed;
        } else if (fieldName === "valor") {
          // Remove pontos e vírgulas e converte para número
          const cleanValue = value.replace(/\./g, "").replace(",", ".");
          const parsed = parseFloat(cleanValue);
          value = isNaN(parsed) ? 0 : parsed;
        } else if (fieldName === "usuario_anterior" && value) {
          obj.usuarios_anteriores = [{
            nome: value,
            data_inicio: obj.data_aquisicao || "",
            data_fim: ""
          }];
          return;
        } else if (fieldName === "usuario_atual") {
          tempUsuarioAtual = value;
        } else if (fieldName === "status_original") {
          tempStatusOriginal = value;
        } else if (fieldName === "tipo") {
          value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        } else if (fieldName === "antivirus") {
          if (value.toLowerCase() === "sim" || value.toLowerCase() === "s") {
            value = "Sim";
          } else if (value.toLowerCase() === "não" || value.toLowerCase() === "nao" || value.toLowerCase() === "n") {
            value = "Não";
          } else if (value.toLowerCase() === "n/a" || value === "") {
            value = "Não se aplica";
          }
        }
        
        if (value !== null && value !== "" && fieldName !== "status_original") {
          obj[fieldName] = value;
        }
      });
      
      // Define o status automaticamente baseado no usuário atual
      // Prioridade: se tem status original válido no Excel, usa ele
      // Senão, define automaticamente baseado no usuário
      if (tempStatusOriginal && tempStatusOriginal.trim() !== "") {
        obj.status = tempStatusOriginal.trim();
      }
      
      // Processa o usuário atual e ajusta status se necessário
      if (tempUsuarioAtual && tempUsuarioAtual.trim() !== "") {
        const usuarioUpper = tempUsuarioAtual.trim().toUpperCase();
        if (usuarioUpper === "DISPONÍVEL" || usuarioUpper === "DISPONIVEL" || usuarioUpper === "RESERVA") {
          obj.usuario_atual = "";
          if (!obj.status) {
            obj.status = "Disponível";
          }
        } else {
          obj.usuario_atual = tempUsuarioAtual.trim();
          if (!obj.status) {
            obj.status = "Em uso";
          }
        }
      } else {
        obj.usuario_atual = "";
        if (!obj.status) {
          obj.status = "Disponível";
        }
      }

      // Final fallback to ensure status is always set if none of the above conditions applied
      if (!obj.status) {
        obj.status = "Disponível";
      }
      
      data.push(obj);
    }

    return data;
  };

  const handleImportFromPaste = async () => {
    if (!pastedData || !selectedEntity) {
      alert("Selecione um tipo de equipamento e cole os dados");
      return;
    }

    await processImport(pastedData);
  };

  const handleImportFromFile = async () => {
    if (!file || !selectedEntity) {
      alert("Selecione um tipo de equipamento e um arquivo");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      await processImport(text);
    };
    reader.readAsText(file);
  };

  const processImport = async (text) => {
    setImporting(true);
    setResult(null);

    const data = parseData(text);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const item of data) {
      try {
        await base44.entities[selectedEntity].create(item);
        successCount++;
      } catch (error) {
        console.error("Erro ao importar item:", error);
        errorCount++;
        errors.push({
          item: item.etiqueta_interna || item.modelo || "Item",
          error: error.message
        });
      }
    }

    queryClient.invalidateQueries();
    setResult({ 
      success: successCount, 
      error: errorCount, 
      total: data.length,
      errors: errors.slice(0, 5) // Mostra apenas os 5 primeiros erros
    });
    setImporting(false);
    setFile(null);
    setPastedData("");
    setPreview(null);
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Importar Dados
          </h1>
          <p className="text-gray-600">
            Cole os dados do Excel ou faça upload de arquivo
          </p>
        </div>

        <div className="space-y-6">
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Passo 1: Selecione o Tipo de Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Tipo de Equipamento *</Label>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity.value} value={entity.value}>
                        {entity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={downloadTemplate}
                disabled={!selectedEntity}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Template de Exemplo (Opcional)
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <Clipboard className="w-5 h-5" />
                Passo 2: Importar Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="paste" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="paste">
                    <Clipboard className="w-4 h-4 mr-2" />
                    Colar do Excel
                  </TabsTrigger>
                  <TabsTrigger value="file">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload de Arquivo
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="paste" className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Como usar:</strong>
                      <ol className="list-decimal ml-4 mt-2 space-y-1">
                        <li>Selecione as células no Excel (incluindo o cabeçalho)</li>
                        <li>Copie (Ctrl+C ou Cmd+C)</li>
                        <li>Cole aqui (Ctrl+V ou Cmd+V)</li>
                        <li>Clique em "Importar Dados"</li>
                      </ol>
                      <p className="mt-2"><strong>Formato de data:</strong> dd/mm/yyyy (exemplo: 18/05/2021)</p>
                      <p className="mt-1">
                        <strong>Precedência de Status:</strong> Se a coluna "STATUS" for preenchida, esse valor será usado. Caso contrário, o status será inferido a partir da coluna "USUÁRIO": "Em uso" se houver usuário, "Disponível" se o usuário for vazio ou indicar disponibilidade.
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label>Cole os dados do Excel aqui:</Label>
                    <Textarea
                      placeholder="Cole aqui os dados copiados do Excel (Ctrl+V)&#10;&#10;Exemplo:&#10;AQUISIÇÃO    USO EM ANOS    TIPO    MARCA    NF    MODELO...&#10;18/05/2021    4 anos    Desktop    Dell    3061217    OptiPlex 7090..."
                      value={pastedData}
                      onChange={(e) => handlePastedDataChange(e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                    />
                    {preview && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 font-medium">
                          ✓ {preview.totalLines} registros detectados
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Primeira linha (cabeçalho): {preview.firstLines[0]?.substring(0, 80)}...
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleImportFromPaste}
                    disabled={!pastedData || !selectedEntity || importing}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    size="lg"
                  >
                    {importing ? "Importando..." : "Importar Dados"}
                  </Button>
                </TabsContent>

                <TabsContent value="file" className="space-y-4">
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Aceita arquivos .txt, .csv ou .tsv com dados separados por tabulação ou vírgula.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label>Selecione o arquivo:</Label>
                    <input
                      type="file"
                      accept=".txt,.csv,.tsv"
                      onChange={handleFileChange}
                      className="block w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                    {file && preview && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 font-medium">
                          ✓ Arquivo: {file.name}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {preview.totalLines -1} registros detectados
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleImportFromFile}
                    disabled={!file || !selectedEntity || importing}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    size="lg"
                  >
                    {importing ? "Importando..." : "Importar Dados"}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {result && (
            <Card className="shadow-xl border-2 border-green-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Importação Concluída!</h3>
                  <div className="space-y-2 text-gray-600">
                    <p>Total de registros processados: <strong>{result.total}</strong></p>
                    <p className="text-green-600">✓ Importados com sucesso: <strong>{result.success}</strong></p>
                    {result.error > 0 && (
                      <>
                        <p className="text-red-600">✗ Com erros: <strong>{result.error}</strong></p>
                        {result.errors && result.errors.length > 0 && (
                          <div className="mt-4 text-left">
                            <p className="text-sm font-medium text-gray-700 mb-2">Primeiros erros encontrados:</p>
                            <div className="space-y-1">
                              {result.errors.map((err, idx) => (
                                <p key={idx} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                  {err.item}: {err.error}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
