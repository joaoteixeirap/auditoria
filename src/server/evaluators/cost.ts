import "server-only";
import type { SemanticUsage } from "./semantic";
export function estimateEvaluationCost(usage: SemanticUsage): number | undefined {
  // Não aplicar preços OpenAI a consumo Gemini, nem presumir gratuidade da conta.
  if (usage.model.startsWith("gemini:")) return undefined;
  if (usage.model !== process.env.OPENAI_EVALUATOR_MODEL) return undefined;
  const input = process.env.OPENAI_INPUT_USD_PER_MILLION,
    output = process.env.OPENAI_OUTPUT_USD_PER_MILLION;
  if (!input?.trim() || !output?.trim()) return undefined;
  const inputRate = Number(input),
    outputRate = Number(output);
  if (
    !Number.isFinite(inputRate) ||
    !Number.isFinite(outputRate) ||
    inputRate < 0 ||
    outputRate < 0
  )
    return undefined;
  const value = (usage.inputTokens * inputRate + usage.outputTokens * outputRate) / 1000000;
  return value <= 1000 ? Math.round(value * 1000000) / 1000000 : undefined;
}
