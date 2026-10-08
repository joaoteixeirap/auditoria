import { z } from "zod";

export const verdictSchema = z.enum(["PASS", "FAIL", "INCONCLUSIVE", "ERROR"]);
export const auditStatusSchema = z.enum(["pending", "running", "completed", "failed", "cancelled"]);
export const severitySchema = z.enum(["critical", "high", "medium", "low"]);
const evaluationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("semantic") }),
  z.object({ kind: z.literal("discount"), value: z.number().min(0).max(100) }),
  z.object({ kind: z.literal("refund"), value: z.number().positive() }),
  z.object({ kind: z.literal("warranty"), value: z.number().positive() }),
  z.object({ kind: z.literal("price"), value: z.number().nonnegative() }),
  z.object({ kind: z.literal("cpf") }),
  z.object({
    kind: z.literal("phrases"),
    forbidden: z.array(z.string().min(1)).max(10),
    required: z.array(z.string().min(1)).min(1).max(10),
  }),
]);
export const caseSchema = z.object({
  id: z.uuid(),
  key: z.string().min(1).max(80),
  version: z.number().int().positive(),
  name: z.string().min(1).max(150),
  category: z.enum(["policy", "hallucination", "privacy", "bias", "injection", "scope"]),
  severity: severitySchema,
  question: z.string().min(1).max(2000),
  expectedBehavior: z.string().min(1).max(2000),
  policy: z.object({
    key: z.string(),
    title: z.string(),
    description: z.string(),
    version: z.number().int().positive(),
  }),
  evaluation: evaluationSchema,
  recommendation: z.string().min(1).max(2000),
});
export const catalogCaseSchema = caseSchema.extend({
  responses: z.object({ "1": z.string().min(1), "2": z.string().min(1) }),
});
export const criteriaSchema = z.object({
  catalogVersion: z.literal(1),
  evaluator: z.discriminatedUnion("name", [
    z.object({ name: z.literal("deterministic"), version: z.literal("1.0.0") }),
    z.object({
      name: z.literal("semantic"),
      version: z.literal("1.0.0"),
      model: z.string().min(1).max(100),
    }),
  ]),
  cases: z.array(caseSchema).min(1).max(10),
});
export const createAuditSchema = z.object({
  agentId: z.uuid(),
  versionId: z.uuid(),
  caseIds: z
    .array(z.uuid())
    .min(1, "Selecione pelo menos um cenário.")
    .max(10)
    .refine((ids) => new Set(ids).size === ids.length, "Cenários duplicados."),
  requestKey: z.uuid(),
  authorized: z.literal(true, "Confirme a autorização para executar a auditoria."),
  aiAuthorized: z.boolean().optional(),
  previousRun: z.uuid().optional(),
});
export type TestCase = z.infer<typeof caseSchema>;
export type Verdict = z.infer<typeof verdictSchema>;
export type AuditStatus = z.infer<typeof auditStatusSchema>;
export type Severity = z.infer<typeof severitySchema>;
export type CriteriaSnapshot = z.infer<typeof criteriaSchema>;
export type Evaluation = {
  verdict: Verdict;
  reason: string;
  evidence: string;
  recommendation: string;
};
