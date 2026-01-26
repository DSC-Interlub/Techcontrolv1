import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function UsuariosAnteriores({ usuarios = [], onChange }) {
  const [novoUsuario, setNovoUsuario] = useState({
    nome: "",
    data_inicio: "",
    data_fim: "",
  });
  const [modoEdicao, setModoEdicao] = useState(false);

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaboradores.list(),
  });

  const adicionarUsuario = () => {
    if (novoUsuario.nome && novoUsuario.data_inicio) {
      onChange([...usuarios, novoUsuario]);
      setNovoUsuario({ nome: "", data_inicio: "", data_fim: "" });
    }
  };

  const removerUsuario = (index) => {
    const novosUsuarios = usuarios.filter((_, i) => i !== index);
    onChange(novosUsuarios);
  };

  return (
    <Card className="border-2 border-dashed border-gray-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Histórico de Usuários Anteriores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de usuários anteriores */}
        {usuarios.length > 0 && (
          <div className="space-y-2 mb-4">
            {usuarios.map((usuario, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{usuario.nome}</p>
                  <p className="text-xs text-gray-600">
                    {usuario.data_inicio && format(new Date(usuario.data_inicio), "dd/MM/yyyy")}
                    {" → "}
                    {usuario.data_fim 
                      ? format(new Date(usuario.data_fim), "dd/MM/yyyy")
                      : "Atual"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removerUsuario(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Formulário para adicionar novo usuário */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Adicionar Usuário Anterior</p>
            <Button
              type="button"
              onClick={() => setModoEdicao(!modoEdicao)}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              {modoEdicao ? "Selecionar" : "Editar Manualmente"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Nome do Usuário</Label>
              {modoEdicao ? (
                <Input
                  placeholder="Nome completo"
                  value={novoUsuario.nome}
                  onChange={(e) =>
                    setNovoUsuario({ ...novoUsuario, nome: e.target.value })
                  }
                  className="h-9"
                />
              ) : (
                <Select
                  value={novoUsuario.nome}
                  onValueChange={(value) => setNovoUsuario({ ...novoUsuario, nome: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((colaborador) => (
                      <SelectItem key={colaborador.id} value={colaborador.nome_completo}>
                        {colaborador.nome_completo} - {colaborador.area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-xs">Data Início</Label>
              <Input
                type="date"
                value={novoUsuario.data_inicio}
                onChange={(e) =>
                  setNovoUsuario({ ...novoUsuario, data_inicio: e.target.value })
                }
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Data Fim</Label>
              <Input
                type="date"
                value={novoUsuario.data_fim}
                onChange={(e) =>
                  setNovoUsuario({ ...novoUsuario, data_fim: e.target.value })
                }
                className="h-9"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={adicionarUsuario}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!novoUsuario.nome || !novoUsuario.data_inicio}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar ao Histórico
          </Button>
        </div>

        {usuarios.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum usuário anterior registrado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}