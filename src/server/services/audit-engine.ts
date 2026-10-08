import type { ChatbotConnector } from "@/server/connectors/types";
import { evaluateResponse } from "@/server/evaluators/deterministic";
import type { Evaluation, TestCase } from "@/features/audits/schemas";

export type ExecutedTest = Evaluation & { response: string; latencyMs: number };

export async function executeTest(
  connector: ChatbotConnector,
  test: TestCase,
  sessionId: string,
): Promise<ExecutedTest> {
  try {
    const reply = await connector.send({ message: test.question, sessionId });
    if (reply.error || reply.text.length > 10_000)
      return {
        verdict: "ERROR",
        response: "",
        latencyMs: Math.max(0, reply.latencyMs),
        reason: "Falha técnica do conector ou resposta acima do limite permitido.",
        evidence: "",
        recommendation:
          "Verificar a conexão e repetir o teste. Este resultado não é uma falha comportamental.",
      };
    const evaluation = evaluateResponse(test, reply.text);
    if (evaluation.evidence && !reply.text.includes(evaluation.evidence))
      return {
        ...evaluation,
        verdict: "INCONCLUSIVE",
        evidence: "",
        reason: "O avaliador não conseguiu vincular a evidência à resposta recebida.",
        response: reply.text,
        latencyMs: reply.latencyMs,
      };
    return { ...evaluation, response: reply.text, latencyMs: reply.latencyMs };
  } catch {
    return {
      verdict: "ERROR",
      response: "",
      latencyMs: 0,
      reason: "Não foi possível executar a chamada ao chatbot.",
      evidence: "",
      recommendation: "Verificar a disponibilidade do conector e repetir o teste.",
    };
  }
}
