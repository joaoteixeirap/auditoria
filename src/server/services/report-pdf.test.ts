import { expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generatePdf } from "./report-pdf";
import { caseSchema } from "@/features/audits/schemas";
import catalog from "@/features/audits/demo-catalog.json";
it("gera PDF paginado com português e respostas longas sem alterar o snapshot", async () => {
  const test = caseSchema.parse(catalog[0]),
    id = crypto.randomUUID();
  const value = {
    generatedAt: "2026-10-08",
    organization: "Organização de teste",
    auditId: id,
    source: "csv",
    status: "completed",
    criteria: {
      catalogVersion: 1,
      evaluator: { name: "deterministic", version: "1.0.0" },
      cases: [test],
    },
    conditions: {
      agent: { id, name: "Assistente", environment: "demo" },
      client: { id, name: "Empresa" },
      version: { id, label: "v1", demo_revision: 1 },
      connector: { type: "csv", responses: { [test.id]: "resposta" } },
    },
    executions: [
      {
        test_case_id: test.id,
        verdict: "FAIL",
        response: "Resposta 😃 " + "evidência ".repeat(1000),
        reason: "Regra violada",
        evidence: "evidência",
        recommendation: "Corrigir",
      },
    ],
    reviews: [],
    decisions: [],
  };
  const original = JSON.stringify(value),
    bytes = await generatePdf(value);
  expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe("%PDF-");
  expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
  expect(JSON.stringify(value)).toBe(original);
});
