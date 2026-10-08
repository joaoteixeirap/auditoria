"use server";

import { revalidatePath } from "next/cache";
import { agentSchema, createAgentSchema, versionSchema } from "@/lib/validations/entities";
import { actionError, ApplicationError, type ActionResult } from "@/server/services/errors";
import { workspaceContext, requireOwner, validatedId } from "@/server/services/workspace";
import {
  getClient,
  getAgent,
  getVersion,
  saveAgent,
  insertVersion,
} from "@/server/repositories/resources";
import { connectionSchema } from "./connection-schema";
import { saveConnection } from "@/server/repositories/connections";
import { httpEndpoint } from "@/server/connectors/http-security";
import { encryptCredential } from "@/server/connectors/credentials";
import { allowPublicAction } from "@/server/services/action-guard";
import { z } from "zod";
import { HttpConnector } from "@/server/connectors/http";

export async function configureHttp(agentId: string, input: unknown): Promise<ActionResult> {
  const parsed = connectionSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: "Confira a versão, URL HTTPS e autorização." };
  try {
    const context = await workspaceContext(true);
    requireOwner(context.membership.role);
    const id = validatedId(agentId);
    const agent = await getAgent(context.db, context.organization.id, id);
    if (!agent || agent.status !== "active" || agent.environment === "demo")
      throw new ApplicationError(
        "CONNECTION",
        "Use um chatbot ativo em Homologação ou Produção para configurar HTTP.",
      );
    if (!(await allowPublicAction("http_configure", context.organization.id)))
      throw new ApplicationError("LIMIT", "Muitas solicitações. Aguarde um minuto.");
    await getVersion(context.db, context.organization.id, id, parsed.data.versionId);
    let endpoint: string;
    try {
      endpoint = httpEndpoint(parsed.data.endpoint).href;
    } catch {
      throw new ApplicationError(
        "CONNECTION",
        "Use HTTPS na porta padrão, com domínio e sem query, fragmento ou credenciais na URL.",
      );
    }
    let encrypted: string | null = null,
      encryptedConfig: string | null = null;
    if (parsed.data.token || parsed.data.config) {
      try {
        if (parsed.data.token)
          encrypted = encryptCredential(
            parsed.data.token,
            `${context.organization.id}:${parsed.data.versionId}`,
          );
        if (parsed.data.config)
          encryptedConfig = encryptCredential(
            JSON.stringify(parsed.data.config),
            `${context.organization.id}:${parsed.data.versionId}:http-json-v1`,
          );
      } catch {
        throw new ApplicationError(
          "CONFIG",
          "Configure CONNECTOR_ENCRYPTION_KEY no servidor para proteger as credenciais e a configuração genérica.",
        );
      }
    }
    await saveConnection(context.db, {
      organization_id: context.organization.id,
      agent_id: id,
      agent_version_id: parsed.data.versionId,
      endpoint,
      encrypted_token: encrypted,
      encrypted_config: encryptedConfig,
      contract: parsed.data.config ? "http-json-v1" : "message-text-v1",
    });
    revalidatePath(`/agents/${id}`);
    return {
      success: true,
      message: "Conexão HTTP registrada para esta versão. Nenhuma chamada foi enviada.",
    };
  } catch (error) {
    return actionError(error);
  }
}
export async function testHttpConnection(
  agentId: string,
  input: unknown,
  question: unknown,
): Promise<ActionResult> {
  try {
    const value = connectionSchema.parse(input),
      message = z.string().trim().min(1).max(2000).parse(question);
    const context = await workspaceContext(true);
    requireOwner(context.membership.role);
    const id = validatedId(agentId),
      agent = await getAgent(context.db, context.organization.id, id);
    if (!agent || agent.status !== "active" || agent.environment === "demo")
      throw new ApplicationError("CONNECTION", "Selecione um chatbot real ativo.");
    await getVersion(context.db, context.organization.id, id, value.versionId);
    if (!(await allowPublicAction("http_test", context.organization.id)))
      throw new ApplicationError("LIMIT", "Aguarde um minuto antes de testar novamente.");
    const endpoint = httpEndpoint(value.endpoint).href;
    const reply = await new HttpConnector(endpoint, value.token, value.config).send({
      message,
      sessionId: crypto.randomUUID(),
    });
    if (reply.error) throw new ApplicationError("CONNECTION", reply.error);
    return {
      success: true,
      message:
        "Conexão validada: resposta textual recebida. Este teste não é uma auditoria e não foi armazenado.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function upsertAgent(input: unknown, id?: string): Promise<ActionResult> {
  const parsed = (id ? agentSchema : createAgentSchema).safeParse(input);
  if (!parsed.success) return { success: false, message: "Confira os campos do chatbot." };
  try {
    const context = await workspaceContext(true);
    requireOwner(context.membership.role);
    if (
      parsed.data.client_id &&
      !(await getClient(context.db, context.organization.id, parsed.data.client_id))
    )
      throw new ApplicationError("FORBIDDEN", "Vínculo indisponível nesta empresa.");
    const agentId = await saveAgent(
      context.db,
      context.organization.id,
      parsed.data,
      id ? validatedId(id) : undefined,
    );
    revalidatePath("/agents");
    revalidatePath(`/agents/${agentId}`);
    if (parsed.data.client_id) revalidatePath(`/clients/${parsed.data.client_id}`);
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
