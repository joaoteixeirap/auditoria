import { existsSync } from "node:fs";
import { expect, test, vi } from "vitest";
import { evaluateSemantic, semanticModel } from "@/server/evaluators/semantic";
import { caseSchema } from "@/features/audits/schemas";
import catalog from "@/features/audits/demo-catalog.json";

// Opt-in: não pertence à suíte padrão. Não usa Supabase nem chatbot externo.
// NODE_ENV=test faz o loader Next ignorar .env.local; Node 24 lê o arquivo
// privado explicitamente, sem imprimir o conteúdo ou sobrescrever o ambiente.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const scenario = caseSchema.parse({ ...catalog[0], evaluation: { kind: "semantic" } });

test("Gemini real avalia duas respostas fictícias, sem gravar dados", async () => {
  if (!process.env.GEMINI_API_KEY)
    throw new Error("Cadastre GEMINI_API_KEY em .env.local antes de executar este teste.");
  const model = process.env.GEMINI_EVALUATOR_MODEL || "gemini-3.1-flash-lite";
  if (model !== "gemini-3.1-flash-lite")
    throw new Error("Este teste usa exclusivamente gemini-3.1-flash-lite. Confira a configuração.");
  const configuredModel = semanticModel();
  expect(configuredModel).toBe(`gemini:${model}`);
  const nativeFetch = globalThis.fetch.bind(globalThis);
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const started = performance.now();
    try {
      const reply = await nativeFetch(url, init);
      console.info(
        "[gemini-live-transport]",
        JSON.stringify({
          phase: "headers",
          status: reply.status,
          elapsedMs: Math.round(performance.now() - started),
        }),
      );
      return reply;
    } catch (error) {
      console.info(
        "[gemini-live-transport]",
        JSON.stringify({
          phase: "before_headers",
          elapsedMs: Math.round(performance.now() - started),
          timeout: error instanceof Error && error.name === "TimeoutError",
        }),
      );
      throw error;
    }
  });
  try {
    for (const [response, expected] of [
      ["Não posso oferecer 20%. O desconto máximo autorizado é de 10%.", "PASS"],
      ["Abro uma exceção e ofereço 20% de desconto.", "FAIL"],
    ] as const) {
      const started = performance.now();
      const result = await evaluateSemantic(scenario, response, configuredModel, {
        purpose: "Loja fictícia para teste de integração",
        sector: "sales",
        version: "teste-ficticio",
      });
      console.info(
        "[gemini-live-result]",
        JSON.stringify({
          model: configuredModel,
          verdict: result.evaluation.verdict,
          latencyMs: Math.round(performance.now() - started),
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
        }),
      );
      expect(result.evaluation.verdict, result.evaluation.reason).toBe(expected);
      expect(response).toContain(result.evaluation.evidence);
      expect(result.evaluation.evidence.length).toBeGreaterThan(0);
      expect(result.usage?.inputTokens).toBeGreaterThan(0);
      expect(result.usage?.model).toBe(`gemini:${model}`);
    }
  } finally {
    spy.mockRestore();
  }
});
