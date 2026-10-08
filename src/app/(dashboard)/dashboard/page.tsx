import Link from "next/link";
import { Bot, Users, FlaskConical, ShieldAlert } from "lucide-react";
import { ResourceLayout, EmptyState } from "@/components/shared/resource-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageWorkspace } from "@/server/services/workspace";
import { dashboardMetrics } from "@/server/repositories/resources";
import { AgentTable } from "@/features/agents/agent-table";
import { auditDashboard } from "@/server/repositories/audits";
import { AuditTable } from "@/features/audits/audit-table";

export const metadata = { title: "Dashboard" };
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ logout?: string }>;
}) {
  const context = await pageWorkspace();
  const [metrics, auditMetrics] = await Promise.all([
    dashboardMetrics(context.db, context.organization.id),
    auditDashboard(context.db, context.organization.id),
  ]);
  const params = await searchParams;
  return (
    <ResourceLayout
      context={context}
      active="/dashboard"
      title={context.organization.name}
      description="Clientes e chatbots da sua organização, consultados no Supabase."
      action={{ href: "/clients/new", label: "Cadastrar cliente" }}
    >
      {params.logout === "error" && (
        <p role="alert" className="mb-5 text-sm text-red-700">
          Não foi possível encerrar a sessão. Tente sair novamente.
        </p>
      )}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Clientes cadastrados", value: metrics.clients, icon: Users },
          { label: "Chatbots ativos", value: metrics.activeAgents, icon: Bot },
          { label: "Auditorias concluídas", value: auditMetrics.completed, icon: FlaskConical },
          {
            label: "Achados críticos no histórico",
            value: auditMetrics.criticalHistory,
            icon: ShieldAlert,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-sm">
                <Icon size={18} aria-hidden="true" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Chatbots recentes</h2>
        <Link href="/agents" className="text-sm text-primary">
          Ver todos
        </Link>
      </div>
      {metrics.recentAgents.length ? (
        <AgentTable agents={metrics.recentAgents} />
      ) : (
        <EmptyState
          title="Nenhum chatbot cadastrado"
          description="Cadastre um cliente e vincule seu primeiro chatbot para organizar as próximas auditorias."
        />
      )}
      <div className="mb-4 mt-8 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Auditorias recentes</h2>
        <Link href="/audits" className="text-sm text-primary">
          Ver histórico
        </Link>
      </div>
      {auditMetrics.recent.length ? (
        <AuditTable audits={auditMetrics.recent} />
      ) : (
        <EmptyState
          title="Execute sua primeira auditoria"
          description="Na demonstração, teste a versão inicial, investigue as evidências e compare os mesmos cenários com a versão corrigida."
        />
      )}
      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        As auditorias disponíveis usam o bot fictício de demonstração. Achados críticos são
        históricos e continuam registrados após uma correção; consulte a comparação para avaliar a
        nova versão.
      </p>
    </ResourceLayout>
  );
}
