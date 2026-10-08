import "server-only";
import { z } from "zod";
import type { WorkflowDB } from "./workflow";
import { ApplicationError } from "@/server/services/errors";
const count = z.number().int().nonnegative();
const dashboardSchema = z.object({
  audits: count,
  demonstrations: count,
  counts: z.object({
    total: count,
    pass: count,
    fail: count,
    error: count,
    inconclusive: count,
    critical: count,
  }),
  categories: z.record(z.string(), count),
  history: z.array(
    z.object({
      id: z.uuid(),
      agent_id: z.uuid(),
      agent: z.string(),
      version: z.string(),
      criteria_fingerprint: z.string(),
      created_at: z.string(),
      pass: count,
      fail: count,
    }),
  ),
});
export async function companyDashboard(db: WorkflowDB, org: string) {
  const { data, error } = await db.rpc("company_dashboard", { org_id: org });
  if (error)
    throw new ApplicationError("B2B_SETUP", "Métricas empresariais aguardam a migration B2B.");
  return dashboardSchema.parse(data);
}
