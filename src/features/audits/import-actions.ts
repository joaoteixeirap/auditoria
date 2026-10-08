"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { parseAuditCsv } from "./csv";
import { workspaceContext, requireOwner } from "@/server/services/workspace";
import { auditCatalog } from "@/server/repositories/audits";
import { createWorkflowAudit } from "@/server/repositories/workflow";
import { semanticModel } from "@/server/evaluators/semantic";
import { actionError, ApplicationError, type ActionResult } from "@/server/services/errors";
import { allowPublicAction } from "@/server/services/action-guard";
export async function importCsv(input: unknown): Promise<ActionResult> {
  try {
    const value = z
      .object({
        agentId: z.uuid(),
        versionId: z.uuid(),
        requestKey: z.uuid(),
        csv: z.string().max(150000),
        authorized: z.literal(true),
        aiAuthorized: z.boolean(),
        demoCriteriaAuthorized: z.boolean().optional(),
      })
      .parse(input);
    const context = await workspaceContext(true);
    requireOwner(context.membership.role);
    if (!(await allowPublicAction("csv_import", context.organization.id)))
      throw new ApplicationError("LIMIT", "Aguarde um minuto.");
    const rows = parseAuditCsv(value.csv),
      catalog = await auditCatalog(context.db, context.organization.id),
      responses: Record<string, string> = {};
    for (const row of rows) {
      const test = catalog.find((entry) => entry.id === row.scenario || entry.key === row.scenario);
      if (!test || responses[test.id])
        throw new ApplicationError(
          "CSV",
          "O CSV contém cenário indisponível ou duplicado. Use IDs ou chaves do catálogo aprovado.",
        );
      if (test.evaluation.kind !== "semantic" && !value.demoCriteriaAuthorized)
        throw new ApplicationError(
          "DEMO",
          "O cenário usa uma política fictícia. Use regras da empresa ou confirme explicitamente a importação demonstrativa.",
        );
      responses[test.id] = row.response;
    }
    const semantic = catalog.some(
      (test) => responses[test.id] !== undefined && test.evaluation.kind === "semantic",
    );
    if (semantic && !value.aiAuthorized)
      throw new ApplicationError(
        "AUTHORIZATION",
        "Confirme o envio das respostas e políticas ao provedor de IA configurado.",
      );
    let model: string | undefined;
    if (semantic) {
      try {
        model = semanticModel();
      } catch {
        throw new ApplicationError(
          "CONFIG",
          "Configure a chave do avaliador e o modelo para avaliar regras personalizadas.",
        );
      }
    }
    const data = await createWorkflowAudit(context.db, {
      org_id: context.organization.id,
      selected_agent: value.agentId,
      selected_version: value.versionId,
      case_ids: Object.keys(responses),
      idempotency_key: value.requestKey,
      selected_source: "csv",
      imported: responses,
      selected_model: model ?? null,
      authorized: true,
    });
    revalidatePath("/audits");
    return {
      success: true,
      message:
        "Respostas importadas. Inicie a avaliação na próxima tela; o chatbot não será chamado.",
      redirectTo: `/audits/${data}`,
    };
  } catch (error) {
    return actionError(error);
  }
}
