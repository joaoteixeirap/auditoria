import { describe, expect, it } from "vitest";
import catalog from "./demo-catalog.json";
import { catalogCaseSchema } from "./schemas";
import { evaluateResponse } from "@/server/evaluators/deterministic";
import { executeTest } from "@/server/services/audit-engine";
import { summarizeResults } from "./metrics";
import { compareResults, sameEvaluationSettings } from "./comparison";

const cases = catalog.map((item) => catalogCaseSchema.parse(item));
describe("critérios e métricas defensáveis", () => {
  it("o catálogo contém dez cenários cobrindo cinco categorias", () => {
    expect(cases).toHaveLength(10);
    expect(new Set(cases.map((test) => test.category)).size).toBe(5);
  });
  it("resposta desconhecida não é aprovada pela ausência de erro", () =>
    expect(evaluateResponse(cases[0]!, "Talvez, vamos conversar.").verdict).toBe("INCONCLUSIVE"));
  it("negação de uma concessão não é classificada como violação numérica", () =>
    expect(evaluateResponse(cases[0]!, "Não posso oferecer 20% de desconto.").verdict).toBe(
      "INCONCLUSIVE",
    ));
  it("falha técnica do conector retorna ERROR sem mensagem interna", async () => {
    const result = await executeTest(
      {
        send: async () => {
          throw new Error("token privado");
        },
      },
      cases[0]!,
      "session",
    );
    expect(result.verdict).toBe("ERROR");
    expect(result.reason).not.toContain("token privado");
  });
  it("taxa usa somente PASS + FAIL e pode ficar indefinida", () => {
    const summary = summarizeResults(
      [
        { verdict: "PASS", severity: "high" },
        { verdict: "ERROR", severity: "critical" },
        { verdict: "INCONCLUSIVE", severity: "critical" },
      ],
      "completed",
    );
    expect(summary.approvalRate).toBe(100);
    expect(summary.release).toBe("REVIEW");
    expect(summary.severities.critical).toBe(0);
    expect(summarizeResults([], "pending").approvalRate).toBeNull();
  });
  it("mudança de critério impede declarar uma correção compatível", () => {
    const previous = { test: cases[0]!, verdict: "FAIL" as const };
    const next = {
      test: { ...cases[0]!, evaluation: { kind: "discount" as const, value: 30 } },
      verdict: "PASS" as const,
    };
    expect(compareResults([previous], [next])[0]!.classification).toBe("criteria_changed");
  });
  it("detecta regressão, falha nova e teste não repetido", () => {
    const result = compareResults(
      [
        { test: cases[0]!, verdict: "PASS" },
        { test: cases[1]!, verdict: "FAIL" },
      ],
      [
        { test: cases[0]!, verdict: "FAIL" },
        { test: cases[2]!, verdict: "FAIL" },
      ],
    );
    expect(result.map((item) => item.classification)).toEqual([
      "regression",
      "not_retested",
      "new_failure",
    ]);
  });
  it("comparação semântica exige o mesmo avaliador, contexto e origem", () => {
    const before = {
      evaluator: { name: "semantic" as const, version: "1.0.0" as const, model: "modelo-a" },
      source: "http",
      purpose: "Atendimento comercial",
      sector: "sales",
    };
    expect(sameEvaluationSettings(before, { ...before })).toBe(true);
    expect(
      sameEvaluationSettings(before, {
        ...before,
        evaluator: { ...before.evaluator, model: "modelo-b" },
      }),
    ).toBe(false);
    expect(sameEvaluationSettings(before, { ...before, source: "demo" })).toBe(false);
    expect(sameEvaluationSettings(before, { ...before, purpose: "Outro escopo" })).toBe(false);
  });
  it("toda evidência automática corresponde à resposta avaliada", () => {
    for (const test of cases)
      for (const text of Object.values(test.responses)) {
        const result = evaluateResponse(test, text);
        expect(["PASS", "FAIL"]).toContain(result.verdict);
        expect(text.includes(result.evidence)).toBe(true);
        expect(result.evidence.length).toBeGreaterThan(0);
      }
  });
});
