"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { testConnection } from "./actions";
import type { ConnectionCheck } from "@/server/services/connection-check";

export function ConnectionTest() {
  const [result, setResult] = useState<ConnectionCheck | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">
          {!result
            ? "Conexão não verificada"
            : result.status === "success"
              ? "Conexão verificada"
              : "Verificação falhou"}
        </Badge>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                setResult(await testConnection());
              } catch {
                setResult({
                  status: "error",
                  message: "Não foi possível verificar. Confira a configuração e tente novamente.",
                  schemaReady: false,
                  checkedAt: new Date().toISOString(),
                });
              }
            })
          }
        >
          {pending ? "Verificando…" : "Testar conexão real"}
        </Button>
      </div>
      <div aria-live="polite">
        {result && (
          <p
            className={`mt-3 text-sm leading-6 ${result.status === "success" ? "text-emerald-800" : "text-red-700"}`}
          >
            {result.status === "success" ? "Conexão verificada. " : "Verificação falhou. "}
            {result.message}
          </p>
        )}
      </div>
    </div>
  );
}
