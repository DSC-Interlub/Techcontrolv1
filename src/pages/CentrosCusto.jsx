import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function CentrosCusto() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/RequisicaoCompras", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Redirecionando para Requisições de Compra...</p>
      </div>
    </div>
  );
}