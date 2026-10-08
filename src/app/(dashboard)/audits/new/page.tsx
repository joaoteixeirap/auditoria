import Link from "next/link";
import { ResourceLayout, AccessDenied, EmptyState } from "@/components/shared/resource-layout";
import { pageWorkspace } from "@/server/services/workspace";
import { prepareAuditForm } from "@/server/services/audit-form";
import { ApplicationError } from "@/server/services/errors";
import { NewAuditForm } from "@/features/audits/new-audit-form";
import { AuditSetupNotice } from "@/features/audits/setup-notice";

export const metadata = { title: "Nova auditoria" };
export default async function NewAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string; retest?: string }>;
}) {
  const context = await pageWorkspace(),
    params = await searchParams;
  const shell = {
    context,
    active: "/audits",
    title: "Prepare sua auditoria",
    description: "Selecione a versão e os cenários para avaliar o bot fictício de demonstração.",
  };
  if (context.membership.role !== "owner")
    return (
      <ResourceLayout {...shell}>
        <AccessDenied />
      </ResourceLayout>
    );
  let data: Awaited<ReturnType<typeof prepareAuditForm>> | null = null;
  try {
    data = await prepareAuditForm(context.db, context.organization.id, params);
  } catch (error) {
    if (!(error instanceof ApplicationError && error.code === "PHASE2_SETUP")) throw error;
  }
  if (!data)
    return (
      <ResourceLayout {...shell}>
        <AuditSetupNotice />
      </ResourceLayout>
    );
  const { agents, scenarios, selected, versions, baseline } = data;
  if (!agents.length)
    return (
      <ResourceLayout {...shell}>
        <EmptyState
          title="Cadastre um chatbot de demonstração"
          description="Use dados fictícios: cliente Empresa Exemplo, chatbot Assistente Comercial, ambiente Demonstração e versão inicial v1."
        />
        <Link href="/agents/new" className="mt-4 inline-block text-primary underline">
          Cadastrar chatbot
        </Link>
      </ResourceLayout>
    );
  return (
    <ResourceLayout {...shell}>
      {baseline && (
        <p className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm leading-6">
          Reteste da versão {baseline.conditions.version.label}. Os mesmos cenários foram
          selecionados. A comparação indicará qualquer mudança nos critérios.
        </p>
      )}
      <NewAuditForm
        agents={agents}
        initialAgent={selected!.id}
        initialVersions={versions}
        scenarios={
          baseline
            ? scenarios.filter((test) => baseline.run.selected_case_ids.includes(test.id))
            : scenarios
        }
      />
    </ResourceLayout>
  );
}
