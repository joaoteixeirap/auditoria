import Link from "next/link";
import { ResourceLayout, EmptyState, Pagination } from "@/components/shared/resource-layout";
import { pageWorkspace } from "@/server/services/workspace";
import { listAudits } from "@/server/repositories/audits";
import { PAGE_SIZE } from "@/server/repositories/resources";
import { parsePage } from "@/lib/utils/pagination";
import { ApplicationError } from "@/server/services/errors";
import { AuditSetupNotice } from "@/features/audits/setup-notice";
import { AuditTable } from "@/features/audits/audit-table";
import { uuidSchema } from "@/lib/validations/entities";

export const metadata = { title: "Auditorias" };
export default async function AuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; agent?: string; client?: string }>;
}) {
  const context = await pageWorkspace(),
    params = await searchParams,
    page = parsePage(params.page);
  const agent = uuidSchema.safeParse(params.agent),
    client = uuidSchema.safeParse(params.client);
  let result;
  try {
    result = await listAudits(
      context.db,
      context.organization.id,
      page,
      agent.success ? agent.data : undefined,
      client.success ? client.data : undefined,
    );
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "PHASE2_SETUP")
      return (
        <ResourceLayout
          context={context}
          active="/audits"
          title="Auditorias"
          description="Histórico e evidências dos cenários executados."
        >
          <AuditSetupNotice />
        </ResourceLayout>
      );
    throw error;
  }
  return (
    <ResourceLayout
      context={context}
      active="/audits"
      title="Auditorias"
      description="Auditorias demonstrativas ou HTTP, com critérios e resultados preservados no Supabase."
      action={{ href: "/audits/new", label: "Nova auditoria" }}
    >
      <Link href="/audits/import" className="mb-5 inline-block text-sm text-primary underline">
        Importar respostas CSV
      </Link>
      {result.rows.length ? (
        <AuditTable audits={result.rows} />
      ) : (
        <EmptyState
          title="Nenhuma auditoria executada"
          description="Selecione um chatbot em ambiente de demonstração, escolha a versão e prepare a primeira bateria de cenários."
        />
      )}
      <Pagination
        pathname="/audits"
        page={page}
        count={result.count}
        pageSize={PAGE_SIZE}
        filters={{
          ...(agent.success ? { agent: agent.data } : {}),
          ...(client.success ? { client: client.data } : {}),
        }}
      />
      <p className="mt-7 text-xs leading-5 text-muted-foreground">
        Demonstração usa respostas fictícias sem API externa. Auditorias HTTP enviam perguntas ao
        chatbot configurado. Ambos usam critérios determinísticos do catálogo de referência.
      </p>
    </ResourceLayout>
  );
}
