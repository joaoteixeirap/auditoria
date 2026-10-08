import { afterEach, describe, expect, it, vi } from "vitest";
import { checkSupabaseConnection } from "./connection-check";

const config = {
  url: "https://example.supabase.co",
  publishableKey: "sb_publishable_test_key_123456789",
};
afterEach(() => vi.unstubAllGlobals());
describe("verificação de infraestrutura", () => {
  it("distingue conexão real de migration ausente", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await checkSupabaseConnection(config);
    expect(result.status).toBe("success");
    expect(result.schemaReady).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("identifica o marcador esperado, sem consultar dados de clientes", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("{}", { status: 200 }))
        .mockResolvedValueOnce(new Response('"phase1-v1"', { status: 200 }))
        .mockResolvedValueOnce(new Response('"phase2-v1"', { status: 200 })),
    );
    expect((await checkSupabaseConnection(config)).schemaReady).toBe(true);
  });
  it("não trata chave recusada como conexão aprovada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    expect((await checkSupabaseConnection(config)).status).toBe("error");
  });
  it("não expõe mensagens internas de rede", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(`secret ${config.publishableKey}`)));
    const result = await checkSupabaseConnection(config);
    expect(result.status).toBe("error");
    expect(result.message).not.toContain(config.publishableKey);
  });
});
