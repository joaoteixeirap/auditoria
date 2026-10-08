import { EventEmitter } from "node:events";
import type { RequestOptions } from "node:https";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  addresses: [{ address: "8.8.8.8", family: 4 }],
  status: 200,
  contentType: "application/json",
  body: '{"text":"Resposta controlada"}',
  options: undefined as RequestOptions | undefined,
  payload: "",
  calls: 0,
}));
vi.mock("node:dns/promises", () => ({ lookup: vi.fn(async () => state.addresses) }));
vi.mock("node:https", () => ({
  request: (
    _url: URL,
    options: RequestOptions,
    callback: (
      response: EventEmitter & {
        statusCode: number;
        headers: Record<string, string>;
        destroy: () => void;
      },
    ) => void,
  ) => {
    state.calls++;
    state.options = options;
    const req = new EventEmitter() as EventEmitter & { end: (payload: string) => void };
    req.end = (payload) => {
      state.payload = payload;
      queueMicrotask(() => {
        const res = Object.assign(new EventEmitter(), {
          statusCode: state.status,
          headers: { "content-type": state.contentType },
          destroy: vi.fn(),
        });
        callback(res);
        res.emit("data", Buffer.from(state.body));
        res.emit("end");
      });
    };
    return req;
  },
}));

import { HttpConnector, connectorTimeoutMs } from "./http";
import { httpEndpoint, publicIPv4, resolveHttpEndpoint } from "./http-security";
import { encryptCredential, decryptCredential } from "./credentials";
import {
  defaultHttpConfig,
  httpConfigSchema,
  renderRequest,
  extractPath,
} from "@/features/agents/http-contract";
import { configuredConnector } from "./connection";

beforeEach(() => {
  vi.restoreAllMocks();
  state.addresses = [{ address: "8.8.8.8", family: 4 }];
  state.status = 200;
  state.contentType = "application/json";
  state.body = '{"text":"Resposta controlada"}';
  state.calls = 0;
  vi.stubEnv("CONNECTOR_ENCRYPTION_KEY", "ab".repeat(32));
});

