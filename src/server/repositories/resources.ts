import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  ClientInput,
  AgentInput,
  CreateAgentInput,
  VersionInput,
} from "@/lib/validations/entities";
import { ApplicationError } from "@/server/services/errors";

export const PAGE_SIZE = 15;
type DB = SupabaseClient<Database>;
export function safeSearch(input: string) {
  return input
    .replace(/[\\%_]/g, "")
    .slice(0, 120)
    .trim();
}

export async function listClients(db: DB, org: string, page: number, search: string) {
  let query = db.from("clients").select("*", { count: "exact" }).eq("organization_id", org);
  if (search) query = query.ilike("name", `%${safeSearch(search)}%`);
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new ApplicationError("DATABASE", "Não foi possível listar os clientes.");
  return { rows: data, count: count ?? 0 };
}
export async function clientOptions(db: DB, org: string) {
  const { data, error } = await db
    .from("clients")
    .select("id,name,status")
    .eq("organization_id", org)
    .order("name")
    .limit(500);
  if (error) throw new ApplicationError("DATABASE", "Não foi possível carregar os clientes.");
  return data;
}
export async function getClient(db: DB, org: string, id: string) {
  const { data, error } = await db
    .from("clients")
    .select("*")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApplicationError("DATABASE", "Não foi possível carregar o cliente.");
  return data;
}
export async function saveClient(db: DB, org: string, input: ClientInput, id?: string) {
  const query = id
    ? db.from("clients").update(input).eq("organization_id", org).eq("id", id)
    : db.from("clients").insert({ ...input, organization_id: org });
  const { data, error } = await query.select("id").single();
  if (error)
    throw new ApplicationError(
      "DATABASE",
      "Não foi possível salvar o cliente. Confira os dados e sua permissão.",
    );
  return data.id;
}
export async function listAgents(
  db: DB,
  org: string,
  page: number,
  search: string,
  clientId?: string,
) {
  let query = db.from("agents").select("*", { count: "exact" }).eq("organization_id", org);
  if (search) query = query.ilike("name", `%${safeSearch(search)}%`);
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new ApplicationError("DATABASE", "Não foi possível listar os chatbots.");
  return { rows: data, count: count ?? 0 };
}
export async function getAgent(db: DB, org: string, id: string) {
  const { data, error } = await db
    .from("agents")
    .select("*")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApplicationError("DATABASE", "Não foi possível carregar o chatbot.");
  return data;
}
export async function saveAgent(
  db: DB,
  org: string,
  input: AgentInput | CreateAgentInput,
  id?: string,
) {
  if (id) {
    const { data, error } = await db
      .from("agents")
      .update({
        name: input.name,
        client_id: input.client_id,
        description: input.description,
        category: input.category,
        environment: input.environment,
        status: input.status,
      })
      .eq("organization_id", org)
      .eq("id", id)
      .select("id")
      .single();
    if (error) throw new ApplicationError("DATABASE", "Não foi possível atualizar o chatbot.");
    return data.id;
  }
  if (!("version" in input)) throw new ApplicationError("VALIDATION", "Informe a versão inicial.");
  const { data, error } = await db.rpc("create_agent", {
    org_id: org,
    linked_client: input.client_id,
    agent_name: input.name,
    agent_description: input.description,
    agent_category: input.category,
    agent_environment: input.environment,
    version_label: input.version,
  });
  if (error)
    throw new ApplicationError("DATABASE", "Não foi possível cadastrar o chatbot e sua versão.");
  return data;
}
export async function listVersions(db: DB, org: string, id: string, page = 1) {
  const { data, error, count } = await db
    .from("agent_versions")
    .select("*", { count: "exact" })
    .eq("organization_id", org)
    .eq("agent_id", id)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new ApplicationError("DATABASE", "Não foi possível carregar as versões.");
  return { rows: data, count: count ?? 0 };
}
export async function insertVersion(db: DB, org: string, id: string, input: VersionInput) {
  const { error } = await db.from("agent_versions").insert({
    organization_id: org,
    agent_id: id,
    label: input.label,
    notes: input.notes,
    demo_revision: input.demo_revision === "2" ? 2 : 1,
  });
  if (error)
    throw new ApplicationError(
      "DATABASE",
      "Não foi possível registrar a versão. Verifique se o nome já existe.",
    );
}
export async function dashboardMetrics(db: DB, org: string) {
  const results = await Promise.all([
    db.from("clients").select("id", { count: "exact", head: true }).eq("organization_id", org),
    db
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org)
      .eq("status", "active"),
    db
      .from("agents")
      .select("*")
      .eq("organization_id", org)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (results.some((r) => r.error))
    throw new ApplicationError("DATABASE", "Não foi possível carregar o dashboard.");
  return {
    clients: results[0].count ?? 0,
    activeAgents: results[1].count ?? 0,
    recentAgents: results[2].data ?? [],
  };
}
