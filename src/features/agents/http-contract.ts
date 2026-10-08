import { z } from "zod";

const forbidden = new Set(["__proto__", "prototype", "constructor"]);
const blockedHeaders = new Set([
  "host",
  "content-length",
  "connection",
  "transfer-encoding",
  "upgrade",
  "cookie",
  "proxy-authorization",
  "proxy-connection",
  "accept-encoding",
  "trailer",
  "te",
]);
export const responsePathSchema = z
  .string()
  .max(200)
  .refine(
    (value) =>
      value === "$" ||
      value.split(".").every((part) => /^[A-Za-z0-9_-]+$/.test(part) && !forbidden.has(part)),
    "Use um caminho como data.resposta ou choices.0.message.content.",
  );
export const httpConfigSchema = z
  .object({
    method: z.enum(["GET", "POST", "PUT", "PATCH"]),
    headers: z.record(
      z.string().regex(/^[A-Za-z0-9-]{1,80}$/),
      z
        .string()
        .max(4000)
        .refine((value) => !/[\r\n]/.test(value)),
    ),
    query: z.record(z.string().regex(/^[A-Za-z0-9_.-]{1,80}$/), z.string().max(4000)),
    body: z.string().max(16000),
    responsePath: responsePathSchema,
    sessionPath: z.union([z.literal(""), responsePathSchema]),
    secrets: z.record(
      z
        .string()
        .regex(/^[A-Za-z0-9_-]{1,40}$/)
        .refine((name) => !forbidden.has(name)),
      z
        .string()
        .min(1)
        .max(4000)
        .refine((value) => !/[\r\n]/.test(value)),
    ),
  })
  .superRefine((value, ctx) => {
    if (
      Object.keys(value.headers).length > 20 ||
      Object.keys(value.query).length > 20 ||
      Object.keys(value.secrets).length > 10
    )
      ctx.addIssue({ code: "custom", message: "Use até 20 headers/parâmetros e 10 credenciais." });
    if (
      Object.keys(value.headers).some((key) => blockedHeaders.has(key.toLowerCase())) ||
      new Set(Object.keys(value.headers).map((key) => key.toLowerCase())).size !==
        Object.keys(value.headers).length
    )
      ctx.addIssue({ code: "custom", message: "Header reservado ou duplicado." });
    if (value.method === "GET" && value.body.trim())
      ctx.addIssue({ code: "custom", message: "GET envia a pergunta por parâmetros, sem corpo." });
    if (value.body.trim()) {
      try {
        const parsed: unknown = JSON.parse(value.body);
        validateTree(parsed, 0);
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Corpo precisa ser JSON válido, com até oito níveis.",
        });
      }
    }
    const templates = JSON.stringify({
      headers: value.headers,
      query: value.query,
      body: value.body,
    });
    if (!templates.includes("{{message}}"))
      ctx.addIssue({
        code: "custom",
        message: "Inclua {{message}} no corpo ou nos parâmetros para enviar a pergunta.",
      });
    for (const match of templates.matchAll(/\{\{([^{}]+)\}\}/g)) {
      const variable = match[1]!;
      if (
        variable !== "message" &&
        variable !== "sessionId" &&
        !(variable.startsWith("secret.") && Object.hasOwn(value.secrets, variable.slice(7)))
      )
        ctx.addIssue({
          code: "custom",
          message: "Variável desconhecida ou credencial não informada.",
        });
    }
    if (new TextEncoder().encode(JSON.stringify(value)).length > 24000)
      ctx.addIssue({ code: "custom", message: "Configuração acima do limite." });
  });
function validateTree(value: unknown, depth: number): void {
  if (depth > 8) throw new Error("depth");
  if (value && typeof value === "object") {
    if (Object.keys(value).length > 100) throw new Error("keys");
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.has(key)) throw new Error("key");
      validateTree(child, depth + 1);
    }
  }
}
export type HttpConfig = z.infer<typeof httpConfigSchema>;
export const defaultHttpConfig: HttpConfig = {
  method: "POST",
  headers: {},
  query: {},
  body: '{"message":"{{message}}","sessionId":"{{sessionId}}"}',
  responsePath: "text",
  sessionPath: "",
  secrets: {},
};
export function extractPath(input: unknown, path: string): unknown {
  responsePathSchema.parse(path);
  if (path === "$") return input;
  let current: unknown = input;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object" || !Object.hasOwn(current, part)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
export function renderRequest(config: HttpConfig, message: string, sessionId = "") {
  const substitute = (value: string) =>
    value.replace(/\{\{([^{}]+)\}\}/g, (_match: string, variable: string) =>
      variable === "message"
        ? message
        : variable === "sessionId"
          ? sessionId
          : (config.secrets[variable.slice(7)] ?? ""),
    );
  const mapTree = (value: unknown): unknown => {
    if (typeof value === "string") return substitute(value);
    if (Array.isArray(value)) return value.map(mapTree);
    if (value && typeof value === "object")
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, mapTree(child)]));
    return value;
  };
  const headers = Object.fromEntries(
    Object.entries(config.headers).map(([key, value]) => [key, substitute(value)]),
  );
  if (Object.values(headers).some((value) => /[\r\n]/.test(value))) throw new Error("header");
  return {
    headers,
    query: Object.fromEntries(
      Object.entries(config.query).map(([key, value]) => [key, substitute(value)]),
    ),
    payload: config.body.trim() ? JSON.stringify(mapTree(JSON.parse(config.body) as unknown)) : "",
  };
}
