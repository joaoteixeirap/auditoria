import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createActionClient, createReadOnlyClient } from "@/lib/supabase/server";
import { getSupabaseConfigurationStatus } from "@/lib/supabase/config";
import { getOrganization, listMemberships } from "@/server/repositories/workspace";
import { ApplicationError } from "./errors";
import { uuidSchema } from "@/lib/validations/entities";

export const ORGANIZATION_COOKIE = "auditor_organization";

export async function authenticatedClient(writable = false) {
  if (getSupabaseConfigurationStatus() !== "configured")
    throw new ApplicationError("CONFIG", "Configure o Supabase antes de continuar.");
  const db = writable ? await createActionClient() : await createReadOnlyClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user)
    throw new ApplicationError("AUTH", "Sua sessão expirou. Entre novamente.");
  return { db, user: data.user };
}

export async function workspaceContext(writable = false) {
  const { db, user } = await authenticatedClient(writable);
  const memberships = await listMemberships(db, user.id);
  const preferred = (await cookies()).get(ORGANIZATION_COOKIE)?.value;
  const membership = memberships.find((m) => m.organization_id === preferred) ?? memberships[0];
  if (!membership)
    throw new ApplicationError("ONBOARDING", "Crie sua organização antes de continuar.");
  const organization = await getOrganization(db, membership.organization_id);
  return { db, user, membership, memberships, organization };
}

export async function pageWorkspace() {
  try {
    return await workspaceContext();
  } catch (error) {
    if (error instanceof ApplicationError) {
      if (error.code === "AUTH") redirect("/login");
      if (error.code === "ONBOARDING") redirect("/onboarding");
      if (error.code === "DATABASE_SETUP" || error.code === "CONFIG")
        redirect("/settings?database=pending");
    }
    throw error;
  }
}

export function requireOwner(role: "owner" | "member") {
  if (role !== "owner")
    throw new ApplicationError(
      "FORBIDDEN",
      "Somente administradores podem cadastrar ou editar recursos.",
    );
}
export function validatedId(value: unknown) {
  const result = uuidSchema.safeParse(value);
  if (!result.success) throw new ApplicationError("VALIDATION", "Identificador inválido.");
  return result.data;
}
