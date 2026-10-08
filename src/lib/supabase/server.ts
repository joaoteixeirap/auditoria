import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseConfig } from "./config";
import type { Database } from "@/types/database";

/** Somente leitura: Server Components não podem escrever cookies. */
export async function createReadOnlyClient() {
  const { url, publishableKey } = requireSupabaseConfig();
  const store = await cookies();
  return createServerClient<Database>(url, publishableKey, {
    cookies: { getAll: () => store.getAll() },
  });
}

/** Usar exclusivamente em Server Actions ou Route Handlers. */
export async function createActionClient() {
  const { url, publishableKey } = requireSupabaseConfig();
  const store = await cookies();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        for (const { name, value, options } of values) {
          store.set(name, value, {
            ...options,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        }
      },
    },
  });
}
