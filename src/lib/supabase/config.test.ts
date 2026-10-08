import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSupabaseConfigurationStatus,
  requireSupabaseConfig,
  validateSupabaseConfig,
} from "./config";

const publicKey = "sb_publishable_test_1234567890123456";

afterEach(() => vi.unstubAllEnvs());

describe("configuração pública do Supabase", () => {
  it("aceita URL HTTPS e chave pública", () => {
    expect(validateSupabaseConfig("https://example.supabase.co", publicKey).success).toBe(true);
  });
  it.each([
    "sb_secret_12345678901234567890",
    "service_role",
    "",
    "eyJhbGciOiJIUzI1NiJ9.secret.jwt",
  ])("rejeita chave inadequada: %s", (key) => {
    expect(validateSupabaseConfig("https://example.supabase.co", key).success).toBe(false);
  });
  it.each([
    "http://example.supabase.co",
    "not-a-url",
    "https://user:password@example.com",
    "https://example.com?token=secret",
    "https://example.com/rest/v1",
  ])("rejeita URL inadequada: %s", (url) => {
    expect(validateSupabaseConfig(url, publicKey).success).toBe(false);
  });
  it("aceita Supabase local em desenvolvimento e bloqueia HTTP em produção", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(validateSupabaseConfig("http://127.0.0.1:54321", publicKey).success).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(validateSupabaseConfig("http://127.0.0.1:54321", publicKey).success).toBe(false);
  });
  it("não confunde configuração ausente, incompleta e presente", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getSupabaseConfigurationStatus()).toBe("missing");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    expect(getSupabaseConfigurationStatus()).toBe("invalid");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publicKey);
    expect(getSupabaseConfigurationStatus()).toBe("configured");
    expect(requireSupabaseConfig().url).toBe("https://example.supabase.co");
  });
  it("não revela a chave inválida na mensagem de erro", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_secret_private_token");
    expect(requireSupabaseConfig).toThrow("Configure a URL e a publishable key");
    expect(requireSupabaseConfig).not.toThrow("sb_secret_private_token");
  });
});
