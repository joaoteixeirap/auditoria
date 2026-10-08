import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { ApplicationError } from "@/server/services/errors";
export type WorkflowDB = SupabaseClient<Database>;
function failure() {
  return new ApplicationError(
    "WORKFLOW_SETUP",
    "Não foi possível acessar esta funcionalidade. Confira a conexão e as migrations incrementais do fluxo completo.",
  );
}
export async function policies(db: WorkflowDB, org: string) {
  const { data, error } = await db
    .from("custom_scenarios")
    .select("*")
    .eq("organization_id", org)
    .order("created_at", { ascending: false })
    .order("version", { ascending: false })
    .limit(100);
  if (error) throw failure();
  return data;
}
export async function documents(db: WorkflowDB, org: string) {
  const { data, error } = await db
    .from("policy_documents")
    .select("id,name,storage_path,created_at")
    .eq("organization_id", org)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw failure();
  return data;
}
export async function document(db: WorkflowDB, org: string, id: string) {
  const { data, error } = await db
    .from("policy_documents")
    .select("*")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw failure();
  return data;
}
export async function savePolicy(
  db: WorkflowDB,
  input: Database["public"]["Functions"]["save_custom_scenario"]["Args"],
) {
  const { data, error } = await db.rpc("save_custom_scenario", input);
  if (error) throw failure();
  return data;
}
export async function createWorkflowAudit(
  db: WorkflowDB,
  input: Database["public"]["Functions"]["create_workflow_audit"]["Args"],
) {
  const { data, error } = await db.rpc("create_workflow_audit", input);
  if (error)
    throw new ApplicationError(
      "WORKFLOW_SETUP",
      "Não foi possível preparar a auditoria. Confira as migrations, versão e limite de auditorias; conclua ou cancele a execução ativa.",
    );
  return data;
}
export async function saveDocument(
  db: WorkflowDB,
  input: Database["public"]["Tables"]["policy_documents"]["Insert"],
) {
  const { error } = await db.from("policy_documents").insert(input);
  if (error) throw failure();
}
export async function saveReview(
  db: WorkflowDB,
  input: Database["public"]["Tables"]["finding_reviews"]["Insert"],
) {
  const { error } = await db.from("finding_reviews").insert(input);
  if (error) throw failure();
}
export async function saveDecision(
  db: WorkflowDB,
  input: Database["public"]["Tables"]["release_decisions"]["Insert"],
) {
  const { error } = await db.from("release_decisions").insert(input);
  if (error) throw failure();
}
export async function auditHistory(db: WorkflowDB, org: string, run: string, findingIds: string[]) {
  const [reviews, decisions] = await Promise.all([
    findingIds.length
      ? db
          .from("finding_reviews")
          .select("*")
          .eq("organization_id", org)
          .in("finding_id", findingIds)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    db
      .from("release_decisions")
      .select("*")
      .eq("organization_id", org)
      .eq("audit_run_id", run)
      .order("created_at", { ascending: false }),
  ]);
  if (reviews.error || decisions.error) throw failure();
  return { reviews: reviews.data ?? [], decisions: decisions.data ?? [] };
}
export async function reports(db: WorkflowDB, org: string) {
  const { data, error } = await db
    .from("audit_reports")
    .select("id,audit_run_id,created_at")
    .eq("organization_id", org)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw failure();
  return data;
}
export async function saveReport(
  db: WorkflowDB,
  input: Database["public"]["Tables"]["audit_reports"]["Insert"],
) {
  const { error } = await db.from("audit_reports").insert(input);
  if (error) throw failure();
}
export async function report(db: WorkflowDB, org: string, id: string) {
  const { data, error } = await db
    .from("audit_reports")
    .select("*")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw failure();
  return data;
}
export async function uploadFile(
  db: WorkflowDB,
  bucket: "policy-documents" | "audit-reports",
  path: string,
  bytes: Uint8Array,
  type: string,
) {
  const { error } = await db.storage
    .from(bucket)
    .upload(path, bytes, { contentType: type, upsert: false });
  if (error) throw failure();
}
export async function signedFile(
  db: WorkflowDB,
  bucket: "policy-documents" | "audit-reports",
  path: string,
) {
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, 60);
  if (error) throw failure();
  return data.signedUrl;
}
export async function usage(db: WorkflowDB, org: string) {
  const { data, error } = await db
    .from("evaluation_usage")
    .select("model,input_tokens,output_tokens,estimated_cost,created_at")
    .eq("organization_id", org)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw failure();
  return data;
}
export async function statistics(db: WorkflowDB, org: string) {
  const { data, error } = await db.rpc("audit_statistics", { org_id: org });
  if (error) throw failure();
  return data;
}
