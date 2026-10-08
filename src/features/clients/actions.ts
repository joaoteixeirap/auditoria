"use server";

import { revalidatePath } from "next/cache";
import { clientSchema } from "@/lib/validations/entities";
import { actionError, type ActionResult } from "@/server/services/errors";
import { workspaceContext, requireOwner, validatedId } from "@/server/services/workspace";
import { saveClient } from "@/server/repositories/resources";

export async function upsertClient(input: unknown, id?: string): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Confira os campos do cliente." };
  try {
    const context = await workspaceContext(true);
    requireOwner(context.membership.role);
    const clientId = await saveClient(
      context.db,
      context.organization.id,
      parsed.data,
      id ? validatedId(id) : undefined,
    );
    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Cliente salvo.", redirectTo: `/clients/${clientId}` };
  } catch (error) {
    return actionError(error);
  }
}
