import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  ResourceLayout,
  EmptyState,
  Pagination,
  SearchForm,
} from "@/components/shared/resource-layout";
import { pageWorkspace } from "@/server/services/workspace";
import { listClients, PAGE_SIZE } from "@/server/repositories/resources";
import { parsePage, parseSearch } from "@/lib/utils/pagination";

export const metadata = { title: "Clientes" };
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const context = await pageWorkspace();
  const params = await searchParams;
  const page = parsePage(params.page),
    search = parseSearch(params.q);
  const result = await listClients(context.db, context.organization.id, page, search);
  return (
    <ResourceLayout
      context={context}
      active="/clients"
      title="Clientes"
      description="Organize as empresas atendidas pela sua organização."
      action={{ href: "/clients/new", label: "Cadastrar cliente" }}
    >
      <SearchForm pathname="/clients" search={search} label="Buscar cliente por nome" />
      {result.rows.length ? (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Clientes desta organização</caption>
            <thead className="border-b bg-slate-50 text-xs text-muted-foreground">
              <tr>
                {["Empresa", "Responsável", "Status"].map((label) => (
                  <th scope="col" key={label} className="px-5 py-4 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((client) => (
                <tr key={client.id} className="border-b last:border-0">
                  <td className="px-5 py-4">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4">{client.contact_name || "Não informado"}</td>
                  <td className="px-5 py-4">
                    <Badge variant="outline">
                      {client.status === "active" ? "Ativo" : "Arquivado"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title={search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          description="Cadastre uma empresa ou ajuste sua busca para continuar."
        />
      )}
      <Pagination
        pathname="/clients"
        page={page}
        count={result.count}
        pageSize={PAGE_SIZE}
        search={search}
      />
    </ResourceLayout>
  );
}
