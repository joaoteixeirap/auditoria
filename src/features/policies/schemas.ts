import { z } from "zod";
export const policyInputSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().min(10).max(2000),
  question: z.string().trim().min(2).max(2000),
  expected: z.string().trim().min(2).max(2000),
  recommendation: z.string().trim().min(2).max(2000),
  category: z.enum(["policy", "hallucination", "privacy", "bias", "injection", "scope"]),
  severity: z.enum(["critical", "high", "medium", "low"]),
  approved: z.boolean(),
  previousKey: z.uuid().optional(),
  documentId: z.uuid().optional(),
});
