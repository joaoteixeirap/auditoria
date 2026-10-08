import { expect, test } from "@playwright/test";

test("rotas privadas redirecionam usuário sem sessão", async ({ page }) => {
  for (const route of [
    "/dashboard",
    "/clients",
    "/clients/new",
    "/agents",
    "/agents/new",
    "/agents/11111111-1111-4111-8111-111111111111",
    "/audits",
    "/audits/new",
    "/audits/11111111-1111-4111-8111-111111111111",
    "/audits/compare",
    "/audits/import",
    "/policies",
    "/policies/documents/11111111-1111-4111-8111-111111111111",
    "/reports",
    "/reports/11111111-1111-4111-8111-111111111111",
    "/usage",
    "/organizations",
    "/onboarding",
    "/reset-password",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
  }
});

test("cadastro valida campos antes de enviar ao Supabase", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Seu nome").fill("Pessoa de teste");
  await page.getByLabel("E-mail", { exact: true }).fill("email-invalido");
  await page.getByLabel("Senha", { exact: true }).fill("curta");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByText("Informe um e-mail válido.", { exact: true })).toBeVisible();
  await expect(page.getByText("Use pelo menos 12 caracteres.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveAttribute("aria-invalid", "true");
});

test("recuperação exige e-mail válido", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(page.getByText("Informe um e-mail válido.", { exact: true })).toBeVisible();
});

test("configuração permite verificar o Supabase real sem gravar dados", async ({ page }) => {
  test.skip(
    process.env.E2E_LIVE_SUPABASE !== "1",
    "Requer projeto configurado e acesso à rede; habilitar explicitamente.",
  );
  await page.goto("/settings");
  await expect(page.getByText("Conexão não verificada", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Testar conexão real" }).click();
  await expect(page.getByText("Conexão verificada", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/migration da Fase 1 está instalada/)).toBeVisible();
  await expect(page.getByText("Conexão não verificada", { exact: true })).toHaveCount(0);
});

test("configuração mantém navegação utilizável em tela pequena", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  await page.getByText("Navegação", { exact: true }).click();
  await expect(page.getByRole("link", { name: "Empresa e equipe", exact: true })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
