import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Agent } from "@/types/database";
import { categories, environments } from "./labels";

export function AgentTable({ agents }: { agents: Agent[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Chatbots desta organização</caption>
        <thead className="border-b bg-slate-50 text-xs text-muted-foreground">
          <tr>
            {["Chatbot", "Categoria", "Ambiente", "Status"].map((label) => (
              <th key={label} scope="col" className="px-5 py-4 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id} className="border-b last:border-0">
              <td className="px-5 py-4">
                <Link
                  href={`/agents/${agent.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {agent.name}
                </Link>
              </td>
              <td className="px-5 py-4">{categories[agent.category]}</td>
              <td className="px-5 py-4">{environments[agent.environment]}</td>
              <td className="px-5 py-4">
                <Badge variant="outline">{agent.status === "active" ? "Ativo" : "Arquivado"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
