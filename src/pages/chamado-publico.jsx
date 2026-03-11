import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ChamadoPublico() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <p className="text-gray-500 mb-6">Esta página não está disponível.</p>
        <Link to={createPageUrl("portal-login")} className="text-blue-600 hover:underline text-sm">
          Voltar ao Portal
        </Link>
      </div>
    </div>
  );
}