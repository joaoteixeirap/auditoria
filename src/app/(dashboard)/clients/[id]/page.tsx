import { notFound } from "next/navigation";
import { ResourceLayout, EmptyState, Pagination } from "@/components/shared/resource-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageWorkspace } from "@/server/services/workspace";
import { uuidSchema } from "@/lib/validations/entities";
import { getClient, listAgents, PAGE_SIZE } from "@/server/repositories/resources";
import { AgentTable } from "@/features/agents/agent-table";
import { parsePage } from "@/lib/utils/pagination";
import Link from "next/link";

export default async function ClientDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const context = await pageWorkspace();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const client = await getClient(context.db, context.organization.id, id);
  if (!client) notFound();
  const page = parsePage((await searchParams).page);
  const agents = await listAgents(context.db, context.organization.id, page, "", id);
  return (
    <ResourceLayout
      context={context}
      active="/clients"
      title={client.name}
      description={client.status === "active" ? "Cliente ativo" : "Cliente arquivado"}
      action={{ href: `/clients/${id}/edit`, label: "Editar cliente" }}
    >
      <Card className="mb-8 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Informações do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 text-sm sm:grid-cols-2">
            {[
              ["Responsável", client.contact_name || "Não informado"],
              ["E-mail de contato", client.contact_email || "Não informado"],
              ["Descrição", client.description || "Não informada"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-2 whitespace-pre-wrap break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <h2 className="mb-4 font-semibold">Chatbots vinculados</h2>
      {agents.rows.length ? (
        <AgentTable agents={agents.rows} />
      ) : (
        <EmptyState
          title="Nenhum chatbot vinculado"
          description="Cadastre um chatbot e selecione este cliente para criar o vínculo."
        />
      )}
      <Pagination
        pathname={`/clients/${id}`}
        page={page}
        count={agents.count}
        pageSize={PAGE_SIZE}
      />
      <Link
        href={`/audits?client=${id}`}
        className="mt-7 inline-block text-sm text-primary underline"
      >
        Ver auditorias vinculadas a este cliente no momento da execução
      </Link>
    </ResourceLayout>
  );
}
