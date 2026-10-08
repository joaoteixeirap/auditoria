import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { ApplicationError } from "@/server/services/errors";

type DB = SupabaseClient<Database>;
export async function listConnections(db: DB, org: string, agent: string) {
  const { data, error } = await db
    .from("agent_connections")
    .select("id,agent_version_id,endpoint,contract")
    .eq("organization_id", org)
    .eq("agent_id", agent);
  if (error)
    throw new ApplicationError(
      "PHASE3_SETUP",
      "A configuração HTTP exige a migration incremental da Fase 3.",
    );
  return data;
}
export async function saveConnection(
  db: DB,
  input: Database["public"]["Tables"]["agent_connections"]["Insert"],
) {
  const { error } = await db.from("agent_connections").insert(input);
  if (error)
    throw new ApplicationError(
      "CONNECTION",
      "Não foi possível salvar. Cada versão aceita uma única configuração HTTP imutável.",
    );
}
export async function getConnection(db: DB, org: string, id: string) {
  const { data, error } = await db
    .from("agent_connections")
    .select("*")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (error || !data)
    throw new ApplicationError("CONNECTION", "Conexão indisponível para esta organização.");
  return data;
}
