"use server";

import { requireSupabaseConfig } from "@/lib/supabase/config";
import { checkSupabaseConnection, type ConnectionCheck } from "@/server/services/connection-check";
import { allowPublicAction } from "@/server/services/action-guard";

export async function testConnection(): Promise<ConnectionCheck> {
  if (!(await allowPublicAction("connection")))
    return {
      status: "error",
      message: "Muitas verificações. Aguarde um minuto e tente novamente.",
      schemaReady: false,
      checkedAt: new Date().toISOString(),
    };
  return checkSupabaseConnection(requireSupabaseConfig());
}
