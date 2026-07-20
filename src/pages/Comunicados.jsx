import React from "react";
import { useAuth } from "@/lib/AuthContext";
import PainelComunicados from "../components/comunicados/PainelComunicados";

export default function Comunicados() {
  const { user: currentUser } = useAuth();
  const role = currentUser?.role;
  const isAdmin = role === "admin";
  const podeCriarArte = ["admin", "user", "comunicados_arte"].includes(role);
  const nomeUsuario = currentUser?.full_name || currentUser?.email || "";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PainelComunicados
        podeCriarArte={podeCriarArte}
        podeGerenciarConfig={isAdmin}
        nomeUsuario={nomeUsuario}
      />
    </div>
  );
}