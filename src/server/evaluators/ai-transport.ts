import "server-only";

export const GEMINI_EXECUTION_LIMIT_MS = 75000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
type FailureKind = "timeout" | "network" | "http" | "protocol";
export class EvaluatorTransportError extends Error {
  constructor(
    public readonly kind: FailureKind,
    public readonly status?: number,
  ) {
    super("Falha técnica do transporte de IA.");
    this.name = "EvaluatorTransportError";
  }
}
function failure(error: unknown): EvaluatorTransportError {
  if (error instanceof EvaluatorTransportError) return error;
  if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name))
    return new EvaluatorTransportError("timeout");
  if (error instanceof TypeError) return new EvaluatorTransportError("network");
  return new EvaluatorTransportError("protocol");
}
function retryDelay(value: string | null): number {
  if (value) {
    const seconds = Number(value);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
    if (Number.isFinite(delay)) return Math.max(0, delay);
  }
  return 1000 + Math.floor(Math.random() * 300);
}
async function readJSON(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new EvaluatorTransportError("protocol");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 128000) throw new EvaluatorTransportError("protocol");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new EvaluatorTransportError("protocol");
  }
}

/** Logs somente de metadados. Nunca registrar URL, headers, payload ou erro remoto. */
export async function requestAI(
  url: string,
  init: RequestInit,
  model: string,
  gemini: boolean,
): Promise<unknown> {
  const started = performance.now();
  const totalLimit = gemini ? GEMINI_EXECUTION_LIMIT_MS : 30000;
  const maxAttempts = gemini ? 2 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const remaining = totalLimit - (performance.now() - started);
    if (remaining <= 0) throw new EvaluatorTransportError("timeout");
    const attemptLimit = Math.min(gemini ? 45000 : 30000, remaining);
    const attemptStarted = performance.now();
    let headersMs: number | undefined, status: number | undefined;
    let delay = retryDelay(null);
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(Math.ceil(attemptLimit)),
      });
      headersMs = Math.round(performance.now() - attemptStarted);
      status = response.status;
      if (!response.ok) {
        delay = retryDelay(response.headers.get("retry-after"));
        await response.body?.cancel().catch(() => undefined);
        throw new EvaluatorTransportError("http", response.status);
      }
      const result = await readJSON(response);
      console.info(
        "[ai-evaluation]",
        JSON.stringify({
          provider: gemini ? "gemini" : "openai",
          model,
          attempt,
          status,
          headersMs,
          attemptMs: Math.round(performance.now() - attemptStarted),
          elapsedMs: Math.round(performance.now() - started),
          outcome: "received",
        }),
      );
      return result;
    } catch (error) {
      const issue = failure(error);
      const retryable =
        issue.kind === "timeout" ||
        issue.kind === "network" ||
        (issue.kind === "http" && RETRYABLE_STATUS.has(issue.status ?? 0));
      // Respeitar Retry-After: se pedir espera longa, devolver erro, sem antecipar nova chamada.
      const retry =
        gemini &&
        retryable &&
        attempt < maxAttempts &&
        delay <= 5000 &&
        performance.now() - started + delay < totalLimit;
      console.info(
        "[ai-evaluation]",
        JSON.stringify({
          provider: gemini ? "gemini" : "openai",
          model,
          attempt,
          status,
          headersMs,
          attemptMs: Math.round(performance.now() - attemptStarted),
          elapsedMs: Math.round(performance.now() - started),
          outcome: issue.kind,
          retry,
        }),
      );
      if (!retry) throw issue;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new EvaluatorTransportError("timeout");
}
