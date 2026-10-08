"use server";
import { revalidatePath } from "next/cache";
import { workspaceContext, requireOwner, validatedId } from "@/server/services/workspace";
import { auditDetails } from "@/server/repositories/audits";
import { auditHistory, uploadFile, saveReport } from "@/server/repositories/workflow";
import { generatePdf, reportSnapshotSchema } from "@/server/services/report-pdf";
import { actionError, ApplicationError, type ActionResult } from "@/server/services/errors";
import { allowPublicAction } from "@/server/services/action-guard";
export async function createReport(input: unknown): Promise<ActionResult> {
  try {
    const id = validatedId(input),
      context = await workspaceContext(true);
    requireOwner(context.membership.role);
    if (!(await allowPublicAction("report_generate", context.organization.id)))
      throw new ApplicationError("LIMIT", "Aguarde um minuto antes de gerar outro relatório.");
    const details = await auditDetails(context.db, context.organization.id, id);
    if (!details || ["pending", "running"].includes(details.run.status))
      throw new ApplicationError(
        "REPORT",
        "Conclua ou cancele a execução antes de gerar o relatório.",
      );
    const history = await auditHistory(
      context.db,
      context.organization.id,
      id,
      details.findings.map((finding) => finding.id),
    );
    const snapshot = reportSnapshotSchema.parse({
      generatedAt: new Date().toISOString(),
      organization: context.organization.name,
      auditId: id,
      source: details.run.source,
      status: details.run.status,
      criteria: details.criteria,
      conditions: details.conditions,
      executions: details.executions,
      reviews: history.reviews,
      decisions: history.decisions,
    });
    const bytes = await generatePdf(snapshot),
      reportId = crypto.randomUUID(),
      path = `${context.organization.id}/${reportId}`;
    await uploadFile(context.db, "audit-reports", path, bytes, "application/pdf");
    await saveReport(context.db, {
      id: reportId,
      organization_id: context.organization.id,
      audit_run_id: id,
      storage_path: path,
      snapshot,
    });
    revalidatePath("/reports");
    return {
      success: true,
      message: "Relatório privado gerado com snapshot preservado.",
      redirectTo: "/reports",
    };
  } catch (error) {
    return actionError(error);
  }
}
