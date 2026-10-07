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

  // Reconciliação inteligente do nome do colaborador da planilha contra o cadastro oficial
  const reconciliarColaborador = (nomeRaw, listaColaboradores = []) => {
    if (!nomeRaw || typeof nomeRaw !== 'string') return null;
    const clean = nomeRaw.trim();
    if (!clean || ['não', 'nao', 'none', 'disponível', 'disponivel', 'livre', 'estoque'].includes(clean.toLowerCase())) {
      return null;
    }

    if (clean.toLowerCase().startsWith('compartilhado')) {
      const parts = clean.split(/[-—–]/);
      if (parts.length > 1) {
        return {
          tipo: 'compartilhado',
          nome_formatado: `Compartilhado — ${parts.slice(1).join(' ').trim()}`,
          colaborador: null
        };
      }
      return { tipo: 'compartilhado', nome_formatado: clean, colaborador: null };
    }

    // Remove prefixos conhecidos de cargos e vínculos
    const prefixos = [
      /^(aprendiz|jovem aprendiz)\s+/i,
      /^(estagiário|estagiario)\s+/i,
      /^(trainee)\s+/i,
      /^(assistente|analista|auxiliar|coordenador|gerente|diretor)\s+/i
    ];
    let nomeSemPrefixo = clean;
    for (const p of prefixos) {
      nomeSemPrefixo = nomeSemPrefixo.replace(p, '').trim();
    }

    const norm = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const normNome = norm(nomeSemPrefixo);
    const normOriginal = norm(clean);

    // 1. Busca exata com nome sem prefixo
    let match = listaColaboradores.find(c => norm(c.nome_completo) === normNome);
    // 2. Busca exata com nome original
    if (!match) match = listaColaboradores.find(c => norm(c.nome_completo) === normOriginal);
    // 3. Substring: nome do colaborador contido ou contém o nome da planilha
    if (!match) {
      match = listaColaboradores.find(c => {
        const cNorm = norm(c.nome_completo);
        return (cNorm.length > 5 && normNome.includes(cNorm)) || (normNome.length > 5 && cNorm.includes(normNome));
      });
    }
    // 4. Token match: primeiro e último nome
    if (!match) {
      const tokens = normNome.split(/\s+/).filter(Boolean);
      if (tokens.length >= 2) {
        const primeiro = tokens[0];
        const ultimo = tokens[tokens.length - 1];
        match = listaColaboradores.find(c => {
          const cTokens = norm(c.nome_completo).split(/\s+/).filter(Boolean);
          return cTokens.length >= 2 && cTokens[0] === primeiro && cTokens[cTokens.length - 1] === ultimo;
        });
      }
    }

    if (match) {
      return {
        tipo: 'colaborador',
        nome_formatado: match.nome_completo,
        colaborador: match,
        foiReconciliado: match.nome_completo.toLowerCase() !== clean.toLowerCase()
      };
    }

    return {
      tipo: 'avulso',
      nome_formatado: nomeSemPrefixo || clean,
      colaborador: null,
      foiReconciliado: false
    };
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
              if (lower.includes("sim") || lower.includes("eset") || lower.includes("kaspersky") || lower.includes("defender") || lower === "s") {
                avNormalizado = "Sim";
                avNome = antivirusPlanilha.length > 3 ? antivirusPlanilha : "ESET";
              } else if (lower.includes("não") || lower.includes("nao") || lower === "n") {
                avNormalizado = "Não";
                avNome = null;
              }
            }

            // Reconciliação inteligente do colaborador/setor
            const rec = reconciliarColaborador(colabPlanilha, colaboradores);
            let novoColaboradorId = eqExistente.colaborador_id;
            let novoUsuarioAtual = eqExistente.usuario_atual;

            if (rec) {
              if (rec.tipo === 'colaborador') {
                novoUsuarioAtual = rec.nome_formatado;
                novoColaboradorId = rec.colaborador.id;
              } else if (rec.tipo === 'compartilhado') {
                novoUsuarioAtual = rec.nome_formatado;
                novoColaboradorId = null;
              } else if (rec.tipo === 'avulso') {
                novoUsuarioAtual = rec.nome_formatado;
              }
            } else if (colabPlanilha && (colabPlanilha.toLowerCase().includes("disponível") || colabPlanilha.toLowerCase().includes("disponivel"))) {
              novoUsuarioAtual = "";
              novoColaboradorId = null;
            }

            const mudouAntivirus = avNormalizado && avNormalizado !== eqExistente.antivirus;
            const mudouNomeAv = avNome && avNome !== eqExistente.antivirus_nome;
            const mudouDataFormat = dataFormatFormatada && dataFormatFormatada !== eqExistente.data_formatacao;
            const mudouAnydesk = anydeskPlanilha && anydeskPlanilha !== (eqExistente.anydesk_id || "");
            const mudouUsuario = novoUsuarioAtual !== (eqExistente.usuario_atual || "");

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
              reconciliacao: rec,
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

        if (row.novoUsuarioAtual !== undefined) {
          payload.usuario_atual = row.novoUsuarioAtual;
        }
        if (row.novoColaboradorId !== undefined) {
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

          // Se a máquina possui ESET ou Antivírus Sim, sincroniza a tabela de avaliações e conclui pendências automáticas
          const isEsetAtivo = row.novoAntivirus === 'Sim' || (row.novoAntivirusNome || '').toLowerCase().includes('eset');
          if (isEsetAtivo) {
            try {
              // 1. Atualiza avaliações para 'Ativo (ESET)'
              await supabase
                .from('avaliacoes')
                .update({ antivirus: 'Ativo (ESET)' })
                .eq('equipamento_id', row.id);

              // 2. Conclui tarefas de antivírus que estavam pendentes
              await supabase
                .from('tarefas_manutencao_equipamento')
                .update({ status: 'Concluída' })
                .eq('equipamento_id', row.id)
                .ilike('descricao', '%antiv%')
                .eq('status', 'Pendente');
            } catch (errSync) {
              console.warn(`Aviso ao sincronizar avaliações/tarefas de ${row.etiqueta}:`, errSync);
            }
          }
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
      queryClient.invalidateQueries({ queryKey: ['portal_avaliacoes'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas_manutencao'] });

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
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{r.novoUsuarioAtual || r.colabPlanilha || "Estoque / Livre"}</p>
                          {r.reconciliacao?.foiReconciliado && (
                            <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200 block w-fit">
                              Reconciliado de "{r.colabPlanilha}"
                            </Badge>
                          )}
                          {!r.reconciliacao?.foiReconciliado && r.reconciliacao?.tipo === 'colaborador' && (
                            <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 block w-fit">
                              Colaborador Oficial
                            </Badge>
                          )}
                          {r.reconciliacao?.tipo === 'compartilhado' && (
                            <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-700 border-slate-200 block w-fit">
                              Setor Compartilhado
                            </Badge>
                          )}
                          {r.colabAtual && r.novoUsuarioAtual !== r.colabAtual && (
                            <span className="text-[10px] text-slate-400 block">
                              Anterior: {r.colabAtual}
                            </span>
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
