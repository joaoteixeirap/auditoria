import { ResourceLayout, AccessDenied } from "@/components/shared/resource-layout";
import { Card, CardContent } from "@/components/ui/card";
import { ClientForm } from "@/features/clients/client-form";
import { pageWorkspace } from "@/server/services/workspace";

export const metadata = { title: "Cadastrar cliente" };
export default async function NewClientPage() {
  const context = await pageWorkspace();
  return (
    <ResourceLayout
      context={context}
      active="/clients"
      title="Cadastrar cliente"
      description="Colete somente os dados necessários para organizar o atendimento."
    >
      {context.membership.role === "owner" ? (
        <Card className="max-w-3xl shadow-none">
          <CardContent>
            <ClientForm />
          </CardContent>
        </Card>
      ) : (
        <AccessDenied />
      )}
    </ResourceLayout>
  );
}
