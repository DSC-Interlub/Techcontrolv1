
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Clipboard, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input"; // Added Input component

export default function Importar() {
  const [selectedEntity, setSelectedEntity] = useState("");
  const [pastedData, setPastedData] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // Renamed from 'result'

  const queryClient = useQueryClient();

  const entityOptions = [ // Renamed from 'entities'
    { value: "PCs_Internos", label: "PCs Internos" },
    { value: "Notebooks_Externos", label: "Notebooks Externos" },
    { value: "Smartphones", label: "Smartphones" },
    { value: "Cameras", label: "Câmeras" },
    { value: "Coletores", label: "Coletores" },
    { value: "Canetas_Vibracao", label: "Canetas de Vibração" },
    { value: "Ramais", label: "Ramais" }, // Added new entity
  ];

  // Removed columnMapping object as it's replaced by mapColumns function

  const handleDownloadTemplate = () => {
    let template = "";
    let filename = "";

    switch (selectedEntity) {
      case "PCs_Internos":
        template = "DATA_AQUISICAO\tTEMPO_USO\tTIPO\tMARCA\tNOTA_FISCAL\tMODELO\tPROCESSADOR\tETIQUETA_INTERNA\tSERVICE_TAG\tUSUARIO_ATUAL\tAREA\tOFFICE\tANTIVIRUS\tSTATUS\tCONDICAO\tDATA_FORMATACAO\tOBSERVACOES\n" +
                   "18/05/2021\t4 anos\tDesktop\tDell\t3061217\tOptiPlex 7090\tIntel i7\tIL-DKP-001\tABC123\tJoão Silva\tTI\tOffice 2021\tSim\tEm uso\tRápido\t10/01/2023\tObservação PC";
        filename = "template_pcs_internos.txt";
        break;
      case "Notebooks_Externos":
        template = "DATA_AQUISICAO\tTEMPO_USO\tTIPO\tMARCA\tNOTA_FISCAL\tMODELO\tPROCESSADOR\tETIQUETA_INTERNA\tSERVICE_TAG\tUSUARIO_ATUAL\tUF\tOFFICE\tANTIVIRUS\tSTATUS\tCONDICAO\tDATA_FORMATACAO\tDISPONIVEL_PARA_RESERVA\tOBSERVACOES\n" +
                   "18/05/2021\t2 anos\tNotebook\tDell\t3061217\tLatitude 5520\tIntel i5\tIL-NBK-001\tABC123\tPedro Costa\tSP\tOffice 2021\tSim\tDisponível\tNormal\t\tNão\tObservação Notebook";
        filename = "template_notebooks_externos.txt";
        break;
      case "Smartphones":
        template = "DATA_AQUISICAO\tUSO_ANOS\tOPERADORA\tLINHA_CELULAR\tQUANTIDADE\tMARCA\tNOTA_FISCAL\tFORNECEDOR\tVALOR\tMODELO\tCOR\tIMEI\tUSUARIO_ATUAL\tSTATUS\tOBSERVACOES\n" +
                   "18/05/2021\t1\tVivo\t(11) 99999-9999\t1\tSamsung\t3061217\tTech Store\t2500,00\tGalaxy S23\tPreto\t123456789012345\tAna Lima\tEm uso\tObservação Smartphone";
        filename = "template_smartphones.txt";
        break;
      case "Cameras":
        template = "NUMERO_SEQUENCIAL\tDATA_AQUISICAO\tMARCA\tNOTA_FISCAL\tFORNECEDOR\tMODELO\tETIQUETA_INTERNA\tSERVICE_TAG\tUSUARIO_ATUAL\tUSUARIO_DESDE\tAREA\tSTATUS\tOBSERVACOES\n" +
                   "1\t06/07/2023\tFLIR\t381\tMOICA COMERCIO\tCamera Termografica\tIL-CAM-001\t894071849\tMárcio Rossetto\t28/10/2025\tEngenharia\tEm uso\tObservação Câmera";
        filename = "template_cameras.txt";
        break;
      case "Coletores":
        template = "NUMERO_SEQUENCIAL\tDATA_AQUISICAO\tTIPO\tMARCA\tNOTA_FISCAL\tFORNECEDOR\tMODELO\tETIQUETA_INTERNA\tSERVICE_TAG\tUSUARIO_ATUAL\tAREA\tSTATUS\tOBSERVACOES\n" +
                   "COL001\t18/05/2021\tColetor de dados\tZebra\t3061217\tTech Distribuidor\tMC3300\tCOL001\tABC123\tFernanda Reis\tLogística\tEm uso\tObservação Coletor";
        filename = "template_coletores.txt";
        break;
      case "Canetas_Vibracao":
        template = "NUMERO_SEQUENCIAL\tDATA_AQUISICAO\tTIPO\tMARCA\tNOTA_FISCAL\tFORNECEDOR\tMODELO\tETIQUETA_INTERNA\tSERVICE_TAG\tUSUARIO_ATUAL\tAREA\tSTATUS\tOBSERVACOES\n" +
                   "CAN001\t18/05/2021\tCaneta Vibratória\tWacom\t3061217\tArt Supplies\tIntuos Pro\tCAN001\tABC123\tLucas Oliveira\tDesign\tEm uso\tObservação Caneta";
        filename = "template_canetas_vibracao.txt";
        break;
      case "Ramais": // Added new entity template
        template = "USUARIO\tRAMAL\tAREA\n" +
                   "Maria Silva\t3001\tComercial\n" +
                   "João Pereira\t3002\tFinanceiro";
        filename = "template_ramais.txt";
        break;
      default:
        alert("Selecione um tipo de equipamento primeiro para baixar o template.");
        return;
    }

    const blob = new Blob([template], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); // Append to body to make it clickable
    a.click();
    document.body.removeChild(a); // Clean up
    URL.revokeObjectURL(url); // Release object URL
  };

  const parseDate = (dateStr) => {
    if (!dateStr || dateStr.trim() === "") return null;
    
    // Check if it's already an ISO-like format (yyyy-mm-dd)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Regex for dd/mm/yyyy, dd-mm-yyyy, yyyy/mm/dd, yyyy-mm-dd
    const formats = [
      /^(\d{2})[/-](\d{2})[/-](\d{4})$/, // dd/mm/yyyy or dd-mm-yyyy
      /^(\d{4})[/-](\d{2})[/-](\d{2})$/, // yyyy/mm/dd or yyyy-mm-dd
    ];

    for (let format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let year, month, day;
        if (format.source.startsWith("^(\\d{4})")) { // yyyy-mm-dd or yyyy/mm/dd
          [, year, month, day] = match;
        } else { // dd-mm-yyyy or dd/mm/yyyy
          [, day, month, year] = match;
        }
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    return null;
  };

  const mapColumns = (header, row, entity) => {
    const data = {};
    
    if (entity === "Ramais") {
      header.forEach((col, index) => {
        const value = row[index]?.trim() || "";
        const colUpper = col.toUpperCase();
        
        if (colUpper === "USUARIO" || colUpper === "USUÁRIO") {
          data.usuario = value; // Changed from usuario_atual to usuario for Ramais
          if (value) {
            data.data_atribuicao = new Date().toISOString().split('T')[0];
          }
        } else if (colUpper === "RAMAL") {
          data.ramal = value;
        } else if (colUpper === "AREA" || colUpper === "ÁREA") {
          data.area = value;
        }
      });
      return data;
    }

    if (entity === "PCs_Internos" || entity === "Notebooks_Externos") {
      header.forEach((col, index) => {
        const value = row[index]?.trim() || "";
        const colUpper = col.toUpperCase();
        
        if (colUpper === "DATA_AQUISICAO" || colUpper === "DATA_AQUISIÇÃO") {
          data.data_aquisicao = parseDate(value);
        } else if (colUpper === "TEMPO_USO") {
          data.tempo_uso = value;
        } else if (colUpper === "TIPO") {
          data.tipo = value;
        } else if (colUpper === "MARCA") {
          data.marca = value;
        } else if (colUpper === "NOTA_FISCAL") {
          data.nota_fiscal = value;
        } else if (colUpper === "MODELO") {
          data.modelo = value;
        } else if (colUpper === "PROCESSADOR") {
          data.processador = value;
        } else if (colUpper === "ETIQUETA_INTERNA") {
          data.etiqueta_interna = value;
        } else if (colUpper === "SERVICE_TAG") {
          data.service_tag = value;
        } else if (colUpper === "USUARIO_ATUAL" || colUpper === "USUÁRIO_ATUAL") {
          data.usuario_atual = value;
        } else if (colUpper === "AREA" || colUpper === "ÁREA") {
          data.area = value;
        } else if (colUpper === "UF") {
          data.uf = value;
        } else if (colUpper === "OFFICE") {
          data.office = value;
        } else if (colUpper === "ANTIVIRUS" || colUpper === "ANTIVÍRUS") {
          if (value.toLowerCase() === "sim" || value.toLowerCase() === "s") {
            data.antivirus = "Sim";
          } else if (value.toLowerCase() === "não" || value.toLowerCase() === "nao" || value.toLowerCase() === "n") {
            data.antivirus = "Não";
          } else if (value.toLowerCase() === "n/a" || value === "") {
            data.antivirus = "Não se aplica";
          } else {
            data.antivirus = value;
          }
        } else if (colUpper === "STATUS") {
          data.status = value;
        } else if (colUpper === "CONDICAO" || colUpper === "CONDIÇÃO") {
          data.condicao = value;
        } else if (colUpper === "DATA_FORMATACAO" || colUpper === "DATA_FORMATAÇÃO") {
          data.data_formatacao = parseDate(value);
        } else if (colUpper === "DISPONIVEL_PARA_RESERVA" || colUpper === "DISPONÍVEL_PARA_RESERVA") {
          data.disponivel_para_reserva = value.toLowerCase() === "sim" || value.toLowerCase() === "true";
        } else if (colUpper === "OBSERVACOES" || colUpper === "OBSERVAÇÕES") {
          data.observacoes = value;
        }
      });
      // Default status logic if not provided
      if (!data.status) {
        if (data.usuario_atual && data.usuario_atual.trim() !== "" && data.usuario_atual.trim().toUpperCase() !== "DISPONÍVEL" && data.usuario_atual.trim().toUpperCase() !== "DISPONIVEL") {
          data.status = "Em uso";
        } else {
          data.status = "Disponível";
          data.usuario_atual = ""; // Clear user if status is set to available
        }
      }
    } else if (entity === "Smartphones") {
      header.forEach((col, index) => {
        const value = row[index]?.trim() || "";
        const colUpper = col.toUpperCase();
        
        if (colUpper === "DATA_AQUISICAO" || colUpper === "DATA_AQUISIÇÃO") {
          data.data_aquisicao = parseDate(value);
        } else if (colUpper === "USO_ANOS") {
          data.uso_anos = value ? parseFloat(value) : null;
        } else if (colUpper === "OPERADORA") {
          data.operadora = value;
        } else if (colUpper === "LINHA_CELULAR") {
          data.linha_celular = value;
        } else if (colUpper === "QUANTIDADE") {
          data.quantidade = value ? parseInt(value) : null;
        } else if (colUpper === "MARCA") {
          data.marca = value;
        } else if (colUpper === "NOTA_FISCAL") {
          data.nota_fiscal = value;
        } else if (colUpper === "FORNECEDOR") {
          data.fornecedor = value;
        } else if (colUpper === "VALOR") {
          data.valor = value ? parseFloat(value.replace(/\./g, "").replace(",", ".")) : null;
        } else if (colUpper === "MODELO") {
          data.modelo = value;
        } else if (colUpper === "COR") {
          data.cor = value;
        } else if (colUpper === "IMEI") {
          data.imei = value;
        } else if (colUpper === "USUARIO_ATUAL" || colUpper === "USUÁRIO_ATUAL") {
          data.usuario_atual = value;
        } else if (colUpper === "STATUS") {
          data.status = value;
        } else if (colUpper === "OBSERVACOES" || colUpper === "OBSERVAÇÕES") {
          data.observacoes = value;
        }
      });
       // Default status logic if not provided
       if (!data.status) {
        if (data.usuario_atual && data.usuario_atual.trim() !== "" && data.usuario_atual.trim().toUpperCase() !== "DISPONÍVEL" && data.usuario_atual.trim().toUpperCase() !== "DISPONIVEL") {
          data.status = "Em uso";
        } else {
          data.status = "Disponível";
          data.usuario_atual = "";
        }
      }
    } else if (entity === "Cameras" || entity === "Coletores" || entity === "Canetas_Vibracao") {
      header.forEach((col, index) => {
        const value = row[index]?.trim() || "";
        const colUpper = col.toUpperCase();
        
        if (colUpper === "NUMERO_SEQUENCIAL" || colUpper === "NÚMERO_SEQUENCIAL" || colUpper === "#" || colUpper === "Nº SEQ" || colUpper === "N SEQ") {
          data.numero_sequencial = value;
        } else if (colUpper === "DATA_AQUISICAO" || colUpper === "DATA_AQUISIÇÃO") {
          data.data_aquisicao = parseDate(value);
        } else if (colUpper === "TIPO") {
          data.tipo = value;
        } else if (colUpper === "MARCA") {
          data.marca = value;
        } else if (colUpper === "NOTA_FISCAL") {
          data.nota_fiscal = value;
        } else if (colUpper === "FORNECEDOR") {
          data.fornecedor = value;
        } else if (colUpper === "MODELO") {
          data.modelo = value;
        } else if (colUpper === "ETIQUETA_INTERNA") {
          data.etiqueta_interna = value;
        } else if (colUpper === "SERVICE_TAG" || colUpper === "SERVICE TAG/ SERIAL NUMBER" || colUpper === "SERIAL NUMBER") {
          data.service_tag = value;
        } else if (colUpper === "USUARIO_ATUAL" || colUpper === "USUÁRIO_ATUAL") {
          data.usuario_atual = value;
        } else if (colUpper === "USUARIO_DESDE" || colUpper === "USUÁRIO_DESDE") {
          data.usuario_desde = parseDate(value);
        } else if (colUpper === "AREA" || colUpper === "ÁREA") {
          data.area = value;
        } else if (colUpper === "STATUS") {
          data.status = value;
        } else if (colUpper === "OBSERVACOES" || colUpper === "OBSERVAÇÕES") {
          data.observacoes = value;
        }
      });
       // Default status logic if not provided
       if (!data.status) {
        if (data.usuario_atual && data.usuario_atual.trim() !== "" && data.usuario_atual.trim().toUpperCase() !== "DISPONÍVEL" && data.usuario_atual.trim().toUpperCase() !== "DISPONIVEL") {
          data.status = "Em uso";
        } else {
          data.status = "Disponível";
          data.usuario_atual = "";
        }
      }
    }

    return data;
  };

  const handleImport = async (dataText) => {
    if (!selectedEntity) {
      alert("Selecione uma entidade primeiro!");
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const lines = dataText.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        throw new Error("Dados insuficientes: precisa de cabeçalho e pelo menos uma linha de dados.");
      }

      // Determine separator: tab or comma
      const firstLine = lines[0];
      const separator = firstLine.includes('\t') ? '\t' : (firstLine.includes(',') ? ',' : null);

      if (!separator) {
          throw new Error("Não foi possível detectar o separador (tabulação ou vírgula) no cabeçalho.");
      }

      const header = lines[0].split(separator).map(h => h.trim());
      const dataRows = lines.slice(1);

      const records = [];
      const validationErrors = [];

      dataRows.forEach((line, lineIndex) => {
        const values = line.split(separator).map(v => v.trim());
        if (values.length !== header.length) {
          validationErrors.push({
            item: `Linha ${lineIndex + 2} (dados): "${line}"`, // +2 because of header + 0-indexing
            error: `Número de colunas (${values.length}) não corresponde ao cabeçalho (${header.length}).`,
            lineData: line
          });
          return; // Skip this line
        }
        const mappedRecord = mapColumns(header, values, selectedEntity);
        if (Object.keys(mappedRecord).length > 0) { // Only add if mapping produced data
          records.push(mappedRecord);
        }
      });


      if (records.length === 0) {
        let errorMessage = "Nenhum registro válido encontrado para importação.";
        if (validationErrors.length > 0) {
            errorMessage += ` Foram encontrados ${validationErrors.length} erros de validação nas linhas.`;
        }
        throw new Error(errorMessage);
      }

      const results = [];
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        try {
          // Attempt to create a unique identifier for error reporting if possible
          const identifier = record.etiqueta_interna || record.numero_sequencial || record.imei || record.ramal || `Item ${i + 1}`;
          await base44.entities[selectedEntity].create(record);
          results.push({ success: true, record: identifier });
        } catch (error) {
          const identifier = record.etiqueta_interna || record.numero_sequencial || record.imei || record.ramal || `Item ${i + 1}`;
          results.push({ success: false, record: identifier, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      const importErrors = results.filter(r => !r.success).map(r => ({ item: r.record, error: r.error }));

      setImportResult({
        total: records.length,
        success: successCount,
        errors: errorCount,
        details: importErrors.concat(validationErrors.map(err => ({ item: err.item, error: err.error }))).slice(0, 5) // Combine and show top 5 errors
      });

      if (successCount > 0) {
        queryClient.invalidateQueries(); // Invalidate queries only if some items were successful
      }

    } catch (error) {
      setImportResult({
        total: 0,
        success: 0,
        errors: 1,
        details: [{ item: "Processamento inicial", error: error.message }]
      });
      console.error("Erro geral na importação:", error);
    } finally {
      setImporting(false);
      setPastedData(""); // Clear pasted data after attempt
    }
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    // Reset file input for next upload
    e.target.value = null; 

    const reader = new FileReader();
    reader.onload = (event) => {
      handleImport(event.target.result);
    };
    reader.onerror = () => {
        alert("Erro ao ler o arquivo.");
        setImporting(false);
    }
    reader.readAsText(uploadedFile);
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
                    {entityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleDownloadTemplate}
                disabled={!selectedEntity}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Template de Exemplo (Opcional)
              </Button>
            </CardContent>
          </Card>

          {selectedEntity && ( // Only show tabs if entity is selected
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

                  <TabsContent value="paste" className="space-y-4 pt-4">
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
                        <p className="mt-2"><strong>Formato de data aceito:</strong> dd/mm/yyyy, dd-mm-yyyy, yyyy/mm/dd, yyyy-mm-dd</p>
                        <p className="mt-1">
                          <strong>Observação de Status:</strong> Se a coluna "STATUS" for preenchida, esse valor será usado. Caso contrário, o status será inferido a partir da coluna "USUÁRIO_ATUAL": "Em uso" se houver usuário, "Disponível" se o usuário for vazio ou indicar disponibilidade.
                        </p>
                      </AlertDescription>
                    </Alert>

                    <div>
                      <Label>Cole os dados do Excel aqui:</Label>
                      <Textarea
                        placeholder="Cole aqui os dados copiados do Excel (Ctrl+V)&#10;&#10;Exemplo:&#10;DATA_AQUISICAO    TEMPO_USO    TIPO    MARCA    NOTA_FISCAL...&#10;18/05/2021    4 anos    Desktop    Dell    3061217..."
                        value={pastedData}
                        onChange={(e) => setPastedData(e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </div>

                    <Button
                      onClick={() => handleImport(pastedData)}
                      disabled={!pastedData || importing}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="lg"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        "Importar Dados"
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="file" className="space-y-4 pt-4">
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        Aceita arquivos .txt, .csv ou .tsv. Certifique-se de que os dados estejam separados por tabulação ou vírgula.
                      </AlertDescription>
                    </Alert>

                    <div>
                      <Label>Selecione o arquivo:</Label>
                      <Input
                        type="file"
                        accept=".txt,.csv,.tsv"
                        onChange={handleFileUpload}
                        disabled={importing}
                        className="block w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                      />
                    </div>

                    <Button
                      onClick={() => document.querySelector('input[type="file"]').click()} // Trigger file input click
                      disabled={importing}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="lg"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        "Upload e Importar"
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {importResult && ( // Display importResult (formerly 'result')
            <Card className="shadow-xl border-2 border-green-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Importação Concluída!</h3>
                  <div className="space-y-2 text-gray-600">
                    <p>Total de registros processados: <strong>{importResult.total}</strong></p>
                    <p className="text-green-600">✓ Importados com sucesso: <strong>{importResult.success}</strong></p>
                    {importResult.errors > 0 && (
                      <>
                        <p className="text-red-600">✗ Com erros: <strong>{importResult.errors}</strong></p>
                        {importResult.details && importResult.details.length > 0 && (
                          <div className="mt-4 text-left">
                            <p className="text-sm font-medium text-gray-700 mb-2">Primeiros erros encontrados:</p>
                            <div className="space-y-1">
                              {importResult.details.map((err, idx) => (
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
