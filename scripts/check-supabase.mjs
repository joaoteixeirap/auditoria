import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key?.startsWith("sb_publishable_") || !URL.canParse(url)) {
  console.log("Configuração pública ausente ou inválida. Nenhuma credencial exibida.");
  process.exit(1);
}
try {
  const auth = await fetch(new URL("/auth/v1/settings", url), {
    headers: { apikey: key },
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  console.log(`Supabase Auth: HTTP ${auth.status}`);
  if (!auth.ok) process.exit(1);
  const schema = await fetch(new URL("/rest/v1/rpc/phase1_health", url), {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: "{}",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  const ready = schema.ok && (await schema.json()) === "phase1-v1";
  console.log(
    ready
      ? "Migration Fase 1: instalada."
      : `Migration Fase 1: não identificada (HTTP ${schema.status}).`,
  );
  const audits = await fetch(new URL("/rest/v1/rpc/phase2_health", url), {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: "{}",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  const auditsReady = audits.ok && (await audits.json()) === "phase2-v1";
  console.log(
    auditsReady
      ? "Migration Fase 2: instalada."
      : `Migration Fase 2: não identificada (HTTP ${audits.status}).`,
  );
  for (const [rpc, marker, label] of [
    ["phase3_health", "phase3-http-v1", "Conector HTTP"],
    ["phase4_health", "workflow-v1", "CSV, políticas, revisão e relatórios"],
    ["phase6_health", "usage-v1", "Métricas e consumo de IA"],
    ["b2b_health", "b2b-v1", "Modelo empresarial e conexão genérica"],
    ["memberships_health", "memberships-v1", "Convites e equipe"],
  ]) {
    const response = await fetch(new URL(`/rest/v1/rpc/${rpc}`, url), {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: "{}",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    const installed = response.ok && (await response.json()) === marker;
    console.log(
      installed ? `${label}: instalado.` : `${label}: não identificado (HTTP ${response.status}).`,
    );
  }
} catch {
  console.log("Falha de rede ou timeout. Nenhuma URL ou chave exibida.");
  process.exit(1);
}
