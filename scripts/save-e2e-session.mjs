// Executado manualmente pelo usuário; credenciais são digitadas no navegador.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { createInterface } from "node:readline/promises";

const browser = await chromium.launch({
  headless: false,
  ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
});
const terminal = createInterface({ input: process.stdin, output: process.stdout });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://localhost:3000/login");
  await terminal.question(
    "Entre com sua conta no navegador e acesse sua organização. Depois pressione Enter aqui. Nenhuma senha será solicitada no terminal. ",
  );
  if (
    !["/dashboard", "/agents", "/clients", "/audits", "/organizations"].some((path) =>
      new URL(page.url()).pathname.startsWith(path),
    )
  )
    throw new Error("Acesse uma organização antes de salvar a sessão.");
  await mkdir(".tools", { recursive: true });
  await context.storageState({ path: ".tools/e2e-state.json" });
  console.log(
    "Sessão salva em .tools/e2e-state.json, ignorado pelo Git. Não compartilhe esse arquivo.",
  );
} finally {
  terminal.close();
  await browser.close();
}
