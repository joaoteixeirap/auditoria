import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceLayout, Pagination } from "@/components/shared/resource-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pageWorkspace } from "@/server/services/workspace";
import { uuidSchema } from "@/lib/validations/entities";
import { getAgent, getClient, listVersions, PAGE_SIZE } from "@/server/repositories/resources";
import { categories, environments } from "@/features/agents/labels";
import { VersionForm } from "@/features/agents/version-form";
import { parsePage } from "@/lib/utils/pagination";
import { listAudits } from "@/server/repositories/audits";
import { AuditTable } from "@/features/audits/audit-table";
import { buttonVariants } from "@/components/ui/button";

export default async function AgentDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const context = await pageWorkspace();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const agent = await getAgent(context.db, context.organization.id, id);
  if (!agent) notFound();
  const page = parsePage((await searchParams).page);
  const [client, versions, audits] = await Promise.all([
    getClient(context.db, context.organization.id, agent.client_id),
    listVersions(context.db, context.organization.id, id, page),
    listAudits(context.db, context.organization.id, 1, id),
  ]);
  return (
    <ResourceLayout
      context={context}
      active="/agents"
      title={agent.name}
      description={`${categories[agent.category]} · ${environments[agent.environment]}`}
      action={{ href: `/agents/${id}/edit`, label: "Editar chatbot" }}
    >
      {agent.environment === "demo" &&
        agent.status === "active" &&
        context.membership.role === "owner" && (
          <Link href={`/audits/new?agent=${id}`} className={buttonVariants({ className: "mb-6" })}>
            Auditar este chatbot
          </Link>
        )}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Informações do chatbot</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Cliente</dt>
                  <dd className="mt-2">
                    <Link href={`/clients/${agent.client_id}`} className="text-primary underline">
                      {client?.name ?? "Cliente indisponível"}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="mt-2">
                    <Badge variant="outline">
                      {agent.status === "active" ? "Ativo" : "Arquivado"}
                    </Badge>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Descrição</dt>
                  <dd className="mt-2 whitespace-pre-wrap break-words">
                    {agent.description || "Não informada"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Histórico de versões</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {versions.rows.map((version) => (
                  <li key={version.id} className="py-4 first:pt-0">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{version.label}</span>
                      <time className="text-xs text-muted-foreground" dateTime={version.created_at}>
                        {new Date(version.created_at).toLocaleDateString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {version.notes || "Sem notas"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Bot demonstrativo:{" "}
                      {version.demo_revision === 2
                        ? "comportamento corrigido"
                        : "falhas intencionais"}
                    </p>
                  </li>
                ))}
              </ul>
              <Pagination
                pathname={`/agents/${id}`}
                page={page}
                count={versions.count}
                pageSize={PAGE_SIZE}
              />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {context.membership.role === "owner" && (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Registrar nova versão</CardTitle>
              </CardHeader>
              <CardContent>
                <VersionForm agentId={id} />
              </CardContent>
            </Card>
          )}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Conexão de demonstração</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                As auditorias usam o bot fictício determinístico desta plataforma. Escolha o
                comportamento de demonstração ao cadastrar cada versão.
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Somente agentes ativos em ambiente Demonstração podem executar esse conector.
                Integrações com chatbots HTTP entram na Fase 3.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Auditorias recentes</h2>
        <Link href={`/audits?agent=${id}`} className="text-sm text-primary underline">
          Ver histórico completo
        </Link>
      </div>
      {audits.rows.length ? (
        <AuditTable audits={audits.rows} />
      ) : (
        <p className="rounded-xl border bg-white p-5 text-sm text-muted-foreground">
          Este chatbot ainda não possui auditorias.
        </p>
      )}
    </ResourceLayout>
  );
}
