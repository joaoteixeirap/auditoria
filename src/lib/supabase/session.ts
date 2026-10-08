import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseConfig } from "./config";
import type { Database } from "@/types/database";

/** Renova sessão; autorização de organização é feita também em cada operação. */
export async function refreshSession(request: NextRequest) {
  const { url, publishableKey } = requireSupabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values) {
          response.cookies.set(name, value, {
            ...options,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        }
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return { response, claims: error ? null : (data?.claims ?? null), error };
}
