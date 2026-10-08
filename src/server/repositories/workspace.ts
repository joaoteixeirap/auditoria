import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { ApplicationError } from "@/server/services/errors";

export async function listMemberships(db: SupabaseClient<Database>, userId: string) {
  const { data, error } = await db
    .from("organization_members")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  if (error)
    throw new ApplicationError(
      "DATABASE_SETUP",
      "Banco indisponível ou migration não aplicada. Consulte a configuração.",
    );
  return data;
}
export async function getOrganization(db: SupabaseClient<Database>, id: string) {
  const { data, error } = await db.from("organizations").select("*").eq("id", id).single();
  if (error) throw new ApplicationError("FORBIDDEN", "Organização indisponível para este usuário.");
  return data;
}

export async function organizationOptions(db: SupabaseClient<Database>, ids: string[]) {
  const { data, error } = await db
    .from("organizations")
    .select("id,name")
    .in("id", ids)
    .order("name");
  if (error) throw new ApplicationError("DATABASE", "Não foi possível listar as organizações.");
  return data;
}
