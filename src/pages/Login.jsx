import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Eye, EyeOff, Loader2 } from "lucide-react";

export default function Login() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Se já está autenticado, redireciona para o dashboard
    base44.auth.isAuthenticated().then((auth) => {
      if (auth) window.location.href = '/Dashboard';
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Redireciona para o login do Base44
  base44.auth.redirectToLogin('/Dashboard');
  return null;
}