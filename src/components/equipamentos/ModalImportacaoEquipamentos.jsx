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

  // Função auxiliar de normalização de etiqueta (ex: IL-DKP-28 -> IL-DKP-028, IL-NBK-8 -> IL-NBK-008)
  const normalizarEtiqueta = (val) => {
    if (!val) return "";
    const s = String(val).trim().toUpperCase();
    const m = s.match(/^(IL-[A-Z]+)-(\d+)$/);
    if (m) {
      return `${m[1]}-${String(parseInt(m[2], 10)).padStart(3, "0")}`;
    }
    return s;
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
        
        // Prioriza sheet com nome 'Resumo por Usuário' se existir, ou a primeira
        const wsname = wb.SheetNames.find(n => n.toLowerCase().includes("resumo") || n.toLowerCase().includes("usuario")) || wb.SheetNames[0];
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
          if (p.etiqueta_interna) {
            eqMap.set(normalizarEtiqueta(p.etiqueta_interna), { ...p, origem_tabela: 'pcs_internos' });
          }
        });
        notebooks.forEach(n => {
          if (n.etiqueta_interna) {
            eqMap.set(normalizarEtiqueta(n.etiqueta_interna), { ...n, origem_tabela: 'notebooks_externos' });
          }
        });

        // Mapa de colaboradores por nome para matching opcional de colaborador_id
        const colabMap = new Map();
        colaboradores.forEach(c => {
          if (c.nome_completo) {
            colabMap.set(c.nome_completo.trim().toLowerCase(), c);
          }
        });

        data.forEach((row, idx) => {
          // Busca campos em chaves flexíveis case-insensitive
          const getField = (possibleNames) => {
            const foundKey = Object.keys(row).find(k => {
              const kClean = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              return possibleNames.some(p => {
                const pClean = p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                return kClean === pClean || kClean.includes(pClean);
              });
            });
            return foundKey ? row[foundKey] : "";
          };

          const rawEtiqueta = getField([
            "máquina", "maquina", "etiqueta_interna", "etiqueta", "etiqueta interna", "equipamento", "ativo"
          ]);
          const etiqueta = rawEtiqueta ? String(rawEtiqueta).trim() : "";

          // Se a linha diz "Não", "Nao", "None" ou está vazia na máquina, ignora
          if (!etiqueta || etiqueta.toLowerCase() === "não" || etiqueta.toLowerCase() === "nao" || etiqueta.toLowerCase() === "none") {
            return;
          }

          const colabPlanilha = String(getField([
            "usuário / setor", "usuario / setor", "usuário", "usuario", "setor", "colaborador", "nome", "responsável"
          ])).trim();

          const antivirusPlanilha = String(getField([
            "antivírus", "antivirus", "eset", "kaspersky", "defender", "proteção"
          ])).trim();

          const dataFormatPlanilhaRaw = getField([
            "data de instalação do windows/formatação", "data de instalacao do windows/formatacao",
            "data de instalacao", "data instalacao", "formatação", "formatacao", "data_formatacao", "última formatação"
          ]);

          const rawAnydesk = getField([
            "anydesk", "anydesk id", "any desk", "acesso remoto", "any"
          ]);
          let anydeskPlanilha = rawAnydesk ? String(rawAnydesk).trim() : "";
          if (anydeskPlanilha.toLowerCase() === "não" || anydeskPlanilha.toLowerCase() === "nao" || anydeskPlanilha.toLowerCase() === "none") {
            anydeskPlanilha = "";
          }

          const key = normalizarEtiqueta(etiqueta);
          const eqExistente = eqMap.get(key);

          // Formatar data para YYYY-MM-DD se existir
          let dataFormatFormatada = null;
          if (dataFormatPlanilhaRaw) {
            if (dataFormatPlanilhaRaw instanceof Date) {
              const y = dataFormatPlanilhaRaw.getFullYear();
              const m = String(dataFormatPlanilhaRaw.getMonth() + 1).padStart(2, '0');
              const d = String(dataFormatPlanilhaRaw.getDate()).padStart(2, '0');
              dataFormatFormatada = `${y}-${m}-${d}`;
            } else {
              const str = dataFormatPlanilhaRaw.toString().trim();
              if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
                dataFormatFormatada = str.substring(0, 10);
              } else if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
                const parts = str.split("/");
                dataFormatFormatada = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            }
          }

          if (eqExistente) {
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

            // Descobrir se o usuário na planilha corresponde a um colaborador cadastrado
            let novoColaboradorId = eqExistente.colaborador_id;
            let novoUsuarioAtual = eqExistente.usuario_atual;
            if (colabPlanilha && colabPlanilha.toLowerCase() !== "disponível" && colabPlanilha.toLowerCase() !== "disponivel") {
              novoUsuarioAtual = colabPlanilha;
              const colabObj = colabMap.get(colabPlanilha.toLowerCase());
              if (colabObj) {
                novoColaboradorId = colabObj.id;
              }
            }

            const mudouAntivirus = avNormalizado && avNormalizado !== eqExistente.antivirus;
            const mudouNomeAv = avNome && avNome !== eqExistente.antivirus_nome;
            const mudouDataFormat = dataFormatFormatada && dataFormatFormatada !== eqExistente.data_formatacao;
            const mudouAnydesk = anydeskPlanilha && anydeskPlanilha !== (eqExistente.anydesk_id || "");
            const mudouUsuario = colabPlanilha && colabPlanilha !== (eqExistente.usuario_atual || "") && !colabPlanilha.toLowerCase().includes("disponível");

            rowsMapeadas.push({
              idx,
              etiqueta: eqExistente.etiqueta_interna || etiqueta,
              etiquetaPlanilha: etiqueta,
              tabela: eqExistente.origem_tabela,
              id: eqExistente.id,
              modelo: `${eqExistente.marca || ''} ${eqExistente.modelo || ''}`.trim() || 'Equipamento',
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
              novoUsuarioAtual,
              novoColaboradorId,
              temAlteracao: (mudouAntivirus || mudouNomeAv || mudouDataFormat || mudouAnydesk || mudouUsuario)
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
      const temLinhasComAlteracao = previewRows.some(r => r.temAlteracao);
      const rowsParaProcessar = temLinhasComAlteracao ? previewRows.filter(r => r.temAlteracao) : previewRows;

      for (const row of rowsParaProcessar) {
        const payload = {
          antivirus: row.novoAntivirus,
          antivirus_nome: row.novoAntivirusNome,
          data_formatacao: row.novaDataFormat,
          anydesk_id: row.novoAnydesk || null,
        };

        if (row.novoUsuarioAtual) {
          payload.usuario_atual = row.novoUsuarioAtual;
        }
        if (row.novoColaboradorId) {
          payload.colaborador_id = row.novoColaboradorId;
        }

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

      try {
        await supabase.rpc('pgrst_reload_schema');
      } catch (eRpc) {
        // Ignora se a function não existir no schema
      }

      queryClient.invalidateQueries({ queryKey: ['conformidade_ti'] });
      queryClient.invalidateQueries({ queryKey: ['pcs_internos'] });
      queryClient.invalidateQueries({ queryKey: ['pcs_internos_import'] });
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos'] });
      queryClient.invalidateQueries({ queryKey: ['notebooks_externos_import'] });

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
                Colunas aceitas: <code>Máquina</code> (ou Etiqueta), <code>Usuário / Setor</code>, <code>Antivírus</code>, <code>Data de Instalação do Windows/Formatação</code> e <code>AnyDesk</code>.
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
              disabled={processando || previewRows.length === 0}
            >
              {processando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : previewRows.filter(r => r.temAlteracao).length > 0 ? (
                `Confirmar e Atualizar (${previewRows.filter(r => r.temAlteracao).length})`
              ) : (
                `Reaplicar Dados da Planilha (${previewRows.length})`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
