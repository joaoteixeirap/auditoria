import Link from "next/link";
import { ResourceLayout, AccessDenied, EmptyState } from "@/components/shared/resource-layout";
import { Card, CardContent } from "@/components/ui/card";
import { AgentForm } from "@/features/agents/agent-form";
import { pageWorkspace } from "@/server/services/workspace";
import { clientOptions } from "@/server/repositories/resources";

export const metadata = { title: "Cadastrar chatbot" };
export default async function NewAgentPage() {
  const context = await pageWorkspace();
  const clients = await clientOptions(context.db, context.organization.id);
  return (
    <ResourceLayout
      context={context}
      active="/agents"
      title="Cadastrar chatbot"
      description="Vincule o agente a um cliente e identifique sua primeira versão."
    >
      {context.membership.role !== "owner" ? (
        <AccessDenied />
      ) : !clients.length ? (
        <>
          <EmptyState
            title="Cadastre um cliente primeiro"
            description="Todo chatbot precisa estar vinculado a um cliente desta organização."
          />
          <Link href="/clients/new" className="mt-4 inline-block text-sm text-primary underline">
            Cadastrar cliente
          </Link>
        </>
      ) : (
        <Card className="max-w-3xl shadow-none">
          <CardContent>
            <AgentForm clients={clients} />
          </CardContent>
        </Card>
      )}
    </ResourceLayout>
  );
}
