"use server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  authenticatedClient,
  workspaceContext,
  requireOwner,
  ORGANIZATION_COOKIE,
} from "@/server/services/workspace";
import {
  createInvitation,
  acceptInvitation,
  revokeInvitation,
} from "@/server/repositories/memberships";
import { allowPublicAction } from "@/server/services/action-guard";
import { ApplicationError, actionError, type ActionResult } from "@/server/services/errors";
export async function generateInvitation(
  input: unknown,
): Promise<ActionResult & { code?: string }> {
  try {
    const value = z
      .object({ email: z.email().max(254), role: z.enum(["owner", "member"]) })
      .parse(input);
    const context = await workspaceContext(true);
    requireOwner(context.membership.role);
    if (!(await allowPublicAction("invitation_create", context.organization.id)))
      throw new ApplicationError("LIMIT", "Aguarde um minuto.");
    const code = randomBytes(32).toString("hex");
    await createInvitation(
      context.db,
      context.organization.id,
      value.email.toLowerCase(),
      value.role,
      createHash("sha256").update(code).digest("hex"),
    );
    revalidatePath("/organizations");
    return {
      success: true,
      code,
      message:
        "Convite criado, válido por sete dias. Compartilhe o código com o destinatário. Nenhum e-mail foi enviado.",
    };
  } catch (error) {
    return actionError(error);
  }
}
export async function joinOrganization(input: unknown): Promise<ActionResult> {
  try {
    const code = z
      .string()
      .trim()
      .regex(/^[a-f0-9]{64}$/)
      .parse(input);
    const context = await authenticatedClient(true);
    if (!(await allowPublicAction("invitation_accept", context.user.id)))
      throw new ApplicationError("LIMIT", "Aguarde um minuto.");
    const org = await acceptInvitation(context.db, createHash("sha256").update(code).digest("hex"));
    (await cookies()).set(ORGANIZATION_COOKIE, org, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "Você entrou na organização convidada.",
      redirectTo: "/dashboard",
    };
  } catch (error) {
    return actionError(error);
  }
}
export async function cancelInvitation(input: unknown): Promise<ActionResult> {
  try {
    const id = z.uuid().parse(input),
      context = await workspaceContext(true);
    requireOwner(context.membership.role);
    await revokeInvitation(context.db, context.organization.id, id);
    revalidatePath("/organizations");
    return { success: true, message: "Convite revogado." };
  } catch (error) {
    return actionError(error);
  }
}