describe("conector HTTP e proteção SSRF", () => {
  it("integra JSON configurável, headers secretos, caminhos aninhados e índices", async () => {
    state.body = JSON.stringify({
      choices: [{ message: { content: "Resposta configurada" } }],
      session: { id: "nova-sessao" },
    });
    const config = httpConfigSchema.parse({
      ...defaultHttpConfig,
      method: "PATCH",
      headers: { "X-API-Key": "{{secret.chave}}" },
      secrets: { chave: "credencial-controlada" },
      body: '{"input":[{"role":"user","content":"{{message}}"}],"conversation":"{{sessionId}}"}',
      responsePath: "choices.0.message.content",
      sessionPath: "session.id",
    });
    const reply = await new HttpConnector("https://api.example.com/chat", "", config).send({
      message: 'Pergunta "com aspas" e {{secret.chave}}',
      sessionId: "sessao-a",
    });
    expect(reply.text).toBe("Resposta configurada");
    expect(reply.sessionId).toBe("nova-sessao");
    expect(state.options?.method).toBe("PATCH");
    expect(state.options?.headers).toMatchObject({ "X-API-Key": "credencial-controlada" });
    expect(JSON.parse(state.payload)).toEqual({
      input: [{ role: "user", content: 'Pergunta "com aspas" e {{secret.chave}}' }],
      conversation: "sessao-a",
    });
  });
  it("GET mapeia a pergunta por parâmetros, sem corpo, e não admite headers reservados", async () => {
    state.body = '{"data":{"resposta":"Olá"}}';
    const config = httpConfigSchema.parse({
      ...defaultHttpConfig,
      method: "GET",
      body: "",
      query: { q: "{{message}}" },
      responsePath: "data.resposta",
    });
    expect(
      (
        await new HttpConnector("https://api.example.com/chat", "", config).send({
          message: "Pergunta",
        })
      ).text,
    ).toBe("Olá");
    expect(state.options?.method).toBe("GET");
    expect(state.payload).toBe("");
    for (const headers of [
      { Host: "interno" },
      { "Content-Length": "0" },
      { Connection: "upgrade" },
      { Authorization: "a", authorization: "b" },
    ])
      expect(httpConfigSchema.safeParse({ ...defaultHttpConfig, headers }).success).toBe(false);
  });
  it("valida variáveis, estrutura e caminhos e recusa credenciais refletidas", async () => {
    expect(
      httpConfigSchema.safeParse({ ...defaultHttpConfig, body: '{"q":"{{secret.inexistente}}"}' })
        .success,
    ).toBe(false);
    expect(
      httpConfigSchema.safeParse({ ...defaultHttpConfig, responsePath: "data.__proto__.secret" })
        .success,
    ).toBe(false);
    expect(
      httpConfigSchema.safeParse({
        ...defaultHttpConfig,
        body: '{"__proto__":{"q":"{{message}}"}}',
      }).success,
    ).toBe(false);
    expect(extractPath({ data: { text: "ok" } }, "data.text")).toBe("ok");
    expect(renderRequest(defaultHttpConfig, '"}]}', "sessao").payload).toBe(
      JSON.stringify({ message: '"}]}', sessionId: "sessao" }),
    );
    state.body = '{"text":"Resposta","metadata":"segredo-config"}';
    expect(
      (
        await new HttpConnector("https://api.example.com/chat", "", {
          ...defaultHttpConfig,
          secrets: { chave: "segredo-config" },
        }).send({ message: "Olá" })
      ).error,
    ).toBeTruthy();
  });
  it("abre configuração criptografada por empresa/versão e mantém o contrato legado", async () => {
    const encrypted_config = encryptCredential(
      JSON.stringify(defaultHttpConfig),
      "orgA:versaoA:http-json-v1",
    );
    const connection = {
      organization_id: "orgA",
      agent_version_id: "versaoA",
      endpoint: "https://api.example.com/chat",
      encrypted_token: null,
      encrypted_config,
      contract: "http-json-v1",
    };
    expect((await configuredConnector(connection).send({ message: "Olá" })).text).toBe(
      "Resposta controlada",
    );
    expect(() => configuredConnector({ ...connection, organization_id: "orgB" })).toThrow();
    expect(() => configuredConnector({ ...connection, agent_version_id: "versaoB" })).toThrow();
    expect(
      (
        await configuredConnector({
          ...connection,
          encrypted_config: null,
          contract: "message-text-v1",
        }).send({ message: "Olá" })
      ).text,
    ).toBe("Resposta controlada");
  });
  it("bloqueia URLs com IP, protocolos inseguros, query, porta ou credenciais", () => {
    for (const url of [
      "http://api.example.com/chat",
      "https://127.0.0.1/chat",
      "https://2130706433/chat",
      "https://[::1]/",
      "https://api.example.com:444/chat",
      "https://token@api.example.com/chat",
      "https://api.example.com/chat?token=x",
      "https://api.example.com/chat#x",
      "https://localhost/chat",
    ])
      expect(() => httpEndpoint(url)).toThrow();
  });
  it("bloqueia redes privadas, metadata, loopback, reservadas e IPv6", () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
      "192.0.0.9",
      "192.0.2.1",
      "198.18.1.1",
      "198.51.100.1",
      "203.0.113.1",
      "::1",
      "::ffff:127.0.0.1",
    ])
      expect(publicIPv4(address)).toBe(false);
    expect(publicIPv4("8.8.8.8")).toBe(true);
  });
  it("recusa todo o destino se o DNS inclui qualquer IPv4 privado", async () => {
    state.addresses.push({ address: "10.0.0.1", family: 4 });
    const result = await new HttpConnector("https://api.example.com/chat").send({
      message: "Teste",
    });
    expect(result.error).toBeTruthy();
    expect(state.calls).toBe(0);
  });
  it("não envia se o prazo expirou durante a resolução", async () => {
    await expect(
      resolveHttpEndpoint("https://api.example.com/chat", AbortSignal.abort()),
    ).rejects.toThrow();
    expect(state.calls).toBe(0);
  });
  it("envia o contrato JSON sem contexto extra e fixa o IP validado", async () => {
    const reply = await new HttpConnector("https://api.example.com/chat", "token-teste").send({
      message: "Teste",
      sessionId: "sessao",
      context: { secret: "omitir" },
    });
    expect(reply.text).toBe("Resposta controlada");
    expect(JSON.parse(state.payload)).toEqual({ message: "Teste", sessionId: "sessao" });
    expect(state.options?.agent).toBe(false);
    expect(state.options?.headers).toMatchObject({ Authorization: "Bearer token-teste" });
    const lookup = state.options?.lookup;
    expect(lookup).toBeTypeOf("function");
    if (lookup) {
      const callback = vi.fn();
      lookup("api.example.com", { family: 4 }, callback);
      expect(callback).toHaveBeenCalledWith(null, "8.8.8.8", 4);
    }
  });
  it("não segue redirect nem retorna o conteúdo privado de erros", async () => {
    state.status = 302;
    state.body = "token-teste";
    const reply = await new HttpConnector("https://api.example.com/chat", "token-teste").send({
      message: "Teste",
    });
    expect(reply.text).toBe("");
    expect(reply.error).not.toContain("token-teste");
    expect(state.calls).toBe(1);
  });
  it("recusa JSON inválido, tipo incorreto, corpo grande e token refletido", async () => {
    for (const body of [
      "inválido",
      '{"text":42}',
      JSON.stringify({ text: "x".repeat(10001) }),
      "x".repeat(65537),
      '{"text":"token-teste"}',
    ]) {
      state.body = body;
      const reply = await new HttpConnector("https://api.example.com/chat", "token-teste").send({
        message: "Teste",
      });
      expect(reply.text).toBe("");
      expect(reply.error).toBeTruthy();
    }
    state.contentType = "text/html";
    expect(
      (await new HttpConnector("https://api.example.com/chat").send({ message: "Teste" })).error,
    ).toBeTruthy();
  });
  it("recusa headers injetados e mensagens acima do limite antes de conectar", async () => {
    await new HttpConnector("https://api.example.com/chat", "x\r\nInjected: y").send({
      message: "Teste",
    });
    await new HttpConnector("https://api.example.com/chat").send({ message: "x".repeat(2001) });
    expect(state.calls).toBe(0);
  });
});

