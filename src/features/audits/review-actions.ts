"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { workspaceContext, requireOwner } from "@/server/services/workspace";
import { auditDetails, findFinding } from "@/server/repositories/audits";
import { saveReview, saveDecision, auditHistory } from "@/server/repositories/workflow";
import { actionError, ApplicationError, type ActionResult } from "@/server/services/errors";
export async function reviewFinding(input: unknown): Promise<ActionResult> {
  try {
    const value = z
      .object({
        findingId: z.uuid(),
        verdict: z.enum(["confirmed", "dismissed", "needs_review"]),
        reason: z.string().trim().min(10).max(2000),
      })
      .parse(input);
    const context = await workspaceContext(true);
    requireOwner(context.membership.role);
    const finding = await findFinding(context.db, context.organization.id, value.findingId);
    if (!finding) throw new ApplicationError("FORBIDDEN", "Achado indisponível.");
    await saveReview(context.db, {
      organization_id: context.organization.id,
      finding_id: finding.id,
      verdict: value.verdict,
      reason: value.reason,
    });
    revalidatePath(`/audits/${finding.audit_run_id}`);
    revalidatePath(`/audits/${finding.audit_run_id}/findings/${finding.id}`);
    return {
      success: true,
      message: "Revisão acrescentada ao histórico. O resultado original foi preservado.",
    };
  } catch (error) {
    return actionError(error);
  }
}
export async function decideRelease(input: unknown): Promise<ActionResult> {
  try {
    const value = z
      .object({
        auditId: z.uuid(),
        decision: z.enum(["released", "blocked", "needs_review"]),
        reason: z.string().trim().min(10).max(2000),
      })
      .parse(input);
    const context = await workspaceContext(true);
    requireOwner(context.membership.role);
    const details = await auditDetails(context.db, context.organization.id, value.auditId);
    if (!details || details.run.status !== "completed")
      throw new ApplicationError("STATE", "Conclua a auditoria antes de registrar a decisão.");
    const history = await auditHistory(
      context.db,
      context.organization.id,
      value.auditId,
      details.findings.map((finding) => finding.id),
    );
    if (
      value.decision === "released" &&
      (details.executions.some((execution) =>
        ["ERROR", "INCONCLUSIVE"].includes(execution.verdict),
      ) ||
        details.findings.some(
          (finding) =>
            history.reviews.find((review) => review.finding_id === finding.id)?.verdict !==
            "dismissed",
        ))
    )
      throw new ApplicationError(
        "REVIEW",
        "Resolva erros e inconclusivos por reteste e revise as falhas. A liberação exige ausência de falhas confirmadas ou pendentes.",
      );
    await saveDecision(context.db, {
      organization_id: context.organization.id,
      audit_run_id: value.auditId,
      decision: value.decision,
      reason: value.reason,
    });
    revalidatePath(`/audits/${value.auditId}`);
    return {
      success: true,
      message: "Decisão humana registrada, sem alterar os resultados automáticos.",
    };
  } catch (error) {
    return actionError(error);
  }
}
