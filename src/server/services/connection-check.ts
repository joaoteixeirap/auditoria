import type { SupabasePublicConfig } from "@/lib/supabase/config";

export type ConnectionCheck = {
  status: "success" | "error";
  message: string;
  schemaReady: boolean;
  auditReady?: boolean;
  checkedAt: string;
};

/** Não recebe destinos do navegador; verifica exclusivamente a infraestrutura configurada. */
export async function checkSupabaseConnection(
  config: SupabasePublicConfig,
): Promise<ConnectionCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const auth = await fetch(new URL("/auth/v1/settings", config.url), {
      headers: { apikey: config.publishableKey },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!auth.ok)
      return {
        status: "error",
        message:
          "O Supabase recusou a verificação. Confira a URL, a publishable key e se o projeto está ativo.",
        schemaReady: false,
        checkedAt,
      };
    const schema = await fetch(new URL("/rest/v1/rpc/phase1_health", config.url), {
      method: "POST",
      headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    const schemaReady = schema.ok && (await schema.json()) === "phase1-v1";
    let auditReady = false;
    if (schemaReady) {
      const audits = await fetch(new URL("/rest/v1/rpc/phase2_health", config.url), {
        method: "POST",
        headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      auditReady = audits.ok && (await audits.json()) === "phase2-v1";
    }
    return {
      status: "success",
      schemaReady,
      auditReady,
      checkedAt,
      message: schemaReady
        ? `Supabase respondeu e a migration da Fase 1 está instalada. ${auditReady ? "A migration da Fase 2 também está instalada." : "A migration de auditorias da Fase 2 ainda não foi identificada."} Isso não substitui os testes de sessão e permissões.`
        : "Conexão com Supabase verificada. A migration da Fase 1 ainda não foi identificada; aplique o SQL antes do onboarding.",
    };
  } catch {
    // Erros de rede podem incluir URL e credenciais: retornar somente mensagem controlada.
    return {
      status: "error",
      message:
        "Não foi possível alcançar o Supabase no tempo permitido. Confira sua rede e se o projeto está ativo, depois tente novamente.",
      schemaReady: false,
      checkedAt,
    };
  }
}
