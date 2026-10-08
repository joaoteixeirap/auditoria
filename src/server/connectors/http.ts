import "server-only";
import { request } from "node:https";
import { z } from "zod";
import { resolveHttpEndpoint } from "./http-security";
import type { ChatbotConnector, ConnectorInput, ConnectorResponse } from "./types";
import {
  defaultHttpConfig,
  httpConfigSchema,
  renderRequest,
  extractPath,
  type HttpConfig,
} from "@/features/agents/http-contract";

const replySchema = z.object({
  text: z.string().min(1).max(10_000),
  sessionId: z.string().max(200).optional(),
});
const inputSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().max(200).optional(),
});
const MAX_BYTES = 64 * 1024;

export function connectorTimeoutMs(endpoint: string): number {
  const url = new URL(endpoint);
  return url.origin === "https://api.dify.ai" && url.pathname === "/v1/chat-messages"
    ? 30_000
    : 10_000;
}

export class HttpConnector implements ChatbotConnector {
  constructor(
    private readonly endpoint: string,
    private readonly token = "",
    private readonly config?: HttpConfig,
  ) {}

  async send(input: ConnectorInput): Promise<ConnectorResponse> {
    const start = performance.now();
    let signal: AbortSignal | undefined;
    let status: number | undefined;
    let phase = "validation";
    let timeoutMs = 10_000;
    try {
      const value = inputSchema.parse(input);
      const config = httpConfigSchema.parse(this.config ?? defaultHttpConfig);
      const rendered = renderRequest(config, value.message, value.sessionId);
      const payload = this.config ? rendered.payload : JSON.stringify(value);
      if (Buffer.byteLength(payload) > MAX_BYTES) throw new Error("Corpo acima do limite.");
      if (this.token.length > 4000 || /[\r\n]/.test(this.token))
        throw new Error("Credencial inválida.");
      timeoutMs = connectorTimeoutMs(this.endpoint);
      signal = AbortSignal.timeout(timeoutMs);
      phase = "endpoint";
      const { url, address } = await resolveHttpEndpoint(this.endpoint, signal);
      for (const [key, value] of Object.entries(rendered.query))
        url.searchParams.append(key, value);
      if (url.href.length > 16000) throw new Error("URL acima do limite.");
      phase = "transport";
      const body = await new Promise<string>((resolve, reject) => {
        // IP validado fixado no socket; hostname original preserva Host e validação TLS.
        const req = request(
          url,
          {
            method: config.method,
            agent: false,
            family: 4,
            signal,
            lookup: (_hostname, _options, callback) => callback(null, address, 4),
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "Content-Length": Buffer.byteLength(payload),
              ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
              ...rendered.headers,
            },
          },
          (res) => {
            status = res.statusCode;
            phase = "http_status";
            if (
              !res.statusCode ||
              res.statusCode < 200 ||
              res.statusCode >= 300 ||
              !/^application\/json(?:\s*;|$)/i.test(res.headers["content-type"] ?? "") ||
              (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity")
            ) {
              res.destroy();
              reject(new Error("Resposta HTTP inválida."));
              return;
            }
            const chunks: Buffer[] = [];
            phase = "body";
            let size = 0;
            res.on("data", (chunk: Buffer) => {
              size += chunk.length;
              if (size > MAX_BYTES) {
                res.destroy();
                reject(new Error("Resposta acima do limite."));
              } else chunks.push(chunk);
            });
            res.on("error", reject);
            res.on("aborted", () => reject(new Error("Resposta interrompida.")));
            res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
          },
        );
        req.on("error", reject);
        req.end(payload);
      });
      phase = "json";
      const parsed: unknown = JSON.parse(body);
      phase = "extraction";
      const reply = this.config
        ? replySchema.parse({
            text: extractPath(parsed, config.responsePath),
            ...(config.sessionPath ? { sessionId: extractPath(parsed, config.sessionPath) } : {}),
          })
        : replySchema.parse(parsed);
      const sensitive = [
        this.token,
        ...Object.values(config.secrets),
        ...Object.entries(rendered.headers)
          .filter(([name]) => /authorization|key|token|secret/i.test(name))
          .map(([, value]) => value),
      ].filter(Boolean);
      phase = "credential_reflection";
      if (sensitive.some((secret) => body.includes(secret) || reply.text.includes(secret)))
        throw new Error("Credencial na resposta.");
      console.info(
        "[http-connector]",
        JSON.stringify({
          outcome: "received",
          status,
          timeoutMs,
          elapsedMs: Math.round(performance.now() - start),
        }),
      );
      return { ...reply, latencyMs: Math.round(performance.now() - start) };
    } catch {
      const timedOut = signal?.aborted === true;
      console.info(
        "[http-connector]",
        JSON.stringify({
          outcome: timedOut ? "timeout" : "error",
          phase,
          status,
          timeoutMs,
          elapsedMs: Math.round(performance.now() - start),
        }),
      );
      return {
        text: "",
        latencyMs: Math.min(60_000, Math.round(performance.now() - start)),
        error: timedOut
          ? `A conexão atingiu o limite de ${timeoutMs / 1000} segundos. Tente novamente mais tarde.`
          : status !== undefined && (status < 200 || status >= 300)
            ? `O chatbot retornou HTTP ${status}. Confira autenticação, disponibilidade e limites de uso.`
            : phase === "json" || phase === "extraction"
              ? "A resposta não contém o texto ou a sessão no formato JSON configurado. Confira os caminhos de extração."
              : "Falha técnica na chamada HTTPS. Confira o destino, a credencial e o contrato JSON.",
      };
    }
  }
}
