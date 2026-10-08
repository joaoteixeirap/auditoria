"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "./config";
import type { Database } from "@/types/database";

export function createClient() {
  const { url, publishableKey } = requireSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
