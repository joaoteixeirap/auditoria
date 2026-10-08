import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";

const state = ".tools/e2e-state.json";
const enabled =
  process.env.E2E_WRITE_SUPABASE === "1" &&
  existsSync(state) &&
  /^[0-9a-f-]{36}$/i.test(process.env.E2E_AGENT_ID ?? "");
test.use({
  storageState: enabled ? state : { cookies: [], origins: [] },
  trace: "off",
  video: "off",
  screenshot: "off",
});

test("auditoria v1, evidência, versão corrigida e comparação persistidas no Supabase", async ({
  page,
}) => {
  test.skip(
    !enabled,
    "Requer sessão salva localmente, um agente demo próprio e autorização E2E_WRITE_SUPABASE=1.",
  );
  test.setTimeout(180_000);
  const agentId = process.env.E2E_AGENT_ID!;
  await page.goto(`/audits/new?agent=${agentId}`);
  const first = page
    .getByLabel("Versão a testar")
    .locator("option")
    .filter({ hasText: "Falhas intencionais" })
    .first();
  const firstId = await first.getAttribute("value");
  expect(firstId).toBeTruthy();
  await page.getByLabel("Versão a testar").selectOption(firstId!);
  await page.getByRole("checkbox", { name: /Confirmo que tenho autorização/ }).check();
  await page.getByRole("button", { name: /Preparar auditoria/ }).click();
  await expect(page).toHaveURL(/\/audits\/[0-9a-f-]{36}$/);
  const beforeId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.getByRole("button", { name: "Executar cenários", exact: true }).click();
  await expect(page.getByText("10 de 10 resultados persistidos", { exact: true })).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText("30%", { exact: true })).toBeVisible();
  await expect(page.getByText("BLOQUEADO", { exact: true })).toBeVisible();
  await page
    .getByRole("row")
    .filter({ hasText: "Desconto acima do limite" })
    .getByRole("link", { name: "Investigar falha" })
    .click();
  await expect(page.locator("blockquote")).toContainText("20%");
  await expect(
    page.getByText("O desconto máximo autorizado é de 10%.", { exact: true }),
  ).toBeVisible();
  await page.goto(`/agents/${agentId}`);
  const label = `e2e-corrigida-${Date.now()}`;
  await page.getByLabel("Identificação da nova versão").fill(label);
  await page.getByLabel("Comportamento do bot de demonstração").selectOption("2");
  await page.getByRole("button", { name: "Registrar versão", exact: true }).click();
  await expect(page.getByText(/Nova versão registrada/)).toBeVisible();
  await page.goto(`/audits/new?retest=${beforeId}`);
  const option = page.getByLabel("Versão a testar").locator("option").filter({ hasText: label });
  await page.getByLabel("Versão a testar").selectOption((await option.getAttribute("value"))!);
  await page.getByRole("checkbox", { name: /Confirmo que tenho autorização/ }).check();
  await page.getByRole("button", { name: /Preparar auditoria/ }).click();
  await expect(page).toHaveURL(/\/audits\/[0-9a-f-]{36}$/);
  const afterId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.getByRole("button", { name: "Executar cenários", exact: true }).click();
  await expect(page.getByText("10 de 10 resultados persistidos", { exact: true })).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.getByText("ELEGÍVEL PARA APROVAÇÃO", { exact: true })).toBeVisible();
  await page.goto(`/audits/compare?before=${beforeId}&after=${afterId}`);
  await expect(page.getByText(/Critérios compatíveis/)).toBeVisible();
  await expect(page.getByText(/7 falha\(s\) corrigida\(s\)/)).toBeVisible();
});
