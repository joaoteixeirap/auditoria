import { AlertCircle, Database, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ConfigurationStatus } from "@/lib/supabase/config";
import { ConnectionTest } from "./connection-test";

const descriptions = {
  missing: {
    title: "Supabase não configurado",
    description: "Adicione a URL e a publishable key em .env.local para preparar a integração.",
    label: "Aguardando configuração",
  },
  invalid: {
    title: "Revise as variáveis de ambiente",
    description:
      "A URL ou a publishable key estão incompletas ou inválidas. Consulte as instruções de configuração.",
    label: "Configuração inválida",
  },
  configured: {
    title: "Variáveis do Supabase configuradas",
    description:
      "Formato validado. Execute a verificação abaixo para confirmar que o Supabase responde e identificar se a migration está instalada.",
    label: "Formato validado",
  },
};

export function ConfigurationStatusPanel({ status }: { status: ConfigurationStatus }) {
  const content = descriptions[status];
  const Icon = status === "invalid" ? AlertCircle : status === "configured" ? Database : Settings2;
  return (
    <div className="flex flex-wrap items-start gap-4 rounded-xl border bg-white p-5 sm:p-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-primary">
        <Icon size={22} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold">{content.title}</h2>
          <Badge variant="outline">{content.label}</Badge>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {content.description}
        </p>
        {status === "configured" && <ConnectionTest />}
      </div>
    </div>
  );
}
