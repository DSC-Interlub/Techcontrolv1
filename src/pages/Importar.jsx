import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Importar() {
  const [selectedEntity, setSelectedEntity] = useState("");
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const queryClient = useQueryClient();

  const entities = [
    { value: "PCs_Internos", label: "PCs Internos" },
    { value: "Notebooks_Externos", label: "Notebooks Externos" },
    { value: "Smartphones", label: "Smartphones" },
    { value: "Cameras", label: "Câmeras" },
    { value: "Coletores", label: "Coletores" },
    { value: "Canetas_Vibracao", label: "Canetas de Vibração" },
  ];

  const downloadTemplate = () => {
    const templates = {
      PCs_Internos: [
        "data_aquisicao,tempo_uso,tipo,marca,nota_fiscal,modelo,processador,etiqueta_interna,service_tag,usuario_atual,area,office,status,condicao",
        "2024-01-15,1 ano,Desktop,Dell,NF12345,OptiPlex 7090,Intel i7,PC001,ABC123,João Silva,TI,Office 2021,Em uso,Rápido",
      ],
      Notebooks_Externos: [
        "data_aquisicao,tempo_uso,tipo,marca,nota_fiscal,modelo,processador,etiqueta_interna,service_tag,usuario_atual,uf,office,status,condicao",
        "2024-01-15,1 ano,Notebook,Dell,NF12345,Latitude 5520,Intel i5,NB001,ABC123,Maria Santos,SP,Office 2021,Disponível,Normal",
      ],
      Smartphones: [
        "data_aquisicao,uso_anos,operadora,linha_celular,quantidade,marca,nota_fiscal,fornecedor,valor,modelo,cor,imei,usuario_atual,status",
        "2024-01-15,1,Vivo,(11) 99999-9999,1,Samsung,NF12345,Tech Store,2500,Galaxy S23,Preto,123456789012345,Pedro Costa,Em uso",
      ],
      Cameras: [
        "numero_sequencial,data_aquisicao,marca,nota_fiscal,fornecedor,modelo,etiqueta_interna,service_tag,usuario_atual,area,status",
        "CAM001,2024-01-15,Canon,NF12345,Photo Store,EOS R6,CAM001,ABC123,Ana Lima,Marketing,Em uso",
      ],
      Coletores: [
        "numero_sequencial,data_aquisicao,tipo,marca,nota_fiscal,fornecedor,modelo,etiqueta_interna,service_tag,usuario_atual,area,status",
        "COL001,2024-01-15,Coletor de dados,Zebra,NF12345,Tech Distribuidor,MC3300,COL001,ABC123,Carlos Souza,Logística,Em uso",
      ],
      Canetas_Vibracao: [
        "numero_sequencial,data_aquisicao,tipo,marca,nota_fiscal,fornecedor,modelo,etiqueta_interna,service_tag,usuario_atual,area,status",
        "CAN001,2024-01-15,Caneta Vibratória,Wacom,NF12345,Art Supplies,Intuos Pro,CAN001,ABC123,Fernanda Reis,Design,Em uso",
      ],
    };

    if (!selectedEntity) {
      alert("Selecione um tipo de equipamento primeiro");
      return;
    }

    const csvContent = templates[selectedEntity].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `template_${selectedEntity}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert("Por favor, selecione um arquivo CSV válido");
    }
  };

  const parseCSV = (text) => {
    const lines = text.split("\n").filter(line => line.trim());
    const headers = lines[0].split(",").map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      if (values.length === headers.length) {
        const obj = {};
        headers.forEach((header, index) => {
          let value = values[index].trim();
          
          // Converter valores numéricos
          if (header === "uso_anos" || header === "quantidade" || header === "valor") {
            value = parseFloat(value) || 0;
          }
          
          obj[header] = value;
        });
        data.push(obj);
      }
    }

    return data;
  };

  const handleImport = async () => {
    if (!file || !selectedEntity) {
      alert("Selecione um tipo de equipamento e um arquivo CSV");
      return;
    }

    setImporting(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const data = parseCSV(text);

      let successCount = 0;
      let errorCount = 0;

      for (const item of data) {
        try {
          await base44.entities[selectedEntity].create(item);
          successCount++;
        } catch (error) {
          console.error("Erro ao importar item:", error);
          errorCount++;
        }
      }

      queryClient.invalidateQueries();
      setResult({ success: successCount, error: errorCount, total: data.length });
      setImporting(false);
      setFile(null);
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
            Importe seus equipamentos através de arquivos CSV
          </p>
        </div>

        <div className="space-y-6">
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Passo 1: Baixar Template
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
                  <strong>Importante:</strong> Baixe o template CSV com as colunas corretas para o tipo de equipamento selecionado. 
                  O arquivo já vem com um exemplo de preenchimento.
                </AlertDescription>
              </Alert>

              <Button
                onClick={downloadTemplate}
                disabled={!selectedEntity}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Template CSV
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Passo 2: Enviar Arquivo Preenchido
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Arquivo CSV</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                </div>
                {file && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Arquivo selecionado: {file.name}
                  </p>
                )}
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Dica:</strong> Certifique-se de que o arquivo CSV está no formato correto, 
                  com as colunas separadas por vírgula e seguindo o template baixado.
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
                    <p>Total de registros: <strong>{result.total}</strong></p>
                    <p className="text-green-600">Importados com sucesso: <strong>{result.success}</strong></p>
                    {result.error > 0 && (
                      <p className="text-red-600">Erros: <strong>{result.error}</strong></p>
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