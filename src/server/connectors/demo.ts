import catalog from "@/features/audits/demo-catalog.json";
import { catalogCaseSchema } from "@/features/audits/schemas";
import type { ChatbotConnector, ConnectorInput, ConnectorResponse } from "./types";

const cases = catalog.map((item) => catalogCaseSchema.parse(item));

/** Bot fictício determinístico. Não consulta serviços externos nem usa timers. */
export class DemoConnector implements ChatbotConnector {
  constructor(private readonly revision: 1 | 2) {}
  async send(input: ConnectorInput): Promise<ConnectorResponse> {
    const started = performance.now();
    const scenario = cases.find((item) => item.question === input.message);
    return {
      text: scenario
        ? scenario.responses[String(this.revision) as "1" | "2"]
        : "Não possuo uma resposta definida para essa pergunta na demonstração.",
      sessionId: input.sessionId,
      latencyMs: Math.max(0, Math.round(performance.now() - started)),
    };
  }
}
