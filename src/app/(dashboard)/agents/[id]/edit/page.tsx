import { notFound } from "next/navigation";
import { ResourceLayout, AccessDenied } from "@/components/shared/resource-layout";
import { Card, CardContent } from "@/components/ui/card";
import { AgentForm } from "@/features/agents/agent-form";
import { pageWorkspace } from "@/server/services/workspace";
import { uuidSchema } from "@/lib/validations/entities";
import { getAgent, clientOptions } from "@/server/repositories/resources";

export default async function EditAgent({ params }: { params: Promise<{ id: string }> }) {
  const context = await pageWorkspace();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const agent = await getAgent(context.db, context.organization.id, id);
  if (!agent) notFound();
  const clients = await clientOptions(context.db, context.organization.id);
  return (
    <ResourceLayout
      context={context}
      active="/agents"
      title="Editar chatbot"
      description="O cadastro de novas versões é feito separadamente e preserva o histórico."
    >
      {context.membership.role === "owner" ? (
        <Card className="max-w-3xl shadow-none">
          <CardContent>
            <AgentForm
              clients={clients}
              id={id}
              initial={{
                ...agent,
                client_id: clients.some((client) => client.id === agent.client_id)
                  ? agent.client_id
                  : "",
                version: "preservada",
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <AccessDenied />
      )}
    </ResourceLayout>
  );
}
