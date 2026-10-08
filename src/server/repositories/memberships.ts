import "server-only";
import type { WorkflowDB } from "./workflow";
import { ApplicationError } from "@/server/services/errors";
function failure() {
  return new ApplicationError(
    "MEMBERSHIPS_SETUP",
    "Confira as migrations de equipe, sua permissão e a validade do convite.",
  );
}
export async function membershipInvitations(db: WorkflowDB, org: string) {
  const { data, error } = await db
    .from("organization_invitations")
    .select("id,email,role,created_at,expires_at,used_at")
    .eq("organization_id", org)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw failure();
  const now = Date.now();
  return data.map((invite) => ({
    ...invite,
    expired: new Date(invite.expires_at).getTime() <= now,
  }));
}
export async function organizationMembers(db: WorkflowDB, org: string) {
  const { data, error } = await db.rpc("company_members", { org_id: org });
  if (error) throw failure();
  return data;
}
export async function createInvitation(
  db: WorkflowDB,
  org: string,
  email: string,
  role: string,
  hash: string,
) {
  const { error } = await db.rpc("create_membership_invitation", {
    org_id: org,
    target_email: email,
    target_role: role,
    invite_hash: hash,
  });
  if (error) throw failure();
}
export async function acceptInvitation(db: WorkflowDB, hash: string) {
  const { data, error } = await db.rpc("accept_membership_invitation", { invite_hash: hash });
  if (error)
    throw new ApplicationError(
      "INVITATION",
      "Convite indisponível, expirado ou destinado a outro e-mail. Confirme o e-mail da sua conta antes de aceitar.",
    );
  return data;
}
export async function revokeInvitation(db: WorkflowDB, org: string, id: string) {
  const { error } = await db.rpc("revoke_membership_invitation", {
    org_id: org,
    invitation_id: id,
  });
  if (error) throw failure();
}
