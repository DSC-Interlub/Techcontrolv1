import React, { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ModalImportacaoEquipamentos({ open, onClose, pcs = [], notebooks = [], colaboradores = [] }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [unmatchedRows, setUnmatchedRows] = useState([]);
  const [processando, setProcessando] = useState(false);
  const [etapa, setEtapa] = useState("upload"); // 'upload' | 'preview' | 'concluido'

  const resetState = () => {
    setFile(null);
    setPreviewRows([]);
    setUnmatchedRows([]);
    setProcessando(false);
    setEtapa("upload");
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!data || data.length === 0) {
          toast({ variant: "destructive", title: "Arquivo vazio", description: "A planilha selecionada não contém linhas de dados." });
          return;
        }

        // Normalização de colunas da planilha
        const rowsMapeadas = [];
        const semCorrespondencia = [];

        // Mapa de equipamentos existentes por etiqueta normalizada
        const eqMap = new Map();
        pcs.forEach(p => {
          if (p.etiqueta_interna) eqMap.set(p.etiqueta_interna.trim().toUpperCase(), { ...p, origem_tabela: 'pcs_internos' });
        });
        notebooks.forEach(n => {
          if (n.etiqueta_interna) eqMap.set(n.etiqueta_interna.trim().toUpperCase(), { ...n, origem_tabela: 'notebooks_externos' });
        });

        data.forEach((row, idx) => {
          // Busca campos em chaves flexíveis
          const etiqueta = (
            row["etiqueta_interna"] || row["Etiqueta"] || row["ETIQUETA"] || row["Etiqueta Interna"] || row["etiqueta"] || ""
          ).toString().trim();

          const colabPlanilha = (
            row["colaborador"] || row["Colaborador"] || row["COLABORADOR"] || row["Nome"] || row["Usuário"] || ""
          ).toString().trim();

          const antivirusPlanilha = (
            row["antivirus"] || row["Antivírus"] || row["Antivirus"] || row["ANTIVIRUS"] || ""
          ).toString().trim();

          const dataFormatPlanilhaRaw = (
            row["data_formatacao"] || row["Data Formatação"] || row["Data da Formatação"] || row["Ultima Formatacao"] || ""
          );

          const anydeskPlanilha = (
            row["anydesk"] || row["AnyDesk"] || row["ANYDESK"] || row["Anydesk ID"] || ""
          ).toString().trim();

          if (!etiqueta) return; // ignora linha sem etiqueta

          const key = etiqueta.toUpperCase();
          const eqExistente = eqMap.get(key);

          // Formatar data para YYYY-MM-DD se existir
          let dataFormatFormatada = null;
          if (dataFormatPlanilhaRaw) {
            if (dataFormatPlanilhaRaw instanceof Date) {
              dataFormatFormatada = dataFormatPlanilhaRaw.toISOString().split("T")[0];
            } else {
              const str = dataFormatPlanilhaRaw.toString().trim();
              if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
                dataFormatFormatada = str;
              } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
                const [d, m, y] = str.split("/");
                dataFormatFormatada = `${y}-${m}-${d}`;
              }
            }
          }

          if (eqExistente) {
            // Verificar divergência de colaborador
            const colabAtual = eqExistente.usuario_atual || "";
            const divergenteColab = colabPlanilha && colabAtual && 
              colabPlanilha.toLowerCase() !== colabAtual.toLowerCase();

            // Antivírus normalizado (Sim/Não)
            let avNormalizado = null;
            let avNome = null;
            if (antivirusPlanilha) {
              const lower = antivirusPlanilha.toLowerCase();
              if (lower.includes("sim") || lower.includes("eset") || lower.includes("kaspersky") || lower.includes("defender")) {
                avNormalizado = "Sim";
                avNome = antivirusPlanilha.length > 3 ? antivirusPlanilha : "ESET";
              } else if (lower.includes("não") || lower.includes("nao")) {
                avNormalizado = "Não";
              }
            }

            rowsMapeadas.push({
              idx,
              etiqueta,
              tabela: eqExistente.origem_tabela,
              id: eqExistente.id,
              modelo: `${eqExistente.marca} ${eqExistente.modelo}`,
              colabAtual,
              colabPlanilha,
              divergenteColab,
              // Valores atuais
              antivirusAtual: eqExistente.antivirus,
              antivirusNomeAtual: eqExistente.antivirus_nome,
              dataFormatAtual: eqExistente.data_formatacao,
              anydeskAtual: eqExistente.anydesk_id,
              // Novos valores a aplicar
              novoAntivirus: avNormalizado || eqExistente.antivirus,
              novoAntivirusNome: avNome || eqExistente.antivirus_nome,
              novaDataFormat: dataFormatFormatada || eqExistente.data_formatacao,
              novoAnydesk: anydeskPlanilha || eqExistente.anydesk_id,
              temAlteracao: (
                (avNormalizado && avNormalizado !== eqExistente.antivirus) ||
                (avNome && avNome !== eqExistente.antivirus_nome) ||
                (dataFormatFormatada && dataFormatFormatada !== eqExistente.data_formatacao) ||
                (anydeskPlanilha && anydeskPlanilha !== eqExistente.anydesk_id)
              )
            });
          } else {
            semCorrespondencia.push({
              etiqueta,
              colaborador: colabPlanilha,
              antivirus: antivirusPlanilha
            });
          }
        });

        setPreviewRows(rowsMapeadas);
        setUnmatchedRows(semCorrespondencia);
        setEtapa("preview");
      } catch (err) {
        console.error("Erro ao ler excel:", err);
        toast({ variant: "destructive", title: "Erro na leitura", description: "Não foi possível interpretar o arquivo Excel." });
      }
    };

    reader.readAsBinaryString(uploadedFile);
  };

  const executarImportacao = async () => {
    setProcessando(true);
    let atualizados = 0;
    try {
      for (const row of previewRows) {
        if (!row.temAlteracao) continue;

        const payload = {
          antivirus: row.novoAntivirus,
          antivirus_nome: row.novoAntivirusNome,
          data_formatacao: row.novaDataFormat,
          anydesk_id: row.novoAnydesk
        };

        const { error } = await supabase
          .from(row.tabela)
          .update(payload)
          .eq("id", row.id);

        if (error) {
          console.error(`Erro ao atualizar ${row.etiqueta}:`, error);
        } else {
          atualizados++;
        }
      }

      await supabase.rpc('pgrst_reload_schema').catch(() => null);

      queryClient.invalidateQueries({ queryKey: ['conformidade_ti'] });
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });

      toast({
        title: "Importação concluída!",
        description: `${atualizados} equipamentos atualizados com sucesso a partir da planilha.`,
      });
      resetState();
      onClose();
    } catch (e) {
      console.error("Erro na importação em lote:", e);
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: e.message || "Ocorreu um erro durante a atualização.",
      });
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { resetState(); onClose(); } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Importação em Lote via Excel (.xlsx)</DialogTitle>
              <DialogDescription>
                Atualize Antivírus, Data de Formatação e AnyDesk de PCs e Notebooks comparando por Etiqueta Interna
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {etapa === "upload" && (
          <div className="py-6 space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 hover:bg-slate-100/50 transition-colors">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-800">Selecione o arquivo da planilha (.xlsx)</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Colunas esperadas no arquivo: <code>etiqueta_interna</code>, <code>colaborador</code>, <code>antivirus</code>, <code>data_formatacao</code>, <code>anydesk</code>.
              </p>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="mt-4 inline-block text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
              />
            </div>
          </div>
        )}

        {etapa === "preview" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Prévia de Alterações</p>
                <p className="text-xs text-slate-500">
                  {previewRows.filter(r => r.temAlteracao).length} equipamentos identificados com alterações | {unmatchedRows.length} etiquetas não encontradas
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEtapa("upload")}>
                Trocar Arquivo
              </Button>
            </div>

            {unmatchedRows.length > 0 && (
              <Alert className="bg-amber-50 border-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <AlertDescription className="text-xs text-amber-900">
                  <strong>Atenção:</strong> {unmatchedRows.length} etiquetas da planilha não foram encontradas no cadastro:{" "}
                  <code>{unmatchedRows.slice(0, 5).map(u => u.etiqueta).join(", ")}{unmatchedRows.length > 5 ? "..." : ""}</code>. Estas linhas serão ignoradas.
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs">Etiqueta</TableHead>
                    <TableHead className="text-xs">Equipamento</TableHead>
                    <TableHead className="text-xs">Colaborador</TableHead>
                    <TableHead className="text-xs">Antivírus (Atual → Novo)</TableHead>
                    <TableHead className="text-xs">Formatação (Atual → Nova)</TableHead>
                    <TableHead className="text-xs">AnyDesk</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((r, i) => (
                    <TableRow key={i} className={`text-xs ${r.temAlteracao ? "bg-emerald-50/30" : ""}`}>
                      <TableCell className="font-mono font-bold text-slate-900">{r.etiqueta}</TableCell>
                      <TableCell>{r.modelo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{r.colabPlanilha || r.colabAtual || "—"}</p>
                          {r.divergenteColab && (
                            <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-800 border-amber-300">
                              Diverge: sistema tem {r.colabAtual}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">{r.antivirusAtual || "—"}</span>
                          {r.novoAntivirus && r.novoAntivirus !== r.antivirusAtual && (
                            <>
                              <ArrowRight className="w-3 h-3 text-emerald-600" />
                              <span className="font-bold text-emerald-700">{r.novoAntivirusNome || r.novoAntivirus}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">{r.dataFormatAtual || "—"}</span>
                          {r.novaDataFormat && r.novaDataFormat !== r.dataFormatAtual && (
                            <>
                              <ArrowRight className="w-3 h-3 text-emerald-600" />
                              <span className="font-bold text-emerald-700">{r.novaDataFormat}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{r.novoAnydesk || r.anydeskAtual || "—"}</span>
                      </TableCell>
                      <TableCell>
                        {r.temAlteracao ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Alteração</Badge>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Sem mudanças</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => { resetState(); onClose(); }} disabled={processando}>
            Cancelar
          </Button>
          {etapa === "preview" && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={executarImportacao}
              disabled={processando || previewRows.filter(r => r.temAlteracao).length === 0}
            >
              {processando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                `Confirmar e Atualizar (${previewRows.filter(r => r.temAlteracao).length})`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
