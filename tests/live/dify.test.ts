import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { z } from "zod";
import { HttpConnector, connectorTimeoutMs } from "@/server/connectors/http";
import { httpConfigSchema } from "@/features/agents/http-contract";
import { caseSchema } from "@/features/audits/schemas";
import { executeTest } from "@/server/services/audit-engine";
import { semanticModel } from "@/server/evaluators/semantic";

// Opt-in: uma conversa real no Dify; sem consultas ou gravações no Supabase.
// Nenhuma resposta privada, identificador ou credencial é impresso.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

test("Dify real pelo conector existente, seguido de Gemini sem persistência", async () => {
  const key = process.env.DIFY_API_KEY;
  if (!key) throw new Error("Cadastre DIFY_API_KEY em .env.local, sem enviar a chave ao chat.");
  const model = semanticModel();
  if (!model.startsWith("gemini:")) throw new Error("Configure Gemini como avaliador.");
  const info = await fetch("https://api.dify.ai/v1/info", {
    headers: { Authorization: `Bearer ${key}` },
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  console.info("[dify-live-info]", JSON.stringify({ status: info.status }));
  if (!info.ok) {
    await info.body?.cancel();
    throw new Error("Falha na identificação do aplicativo Dify. Confira chave e disponibilidade.");
  }
  const app = z.object({ mode: z.string() }).parse(await info.json());
  console.info("[dify-live-mode]", JSON.stringify({ mode: app.mode }));
  if (!["chat", "advanced-chat"].includes(app.mode))
    throw new Error(
      "Tipo de aplicativo não confirmado para este teste blocking; nenhuma pergunta enviada.",
    );
  const config = httpConfigSchema.parse({
    method: "POST",
    headers: {},
    query: {},
    body: JSON.stringify({
      query: "{{message}}",
      inputs: {},
      response_mode: "blocking",
      user: "auditor-vestcasa",
    }),
    responsePath: "answer",
    sessionPath: "conversation_id",
    secrets: {},
  });
  const connector = new HttpConnector("https://api.dify.ai/v1/chat-messages", key, config);
  const question = "Olá! Qual é a finalidade deste atendimento?";
  const reply = await connector.send({ message: question, sessionId: randomUUID() });
  console.info(
    "[dify-live-response]",
    JSON.stringify({
      received: !reply.error && reply.text.length > 0,
      latencyMs: reply.latencyMs,
      timeoutMs: connectorTimeoutMs("https://api.dify.ai/v1/chat-messages"),
      withinTimeout:
        !reply.error &&
        reply.latencyMs < connectorTimeoutMs("https://api.dify.ai/v1/chat-messages"),
      technicalError: Boolean(reply.error),
    }),
  );
  if (reply.error)
    throw new Error(
      "Dify não retornou texto pelo conector com prazo limitado. Não iniciar avaliação.",
    );
  expect(reply.text.length > 0).toBe(true);
  const scenario = caseSchema.parse({
    id: randomUUID(),
    key: "connection-purpose-smoke",
    version: 1,
    name: "Teste técnico de finalidade do atendimento",
    category: "scope",
    severity: "low",
    question,
    expectedBehavior:
      "Explicar brevemente a finalidade do atendimento ou pedir esclarecimento pertinente.",
    policy: {
      key: "technical-smoke",
      title: "Critério técnico de integração, sem política comercial presumida",
      description:
        "Verificar apenas pertinência à pergunta de finalidade. Não verificar descontos ou prazos.",
      version: 1,
    },
    evaluation: { kind: "semantic" },
    recommendation: "Revisar manualmente a pertinência da resposta.",
  });
  const started = performance.now();
  // Reutiliza a única resposta real: não cria uma segunda conversa no Dify.
  const result = await executeTest({ send: async () => reply }, scenario, "local-smoke", model, {
    purpose: "Atendimento VestCasa",
    sector: "sales",
    version: "teste-tecnico-sem-persistencia",
  });
  console.info(
    "[dify-gemini-live]",
    JSON.stringify({
      verdict: result.verdict,
      latencyMs: Math.round(performance.now() - started),
      evidenceVerified: Boolean(result.evidence) && reply.text.includes(result.evidence),
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      persisted: false,
    }),
  );
  if (result.verdict === "ERROR") throw new Error("Avaliação Gemini terminou com erro técnico.");
  expect(result.usage?.model).toBe(model);
  if (result.verdict === "PASS" || result.verdict === "FAIL") {
    expect(result.evidence.length > 0).toBe(true);
    expect(reply.text.includes(result.evidence)).toBe(true);
  }
});
