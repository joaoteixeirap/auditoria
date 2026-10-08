import { ResourceLayout } from "@/components/shared/resource-layout";
import { Card, CardContent } from "@/components/ui/card";
import { pageWorkspace } from "@/server/services/workspace";
import { OrganizationSwitcher } from "@/features/organizations/organization-switcher";
import { organizationOptions } from "@/server/repositories/workspace";

export default async function OrganizationsPage() {
  const context = await pageWorkspace();
  const data = await organizationOptions(
    context.db,
    context.memberships.map((m) => m.organization_id),
  );
  return (
    <ResourceLayout
      context={context}
      active="/dashboard"
      title="Suas organizações"
      description="O acesso só é permitido às organizações das quais você participa."
    >
      <Card className="max-w-lg shadow-none">
        <CardContent>
          <OrganizationSwitcher options={data} current={context.organization.id} />
        </CardContent>
      </Card>
    </ResourceLayout>
  );
}
