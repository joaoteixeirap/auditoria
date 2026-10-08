// Somente leitura remota. Logins manuais; nenhuma senha/token é impresso.
import { chromium } from "playwright";
import { createServerClient } from "@supabase/ssr";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const origin = "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url?.startsWith("https://") || !key?.startsWith("sb_publishable_"))
  throw new Error("Configuração pública Supabase inválida.");
const capture = process.argv.includes("--capture");
const results = [];
function record(test, outcome, status) {
  const result = { test, outcome, ...(status === undefined ? {} : { status }) };
  results.push(result);
  console.log(JSON.stringify(result));
}
const browser = await chromium.launch({ headless: !capture, channel: "msedge" });
const users = [];
try {
  await mkdir(".tools", { recursive: true });
  for (const label of ["A", "B"]) {
    const path = `.tools/isolation-${label.toLowerCase()}.json`;
    if (!capture && !existsSync(path))
      throw new Error(
        "Sessões ausentes: executar com --capture e entrar manualmente nas duas contas existentes.",
      );
    const captureSession = capture && !existsSync(path);
    const context = await browser.newContext(captureSession ? {} : { storageState: path });
    context.setDefaultTimeout(15000);
    if (captureSession) {
      const page = await context.newPage();
      console.log(
        `LOGIN MANUAL ${label}: entre na conta existente e selecione sua organização. Não crie conta, organização ou dados durante esta captura.`,
      );
      await page.goto(`${origin}/login`);
      await page.waitForURL(
        (address) =>
          ["/dashboard", "/agents", "/audits", "/organizations"].includes(address.pathname),
        { timeout: 300000 },
      );
      await context.storageState({ path });
      await page.close();
      console.log(`Sessão ${label} capturada localmente; arquivo ignorado pelo Git.`);
    }
    const state = JSON.parse(await readFile(path, "utf8"));
    let cookies = state.cookies;
    const db = createServerClient(url, key, {
      cookies: {
        getAll: () => cookies.map(({ name, value }) => ({ name, value })),
        setAll: (updates) => {
          for (const update of updates)
            cookies = [...cookies.filter((cookie) => cookie.name !== update.name), update];
        },
      },
    });
    const identity = await db.auth.getUser();
    if (identity.error || !identity.data.user)
      throw new Error(`Sessão ${label} inválida ou expirada.`);
    const memberships = await db
      .from("organization_members")
      .select("organization_id,role")
      .eq("user_id", identity.data.user.id);
    const org =
      cookies.find((cookie) => cookie.name === "auditor_organization")?.value ??
      (memberships.data?.length === 1 ? memberships.data[0].organization_id : undefined);
    if (!/^[0-9a-f-]{36}$/i.test(org ?? ""))
      throw new Error(`Selecione uma organização na sessão ${label}.`);
    if (
      memberships.error ||
      !memberships.data.some((membership) => membership.organization_id === org)
    )
      throw new Error(`Sessão ${label} não pertence à organização selecionada.`);
    await context.addCookies([
      { name: "auditor_organization", value: org, url: origin, httpOnly: true, sameSite: "Lax" },
    ]);
    await context.storageState({ path });
    users.push({
      label,
      context,
      db,
      org,
      userId: identity.data.user.id,
      memberships: memberships.data,
      resources: new Map(),
    });
  }
  const [a, b] = users;
  if (
    a.userId === b.userId ||
    a.org === b.org ||
    a.memberships.some((row) => row.organization_id === b.org) ||
    b.memberships.some((row) => row.organization_id === a.org)
  )
    throw new Error(
      "Use usuários distintos sem vínculo com a organização oposta; do contrário o acesso pode ser legítimo.",
    );
  record("Duas identidades e organizações distintas, sem vínculo cruzado", "PASS");
  const areas = [
    { table: "agents", label: "Chatbots", route: "/agents/" },
    { table: "custom_scenarios", label: "Políticas privadas" },
    {
      table: "policy_documents",
      label: "Documentos",
      route: "/policies/documents/",
      bucket: "policy-documents",
    },
    { table: "audit_runs", label: "Auditorias", route: "/audits/" },
    { table: "audit_reports", label: "Relatórios", route: "/reports/", bucket: "audit-reports" },
  ];
  for (const owner of users) {
    for (const area of areas) {
      const own = await owner.db
        .from(area.table)
        .select(`id,organization_id${area.bucket ? ",storage_path" : ""}`)
        .eq("organization_id", owner.org)
        .limit(1);
      if (own.error) {
        record(`${owner.label} controle positivo ${area.label}`, "FAIL");
        continue;
      }
      if (!own.data.length) {
        record(`${owner.label} controle positivo ${area.label}`, "PENDING_NO_EXISTING_DATA");
        continue;
      }
      const target = own.data[0];
      if (area.route) {
        const positive = await owner.context.request.get(`${origin}${area.route}${target.id}`, {
          maxRedirects: 0,
        });
        target.routeAvailable = area.bucket ? positive.status() === 303 : positive.status() === 200;
        if (area.bucket && positive.status() === 303)
          target.signedUrl = positive.headers().location;
        record(
          `${owner.label} controle positivo URL ${area.label}`,
          target.routeAvailable ? "PASS" : "PENDING_ROUTE_UNAVAILABLE",
          positive.status(),
        );
      }
      owner.resources.set(area.table, target);
      record(`${owner.label} controle positivo ${area.label}`, "PASS");
    }
  }
  for (const [reader, owner] of [
    [a, b],
    [b, a],
  ]) {
    for (const area of areas) {
      const target = owner.resources.get(area.table);
      if (!target) {
        record(`${reader.label} -> ${owner.label} ${area.label}`, "PENDING_NO_EXISTING_DATA");
        continue;
      }
      // Sem filtro de organização: testa o ID diretamente contra a RLS real.
      const direct = await reader.db.from(area.table).select("id").eq("id", target.id);
      record(
        `${reader.label} -> ${owner.label} ID direto ${area.label}`,
        !direct.error && direct.data.length === 0 ? "PASS" : "FAIL",
      );
      if (area.route && target.routeAvailable) {
        const reply = await reader.context.request.get(`${origin}${area.route}${target.id}`, {
          maxRedirects: 0,
        });
        const status = reply.status();
        const body = await reply.text();
        const denied = status === 404 || (status === 200 && /<h1[^>]*>404<\/h1>/.test(body));
        record(
          `${reader.label} -> ${owner.label} URL aplicação ${area.label}`,
          denied ? "PASS" : "FAIL",
          status,
        );
      } else if (area.route) {
        record(
          `${reader.label} -> ${owner.label} URL aplicação ${area.label}`,
          "PENDING_ROUTE_UNAVAILABLE",
        );
      }
      if (area.bucket) {
        const positive = await owner.db.storage.from(area.bucket).download(target.storage_path);
        if (positive.error) {
          record(
            `${owner.label} controle positivo arquivo ${area.label}`,
            "PENDING_STORAGE_UNAVAILABLE",
          );
          continue;
        }
        record(`${owner.label} controle positivo arquivo ${area.label}`, "PASS");
        const download = await reader.db.storage.from(area.bucket).download(target.storage_path);
        record(
          `${reader.label} -> ${owner.label} Storage autenticado ${area.label}`,
          download.error && !download.data ? "PASS" : "FAIL",
        );
        const publicUrl = owner.db.storage.from(area.bucket).getPublicUrl(target.storage_path)
          .data.publicUrl;
        const reply = await fetch(publicUrl, {
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        });
        record(
          `URL pública sem sessão ${area.label} ${owner.label}`,
          [400, 401, 403, 404].includes(reply.status) ? "PASS" : "FAIL",
          reply.status,
        );
        await reply.body?.cancel();
        if (target.signedUrl) {
          const shared = await reader.context.request.get(target.signedUrl, { maxRedirects: 0 });
          record(
            `${reader.label} -> ${owner.label} URL assinada válida compartilhada ${area.label}`,
            shared.status() === 200 ? "SIGNED_URL_BEARER_ACCESS" : "SIGNED_URL_NOT_ACCESSIBLE",
            shared.status(),
          );
        }
      }
    }
    const members = await reader.db.rpc("company_members", { org_id: owner.org });
    record(
      `${reader.label} -> ${owner.label} RPC equipe`,
      members.error?.code === "42501" ? "PASS" : "FAIL",
    );
  }
  for (const user of users) {
    const own = await user.db
      .from("audit_runs")
      .select("id")
      .eq("organization_id", user.org)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1);
    const membership = user.memberships.find((row) => row.organization_id === user.org);
    if (own.error || !own.data.length || membership.role !== "owner") {
      record(`${user.label} decisão humana na UI`, "PENDING_NO_COMPLETED_OWNER_AUDIT");
      continue;
    }
    const page = await user.context.newPage();
    await page.goto(`${origin}/audits/${own.data[0].id}`);
    const visible = await page
      .getByLabel("Decisão humana de liberação", { exact: true })
      .isVisible();
    record(`${user.label} decisão humana na UI`, visible ? "PASS" : "FAIL");
    await page.close();
  }
} catch {
  record(
    "Execução incompleta: sessões, recursos ou transporte precisam de conferência local",
    "BLOCKED",
  );
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(
    ".tools/isolation-results.json",
    JSON.stringify({ date: "2026-10-08", results }, null, 2),
  );
  if (results.some((result) => result.outcome === "FAIL")) process.exitCode = 1;
}
