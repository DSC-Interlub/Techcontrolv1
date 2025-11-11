import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Importar() {
  const [selectedEntity, setSelectedEntity] = useState("");
  const [file, setFile] = useState(null);
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
      "USO EM ANOS": "tempo_uso",
      "TIPO": "tipo",
      "MARCA": "marca",
      "NF": "nota_fiscal",
      "MODELO": "modelo",
      "PROCESSADOR": "processador",
      "ETIQUETA INTERNA": "etiqueta_interna",
      "SERVICE TAG DELL / SERIAL NUMBER": "service_tag",
      "USUÁRIO": "usuario_atual",
      "USUÁRIO ANTERIOR": "usuario_anterior",
      "ÁREA": "area",
      "OFFICE": "office",
      "STATUS": "status",
      "CONDIÇÃO": "condicao",
      "ANTIVÍRUS": "antivirus",
      "DATA FORMATAÇÃO": "data_formatacao",
      "OBSERVAÇÕES": "observacoes"
    },
    Notebooks_Externos: {
      "AQUISIÇÃO": "data_aquisicao",
      "USO EM ANOS": "tempo_uso",
      "TIPO": "tipo",
      "MARCA": "marca",
      "NF": "nota_fiscal",
      "MODELO": "modelo",
      "PROCESSADOR": "processador",
      "ETIQUETA INTERNA": "etiqueta_interna",
      "SERVICE TAG DELL / SERIAL NUMBER": "service_tag",
      "USUÁRIO": "usuario_atual",
      "USUÁRIO ANTERIOR": "usuario_anterior",
      "UF": "uf",
      "OFFICE": "office",
      "STATUS": "status",
      "CONDIÇÃO": "condicao",
      "ANTIVÍRUS": "antivirus",
      "DATA FORMATAÇÃO": "data_formatacao",
      "OBSERVAÇÕES": "observacoes"
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

  const parseFile = (text) => {
    const lines = text.split("\n").filter(line => line.trim());
    
    // Detecta separador (tab ou vírgula)
    const separator = lines[0].includes("\t") ? "\t" : ",";
    
    // Primeira linha são os headers
    const headers = lines[0].split(separator).map(h => h.trim().toUpperCase());
    const data = [];

    const mapping = columnMapping[selectedEntity] || {};

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator);
      if (values.length === headers.length) {
        const obj = {};
        
        headers.forEach((header, index) => {
          let value = values[index].trim();
          
          // Mapeia o nome da coluna
          const fieldName = mapping[header] || header.toLowerCase().replace(/ /g, "_");
          
          // Conversões específicas
          if (fieldName === "data_aquisicao" || fieldName === "data_formatacao") {
            value = convertDateToISO(value);
          } else if (fieldName === "tempo_uso") {
            // Mantém como string mas limpa
            value = value || "";
          } else if (fieldName === "uso_anos") {
            value = parseFloat(value) || 0;
          } else if (fieldName === "quantidade" || fieldName === "valor") {
            value = parseFloat(value) || 0;
          } else if (fieldName === "usuario_anterior" && value) {
            // Converte usuário anterior em array de objetos
            obj.usuarios_anteriores = [{
              nome: value,
              data_inicio: obj.data_aquisicao || "",
              data_fim: ""
            }];
            return; // Não adiciona o campo original
          } else if (fieldName === "tipo") {
            // Normaliza o tipo
            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
          } else if (fieldName === "antivirus") {
            // Normaliza antivírus
            if (value.toLowerCase() === "sim" || value.toLowerCase() === "s") {
              value = "Sim";
            } else if (value.toLowerCase() === "não" || value.toLowerCase() === "nao" || value.toLowerCase() === "n") {
              value = "Não";
            } else if (value.toLowerCase() === "n/a" || value === "") {
              value = "Não se aplica";
            }
          } else if (fieldName === "status" && !value) {
            value = "Disponível";
          }
          
          if (value !== null && value !== "") {
            obj[fieldName] = value;
          }
        });
        
        data.push(obj);
      }
    }

    return data;
  };

  const handleImport = async () => {
    if (!file || !selectedEntity) {
      alert("Selecione um tipo de equipamento e um arquivo");
      return;
    }

    setImporting(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const data = parseFile(text);

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
      setPreview(null);
    };

    reader.readAsText(file);
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
            Importe seus equipamentos do Excel ou arquivo de texto
          </p>
        </div>

        <div className="space-y-6">
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Passo 1: Baixar Template (Opcional)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Tipo de Equipamento</Label>
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

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Formatos aceitos:</strong> Arquivo de texto (.txt), Excel copiado e colado, ou CSV. 
                  As colunas podem ser separadas por tabulação ou vírgula.
                  <br /><br />
                  <strong>Datas:</strong> Use o formato dd/mm/yyyy (exemplo: 18/05/2021)
                </AlertDescription>
              </Alert>

              <Button
                onClick={downloadTemplate}
                disabled={!selectedEntity}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Template com Exemplo
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Passo 2: Enviar Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Arquivo (.txt, .csv, ou cole do Excel)</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept=".txt,.csv,.tsv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                </div>
                {file && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      ✓ Arquivo selecionado: {file.name}
                    </p>
                    {preview && (
                      <div className="mt-2 text-xs text-gray-600">
                        <p>Total de linhas: {preview.totalLines} (incluindo cabeçalho)</p>
                        <p className="mt-1 font-mono bg-white p-2 rounded">
                          {preview.firstLines[0]?.substring(0, 100)}...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Como usar:</strong>
                  <ol className="list-decimal ml-4 mt-2 space-y-1">
                    <li>Copie os dados do seu Excel (incluindo o cabeçalho)</li>
                    <li>Cole em um arquivo de texto (.txt)</li>
                    <li>Ou salve seu Excel como CSV</li>
                    <li>Faça upload do arquivo aqui</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleImport}
                disabled={!file || !selectedEntity || importing}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {importing ? "Importando..." : "Importar Dados"}
              </Button>
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