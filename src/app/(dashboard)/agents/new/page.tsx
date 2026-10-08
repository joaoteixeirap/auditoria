import { ResourceLayout, AccessDenied } from "@/components/shared/resource-layout";
import { Card, CardContent } from "@/components/ui/card";
import { AgentForm } from "@/features/agents/agent-form";
import { pageWorkspace } from "@/server/services/workspace";
import { clientOptions } from "@/server/repositories/resources";
import { ApplicationError } from "@/server/services/errors";

export const metadata = { title: "Cadastrar chatbot" };
export default async function NewAgentPage() {
  const context = await pageWorkspace();
  let clients: Awaited<ReturnType<typeof clientOptions>> = [],
    ready = true;
  try {
    clients = await clientOptions(context.db, context.organization.id);
  } catch (error) {
    if (!(error instanceof ApplicationError)) throw error;
    ready = false;
  }
  return (
    <ResourceLayout
      context={context}
      active="/agents"
      title="Cadastrar chatbot"
      description="Cadastre o chatbot da sua empresa e identifique sua primeira versão."
    >
      {context.membership.role !== "owner" ? (
        <AccessDenied />
      ) : !ready ? (
        <p role="status" className="rounded-xl border bg-white p-5 text-sm">
          Cadastro direto da empresa aguardando ativação da migration B2B. Consulte
          docs/b2b-alinhamento.md para a ordem de instalação, sem repetir migrations já aplicadas.
        </p>
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
