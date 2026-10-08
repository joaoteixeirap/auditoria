import {
  ResourceLayout,
  EmptyState,
  Pagination,
  SearchForm,
} from "@/components/shared/resource-layout";
import { pageWorkspace } from "@/server/services/workspace";
import { listAgents, PAGE_SIZE } from "@/server/repositories/resources";
import { parsePage, parseSearch } from "@/lib/utils/pagination";
import { AgentTable } from "@/features/agents/agent-table";

export const metadata = { title: "Chatbots" };
export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const context = await pageWorkspace();
  const params = await searchParams;
  const page = parsePage(params.page),
    search = parseSearch(params.q);
  const result = await listAgents(context.db, context.organization.id, page, search);
  return (
    <ResourceLayout
      context={context}
      active="/agents"
      title="Chatbots"
      description="Gerencie agentes, versões e os clientes vinculados."
      action={{ href: "/agents/new", label: "Cadastrar chatbot" }}
    >
      <SearchForm pathname="/agents" search={search} label="Buscar chatbot por nome" />
      {result.rows.length ? (
        <AgentTable agents={result.rows} />
      ) : (
        <EmptyState
          title={search ? "Nenhum chatbot encontrado" : "Nenhum chatbot cadastrado"}
          description="Cadastre um cliente e depois registre o chatbot desenvolvido para ele."
        />
      )}
      <Pagination
        pathname="/agents"
        page={page}
        count={result.count}
        pageSize={PAGE_SIZE}
        search={search}
      />
    </ResourceLayout>
  );
}
