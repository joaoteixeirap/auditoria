"use server";

import { revalidatePath } from "next/cache";
import { agentSchema, createAgentSchema, versionSchema } from "@/lib/validations/entities";
import { actionError, ApplicationError, type ActionResult } from "@/server/services/errors";
import { workspaceContext, requireOwner, validatedId } from "@/server/services/workspace";
import { getClient, getAgent, saveAgent, insertVersion } from "@/server/repositories/resources";

export async function upsertAgent(input: unknown, id?: string): Promise<ActionResult> {
  const parsed = (id ? agentSchema : createAgentSchema).safeParse(input);
  if (!parsed.success) return { success: false, message: "Confira os campos do chatbot." };
  try {
    const context = await workspaceContext(true);
    requireOwner(context.membership.role);
    const client = await getClient(context.db, context.organization.id, parsed.data.client_id);
    if (!client) throw new ApplicationError("FORBIDDEN", "Selecione um cliente desta organização.");
    const agentId = await saveAgent(
      context.db,
      context.organization.id,
      parsed.data,
      id ? validatedId(id) : undefined,
    );
    revalidatePath("/agents");
    revalidatePath(`/agents/${agentId}`);
    revalidatePath(`/clients/${client.id}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Chatbot salvo.", redirectTo: `/agents/${agentId}` };
  } catch (error) {
    return actionError(error);
  }
}
export async function addVersion(agentId: string, input: unknown): Promise<ActionResult> {
  const parsed = versionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Confira o nome e as notas da versão." };
  try {
    const context = await workspaceContext(true);
    requireOwner(context.membership.role);
    const id = validatedId(agentId);
    if (!(await getAgent(context.db, context.organization.id, id)))
      throw new ApplicationError("FORBIDDEN", "Chatbot indisponível.");
    await insertVersion(context.db, context.organization.id, id, parsed.data);
    revalidatePath(`/agents/${id}`);
    return {
      success: true,
      message: "Nova versão registrada. As versões anteriores foram preservadas.",
    };
  } catch (error) {
    return actionError(error);
  }
}
