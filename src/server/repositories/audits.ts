import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditRun, Database } from "@/types/database";
import { caseSchema, criteriaSchema, createAuditSchema } from "@/features/audits/schemas";
import { ApplicationError } from "@/server/services/errors";
import type { ExecutedTest } from "@/server/services/audit-engine";
import { PAGE_SIZE } from "./resources";
import { getAgent } from "./resources";
import { listConnections } from "./connections";
import { policies } from "./workflow";
import { semanticModel } from "@/server/evaluators/semantic";
import { estimateEvaluationCost } from "@/server/evaluators/cost";

type DB = SupabaseClient<Database>;
export const conditionsSchema = z.object({
  agent: z.object({
    id: z.uuid(),
    name: z.string(),
    environment: z.enum(["demo", "staging", "production"]),
    description: z.string().max(2000).optional(),
    category: z.string().max(80).optional(),
  }),
  client: z.object({ id: z.uuid(), name: z.string() }),
  version: z.object({
    id: z.uuid(),
    label: z.string(),
    demo_revision: z.union([z.literal(1), z.literal(2)]),
  }),
  connector: z.discriminatedUnion("type", [
    z.object({ type: z.literal("demo"), revision: z.union([z.literal(1), z.literal(2)]) }),
    z.object({
      type: z.literal("csv"),
      responses: z.record(z.string(), z.string().min(1).max(10000)),
    }),
    z.object({
      type: z.literal("http"),
      connectionId: z.uuid(),
      endpoint: z.url(),
      contract: z.enum(["message-text-v1", "http-json-v1"]),
    }),
  ]),
});

export async function auditAgents(db: DB, org: string) {
  const { data, error } = await db
    .from("agents")
    .select("id,name,client_id")
    .eq("organization_id", org)
    .eq("status", "active")
    .order("name")
    .limit(500);
  if (error)
    throw new ApplicationError("DATABASE", "Não foi possível carregar os chatbots para auditoria.");
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
  const agent = await getAgent(db, org, agentId);
  if (!agent) return [];
  if (agent.environment === "demo")
    return data.map((version) => ({ ...version, source: "demo" as const }));
  const connections = await listConnections(db, org, agentId);
  return data
    .filter((version) =>
      connections.some((connection) => connection.agent_version_id === version.id),
    )
    .map((version) => ({ ...version, source: "http" as const }));
}
export async function auditCatalog(db: DB, org?: string) {
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
  if (!org) return parsed.data;
  let custom: Awaited<ReturnType<typeof policies>> = [];
  try {
    custom = await policies(db, org);
  } catch (error) {
    if (!(error instanceof ApplicationError && error.code === "WORKFLOW_SETUP")) throw error;
  }
  const latest = new Map<string, (typeof custom)[number]>();
  for (const rule of custom.filter((rule) => rule.state === "approved"))
    if (!latest.has(rule.rule_key)) latest.set(rule.rule_key, rule);
  return [
    ...parsed.data,
    ...Array.from(latest.values()).map((rule) => caseSchema.parse(rule.definition)),
  ];
}
export async function createAuditRecord(
  db: DB,
  org: string,
  input: z.infer<typeof createAuditSchema>,
) {
  if (input.previousRun) {
    const previous = await auditDetails(db, org, input.previousRun);
    if (
      !previous ||
      previous.run.status !== "completed" ||
      previous.run.agent_id !== input.agentId ||
      previous.run.source === "csv" ||
      [...input.caseIds].sort().join() !== [...previous.run.selected_case_ids].sort().join()
    )
      throw new ApplicationError(
        "RETEST",
        "Selecione uma auditoria concluída deste chatbot e preserve todos os seus critérios.",
      );
    if (previous.criteria.evaluator.name === "semantic") {
      if (!input.aiAuthorized)
        throw new ApplicationError("AUTHORIZATION", "Autorize a avaliação por IA do reteste.");
      try {
        semanticModel();
      } catch {
        throw new ApplicationError(
          "CONFIG",
          "Configure a chave e o modelo do avaliador no servidor.",
        );
      }
    }
    const { data, error } = await db.rpc("retest_audit", {
      org_id: org,
      previous_run: input.previousRun,
      selected_version: input.versionId,
      idempotency_key: input.requestKey,
      authorized: input.authorized,
    });
    if (error)
      throw new ApplicationError(
        "RETEST",
        "Não foi possível preparar o reteste. Confira a migration B2B, a conexão da versão e o limite de execuções.",
      );
    return data;
  }
  const agent = await getAgent(db, org, input.agentId);
  if (!agent) throw new ApplicationError("FORBIDDEN", "Chatbot indisponível.");
  if (agent.environment !== "demo") {
    const catalog = await auditCatalog(db, org);
    const selected = catalog.filter((test) => input.caseIds.includes(test.id));
    const semantic = selected.some((test) => test.evaluation.kind === "semantic");
    if (semantic && !input.aiAuthorized)
      throw new ApplicationError(
        "AUTHORIZATION",
        "Confirme o envio de perguntas, respostas e políticas ao provedor de IA configurado.",
      );
    if (semantic) {
      let model: string;
      try {
        model = semanticModel();
      } catch {
        throw new ApplicationError(
          "CONFIG",
          "Configure a chave do avaliador e o modelo no servidor antes de avaliar políticas personalizadas.",
        );
      }
      const { data, error } = await db.rpc("create_company_audit", {
        org_id: org,
        selected_agent: input.agentId,
        selected_version: input.versionId,
        case_ids: input.caseIds,
        idempotency_key: input.requestKey,
        selected_model: model,
        authorized: true,
      });
      if (error)
        throw new ApplicationError(
          "AUDIT_CREATE",
          "Não foi possível preparar a auditoria semântica. Confira as migrations, conexão e cenários aprovados.",
        );
      return data;
    }
    throw new ApplicationError(
      "POLICY",
      "Adicione e aprove regras da sua empresa antes de auditar um chatbot real. O catálogo fictício é exclusivo da demonstração.",
    );
  }
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
        ? "A migration necessária para esta auditoria ainda não foi instalada."
        : "Não foi possível criar a auditoria. Confira a versão e a conexão; conclua ou cancele a execução ativa. O limite inicial é de 100 auditorias por mês por organização.",
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
  const args = {
    run_id: runId,
    case_id: caseId,
    result_verdict: result.verdict,
    result_response: result.response,
    result_reason: result.reason,
    result_evidence: result.evidence,
    result_recommendation: result.recommendation,
    result_latency: result.latencyMs,
  };
  const { error } = result.usage
    ? await db.rpc("append_evaluated_execution", {
        ...args,
        usage_model: result.usage.model,
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        estimated_cost: estimateEvaluationCost(result.usage),
      })
    : await db.rpc("append_demo_execution", args);
  if (error)
    throw new ApplicationError(
      "PERSISTENCE",
      "O resultado não pôde ser persistido. Tente continuar a execução; resultados já salvos não serão duplicados.",
    );
}
export async function interruptAudit(db: DB, id: string) {
  const { error } = await db.rpc("fail_demo_audit", {
    run_id: id,
    failure_code: "SNAPSHOT_INVALID",
  });
  return !error;
}
export async function cancelAuditRecord(db: DB, id: string) {
  const { error } = await db.rpc("cancel_demo_audit", { run_id: id });
  if (error) throw new ApplicationError("DATABASE", "Não foi possível cancelar a auditoria.");
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