describe("prazo e diagnóstico seguro", () => {
  it("amplia somente o endpoint oficial Dify e preserva limites dos demais", () => {
    expect(connectorTimeoutMs("https://api.dify.ai/v1/chat-messages")).toBe(30000);
    for (const endpoint of [
      "https://api.example.com/chat",
      "https://api.dify.ai/v1/info",
      "https://api.dify.ai.attacker.com/v1/chat-messages",
      "http://api.dify.ai/v1/chat-messages",
    ])
      expect(connectorTimeoutMs(endpoint)).toBe(10000);
  });
  it("aplica o prazo Dify e extrai answer/conversation_id com o corpo da interface", async () => {
    const timer = vi.spyOn(AbortSignal, "timeout");
    state.body = JSON.stringify({ answer: "Resposta controlada", conversation_id: "sessao" });
    const reply = await new HttpConnector("https://api.dify.ai/v1/chat-messages", "token-teste", {
      ...defaultHttpConfig,
      body: '{"inputs":{},"query":"{{message}}","response_mode":"blocking","user":"auditor-vestcasa"}',
      responsePath: "answer",
      sessionPath: "conversation_id",
    }).send({ message: "Teste" });
    expect(timer).toHaveBeenCalledWith(30000);
    expect(reply.text).toBe("Resposta controlada");
    expect(reply.sessionId).toBe("sessao");
    expect(JSON.parse(state.payload)).toMatchObject({
      query: "Teste",
      user: "auditor-vestcasa",
      response_mode: "blocking",
    });
  });
  it("deadline abortada produz timeout técnico sem expor credenciais", async () => {
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort());
    const reply = await new HttpConnector(
      "https://api.dify.ai/v1/chat-messages",
      "token-teste",
    ).send({ message: "Teste" });
    expect(reply.text).toBe("");
    expect(reply.error).toContain("30 segundos");
    expect(reply.error).not.toContain("token-teste");
  });
  it("distingue HTTP e extração, sem registrar corpo, pergunta ou token", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    state.status = 429;
    state.body = "resposta-privada token-teste";
    const failed = await new HttpConnector("https://api.example.com/chat", "token-teste").send({
      message: "pergunta-privada",
    });
    expect(failed.error).toContain("HTTP 429");
    state.status = 200;
    state.body = '{"wrong":"resposta-privada"}';
    const malformed = await new HttpConnector("https://api.example.com/chat", "token-teste").send({
      message: "pergunta-privada",
    });
    expect(malformed.error).toContain("caminhos de extração");
    const logs = JSON.stringify(log.mock.calls);
    expect(logs).not.toMatch(/resposta-privada|pergunta-privada|token-teste/);
    expect(logs).toContain("extraction");
  });
});

describe("credenciais criptografadas", () => {
  it("usa nonce aleatório e vínculo autenticado com organização e versão", () => {
    const first = encryptCredential("token-teste", "orgA:versao1");
    expect(first).not.toContain("token-teste");
    expect(encryptCredential("token-teste", "orgA:versao1")).not.toBe(first);
    expect(decryptCredential(first, "orgA:versao1")).toBe("token-teste");
    expect(() => decryptCredential(first, "orgB:versao1")).toThrow();
    expect(() => decryptCredential(first, "orgA:versao2")).toThrow();
    expect(() =>
      decryptCredential(first.slice(0, -2) + (first.endsWith("00") ? "01" : "00"), "orgA:versao1"),
    ).toThrow();
  });
  it("não usa chave padrão se a configuração estiver ausente", () => {
    vi.stubEnv("CONNECTOR_ENCRYPTION_KEY", "");
    expect(() => encryptCredential("token", "orgA:versao1")).toThrow();
  });
});
