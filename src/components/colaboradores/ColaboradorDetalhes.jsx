/**
 * ColaboradorDetalhes.jsx — Exibição de Detalhes Reorganizada por Assunto
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Pencil, Monitor, Laptop, Smartphone, Camera, Barcode, Pen, Phone, Headset,
  Eye, EyeOff, Copy, Check, User, Briefcase, Heart, ShoppingCart, Megaphone, Lock, Mail, Calendar, ShieldCheck
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ColaboradorDetalhes({ colaborador, onClose, onEdit, hideSenhas = false }) {
  const [showSenhas, setShowSenhas] = useState({});
  const [copied, setCopied] = useState({});

  // Buscar todos os equipamentos
  const { data: pcsInternos = [] } = useQuery({
    queryKey: ['pcs_internos_colaborador'],
    queryFn: () => base44.entities.PCs_Internos.list(),
  });

  const { data: notebooksExternos = [] } = useQuery({
    queryKey: ['notebooks_externos_colaborador'],
    queryFn: () => base44.entities.Notebooks_Externos.list(),
  });

  const { data: smartphones = [] } = useQuery({
    queryKey: ['smartphones_colaborador'],
    queryFn: () => base44.entities.Smartphones.list(),
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras_colaborador'],
    queryFn: () => base44.entities.Cameras.list(),
  });

  const { data: coletores = [] } = useQuery({
    queryKey: ['coletores_colaborador'],
    queryFn: () => base44.entities.Coletores.list(),
  });

  const { data: canetasVibracao = [] } = useQuery({
    queryKey: ['canetas_vibracao_colaborador'],
    queryFn: () => base44.entities.Canetas_Vibracao.list(),
  });

  const { data: ramais = [] } = useQuery({
    queryKey: ['ramais_colaborador'],
    queryFn: () => base44.entities.Ramais.list(),
  });

  const { data: chamados = [] } = useQuery({
    queryKey: ['chamados_colaborador'],
    queryFn: () => base44.entities.Chamados.list(),
  });

  const normalizeNome = (nome) => (nome ? nome.toLowerCase().trim() : '');
  const nomeColaborador = normalizeNome(colaborador.nome_completo);

  const equipamentosColaborador = {
    pcs: pcsInternos.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
    notebooks: notebooksExternos.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
    smartphones: smartphones.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
    cameras: cameras.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
    coletores: coletores.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
    canetas: canetasVibracao.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
    ramais: ramais.filter(e => normalizeNome(e.usuario_atual) === nomeColaborador),
  };

  const totalEquipamentos = Object.values(equipamentosColaborador).reduce((sum, arr) => sum + arr.length, 0);

  const chamadosColaborador = chamados.filter(c =>
    normalizeNome(c.solicitante_nome) === nomeColaborador &&
    c.status !== "Resolvido" &&
    c.status !== "Cancelado"
  );

  const toggleShowSenha = (field) => {
    setShowSenhas(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const copySenha = (field, value) => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(prev => ({ ...prev, [field]: true }));
      setTimeout(() => setCopied(prev => ({ ...prev, [field]: false })), 2000);
    }
  };

  const EquipamentoIcon = ({ tipo }) => {
    const icons = { pcs: Monitor, notebooks: Laptop, smartphones: Smartphone, cameras: Camera, coletores: Barcode, canetas: Pen, ramais: Phone };
    const Icon = icons[tipo] || Monitor;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <Button onClick={onClose} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          {onEdit && (
            <Button onClick={() => onEdit(colaborador)} className="bg-indigo-600 hover:bg-indigo-700 text-xs">
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Editar Colaborador
            </Button>
          )}
        </div>

        {/* Card do Perfil */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b bg-white pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {colaborador.foto_url ? (
                  <img src={colaborador.foto_url} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-200 shadow-sm" />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-sm">
                    {colaborador.nome_completo?.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900">{colaborador.nome_completo}</h1>
                    <Badge className={
                      colaborador.status === "Ativo" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                      colaborador.status === "Férias" ? "bg-blue-100 text-blue-800 border-blue-300" :
                      "bg-amber-100 text-amber-800 border-amber-300"
                    }>
                      {colaborador.status || "Ativo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {colaborador.cargo || "Sem cargo"} • <strong className="text-gray-700">{colaborador.area || "Sem área"}</strong>
                  </p>
                  <div className="flex gap-2 mt-2 text-xs text-gray-500 flex-wrap">
                    {colaborador.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-gray-400" />{colaborador.email}</span>}
                    {colaborador.telefone && <span className="flex items-center gap-1">• <Phone className="w-3.5 h-3.5 text-gray-400" />{colaborador.telefone}</span>}
                    {colaborador.data_admissao && <span className="flex items-center gap-1">• <Calendar className="w-3.5 h-3.5 text-gray-400" />Admissão: {colaborador.data_admissao}</span>}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Abas Organizadas por Assunto */}
        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList className="flex flex-wrap w-full bg-gray-100 p-1 gap-1 rounded-xl h-auto">
            <TabsTrigger value="geral" className="text-xs py-2">🏢 Profissional & Pessoal</TabsTrigger>
            <TabsTrigger value="familia" className="text-xs py-2">👨‍👩‍👧‍👦 Família</TabsTrigger>
            <TabsTrigger value="compras" className="text-xs py-2">🛒 Aprovador Compras</TabsTrigger>
            <TabsTrigger value="comunicados" className="text-xs py-2">📢 Comunicados</TabsTrigger>
            <TabsTrigger value="equipamentos" className="text-xs py-2">💻 Equipamentos ({totalEquipamentos})</TabsTrigger>
            <TabsTrigger value="chamados" className="text-xs py-2">🎧 Chamados ({chamadosColaborador.length})</TabsTrigger>
            {!hideSenhas && <TabsTrigger value="senhas" className="text-xs py-2">🔒 Credenciais & TI</TabsTrigger>}
          </TabsList>

          {/* 🏢 Profissional & Pessoal */}
          <TabsContent value="geral" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3 border-b"><CardTitle className="text-sm font-bold">Informações do Cargo & Contrato</CardTitle></CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-gray-400">Área / Depto</p><p className="font-semibold text-gray-900">{colaborador.area || "-"}</p></div>
                    <div><p className="text-gray-400">Cargo</p><p className="font-semibold text-gray-900">{colaborador.cargo || "-"}</p></div>
                    <div><p className="text-gray-400">Tipo Funcionário</p><p className="font-medium text-gray-800">{colaborador.tipo_funcionario || "-"}</p></div>
                    <div><p className="text-gray-400">Local de Trabalho</p><p className="font-medium text-gray-800">{colaborador.local_trabalho || "-"}</p></div>
                    <div><p className="text-gray-400">Data de Admissão</p><p className="font-medium text-gray-800">{colaborador.data_admissao || "-"}</p></div>
                    <div><p className="text-gray-400">Telefone / Ramal</p><p className="font-medium text-gray-800">{colaborador.telefone || "-"}</p></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 border-b"><CardTitle className="text-sm font-bold">Dados Pessoais & Gestão Direta</CardTitle></CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-gray-400">Data de Nascimento</p><p className="font-semibold text-gray-900">{colaborador.data_nascimento || "-"}</p></div>
                    <div><p className="text-gray-400">Graduação</p><p className="font-semibold text-gray-900">{colaborador.graduacao || "-"}</p></div>
                    <div><p className="text-gray-400">Gestor Direto</p><p className="font-medium text-gray-800">{colaborador.contato_responsavel_nome || "-"}</p></div>
                    <div><p className="text-gray-400">E-mail do Gestor</p><p className="font-medium text-gray-800">{colaborador.contato_responsavel_email || "-"}</p></div>
                  </div>
                  {colaborador.resumo_experiencia && (
                    <div className="pt-2 border-t">
                      <p className="text-gray-400 mb-1">Resumo de Experiência</p>
                      <p className="bg-gray-50 p-2 rounded text-gray-700 italic">{colaborador.resumo_experiencia}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 👨‍👩‍👧‍👦 Família */}
          <TabsContent value="familia" className="space-y-4">
            <Card>
              <CardHeader className="pb-3 border-b"><CardTitle className="text-sm font-bold">Cônjuge & Filhos</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <p className="font-bold text-gray-800 mb-2 uppercase text-[11px] tracking-wider">Cônjuge</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div><p className="text-gray-400">Nome</p><p className="font-semibold">{colaborador.conjuge_nome || "-"}</p></div>
                    <div><p className="text-gray-400">E-mail</p><p className="font-semibold">{colaborador.conjuge_email || "-"}</p></div>
                    <div><p className="text-gray-400">Nascimento</p><p className="font-semibold">{colaborador.conjuge_data_nascimento || "-"}</p></div>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-gray-800 mb-2 uppercase text-[11px] tracking-wider">Filhos ({(colaborador.filhos || []).length})</p>
                  {(colaborador.filhos || []).length === 0 ? (
                    <p className="text-gray-400 italic">Nenhum filho registrado.</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead className="text-xs">Nome do Filho</TableHead><TableHead className="text-xs">Data de Nascimento</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(colaborador.filhos || []).map((f, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-xs">{f.filho_nome}</TableCell>
                            <TableCell className="text-xs">{f.filho_data_nascimento || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 🛒 Compras */}
          <TabsContent value="compras">
            <Card>
              <CardHeader className="pb-3 border-b"><CardTitle className="text-sm font-bold">Governança de Requisições de Compra</CardTitle></CardHeader>
              <CardContent className="p-4 text-xs">
                {colaborador.responsavel_nome ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Aprovador de Compras Responsável</p>
                      <p className="text-base font-bold text-emerald-950 mt-1">{colaborador.responsavel_nome}</p>
                      <p className="text-xs text-emerald-800">{colaborador.responsavel_email || "Sem e-mail"}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">VINCULADO</Badge>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Nenhum aprovador de compras vinculado diretamente. As requisições deste colaborador dependem da aprovação de um Administrador.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 📢 Comunicados */}
          <TabsContent value="comunicados">
            <Card>
              <CardHeader className="pb-3 border-b"><CardTitle className="text-sm font-bold">Configuração de Comunicados Internos</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 p-3 rounded-lg">
                  <div>
                    <p className="font-bold text-purple-950">Participa dos Comunicados Automáticos</p>
                    <p className="text-purple-800 text-[11px]">E-mails de aniversário, tempo de empresa, 1 aninho e despedida.</p>
                  </div>
                  <Badge className={colaborador.incluir_comunicados !== false ? "bg-purple-100 text-purple-800 border-purple-300" : "bg-gray-100 text-gray-600"}>
                    {colaborador.incluir_comunicados !== false ? "ATIVO" : "INATIVO"}
                  </Badge>
                </div>

                <div>
                  <p className="font-bold text-gray-800 mb-2 uppercase text-[11px] tracking-wider">Permissões de Gestão no Portal ({ (colaborador.permissoes_comunicados || []).length })</p>
                  {(colaborador.permissoes_comunicados || []).length === 0 ? (
                    <p className="text-gray-400 italic">Nenhuma permissão especial de comunicados atribuída.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(colaborador.permissoes_comunicados || []).map((p, i) => (
                        <Badge key={i} className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-[11px]">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 💻 Equipamentos */}
          <TabsContent value="equipamentos">
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(equipamentosColaborador).map(([tipo, equipamentos]) => {
                if (equipamentos.length === 0) return null;
                const labels = { pcs: "PCs Internos", notebooks: "Notebooks Externos", smartphones: "Smartphones", cameras: "Câmeras", coletores: "Coletores", canetas: "Canetas de Vibração", ramais: "Ramais" };

                return (
                  <Card key={tipo}>
                    <CardHeader className="border-b pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <EquipamentoIcon tipo={tipo} />
                        {labels[tipo]} ({equipamentos.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {tipo === 'ramais' ? (
                              <><TableHead className="text-xs">Ramal</TableHead><TableHead className="text-xs">Área</TableHead><TableHead className="text-xs">Data Atribuição</TableHead></>
                            ) : (
                              <><TableHead className="text-xs">Marca/Modelo</TableHead><TableHead className="text-xs">Etiqueta/Serial</TableHead><TableHead className="text-xs">Status</TableHead></>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {equipamentos.map((eq) => (
                            <TableRow key={eq.id}>
                              {tipo === 'ramais' ? (
                                <>
                                  <TableCell className="font-mono font-bold text-xs">{eq.ramal}</TableCell>
                                  <TableCell className="text-xs">{eq.area}</TableCell>
                                  <TableCell className="text-xs">{eq.data_atribuicao || "-"}</TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className="text-xs">
                                    <div><p className="font-medium">{eq.marca || "-"}</p><p className="text-[11px] text-gray-500">{eq.modelo || "-"}</p></div>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{eq.etiqueta_interna || eq.service_tag || eq.imei || eq.numero_sequencial || "-"}</TableCell>
                                  <TableCell className="text-xs">
                                    <Badge className={eq.status === "Em uso" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>{eq.status}</Badge>
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}

              {totalEquipamentos === 0 && (
                <Card><CardContent className="py-12 text-center text-gray-500 text-xs">Nenhum equipamento atribuído a este colaborador</CardContent></Card>
              )}
            </div>
          </TabsContent>

          {/* 🎧 Chamados */}
          <TabsContent value="chamados">
            <Card>
              <CardHeader className="pb-3 border-b"><CardTitle className="text-sm font-bold flex items-center gap-2"><Headset className="w-4 h-4" />Chamados em Aberto ({chamadosColaborador.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                {chamadosColaborador.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-xs">Nenhum chamado em aberto para este colaborador</div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead className="text-xs">Nº Chamado</TableHead><TableHead className="text-xs">Tipo</TableHead><TableHead className="text-xs">Abertura</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs">Urgência</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {chamadosColaborador.map((chamado) => (
                        <TableRow key={chamado.id}>
                          <TableCell className="font-mono text-xs">{chamado.numero_chamado}</TableCell>
                          <TableCell className="text-xs">{chamado.tipo_solicitacao}</TableCell>
                          <TableCell className="text-xs">{chamado.data_abertura || "-"}</TableCell>
                          <TableCell className="text-xs"><Badge className="bg-blue-100 text-blue-800">{chamado.status}</Badge></TableCell>
                          <TableCell className="text-xs"><Badge className="bg-yellow-100 text-yellow-800">{chamado.urgencia}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 🔒 Credenciais & TI */}
          {!hideSenhas && (
            <TabsContent value="senhas">
              <Card>
                <CardHeader className="pb-3 border-b"><CardTitle className="text-sm font-bold">Credenciais de Acesso & Segurança</CardTitle></CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-gray-700">Senha Microsoft / Office 365</p>
                        <div className="flex gap-1">
                          {colaborador.senha_microsoft && (
                            <button onClick={() => copySenha('microsoft', colaborador.senha_microsoft)} className="p-1 hover:bg-gray-200 rounded text-gray-400">
                              {copied.microsoft ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button onClick={() => toggleShowSenha('microsoft')} className="p-1 hover:bg-gray-200 rounded text-gray-400">
                            {showSenhas.microsoft ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <p className="font-mono font-bold text-gray-900">{colaborador.senha_microsoft ? (showSenhas.microsoft ? colaborador.senha_microsoft : "••••••••") : "-"}</p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-gray-700">Senha Login Máquina</p>
                        <div className="flex gap-1">
                          {colaborador.senha_login_maquina && (
                            <button onClick={() => copySenha('maquina', colaborador.senha_login_maquina)} className="p-1 hover:bg-gray-200 rounded text-gray-400">
                              {copied.maquina ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button onClick={() => toggleShowSenha('maquina')} className="p-1 hover:bg-gray-200 rounded text-gray-400">
                            {showSenhas.maquina ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <p className="font-mono font-bold text-gray-900">{colaborador.senha_login_maquina ? (showSenhas.maquina ? colaborador.senha_login_maquina : "••••••••") : "-"}</p>
                    </div>
                  </div>

                  {colaborador.senhas_sistemas && colaborador.senhas_sistemas.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="font-bold text-gray-800 mb-2 uppercase text-[11px] tracking-wider">Senhas de Sistemas ({(colaborador.senhas_sistemas || []).length})</p>
                      <div className="space-y-2">
                        {colaborador.senhas_sistemas.map((sistema, index) => (
                          <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div><p className="text-[11px] text-gray-400">Sistema</p><p className="font-bold text-gray-900">{sistema.sistema}</p></div>
                              <div><p className="text-[11px] text-gray-400">Usuário</p><p className="font-mono">{sistema.usuario || "-"}</p></div>
                              <div>
                                <div className="flex items-center justify-between">
                                  <p className="text-[11px] text-gray-400">Senha</p>
                                  <div className="flex gap-1">
                                    {sistema.senha && (
                                      <button onClick={() => copySenha(`sistema_${index}`, sistema.senha)} className="p-1 hover:bg-gray-200 rounded text-gray-400">
                                        {copied[`sistema_${index}`] ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    )}
                                    <button onClick={() => toggleShowSenha(`sistema_${index}`)} className="p-1 hover:bg-gray-200 rounded text-gray-400">
                                      {showSenhas[`sistema_${index}`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>
                                <p className="font-mono font-bold">{sistema.senha ? (showSenhas[`sistema_${index}`] ? sistema.senha : "••••••••") : "-"}</p>
                              </div>
                            </div>
                            {sistema.observacoes && <p className="text-[11px] text-gray-500 mt-2 border-t pt-1">{sistema.observacoes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {colaborador.observacoes && (
                    <div className="pt-3 border-t">
                      <p className="font-bold text-gray-800 mb-1 uppercase text-[11px] tracking-wider">Observações Gerais</p>
                      <p className="bg-gray-50 border p-3 rounded-lg text-gray-700 italic">{colaborador.observacoes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}