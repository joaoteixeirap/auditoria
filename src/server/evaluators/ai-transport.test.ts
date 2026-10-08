import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestAI } from "./ai-transport";

const secret = "private-test-key";
const init = { method: "POST", headers: { "x-goog-api-key": secret }, body: "private-policy" };
const url =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";
const model = "gemini:gemini-3.1-flash-lite";
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date", "performance"] });
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException("Timeout", "TimeoutError")), ms);
    return controller.signal;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function call() {
  return requestAI(url, init, model, true);
}
describe("prazo total e tentativas de IA", () => {
  it("repete 503 uma vez e registra apenas metadados", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("private-error", { status: 503 }))
      .mockResolvedValueOnce(new Response('{"ok":true}'));
    vi.stubGlobal("fetch", fetcher);
    const result = call();
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const logs = JSON.stringify(vi.mocked(console.info).mock.calls);
    expect(logs).not.toContain(secret);
    expect(logs).not.toContain("private-policy");
    expect(logs).not.toContain("private-error");
    expect(logs).toContain('\\"retry\\":true');
  });
  it("encerra duas chamadas sem headers exatamente no orçamento de 75 segundos", async () => {
    const fetcher = vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal!.addEventListener("abort", () => reject(options.signal!.reason), {
            once: true,
          });
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = call().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(75000);
    expect(await result).toMatchObject({ kind: "timeout" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(performance.now()).toBe(75000);
  });
  it("limita também a leitura de um corpo que não termina", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, options: RequestInit) =>
        Promise.resolve(
          new Response(
            new ReadableStream({
              start(controller) {
                options.signal!.addEventListener(
                  "abort",
                  () => controller.error(options.signal!.reason),
                  { once: true },
                );
              },
            }),
          ),
        ),
      ),
    );
    const result = call().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(75000);
    expect(await result).toMatchObject({ kind: "timeout" });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });
  it("respeita Retry-After e não repete quando o provedor pede espera longa", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response("private-error", { status: 429, headers: { "Retry-After": "120" } }),
      );
    vi.stubGlobal("fetch", fetcher);
    await expect(call()).rejects.toMatchObject({ kind: "http", status: 429 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("repete 429 com espera permitida e recupera falha de rede transitória", async () => {
    for (const initial of [
      new Response("", { status: 429, headers: { "Retry-After": "2" } }),
      new TypeError("private-network-error"),
    ]) {
      const fetcher = vi.fn();
      if (initial instanceof Error) fetcher.mockRejectedValueOnce(initial);
      else fetcher.mockResolvedValueOnce(initial);
      fetcher.mockResolvedValueOnce(new Response('{"ok":true}'));
      vi.stubGlobal("fetch", fetcher);
      const result = call();
      await vi.advanceTimersByTimeAsync(2000);
      expect(await result).toEqual({ ok: true });
      expect(fetcher).toHaveBeenCalledTimes(2);
    }
  });
  it("não repete autenticação, modelo, JSON inválido ou resposta acima do limite", async () => {
    for (const response of [
      new Response("", { status: 400 }),
      new Response("", { status: 401 }),
      new Response("", { status: 403 }),
      new Response("", { status: 404 }),
      new Response("not-json"),
      new Response("x".repeat(128001)),
    ]) {
      const fetcher = vi.fn().mockResolvedValue(response);
      vi.stubGlobal("fetch", fetcher);
      await expect(call()).rejects.toHaveProperty("kind");
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
});
