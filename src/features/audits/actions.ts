"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuditSchema } from "./schemas";
import { summarizeResults } from "./metrics";
import { RateLimiter } from "@/lib/utils/rate-limit";
import { workspaceContext, requireOwner, validatedId } from "@/server/services/workspace";
import { actionError, ApplicationError, type ActionResult } from "@/server/services/errors";
import { allowPublicAction } from "@/server/services/action-guard";
import {
  createAuditRecord,
  auditDetails,
  appendExecution,
  versionOptions,
  rawAudit,
  interruptAudit,
  cancelAuditRecord,
} from "@/server/repositories/audits";
import { DemoConnector } from "@/server/connectors/demo";
import { executeTest } from "@/server/services/audit-engine";
import { configuredConnector } from "@/server/connectors/connection";
import { getConnection } from "@/server/repositories/connections";

export async function createAudit(input: unknown): Promise<ActionResult> {
  const parsed = createAuditSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      message: "Selecione o chatbot, a versão e os cenários, e confirme sua autorização.",
    };
  try {
    const context = await workspaceContext(true);
    requireOwner(context.membership.role);
    if (!(await allowPublicAction("audit_create", context.organization.id)))
      return { success: false, message: "Muitas solicitações. Aguarde um minuto." };
    const id = await createAuditRecord(context.db, context.organization.id, parsed.data);
    revalidatePath("/audits");
    return {
      success: true,
      message: "Auditoria criada. Execute os cenários na próxima tela.",
      redirectTo: `/audits/${id}`,
    };
  } catch (error) {
    return actionError(error);
  }
}
export type AuditProgress = {
  status: import("./schemas").AuditStatus;
  processed: number;
  total: number;
  summary: ReturnType<typeof summarizeResults>;
};
type ProgressResult = ActionResult & { progress?: AuditProgress };
const stepLimit = new RateLimiter(60, 60_000);

export async function executeNext(input: unknown): Promise<ProgressResult> {
  let failContext:
    { db: Awaited<ReturnType<typeof workspaceContext>>["db"]; id: string } | undefined;
  try {
    const id = validatedId(input),
      context = await workspaceContext(true);
    requireOwner(context.membership.role);
    if (!stepLimit.allow(context.organization.id))
      return {
        success: false,
        message: "Limite de chamadas alcançado. Aguarde um minuto e retome a execução.",
      };
    failContext = { db: context.db, id };
    let details = await auditDetails(context.db, context.organization.id, id);
    if (!details)
      throw new ApplicationError("FORBIDDEN", "Auditoria indisponível para esta organização.");
    if (details.run.status === "pending" || details.run.status === "running") {
      const test = details.criteria.cases.find(
        (test) => !details!.executions.some((execution) => execution.test_case_id === test.id),
      );
      if (!test)
        throw new ApplicationError(
          "SNAPSHOT",
          "O progresso está inconsistente. As evidências existentes serão preservadas.",
        );
      const snapshot = details.conditions.connector;
      let connector: import("@/server/connectors/types").ChatbotConnector;
      if (snapshot.type === "demo") connector = new DemoConnector(snapshot.revision);
      else if (snapshot.type === "csv")
        connector = {
          send: async () => ({ text: snapshot.responses[test.id] ?? "", latencyMs: 0 }),
        };
      else {
        const connection = await getConnection(
          context.db,
          context.organization.id,
          snapshot.connectionId,
        );
        if (
          connection.agent_version_id !== details.run.agent_version_id ||
          connection.endpoint !== snapshot.endpoint ||
          connection.contract !== snapshot.contract
        )
          throw new ApplicationError("SNAPSHOT", "A conexão não corresponde à versão preservada.");
        connector = configuredConnector(connection);
      }
      const result = await executeTest(
        connector,
        test,
        `${id}:${test.id}`,
        details.criteria.evaluator.name === "semantic"
          ? details.criteria.evaluator.model
          : undefined,
        {
          purpose: details.conditions.agent.description,
          sector: details.conditions.agent.category,
          version: details.conditions.version.label,
        },
      );
      await appendExecution(context.db, id, test.id, result);
      details = await auditDetails(context.db, context.organization.id, id);
      if (!details)
        throw new ApplicationError("DATABASE", "Não foi possível recarregar o progresso salvo.");
    }
    const progress = {
      status: details.run.status,
      processed: details.run.processed_count,
      total: details.run.total_tests,
      summary: summarizeResults(details.executions, details.run.status),
    };
    if (details.run.status === "completed") {
      revalidatePath("/dashboard");
      revalidatePath("/audits");
    }
    return { success: true, message: "Progresso salvo no Supabase.", progress };
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "SNAPSHOT" && failContext) {
      if (!(await interruptAudit(failContext.db, failContext.id)))
        return {
          success: false,
          message:
            "Não foi possível registrar a interrupção. As evidências já salvas foram preservadas; confira a conexão.",
        };
    }
    return actionError(error);
  }
}
export async function cancelAudit(
  input: unknown,
): Promise<ActionResult & { status?: import("./schemas").AuditStatus }> {
  try {
    const id = validatedId(input),
      context = await workspaceContext(true);
    requireOwner(context.membership.role);
    await cancelAuditRecord(context.db, id);
    revalidatePath(`/audits/${id}`);
    revalidatePath("/audits");
    const run = await rawAudit(context.db, context.organization.id, id);
    if (!run) throw new ApplicationError("FORBIDDEN", "Auditoria indisponível.");
    return {
      success: true,
      status: run.status,
      message:
        run.status === "cancelled"
          ? "Execução interrompida. Os resultados persistidos foram preservados."
          : "A auditoria já estava finalizada. Seu estado e suas evidências foram preservados.",
    };
  } catch (error) {
    return actionError(error);
  }
}
export async function loadVersions(input: unknown) {
  try {
    const id = z.uuid().parse(input),
      context = await workspaceContext();
    return {
      success: true as const,
      versions: await versionOptions(context.db, context.organization.id, id),
    };
  } catch {
    return {
      success: false as const,
      message: "Não foi possível carregar as versões deste chatbot.",
    };
  }
}
