import { ResourceLayout, AccessDenied } from "@/components/shared/resource-layout";
import { pageWorkspace } from "@/server/services/workspace";
import { auditAgents, auditCatalog } from "@/server/repositories/audits";
import { listVersions } from "@/server/repositories/resources";
import { ImportForm } from "@/features/audits/import-form";
export default async function ImportPage() {
  const context = await pageWorkspace();
  const agents = await auditAgents(context.db, context.organization.id);
  const versions = (
    await Promise.all(
      agents
        .slice(0, 100)
        .map(async (agent) =>
          (await listVersions(context.db, context.organization.id, agent.id)).rows.map(
            (version) => ({ ...version, agentName: agent.name }),
          ),
        ),
    )
  ).flat();
  const catalog = await auditCatalog(context.db, context.organization.id);
  return (
    <ResourceLayout
      context={context}
      active="/audits"
      title="Importar respostas CSV"
      description="Avaliação de transcrição importada, sem execução do chatbot."
    >
      {context.membership.role !== "owner" ? (
        <AccessDenied />
      ) : (
        <>
          <ImportForm versions={versions} />
          <details className="mt-6 rounded-xl border p-4">
            <summary>Chaves e IDs de cenários disponíveis</summary>
            <ul className="mt-3 space-y-2 text-sm">
              {catalog.map((test) => (
                <li className="break-all" key={test.id}>
                  {test.name}: {test.key} · {test.id}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </ResourceLayout>
  );
}
