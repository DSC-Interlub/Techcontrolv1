/**
 * AbaConfiguracoes — configurações de cada tipo de comunicado.
 * Visível apenas para admin.
 */
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Settings } from "lucide-react";

const DEFAULTS = [
  {
    tipo_comunicado: "aniversario_colaborador",
    label: "🎂 Aniversário do Colaborador",
    ativo: true,
    horario_envio: "08:00",
    assunto_template: "🎂 Feliz Aniversário, {nome}!",
    destinatarios_tipo: "todos_colaboradores",
    destinatarios_adicionais: [],
    cc_emails: [],
  },
  {
    tipo_comunicado: "aniversario_conjuge",
    label: "💑 Aniversário do Cônjuge",
    ativo: true,
    horario_envio: "08:00",
    assunto_template: "💑 Parabéns, {nome_conjuge}!",
    destinatarios_tipo: "colaborador_conjuge_gestor",
    destinatarios_adicionais: [],
    cc_emails: [],
  },
  {
    tipo_comunicado: "aniversario_filho_1ano",
    label: "🎈 1 Aninho do Filho(a)",
    ativo: true,
    horario_envio: "08:00",
    assunto_template: "🎈 Feliz 1 Aninho, {nome_filho}!",
    destinatarios_tipo: "colaborador_conjuge_gestor",
    destinatarios_adicionais: [],
    cc_emails: [],
  },
  {
    tipo_comunicado: "tempo_empresa",
    label: "🏆 Tempo de Empresa",
    ativo: true,
    horario_envio: "08:00",
    assunto_template: "🏆 {nome} completa {anos} anos conosco!",
    destinatarios_tipo: "todos_colaboradores",
    destinatarios_adicionais: [],
    cc_emails: [],
  },
  {
    tipo_comunicado: "despedida",
    label: "💼 Despedida",
    ativo: true,
    horario_envio: "manual",
    assunto_template: "👋 Até logo, {nome}!",
    destinatarios_tipo: "manual",
    destinatarios_adicionais: [],
    cc_emails: [],
  },
];

const DEST_LABELS = {
  todos_colaboradores: "Todos os colaboradores ativos",
  colaborador_conjuge_gestor: "Colaborador + cônjuge + gestor",
  colaborador_e_gestor: "Colaborador + gestor",
  manual: "Sem envio automático (manual)",
};

const VARIAVEIS_AJUDA = `{nome} = Nome do colaborador
{nome_conjuge} = Nome do cônjuge
{nome_filho} = Nome do filho
{anos} = Anos de empresa
{area} = Área/Departamento`;

function ConfigCard({ config, onSave, saving }) {
  const [form, setForm] = useState({
    ativo: config.ativo ?? true,
    horario_envio: config.horario_envio || "08:00",
    assunto_template: config.assunto_template || "",
    destinatarios_tipo: config.destinatarios_tipo || "todos_colaboradores",
    destinatarios_adicionais: (config.destinatarios_adicionais || []).join(", "),
    cc_emails: (config.cc_emails || []).join(", "),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    onSave({
      ...form,
      destinatarios_adicionais: form.destinatarios_adicionais
        ? form.destinatarios_adicionais.split(",").map(e => e.trim()).filter(Boolean)
        : [],
      cc_emails: form.cc_emails
        ? form.cc_emails.split(",").map(e => e.trim()).filter(Boolean)
        : [],
    });
  };

  const isManual = form.destinatarios_tipo === "manual" || form.horario_envio === "manual";

  return (
    <Card className={form.ativo ? "" : "opacity-60"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{config.label || config.tipo_comunicado}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{form.ativo ? "Ativo" : "Inativo"}</span>
            <Switch checked={form.ativo} onCheckedChange={v => set("ativo", v)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Horário de Envio</Label>
            {config.tipo_comunicado === "despedida" ? (
              <p className="text-xs text-gray-500 mt-1 italic">Disparo manual — sem automação</p>
            ) : (
              <Input
                type="time"
                value={form.horario_envio}
                onChange={e => set("horario_envio", e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            )}
          </div>
          <div>
            <Label className="text-xs">Destinatários</Label>
            <Select value={form.destinatarios_tipo} onValueChange={v => set("destinatarios_tipo", v)}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DEST_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-0.5">
            <Label className="text-xs">Assunto do E-mail</Label>
            <details className="text-xs text-indigo-600 cursor-pointer">
              <summary>Variáveis disponíveis</summary>
              <pre className="text-xs text-gray-600 bg-gray-50 rounded p-2 mt-1 whitespace-pre-wrap">{VARIAVEIS_AJUDA}</pre>
            </details>
          </div>
          <Input
            value={form.assunto_template}
            onChange={e => set("assunto_template", e.target.value)}
            placeholder="Ex: 🎂 Feliz Aniversário, {nome}!"
            className="h-8 text-xs"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">E-mails Adicionais (sempre recebem)</Label>
            <Input
              value={form.destinatarios_adicionais}
              onChange={e => set("destinatarios_adicionais", e.target.value)}
              placeholder="email1@ex.com, email2@ex.com"
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Sempre em Cópia (CC)</Label>
            <Input
              value={form.cc_emails}
              onChange={e => set("cc_emails", e.target.value)}
              placeholder="cc@ex.com, outro@ex.com"
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AbaConfiguracoes() {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState(null);
  const [savedMsg, setSavedMsg] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["comunicados_config"],
    queryFn: () => base44.entities.Comunicados_Config.list(),
    staleTime: 60_000,
  });

  // Inicializar registros padrão se não existirem
  useEffect(() => {
    if (isLoading || initialized || configs.length > 0) return;
    setInitialized(true);
    (async () => {
      for (const d of DEFAULTS) {
        await base44.entities.Comunicados_Config.create(d);
      }
      queryClient.invalidateQueries({ queryKey: ["comunicados_config"] });
    })();
  }, [isLoading, configs.length, initialized, queryClient]);

  const handleSave = async (tipo, formData) => {
    setSavingId(tipo);
    const existing = configs.find(c => c.tipo_comunicado === tipo);
    if (existing) {
      await base44.entities.Comunicados_Config.update(existing.id, formData);
    } else {
      await base44.entities.Comunicados_Config.create({ tipo_comunicado: tipo, ...formData });
    }
    queryClient.invalidateQueries({ queryKey: ["comunicados_config"] });
    setSavingId(null);
    setSavedMsg(`Configuração de "${tipo}" salva!`);
    setTimeout(() => setSavedMsg(null), 3000);
  };

  // Mesclar defaults com dados do banco
  const configsMerged = DEFAULTS.map(d => {
    const fromDb = configs.find(c => c.tipo_comunicado === d.tipo_comunicado);
    return fromDb ? { ...d, ...fromDb } : d;
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Configurações de Comunicados</h3>
        </div>
        {savedMsg && (
          <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
            ✅ {savedMsg}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Configure o horário, assunto e destinatários de cada tipo de comunicado. As automações leem estas configurações antes de enviar.
      </p>

      {configsMerged.map(config => (
        <ConfigCard
          key={config.tipo_comunicado}
          config={config}
          onSave={(formData) => handleSave(config.tipo_comunicado, formData)}
          saving={savingId === config.tipo_comunicado}
        />
      ))}
    </div>
  );
}