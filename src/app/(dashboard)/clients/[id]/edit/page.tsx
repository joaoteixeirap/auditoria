import { notFound } from "next/navigation";
import { ResourceLayout, AccessDenied } from "@/components/shared/resource-layout";
import { Card, CardContent } from "@/components/ui/card";
import { ClientForm } from "@/features/clients/client-form";
import { pageWorkspace } from "@/server/services/workspace";
import { uuidSchema } from "@/lib/validations/entities";
import { getClient } from "@/server/repositories/resources";

export default async function EditClient({ params }: { params: Promise<{ id: string }> }) {
  const context = await pageWorkspace();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const client = await getClient(context.db, context.organization.id, id);
  if (!client) notFound();
  return (
    <ResourceLayout
      context={context}
      active="/clients"
      title="Editar cliente"
      description="Arquivar preserva o cadastro e os chatbots vinculados."
    >
      {context.membership.role === "owner" ? (
        <Card className="max-w-3xl shadow-none">
          <CardContent>
            <ClientForm id={id} initial={client} />
          </CardContent>
        </Card>
      ) : (
        <AccessDenied />
      )}
    </ResourceLayout>
  );
}
