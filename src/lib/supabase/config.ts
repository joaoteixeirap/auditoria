import { z } from "zod";

const publicConfigSchema = z.object({
  url: z.url().refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return (
      (url.protocol === "https:" ||
        (process.env.NODE_ENV !== "production" &&
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname))) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/"
    );
  }, "Use a URL HTTPS do projeto (localhost HTTP somente em desenvolvimento)."),
  publishableKey: z
    .string()
    .regex(
      /^sb_publishable_[A-Za-z0-9_-]{16,}$/,
      "Use uma publishable key, nunca uma chave secret ou service_role.",
    ),
});

export type SupabasePublicConfig = z.infer<typeof publicConfigSchema>;
export type ConfigurationStatus = "missing" | "invalid" | "configured";

export function validateSupabaseConfig(url: string | undefined, key: string | undefined) {
  return publicConfigSchema.safeParse({ url, publishableKey: key });
}

// Referências explícitas permitem ao Next.js substituir as variáveis públicas no browser.
export function getSupabaseConfigurationStatus(): ConfigurationStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return "missing";
  return validateSupabaseConfig(url, key).success ? "configured" : "invalid";
}

export function requireSupabaseConfig(): SupabasePublicConfig {
  const result = validateSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  if (!result.success) {
    throw new Error("Configure a URL e a publishable key do Supabase em .env.local.");
  }
  return result.data;
}
