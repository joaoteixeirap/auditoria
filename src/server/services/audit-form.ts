import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  auditCatalog,
  demoAgents,
  versionOptions,
  auditDetails,
} from "@/server/repositories/audits";
import { uuidSchema } from "@/lib/validations/entities";

export async function prepareAuditForm(
  db: SupabaseClient<Database>,
  org: string,
  params: { agent?: string; retest?: string },
) {
  const [agents, scenarios] = await Promise.all([demoAgents(db, org), auditCatalog(db)]);
  const baseline =
    params.retest && uuidSchema.safeParse(params.retest).success
      ? await auditDetails(db, org, params.retest)
      : null;
  const preferred = baseline?.run.agent_id ?? params.agent;
  const selected = agents.find((agent) => agent.id === preferred) ?? agents[0] ?? null;
  const versions = selected ? await versionOptions(db, org, selected.id) : [];
  return { agents, scenarios, baseline, selected, versions };
}
