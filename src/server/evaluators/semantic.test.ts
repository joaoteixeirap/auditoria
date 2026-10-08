import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateSemantic, semanticModel } from "./semantic";
import catalog from "@/features/audits/demo-catalog.json";
import { caseSchema } from "@/features/audits/schemas";
const test = caseSchema.parse({ ...catalog[0], evaluation: { kind: "semantic" } });
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function mockReply(result: unknown, status = "completed") {
  vi.stubEnv("AI_EVALUATOR_PROVIDER", "openai");
  const fetcher = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          status,
          output: [
            { type: "message", content: [{ type: "output_text", text: JSON.stringify(result) }] },
          ],
          usage: { input_tokens: 100, output_tokens: 30 },
        }),
        { status: 200 },
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  vi.stubEnv("OPENAI_API_KEY", "fake-test-key");
  return fetcher;
}
describe("avaliação semântica estruturada", () => {
  it("mantém modelo explícito e não exige chave nos testes", () => {
    vi.stubEnv("AI_EVALUATOR_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(() => semanticModel()).toThrow();
  });
  it("valida saída e preserva consumo retornado pelo provedor", async () => {
    const fetcher = mockReply({
      verdict: "FAIL",
      reason: "Desconto acima do limite",
      evidence: "20%",
      recommendation: "Corrigir desconto",
    });
    const value = await evaluateSemantic(test, "Oferecemos 20%.", "modelo-teste", {
      purpose: "Atendimento comercial",
      sector: "sales",
      version: "v1",
    });
    expect(value.evaluation.verdict).toBe("FAIL");
    expect(value.usage).toEqual({ model: "modelo-teste", inputTokens: 100, outputTokens: 30 });
    const args = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(args[1].body));
    expect(body.store).toBe(false);
    expect(body.text.format.strict).toBe(true);
    expect(body.model).toBe("modelo-teste");
    expect(JSON.parse(body.input)).toMatchObject({
      question: test.question,
      response: "Oferecemos 20%.",
      policy: test.policy.description,
      expected: test.expectedBehavior,
      severity: test.severity,
      context: { purpose: "Atendimento comercial", sector: "sales", version: "v1" },
    });
  });
  it("evidência inventada vira inconclusivo", async () => {
    mockReply({
      verdict: "PASS",
      reason: "Regra respeitada",
      evidence: "10%",
      recommendation: "Manter regra",
    });
    expect(
      (await evaluateSemantic(test, "Oferecemos 20%.", "modelo-teste")).evaluation.verdict,
    ).toBe("INCONCLUSIVE");
  });
  it("saída inválida, incompleta e erros de rede são ERROR", async () => {
    mockReply({ verdict: "PASS" });
    expect((await evaluateSemantic(test, "Resposta", "modelo-teste")).evaluation.verdict).toBe(
      "ERROR",
    );
    mockReply({}, "incomplete");
    expect((await evaluateSemantic(test, "Resposta", "modelo-teste")).evaluation.verdict).toBe(
      "ERROR",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("segredo privado");
      }),
    );
    const reply = await evaluateSemantic(test, "Resposta", "modelo-teste");
    expect(reply.evaluation.verdict).toBe("ERROR");
    expect(reply.evaluation.reason).not.toContain("segredo");
  });
});

describe("avaliador Gemini", () => {
  function geminiReply(result: unknown, finishReason = "STOP", status = 200) {
    vi.stubEnv("AI_EVALUATOR_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "fake-gemini-key");
    vi.stubEnv("GEMINI_EVALUATOR_MODEL", "gemini-3.1-flash-lite");
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify(result) }] } }],
            usageMetadata: {
              promptTokenCount: 90,
              candidatesTokenCount: 20,
              thoughtsTokenCount: 5,
            },
          }),
          { status },
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    return fetcher;
  }
  const valid = {
    verdict: "FAIL",
    reason: "Acima do limite",
    evidence: "20%",
    recommendation: "Limitar desconto",
  };
  it("preserva provedor/modelo no snapshot e envia chave somente no header", async () => {
    const fetcher = geminiReply(valid);
    const model = semanticModel();
    expect(model).toBe("gemini:gemini-3.1-flash-lite");
    const value = await evaluateSemantic(test, "Ofereço 20%.", model);
    expect(value.evaluation.verdict).toBe("FAIL");
    expect(value.usage).toEqual({ model, inputTokens: 90, outputTokens: 25 });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
    );
    expect(url).not.toContain("fake-gemini-key");
    expect(init.headers).toMatchObject({ "x-goog-api-key": "fake-gemini-key" });
    expect(String(init.body)).not.toContain("fake-gemini-key");
    expect(JSON.parse(String(init.body)).generationConfig.responseMimeType).toBe(
      "application/json",
    );
  });
  it("trata evidência inventada, bloqueio, truncamento e quota sem expor resposta privada", async () => {
    geminiReply({ ...valid, evidence: "inventada" });
    expect((await evaluateSemantic(test, "20%", semanticModel())).evaluation.verdict).toBe(
      "INCONCLUSIVE",
    );
    for (const [finish, status] of [
      ["MAX_TOKENS", 200],
      ["SAFETY", 200],
      ["STOP", 429],
    ] as const) {
      geminiReply(valid, finish, status);
      const result = await evaluateSemantic(test, "20%", semanticModel());
      expect(result.evaluation.verdict).toBe("ERROR");
      expect(JSON.stringify(result)).not.toContain("fake-gemini-key");
    }
  });
  it("recusa provedor inválido e chave ausente, sem fallback para outro provedor", () => {
    vi.stubEnv("AI_EVALUATOR_PROVIDER", "desconhecido");
    expect(() => semanticModel()).toThrow();
    vi.stubEnv("AI_EVALUATOR_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(() => semanticModel()).toThrow();
  });
  it("timeout é erro técnico com diagnóstico seguro, nunca reprovação", async () => {
    geminiReply(valid);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("Timeout", "TimeoutError");
      }),
    );
    const result = await evaluateSemantic(test, "20%", semanticModel());
    expect(result.evaluation.verdict).toBe("ERROR");
    expect(result.evaluation.reason).toContain("excedeu o prazo");
    expect(JSON.stringify(result)).not.toContain("fake-gemini-key");
  });
});
