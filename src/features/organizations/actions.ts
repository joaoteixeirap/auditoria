"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { organizationSchema } from "@/lib/validations/entities";
import { authenticatedClient, ORGANIZATION_COOKIE, validatedId } from "@/server/services/workspace";
import { listMemberships } from "@/server/repositories/workspace";
import { allowPublicAction } from "@/server/services/action-guard";
import { actionError, type ActionResult } from "@/server/services/errors";

async function selectOrganizationCookie(id: string) {
  (await cookies()).set(ORGANIZATION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
export async function createOrganization(input: unknown): Promise<ActionResult> {
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: "Informe um nome entre 2 e 120 caracteres." };
  try {
    const { db, user } = await authenticatedClient(true);
    if (!(await allowPublicAction("organization", user.id)))
      return { success: false, message: "Muitas tentativas. Aguarde um minuto." };
    const { data, error } = await db.rpc("create_organization", {
      organization_name: parsed.data.name,
    });
    if (error)
      return {
        success: false,
        message:
          "Não foi possível criar a organização. Confira a migration e o limite de 5 organizações por usuário.",
      };
    await selectOrganizationCookie(data);
    revalidatePath("/dashboard");
    return { success: true, message: "Organização criada.", redirectTo: "/dashboard" };
  } catch (error) {
    return actionError(error);
  }
}
export async function switchOrganization(input: unknown): Promise<ActionResult> {
  try {
    const id = validatedId(input);
    const { db, user } = await authenticatedClient(true);
    const memberships = await listMemberships(db, user.id);
    if (!memberships.some((m) => m.organization_id === id))
      return { success: false, message: "Organização indisponível para este usuário." };
    await selectOrganizationCookie(id);
    revalidatePath("/dashboard");
    return { success: true, message: "Organização selecionada.", redirectTo: "/dashboard" };
  } catch (error) {
    return actionError(error);
  }
}
