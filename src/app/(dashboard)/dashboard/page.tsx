import Link from "next/link";
import { Bot } from "lucide-react";
import { ResourceLayout, EmptyState } from "@/components/shared/resource-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageWorkspace } from "@/server/services/workspace";
import { dashboardMetrics } from "@/server/repositories/resources";
import { AgentTable } from "@/features/agents/agent-table";
import { auditDashboard } from "@/server/repositories/audits";
import { AuditTable } from "@/features/audits/audit-table";
import { CompanyDashboard } from "@/features/audits/company-dashboard";

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
      description="Conecte seus chatbots, teste as políticas da empresa e acompanhe as evidências."
      action={{ href: "/agents/new", label: "Cadastrar chatbot" }}
    >
      {params.logout === "error" && (
        <p role="alert" className="mb-5 text-sm text-red-700">
          Não foi possível encerrar a sessão. Tente sair novamente.
        </p>
      )}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Chatbots cadastrados", value: metrics.totalAgents, icon: Bot },
          { label: "Chatbots ativos", value: metrics.activeAgents, icon: Bot },
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
      <p className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm">
        Comece pelo cadastro do chatbot, configure e teste a conexão, adicione políticas e execute a
        auditoria. Depois investigue as falhas e gere seu relatório.
      </p>
      <CompanyDashboard db={context.db} org={context.organization.id} />
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
          description="Cadastre o chatbot da sua empresa, configure a conexão e adicione suas políticas."
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
          description="Adicione políticas aprovadas e teste uma versão conectada. Para conhecer o produto sem uma API, escolha explicitamente o ambiente Demonstração."
        />
      )}
      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Auditorias podem usar demonstração ou uma conexão HTTP configurada. Achados críticos são
        históricos e continuam registrados após uma correção; consulte a comparação para avaliar a
        nova versão.
      </p>
    </ResourceLayout>
  );
}
