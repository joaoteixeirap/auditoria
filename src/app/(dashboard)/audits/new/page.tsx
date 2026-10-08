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
    description:
      "Selecione uma versão demonstrativa ou HTTP configurada e os cenários de referência.",
  };
  if (context.membership.role !== "owner")
    return (
      <ResourceLayout {...shell}>
        <AccessDenied />
      </ResourceLayout>
    );
  let data: Awaited<ReturnType<typeof prepareAuditForm>> | null = null;
  let httpMissing = false;
  try {
    data = await prepareAuditForm(context.db, context.organization.id, params);
  } catch (error) {
    if (!(
      error instanceof ApplicationError && ["PHASE2_SETUP", "PHASE3_SETUP"].includes(error.code)
    ))
      throw error;
    httpMissing = error.code === "PHASE3_SETUP";
  }
  if (!data)
    return (
      <ResourceLayout {...shell}>
        <AuditSetupNotice http={httpMissing} />
      </ResourceLayout>
    );
  const { agents, scenarios, selected, versions, baseline } = data;
  if (!agents.length)
    return (
      <ResourceLayout {...shell}>
        <EmptyState
          title="Cadastre o chatbot da sua empresa"
          description="Informe o nome e a finalidade, configure a conexão e adicione suas políticas. O modo Demonstração permanece disponível para conhecer o produto."
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
          preservados a partir do snapshot original, inclusive versões anteriores das políticas.
        </p>
      )}
      <NewAuditForm
        agents={agents}
        initialAgent={selected!.id}
        initialVersions={versions}
        scenarios={scenarios}
        previousRun={baseline?.run.id}
      />
      {!versions.length && (
        <p role="status" className="mt-4 text-sm">
          Este chatbot ainda não tem uma versão HTTP configurada. Abra os detalhes do chatbot e
          registre a conexão antes de auditar.
        </p>
      )}
    </ResourceLayout>
  );
}
