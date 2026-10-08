import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rate-limit";
import { authDestination } from "./auth-redirect";
import { parsePage } from "./pagination";
import { agentSchema, clientSchema, registerSchema } from "@/lib/validations/entities";

describe("controles de entrada", () => {
  it("limita tentativas e libera após a janela", () => {
    let now = 1000;
    const limiter = new RateLimiter(2, 100, () => now);
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("a")).toBe(false);
    expect(limiter.allow("b")).toBe(true);
    now += 100;
    expect(limiter.allow("a")).toBe(true);
  });
  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/reset-password?next=https://evil.com",
    null,
  ])("bloqueia destino livre %s", (input) => {
    expect(authDestination(input)).toBe("/dashboard");
  });
  it("permite apenas o destino fechado de recuperação", () =>
    expect(authDestination("/reset-password")).toBe("/reset-password"));
  it("normaliza paginação sem aceitar valores negativos ou enormes", () => {
    expect(parsePage("2")).toBe(2);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("999999")).toBe(10000);
    expect(parsePage(["2"])).toBe(1);
  });
  it("rejeita cliente inválido e status arbitrário", () => {
    expect(
      clientSchema.safeParse({
        name: "x",
        contact_name: "",
        contact_email: "invalid",
        description: "",
        status: "active",
      }).success,
    ).toBe(false);
    expect(
      clientSchema.safeParse({
        name: "Cliente",
        contact_name: "",
        contact_email: "",
        description: "",
        status: "admin",
      }).success,
    ).toBe(false);
  });
  it("rejeita cadastro de chatbot com IDs inválidos", () => {
    expect(
      agentSchema.safeParse({
        name: "Bot",
        client_id: "other-tenant",
        description: "",
        category: "sales",
        environment: "demo",
        status: "active",
      }).success,
    ).toBe(false);
  });
  it("exige senha forte no cadastro", () => {
    expect(
      registerSchema.safeParse({
        email: "user@example.com",
        display_name: "Pessoa",
        password: "123456",
      }).success,
    ).toBe(false);
  });
});
