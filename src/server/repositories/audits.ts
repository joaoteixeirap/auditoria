import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditRun, Database } from "@/types/database";
import { caseSchema, criteriaSchema, createAuditSchema } from "@/features/audits/schemas";
import { ApplicationError } from "@/server/services/errors";
import type { ExecutedTest } from "@/server/services/audit-engine";
import { PAGE_SIZE } from "./resources";

type DB = SupabaseClient<Database>;
export const conditionsSchema = z.object({
  agent: z.object({ id: z.uuid(), name: z.string(), environment: z.literal("demo") }),
  client: z.object({ id: z.uuid(), name: z.string() }),
  version: z.object({
    id: z.uuid(),
    label: z.string(),
    demo_revision: z.union([z.literal(1), z.literal(2)]),
  }),
  connector: z.object({ type: z.literal("demo"), revision: z.union([z.literal(1), z.literal(2)]) }),
});

export async function demoAgents(db: DB, org: string) {
  const { data, error } = await db
    .from("agents")
    .select("id,name,client_id")
    .eq("organization_id", org)
    .eq("environment", "demo")
    .eq("connection_type", "demo")
    .eq("status", "active")
    .order("name")
    .limit(500);
  if (error)
    throw new ApplicationError(
      "DATABASE",
      "Não foi possível carregar os chatbots de demonstração.",
    );
  return data;
}
export async function versionOptions(db: DB, org: string, agentId: string) {
  const { data, error } = await db
    .from("agent_versions")
    .select("id,label,demo_revision")
    .eq("organization_id", org)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error)
    throw new ApplicationError(
      "PHASE2_SETUP",
      "Aplique a migration da Fase 2 para carregar as versões demonstrativas.",
    );
  return data;
}
export async function auditCatalog(db: DB) {
  const { data, error } = await db.from("test_cases").select("definition").order("key");
  if (error)
    throw new ApplicationError(
      "PHASE2_SETUP",
      "Aplique a migration da Fase 2 para disponibilizar o catálogo de cenários.",
    );
  const parsed = z
    .array(caseSchema)
    .min(1)
    .max(100)
    .safeParse(data.map((item) => item.definition));
  if (!parsed.success)
    throw new ApplicationError(
      "CATALOG",
      "O catálogo instalado é incompatível com esta versão da aplicação.",
    );
  return parsed.data;
}
export async function createAuditRecord(
  db: DB,
  org: string,
  input: z.infer<typeof createAuditSchema>,
) {
  const { data, error } = await db.rpc("create_demo_audit", {
    org_id: org,
    selected_agent: input.agentId,
    selected_version: input.versionId,
    case_ids: input.caseIds,
    idempotency_key: input.requestKey,
    authorized: input.authorized,
  });
  if (error)
    throw new ApplicationError(
      "AUDIT_CREATE",
      error.code === "PGRST202"
        ? "Aplique a migration da Fase 2 antes de iniciar uma auditoria."
        : "Não foi possível criar a auditoria. Confira a versão e o ambiente de demonstração; conclua ou cancele a execução ativa. O limite inicial é de 100 auditorias por mês por organização.",
    );
  return data;
}
export async function listAudits(
  db: DB,
  org: string,
  page = 1,
  agentId?: string,
  clientId?: string,
) {
  let query = db.from("audit_runs").select("*", { count: "exact" }).eq("organization_id", org);
  if (agentId) query = query.eq("agent_id", agentId);
  if (clientId) query = query.eq("conditions_snapshot->client->>id", clientId);
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error)
    throw new ApplicationError(
      "PHASE2_SETUP",
      "Não foi possível listar auditorias. Confirme a migration da Fase 2 e a conexão.",
    );
  return { rows: data, count: count ?? 0 };
}
export async function auditOptions(db: DB, org: string, agentId: string) {
  const { data, error } = await db
    .from("audit_runs")
    .select("id,conditions_snapshot,created_at,criteria_fingerprint")
    .eq("organization_id", org)
    .eq("agent_id", agentId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error)
    throw new ApplicationError(
      "DATABASE",
      "Não foi possível carregar as auditorias para comparação.",
    );
  return data.map((item) => ({
    id: item.id,
    createdAt: item.created_at,
    label: conditionsSchema.parse(item.conditions_snapshot).version.label,
  }));
}
export async function rawAudit(db: DB, org: string, id: string) {
  const { data, error } = await db
    .from("audit_runs")
    .select("*")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApplicationError("DATABASE", "Não foi possível carregar a auditoria.");
  return data;
}
export function parseSnapshots(run: AuditRun) {
  const criteria = criteriaSchema.safeParse(run.criteria_snapshot),
    conditions = conditionsSchema.safeParse(run.conditions_snapshot);
  if (!criteria.success || !conditions.success)
    throw new ApplicationError(
      "SNAPSHOT",
      "O snapshot não é compatível com o motor disponível. A execução será interrompida sem alterar as evidências.",
    );
  return { criteria: criteria.data, conditions: conditions.data };
}
export async function auditDetails(db: DB, org: string, id: string) {
  const run = await rawAudit(db, org, id);
  if (!run) return null;
  const snapshots = parseSnapshots(run);
  const [executions, findings] = await Promise.all([
    db
      .from("test_executions")
      .select("*")
      .eq("organization_id", org)
      .eq("audit_run_id", id)
      .order("created_at"),
    db
      .from("findings")
      .select("*")
      .eq("organization_id", org)
      .eq("audit_run_id", id)
      .order("created_at"),
  ]);
  if (executions.error || findings.error)
    throw new ApplicationError("DATABASE", "Não foi possível carregar os resultados persistidos.");
  return { run, ...snapshots, executions: executions.data, findings: findings.data };
}
export async function appendExecution(db: DB, runId: string, caseId: string, result: ExecutedTest) {
  const { error } = await db.rpc("append_demo_execution", {
    run_id: runId,
    case_id: caseId,
    result_verdict: result.verdict,
    result_response: result.response,
    result_reason: result.reason,
    result_evidence: result.evidence,
    result_recommendation: result.recommendation,
    result_latency: result.latencyMs,
  });
  if (error)
    throw new ApplicationError(
      "PERSISTENCE",
      "O resultado não pôde ser persistido. Tente continuar a execução; resultados já salvos não serão duplicados.",
    );
}
export async function findFinding(db: DB, org: string, id: string) {
  const { data, error } = await db
    .from("findings")
    .select("*")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApplicationError("DATABASE", "Não foi possível carregar o achado.");
  return data;
}

export async function auditDashboard(db: DB, org: string) {
  const [runs, critical, recent] = await Promise.all([
    db
      .from("audit_runs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org)
      .eq("status", "completed"),
    db
      .from("findings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org)
      .eq("severity", "critical"),
    db
      .from("audit_runs")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (runs.error || critical.error || recent.error)
    throw new ApplicationError(
      "PHASE2_SETUP",
      "Não foi possível carregar as métricas de auditoria. Confira a conexão e a migration da Fase 2.",
    );
  return { completed: runs.count ?? 0, criticalHistory: critical.count ?? 0, recent: recent.data };
}
