import { ResourceLayout } from "@/components/shared/resource-layout";
import { Card, CardContent } from "@/components/ui/card";
import { pageWorkspace } from "@/server/services/workspace";
import { OrganizationSwitcher } from "@/features/organizations/organization-switcher";
import { organizationOptions } from "@/server/repositories/workspace";
import Link from "next/link";
import { membershipInvitations, organizationMembers } from "@/server/repositories/memberships";
import { ApplicationError } from "@/server/services/errors";
import {
  InvitationForm,
  JoinOrganizationForm,
  RevokeInvitation,
} from "@/features/organizations/invitation-forms";

export default async function OrganizationsPage() {
  const context = await pageWorkspace();
  const data = await organizationOptions(
    context.db,
    context.memberships.map((m) => m.organization_id),
  );
  let invites: Awaited<ReturnType<typeof membershipInvitations>> = [],
    members: Awaited<ReturnType<typeof organizationMembers>> = [],
    ready = true;
  try {
    members = await organizationMembers(context.db, context.organization.id);
    if (context.membership.role === "owner")
      invites = await membershipInvitations(context.db, context.organization.id);
  } catch (error) {
    if (!(error instanceof ApplicationError)) throw error;
    ready = false;
  }
  return (
    <ResourceLayout
      context={context}
      active="/dashboard"
      title="Empresa e equipe"
      description="O acesso só é permitido às organizações das quais você participa."
    >
      <Card className="max-w-lg shadow-none">
        <CardContent>
          <OrganizationSwitcher options={data} current={context.organization.id} />
        </CardContent>
      </Card>
      <section className="mt-6 space-y-4 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Usuários da empresa</h2>
        {ready ? (
          <ul className="space-y-3 text-sm">
            {members.map((member) => (
              <li key={member.user_id}>
                {member.display_name || "Usuário"}
                {member.user_id === context.user.id ? " (você)" : ""} ·{" "}
                {member.role === "owner" ? "Administrador" : "Membro — leitura"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Gestão de equipe aguardando ativação da migration de convites.</p>
        )}
        <p className="text-xs">
          Até 100 usuários. Uma conta pode participar de mais de uma empresa por convite, com
          permissões verificadas em cada organização.
        </p>
      </section>
      {ready && context.membership.role === "owner" && (
        <section className="mt-6 space-y-5 rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Convidar usuário</h2>
          <InvitationForm />
          <h3 className="font-medium">Até 50 convites recentes</h3>
          {invites.map((invite) => (
            <div key={invite.id} className="space-y-2 border-t pt-3 text-sm">
              <p>
                {invite.email} · {invite.role === "owner" ? "Administrador" : "Membro"} ·{" "}
                {invite.used_at
                  ? "Utilizado ou revogado"
                  : invite.expired
                    ? "Expirado"
                    : "Pendente"}
              </p>
              {!invite.used_at && !invite.expired && <RevokeInvitation id={invite.id} />}
            </div>
          ))}
        </section>
      )}
      <section className="mt-6 rounded-xl border bg-white p-5">
        <JoinOrganizationForm />
      </section>
      <details className="mt-6 rounded-xl border bg-white p-5">
        <summary>Dados preservados do modelo anterior</summary>
        <p className="mt-3 text-sm">
          Os vínculos de clientes existentes foram mantidos para preservar seu histórico. Eles não
          são necessários para cadastrar novos chatbots da empresa.
        </p>
        <Link href="/clients" className="mt-3 inline-block text-primary underline">
          Consultar clientes anteriores
        </Link>
      </details>
    </ResourceLayout>
  );
}
