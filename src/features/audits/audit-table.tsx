import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AuditRun } from "@/types/database";
import { statusLabels } from "./labels";
import { conditionsSchema } from "@/server/repositories/audits";

export function AuditTable({ audits }: { audits: AuditRun[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Auditorias de demonstração persistidas</caption>
        <thead className="border-b bg-slate-50 text-xs text-muted-foreground">
          <tr>
            {["Chatbot / versão", "Execução", "Testes salvos", "Data"].map((label) => (
              <th scope="col" className="px-5 py-4 font-medium" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {audits.map((run) => {
            const parsed = conditionsSchema.safeParse(run.conditions_snapshot);
            return (
              <tr key={run.id} className="border-b last:border-0">
                <td className="px-5 py-4">
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={`/audits/${run.id}`}
                  >
                    {parsed.success ? parsed.data.agent.name : "Snapshot incompatível"}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {parsed.success ? parsed.data.version.label : "—"} · Demonstração
                  </p>
                </td>
                <td className="px-5 py-4">
                  <Badge variant="outline">{statusLabels[run.status]}</Badge>
                </td>
                <td className="px-5 py-4">
                  {run.processed_count} / {run.total_tests}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <time dateTime={run.created_at}>
                    {new Date(run.created_at).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </time>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
